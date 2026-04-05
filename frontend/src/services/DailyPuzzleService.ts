import { supabase } from '../lib/supabase';

export interface DailyPuzzleProgress {
  user_id: string;
  current_streak: number;
  best_streak: number;
  total_completed: number;
  puzzles_completed: string[];
  last_completed_date: string | null;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(d1: Date, d2: Date): boolean {
  const yesterday = new Date(d2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d1, yesterday);
}

export const DailyPuzzleService = {
  async getProgress(userId: string): Promise<DailyPuzzleProgress | null> {
    try {
      const { data, error } = await supabase
        .from('daily_puzzle_progress')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return data as DailyPuzzleProgress;
    } catch {
      return null;
    }
  },

  async completePuzzle(
    userId: string,
    puzzleId: string
  ): Promise<boolean> {
    try {
      const today = new Date();
      const progress = await this.getProgress(userId);

      if (!progress) {
        // First ever puzzle
        const { error } = await supabase
          .from('daily_puzzle_progress')
          .insert({
            user_id: userId,
            current_streak: 1,
            best_streak: 1,
            total_completed: 1,
            puzzles_completed: [puzzleId],
            last_completed_date: today.toISOString().split('T')[0],
          });
        return !error;
      }

      const lastDate = progress.last_completed_date
        ? new Date(progress.last_completed_date)
        : null;

      // Already completed today
      if (lastDate && isSameDay(lastDate, today)) {
        return true;
      }

      let newStreak: number;
      if (lastDate && isYesterday(lastDate, today)) {
        newStreak = progress.current_streak + 1;
      } else {
        newStreak = 1;
      }

      const newBestStreak = Math.max(progress.best_streak, newStreak);
      const newCompleted = [
        ...(progress.puzzles_completed || []),
        puzzleId,
      ];

      const { error } = await supabase
        .from('daily_puzzle_progress')
        .update({
          current_streak: newStreak,
          best_streak: newBestStreak,
          total_completed: progress.total_completed + 1,
          puzzles_completed: newCompleted,
          last_completed_date: today.toISOString().split('T')[0],
        })
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },
};
