import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ScryfallCard } from '@/services/scryfall';
import { searchCards } from '@/services/scryfall';
import { useDeckStore } from '@/stores/deckStore';
import { Search, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { label: 'Todas', value: '' },
  { label: 'Criaturas', value: 't:creature' },
  { label: 'Instantâneas', value: 't:instant' },
  { label: 'Feitiços', value: 't:sorcery' },
  { label: 'Artefatos', value: 't:artifact' },
  { label: 'Encantamentos', value: 't:enchantment' },
  { label: 'Terrenos', value: 't:land' },
];

export default function CardSearch() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { cards } = useDeckStore();
  const addCard = useDeckStore(state => state.addCard);

  const fetchResults = async (q: string, c: string, p: number) => {
    try {
      const finalQ = [q, c].filter(Boolean).join(' ');
      const res = await searchCards(finalQ, p);
      
      let newCards = res.data || [];
      
      // Aplicar ordenação inteligente sempre que houver uma busca por nome (q), independente da categoria (c)
      if (q && p === 1) {
        const lowerQ = q.toLowerCase();
        newCards.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName === lowerQ && bName !== lowerQ) return -1;
          if (bName === lowerQ && aName !== lowerQ) return 1;
          if (aName.startsWith(lowerQ) && !bName.startsWith(lowerQ)) return -1;
          if (bName.startsWith(lowerQ) && !aName.startsWith(lowerQ)) return 1;
          if (aName.includes(lowerQ) && !bName.includes(lowerQ)) return -1;
          if (bName.includes(lowerQ) && !aName.includes(lowerQ)) return 1;
          return 0;
        });
      }

      setHasMore(res.has_more);
      
      if (p === 1) {
        setResults(newCards);
      } else {
        setResults(prev => [...prev, ...newCards]);
      }
    } catch (error) {
      if (p === 1) setResults([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setPage(1);
      setLoading(true);
      await fetchResults(query, category, 1);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, category]);

  useEffect(() => {
    if (page > 1) {
      setLoadingMore(true);
      fetchResults(query, category, page).finally(() => setLoadingMore(false));
    }
  }, [page]);

  const handleScroll = () => {
    if (!scrollRef.current || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      setPage(p => p + 1);
    }
  };

  const getImageUri = (card: ScryfallCard) => {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
    return '';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 flex-1 min-w-0">
      <div className="p-6 border-b border-zinc-800 relative shrink-0 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input 
            placeholder="Buscar cartas pelo nome..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 pl-12 bg-zinc-900 border-zinc-800 text-zinc-100 text-lg rounded-xl focus-visible:ring-1 focus-visible:ring-zinc-600 transition-all"
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 animate-spin" />}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.label}
              variant={category === cat.value ? 'default' : 'outline'}
              onClick={() => setCategory(cat.value)}
              className={`shrink-0 h-8 text-xs rounded-full ${category === cat.value ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 px-6 py-4 custom-scrollbar"
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 pb-8">
          {results.map((card, idx) => {
            const img = getImageUri(card);
            if (!img) return null;
            const isSelected = cards.some(c => c.id === card.id);
            
            return (
              <div 
                key={`${card.id}-${idx}`} 
                className={`group relative rounded-xl overflow-hidden shadow-sm transition-all ${isSelected ? 'opacity-40 grayscale-[50%] pointer-events-none' : 'cursor-pointer hover:shadow-xl hover:-translate-y-1'}`}
                onClick={() => {
                  if (!isSelected) addCard(card);
                }}
              >
                <img 
                  src={img} 
                  alt={card.name}
                  className="w-full h-auto object-cover rounded-xl bg-zinc-900 min-h-[200px]"
                  loading="lazy"
                />
                {!isSelected && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white font-semibold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm">
                      Adicionar
                    </span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold bg-green-600/80 px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm">
                      No Deck
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && results.length === 0 && (
          <div className="text-center text-zinc-500 py-12">
            Nenhuma carta encontrada.
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
