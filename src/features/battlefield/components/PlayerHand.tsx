import { useBattlefieldStore } from "@/stores/battlefieldStore";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { GameCardInstance } from "@/stores/battlefieldStore";
import { Hand } from "lucide-react";

export default function PlayerHand() {
  const { cards, changeZone, moveCard, drawCards, mulligan } = useBattlefieldStore();
  const myUserId = useAuthStore(state => state.user?.id);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<GameCardInstance | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const handRef = useRef<HTMLDivElement>(null);

  if (!myUserId) return null;

  const myHandCards = Object.values(cards).filter(
    c => c.ownerId === myUserId && c.zone === "HAND"
  );

  useEffect(() => {
    if (hoveredCard && !myHandCards.find(c => c.instanceId === hoveredCard.instanceId)) {
      setHoveredCard(null);
    }
  }, [myHandCards, hoveredCard]);

  const playCardToBattlefield = (instanceId: string, dropX?: number, dropY?: number) => {
    const areaW = window.innerWidth - 240;
    const areaH = window.innerHeight * 0.55;
    const targetX = dropX !== undefined
      ? Math.max(20, Math.min(dropX - 65, areaW - 150))
      : Math.max(20, areaW / 2 - 65);
    const targetY = dropY !== undefined
      ? Math.max(20, Math.min(dropY - 91, areaH - 200))
      : Math.max(20, areaH / 2 - 91);
    moveCard(instanceId, targetX, targetY);
    changeZone(instanceId, "BATTLEFIELD");
  };

  const handleDragEnd = (instanceId: string, event: any) => {
    setDraggingId(null);
    const clientY = event?.clientY ?? event?.changedTouches?.[0]?.clientY;
    const clientX = event?.clientX ?? event?.changedTouches?.[0]?.clientX;
    if (clientY === undefined) return;
    const handTop = handRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    if (clientY < handTop - 20) {
      playCardToBattlefield(instanceId, clientX, clientY);
    }
  };

  return (
    <div className="w-full z-50 shrink-0" ref={handRef}>
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="bg-zinc-900/90 backdrop-blur border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 text-xs px-4 py-1.5 rounded-full transition-colors"
        >
          {isExpanded ? (
            <><Hand className="w-3 h-3" /> Esconder mão</>
          ) : (
            <><Hand className="w-3 h-3" /> Mostrar mão ({myHandCards.length})</>
          )}
        </button>
      </div>

      {hoveredCard && isExpanded && !draggingId && (
        <div className="fixed bottom-[180px] left-1/2 -translate-x-1/2 pointer-events-none z-[999]">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="p-1.5 bg-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-black"
          >
            <img src={hoveredCard.imageUrl} alt={hoveredCard.name} className="w-[240px] h-[334px] object-cover rounded-xl" />
          </motion.div>
        </div>
      )}

      <motion.div
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              Mão · {myHandCards.length} {myHandCards.length === 1 ? "carta" : "cartas"}
              {draggingId && <span className="text-amber-400 animate-pulse">Arraste para a mesa</span>}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => drawCards(7)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1 rounded transition-colors font-semibold">
                Comprar 7 Cartas
              </button>
              <button
                onClick={() => { if (confirm("Devolver mão e comprar 7 novas cartas?")) mulligan(); }}
                className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 text-xs px-3 py-1 rounded transition-colors font-semibold"
              >
                Mulligan
              </button>
            </div>
          </div>
          <div className="flex items-end justify-center gap-1 overflow-x-auto pb-1 min-h-[130px]" style={{ overflowY: 'visible' }}>
            {myHandCards.map((card, index) => (
              <motion.div
                key={card.instanceId}
                drag
                dragMomentum={false}
                dragElastic={0}
                dragSnapToOrigin={false}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                whileHover={draggingId ? {} : { y: -20, scale: 1.08, zIndex: 50, transition: { duration: 0.15 } }}
                whileDrag={{ scale: 1.18, zIndex: 500, cursor: "grabbing", opacity: 1 }}
                className="relative shrink-0 cursor-grab group"
                style={{ zIndex: draggingId === card.instanceId ? 500 : index, position: 'relative' }}
                onDragStart={() => { setDraggingId(card.instanceId); setHoveredCard(null); }}
                onDragEnd={(e) => handleDragEnd(card.instanceId, e)}
                onClick={() => { if (!draggingId) playCardToBattlefield(card.instanceId); }}
                onMouseEnter={() => { if (!draggingId) setHoveredCard(card); }}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  draggable={false}
                  className={`w-[90px] h-[126px] object-cover rounded-lg shadow-xl border-2 transition-colors ${draggingId === card.instanceId ? "border-amber-400" : "border-transparent group-hover:border-amber-500"}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://cards.scryfall.io/normal/back/0/0/00000000-0000-0000-0000-000000000000.jpg?1559591348"; }}
                />
                {draggingId === card.instanceId && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 font-bold whitespace-nowrap pointer-events-none bg-zinc-900/90 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ↑ campo
                  </div>
                )}
              </motion.div>
            ))}
            {myHandCards.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-sm h-[130px]">
                Sua mão está vazia — compre uma carta do grimório.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
