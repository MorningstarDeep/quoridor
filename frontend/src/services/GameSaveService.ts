import { supabase } from '../lib/supabase';

export interface SavedGame {
  user_id: string;
  game_state: Record<string, any>;
  mode: string;
  difficulty: string | null;
  saved_at: string;
}

export const GameSaveService = {
  async saveGame(
    userId: string,
    gameState: Record<string, any>,
    mode: string,
    difficulty: string | null
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_games')
        .upsert(
          {
            user_id: userId,
            game_state: gameState,
            mode,
            difficulty,
            saved_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      return !error;
    } catch {
      return false;
    }
  },

  async loadSavedGame(userId: string): Promise<SavedGame | null> {
    try {
      const { data, error } = await supabase
        .from('saved_games')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return data as SavedGame;
    } catch {
      return null;
    }
  },

  async deleteSavedGame(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_games')
        .delete()
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  },
};
