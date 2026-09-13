import { motion, useMotionValue } from 'framer-motion';
import { useBattlefieldStore, type GameCardInstance } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import { useState, useRef } from 'react';
import { Skull, Sparkles, Hand, RotateCw, RotateCcw, Crown, Copy } from 'lucide-react';

// Tamanho do grid menor para permitir posicionamento mais livre mas com alinhamento
const GRID_SIZE = 10;
const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

// Troca a versão da imagem Scryfall de "normal" para "large" para melhor resolução
const toHighResUrl = (url: string): string => {
  if (!url) return url;
  // Scryfall CDN: substitui /normal/ por /large/ na URL
  return url.replace('/normal/', '/large/');
};

interface GameCardProps {
  card: GameCardInstance;
  isDraggable?: boolean;
  zoom?: number;
}

// Altura da área da mão em pixels — usada para detectar drop na mão
const HAND_ZONE_HEIGHT = 180;

export default function GameCard({ card, isDraggable = true, zoom = 1 }: GameCardProps) {
  const { moveCard, tapCard, changeZone, setHoveredCardBoard, updateCounters, selectedCards, toggleCardSelection, drawingArrowFrom, setDrawingArrowFrom, addArrow, cloneCard } = useBattlefieldStore();
  const myUserId = useAuthStore(state => state.user?.id);
  const isMine = card.ownerId === myUserId && isDraggable;
  const isSelected = selectedCards.includes(card.instanceId);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);

  const handleDragStart = () => {
    setIsDragging(true);
    setShowMenu(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (drawingArrowFrom && drawingArrowFrom !== card.instanceId) {
      // Finalize arrow
      addArrow({
        id: crypto.randomUUID(),
        fromInstanceId: drawingArrowFrom,
        toInstanceId: card.instanceId,
        color: '#ef4444' // red for attack/target
      });
      setDrawingArrowFrom(null);
      return;
    }

    if (!isMine) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      toggleCardSelection(card.instanceId, true);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    if (!isMine) return;

    motionX.set(0);
    motionY.set(0);

    // Detectar se o card foi solto na área da mão (parte inferior da tela)
    const dropY = event?.clientY ?? (event?.changedTouches?.[0]?.clientY ?? 0);
    const handThreshold = window.innerHeight - HAND_ZONE_HEIGHT;

    if (dropY > handThreshold) {
      // Solto na área da mão — retornar para a mão
      changeZone(card.instanceId, 'HAND');
      return;
    }

    const rawX = card.x + (info.offset.x / zoom);
    const rawY = card.y + (info.offset.y / zoom);
    const newX = Math.max(0, snapToGrid(rawX));
    const newY = Math.max(0, snapToGrid(rawY));
    moveCard(card.instanceId, newX, newY);
  };

  const handleDoubleClick = () => {
    if (!isMine) return;
    tapCard(card.instanceId);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isMine) return;
    // Use real viewport position from the event (accurate regardless of zoom)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right + 4, y: rect.top });
    setShowMenu(prev => !prev);
  };

  const sendToGraveyard = () => { changeZone(card.instanceId, 'GRAVEYARD'); setShowMenu(false); };
  const sendToExile = () => { changeZone(card.instanceId, 'EXILE'); setShowMenu(false); };
  const sendToHand = () => { changeZone(card.instanceId, 'HAND'); setShowMenu(false); };
  const sendToCommand = () => { changeZone(card.instanceId, 'COMMAND'); setShowMenu(false); };
  const doTap = () => { tapCard(card.instanceId); setShowMenu(false); };
  const startArrow = () => { setDrawingArrowFrom(card.instanceId); setShowMenu(false); };
  const doClone = () => { cloneCard(card.instanceId); setShowMenu(false); };

  const highResUrl = toHighResUrl(card.imageUrl);

  return (
    <>
      <motion.div
        ref={cardRef}
        id={`card-${card.instanceId}`}
        drag={isMine && !drawingArrowFrom ? true : false}
        dragMomentum={false}
        dragElastic={0}
        style={{
          position: 'absolute',
          left: card.x,
          top: card.y,
          x: motionX,
          y: motionY,
          zIndex: isDragging ? 1000 : 10,
          transformOrigin: 'center center',
          touchAction: 'none',
          cursor: isMine ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        animate={{ rotate: card.tapped ? 90 : 0 }}
        transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        onMouseEnter={() => setHoveredCardBoard(card)}
        onMouseLeave={() => setHoveredCardBoard(null)}
        className="w-[130px] h-[182px] rounded-xl shadow-2xl"
        whileHover={isMine ? { scale: 1.08, zIndex: 100 } : {}}
      >
        {card.faceDown ? (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-2 border border-zinc-600/20 rounded-lg" />
            <span className="text-zinc-700 font-black text-2xl">M</span>
          </div>
        ) : (
          <img
            src={highResUrl}
            alt={card.name}
            className="w-full h-full object-cover rounded-xl pointer-events-none border-2 border-zinc-700/50"
            draggable={false}
            onError={(e) => {
              // Fallback para URL original se a versão large não existir
              const img = e.target as HTMLImageElement;
              if (img.src !== card.imageUrl) {
                img.src = card.imageUrl;
              }
            }}
          />
        )}

        {isMine && (
          <div className={`absolute inset-0 rounded-xl ring-4 transition-all pointer-events-none ${isSelected ? 'ring-blue-500' : 'ring-transparent hover:ring-amber-500/50'}`} />
        )}

        {card.isCommander && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md">
            CMD
          </div>
        )}

        {card.counters !== 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-600/90 text-white font-black text-xl px-3 py-1 rounded-full shadow-[0_0_15px_rgba(217,119,6,0.5)] flex items-center justify-center border-2 border-amber-400">
            {card.counters > 0 ? `+${card.counters}` : card.counters}
          </div>
        )}

        {card.tapped && (
          <div className="absolute -bottom-1 -left-1 bg-blue-500/90 text-white p-1 rounded-full shadow-sm flex items-center justify-center" title="Virada (tapped)">
            <RotateCcw className="w-3 h-3" />
          </div>
        )}

        {/* Indicador de "solte aqui" quando arrastando para baixo */}
        {isDragging && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 font-bold whitespace-nowrap pointer-events-none bg-zinc-900/80 px-2 py-0.5 rounded-full border border-amber-500/30">
            ↓ mão
          </div>
        )}
      </motion.div>

      {showMenu && isMine && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[1000] bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-2xl py-1 min-w-[160px] text-sm"
            style={{
              left: Math.min(menuPos.x, window.innerWidth - 180),
              top: Math.min(menuPos.y, window.innerHeight - 280),
            }}
          >
            <button onClick={sendToGraveyard} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2">
              <Skull className="w-4 h-4" /> Cemitério
            </button>
            <button onClick={sendToExile} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Exilar
            </button>
            <button onClick={sendToHand} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2">
              <Hand className="w-4 h-4" /> Retornar à Mão
            </button>
            {card.isCommander && (
              <button onClick={sendToCommand} className="w-full text-left px-4 py-2 text-amber-500 hover:bg-zinc-800 transition-colors flex items-center gap-2">
                <Crown className="w-4 h-4" /> Zona de Comando
              </button>
            )}
            <button onClick={doClone} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2">
              <Copy className="w-4 h-4" /> Criar Cópia
            </button>
            <div className="border-t border-zinc-800 my-1" />
            <button onClick={startArrow} className="w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Declarar Alvo (Seta)
            </button>
            <div className="border-t border-zinc-800 my-1" />
            <button onClick={doTap} className="w-full text-left px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2">
              {card.tapped ? <><RotateCcw className="w-4 h-4" /> Desvirar</> : <><RotateCw className="w-4 h-4" /> Virar (Tap)</>}
            </button>
            <div className="border-t border-zinc-800 my-1" />
            <div className="flex items-center justify-between px-4 py-1.5">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Marcadores</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCounters(card.instanceId, -1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center font-bold">-</button>
                <button onClick={() => updateCounters(card.instanceId, 1)} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center font-bold">+</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}