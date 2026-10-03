import { isGameState, type GameState } from './state.ts';

export const SAVE_KEY = 'sci-fi-games:05-saturday-departure:v1';
export interface GameStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface LoadResult { state: GameState | null; status: 'empty' | 'valid' | 'corrupt' | 'unavailable'; raw?: string }

function browserStorage(): GameStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function loadGame(storage: GameStorage | null = browserStorage()): LoadResult {
  if (!storage) return { state: null, status: 'unavailable' };
  let raw: string | null;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { state: null, status: 'unavailable' }; }
  if (raw === null) return { state: null, status: 'empty' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isGameState(parsed)) return { state: parsed, status: 'valid' };
  } catch { /* Preserve the original value until the player chooses recovery. */ }
  return { state: null, status: 'corrupt', raw };
}

export function saveGame(state: GameState, storage: GameStorage | null = browserStorage()): boolean {
  if (!storage || !isGameState(state)) return false;
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

/** Restart is scoped to this story; it never calls localStorage.clear(). */
export function clearGame(storage: GameStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try { storage.removeItem(SAVE_KEY); return true; } catch { return false; }
}
