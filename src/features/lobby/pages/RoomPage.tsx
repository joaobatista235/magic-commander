import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDeckStore } from '@/stores/deckStore';
import { fetchRoomDetails, fetchRoomPlayers, leaveRoom, setPlayerReady, startGame, type Room, type RoomPlayer } from '@/services/lobbyService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Crown, CheckCircle2, User as UserIcon } from 'lucide-react';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { decks } = useDeckStore();

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingReady, setSavingReady] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLeavingRef = useRef(false);

  const loadData = async () => {
    if (!roomId || isLeavingRef.current) return;

    const [room, roomPlayers] = await Promise.all([
      fetchRoomDetails(roomId),
      fetchRoomPlayers(roomId),
    ]);

    if (!room) {
      navigate('/lobby');
      return;
    }

    if (room.status === 'PLAYING') {
      navigate(`/battlefield/${roomId}`);
      return;
    }

    setCurrentRoom(room);
    setPlayers(roomPlayers);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/lobby');
      return;
    }

    isLeavingRef.current = false;
    loadData();
    pollingRef.current = setInterval(loadData, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      // Não chamar leaveRoom aqui para evitar bug do React Strict Mode
      // O leave acontece apenas via handleLeave explícito
    };
  }, [roomId, user?.id]);

  const handleLeave = async () => {
    isLeavingRef.current = true;
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (roomId && user) {
      await leaveRoom(roomId, user.id);
    }
    navigate('/lobby');
  };

  if (loading || !currentRoom) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-zinc-400 mt-4">Conectando à sala...</p>
      </div>
    );
  }

  const isOwner = currentRoom.owner_id === user?.id;
  const me = players.find(p => p.user_id === user?.id);
  const allReady = players.length > 0 && players.every(p => p.is_ready);

  const handleDeckSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deckId = e.target.value;
    if (!roomId || !user || !deckId) return;

    const currentMe = players.find(p => p.user_id === user.id);

    setPlayers(prev => prev.map(p =>
      p.user_id === user.id ? { ...p, deck_id: deckId, is_ready: false } : p
    ));

    const success = await setPlayerReady(roomId, user.id, deckId, false);
    if (!success) {
      alert('Erro ao selecionar o deck. Se este for um deck muito antigo, abra-o no editor e clique em Salvar Deck para sincronizá-lo na nuvem.');
      // Reverter atualização otimista
      setPlayers(prev => prev.map(p =>
        p.user_id === user.id ? { ...p, deck_id: currentMe?.deck_id || null } : p
      ));
    }
  };

  const handleToggleReady = async () => {
    if (!roomId || !user) return;
    const currentMe = players.find(p => p.user_id === user.id);
    if (!currentMe?.deck_id) {
      alert('Selecione um deck primeiro!');
      return;
    }

    setSavingReady(true);
    const newReady = !currentMe.is_ready;

    setPlayers(prev => prev.map(p =>
      p.user_id === user.id ? { ...p, is_ready: newReady } : p
    ));

    await setPlayerReady(roomId, user.id, currentMe.deck_id, newReady);
    setSavingReady(false);
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    isLeavingRef.current = true;
    if (pollingRef.current) clearInterval(pollingRef.current);
    await startGame(roomId);
    navigate(`/battlefield/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="h-16 border-b border-zinc-800/60 flex items-center px-6 shrink-0 gap-4">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-sm">Sair da Sala</span>
        </button>
        <div className="h-5 w-px bg-zinc-800 mx-1" />
        <div>
          <h1 className="font-semibold text-zinc-100 leading-none">{currentRoom.name}</h1>
          <p className="text-xs text-zinc-600 mt-0.5">Sala de Espera</p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((player) => {
            const isMe = player.user_id === user?.id;
            const myDeck = isMe && player.deck_id
              ? decks.find(d => d.id === player.deck_id)
              : null;

            return (
              <div
                key={player.id}
                className={`rounded-2xl p-5 border transition-all ${
                  player.is_ready
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-zinc-900/70 border-zinc-800/60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700/50 shrink-0">
                      {player.profiles?.avatar_url
                        ? <img src={player.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : <UserIcon className="h-5 w-5 text-zinc-500" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {player.profiles?.display_name || 'Jogador'}
                        </span>
                        {isMe && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded font-medium">você</span>}
                      </div>
                      <p className="text-xs mt-0.5">
                        {player.is_ready
                          ? <span className="text-amber-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pronto</span>
                          : <span className="text-zinc-600">Aguardando...</span>
                        }
                      </p>
                    </div>
                  </div>

                  {player.user_id === currentRoom.owner_id && (
                    <Crown className="h-4 w-4 text-zinc-600 shrink-0" title="Dono da sala" />
                  )}
                </div>

                {isMe ? (
                  <select
                    className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700/60 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer appearance-none"
                    value={player.deck_id || ''}
                    onChange={handleDeckSelect}
                    autoComplete="off"
                  >
                    <option value="" disabled>Escolha um deck...</option>
                    {decks.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.cards.reduce((a, c) => a + c.quantity, 0)} cartas
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-10 px-3 flex items-center rounded-lg bg-zinc-950/50 border border-zinc-800/40">
                    <span className="text-sm text-zinc-500 truncate">
                      {player.deck_id
                        ? (player.decks?.name || 'Deck carregado')
                        : 'Escolhendo deck...'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {Array.from({ length: Math.max(0, (currentRoom.max_players ?? 4) - players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-2xl p-5 border border-zinc-700/60 border-dashed flex flex-col items-center justify-center min-h-[148px] gap-3 bg-zinc-900/20">
              <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/50 border-dashed" />
              <p className="text-xs text-zinc-500 font-medium tracking-wide">Aguardando jogador...</p>
            </div>
          ))}
        </div>

        <div className="mt-auto bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-300">
              {players.filter(p => p.is_ready).length} de {players.length} {players.length === 1 ? 'jogador pronto' : 'jogadores prontos'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {isOwner
                ? allReady ? 'Todos prontos! Você pode iniciar.' : 'Aguarde todos ficarem prontos para iniciar.'
                : 'Selecione seu deck e confirme que está pronto.'}
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleToggleReady}
              disabled={savingReady}
              variant="outline"
              className={`flex-1 sm:flex-none h-11 px-6 text-sm font-medium transition-all ${
                me?.is_ready
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-zinc-800/50 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
              }`}
            >
              {savingReady && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {me?.is_ready ? 'Cancelar' : 'Estou Pronto'}
            </Button>

            {isOwner && (
              <Button
                onClick={handleStartGame}
                disabled={!allReady}
                className="flex-1 sm:flex-none h-11 px-8 text-sm font-semibold bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Iniciar Partida
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
