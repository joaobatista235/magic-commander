import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Game events that can be broadcasted
export type BattlefieldEventType =
  | 'SYNC_PLAYER_STATE'
  | 'SYNC_RESPONSE'
  | 'MOVE_CARD'
  | 'TAP_CARD'
  | 'CHANGE_ZONE'
  | 'CHANGE_LIFE'
  | 'UPDATE_COUNTERS'
  | 'SHUFFLE_LIBRARY'
  | 'CREATE_TOKEN'
  | 'ADD_ARROW'
  | 'REMOVE_ARROW'
  | 'CLEAR_ARROWS'
  | 'SYNC_PHASE'
  | 'SYNC_TURN';

export interface BattlefieldEvent {
  type: BattlefieldEventType;
  userId: string;
  payload: any;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

class BattlefieldService {
  private channel: RealtimeChannel | null = null;
  private onMessageCallback: ((event: BattlefieldEvent) => void) | null = null;
  private chatListeners: Array<(msg: ChatMessage) => void> = [];

  connect(roomId: string, onMessage: (event: BattlefieldEvent) => void, onReady?: () => void) {
    if (this.channel) {
      this.disconnect();
    }

    this.onMessageCallback = onMessage;

    this.channel = supabase.channel(`battlefield:${roomId}`, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(payload as BattlefieldEvent);
        }
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        this.chatListeners.forEach(fn => fn(msg));
      })
      .subscribe((status) => {
        console.log(`Battlefield Realtime Status [${roomId}]:`, status);
        if (status === 'SUBSCRIBED' && onReady) {
          onReady();
        }
      });
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.onMessageCallback = null;
    this.chatListeners = [];
  }

  broadcast(type: BattlefieldEventType, userId: string, payload: any) {
    if (!this.channel) return;

    const event: BattlefieldEvent = { type, userId, payload };

    this.channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: event,
    }).catch(err => {
      console.error('Failed to broadcast event', err);
    });
  }

  broadcastChat(msg: ChatMessage) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg,
    }).catch(err => {
      console.error('Failed to broadcast chat message', err);
    });
  }

  onChatMessage(callback: (msg: ChatMessage) => void): () => void {
    this.chatListeners.push(callback);
    return () => {
      this.chatListeners = this.chatListeners.filter(fn => fn !== callback);
    };
  }
}

export const battlefieldService = new BattlefieldService();
