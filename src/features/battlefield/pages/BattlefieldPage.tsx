import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useBattlefieldStore, generateDeckInstances, type TurnPhase } from '@/stores/battlefieldStore';
import { battlefieldService } from '@/services/battlefieldService';
import { supabase } from '@/lib/supabase';
import GameBoard from '../components/GameBoard';
import PlayerHand from '../components/PlayerHand';
import TurnControl from '../components/TurnControl';
import { Loader2 } from 'lucide-react';
import { logAction } from '../components/ActionLog';

const PHASE_KEYS: Record<string, TurnPhase> = {
  '1': 'UNTAP',
  '2': 'UPKEEP',
  '3': 'DRAW',
  '4': 'MAIN_1',
  '5': 'COMBAT',
  '6': 'MAIN_2',
  '7': 'END',
};

export default function BattlefieldPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { initGame, handleBroadcast } = useBattlefieldStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const store = useBattlefieldStore.getState();
      const { myUserId, activePlayerId, cards, currentPhase, selectedCards } = store;
      const isMyTurn = activePlayerId === myUserId || !activePlayerId;

      switch (e.key.toLowerCase()) {
        // D = draw one card
        case 'd': {
          if (!myUserId) break;
          const lib = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'LIBRARY');
          if (lib.length > 0) {
            store.changeZone(lib[0].instanceId, 'HAND');
            logAction({ type: 'draw', actorName: user?.displayName || 'Você', message: 'comprou uma carta. (atalho D)' });
          }
          break;
        }
        // T = tap/untap selected cards
        case 't': {
          if (selectedCards.length > 0) {
            store.tapSelected();
            logAction({ type: 'tap', actorName: user?.displayName || 'Você', message: `virou ${selectedCards.length} carta(s). (atalho T)` });
          }
          break;
        }
        // N = next phase (Space also works)
        case 'n':
        case ' ': {
          if (!isMyTurn) break;
          e.preventDefault();
          const phases: TurnPhase[] = ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN_1', 'COMBAT', 'MAIN_2', 'END'];
          const idx = phases.indexOf(currentPhase);
          if (idx < phases.length - 1) {
            store.setPhase(phases[idx + 1]);
          } else {
            store.passTurn();
          }
          break;
        }
        // U = untap all my permanents
        case 'u': {
          if (isMyTurn) {
            store.untapAll();
            logAction({ type: 'tap', actorName: user?.displayName || 'Você', message: 'desvirou todas as cartas. (atalho U)' });
          }
          break;
        }
        // Escape = clear selection
        case 'escape': {
          store.clearSelection();
          store.setDrawingArrowFrom(null);
          break;
        }
        // Number keys 1-7 = jump to phase
        default: {
          if (PHASE_KEYS[e.key] && isMyTurn) {
            store.setPhase(PHASE_KEYS[e.key]);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/lobby');
      return;
    }

    const startBattlefield = async () => {
      const { data: roomPlayer, error: rpError } = await supabase
        .from('room_players')
        .select('deck_id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (rpError || !roomPlayer) {
        setError('Você não está registrado nesta sala. Volte ao lobby.');
        return;
      }

      if (!roomPlayer.deck_id) {
        setError('Você não selecionou um deck! Volte à sala de espera e escolha um deck.');
        return;
      }

      const { data: deckCards, error: dcError } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', roomPlayer.deck_id);

      if (dcError || !deckCards || deckCards.length === 0) {
        setError('Erro ao carregar o deck. Certifique-se de ter salvo cartas nele.');
        return;
      }

      const myInstances = generateDeckInstances(user.id, deckCards);
      initGame(roomId, user.id, myInstances);

      battlefieldService.connect(roomId, (event) => {
        handleBroadcast(event);
      });

      logAction({ type: 'system', actorName: user.displayName || user.email?.split('@')[0] || 'Jogador', message: 'entrou na partida.' });
      setLoading(false);
    };

    startBattlefield();

    return () => {
      battlefieldService.disconnect();
    };
  }, [roomId, user?.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-red-400 text-6xl">⚠️</div>
        <h2 className="text-2xl font-bold text-zinc-100 text-center">{error}</h2>
        <button
          onClick={() => navigate(roomId ? `/lobby/${roomId}` : '/lobby')}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
        >
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
        <h2 className="text-2xl font-bold text-zinc-100">Carregando Campo de Batalha...</h2>
        <p className="text-zinc-500">Embaralhando grimórios e preparando a mesa.</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden select-none flex flex-col" style={{ background: '#0c0c0e' }}>
      {/* Keyboard shortcuts hint — shown briefly on first load */}
      <div className="flex-1 min-h-0">
        <GameBoard navigate={navigate} roomId={roomId} userId={user?.id} />
      </div>
      <TurnControl />
      <PlayerHand />
    </div>
  );
}
