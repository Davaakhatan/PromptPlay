import { defineComponent, Types } from 'bitecs';

/**
 * GameState component - tracks global game state like score, lives, level
 * Typically attached to a single "game manager" entity
 */
export const GameState = defineComponent({
  score: Types.i32,
  highScore: Types.i32,
  lives: Types.ui8,
  maxLives: Types.ui8,
  level: Types.ui8,
  // Game state: 0=menu, 1=playing, 2=paused, 3=gameOver, 4=won
  state: Types.ui8,
  // Timer (in milliseconds)
  timeRemaining: Types.f32,
  timeElapsed: Types.f32,
  // Combo/multiplier
  combo: Types.ui8,
  multiplier: Types.f32,
});

// Game state constants
export const GAME_STATE = {
  MENU: 0,
  PLAYING: 1,
  PAUSED: 2,
  GAME_OVER: 3,
  WON: 4,
} as const;
