import { useBattlefieldStore, type GameCardInstance } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import GameCard from './GameCard';
import ZoneViewer from './ZoneViewer';
import ArrowOverlay from './ArrowOverlay';
import TokenModal from './TokenModal';
import ChatPanel from './ChatPanel';
import ActionLog, { logAction } from './ActionLog';
import ConfirmModal from '@/components/ConfirmModal';
import { Layers, BookOpen, Flame, Crown, Swords, Heart, Skull, Sparkles, RotateCw, Check, Ghost, Sword } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { leaveRoom } from '@/services/lobbyService';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_OPPONENTS = [
  { userId: 'opp1', life: 40, commanderDamage: {} as Record<string,number>, name: 'Jogador 2' },
  { userId: 'opp2', life: 38, commanderDamage: {} as Record<string,number>, name: 'Jogador 3' },
  { userId: 'opp3', life: 35, commanderDamage: {} as Record<string,number>, name: 'Jogador 4' },
];

interface GameBoardProps {
  navigate: (path: string) => void;
  roomId?: string;
  userId?: string;
}

export default function GameBoard({ navigate, roomId, userId }: GameBoardProps) {
  const store = useBattlefieldStore();
  const { cards, players, myUserId, changeZone, changeLife, hoveredCardBoard, selectedCards, clearSelection, tapSelected, shuffleLibrary, activePlayerId, currentPhase } = store;
  const user = useAuthStore(state => state.user);
  const [viewingZone, setViewingZone] = useState<'GRAVEYARD' | 'EXILE' | 'LIBRARY' | null>(null);
  const [viewingZoneUser, setViewingZoneUser] = useState<string | null>(null);
  const [showMockOpponents, setShowMockOpponents] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const [isShuffled, setIsShuffled] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showArrangeConfirm, setShowArrangeConfirm] = useState(false);
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  // Commander damage: Map of { [targetUserId]: { [commanderInstanceId]: damage } }
  const [cmdDmg, setCmdDmg] = useState<Record<string, Record<string, number>>>({});
  const prevLifeRef = useRef<Record<string, number>>({});

  if (!myUserId) return null;

  const visibleCards = Object.values(cards).filter(c => c.zone === 'BATTLEFIELD');
  const commandCards = Object.values(cards).filter(c => c.zone === 'COMMAND');
  const myLibrary = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'LIBRARY');
  const myGraveyard = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'GRAVEYARD');
  const myExile = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'EXILE');

  const drawCard = () => {
    if (myLibrary.length === 0) return;
    changeZone(myLibrary[0].instanceId, 'HAND');
    const myName = user?.displayName || 'Você';
    logAction({ type: 'draw', actorName: myName, message: 'comprou uma carta.' });
  };

  const realOpponents = Object.values(players).filter(p => p.userId !== myUserId);
  const displayOpponents = (showMockOpponents && realOpponents.length === 0) ? MOCK_OPPONENTS : realOpponents;

  const spawnX = () => Math.max(20, (window.innerWidth - 240) / 2 - 50);
  const spawnY = () => Math.max(20, (window.innerHeight * 0.45) / 2 - 70);

  const isMyTurn = activePlayerId === myUserId || !activePlayerId;

  // Watch for death (life reaching 0 or below)
  useEffect(() => {
    Object.values(players).forEach(p => {
      const prevLife = prevLifeRef.current[p.userId];
      if (prevLife !== undefined && prevLife > 0 && p.life <= 0) {
        const name = p.userId === myUserId ? 'Você' : `Jogador ${p.userId.slice(0, 4)}`;
        setDeathNotice(`${name} ${p.userId === myUserId ? 'foi eliminado!' : 'foi eliminado!'}`);
        logAction({ type: 'life', actorName: name, message: 'foi eliminado! (vida zerada)' });
        setTimeout(() => setDeathNotice(null), 4000);
      }
      prevLifeRef.current[p.userId] = p.life;
    });
  }, [players]);

  const handleChangeLife = (userId: string, delta: number) => {
    changeLife(userId, delta);
    const myName = user?.displayName || 'Você';
    logAction({ type: 'life', actorName: myName, message: `${delta > 0 ? 'ganhou' : 'perdeu'} ${Math.abs(delta)} ponto${Math.abs(delta) !== 1 ? 's' : ''} de vida.` });
  };

  const handleAddCmdDmg = (targetUserId: string, cmdId: string, delta: number) => {
    setCmdDmg(prev => {
      const targetMap = { ...(prev[targetUserId] || {}) };
      targetMap[cmdId] = Math.max(0, (targetMap[cmdId] || 0) + delta);
      return { ...prev, [targetUserId]: targetMap };
    });
    // Apply real life damage too
    if (delta > 0) {
      changeLife(targetUserId, -delta);
      const cmdCard = cards[cmdId];
      logAction({ type: 'life', actorName: cmdCard?.name || 'Comandante', message: `causou ${delta} de dano de comandante.` });
    }
  };

  const myCommanderIds = commandCards
    .filter(c => c.ownerId === myUserId)
    .concat(visibleCards.filter(c => c.ownerId === myUserId && c.isCommander))
    .map(c => c.instanceId);

  return (
    <div className="w-full h-full flex overflow-hidden select-none text-zinc-100 relative" style={{ background: '#0c0c0e' }}>
      <ArrowOverlay />

      {/* Death Notice */}
      <AnimatePresence>
        {deathNotice && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-red-950/90 border border-red-700/60 rounded-2xl shadow-2xl shadow-red-900/50 backdrop-blur-sm">
              <Skull className="w-6 h-6 text-red-400" />
              <span className="text-red-300 font-bold text-lg">{deathNotice}</span>
              <Skull className="w-6 h-6 text-red-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Turn Banner */}
      {isMyTurn && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Seu Turno</span>
          </div>
        </motion.div>
      )}

      {/* Botao Sair da Mesa */}
      <div className="absolute top-3 left-3 z-50">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/40 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
        >
          Sair da Mesa
        </button>
      </div>

      {/* Visualizador de carta em foco (hover) */}
      {hoveredCardBoard && hoveredCardBoard.imageUrl && (
        <div className="absolute left-3 top-16 z-40 pointer-events-none">
          <div className="p-1.5 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-2xl shadow-2xl">
            <img
              src={hoveredCardBoard.imageUrl}
              alt={hoveredCardBoard.name}
              className="w-[240px] h-[336px] object-cover rounded-xl"
            />
          </div>
        </div>
      )}

      {/* AREA CENTRAL (Mesa) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Metade Superior: Oponentes */}
        <div className="flex border-b-2 border-zinc-800" style={{ height: '45%', minHeight: 0 }}>
          {displayOpponents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
              <Swords className="w-12 h-12 opacity-20 text-zinc-500" />
              <p className="font-medium italic text-sm">Aguardando oponentes...</p>
              <button
                onClick={() => setShowMockOpponents(true)}
                className="text-xs text-zinc-700 hover:text-amber-500 underline transition-colors"
              >
                Visualizar layout de 4 jogadores
              </button>
            </div>
          ) : (
            displayOpponents.map((opponent, index) => {
              const isLast = index === displayOpponents.length - 1;
              let oppCards = visibleCards.filter(c => c.ownerId === opponent.userId);
              if (opponent.userId.startsWith('opp')) {
                oppCards = Array.from({ length: 15 }).map((_, i) => ({
                  instanceId: `mock-${opponent.userId}-${i}`,
                  ownerId: opponent.userId,
                  scryfallId: 'mock',
                  name: 'Carta Simulada',
                  imageUrl: 'https://cards.scryfall.io/normal/front/1/c/1c1f73d4-6331-4820-8025-56de05252875.jpg',
                  zone: 'BATTLEFIELD',
                  x: 20 + (i % 5) * 110,
                  y: 20 + Math.floor(i / 5) * 150,
                  tapped: i % 4 === 0,
                  faceDown: i % 3 === 0,
                  isCommander: false
                } as GameCardInstance));
              }
              const oppName = 'name' in opponent ? (opponent as any).name : `Jogador ${index + 2}`;
              const isOppTurn = activePlayerId === opponent.userId;
              return (
                <div
                  key={opponent.userId}
                  className={`flex-1 relative flex flex-col min-w-0 overflow-hidden ${!isLast ? 'border-r-2 border-zinc-800' : ''} ${isOppTurn ? 'ring-2 ring-inset ring-amber-500/20' : ''}`}
                  style={{ background: '#0f0f12' }}
                >
                  <div className={`h-10 border-b border-zinc-800 flex items-center px-3 justify-between shrink-0 gap-2 ${isOppTurn ? 'bg-amber-900/10' : 'bg-zinc-900/60'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {isOppTurn && (
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
                      )}
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center text-[9px] font-black text-zinc-400 shrink-0">
                        {index + 2}
                      </div>
                      <span className="font-semibold text-xs text-zinc-300 truncate">{oppName}</span>
                      {isOppTurn && <span className="text-[9px] text-amber-500 font-black uppercase tracking-wider shrink-0">• Turno</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => { setViewingZone('GRAVEYARD'); setViewingZoneUser(opponent.userId); }} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 transition-colors">Cemitério</button>
                      <button onClick={() => { setViewingZone('EXILE'); setViewingZoneUser(opponent.userId); }} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 transition-colors">Exílio</button>
                      <Heart className="w-3 h-3 text-zinc-600 ml-2" />
                      <span className={`text-lg font-black leading-none ${opponent.life <= 10 ? 'text-red-500' : 'text-zinc-100'}`}>
                        {opponent.life}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 flex flex-col pointer-events-none opacity-30">
                      <div className="flex-1 border-b border-dashed border-zinc-800" />
                      <div className="flex-1" />
                    </div>
                    <div className="absolute" style={{ top: '-50%', left: '-50%', width: '200%', height: '200%', transform: 'scale(0.5) rotate(180deg)' }}>
                      {oppCards.map(card => (
                        <GameCard key={card.instanceId} card={card} isDraggable={false} />
                      ))}
                    </div>
                    {oppCards.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-xs italic">
                        campo vazio
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Metade Inferior: Minha Area */}
        <div
          className={`relative flex-1 overflow-hidden ${isMyTurn ? 'ring-2 ring-inset ring-amber-500/10' : ''}`}
          style={{ background: '#0e0e10' }}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'my-board-bg') {
              clearSelection();
            }
          }}
        >
          <div
            id="my-board-bg"
            className="absolute top-0 left-0"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`
            }}
          >
            {/* Grid visual */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
                backgroundSize: '110px 110px',
                backgroundPosition: '0 0',
                opacity: 0.6,
              }}
            />
            {/* Linha divisoria Criaturas / Terras */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              <div className="flex-[2] border-b border-dashed border-amber-900/20 flex items-end justify-center pb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-900/30">Criaturas</span>
              </div>
              <div className="flex-1 flex items-end justify-center pb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-900/30">Terras</span>
              </div>
            </div>

            {visibleCards.filter(c => c.ownerId === myUserId).map(card => (
              <GameCard key={card.instanceId} card={card} isDraggable={true} zoom={zoom} />
            ))}
          </div>
        </div>
      </div>

      {/* PAINEL LATERAL DIREITO */}
      <div className="w-[240px] shrink-0 border-l-2 border-zinc-800 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ background: '#0a0a0c' }}>

        {players[myUserId] && (
          <div className="p-4 border-b border-zinc-800">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2 text-center">Minha Vida</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleChangeLife(myUserId, -1)}
                className="w-9 h-9 bg-zinc-900 hover:bg-red-900/30 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-400 rounded-xl flex items-center justify-center font-black text-xl transition-all"
              >-</button>
              <span className={`text-5xl font-black min-w-[2ch] text-center tabular-nums ${players[myUserId].life <= 10 ? 'text-red-500' : 'text-zinc-100'}`}>
                {players[myUserId].life}
              </span>
              <button
                onClick={() => handleChangeLife(myUserId, 1)}
                className="w-9 h-9 bg-zinc-900 hover:bg-green-900/30 border border-zinc-800 hover:border-green-800 text-zinc-400 hover:text-green-400 rounded-xl flex items-center justify-center font-black text-xl transition-all"
              >+</button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="text-zinc-600 font-bold uppercase tracking-widest text-[9px]">Zoom</span>
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-zinc-400 font-mono w-8 text-right">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setShowArrangeConfirm(true)}
                className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
              >
                Organizar Mesa
              </button>

              {selectedCards.length > 0 && (
                <button
                  onClick={() => tapSelected()}
                  className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3 h-3" />
                  Virar {selectedCards.length}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Commander Damage Tracker */}
        {displayOpponents.length > 0 && myCommanderIds.length > 0 && (
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
              <Sword className="w-3 h-3" /> Dano de Comandante
            </p>
            {displayOpponents.map((opp, oi) => {
              const oppName = 'name' in opp ? (opp as any).name : `J${oi + 2}`;
              return (
                <div key={opp.userId} className="mb-2">
                  <p className="text-[9px] text-zinc-600 font-bold truncate mb-1">{oppName}</p>
                  {myCommanderIds.map(cmdId => {
                    const dmg = cmdDmg[opp.userId]?.[cmdId] || 0;
                    const cmdCard = cards[cmdId];
                    return (
                      <div key={cmdId} className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-zinc-500 flex-1 truncate">{cmdCard?.name || 'CMD'}</span>
                        <button
                          onClick={() => handleAddCmdDmg(opp.userId, cmdId, -1)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center justify-center"
                        >-</button>
                        <span className={`text-sm font-black min-w-[2ch] text-center tabular-nums ${dmg >= 21 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {dmg}
                        </span>
                        <button
                          onClick={() => handleAddCmdDmg(opp.userId, cmdId, 1)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center justify-center"
                        >+</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <p className="text-[9px] text-zinc-700 italic mt-1">21+ = eliminado</p>
          </div>
        )}

        <div className="p-3 border-b border-zinc-800">
          <p className="text-[10px] text-amber-600/70 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Comando
          </p>
          {commandCards.filter(c => c.ownerId === myUserId).length > 0 ? (
            <div className="flex flex-col gap-2">
              {commandCards.filter(c => c.ownerId === myUserId).map(cmd => (
                <div key={cmd.instanceId} className="relative group">
                  <img src={cmd.imageUrl} alt={cmd.name} className="w-full h-auto rounded-lg border border-zinc-800 group-hover:border-amber-600/50 transition-colors" />
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 rounded-lg">
                    <button
                      onClick={() => {
                        changeZone(cmd.instanceId, 'BATTLEFIELD');
                        store.moveCard(cmd.instanceId, spawnX(), spawnY());
                        logAction({ type: 'zone', actorName: user?.displayName || 'Você', message: `jogou ${cmd.name} para a mesa.` });
                      }}
                      className="text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-lg w-[80%] transition-colors"
                    >
                      Para a Mesa
                    </button>
                    <button
                      onClick={() => changeZone(cmd.instanceId, 'HAND')}
                      className="text-[10px] font-bold bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-1 rounded-lg w-[80%] transition-colors"
                    >
                      Para a Mão
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-20 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center">
              <span className="text-zinc-700 text-xs text-center px-2">Comandante na Mesa</span>
            </div>
          )}
        </div>

        <div className={`p-3 border-b border-zinc-800 transition-all ${myLibrary.length > 0 ? '' : 'opacity-60'}`}>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Grimório
          </p>
          <div
            onClick={() => myLibrary.length > 0 && drawCard()}
            className={`flex items-center justify-between px-1 ${myLibrary.length > 0 ? 'cursor-pointer group' : ''}`}
          >
            <div className={`w-12 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 rounded-lg flex items-center justify-center relative overflow-hidden transition-colors ${currentPhase === 'DRAW' && isMyTurn ? 'border-amber-500/70 shadow-[0_0_12px_rgba(217,119,6,0.3)]' : 'border-zinc-700 group-hover:border-amber-600/30'}`}>
              <div className="absolute inset-1 border border-zinc-600/20 rounded" />
              <Layers className="h-4 w-4 text-zinc-600 relative z-10" />
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black tabular-nums transition-colors ${currentPhase === 'DRAW' && isMyTurn ? 'text-amber-400' : 'text-zinc-200 group-hover:text-amber-500'}`}>{myLibrary.length}</p>
              <p className="text-[10px] text-zinc-600">cartas</p>
              {currentPhase === 'DRAW' && isMyTurn && (
                <p className="text-[9px] text-amber-500 font-bold animate-pulse">Compre!</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => { setViewingZone('LIBRARY'); setViewingZoneUser(myUserId); }}
              className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
            >
              Buscar
            </button>
            <button
              onClick={() => setIsCreatingToken(true)}
              className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/40 text-amber-500 rounded transition-colors flex items-center justify-center gap-1"
            >
              <Ghost className="w-3 h-3" /> Ficha
            </button>
            <button
              onClick={() => {
                shuffleLibrary();
                setIsShuffled(true);
                logAction({ type: 'system', actorName: user?.displayName || 'Você', message: 'embaralhou o grimório.' });
                setTimeout(() => setIsShuffled(false), 1500);
              }}
              className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1 ${
                isShuffled ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {isShuffled ? <Check className="w-3 h-3" /> : null}
              {isShuffled ? 'Embaralhado' : 'Embaralhar'}
            </button>
          </div>
        </div>

        <div
          onClick={() => { setViewingZone('GRAVEYARD'); setViewingZoneUser(myUserId); }}
          className="p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        >
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Cemitério
          </p>
          <div className="flex items-center justify-between px-1">
            <Skull className="w-5 h-5 text-zinc-600" />
            <span className="text-2xl font-black text-zinc-400 tabular-nums">{myGraveyard.length}</span>
          </div>
        </div>

        <div
          onClick={() => { if (myExile.length > 0) { setViewingZone('EXILE'); setViewingZoneUser(myUserId); } }}
          className={`p-3 transition-colors ${myExile.length > 0 ? 'cursor-pointer hover:bg-zinc-900/50' : 'opacity-40 cursor-default'}`}
        >
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Exílio
          </p>
          <div className="flex items-center justify-between px-1">
            <Sparkles className="w-5 h-5 text-zinc-600" />
            <span className="text-2xl font-black text-zinc-400 tabular-nums">{myExile.length}</span>
          </div>
        </div>

        {/* Chat + Log no painel */}
        <div className="mt-auto">
          <ActionLog />
          <ChatPanel />
        </div>
      </div>

      {viewingZone && viewingZoneUser && (
        <ZoneViewer zone={viewingZone} userId={viewingZoneUser} onClose={() => { setViewingZone(null); setViewingZoneUser(null); }} />
      )}

      {isCreatingToken && (
        <TokenModal onClose={() => setIsCreatingToken(false)} />
      )}

      {/* Modais de confirmação customizados */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <ConfirmModal
            title="Sair da Partida"
            message="Tem certeza que deseja abandonar a mesa? Seus oponentes continuarão jogando."
            confirmLabel="Sair da Mesa"
            danger={true}
            onConfirm={async () => {
              setShowLeaveConfirm(false);
              if (roomId && userId) await leaveRoom(roomId, userId);
              navigate('/lobby');
            }}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
        {showArrangeConfirm && (
          <ConfirmModal
            title="Organizar Mesa"
            message="Suas cartas serão reorganizadas em grade, com criaturas na parte superior e terras na inferior."
            confirmLabel="Organizar"
            onConfirm={() => {
              setShowArrangeConfirm(false);
              store.autoArrange();
              logAction({ type: 'system', actorName: user?.displayName || 'Você', message: 'organizou a mesa em grade.' });
            }}
            onCancel={() => setShowArrangeConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
