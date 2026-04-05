import { create } from 'zustand';
import { GameSaveService, SavedGame } from '../services/GameSaveService';

interface GameStoreState {
  savedGame: SavedGame | null;
  isGameActive: boolean;
  matchCount: number;

  loadSavedGame: (userId: string) => Promise<void>;
  saveGame: (
    userId: string,
    gameState: Record<string, any>,
    mode: string,
    difficulty: string | null
  ) => Promise<void>;
  deleteSavedGame: (userId: string) => Promise<void>;
  setGameActive: (active: boolean) => void;
  incrementMatchCount: () => void;
  resetMatchCount: () => void;
  shouldShowAd: (isPremium: boolean) => boolean;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  savedGame: null,
  isGameActive: false,
  matchCount: 0,

  loadSavedGame: async (userId: string) => {
    const saved = await GameSaveService.loadSavedGame(userId);
    set({ savedGame: saved });
  },

  saveGame: async (
    userId: string,
    gameState: Record<string, any>,
    mode: string,
    difficulty: string | null
  ) => {
    await GameSaveService.saveGame(userId, gameState, mode, difficulty);
  },

  deleteSavedGame: async (userId: string) => {
    await GameSaveService.deleteSavedGame(userId);
    set({ savedGame: null });
  },

  setGameActive: (active: boolean) => {
    set({ isGameActive: active });
  },

  incrementMatchCount: () => {
    set((state) => ({ matchCount: state.matchCount + 1 }));
  },

  resetMatchCount: () => {
    set({ matchCount: 0 });
  },

  shouldShowAd: (isPremium: boolean) => {
    if (isPremium) return false;
    return get().matchCount > 0 && get().matchCount % 2 === 0;
  },

  reset: () => {
    set({
      savedGame: null,
      isGameActive: false,
      matchCount: 0,
    });
  },
}));
