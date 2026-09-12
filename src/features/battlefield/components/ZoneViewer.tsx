import { useBattlefieldStore, type GameCardInstance, type Zone } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import { X } from 'lucide-react';

interface ZoneViewerProps {
  zone: 'GRAVEYARD' | 'EXILE' | 'LIBRARY';
  userId: string;
  onClose: () => void;
}

export default function ZoneViewer({ zone, userId, onClose }: ZoneViewerProps) {
  const { cards, players, changeZone, moveCard } = useBattlefieldStore();
  const myUserId = useAuthStore(state => state.user?.id);

  if (!myUserId || !userId) return null;

  const isMine = userId === myUserId;
  const playerName = isMine ? 'Seu' : (players[userId] && 'name' in players[userId] ? (players[userId] as any).name : 'Oponente');

  const zoneCards = Object.values(cards).filter(
    c => c.ownerId === userId && c.zone === zone
  );

  const title = zone === 'GRAVEYARD' ? 'Cemitério' : zone === 'EXILE' ? 'Exílio' : 'Grimório';
  const displayTitle = isMine ? title : `${title} (${playerName})`;

  const moveTo = (instanceId: string, targetZone: Zone) => {
    if (targetZone === 'BATTLEFIELD') {
      const areaW = window.innerWidth - 220;
      const areaH = window.innerHeight * 0.55;
      const centerX = Math.max(20, areaW / 2 - 50);
      const centerY = Math.max(20, areaH / 2 - 70);
      moveCard(instanceId, centerX, centerY);
    }
    changeZone(instanceId, targetZone);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{displayTitle}</h2>
            <p className="text-zinc-500 text-sm">{zoneCards.length} {zoneCards.length === 1 ? 'carta' : 'cartas'}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {zoneCards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic">
              {isMine ? `Seu ${title.toLowerCase()} está vazio.` : `O ${title.toLowerCase()} do oponente está vazio.`}
            </div>
          ) : zone === 'LIBRARY' ? (
            <div className="flex flex-col gap-6">
              {Object.entries(
                zoneCards.reduce((acc, card) => {
                  const t = (card.typeLine || '').toLowerCase();
                  let cat = 'Outros';
                  if (t.includes('creature')) cat = 'Criaturas';
                  else if (t.includes('land')) cat = 'Terrenos';
                  else if (t.includes('artifact')) cat = 'Artefatos';
                  else if (t.includes('enchantment')) cat = 'Encantamentos';
                  else if (t.includes('planeswalker')) cat = 'Planeswalkers';
                  else if (t.includes('instant')) cat = 'Instantâneas';
                  else if (t.includes('sorcery')) cat = 'Feitiços';
                  
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(card);
                  return acc;
                }, {} as Record<string, GameCardInstance[]>)
              ).map(([category, cards]) => (
                <div key={category}>
                  <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-3 border-b border-zinc-800 pb-1">{category} ({cards.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {cards.map(card => (
                      <div key={card.instanceId} className="relative group">
                        <img src={card.imageUrl} alt={card.name} className="w-full h-auto object-cover rounded-lg shadow-lg border border-transparent group-hover:border-amber-500/50 transition-colors" />
                        {isMine && (
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-lg p-2">
                            <button onClick={() => moveTo(card.instanceId, 'HAND')} className="w-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded">Para a Mão</button>
                            <button onClick={() => moveTo(card.instanceId, 'BATTLEFIELD')} className="w-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded">Para a Mesa</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {zoneCards.map((card) => (
                <div
                  key={card.instanceId}
                  className="relative group"
                >
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto object-cover rounded-lg shadow-lg border border-transparent group-hover:border-amber-500/50 transition-colors"
                  />
                  
                  {/* Menu Overlay na Carta */}
                  {isMine && (
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-lg p-2">
                      <button 
                        onClick={() => moveTo(card.instanceId, 'HAND')}
                        className="w-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded"
                      >
                        Para a Mão
                      </button>
                      <button 
                        onClick={() => moveTo(card.instanceId, 'BATTLEFIELD')}
                        className="w-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded"
                      >
                        Para a Mesa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
