import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDeckStore } from '@/stores/deckStore';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Play, Trash2, LogOut, Loader2, Upload } from 'lucide-react';
import { fetchDecks, deleteDeckRemote } from '@/services/deckService';
import ImportDeckModal from '@/features/deck-builder/components/ImportDeckModal';

import { upsertDeck } from '@/services/deckService';
import { v4 as uuidv4 } from 'uuid';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { decks, createNewDeck, loadDeck, deleteDeck, saveCurrentDeck, setDecks, syncing, setSyncing } = useDeckStore();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSyncing(true);
    fetchDecks().then(async (remote) => {
      // Migrate local decks with timestamp IDs to UUIDs
      const localDecks = useDeckStore.getState().decks;
      let migratedDecks = false;
      const validLocalDecks = localDecks.map(d => {
        if (d.id.length !== 36) {
          migratedDecks = true;
          return { ...d, id: uuidv4() };
        }
        return d;
      });

      if (migratedDecks) {
        setDecks(validLocalDecks);
        for (const d of validLocalDecks) {
          if (d.id.length === 36) await upsertDeck(d, user.id);
        }
      } else if (remote.length > 0) {
        setDecks(remote);
      }
    }).finally(() => setSyncing(false));
  }, [user]);

  const handleCreateDeck = async () => {
    const id = createNewDeck();
    loadDeck(id);
    const newDeck = saveCurrentDeck('Novo Deck');
    if (newDeck && user) {
      await upsertDeck(newDeck, user.id);
    }
    navigate('/decks/new/edit');
  };

  const handleOpenDeck = (id: string) => {
    loadDeck(id);
    navigate('/decks/new/edit');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/commander-logo.png" alt="Commander Logo" className="w-8 h-8 object-contain" />
          <span className="font-semibold tracking-tight">Commander</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 hidden sm:block">{user.email}</span>
            <button
              onClick={() => navigate('/profile')}
              className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold uppercase border border-zinc-700/50 hover:border-amber-500/30 transition-all"
              title="Meu Perfil"
            >
              {user.displayName.charAt(0)}
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { logout(); navigate('/login'); }}
              className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="z-10 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Pronto para jogar?</h2>
            <p className="text-zinc-400">Junte-se a uma sala pública ou crie uma partida privada com amigos.</p>
          </div>
          
          <Button 
            onClick={() => navigate('/lobby')}
            className="z-10 h-12 px-8 bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-900/20 text-base rounded-xl transition-all hover:scale-105"
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Entrar no Lobby
          </Button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Decks</h1>
            <p className="text-zinc-400 mt-1">Gerencie suas coleções e construa novas estratégias.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImport(true)}
              className="h-11 px-5 bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button
              onClick={handleCreateDeck}
              className="h-11 px-6 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Deck
            </Button>
          </div>
        </div>

        {decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => {
              const commander = deck.cards.find(c => c.isCommander);
              const cardCount = deck.cards.reduce((acc, c) => acc + c.quantity, 0);
              
              return (
                <div key={deck.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-zinc-100">{deck.name}</h3>
                      <p className="text-sm text-zinc-400">{cardCount} cartas</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={async () => {
                        deleteDeck(deck.id);
                        if (user) await deleteDeckRemote(deck.id).catch(console.error);
                      }} 
                      className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {commander ? (
                    <div className="mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-amber-500/30">
                        {commander.image_uris?.small || commander.card_faces?.[0]?.image_uris?.small ? (
                          <img src={commander.image_uris?.small || commander.card_faces?.[0]?.image_uris?.small} alt="Cmdr" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm text-zinc-300 font-medium truncate">{commander.name}</p>
                        <p className="text-xs text-amber-500/70">Comandante</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 h-10 flex items-center">
                      <p className="text-sm text-zinc-500 italic">Sem comandante definido</p>
                    </div>
                  )}

                  <div className="mt-auto">
                    <Button onClick={() => handleOpenDeck(deck.id)} variant="outline" className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-800">
                      <Play className="h-4 w-4 mr-2" />
                      Editar Deck
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center">
            <Layers className="h-12 w-12 text-zinc-700 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Você ainda não tem decks</h2>
            <p className="text-zinc-500 mb-6 max-w-md">
              Seu arsenal está vazio. Crie um deck do zero ou importe uma lista existente.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowImport(true)}
                variant="outline"
                className="h-11 px-6 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Deck
              </Button>
              <Button
                onClick={handleCreateDeck}
                variant="outline"
                className="h-11 px-6 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Deck
              </Button>
            </div>
          </div>
        )}
      </main>

      {showImport && (
        <ImportDeckModal
          onClose={() => setShowImport(false)}
          onImported={(deckId) => {
            setShowImport(false);
            loadDeck(deckId);
            navigate('/decks/new/edit');
          }}
        />
      )}
    </div>
  );
}
