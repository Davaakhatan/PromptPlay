/**
 * WebGPU Particle System - GPU-accelerated particle simulation
 * Uses compute shaders for massively parallel particle updates
 */

import { webGPURenderer } from './WebGPURenderer';

export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number, number];
  life: number;
  size: number;
}

export interface ParticleEmitterConfig {
  maxParticles: number;
  emitRate: number; // particles per second
  lifetime: [number, number]; // min, max
  startSize: [number, number]; // min, max
  endSize: [number, number]; // min, max
  startColor: [number, number, number, number];
  endColor: [number, number, number, number];
  startVelocity: [number, number, number];
  velocityVariance: [number, number, number];
  gravity: [number, number, number];
  position: [number, number, number];
  positionVariance: [number, number, number];
}

export interface ParticleSystemStats {
  activeParticles: number;
  maxParticles: number;
  gpuTime: number;
  usingWebGPU: boolean;
}

// Particle compute shader (WGSL)
const PARTICLE_UPDATE_SHADER = `
struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  color: vec4<f32>,
  life: f32,
  maxLife: f32,
  size: f32,
  startSize: f32,
  endSize: f32,
};

struct EmitterParams {
  deltaTime: f32,
  gravity: vec3<f32>,
  emitterPos: vec3<f32>,
  positionVariance: vec3<f32>,
  startVelocity: vec3<f32>,
  velocityVariance: vec3<f32>,
  startColor: vec4<f32>,
  endColor: vec4<f32>,
  lifetimeMin: f32,
  lifetimeMax: f32,
  startSizeMin: f32,
  startSizeMax: f32,
  endSizeMin: f32,
  endSizeMax: f32,
  emitCount: u32,
  randomSeed: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: EmitterParams;
@group(0) @binding(2) var<storage, read_write> counters: array<atomic<u32>>;

// Simple hash function for pseudo-random numbers
fn hash(seed: u32) -> f32 {
  var x = seed;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return f32(x) / 4294967295.0;
}

fn random3(seed: u32) -> vec3<f32> {
  return vec3<f32>(
    hash(seed),
    hash(seed + 1u),
    hash(seed + 2u)
  ) * 2.0 - 1.0;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&particles)) { return; }

  var p = particles[idx];
  let dt = params.deltaTime;

  // Update living particles
  if (p.life > 0.0) {
    // Apply gravity and update velocity
    p.velocity = p.velocity + params.gravity * dt;

    // Update position
    p.position = p.position + p.velocity * dt;

    // Decrease life
    p.life = p.life - dt;

    // Interpolate color and size based on life
    let t = 1.0 - (p.life / p.maxLife);
    p.color = mix(params.startColor, params.endColor, t);
    p.size = mix(p.startSize, p.endSize, t);

    // Count active particles
    if (p.life > 0.0) {
      atomicAdd(&counters[0], 1u);
    }
  }
  // Respawn dead particles if we need to emit
  else if (idx < params.emitCount) {
    let seed = u32(params.randomSeed * 1000.0) + idx * 7u;
    let rand = random3(seed);

    // Random position within variance
    p.position = params.emitterPos + params.positionVariance * rand;

    // Random velocity within variance
    let randVel = random3(seed + 100u);
    p.velocity = params.startVelocity + params.velocityVariance * randVel;

    // Random lifetime
    let lifeRand = hash(seed + 200u);
    p.maxLife = mix(params.lifetimeMin, params.lifetimeMax, lifeRand);
    p.life = p.maxLife;

    // Random size
    let sizeRand = hash(seed + 300u);
    p.startSize = mix(params.startSizeMin, params.startSizeMax, sizeRand);
    p.endSize = mix(params.endSizeMin, params.endSizeMax, sizeRand);
    p.size = p.startSize;

    // Start color
    p.color = params.startColor;

    atomicAdd(&counters[0], 1u);
  }

  particles[idx] = p;
}
`;

// Fallback CPU particle update
function updateParticlesCPU(
  particles: Float32Array,
  config: ParticleEmitterConfig,
  deltaTime: number,
  emitCount: number
): number {
  const PARTICLE_STRIDE = 16; // floats per particle
  const particleCount = particles.length / PARTICLE_STRIDE;
  let activeCount = 0;

  for (let i = 0; i < particleCount; i++) {
    const offset = i * PARTICLE_STRIDE;
    let life = particles[offset + 12];

    if (life > 0) {
      // Update velocity with gravity
      particles[offset + 3] += config.gravity[0] * deltaTime;
      particles[offset + 4] += config.gravity[1] * deltaTime;
      particles[offset + 5] += config.gravity[2] * deltaTime;

      // Update position
      particles[offset + 0] += particles[offset + 3] * deltaTime;
      particles[offset + 1] += particles[offset + 4] * deltaTime;
      particles[offset + 2] += particles[offset + 5] * deltaTime;

      // Decrease life
      particles[offset + 12] -= deltaTime;

      if (particles[offset + 12] > 0) {
        activeCount++;
      }
    } else if (emitCount > 0) {
      // Respawn particle
      const rx = (Math.random() * 2 - 1) * config.positionVariance[0];
      const ry = (Math.random() * 2 - 1) * config.positionVariance[1];
      const rz = (Math.random() * 2 - 1) * config.positionVariance[2];

      particles[offset + 0] = config.position[0] + rx;
      particles[offset + 1] = config.position[1] + ry;
      particles[offset + 2] = config.position[2] + rz;

      const vx = (Math.random() * 2 - 1) * config.velocityVariance[0];
      const vy = (Math.random() * 2 - 1) * config.velocityVariance[1];
      const vz = (Math.random() * 2 - 1) * config.velocityVariance[2];

      particles[offset + 3] = config.startVelocity[0] + vx;
      particles[offset + 4] = config.startVelocity[1] + vy;
      particles[offset + 5] = config.startVelocity[2] + vz;

      // Color
      particles[offset + 6] = config.startColor[0];
      particles[offset + 7] = config.startColor[1];
      particles[offset + 8] = config.startColor[2];
      particles[offset + 9] = config.startColor[3];

      // Life
      const lifetime = config.lifetime[0] + Math.random() * (config.lifetime[1] - config.lifetime[0]);
      particles[offset + 12] = lifetime;
      particles[offset + 13] = lifetime; // maxLife

      // Size
      particles[offset + 14] = config.startSize[0] + Math.random() * (config.startSize[1] - config.startSize[0]);
      particles[offset + 15] = config.endSize[0] + Math.random() * (config.endSize[1] - config.endSize[0]);

      emitCount--;
      activeCount++;
    }
  }

  return activeCount;
}

export class WebGPUParticleSystem {
  private config: ParticleEmitterConfig;
  private particleData: Float32Array;
  private particleBufferId: string;
  private paramsBufferId: string;
  private counterBufferId: string;
  private computeShaderId: string;
  private usingWebGPU = false;
  private activeParticles = 0;
  private emitAccumulator = 0;
  private lastGPUTime = 0;
  private initialized = false;

  constructor(config: ParticleEmitterConfig) {
    this.config = config;
    this.particleBufferId = `particles_${Date.now()}`;
    this.paramsBufferId = `params_${Date.now()}`;
    this.counterBufferId = `counter_${Date.now()}`;
    this.computeShaderId = `particle_update_${Date.now()}`;

    // Initialize particle data (16 floats per particle)
    // [px, py, pz, vx, vy, vz, r, g, b, a, life, maxLife, size, startSize, endSize, padding]
    const PARTICLE_STRIDE = 16;
    this.particleData = new Float32Array(config.maxParticles * PARTICLE_STRIDE);
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return this.usingWebGPU;

    // Try to use WebGPU
    if (webGPURenderer.initialized && webGPURenderer.device) {
      try {
        const device = webGPURenderer.device;

        // Create particle buffer
        const particleBuffer = webGPURenderer.createGPUBuffer(
          this.particleBufferId,
          this.particleData.byteLength,
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        );

        if (!particleBuffer) throw new Error('Failed to create particle buffer');

        // Create params buffer (uniform)
        const paramsSize = 128; // Enough for EmitterParams struct
        webGPURenderer.createGPUBuffer(
          this.paramsBufferId,
          paramsSize,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        );

        // Create counter buffer
        webGPURenderer.createGPUBuffer(
          this.counterBufferId,
          4, // Single u32 counter
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        );

        // Create compute shader
        webGPURenderer.createComputeShader({
          id: this.computeShaderId,
          code: PARTICLE_UPDATE_SHADER,
          workgroupSize: [256, 1, 1],
          bindings: [
            { binding: 0, type: 'buffer' },
            { binding: 1, type: 'buffer' },
            { binding: 2, type: 'buffer' },
          ],
        });

        this.usingWebGPU = true;
        console.log('[ParticleSystem] Using WebGPU compute shaders');
      } catch (error) {
        console.warn('[ParticleSystem] WebGPU setup failed, using CPU fallback:', error);
        this.usingWebGPU = false;
      }
    } else {
      console.log('[ParticleSystem] WebGPU not available, using CPU fallback');
      this.usingWebGPU = false;
    }

    this.initialized = true;
    return this.usingWebGPU;
  }

  async update(deltaTime: number): Promise<void> {
    // Calculate how many particles to emit this frame
    this.emitAccumulator += this.config.emitRate * deltaTime;
    const emitCount = Math.floor(this.emitAccumulator);
    this.emitAccumulator -= emitCount;

    if (this.usingWebGPU && webGPURenderer.device) {
      await this.updateGPU(deltaTime, emitCount);
    } else {
      this.updateCPU(deltaTime, emitCount);
    }
  }

  private async updateGPU(deltaTime: number, emitCount: number): Promise<void> {
    const startTime = performance.now();
    const device = webGPURenderer.device!;

    // Update params buffer
    const paramsData = new Float32Array([
      deltaTime,
      this.config.gravity[0], this.config.gravity[1], this.config.gravity[2],
      this.config.position[0], this.config.position[1], this.config.position[2], 0,
      this.config.positionVariance[0], this.config.positionVariance[1], this.config.positionVariance[2], 0,
      this.config.startVelocity[0], this.config.startVelocity[1], this.config.startVelocity[2], 0,
      this.config.velocityVariance[0], this.config.velocityVariance[1], this.config.velocityVariance[2], 0,
      ...this.config.startColor,
      ...this.config.endColor,
      this.config.lifetime[0], this.config.lifetime[1],
      this.config.startSize[0], this.config.startSize[1],
      this.config.endSize[0], this.config.endSize[1],
    ]);

    // Add emit count and random seed as u32
    const paramsWithMeta = new ArrayBuffer(paramsData.byteLength + 8);
    new Float32Array(paramsWithMeta, 0, paramsData.length).set(paramsData);
    new Uint32Array(paramsWithMeta, paramsData.byteLength, 1)[0] = emitCount;
    new Float32Array(paramsWithMeta, paramsData.byteLength + 4, 1)[0] = Math.random();

    webGPURenderer.writeBuffer(this.paramsBufferId, paramsWithMeta);

    // Reset counter
    webGPURenderer.writeBuffer(this.counterBufferId, new Uint32Array([0]));

    // Execute compute shader
    const particleBuffer = webGPURenderer.getGPUBuffer(this.particleBufferId)!;
    const paramsBuffer = webGPURenderer.getGPUBuffer(this.paramsBufferId)!;
    const counterBuffer = webGPURenderer.getGPUBuffer(this.counterBufferId)!;

    const workgroupCount = Math.ceil(this.config.maxParticles / 256);

    await webGPURenderer.executeComputeShader(
      this.computeShaderId,
      [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: paramsBuffer } },
        { binding: 2, resource: { buffer: counterBuffer } },
      ],
      workgroupCount
    );

    // Read back active particle count
    const counterData = await webGPURenderer.readBuffer(this.counterBufferId, 4);
    if (counterData) {
      this.activeParticles = new Uint32Array(counterData)[0];
    }

    this.lastGPUTime = performance.now() - startTime;
  }

  private updateCPU(deltaTime: number, emitCount: number): void {
    const startTime = performance.now();
    this.activeParticles = updateParticlesCPU(this.particleData, this.config, deltaTime, emitCount);
    this.lastGPUTime = performance.now() - startTime;
  }

  // Get particle data for rendering
  async getParticleData(): Promise<Float32Array> {
    if (this.usingWebGPU && webGPURenderer.device) {
      const data = await webGPURenderer.readBuffer(this.particleBufferId, this.particleData.byteLength);
      if (data) {
        return new Float32Array(data);
      }
    }
    return this.particleData;
  }

  getStats(): ParticleSystemStats {
    return {
      activeParticles: this.activeParticles,
      maxParticles: this.config.maxParticles,
      gpuTime: this.lastGPUTime,
      usingWebGPU: this.usingWebGPU,
    };
  }

  updateConfig(config: Partial<ParticleEmitterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  dispose(): void {
    // GPU buffers will be cleaned up when WebGPURenderer is disposed
    this.particleData = new Float32Array(0);
    this.initialized = false;
  }
}

// Factory function to create common particle effects
export function createFireEmitter(position: [number, number, number]): ParticleEmitterConfig {
  return {
    maxParticles: 1000,
    emitRate: 100,
    lifetime: [0.5, 1.5],
    startSize: [0.1, 0.2],
    endSize: [0.3, 0.5],
    startColor: [1.0, 0.6, 0.1, 1.0],
    endColor: [1.0, 0.1, 0.0, 0.0],
    startVelocity: [0, 2, 0],
    velocityVariance: [0.5, 0.5, 0.5],
    gravity: [0, 1, 0], // Fire goes up
    position,
    positionVariance: [0.2, 0, 0.2],
  };
}

export function createSmokeEmitter(position: [number, number, number]): ParticleEmitterConfig {
  return {
    maxParticles: 500,
    emitRate: 30,
    lifetime: [2, 4],
    startSize: [0.2, 0.4],
    endSize: [1, 2],
    startColor: [0.5, 0.5, 0.5, 0.8],
    endColor: [0.3, 0.3, 0.3, 0.0],
    startVelocity: [0, 0.5, 0],
    velocityVariance: [0.3, 0.2, 0.3],
    gravity: [0, 0.1, 0],
    position,
    positionVariance: [0.3, 0, 0.3],
  };
}

export function createSparkEmitter(position: [number, number, number]): ParticleEmitterConfig {
  return {
    maxParticles: 200,
    emitRate: 50,
    lifetime: [0.2, 0.5],
    startSize: [0.02, 0.05],
    endSize: [0.01, 0.02],
    startColor: [1.0, 0.9, 0.5, 1.0],
    endColor: [1.0, 0.5, 0.0, 0.0],
    startVelocity: [0, 3, 0],
    velocityVariance: [2, 2, 2],
    gravity: [0, -10, 0],
    position,
    positionVariance: [0.1, 0, 0.1],
  };
}

export default WebGPUParticleSystem;
