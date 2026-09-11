import { supabase } from '@/lib/supabase';

export interface Room {
  id: string;
  owner_id: string;
  name: string;
  password?: string;
  max_players: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  created_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  deck_id: string | null;
  is_ready: boolean;
  joined_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
  decks?: {
    name: string;
    commander_image_url: string;
  };
}

export async function fetchWaitingRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'WAITING')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
  return data || [];
}

export async function createRoom(ownerId: string, name: string, password?: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      owner_id: ownerId,
      name,
      password: password || null,
      max_players: 4,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating room:', error);
    return null;
  }
  return data.id;
}

export async function joinRoom(roomId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: userId,
    });

  if (error) {
    // Pode falhar se já estiver na sala devido à constraint unique(room_id, user_id)
    if (error.code === '23505') return true; // Já está na sala
    console.error('Error joining room:', error);
    return false;
  }
  return true;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
}

export async function fetchRoomDetails(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
    
  if (error) return null;
  return data;
}

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select(`
      *,
      profiles (display_name, avatar_url),
      decks (name, commander_image_url)
    `)
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching room players:', error);
    return [];
  }
  return data || [];
}

export async function setPlayerReady(roomId: string, userId: string, deckId: string, isReady: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('room_players')
    .update({ deck_id: deckId, is_ready: isReady })
    .eq('room_id', roomId)
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error updating player ready state:', error);
    return false;
  }
  return true;
}

export async function startGame(roomId: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'PLAYING' })
    .eq('id', roomId);
    
  if (error) console.error('Error starting game:', error);
}
