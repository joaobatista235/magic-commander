import React, { useState, useEffect } from 'react';
import { useBattlefieldStore } from '@/stores/battlefieldStore';
import { X, Search, Loader2, Ghost } from 'lucide-react';
import { motion } from 'framer-motion';

interface TokenModalProps {
  onClose: () => void;
}

export default function TokenModal({ onClose }: TokenModalProps) {
  const { createToken } = useBattlefieldStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'search' | 'custom'>('search');

  // Custom token state
  const [name, setName] = useState('');
  const [power, setPower] = useState('1');
  const [toughness, setToughness] = useState('1');

  useEffect(() => {
    const searchTokens = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`https://api.scryfall.com/cards/search?q=t:token+${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out tokens without images
          const validTokens = (data.data || []).filter((c: any) => c.image_uris && c.image_uris.normal);
          setResults(validTokens);
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(searchTokens, 500);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSelectToken = (token: any) => {
    const imageUrl = token.image_uris.normal;
    createToken(token.name, token.power || '', token.toughness || '', imageUrl);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createToken(name, power, toughness);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4 border-b border-zinc-800 p-4 pb-0 bg-zinc-900/50">
          <button 
            className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${mode === 'search' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setMode('search')}
          >
            Buscar Arte Oficial
          </button>
          <button 
            className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${mode === 'custom' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setMode('custom')}
          >
            Token Customizado
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {mode === 'search' ? (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar ficha (ex: Goblin, Zumbi, Plant...)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  autoFocus
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {results.map((token) => (
                    <div 
                      key={token.id} 
                      className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-amber-500 transition-colors"
                      onClick={() => handleSelectToken(token)}
                    >
                      <img src={token.image_uris.normal} alt={token.name} className="w-full h-auto" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-bold bg-amber-600 px-3 py-1 rounded-full text-xs">Criar Ficha</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.length > 1 ? (
                <div className="text-center py-12 text-zinc-500">
                  Nenhuma ficha oficial encontrada. Tente buscar em inglês.
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-600 text-sm">
                  Digite o nome da ficha para buscar no banco de dados do Scryfall.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Nome do Token</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Goblin, Zumbi..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  autoFocus
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Poder</label>
                  <input
                    type="text"
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors text-center"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Resistência</label>
                  <input
                    type="text"
                    value={toughness}
                    onChange={(e) => setToughness(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors text-center"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <Ghost className="w-5 h-5" />
                Gerar Ficha Genérica
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
