import { useBattlefieldStore } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { GameCardInstance } from '@/stores/battlefieldStore';

export default function PlayerHand() {
  const { cards, changeZone, moveCard, drawCards, mulligan } = useBattlefieldStore();
  const myUserId = useAuthStore(state => state.user?.id);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<GameCardInstance | null>(null);

  if (!myUserId) return null;

  const myHandCards = Object.values(cards).filter(
    c => c.ownerId === myUserId && c.zone === 'HAND'
  );

  useEffect(() => {
    if (hoveredCard && !myHandCards.find(c => c.instanceId === hoveredCard.instanceId)) {
      setHoveredCard(null);
    }
  }, [myHandCards, hoveredCard]);

  const playCardToBattlefield = (instanceId: string) => {
    // Ãrea do jogador: 55% da altura, largura total - 220px do HUD
    const areaW = window.innerWidth - 220;
    const areaH = window.innerHeight * 0.55;
    const centerX = Math.max(20, areaW / 2 - 50);
    const centerY = Math.max(20, areaH / 2 - 70);
    moveCard(instanceId, centerX, centerY);
    changeZone(instanceId, 'BATTLEFIELD');
  };

  return (
    <div className="w-full z-50 shrink-0">
      {/* Toggle */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="bg-zinc-900/90 backdrop-blur border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 text-xs px-4 py-1.5 rounded-full transition-colors"
        >
          {isExpanded ? '▼ Esconder mão' : `▲ Mostrar mão (${myHandCards.length})`}
        </button>
      </div>

      {/* Visualizador Ampliado (Tooltip) */}
      {hoveredCard && isExpanded && (
        <div className="fixed bottom-[180px] left-1/2 -translate-x-1/2 pointer-events-none z-[999]">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="p-1.5 bg-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-black"
          >
            <img
              src={hoveredCard.imageUrl}
              alt={hoveredCard.name}
              className="w-[240px] h-[334px] object-cover rounded-xl"
            />
          </motion.div>
        </div>
      )}

      <motion.div
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              Mão • {myHandCards.length} {myHandCards.length === 1 ? 'carta' : 'cartas'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => drawCards(7)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1 rounded transition-colors font-semibold"
              >
                Comprar 7 Cartas
              </button>
              <button
                onClick={() => {
                  if (confirm('Deseja devolver sua mão atual e comprar 7 novas cartas?')) mulligan();
                }}
                className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 text-xs px-3 py-1 rounded transition-colors font-semibold"
              >
                Mulligan
              </button>
            </div>
          </div>

          <div className="flex items-end justify-center gap-1 overflow-x-auto pb-1 min-h-[130px]">
            {myHandCards.map((card, index) => (
              <motion.div
                key={card.instanceId}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -20, scale: 1.08, zIndex: 50, transition: { duration: 0.15 } }}
                className="relative shrink-0 cursor-pointer group"
                style={{ zIndex: index }}
                onClick={() => playCardToBattlefield(card.instanceId)}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-[90px] h-[126px] object-cover rounded-lg shadow-xl border-2 border-transparent group-hover:border-amber-500 transition-colors"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cards.scryfall.io/normal/back/0/0/00000000-0000-0000-0000-000000000000.jpg?1559591348';
                  }}
                />
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

