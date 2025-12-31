import { defineComponent, Types } from 'bitecs';

// Particle emitter component
export const ParticleEmitter = defineComponent({
  // Emission settings
  emitRate: Types.f32, // Particles per second
  maxParticles: Types.ui16,
  // Particle lifetime
  minLifetime: Types.f32,
  maxLifetime: Types.f32,
  // Particle size
  minSize: Types.f32,
  maxSize: Types.f32,
  // Particle speed
  minSpeed: Types.f32,
  maxSpeed: Types.f32,
  // Emission angle (in radians, 0 = right, PI/2 = up)
  minAngle: Types.f32,
  maxAngle: Types.f32,
  // Particle color (RGBA packed as u32)
  startColor: Types.ui32,
  endColor: Types.ui32,
  // Gravity effect on particles
  gravityX: Types.f32,
  gravityY: Types.f32,
  // Is emitting
  isEmitting: Types.ui8,
  // Burst mode (emit all at once)
  burstCount: Types.ui16,
  // Internal tracking
  timeSinceEmit: Types.f32,
  activeParticles: Types.ui16,
});

// Individual particle data (managed by system, not as entities for performance)
export const Particle = defineComponent({
  // Position
  x: Types.f32,
  y: Types.f32,
  // Velocity
  vx: Types.f32,
  vy: Types.f32,
  // Lifetime
  lifetime: Types.f32,
  maxLifetime: Types.f32,
  // Size
  size: Types.f32,
  // Color
  color: Types.ui32,
  // Parent emitter
  emitterId: Types.eid,
});
