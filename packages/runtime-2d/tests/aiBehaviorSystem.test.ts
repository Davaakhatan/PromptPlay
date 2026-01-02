/**
 * Tests for AIBehaviorSystem
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addComponent } from 'bitecs';
import { AIBehaviorSystem } from '../src/systems/AIBehaviorSystem';
import { GameWorld, AIBehavior, Transform, Velocity } from '@promptplay/ecs-core';
import { MatterPhysics } from '../src/physics/MatterPhysics';
import { createMockCanvas } from './setup';

// Behavior type constants (from AIBehaviorSystem)
const BEHAVIOR_PATROL = 0;
const BEHAVIOR_CHASE = 1;
const BEHAVIOR_FLEE = 2;

describe('AIBehaviorSystem', () => {
  let physics: MatterPhysics;
  let aiSystem: AIBehaviorSystem;
  let world: GameWorld;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    physics = new MatterPhysics(mockCanvas);
    aiSystem = new AIBehaviorSystem(physics);
    world = new GameWorld();
  });

  function createAIEntity(options: {
    x?: number;
    y?: number;
    behaviorType?: number;
    speed?: number;
    detectionRadius?: number;
  } = {}): number {
    const eid = world.createEntity('enemy');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, Velocity, eid);
    addComponent(w, AIBehavior, eid);

    Transform.x[eid] = options.x ?? 100;
    Transform.y[eid] = options.y ?? 100;
    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;
    AIBehavior.behaviorType[eid] = options.behaviorType ?? BEHAVIOR_PATROL;
    AIBehavior.speed[eid] = options.speed ?? 5;
    AIBehavior.detectionRadius[eid] = options.detectionRadius ?? 200;

    return eid;
  }

  function createPlayerEntity(x: number, y: number): number {
    const eid = world.createEntity('player');
    const w = world.getWorld();

    world.addTag(eid, 'player');
    addComponent(w, Transform, eid);
    addComponent(w, Velocity, eid);
    Transform.x[eid] = x;
    Transform.y[eid] = y;
    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;

    return eid;
  }

  describe('init', () => {
    it('should initialize without errors', () => {
      expect(() => aiSystem.init(world)).not.toThrow();
    });

    it('should do nothing for non-GameWorld', () => {
      expect(() => aiSystem.init({})).not.toThrow();
    });

    it('should initialize patrol directions for AI entities', () => {
      createAIEntity();
      aiSystem.init(world);
      // No way to check internal state, but shouldn't throw
    });
  });

  describe('update', () => {
    it('should do nothing for non-GameWorld', () => {
      expect(() => aiSystem.update({}, 16)).not.toThrow();
    });

    it('should skip entities without AIBehavior component', () => {
      const eid = world.createEntity('enemy');
      const w = world.getWorld();
      addComponent(w, Transform, eid);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).not.toHaveBeenCalled();
    });

    it('should skip entities without Transform component', () => {
      const eid = world.createEntity('enemy');
      const w = world.getWorld();
      addComponent(w, AIBehavior, eid);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).not.toHaveBeenCalled();
    });
  });

  describe('patrol behavior', () => {
    it('should move entity in patrol direction', () => {
      const eid = createAIEntity({ behaviorType: BEHAVIOR_PATROL, speed: 5 });
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should set velocity in some direction (1 or -1) * speed
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, expect.any(Number), 0);
      const callArgs = setVelocitySpy.mock.calls[0];
      expect(Math.abs(callArgs[1])).toBe(5);
    });

    it('should change direction after patrol timer expires', () => {
      const eid = createAIEntity({ behaviorType: BEHAVIOR_PATROL, speed: 5 });
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');

      // First update - get initial direction
      aiSystem.update(world, 0.1);
      const initialVx = setVelocitySpy.mock.calls[0][1];

      // Update with enough time to trigger direction change (max 4 seconds)
      aiSystem.update(world, 5);
      const newVx = setVelocitySpy.mock.calls[1][1];

      // Direction should have changed
      expect(newVx).toBe(-initialVx);
    });

    it('should preserve vertical velocity during patrol', () => {
      const eid = createAIEntity({ behaviorType: BEHAVIOR_PATROL, speed: 5 });
      Velocity.vy[eid] = 10; // Falling
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, expect.any(Number), 10);
    });
  });

  describe('chase behavior', () => {
    it('should chase player when within detection radius', () => {
      // Enemy at 100, player at 150 (50 units away, within default 200 radius)
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_CHASE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(150, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should move toward player (positive x direction)
      expect(setVelocitySpy).toHaveBeenCalled();
      const vx = setVelocitySpy.mock.calls[0][1];
      expect(vx).toBeGreaterThan(0);
    });

    it('should chase player to the left', () => {
      // Enemy at 200, player at 100 (100 units to the left)
      const eid = createAIEntity({
        x: 200,
        y: 100,
        behaviorType: BEHAVIOR_CHASE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(100, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should move toward player (negative x direction)
      const vx = setVelocitySpy.mock.calls[0][1];
      expect(vx).toBeLessThan(0);
    });

    it('should stop chasing when player is out of detection radius', () => {
      // Enemy at 100, player at 500 (400 units away, outside 200 radius)
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_CHASE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(500, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should stop (vx = 0)
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, 0);
    });

    it('should do nothing if no player exists', () => {
      const eid = createAIEntity({
        behaviorType: BEHAVIOR_CHASE,
        speed: 5
      });
      // No player created
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).not.toHaveBeenCalled();
    });

    it('should preserve vertical velocity during chase', () => {
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_CHASE,
        speed: 5
      });
      Velocity.vy[eid] = 10;
      createPlayerEntity(150, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, expect.any(Number), 10);
    });
  });

  describe('flee behavior', () => {
    it('should flee from player when within detection radius', () => {
      // Enemy at 100, player at 150 (50 units away, within 200 radius)
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_FLEE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(150, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should move away from player (negative x direction)
      const vx = setVelocitySpy.mock.calls[0][1];
      expect(vx).toBeLessThan(0);
    });

    it('should flee in opposite direction of player', () => {
      // Enemy at 200, player at 100 (player to the left)
      const eid = createAIEntity({
        x: 200,
        y: 100,
        behaviorType: BEHAVIOR_FLEE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(100, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should move away from player (positive x direction)
      const vx = setVelocitySpy.mock.calls[0][1];
      expect(vx).toBeGreaterThan(0);
    });

    it('should stop fleeing when player is out of detection radius', () => {
      // Enemy at 100, player at 500 (400 units away, outside 200 radius)
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_FLEE,
        speed: 5,
        detectionRadius: 200
      });
      createPlayerEntity(500, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      // Should stop (vx = 0)
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, 0);
    });

    it('should do nothing if no player exists', () => {
      const eid = createAIEntity({
        behaviorType: BEHAVIOR_FLEE,
        speed: 5
      });
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).not.toHaveBeenCalled();
    });

    it('should preserve vertical velocity during flee', () => {
      const eid = createAIEntity({
        x: 100,
        y: 100,
        behaviorType: BEHAVIOR_FLEE,
        speed: 5
      });
      Velocity.vy[eid] = 10;
      createPlayerEntity(150, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, expect.any(Number), 10);
    });
  });

  describe('multiple entities', () => {
    it('should handle multiple AI entities', () => {
      const enemy1 = createAIEntity({
        x: 100,
        behaviorType: BEHAVIOR_PATROL,
        speed: 5
      });
      const enemy2 = createAIEntity({
        x: 200,
        behaviorType: BEHAVIOR_CHASE,
        speed: 10
      });
      createPlayerEntity(250, 100);
      aiSystem.init(world);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      aiSystem.update(world, 0.016);

      expect(setVelocitySpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup without errors', () => {
      createAIEntity();
      aiSystem.init(world);
      expect(() => aiSystem.cleanup?.(world)).not.toThrow();
    });

    it('should clear internal state on cleanup', () => {
      createAIEntity();
      aiSystem.init(world);
      aiSystem.cleanup?.(world);
      // Should not throw when updating after cleanup
      expect(() => aiSystem.update(world, 0.016)).not.toThrow();
    });
  });
});
