import { useBattlefieldStore, type TurnPhase } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import { SkipForward, Zap } from 'lucide-react';
import { logAction } from './ActionLog';

const PHASES: { id: TurnPhase; label: string; shortcut?: string }[] = [
  { id: 'UNTAP', label: 'Untap', shortcut: '1' },
  { id: 'UPKEEP', label: 'Upkeep', shortcut: '2' },
  { id: 'DRAW', label: 'Draw', shortcut: '3' },
  { id: 'MAIN_1', label: 'Main 1', shortcut: '4' },
  { id: 'COMBAT', label: 'Combat', shortcut: '5' },
  { id: 'MAIN_2', label: 'Main 2', shortcut: '6' },
  { id: 'END', label: 'End', shortcut: '7' },
];

export default function TurnControl() {
  const { currentPhase, setPhase, passTurn, activePlayerId, players, myUserId, untapAll } = useBattlefieldStore();
  const user = useAuthStore(state => state.user);

  const isMyTurn = activePlayerId === myUserId || !activePlayerId;

  const handlePhaseClick = (phase: TurnPhase) => {
    if (!isMyTurn) return;

    // Auto-untap when moving to UNTAP
    if (phase === 'UNTAP' && currentPhase !== 'UNTAP') {
      untapAll();
      logAction({ type: 'turn', actorName: user?.displayName || 'Você', message: 'desvirou todas as cartas (Untap).' });
    }

    setPhase(phase);
    logAction({ type: 'turn', actorName: user?.displayName || 'Você', message: `avançou para a fase ${PHASES.find(p => p.id === phase)?.label}.` });
  };

  const handleNextPhase = () => {
    if (!isMyTurn) return;

    const currentIndex = PHASES.findIndex(p => p.id === currentPhase);
    if (currentIndex < PHASES.length - 1) {
      handlePhaseClick(PHASES[currentIndex + 1].id);
    } else {
      passTurn();
      const playerIds = Object.keys(players).sort();
      const currentIdx = playerIds.indexOf(activePlayerId || myUserId || '');
      const nextIdx = (currentIdx + 1) % playerIds.length;
      const nextId = playerIds[nextIdx];
      const nextPlayer = players[nextId];
      const nextName = nextPlayer && 'name' in nextPlayer ? (nextPlayer as any).name : 'Próximo Jogador';
      logAction({ type: 'turn', actorName: user?.displayName || 'Você', message: `passou o turno para ${nextName}.` });
    }
  };

  const activePlayerName = activePlayerId && players[activePlayerId] && 'name' in players[activePlayerId]
    ? (players[activePlayerId] as any).name
    : 'Turno do Oponente';

  return (
    <div className="h-11 bg-zinc-950 border-t border-b border-zinc-800 flex items-center justify-between px-3 shrink-0 shadow-lg gap-2">
      <div className="flex items-center gap-3">
        {/* Turn indicator */}
        <div className={`flex items-center gap-1.5 shrink-0 ${isMyTurn ? 'text-amber-400' : 'text-zinc-500'}`}>
          {isMyTurn && <Zap className="w-3 h-3 fill-current" />}
          <span className="text-xs font-black uppercase tracking-wider">
            {isMyTurn ? 'Seu Turno' : activePlayerName}
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800 shrink-0" />

        {/* Phase buttons */}
        <div className="flex items-center gap-0.5">
          {PHASES.map((phase, index) => {
            const isActive = phase.id === currentPhase;
            const isPassed = PHASES.findIndex(p => p.id === currentPhase) > index;
            const isDraw = phase.id === 'DRAW';

            return (
              <button
                key={phase.id}
                onClick={() => handlePhaseClick(phase.id)}
                disabled={!isMyTurn}
                title={`Fase: ${phase.label} (tecla ${phase.shortcut})`}
                className={`
                  relative px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all
                  ${isActive
                    ? isDraw
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)] scale-105'
                      : 'bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.5)] scale-105'
                    : isPassed
                    ? 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-500'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                  ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {phase.label}
                {isActive && isDraw && isMyTurn && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isMyTurn && (
        <button
          onClick={handleNextPhase}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 shrink-0 ${
            currentPhase === 'END'
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(217,119,6,0.4)]'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
          }`}
        >
          {currentPhase === 'END' ? 'Passar Turno' : 'Próxima Fase'}
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}