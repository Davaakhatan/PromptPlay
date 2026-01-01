import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld, Animation, Sprite } from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';
import {
  AnimationSystem,
  playAnimation,
  stopAnimation,
  pauseAnimation,
  resumeAnimation,
  setAnimationFrame,
} from '../src/systems/AnimationSystem';

describe('AnimationSystem', () => {
  let world: GameWorld;
  let animationSystem: AnimationSystem;

  beforeEach(() => {
    world = new GameWorld();
    animationSystem = new AnimationSystem();
    animationSystem.init(world);
  });

  function createAnimatedEntity(frameCount: number, frameDuration: number, loop = true): number {
    const eid = world.createEntity('animated');
    const w = world.getWorld();

    addComponent(w, Sprite, eid);
    addComponent(w, Animation, eid);

    // Set up sprite
    Sprite.visible[eid] = 1;
    Sprite.width[eid] = 32;
    Sprite.height[eid] = 32;

    // Set up animation
    Animation.frameCount[eid] = frameCount;
    Animation.frameDuration[eid] = frameDuration;
    Animation.loop[eid] = loop ? 1 : 0;
    Animation.isPlaying[eid] = 1;
    Animation.currentFrame[eid] = 0;
    Animation.elapsed[eid] = 0;

    return eid;
  }

  describe('frame advancement', () => {
    it('should advance frame after frame duration', () => {
      const eid = createAnimatedEntity(4, 100); // 4 frames, 100ms per frame

      // Update with enough time to advance one frame
      animationSystem.update(world, 0.1); // 100ms

      expect(Animation.currentFrame[eid]).toBe(1);
    });

    it('should not advance frame before frame duration', () => {
      const eid = createAnimatedEntity(4, 100);

      // Update with less than frame duration
      animationSystem.update(world, 0.05); // 50ms

      expect(Animation.currentFrame[eid]).toBe(0);
    });

    it('should accumulate time across updates', () => {
      const eid = createAnimatedEntity(4, 100);

      // Two updates of 50ms each
      animationSystem.update(world, 0.05);
      animationSystem.update(world, 0.05);

      expect(Animation.currentFrame[eid]).toBe(1);
    });

    it('should advance multiple frames with multiple updates', () => {
      const eid = createAnimatedEntity(4, 100);

      // Note: AnimationSystem advances one frame per update (uses if, not while)
      // So we need multiple updates to advance multiple frames
      animationSystem.update(world, 0.1); // 100ms - frame 0 -> 1
      animationSystem.update(world, 0.1); // 100ms - frame 1 -> 2

      expect(Animation.currentFrame[eid]).toBe(2);
    });
  });

  describe('looping', () => {
    it('should loop back to frame 0 when loop is enabled', () => {
      const eid = createAnimatedEntity(3, 100, true);
      Animation.currentFrame[eid] = 2; // Last frame
      Animation.elapsed[eid] = 0;

      animationSystem.update(world, 0.1); // Advance past last frame

      expect(Animation.currentFrame[eid]).toBe(0);
      expect(Animation.isPlaying[eid]).toBe(1);
    });

    it('should stop at last frame when loop is disabled', () => {
      const eid = createAnimatedEntity(3, 100, false);
      Animation.currentFrame[eid] = 2; // Last frame
      Animation.elapsed[eid] = 0;

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(2);
      expect(Animation.isPlaying[eid]).toBe(0);
    });
  });

  describe('playback control', () => {
    it('should not update when not playing', () => {
      const eid = createAnimatedEntity(4, 100);
      Animation.isPlaying[eid] = 0;

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(0);
    });

    it('should skip entities with single frame', () => {
      const eid = createAnimatedEntity(1, 100);
      Animation.elapsed[eid] = 0;

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(0);
    });

    it('should skip entities with zero frame duration', () => {
      const eid = createAnimatedEntity(4, 0);

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(0);
    });
  });

  describe('helper functions', () => {
    it('playAnimation should reset and start animation', () => {
      const eid = createAnimatedEntity(4, 100);
      Animation.currentFrame[eid] = 2;
      Animation.elapsed[eid] = 50;
      Animation.isPlaying[eid] = 0;

      playAnimation(eid);

      expect(Animation.currentFrame[eid]).toBe(0);
      expect(Animation.elapsed[eid]).toBe(0);
      expect(Animation.isPlaying[eid]).toBe(1);
    });

    it('playAnimation should set animation ID', () => {
      const eid = createAnimatedEntity(4, 100);

      playAnimation(eid, 5);

      expect(Animation.animationId[eid]).toBe(5);
    });

    it('stopAnimation should stop playback', () => {
      const eid = createAnimatedEntity(4, 100);

      stopAnimation(eid);

      expect(Animation.isPlaying[eid]).toBe(0);
    });

    it('pauseAnimation should stop playback', () => {
      const eid = createAnimatedEntity(4, 100);

      pauseAnimation(eid);

      expect(Animation.isPlaying[eid]).toBe(0);
    });

    it('resumeAnimation should resume playback', () => {
      const eid = createAnimatedEntity(4, 100);
      Animation.isPlaying[eid] = 0;

      resumeAnimation(eid);

      expect(Animation.isPlaying[eid]).toBe(1);
    });

    it('setAnimationFrame should set specific frame', () => {
      const eid = createAnimatedEntity(4, 100);
      Animation.elapsed[eid] = 50;

      setAnimationFrame(eid, 2);

      expect(Animation.currentFrame[eid]).toBe(2);
      expect(Animation.elapsed[eid]).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle entities without Sprite component', () => {
      const eid = world.createEntity('no-sprite');
      const w = world.getWorld();
      addComponent(w, Animation, eid);
      Animation.isPlaying[eid] = 1;
      Animation.frameCount[eid] = 4;
      Animation.frameDuration[eid] = 100;

      // Should not throw
      expect(() => animationSystem.update(world, 0.1)).not.toThrow();
    });

    it('should handle non-GameWorld world', () => {
      // Should not throw when world is not GameWorld
      expect(() => animationSystem.update({}, 0.1)).not.toThrow();
    });
  });
});
