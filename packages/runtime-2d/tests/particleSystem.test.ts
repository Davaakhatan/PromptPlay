import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addComponent } from 'bitecs';
import { ParticleSystem } from '../src/systems/ParticleSystem';
import { GameWorld, Transform, ParticleEmitter } from '@promptplay/ecs-core';

describe('ParticleSystem', () => {
  let system: ParticleSystem;
  let world: GameWorld;

  beforeEach(() => {
    system = new ParticleSystem();
    world = new GameWorld();
    system.init();
  });

  // Helper to create an emitter entity
  function createEmitter(options: {
    x?: number;
    y?: number;
    emitRate?: number;
    isEmitting?: boolean;
    burstCount?: number;
    minLifetime?: number;
    maxLifetime?: number;
    minSize?: number;
    maxSize?: number;
    minSpeed?: number;
    maxSpeed?: number;
    minAngle?: number;
    maxAngle?: number;
    gravityX?: number;
    gravityY?: number;
    startColor?: number;
    endColor?: number;
  } = {}): number {
    const eid = world.createEntity('emitter');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, ParticleEmitter, eid);

    Transform.x[eid] = options.x ?? 100;
    Transform.y[eid] = options.y ?? 100;

    ParticleEmitter.emitRate[eid] = options.emitRate ?? 10;
    ParticleEmitter.isEmitting[eid] = options.isEmitting !== false ? 1 : 0;
    ParticleEmitter.burstCount[eid] = options.burstCount ?? 0;
    ParticleEmitter.minLifetime[eid] = options.minLifetime ?? 1;
    ParticleEmitter.maxLifetime[eid] = options.maxLifetime ?? 2;
    ParticleEmitter.minSize[eid] = options.minSize ?? 4;
    ParticleEmitter.maxSize[eid] = options.maxSize ?? 8;
    ParticleEmitter.minSpeed[eid] = options.minSpeed ?? 50;
    ParticleEmitter.maxSpeed[eid] = options.maxSpeed ?? 100;
    ParticleEmitter.minAngle[eid] = options.minAngle ?? 0;
    ParticleEmitter.maxAngle[eid] = options.maxAngle ?? Math.PI * 2;
    ParticleEmitter.gravityX[eid] = options.gravityX ?? 0;
    ParticleEmitter.gravityY[eid] = options.gravityY ?? 0;
    ParticleEmitter.startColor[eid] = options.startColor ?? 0xffffffff;
    ParticleEmitter.endColor[eid] = options.endColor ?? 0x00000000;
    ParticleEmitter.timeSinceEmit[eid] = 0;
    ParticleEmitter.activeParticles[eid] = 0;

    return eid;
  }

  describe('init', () => {
    it('should clear all particles on init', () => {
      // Create some particles first
      const eid = createEmitter({ burstCount: 5, isEmitting: true });
      system.update(world, 0.016);

      expect(system.getParticles().length).toBeGreaterThan(0);

      // Init should clear them
      system.init();
      expect(system.getParticles().length).toBe(0);
    });
  });

  describe('getParticles', () => {
    it('should return empty array when no particles exist', () => {
      expect(system.getParticles()).toEqual([]);
    });

    it('should return all active particles', () => {
      createEmitter({ burstCount: 3, isEmitting: true });
      system.update(world, 0.016);

      const particles = system.getParticles();
      expect(particles.length).toBe(3);
    });
  });

  describe('continuous emission', () => {
    it('should emit particles based on emitRate', () => {
      createEmitter({ emitRate: 60 }); // 60 particles per second

      // Run for 1 second (60 frames at ~16ms each)
      for (let i = 0; i < 60; i++) {
        system.update(world, 0.016);
      }

      const particles = system.getParticles();
      // Should have emitted approximately 60 particles (allow some variance due to timing)
      expect(particles.length).toBeGreaterThanOrEqual(50);
      expect(particles.length).toBeLessThanOrEqual(70);
    });

    it('should not emit when emitRate is 0', () => {
      createEmitter({ emitRate: 0 });

      system.update(world, 1); // 1 second

      expect(system.getParticles().length).toBe(0);
    });

    it('should not emit when isEmitting is false', () => {
      createEmitter({ emitRate: 100, isEmitting: false });

      system.update(world, 1);

      expect(system.getParticles().length).toBe(0);
    });

    it('should track timeSinceEmit', () => {
      const eid = createEmitter({ emitRate: 1 }); // 1 particle per second

      system.update(world, 0.5);
      expect(ParticleEmitter.timeSinceEmit[eid]).toBeCloseTo(0.5, 2);

      system.update(world, 0.5);
      // After emitting, timeSinceEmit should be close to 0
      expect(ParticleEmitter.timeSinceEmit[eid]).toBeCloseTo(0, 2);
    });
  });

  describe('burst emission', () => {
    it('should emit all burst particles at once', () => {
      createEmitter({ burstCount: 10, isEmitting: true });

      system.update(world, 0.016);

      expect(system.getParticles().length).toBe(10);
    });

    it('should reset burstCount after emission', () => {
      const eid = createEmitter({ burstCount: 5, isEmitting: true });

      system.update(world, 0.016);

      expect(ParticleEmitter.burstCount[eid]).toBe(0);
    });

    it('should skip continuous emission when bursting', () => {
      createEmitter({ burstCount: 5, emitRate: 1000, isEmitting: true });

      system.update(world, 0.016);

      // Should only have burst particles, not continuous
      expect(system.getParticles().length).toBe(5);
    });
  });

  describe('particle lifecycle', () => {
    it('should remove particles when lifetime exceeds maxLifetime', () => {
      const eid = createEmitter({ burstCount: 5, minLifetime: 0.1, maxLifetime: 0.1, isEmitting: true, emitRate: 0 });

      system.update(world, 0.016);
      expect(system.getParticles().length).toBe(5);

      // Disable emitter to prevent new particles
      ParticleEmitter.isEmitting[eid] = 0;

      // Advance time past lifetime
      system.update(world, 0.2);
      expect(system.getParticles().length).toBe(0);
    });

    it('should increment particle lifetime each update', () => {
      createEmitter({ burstCount: 1, minLifetime: 10, maxLifetime: 10, isEmitting: true });

      system.update(world, 0.016);
      const particle = system.getParticles()[0];
      expect(particle.lifetime).toBeCloseTo(0, 2);

      system.update(world, 0.5);
      expect(system.getParticles()[0].lifetime).toBeCloseTo(0.5, 2);
    });
  });

  describe('particle movement', () => {
    it('should update particle positions based on velocity', () => {
      // Use burst method for predictable particle creation
      system.burst(world, 0, 0, 1, {
        minSpeed: 100,
        maxSpeed: 100,
        minAngle: 0, // Right direction
        maxAngle: 0.001, // Can't use 0 due to || fallback, use tiny angle
        minLifetime: 10,
        maxLifetime: 10,
      });

      const initialX = system.getParticles()[0].x;
      const vx = system.getParticles()[0].vx;

      system.update(world, 1); // 1 second

      const particle = system.getParticles()[0];
      // Should have moved by velocity * time
      expect(particle.x - initialX).toBeCloseTo(vx * 1, 0);
    });

    it('should apply gravity to particle velocity', () => {
      // Use burst method for predictable particles
      system.burst(world, 0, 0, 1, {
        minSpeed: 1, // Can't use 0 due to || fallback
        maxSpeed: 1,
        gravityY: 100,
        minLifetime: 10,
        maxLifetime: 10,
      });

      // Burst particles don't use emitter gravity - test with emitter instead
      const eid = createEmitter({
        burstCount: 1,
        minSpeed: 1, // Can't use 0 due to fallback
        maxSpeed: 1,
        gravityY: 100, // Gravity pulling down
        minLifetime: 10,
        maxLifetime: 10,
        isEmitting: true,
        emitRate: 0,
      });

      // Clear previous particles and get fresh one
      system.init();
      system.update(world, 0.016);
      const initialVy = system.getParticles()[0].vy;

      system.update(world, 1); // 1 second

      const particle = system.getParticles()[0];
      // Velocity should have increased due to gravity
      expect(particle.vy - initialVy).toBeCloseTo(100, 0);
    });

    it('should apply horizontal gravity', () => {
      const eid = createEmitter({
        burstCount: 1,
        minSpeed: 1, // Can't use 0 due to fallback
        maxSpeed: 1,
        gravityX: 50,
        gravityY: 0,
        minLifetime: 10,
        maxLifetime: 10,
        isEmitting: true,
        emitRate: 0,
      });

      system.update(world, 0.016);
      const initialVx = system.getParticles()[0].vx;

      system.update(world, 1);

      const particle = system.getParticles()[0];
      // Check that velocity increased by gravity amount
      expect(particle.vx - initialVx).toBeCloseTo(50, 0);
    });
  });

  describe('particle properties', () => {
    it('should set particle position to emitter position', () => {
      createEmitter({ burstCount: 1, x: 200, y: 300, isEmitting: true });

      system.update(world, 0.016);

      const particle = system.getParticles()[0];
      expect(particle.x).toBe(200);
      expect(particle.y).toBe(300);
    });

    it('should set particle colors from emitter', () => {
      createEmitter({
        burstCount: 1,
        startColor: 0xff0000ff,
        endColor: 0x00ff00ff,
        isEmitting: true
      });

      system.update(world, 0.016);

      const particle = system.getParticles()[0];
      expect(particle.startColor).toBe(0xff0000ff);
      expect(particle.endColor).toBe(0x00ff00ff);
    });

    it('should track emitter ID on particles', () => {
      const eid = createEmitter({ burstCount: 1, isEmitting: true });

      system.update(world, 0.016);

      const particle = system.getParticles()[0];
      expect(particle.emitterId).toBe(eid);
    });

    it('should randomize particle size between min and max', () => {
      createEmitter({
        burstCount: 100,
        minSize: 4,
        maxSize: 20,
        isEmitting: true
      });

      system.update(world, 0.016);

      const particles = system.getParticles();
      const sizes = particles.map(p => p.size);

      // All sizes should be within range
      expect(sizes.every(s => s >= 4 && s <= 20)).toBe(true);
      // Should have variety (not all same size)
      const uniqueSizes = new Set(sizes.map(s => Math.floor(s)));
      expect(uniqueSizes.size).toBeGreaterThan(1);
    });

    it('should randomize particle lifetime between min and max', () => {
      createEmitter({
        burstCount: 100,
        minLifetime: 1,
        maxLifetime: 5,
        isEmitting: true
      });

      system.update(world, 0.016);

      const particles = system.getParticles();
      const lifetimes = particles.map(p => p.maxLifetime);

      expect(lifetimes.every(l => l >= 1 && l <= 5)).toBe(true);
    });
  });

  describe('max particles limit', () => {
    it('should not exceed max total particles (1000)', () => {
      // Create emitter with very high burst
      createEmitter({ burstCount: 2000, isEmitting: true });

      system.update(world, 0.016);

      expect(system.getParticles().length).toBeLessThanOrEqual(1000);
    });

    it('should stop emitting when at max particles', () => {
      createEmitter({ burstCount: 1000, isEmitting: true });
      system.update(world, 0.016);

      // Try to add more
      createEmitter({ burstCount: 100, isEmitting: true });
      system.update(world, 0.016);

      expect(system.getParticles().length).toBeLessThanOrEqual(1000);
    });
  });

  describe('activeParticles tracking', () => {
    it('should update activeParticles count for each emitter', () => {
      const eid = createEmitter({ burstCount: 5, isEmitting: true });

      system.update(world, 0.016);

      expect(ParticleEmitter.activeParticles[eid]).toBe(5);
    });

    it('should decrease activeParticles when particles die', () => {
      const eid = createEmitter({
        burstCount: 5,
        minLifetime: 0.1,
        maxLifetime: 0.1,
        isEmitting: true,
        emitRate: 0, // Disable continuous emission
      });

      system.update(world, 0.016);
      expect(ParticleEmitter.activeParticles[eid]).toBe(5);

      // Disable emitter to prevent new particles
      ParticleEmitter.isEmitting[eid] = 0;
      system.update(world, 0.2);
      expect(ParticleEmitter.activeParticles[eid]).toBe(0);
    });

    it('should track particles per emitter separately', () => {
      const eid1 = createEmitter({ burstCount: 3, isEmitting: true, x: 0 });
      const eid2 = createEmitter({ burstCount: 7, isEmitting: true, x: 100 });

      system.update(world, 0.016);

      expect(ParticleEmitter.activeParticles[eid1]).toBe(3);
      expect(ParticleEmitter.activeParticles[eid2]).toBe(7);
    });
  });

  describe('burst method', () => {
    it('should emit particles at specified position', () => {
      system.burst(world, 250, 350, 10);

      const particles = system.getParticles();
      expect(particles.length).toBe(10);
      expect(particles[0].x).toBe(250);
      expect(particles[0].y).toBe(350);
    });

    it('should use default config when not provided', () => {
      system.burst(world, 0, 0, 1);

      const particle = system.getParticles()[0];
      expect(particle.maxLifetime).toBeGreaterThanOrEqual(0.5);
      expect(particle.maxLifetime).toBeLessThanOrEqual(1.5);
      expect(particle.size).toBeGreaterThanOrEqual(4);
      expect(particle.size).toBeLessThanOrEqual(12);
      expect(particle.emitterId).toBe(-1); // No emitter
    });

    it('should use custom config when provided', () => {
      system.burst(world, 0, 0, 1, {
        minLifetime: 5,
        maxLifetime: 5,
        minSize: 20,
        maxSize: 20,
        startColor: 0xaabbccdd,
        endColor: 0x11223344,
      });

      const particle = system.getParticles()[0];
      expect(particle.maxLifetime).toBe(5);
      expect(particle.size).toBe(20);
      expect(particle.startColor).toBe(0xaabbccdd);
      expect(particle.endColor).toBe(0x11223344);
    });

    it('should respect max particles limit', () => {
      system.burst(world, 0, 0, 2000);

      expect(system.getParticles().length).toBeLessThanOrEqual(1000);
    });

    it('should set emitterId to -1 for burst particles', () => {
      system.burst(world, 0, 0, 5);

      const particles = system.getParticles();
      expect(particles.every(p => p.emitterId === -1)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clear all particles', () => {
      createEmitter({ burstCount: 10, isEmitting: true });
      system.update(world, 0.016);

      expect(system.getParticles().length).toBe(10);

      system.cleanup();

      expect(system.getParticles().length).toBe(0);
    });
  });

  describe('multiple emitters', () => {
    it('should handle multiple emitters independently', () => {
      createEmitter({ burstCount: 3, x: 0, y: 0, isEmitting: true });
      createEmitter({ burstCount: 5, x: 100, y: 100, isEmitting: true });
      createEmitter({ emitRate: 100, x: 200, y: 200, isEmitting: true });

      system.update(world, 0.1);

      const particles = system.getParticles();
      // 3 + 5 + ~10 (from continuous)
      expect(particles.length).toBeGreaterThanOrEqual(8);
    });

    it('should only process emitters with Transform component', () => {
      const eid = world.createEntity('no-transform');
      const w = world.getWorld();
      addComponent(w, ParticleEmitter, eid);
      ParticleEmitter.isEmitting[eid] = 1;
      ParticleEmitter.burstCount[eid] = 10;

      system.update(world, 0.016);

      // No particles should be emitted without Transform
      expect(system.getParticles().length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero deltaTime', () => {
      createEmitter({ emitRate: 100, isEmitting: true });

      system.update(world, 0);

      // Should not crash, no particles emitted with 0 time
      expect(system.getParticles().length).toBe(0);
    });

    it('should handle very large deltaTime', () => {
      const eid = createEmitter({
        burstCount: 5,
        minLifetime: 1,
        maxLifetime: 1,
        isEmitting: true,
        emitRate: 0, // Disable continuous emission
      });

      system.update(world, 0.016);
      expect(system.getParticles().length).toBe(5);

      // Disable emitter to prevent new particles during large time step
      ParticleEmitter.isEmitting[eid] = 0;

      // Large time step should kill all particles
      system.update(world, 100);
      expect(system.getParticles().length).toBe(0);
    });

    it('should handle negative angle correctly', () => {
      createEmitter({
        burstCount: 1,
        minAngle: -Math.PI,
        maxAngle: -Math.PI,
        minSpeed: 100,
        maxSpeed: 100,
        isEmitting: true
      });

      system.update(world, 0.016);

      const particle = system.getParticles()[0];
      // Angle of -PI should give negative X velocity
      expect(particle.vx).toBeLessThan(0);
    });
  });
});
