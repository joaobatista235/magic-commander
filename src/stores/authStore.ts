import { create } from 'zustand';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
}

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'Jogador',
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ? mapSupabaseUser(session.user) : null,
      initialized: true,
    }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
