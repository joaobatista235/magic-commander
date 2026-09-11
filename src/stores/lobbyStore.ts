import { create } from 'zustand';
import type { Room, RoomPlayer } from '@/services/lobbyService';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LobbyState {
  currentRoom: Room | null;
  players: RoomPlayer[];
  subscription: RealtimeChannel | null;
  
  setCurrentRoom: (room: Room | null) => void;
  setPlayers: (players: RoomPlayer[]) => void;
  
  subscribeToRoom: (roomId: string, reloadCallback: () => void) => void;
  unsubscribeFromRoom: () => void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  currentRoom: null,
  players: [],
  subscription: null,

  setCurrentRoom: (room) => set({ currentRoom: room }),
  
  setPlayers: (players) => set({ players }),

  subscribeToRoom: (roomId, reloadCallback) => {
    const existingSub = get().subscription;
    if (existingSub) {
      supabase.removeChannel(existingSub);
    }

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          reloadCallback();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          reloadCallback();
        }
      )
      .subscribe();

    set({ subscription: channel });
  },

  unsubscribeFromRoom: () => {
    const { subscription } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
    }
    set({ subscription: null, currentRoom: null, players: [] });
  }
}));
