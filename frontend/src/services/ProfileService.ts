import { supabase } from '../lib/supabase';

export interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_premium: boolean;
  premium_tier: string | null;
  premium_expires_at: string | null;
  created_at: string;
}

export const ProfileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return data as Profile;
    } catch {
      return null;
    }
  },

  async updateUsername(userId: string, username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  },

  async isPremium(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, premium_expires_at')
        .eq('user_id', userId)
        .single();
      if (error || !data) return false;
      if (!data.is_premium) return false;
      if (data.premium_expires_at) {
        return new Date(data.premium_expires_at) > new Date();
      }
      return true;
    } catch {
      return false;
    }
  },

  async activatePremium(
    userId: string,
    tier: 'monthly' | 'annual'
  ): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt =
        tier === 'monthly'
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_tier: tier,
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  },
};
