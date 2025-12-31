import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Transform, ParticleEmitter } from '@promptplay/ecs-core';

// Internal particle representation (not ECS entities for performance)
interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  startColor: number;
  endColor: number;
  emitterId: number;
}

export class ParticleSystem implements ISystem {
  private particles: ParticleData[] = [];
  private maxTotalParticles = 1000;

  init(): void {
    this.particles = [];
  }

  update(world: GameWorld, deltaTime: number): void {
    const w = world.getWorld();
    const entities = world.getEntities();

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += deltaTime;

      if (p.lifetime >= p.maxLifetime) {
        // Remove dead particle
        this.particles.splice(i, 1);
        continue;
      }

      // Find emitter for gravity
      let gravityX = 0;
      let gravityY = 0;
      if (hasComponent(w, ParticleEmitter, p.emitterId)) {
        gravityX = ParticleEmitter.gravityX[p.emitterId];
        gravityY = ParticleEmitter.gravityY[p.emitterId];
      }

      // Apply gravity
      p.vx += gravityX * deltaTime;
      p.vy += gravityY * deltaTime;

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
    }

    // Emit new particles
    for (const eid of entities) {
      if (!hasComponent(w, ParticleEmitter, eid)) continue;
      if (ParticleEmitter.isEmitting[eid] !== 1) continue;
      if (!hasComponent(w, Transform, eid)) continue;

      const emitterX = Transform.x[eid];
      const emitterY = Transform.y[eid];

      // Handle burst emission
      const burstCount = ParticleEmitter.burstCount[eid];
      if (burstCount > 0) {
        for (let i = 0; i < burstCount && this.particles.length < this.maxTotalParticles; i++) {
          this.emitParticle(eid, emitterX, emitterY);
        }
        ParticleEmitter.burstCount[eid] = 0;
        continue;
      }

      // Continuous emission
      const emitRate = ParticleEmitter.emitRate[eid];
      if (emitRate <= 0) continue;

      ParticleEmitter.timeSinceEmit[eid] += deltaTime;
      const emitInterval = 1 / emitRate;

      while (
        ParticleEmitter.timeSinceEmit[eid] >= emitInterval &&
        this.particles.length < this.maxTotalParticles
      ) {
        this.emitParticle(eid, emitterX, emitterY);
        ParticleEmitter.timeSinceEmit[eid] -= emitInterval;
      }
    }

    // Update active particle counts
    for (const eid of entities) {
      if (hasComponent(w, ParticleEmitter, eid)) {
        ParticleEmitter.activeParticles[eid] = this.particles.filter(
          (p) => p.emitterId === eid
        ).length;
      }
    }
  }

  private emitParticle(emitterId: number, x: number, y: number): void {
    const minLifetime = ParticleEmitter.minLifetime[emitterId] || 1;
    const maxLifetime = ParticleEmitter.maxLifetime[emitterId] || 2;
    const minSize = ParticleEmitter.minSize[emitterId] || 4;
    const maxSize = ParticleEmitter.maxSize[emitterId] || 8;
    const minSpeed = ParticleEmitter.minSpeed[emitterId] || 50;
    const maxSpeed = ParticleEmitter.maxSpeed[emitterId] || 100;
    const minAngle = ParticleEmitter.minAngle[emitterId] || 0;
    const maxAngle = ParticleEmitter.maxAngle[emitterId] || Math.PI * 2;

    const lifetime = minLifetime + Math.random() * (maxLifetime - minLifetime);
    const size = minSize + Math.random() * (maxSize - minSize);
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const angle = minAngle + Math.random() * (maxAngle - minAngle);

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: 0,
      maxLifetime: lifetime,
      size,
      startColor: ParticleEmitter.startColor[emitterId] || 0xffffffff,
      endColor: ParticleEmitter.endColor[emitterId] || 0x00000000,
      emitterId,
    });
  }

  getParticles(): ParticleData[] {
    return this.particles;
  }

  // Emit a burst of particles at a specific position
  burst(world: GameWorld, x: number, y: number, count: number, config?: Partial<{
    minLifetime: number;
    maxLifetime: number;
    minSize: number;
    maxSize: number;
    minSpeed: number;
    maxSpeed: number;
    minAngle: number;
    maxAngle: number;
    startColor: number;
    endColor: number;
    gravityX: number;
    gravityY: number;
  }>): void {
    const defaults = {
      minLifetime: 0.5,
      maxLifetime: 1.5,
      minSize: 4,
      maxSize: 12,
      minSpeed: 50,
      maxSpeed: 150,
      minAngle: 0,
      maxAngle: Math.PI * 2,
      startColor: 0xffff00ff, // Yellow
      endColor: 0xff000000, // Red transparent
      gravityX: 0,
      gravityY: 200,
    };

    const cfg = { ...defaults, ...config };

    for (let i = 0; i < count && this.particles.length < this.maxTotalParticles; i++) {
      const lifetime = cfg.minLifetime + Math.random() * (cfg.maxLifetime - cfg.minLifetime);
      const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
      const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
      const angle = cfg.minAngle + Math.random() * (cfg.maxAngle - cfg.minAngle);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 0,
        maxLifetime: lifetime,
        size,
        startColor: cfg.startColor,
        endColor: cfg.endColor,
        emitterId: -1, // No emitter, use default gravity
      });
    }
  }

  cleanup(): void {
    this.particles = [];
  }
}
