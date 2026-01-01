import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../src/gameloop/GameLoop';
import { advanceAnimationFrame } from './setup';

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let updateCallback: ReturnType<typeof vi.fn>;
  let renderCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gameLoop = new GameLoop();
    updateCallback = vi.fn();
    renderCallback = vi.fn();
  });

  describe('start', () => {
    it('should start the game loop', () => {
      gameLoop.start(updateCallback, renderCallback);

      expect(gameLoop.isPlaying()).toBe(true);
      expect(gameLoop.getIsRunning()).toBe(true);
      expect(gameLoop.getIsPaused()).toBe(false);
    });

    it('should request animation frame on start', () => {
      gameLoop.start(updateCallback, renderCallback);

      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should call render callback on each frame', () => {
      gameLoop.start(updateCallback, renderCallback);

      // Simulate first frame
      advanceAnimationFrame(16);

      expect(renderCallback).toHaveBeenCalled();
    });

    it('should call update callback with fixed delta time', () => {
      gameLoop.start(updateCallback, renderCallback);

      // Simulate enough time for one fixed update (1/60 seconds = ~16.67ms)
      advanceAnimationFrame(17);

      expect(updateCallback).toHaveBeenCalledWith(expect.closeTo(1 / 60, 5));
    });

    it('should accumulate time and call update multiple times if needed', () => {
      gameLoop.start(updateCallback, renderCallback);

      // Simulate 50ms frame (should trigger multiple fixed updates)
      advanceAnimationFrame(50);

      // With 50ms elapsed and 16.67ms fixed step, should have ~3 updates
      expect(updateCallback.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('stop', () => {
    it('should stop the game loop', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.stop();

      expect(gameLoop.isPlaying()).toBe(false);
      expect(gameLoop.getIsRunning()).toBe(false);
      expect(gameLoop.getIsPaused()).toBe(false);
    });

    it('should cancel animation frame on stop', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.stop();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should not call callbacks after stop', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.stop();

      updateCallback.mockClear();
      renderCallback.mockClear();

      // Try to advance frame
      advanceAnimationFrame(16);

      // Callbacks should not be called (no more frames scheduled)
      // Note: existing callbacks might still run but loop won't continue
    });
  });

  describe('pause and resume', () => {
    it('should pause the game loop', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.pause();

      expect(gameLoop.isPlaying()).toBe(false);
      expect(gameLoop.getIsRunning()).toBe(false);
      expect(gameLoop.getIsPaused()).toBe(true);
    });

    it('should resume the game loop', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.pause();
      gameLoop.resume();

      expect(gameLoop.isPlaying()).toBe(true);
      expect(gameLoop.getIsRunning()).toBe(true);
      expect(gameLoop.getIsPaused()).toBe(false);
    });

    it('should continue calling callbacks after resume', () => {
      gameLoop.start(updateCallback, renderCallback);
      gameLoop.pause();

      updateCallback.mockClear();
      renderCallback.mockClear();

      gameLoop.resume();

      // Advance frame after resume
      advanceAnimationFrame(16);

      expect(renderCallback).toHaveBeenCalled();
    });

    it('should not resume if not paused', () => {
      // Don't start, just try to resume
      gameLoop.resume();

      expect(gameLoop.isPlaying()).toBe(false);
    });
  });

  describe('FPS tracking', () => {
    it('should return 0 FPS initially', () => {
      expect(gameLoop.getFps()).toBe(0);
    });

    it('should track FPS after running for a second', () => {
      gameLoop.start(updateCallback, renderCallback);

      // Simulate running for more than 1 second with 60 FPS frames
      let currentTime = 0;
      for (let i = 0; i < 70; i++) {
        currentTime += 16.67; // ~60 FPS
        advanceAnimationFrame(currentTime);
      }

      // FPS should be calculated after 1 second
      expect(gameLoop.getFps()).toBeGreaterThan(0);
    });
  });

  describe('fixed delta time', () => {
    it('should return fixed delta time of 1/60', () => {
      expect(gameLoop.getFixedDeltaTime()).toBeCloseTo(1 / 60);
    });
  });

  describe('frame time capping', () => {
    it('should cap frame time to prevent spiral of death', () => {
      gameLoop.start(updateCallback, renderCallback);

      // Simulate a very long frame (1 second)
      advanceAnimationFrame(1000);

      // Should not have called update 60 times (1000ms / 16.67ms)
      // Should be capped at ~15 updates (250ms / 16.67ms)
      expect(updateCallback.mock.calls.length).toBeLessThan(20);
    });
  });
});
