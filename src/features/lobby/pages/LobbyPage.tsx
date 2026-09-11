import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWaitingRooms, createRoom, joinRoom, type Room } from '@/services/lobbyService';
import { supabase } from '@/lib/supabase';
import { Users, Search, Plus, ArrowLeft, Loader2, Lock, Trash2 } from 'lucide-react';

export default function LobbyPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Modal criar sala
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Modal senha
  const [passwordModal, setPasswordModal] = useState<Room | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    const data = await fetchWaitingRooms();
    setRooms(data);
    setLoading(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRoomName.trim()) return;

    setCreatingLoading(true);
    const roomId = await createRoom(user.id, newRoomName.trim(), newRoomPassword || undefined);

    if (roomId) {
      await joinRoom(roomId, user.id);
      navigate(`/lobby/${roomId}`);
    }
    setCreatingLoading(false);
  };

  const handleJoinRoom = async (room: Room) => {
    if (!user) return;

    if (room.password) {
      setPasswordModal(room);
      setEnteredPassword('');
      setPasswordError('');
      return;
    }

    doJoin(room.id);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;

    if (enteredPassword !== passwordModal.password) {
      setPasswordError('Senha incorreta. Tente novamente.');
      return;
    }

    setPasswordModal(null);
    doJoin(passwordModal.id);
  };

  const doJoin = async (roomId: string) => {
    if (!user) return;
    setJoiningId(roomId);
    const success = await joinRoom(roomId, user.id);
    setJoiningId(null);
    if (success) navigate(`/lobby/${roomId}`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Deseja encerrar e excluir esta sala?')) return;
    await supabase.from('rooms').delete().eq('id', roomId);
    loadRooms();
  };

  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/commander-logo.png" alt="Commander" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-zinc-100 tracking-tight">Lobby</span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{user.displayName}</span>
            <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold uppercase">
              {user.displayName.charAt(0)}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Salas de Espera</h1>
            <p className="text-zinc-400 mt-1">Encontre adversários ou crie sua própria mesa.</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="h-11 px-6 bg-amber-600 hover:bg-amber-500 text-white font-bold">
            <Plus className="h-5 w-5 mr-2" />
            Criar Sala
          </Button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome da sala..."
            autoComplete="off"
            className="h-12 pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 text-lg placeholder:text-zinc-600"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map(room => {
              const isMine = room.owner_id === user?.id;
              const isJoining = joiningId === room.id;
              return (
                <div key={room.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-zinc-100 truncate pr-2">{room.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {room.password && <Lock className="h-4 w-4 text-zinc-500" />}
                      {isMine && (
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="h-6 w-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded"
                          title="Encerrar sala"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6 mt-auto">
                    <Users className="h-4 w-4" />
                    <span>{isMine ? 'Sua sala' : 'Aguardando jogadores...'}</span>
                  </div>

                  <Button
                    onClick={() => handleJoinRoom(room)}
                    disabled={isJoining}
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-semibold"
                  >
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isMine ? 'Entrar na Minha Sala' : 'Entrar na Sala'}
                  </Button>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <div className="col-span-full text-center py-12 bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-2xl">
                <p className="text-zinc-500 text-lg">Nenhuma sala encontrada.</p>
                <Button variant="link" onClick={() => setIsCreating(true)} className="text-amber-500 hover:text-amber-400">
                  Seja o primeiro a criar uma!
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Criar Sala */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Criar Nova Sala</h2>

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-zinc-300">Nome da Sala</label>
                <Input
                  id="name"
                  required
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="Ex: Mesa dos Amigos"
                  autoComplete="off"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">Senha (Opcional)</label>
                <Input
                  id="password"
                  type="text"
                  value={newRoomPassword}
                  onChange={e => setNewRoomPassword(e.target.value)}
                  placeholder="Deixe em branco para sala pública"
                  autoComplete="off"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={creatingLoading || !newRoomName.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white">
                  {creatingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar e Entrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Senha */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-zinc-100">Sala Protegida</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Digite a senha para entrar em <strong className="text-zinc-200">{passwordModal.name}</strong>.</p>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <Input
                autoFocus
                type="text"
                value={enteredPassword}
                onChange={e => { setEnteredPassword(e.target.value); setPasswordError(''); }}
                placeholder="Senha da sala"
                autoComplete="off"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
              />
              {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setPasswordModal(null)} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white">Entrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
