import { supabase } from '../lib/supabase';
import { GameData } from './StatsService';
import { GameStats } from './StatsService';

interface AchievementCondition {
  key: string;
  check: (gameData: GameData, stats: GameStats) => boolean;
}

const ACHIEVEMENT_CONDITIONS: AchievementCondition[] = [
  {
    key: 'first_victory',
    check: (_gd, stats) => stats.total_wins >= 1,
  },
  {
    key: 'wall_master',
    check: (gd) => gd.walls_placed === 10 && gd.result === 'WIN',
  },
  {
    key: 'speedrun',
    check: (gd) => gd.moves_made <= 15 && gd.result === 'WIN',
  },
  {
    key: 'pacifist',
    check: (gd) => gd.walls_placed === 0 && gd.result === 'WIN',
  },
  {
    key: 'strategist',
    check: (gd) =>
      gd.difficulty === 'GRANDMASTER' && gd.result === 'WIN',
  },
  {
    key: 'dedicated',
    check: (_gd, stats) => stats.total_games >= 25,
  },
  {
    key: 'veteran',
    check: (_gd, stats) => stats.total_games >= 100,
  },
];

export const AchievementService = {
  async getUnlocked(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', userId);
      if (error || !data) return [];
      return data.map((row: { achievement_key: string }) => row.achievement_key);
    } catch {
      return [];
    }
  },

  async checkAndUnlock(
    userId: string,
    gameData: GameData,
    currentStats: GameStats
  ): Promise<string[]> {
    try {
      // Fetch already unlocked
      const alreadyUnlocked = await this.getUnlocked(userId);
      const newlyUnlocked: string[] = [];

      for (const condition of ACHIEVEMENT_CONDITIONS) {
        if (alreadyUnlocked.includes(condition.key)) continue;
        if (condition.check(gameData, currentStats)) {
          const { error } = await supabase
            .from('achievements')
            .insert({
              user_id: userId,
              achievement_key: condition.key,
              unlocked_at: new Date().toISOString(),
            });
          if (!error) {
            newlyUnlocked.push(condition.key);
          }
        }
      }

      return newlyUnlocked;
    } catch {
      return [];
    }
  },
};
