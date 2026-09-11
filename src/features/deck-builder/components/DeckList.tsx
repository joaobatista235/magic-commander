import { useDeckStore, type DeckCard } from '@/stores/deckStore';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Minus, Plus, Trash2, Save, Download, Check, Loader2, List, LayoutList, ChevronDown, ChevronRight } from 'lucide-react';
import { upsertDeck } from '@/services/deckService';

type ViewMode = 'list' | 'grouped';

interface CategoryGroup {
  label: string;
  cards: DeckCard[];
  color: string;
}

function getCardCategory(card: DeckCard): string {
  const type = card.type_line?.toLowerCase() || '';
  if (card.isCommander) return 'Comandante';
  if (type.includes('land')) return 'Terrenos';
  if (type.includes('creature')) return 'Criaturas';
  if (type.includes('planeswalker')) return 'Planeswalkers';
  if (type.includes('instant')) return 'Mágicas Instantâneas';
  if (type.includes('sorcery')) return 'Feitiços';
  if (type.includes('enchantment')) return 'Encantamentos';
  if (type.includes('artifact')) return 'Artefatos';
  return 'Outros';
}

const CATEGORY_ORDER = [
  'Comandante',
  'Criaturas',
  'Planeswalkers',
  'Mágicas Instantâneas',
  'Feitiços',
  'Encantamentos',
  'Artefatos',
  'Terrenos',
  'Outros',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Comandante': 'text-amber-400',
  'Criaturas': 'text-green-400',
  'Planeswalkers': 'text-purple-400',
  'Mágicas Instantâneas': 'text-blue-400',
  'Feitiços': 'text-red-400',
  'Encantamentos': 'text-pink-400',
  'Artefatos': 'text-zinc-300',
  'Terrenos': 'text-emerald-400',
  'Outros': 'text-zinc-500',
};

function groupCardsByCategory(cards: DeckCard[]): CategoryGroup[] {
  const map = new Map<string, DeckCard[]>();

  for (const card of cards) {
    const cat = getCardCategory(card);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(card);
  }

  return CATEGORY_ORDER
    .filter(cat => map.has(cat))
    .map(cat => ({
      label: cat,
      cards: map.get(cat)!,
      color: CATEGORY_COLORS[cat] ?? 'text-zinc-400',
    }));
}

function CardRow({
  card,
  addCard,
  removeCard,
  setCommander,
}: {
  card: DeckCard;
  addCard: (card: DeckCard) => void;
  removeCard: (id: string) => void;
  setCommander: (id: string) => void;
}) {
  return (
    <div className={`group flex items-center gap-2 p-2 rounded-lg border transition-colors ${
      card.isCommander
        ? 'bg-zinc-900 border-amber-500/40'
        : 'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700'
    }`}>
      <div className="w-6 text-center text-sm font-bold text-zinc-500 shrink-0">
        {card.quantity}x
      </div>
      <div className="flex-1 truncate min-w-0">
        <p className="text-sm text-zinc-200 truncate">{card.name}</p>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
        {!card.isCommander && (
          <Button variant="ghost" size="icon" onClick={() => setCommander(card.id)} className="h-6 w-6 text-zinc-500 hover:text-amber-500 hover:bg-transparent">
            <Crown className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => removeCard(card.id)} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-transparent">
          <Minus className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => addCard(card)} className="h-6 w-6 text-zinc-500 hover:text-green-400 hover:bg-transparent">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CollapsibleGroup({
  group,
  addCard,
  removeCard,
  setCommander,
}: {
  group: CategoryGroup;
  addCard: (card: DeckCard) => void;
  removeCard: (id: string) => void;
  setCommander: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const count = group.cards.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-1.5 px-1 rounded hover:bg-zinc-900/50 transition-colors group/header mb-1"
      >
        {open
          ? <ChevronDown className={`h-3.5 w-3.5 ${group.color} shrink-0`} />
          : <ChevronRight className={`h-3.5 w-3.5 ${group.color} shrink-0`} />
        }
        <span className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>{group.label}</span>
        <span className="text-xs text-zinc-600 ml-auto">{count}</span>
      </button>

      {open && (
        <div className="space-y-1 pl-1 mb-3">
          {group.cards.map(card => (
            <CardRow
              key={card.id}
              card={card}
              addCard={addCard}
              removeCard={removeCard}
              setCommander={setCommander}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeckList() {
  const { cards, addCard, removeCard, setCommander, clearDeck, saveCurrentDeck, activeDeckId, decks } = useDeckStore();
  const user = useAuthStore(state => state.user);
  const [deckName, setDeckName] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  const activeDeck = decks.find(d => d.id === activeDeckId);
  const commander = cards.find(c => c.isCommander);
  const totalCards = cards.reduce((acc, card) => acc + card.quantity, 0);
  const groups = groupCardsByCategory(cards);

  useEffect(() => {
    if (activeDeck) {
      setDeckName(activeDeck.name);
    } else if (commander) {
      setDeckName(`Deck de ${commander.name}`);
    }
  }, [activeDeck, commander]);

  const handleSave = async () => {
    setIsSaving(true);
    const finalName = deckName.trim() || (commander ? `Deck de ${commander.name}` : 'Novo Deck');
    const updatedDeck = saveCurrentDeck(finalName);

    if (updatedDeck && user) {
      await upsertDeck(updatedDeck, user.id);
    }

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const commander = cards.find(c => c.isCommander);
    const rest = cards.filter(c => !c.isCommander);
    let out = '';
    if (commander) out += `1 ${commander.name} *CMDR*\n`;
    rest.forEach(c => { out += `${c.quantity} ${c.name}\n`; });
    navigator.clipboard.writeText(out.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-80 lg:w-96 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex flex-col gap-3">
        <div className="flex justify-between items-center gap-2">
          <Input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Nome do Deck"
            autoComplete="off"
            className="h-8 bg-transparent border-transparent text-xl font-bold text-zinc-100 px-0 focus-visible:ring-0 focus-visible:border-zinc-700 hover:border-zinc-800"
          />
          <span className="text-sm font-medium px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-full shrink-0">
            {totalCards} / 100
          </span>
        </div>

        {commander ? (
          <div className="bg-zinc-900 border border-amber-500/30 p-3 rounded-lg flex items-center gap-3">
            <Crown className="text-amber-500 h-4 w-4 flex-shrink-0" />
            <div className="flex-1 truncate">
              <p className="text-sm font-bold text-zinc-100 truncate">{commander.name}</p>
              <p className="text-xs text-zinc-500">Comandante</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCommander('')} className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 border-dashed p-3 rounded-lg text-center">
            <p className="text-xs text-zinc-600">Nenhum comandante — passe o mouse sobre uma carta e clique na coroa</p>
          </div>
        )}

        {/* Toggle de visualização */}
        {cards.length > 0 && (
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'grouped' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Por Tipo
            </button>
          </div>
        )}
      </div>

      {/* Lista de cartas */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
        {cards.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-sm">
            Seu deck está vazio.<br />Busque cartas para adicionar.
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1 pb-8">
            {cards.map(card => (
              <CardRow
                key={card.id}
                card={card}
                addCard={addCard}
                removeCard={removeCard}
                setCommander={setCommander}
              />
            ))}
          </div>
        ) : (
          <div className="pb-8">
            {groups.map(group => (
              <CollapsibleGroup
                key={group.label}
                group={group}
                addCard={addCard}
                removeCard={removeCard}
                setCommander={setCommander}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 flex flex-col gap-2 bg-zinc-950">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`flex-1 ${saved ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
            onClick={handleSave}
            disabled={cards.length === 0 || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Deck'}
          </Button>
          <Button
            variant="outline"
            className={`flex-1 ${copied ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
            onClick={handleExport}
            disabled={cards.length === 0}
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado!' : 'Exportar'}
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 text-sm" onClick={clearDeck}>
          Limpar Deck
        </Button>
      </div>
    </div>
  );
}
