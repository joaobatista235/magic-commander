import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useBattlefieldStore } from '@/stores/battlefieldStore';
import { useAuthStore } from '@/stores/authStore';
import { battlefieldService } from '@/services/battlefieldService';
import { pushChatMessage, subscribeChatMessages, type ChatMessage } from './chatStore';

export default function ChatPanel() {
  const { myUserId } = useBattlefieldStore();
  const user = useAuthStore(state => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to message store
  useEffect(() => {
    return subscribeChatMessages(msgs => {
      setMessages([...msgs]);
      if (collapsed) setUnread(n => n + 1);
    });
  }, [collapsed]);

  // Subscribe to broadcast chat events from other players
  useEffect(() => {
    const unsubscribe = battlefieldService.onChatMessage((msg: ChatMessage) => {
      if (msg.userId !== myUserId) pushChatMessage(msg);
    });
    return unsubscribe;
  }, [myUserId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  const handleExpand = () => {
    setCollapsed(false);
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !myUserId || !user) return;

    const displayName = user.displayName || user.email?.split('@')[0] || 'Jogador';
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: myUserId,
      displayName,
      text,
      timestamp: Date.now(),
    };

    pushChatMessage(msg);
    battlefieldService.broadcastChat(msg);
    setInput('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col border-t border-zinc-800 shrink-0">
      {/* Header / Toggle */}
      <button
        onClick={collapsed ? handleExpand : () => setCollapsed(true)}
        className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Chat</span>
          {collapsed && unread > 0 && (
            <span className="bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {unread}
            </span>
          )}
        </div>
        {collapsed ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="overflow-hidden flex flex-col"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5 flex flex-col gap-1 min-h-0">
              {messages.length === 0 ? (
                <p className="text-zinc-700 text-[10px] italic text-center mt-6">Nenhuma mensagem ainda...</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.userId === myUserId ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-zinc-600 px-1">
                      {msg.userId === myUserId ? 'Você' : msg.displayName} · {formatTime(msg.timestamp)}
                    </span>
                    <span className={`max-w-[90%] px-2 py-1 rounded-lg text-[11px] break-words ${
                      msg.userId === myUserId
                        ? 'bg-amber-600/80 text-white rounded-br-none'
                        : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-1 px-2 pb-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Mensagem..."
                maxLength={200}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
