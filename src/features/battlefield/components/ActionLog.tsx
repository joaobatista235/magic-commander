import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  actorName: string;
  message: string;
  type: 'move' | 'draw' | 'tap' | 'zone' | 'life' | 'token' | 'turn' | 'system';
}

// Global action log store
let actionLog: ActionLogEntry[] = [];
let logListeners: Array<(log: ActionLogEntry[]) => void> = [];

export function logAction(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) {
  const newEntry: ActionLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  actionLog = [...actionLog, newEntry].slice(-100);
  logListeners.forEach(fn => fn(actionLog));
}

const TYPE_COLORS: Record<ActionLogEntry['type'], string> = {
  move: 'text-zinc-400',
  draw: 'text-blue-400',
  tap: 'text-cyan-400',
  zone: 'text-orange-400',
  life: 'text-red-400',
  token: 'text-purple-400',
  turn: 'text-amber-400',
  system: 'text-zinc-500 italic',
};

const TYPE_ICONS: Record<ActionLogEntry['type'], string> = {
  move: '↔',
  draw: '✦',
  tap: '↻',
  zone: '→',
  life: '♥',
  token: '✦',
  turn: '⚡',
  system: '·',
};

export default function ActionLog() {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (log: ActionLogEntry[]) => setEntries([...log]);
    logListeners.push(listener);
    return () => { logListeners = logListeners.filter(l => l !== listener); };
  }, []);

  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, collapsed]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col border-t border-zinc-800 shrink-0">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Log de Ações</span>
        </div>
        {collapsed ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 140, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-2 py-1"
          >
            {entries.length === 0 ? (
              <p className="text-zinc-700 text-[10px] italic text-center mt-6">Nenhuma ação registrada ainda...</p>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="flex items-start gap-1.5 text-[10px] leading-snug py-0.5">
                  <span className="text-zinc-700 shrink-0 tabular-nums">{formatTime(entry.timestamp)}</span>
                  <span className={`shrink-0 ${TYPE_COLORS[entry.type]}`}>{TYPE_ICONS[entry.type]}</span>
                  <span className={TYPE_COLORS[entry.type]}>
                    <span className="font-bold">{entry.actorName}</span> {entry.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
