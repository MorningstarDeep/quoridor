import { supabase } from '../lib/supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export const AuthService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch {
      return null;
    }
  },

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // silent
    }
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
      return subscription;
    } catch {
      return { unsubscribe: () => {} };
    }
  },
};
