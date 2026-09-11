// chat-store.ts — separate module to avoid HMR issues with mixed exports
export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

let messages: ChatMessage[] = [];
let listeners: Array<(msgs: ChatMessage[]) => void> = [];

export function pushChatMessage(msg: ChatMessage) {
  messages = [...messages, msg].slice(-80);
  listeners.forEach(fn => fn(messages));
}

export function subscribeChatMessages(fn: (msgs: ChatMessage[]) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}
