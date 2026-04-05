import { create } from 'zustand';
import { StatsService, GameStats, GameData } from '../services/StatsService';
import { AchievementService } from '../services/AchievementService';

interface StatsState {
  stats: GameStats | null;
  achievements: string[];
  isLoading: boolean;

  fetchStats: (userId: string) => Promise<void>;
  fetchAchievements: (userId: string) => Promise<void>;
  recordGame: (
    userId: string,
    gameData: GameData
  ) => Promise<string[]>;
  reset: () => void;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  stats: null,
  achievements: [],
  isLoading: false,

  fetchStats: async (userId: string) => {
    set({ isLoading: true });
    const stats = await StatsService.getStats(userId);
    set({ stats, isLoading: false });
  },

  fetchAchievements: async (userId: string) => {
    const achievements = await AchievementService.getUnlocked(userId);
    set({ achievements });
  },

  recordGame: async (
    userId: string,
    gameData: GameData
  ): Promise<string[]> => {
    // 1. Record the game result in Supabase
    await StatsService.recordGameResult(userId, gameData);

    // 2. Optimistically update local stats
    const { stats } = get();
    if (stats) {
      const isWin = gameData.result === 'WIN';
      const newCurrentStreak = isWin ? stats.current_streak + 1 : 0;
      set({
        stats: {
          ...stats,
          total_games: stats.total_games + 1,
          total_wins: stats.total_wins + (isWin ? 1 : 0),
          total_losses: stats.total_losses + (isWin ? 0 : 1),
          current_streak: newCurrentStreak,
          best_streak: Math.max(stats.best_streak, newCurrentStreak),
          rating: gameData.rating_after,
          total_walls_placed:
            stats.total_walls_placed + gameData.walls_placed,
          updated_at: new Date().toISOString(),
        },
      });
    }

    // 3. Check and unlock achievements
    const updatedStats = get().stats;
    if (!updatedStats) return [];

    const newlyUnlocked = await AchievementService.checkAndUnlock(
      userId,
      gameData,
      updatedStats
    );

    // 4. Update local achievements list
    if (newlyUnlocked.length > 0) {
      set((state) => ({
        achievements: [...state.achievements, ...newlyUnlocked],
      }));
    }

    return newlyUnlocked;
  },

  reset: () => {
    set({ stats: null, achievements: [], isLoading: false });
  },
}));
