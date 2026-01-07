/**
 * Tests for GameState component
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { GameState, GAME_STATE } from '../src/components/GameState';

describe('GameState Component', () => {
  let world: ReturnType<typeof createWorld>;
  let eid: number;

  beforeEach(() => {
    world = createWorld();
    eid = addEntity(world);
    addComponent(world, GameState, eid);
  });

  describe('component properties', () => {
    it('should initialize with default values', () => {
      expect(GameState.score[eid]).toBe(0);
      expect(GameState.highScore[eid]).toBe(0);
      expect(GameState.lives[eid]).toBe(0);
      expect(GameState.maxLives[eid]).toBe(0);
      expect(GameState.level[eid]).toBe(0);
      expect(GameState.state[eid]).toBe(0);
      expect(GameState.timeRemaining[eid]).toBe(0);
      expect(GameState.timeElapsed[eid]).toBe(0);
      expect(GameState.combo[eid]).toBe(0);
      expect(GameState.multiplier[eid]).toBe(0);
    });

    it('should store score values', () => {
      GameState.score[eid] = 1000;
      GameState.highScore[eid] = 5000;

      expect(GameState.score[eid]).toBe(1000);
      expect(GameState.highScore[eid]).toBe(5000);
    });

    it('should handle negative scores (signed int)', () => {
      GameState.score[eid] = -100;

      expect(GameState.score[eid]).toBe(-100);
    });

    it('should store lives values', () => {
      GameState.lives[eid] = 3;
      GameState.maxLives[eid] = 5;

      expect(GameState.lives[eid]).toBe(3);
      expect(GameState.maxLives[eid]).toBe(5);
    });

    it('should store level value', () => {
      GameState.level[eid] = 10;

      expect(GameState.level[eid]).toBe(10);
    });

    it('should store timer values as floats', () => {
      GameState.timeRemaining[eid] = 60000.5;
      GameState.timeElapsed[eid] = 30000.25;

      expect(GameState.timeRemaining[eid]).toBeCloseTo(60000.5, 1);
      expect(GameState.timeElapsed[eid]).toBeCloseTo(30000.25, 1);
    });

    it('should store combo and multiplier', () => {
      GameState.combo[eid] = 5;
      GameState.multiplier[eid] = 2.5;

      expect(GameState.combo[eid]).toBe(5);
      expect(GameState.multiplier[eid]).toBeCloseTo(2.5, 1);
    });
  });

  describe('GAME_STATE constants', () => {
    it('should have correct state values', () => {
      expect(GAME_STATE.MENU).toBe(0);
      expect(GAME_STATE.PLAYING).toBe(1);
      expect(GAME_STATE.PAUSED).toBe(2);
      expect(GAME_STATE.GAME_OVER).toBe(3);
      expect(GAME_STATE.WON).toBe(4);
    });

    it('should be usable for state transitions', () => {
      // Start in menu
      GameState.state[eid] = GAME_STATE.MENU;
      expect(GameState.state[eid]).toBe(GAME_STATE.MENU);

      // Start playing
      GameState.state[eid] = GAME_STATE.PLAYING;
      expect(GameState.state[eid]).toBe(GAME_STATE.PLAYING);

      // Pause
      GameState.state[eid] = GAME_STATE.PAUSED;
      expect(GameState.state[eid]).toBe(GAME_STATE.PAUSED);

      // Game over
      GameState.state[eid] = GAME_STATE.GAME_OVER;
      expect(GameState.state[eid]).toBe(GAME_STATE.GAME_OVER);

      // Win
      GameState.state[eid] = GAME_STATE.WON;
      expect(GameState.state[eid]).toBe(GAME_STATE.WON);
    });
  });

  describe('typical game scenarios', () => {
    it('should support score tracking with multiplier', () => {
      GameState.score[eid] = 0;
      GameState.multiplier[eid] = 1.0;
      GameState.combo[eid] = 0;

      // Collect coin worth 100 points
      const basePoints = 100;
      GameState.combo[eid] += 1;
      GameState.multiplier[eid] = 1 + (GameState.combo[eid] * 0.1);
      const points = Math.floor(basePoints * GameState.multiplier[eid]);
      GameState.score[eid] += points;

      expect(GameState.score[eid]).toBe(110);
      expect(GameState.combo[eid]).toBe(1);
      expect(GameState.multiplier[eid]).toBeCloseTo(1.1, 1);
    });

    it('should support lives system', () => {
      GameState.lives[eid] = 3;
      GameState.maxLives[eid] = 3;

      // Take damage
      GameState.lives[eid] -= 1;
      expect(GameState.lives[eid]).toBe(2);

      // Collect 1-up
      GameState.lives[eid] = Math.min(GameState.lives[eid] + 1, GameState.maxLives[eid]);
      expect(GameState.lives[eid]).toBe(3);

      // Take damage x3 = game over
      GameState.lives[eid] = 0;
      const isGameOver = GameState.lives[eid] <= 0;
      expect(isGameOver).toBe(true);

      if (isGameOver) {
        GameState.state[eid] = GAME_STATE.GAME_OVER;
      }
      expect(GameState.state[eid]).toBe(GAME_STATE.GAME_OVER);
    });

    it('should support level progression', () => {
      GameState.level[eid] = 1;
      GameState.score[eid] = 0;

      // Level completion threshold
      const levelThreshold = 1000;

      // Gain enough score to complete level
      GameState.score[eid] = 1050;

      if (GameState.score[eid] >= levelThreshold) {
        GameState.level[eid] += 1;
        // Reset score for new level
        GameState.score[eid] = GameState.score[eid] - levelThreshold;
      }

      expect(GameState.level[eid]).toBe(2);
      expect(GameState.score[eid]).toBe(50);
    });

    it('should support high score tracking', () => {
      GameState.score[eid] = 0;
      GameState.highScore[eid] = 5000;

      // Play game and get score
      GameState.score[eid] = 7500;

      // Update high score if new record
      if (GameState.score[eid] > GameState.highScore[eid]) {
        GameState.highScore[eid] = GameState.score[eid];
      }

      expect(GameState.highScore[eid]).toBe(7500);
    });

    it('should support timed gameplay', () => {
      GameState.state[eid] = GAME_STATE.PLAYING;
      GameState.timeRemaining[eid] = 60000; // 60 seconds in ms
      GameState.timeElapsed[eid] = 0;

      // Simulate 30 seconds passing
      const deltaMs = 30000;
      GameState.timeRemaining[eid] -= deltaMs;
      GameState.timeElapsed[eid] += deltaMs;

      expect(GameState.timeRemaining[eid]).toBeCloseTo(30000, 0);
      expect(GameState.timeElapsed[eid]).toBeCloseTo(30000, 0);

      // Time runs out
      GameState.timeRemaining[eid] = 0;
      const isTimeUp = GameState.timeRemaining[eid] <= 0;

      if (isTimeUp) {
        GameState.state[eid] = GAME_STATE.GAME_OVER;
      }

      expect(GameState.state[eid]).toBe(GAME_STATE.GAME_OVER);
    });
  });

  describe('multiple entities', () => {
    it('should support separate game states for multiple entities', () => {
      // Create a second game state entity (e.g., for multiplayer)
      const eid2 = addEntity(world);
      addComponent(world, GameState, eid2);

      // Set different values
      GameState.score[eid] = 1000;
      GameState.score[eid2] = 2000;
      GameState.lives[eid] = 3;
      GameState.lives[eid2] = 5;

      // Verify they're independent
      expect(GameState.score[eid]).toBe(1000);
      expect(GameState.score[eid2]).toBe(2000);
      expect(GameState.lives[eid]).toBe(3);
      expect(GameState.lives[eid2]).toBe(5);
    });
  });
});
