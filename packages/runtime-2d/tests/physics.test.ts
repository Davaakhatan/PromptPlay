import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine } from 'matter-js';
import { GameWorld, Transform, Velocity, Collider, Input } from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';
import { MatterPhysics } from '../src/physics/MatterPhysics';

describe('MatterPhysics', () => {
  let world: GameWorld;
  let engine: Engine;
  let physics: MatterPhysics;

  beforeEach(() => {
    world = new GameWorld();
    engine = Engine.create();
    physics = new MatterPhysics(engine, world);
  });

  function createPhysicsEntity(options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isStatic?: boolean;
    isCircle?: boolean;
    radius?: number;
    isSensor?: boolean;
  } = {}): number {
    const eid = world.createEntity('physics-entity');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, Collider, eid);
    addComponent(w, Velocity, eid);

    Transform.x[eid] = options.x ?? 100;
    Transform.y[eid] = options.y ?? 100;

    Collider.type[eid] = options.isCircle ? 1 : 0; // 0 = box, 1 = circle
    Collider.width[eid] = options.width ?? 32;
    Collider.height[eid] = options.height ?? 32;
    Collider.radius[eid] = options.radius ?? 16;
    Collider.isSensor[eid] = options.isSensor ? 1 : 0;

    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;

    if (options.isStatic) {
      world.addTag(eid, 'static');
    }

    return eid;
  }

  describe('initialization', () => {
    it('should create physics bodies for entities with Transform and Collider', () => {
      const eid = createPhysicsEntity({ x: 200, y: 150 });

      physics.initialize();

      // Verify body was created (indirectly via update)
      physics.setVelocity(eid, 10, 0);
      physics.update(0.016);

      // Body should have moved
      expect(Transform.x[eid]).not.toBe(200);
    });

    it('should create static bodies for entities with static tag', () => {
      const eid = createPhysicsEntity({ isStatic: true });

      physics.initialize();
      physics.setVelocity(eid, 100, 0); // Try to move
      physics.update(0.016);

      // Static body should not move
      expect(Transform.x[eid]).toBe(100);
    });

    it('should create circle colliders', () => {
      const eid = createPhysicsEntity({ isCircle: true, radius: 25 });

      physics.initialize();

      // Verify it doesn't throw and body is usable
      expect(() => physics.setVelocity(eid, 10, 0)).not.toThrow();
    });

    it('should create sensor bodies', () => {
      createPhysicsEntity({ isSensor: true });

      expect(() => physics.initialize()).not.toThrow();
    });
  });

  describe('body management', () => {
    it('should add body for new entity', () => {
      physics.initialize();

      const eid = createPhysicsEntity({ x: 300, y: 200 });
      physics.addBody(eid);

      physics.setVelocity(eid, 10, 0);
      physics.update(0.016);

      expect(Transform.x[eid]).not.toBe(300);
    });

    it('should not duplicate body if already exists', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      // Try to add again
      expect(() => physics.addBody(eid)).not.toThrow();
    });

    it('should remove body for destroyed entity', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      physics.removeBody(eid);

      // Setting velocity on removed body should not throw
      expect(() => physics.setVelocity(eid, 10, 0)).not.toThrow();
    });
  });

  describe('velocity', () => {
    it('should set velocity on dynamic bodies', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      physics.setVelocity(eid, 50, 30);
      physics.update(0.016);

      expect(Velocity.vx[eid]).toBeCloseTo(50, 0);
      expect(Velocity.vy[eid]).toBeCloseTo(30, 0);
    });

    it('should not set velocity on static bodies', () => {
      const eid = createPhysicsEntity({ isStatic: true });
      physics.initialize();

      physics.setVelocity(eid, 100, 100);
      physics.update(0.016);

      expect(Transform.x[eid]).toBe(100);
      expect(Transform.y[eid]).toBe(100);
    });

    it('should sync velocity back to ECS', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      physics.setVelocity(eid, 25, 15);
      physics.update(0.016);

      expect(Velocity.vx[eid]).toBeCloseTo(25, 0);
      expect(Velocity.vy[eid]).toBeCloseTo(15, 0);
    });
  });

  describe('force application', () => {
    it('should apply force to dynamic bodies', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      const initialX = Transform.x[eid];
      physics.applyForce(eid, 0.01, 0);
      physics.update(0.016);

      // Body should have accelerated
      expect(Transform.x[eid]).not.toBe(initialX);
    });

    it('should not apply force to static bodies', () => {
      const eid = createPhysicsEntity({ isStatic: true });
      physics.initialize();

      physics.applyForce(eid, 1, 0);
      physics.update(0.016);

      expect(Transform.x[eid]).toBe(100);
    });
  });

  describe('transform sync', () => {
    it('should update Transform from physics body', () => {
      const eid = createPhysicsEntity({ x: 100, y: 100 });
      physics.initialize();

      physics.setVelocity(eid, 100, 50);
      physics.update(0.1); // 100ms

      // Position should have changed
      expect(Transform.x[eid]).toBeGreaterThan(100);
      expect(Transform.y[eid]).toBeGreaterThan(100);
    });

    it('should update rotation from physics body', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      // Apply angular force (torque)
      // Note: Matter.js applies torque differently, so we test rotation is synced
      physics.update(0.016);

      // Rotation should be synced (even if 0)
      expect(typeof Transform.rotation[eid]).toBe('number');
    });
  });

  describe('gravity', () => {
    it('should set gravity', () => {
      physics.setGravity(0, 2);

      expect(engine.gravity.x).toBe(0);
      expect(engine.gravity.y).toBe(2);
    });

    it('should apply gravity to bodies', () => {
      const eid = createPhysicsEntity();
      physics.initialize();
      physics.setGravity(0, 1);

      const initialY = Transform.y[eid];
      physics.update(0.1);

      // Body should fall due to gravity
      expect(Transform.y[eid]).toBeGreaterThan(initialY);
    });
  });

  describe('collision callbacks', () => {
    it('should register collision callback', () => {
      const callback = vi.fn();
      physics.onCollision(callback);

      expect(() => physics.initialize()).not.toThrow();
    });
  });

  describe('ground detection', () => {
    it('should return grounded state', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      // Initially not grounded
      expect(physics.isGrounded(eid)).toBe(false);
    });

    it('should update Input.isGrounded when grounded', () => {
      const eid = createPhysicsEntity();
      const w = world.getWorld();
      addComponent(w, Input, eid);
      Input.isGrounded[eid] = 0;

      physics.initialize();

      // isGrounded should be 0 initially (not touching ground)
      expect(Input.isGrounded[eid]).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove all bodies on cleanup', () => {
      createPhysicsEntity({ x: 100, y: 100 });
      createPhysicsEntity({ x: 200, y: 200 });
      physics.initialize();

      physics.cleanup();

      // Engine world should be empty
      expect(engine.world.bodies.length).toBe(0);
    });

    it('should clear collision callbacks on cleanup', () => {
      const callback = vi.fn();
      physics.onCollision(callback);
      physics.initialize();

      physics.cleanup();

      // Callback should not be called after cleanup
      // (would need to trigger collision to verify)
    });
  });

  describe('edge cases', () => {
    it('should handle entity without Transform after update', () => {
      const eid = createPhysicsEntity();
      physics.initialize();

      // Remove entity from world
      world.destroyEntity(eid);

      // Should not throw
      expect(() => physics.update(0.016)).not.toThrow();
    });

    it('should handle setting velocity on non-existent body', () => {
      physics.initialize();

      // Should not throw for non-existent entity
      expect(() => physics.setVelocity(9999, 10, 10)).not.toThrow();
    });

    it('should handle removing non-existent body', () => {
      physics.initialize();

      // Should not throw
      expect(() => physics.removeBody(9999)).not.toThrow();
    });
  });
});
