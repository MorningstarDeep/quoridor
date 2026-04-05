import { create } from 'zustand';
import { AuthService } from '../services/AuthService';
import { ProfileService, Profile } from '../services/ProfileService';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremium: boolean;

  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  updateUsername: (username: string) => Promise<boolean>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  activatePremium: (tier: 'monthly' | 'annual') => Promise<boolean>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  isPremium: false,

  initialize: async () => {
    set({ isLoading: true });
    const session = await AuthService.getSession();
    if (session?.user) {
      set({
        user: session.user,
        session,
        isAuthenticated: true,
      });
      await get().fetchProfile();
    }
    set({ isLoading: false });

    AuthService.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
        });
        get().fetchProfile();
      } else {
        get().reset();
      }
    });
  },

  setSession: (session) => {
    if (session?.user) {
      set({
        user: session.user,
        session,
        isAuthenticated: true,
      });
      get().fetchProfile();
    } else {
      get().reset();
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await ProfileService.getProfile(user.id);
    const premium = profile ? await ProfileService.isPremium(user.id) : false;
    set({ profile, isPremium: premium });
  },

  updateUsername: async (username: string) => {
    const { user } = get();
    if (!user) return false;
    const ok = await ProfileService.updateUsername(user.id, username);
    if (ok) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, username } : null,
      }));
    }
    return ok;
  },

  updateAvatar: async (avatarUrl: string) => {
    const { user } = get();
    if (!user) return false;
    const ok = await ProfileService.updateAvatar(user.id, avatarUrl);
    if (ok) {
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, avatar_url: avatarUrl }
          : null,
      }));
    }
    return ok;
  },

  activatePremium: async (tier: 'monthly' | 'annual') => {
    const { user } = get();
    if (!user) return false;
    const ok = await ProfileService.activatePremium(user.id, tier);
    if (ok) {
      set((state) => ({
        isPremium: true,
        profile: state.profile
          ? { ...state.profile, is_premium: true, premium_tier: tier }
          : null,
      }));
    }
    return ok;
  },

  signOut: async () => {
    await AuthService.signOut();
    get().reset();
  },

  reset: () => {
    set({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isPremium: false,
    });
  },
}));
