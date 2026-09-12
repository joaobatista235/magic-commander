import { useState, useRef } from 'react';
import { useDeckStore } from '@/stores/deckStore';
import { useAuthStore } from '@/stores/authStore';
import { upsertDeck } from '@/services/deckService';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ImportDeckModalProps {
  onClose: () => void;
  onImported: (deckId: string) => void;
}

interface ParsedLine {
  quantity: number;
  name: string;
  set?: string;
  collectorNumber?: string;
  isCommander: boolean;
}

function parseDeckText(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsed: ParsedLine[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    // Linhas de seção como "Commander:", "Deck:", etc
    if (/^[A-Za-z\s]+:\s*$/.test(line)) continue;

    const cmdPattern = /\*CMDR\*|\[Commander\]/i;
    const isCommander = cmdPattern.test(line);
    const cleanLine = line.replace(cmdPattern, '').trim();

    // Formato com set e collector number:
    // "1 Card Name (SET) 123"
    // "1 Card Name (SET) 123p"  (foil/promo variant)
    const fullMatch = cleanLine.match(/^(\d+)[x\s]+(.+?)\s+\(([A-Z0-9]+)\)\s+([\w\d]+[p]?)\s*$/i);
    if (fullMatch) {
      parsed.push({
        quantity: parseInt(fullMatch[1], 10),
        name: fullMatch[2].trim(),
        set: fullMatch[3].toLowerCase(),
        collectorNumber: fullMatch[4],
        isCommander,
      });
      continue;
    }

    // Formato simples sem set: "1 Card Name" ou "1x Card Name"
    const simpleMatch = cleanLine.match(/^(\d+)[x\s]+(.+?)\s*$/);
    if (simpleMatch) {
      parsed.push({
        quantity: parseInt(simpleMatch[1], 10),
        name: simpleMatch[2].trim(),
        isCommander,
      });
      continue;
    }

    // Sem quantidade (assume 1)
    if (cleanLine) {
      parsed.push({ quantity: 1, name: cleanLine, isCommander });
    }
  }

  return parsed;
}

// Busca em chunks de 75 usando o endpoint /cards/collection
// Suporta identificadores por set+número (mais preciso) ou por nome
async function fetchCollection(lines: ParsedLine[]): Promise<{ card: any; quantity: number; isCommander: boolean }[]> {
  const results: { card: any; quantity: number; isCommander: boolean }[] = [];

  // Dividir em chunks de 75 (limite do Scryfall)
  for (let i = 0; i < lines.length; i += 75) {
    const chunk = lines.slice(i, i + 75);

    const identifiers = chunk.map(l =>
      l.set && l.collectorNumber
        ? { set: l.set, collector_number: l.collectorNumber }
        : { name: l.name }
    );

    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers }),
    });

    if (!response.ok) continue;

    const data = await response.json();
    const fetched: any[] = data.data || [];

    // Mapear os resultados de volta às linhas originais por posição
    // A Scryfall retorna na mesma ordem dos identifiers, mas pode omitir os não encontrados
    // Para mapeamento correto, usamos o campo 'not_found' da resposta

    // Montar mapa de set+number ou nome para correspondência
    fetched.forEach((card: any) => {
      // Encontrar qual linha originou esta carta
      const matchedLine = chunk.find(l => {
        if (l.set && l.collectorNumber) {
          return (
            card.set?.toLowerCase() === l.set &&
            card.collector_number === l.collectorNumber.replace(/p$/, '')
          );
        }
        return card.name.toLowerCase() === l.name.toLowerCase();
      });

      if (matchedLine) {
        results.push({ card, quantity: matchedLine.quantity, isCommander: matchedLine.isCommander });
      }
    });

    // Rate limit
    if (i + 75 < lines.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  return results;
}

export default function ImportDeckModal({ onClose, onImported }: ImportDeckModalProps) {
  const { createNewDeck, saveCurrentDeck, addCard, setCommander, loadDeck } = useDeckStore();
  const user = useAuthStore(state => state.user);
  const [text, setText] = useState('');
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [notFound, setNotFound] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleImport = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setNotFound([]);
    setProgress('Analisando lista...');

    const parsed = parseDeckText(text);
    if (parsed.length === 0) {
      setProgress('Nenhuma carta detectada. Verifique o formato.');
      setLoading(false);
      return;
    }

    const uniqueLines = Array.from(
      parsed.reduce((map, line) => {
        const key = line.set && line.collectorNumber
          ? `${line.set}-${line.collectorNumber}`
          : line.name.toLowerCase();
        if (!map.has(key)) map.set(key, line);
        else map.get(key)!.quantity += line.quantity;
        return map;
      }, new Map<string, ParsedLine>()).values()
    );

    setProgress(`Buscando ${uniqueLines.length} cartas no Scryfall...`);

    const fetched = await fetchCollection(uniqueLines);

    // Descobrir o que não foi encontrado
    const foundNames = new Set(fetched.map(r => r.card.name.toLowerCase()));
    const missing = uniqueLines
      .filter(l => !foundNames.has(l.name.toLowerCase()))
      .map(l => l.name);

    setProgress('Montando deck...');

    // Criar novo deck e adicionar cartas
    const deckId = createNewDeck();
    loadDeck(deckId);

    for (const { card, quantity, isCommander } of fetched) {
      for (let i = 0; i < quantity; i++) {
        addCard(card);
      }
      if (isCommander) {
        setCommander(card.id);
      }
    }

    setProgress('Salvando...');
    const finalName = deckName.trim() || 'Deck Importado';
    const savedDeck = saveCurrentDeck(finalName);

    if (savedDeck && user) {
      await upsertDeck(savedDeck, user.id);
    }

    setNotFound(missing);
    setDone(true);
    setLoading(false);

    if (savedDeck) {
      onImported(savedDeck.id);
    }
  };

  const lineCount = text.trim().split('\n').filter(l => {
    const t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('#') && !/^[A-Za-z\s]+:\s*$/.test(t);
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Importar Deck</h2>
            <p className="text-sm text-zinc-500 mt-1">Suporta: EDHREC, Moxfield, Cockatrice, Archidekt, plain text</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!done ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome do Deck (opcional)</label>
              <input
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                placeholder="Ex: Ysh Commander"
                autoComplete="off"
                className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Lista de Cartas</label>
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Cole aqui a lista exportada de qualquer site:\n\n1 Sol Ring\n1 Dina, Soul Steeper *CMDR*\n1 Anguished Unmaking (PSOI) 242p\n1 Smothering Tithe (RNA) 22`}
                rows={14}
                className="w-full px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm font-mono focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600 resize-none"
              />
              <p className="text-xs text-zinc-600">{lineCount} cartas detectadas</p>
            </div>

            {progress && (
              <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
                <span className="text-sm text-zinc-300">{progress}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={loading || !text.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {loading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-bold text-zinc-100">Deck importado!</h3>
            <p className="text-sm text-zinc-400">Abrindo no editor para você revisar e salvar.</p>

            {notFound.length > 0 && (
              <div className="w-full bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-bold text-amber-500">{notFound.length} carta(s) não encontrada(s) no Scryfall:</span>
                </div>
                <ul className="text-sm text-zinc-400 space-y-0.5 font-mono max-h-40 overflow-y-auto">
                  {notFound.map(n => <li key={n} className="truncate">• {n}</li>)}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-8">
              Ver Deck no Editor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
