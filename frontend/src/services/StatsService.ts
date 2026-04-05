import { supabase } from '../lib/supabase';

export interface GameStats {
  user_id: string;
  total_games: number;
  total_wins: number;
  total_losses: number;
  current_streak: number;
  best_streak: number;
  rating: number;
  total_walls_placed: number;
  avg_moves_per_game: number;
  avg_game_duration: number;
  fastest_win: number;
  created_at: string;
  updated_at: string;
}

export interface GameData {
  difficulty: string;
  result: 'WIN' | 'LOSS';
  duration_seconds: number;
  moves_made: number;
  walls_placed: number;
  wall_efficiency: number;
  rating_before: number;
  rating_after: number;
  rating_change: number;
}

export const StatsService = {
  async getStats(userId: string): Promise<GameStats | null> {
    try {
      const { data, error } = await supabase
        .from('game_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return data as GameStats;
    } catch {
      return null;
    }
  },

  async recordGameResult(
    userId: string,
    gameData: GameData
  ): Promise<boolean> {
    try {
      // 1. Insert into game_history
      const { error: historyError } = await supabase
        .from('game_history')
        .insert({
          user_id: userId,
          difficulty: gameData.difficulty,
          result: gameData.result,
          duration_seconds: gameData.duration_seconds,
          moves_made: gameData.moves_made,
          walls_placed: gameData.walls_placed,
          wall_efficiency: gameData.wall_efficiency,
          rating_before: gameData.rating_before,
          rating_after: gameData.rating_after,
          rating_change: gameData.rating_change,
          played_at: new Date().toISOString(),
        });
      if (historyError) return false;

      // 2. Fetch current stats
      const { data: current, error: fetchError } = await supabase
        .from('game_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !current) {
        // If no stats row exists, create one
        const isWin = gameData.result === 'WIN';
        const { error: insertError } = await supabase
          .from('game_stats')
          .insert({
            user_id: userId,
            total_games: 1,
            total_wins: isWin ? 1 : 0,
            total_losses: isWin ? 0 : 1,
            current_streak: isWin ? 1 : 0,
            best_streak: isWin ? 1 : 0,
            rating: gameData.rating_after,
            total_walls_placed: gameData.walls_placed,
            avg_moves_per_game: gameData.moves_made,
            avg_game_duration: gameData.duration_seconds,
            fastest_win: isWin ? gameData.duration_seconds : 0,
          });
        return !insertError;
      }

      // 3. Calculate updated stats
      const isWin = gameData.result === 'WIN';
      const newTotalGames = current.total_games + 1;
      const newTotalWins = current.total_wins + (isWin ? 1 : 0);
      const newTotalLosses = current.total_losses + (isWin ? 0 : 1);
      const newCurrentStreak = isWin ? current.current_streak + 1 : 0;
      const newBestStreak = Math.max(
        current.best_streak,
        newCurrentStreak
      );
      const newTotalWalls =
        current.total_walls_placed + gameData.walls_placed;
      const newAvgMoves =
        (current.avg_moves_per_game * current.total_games +
          gameData.moves_made) /
        newTotalGames;
      const newAvgDuration =
        (current.avg_game_duration * current.total_games +
          gameData.duration_seconds) /
        newTotalGames;
      const newFastestWin =
        isWin && gameData.duration_seconds > 0
          ? current.fastest_win === 0
            ? gameData.duration_seconds
            : Math.min(current.fastest_win, gameData.duration_seconds)
          : current.fastest_win;

      // 4. Update game_stats
      const { error: updateError } = await supabase
        .from('game_stats')
        .update({
          total_games: newTotalGames,
          total_wins: newTotalWins,
          total_losses: newTotalLosses,
          current_streak: newCurrentStreak,
          best_streak: newBestStreak,
          rating: gameData.rating_after,
          total_walls_placed: newTotalWalls,
          avg_moves_per_game: Math.round(newAvgMoves * 10) / 10,
          avg_game_duration: Math.round(newAvgDuration),
          fastest_win: newFastestWin,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) return false;

      // 5. Call update_rating RPC if it exists
      try {
        await supabase.rpc('update_rating', {
          p_user_id: userId,
          p_new_rating: gameData.rating_after,
        });
      } catch {
        // RPC may not exist, silent fail
      }

      return true;
    } catch {
      return false;
    }
  },
};
