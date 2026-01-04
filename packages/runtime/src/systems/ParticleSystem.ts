/**
 * 2D Particle System for visual effects
 * Supports various particle types: fire, smoke, sparkles, explosions, rain, snow
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  color: string;
  colorEnd: string;
  alpha: number;
  alphaEnd: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
}

export interface ParticleEmitterConfig {
  // Emission
  emissionRate: number; // particles per second
  maxParticles: number;
  burst?: number; // one-time burst count

  // Position
  x: number;
  y: number;
  offsetX?: number; // random offset range
  offsetY?: number;

  // Velocity
  speed: number;
  speedVariance: number;
  angle: number; // emission angle in degrees
  angleVariance: number; // spread

  // Lifetime
  lifetime: number;
  lifetimeVariance: number;

  // Size
  sizeStart: number;
  sizeEnd: number;
  sizeVariance: number;

  // Color (hex strings)
  colorStart: string;
  colorEnd: string;

  // Alpha
  alphaStart: number;
  alphaEnd: number;

  // Physics
  gravity: number;

  // Rotation
  rotationStart: number;
  rotationEnd: number;
  rotationVariance: number;

  // Blending
  blendMode: 'normal' | 'additive' | 'multiply';

  // Shape
  shape: 'circle' | 'square' | 'star' | 'spark';
}

// Preset configurations for common effects
export const PARTICLE_PRESETS: Record<string, Partial<ParticleEmitterConfig>> = {
  fire: {
    emissionRate: 50,
    maxParticles: 200,
    speed: 80,
    speedVariance: 20,
    angle: -90,
    angleVariance: 15,
    lifetime: 1,
    lifetimeVariance: 0.3,
    sizeStart: 20,
    sizeEnd: 5,
    sizeVariance: 5,
    colorStart: '#ff6600',
    colorEnd: '#ff0000',
    alphaStart: 1,
    alphaEnd: 0,
    gravity: -50,
    blendMode: 'additive',
    shape: 'circle',
  },
  smoke: {
    emissionRate: 20,
    maxParticles: 100,
    speed: 30,
    speedVariance: 10,
    angle: -90,
    angleVariance: 20,
    lifetime: 2,
    lifetimeVariance: 0.5,
    sizeStart: 15,
    sizeEnd: 40,
    sizeVariance: 5,
    colorStart: '#666666',
    colorEnd: '#333333',
    alphaStart: 0.6,
    alphaEnd: 0,
    gravity: -20,
    blendMode: 'normal',
    shape: 'circle',
  },
  sparkle: {
    emissionRate: 30,
    maxParticles: 100,
    speed: 100,
    speedVariance: 50,
    angle: 0,
    angleVariance: 180,
    lifetime: 0.8,
    lifetimeVariance: 0.3,
    sizeStart: 8,
    sizeEnd: 2,
    sizeVariance: 3,
    colorStart: '#ffff00',
    colorEnd: '#ffffff',
    alphaStart: 1,
    alphaEnd: 0,
    gravity: 0,
    blendMode: 'additive',
    shape: 'star',
  },
  explosion: {
    emissionRate: 0,
    burst: 50,
    maxParticles: 100,
    speed: 200,
    speedVariance: 100,
    angle: 0,
    angleVariance: 180,
    lifetime: 0.6,
    lifetimeVariance: 0.2,
    sizeStart: 15,
    sizeEnd: 5,
    sizeVariance: 5,
    colorStart: '#ff8800',
    colorEnd: '#ff0000',
    alphaStart: 1,
    alphaEnd: 0,
    gravity: 100,
    blendMode: 'additive',
    shape: 'circle',
  },
  rain: {
    emissionRate: 100,
    maxParticles: 500,
    offsetX: 400,
    speed: 400,
    speedVariance: 50,
    angle: 100,
    angleVariance: 5,
    lifetime: 1,
    lifetimeVariance: 0.2,
    sizeStart: 3,
    sizeEnd: 3,
    sizeVariance: 1,
    colorStart: '#88aaff',
    colorEnd: '#6688dd',
    alphaStart: 0.7,
    alphaEnd: 0.3,
    gravity: 200,
    blendMode: 'normal',
    shape: 'spark',
  },
  snow: {
    emissionRate: 30,
    maxParticles: 200,
    offsetX: 400,
    speed: 50,
    speedVariance: 20,
    angle: 100,
    angleVariance: 20,
    lifetime: 3,
    lifetimeVariance: 1,
    sizeStart: 6,
    sizeEnd: 4,
    sizeVariance: 2,
    colorStart: '#ffffff',
    colorEnd: '#ddddff',
    alphaStart: 0.9,
    alphaEnd: 0.3,
    gravity: 30,
    blendMode: 'normal',
    shape: 'circle',
  },
  confetti: {
    emissionRate: 0,
    burst: 100,
    maxParticles: 200,
    speed: 300,
    speedVariance: 100,
    angle: -90,
    angleVariance: 30,
    lifetime: 2,
    lifetimeVariance: 0.5,
    sizeStart: 10,
    sizeEnd: 8,
    sizeVariance: 3,
    colorStart: '#ff00ff',
    colorEnd: '#00ffff',
    alphaStart: 1,
    alphaEnd: 0.5,
    gravity: 200,
    rotationStart: 0,
    rotationEnd: 720,
    rotationVariance: 360,
    blendMode: 'normal',
    shape: 'square',
  },
  trail: {
    emissionRate: 60,
    maxParticles: 100,
    speed: 10,
    speedVariance: 5,
    angle: 180,
    angleVariance: 10,
    lifetime: 0.5,
    lifetimeVariance: 0.1,
    sizeStart: 12,
    sizeEnd: 2,
    sizeVariance: 2,
    colorStart: '#00ffff',
    colorEnd: '#0066ff',
    alphaStart: 0.8,
    alphaEnd: 0,
    gravity: 0,
    blendMode: 'additive',
    shape: 'circle',
  },
};

export class ParticleEmitter {
  private particles: Particle[] = [];
  private config: ParticleEmitterConfig;
  private emissionAccumulator = 0;
  private active = true;

  constructor(config: Partial<ParticleEmitterConfig>) {
    this.config = {
      emissionRate: 50,
      maxParticles: 200,
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
      speed: 100,
      speedVariance: 20,
      angle: -90,
      angleVariance: 15,
      lifetime: 1,
      lifetimeVariance: 0.2,
      sizeStart: 10,
      sizeEnd: 2,
      sizeVariance: 2,
      colorStart: '#ffffff',
      colorEnd: '#ffffff',
      alphaStart: 1,
      alphaEnd: 0,
      gravity: 0,
      rotationStart: 0,
      rotationEnd: 0,
      rotationVariance: 0,
      blendMode: 'normal',
      shape: 'circle',
      ...config,
    };

    // Handle initial burst
    if (this.config.burst) {
      this.burst(this.config.burst);
    }
  }

  setPosition(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  burst(count: number): void {
    for (let i = 0; i < count && this.particles.length < this.config.maxParticles; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const cfg = this.config;

    // Random angle within variance
    const angleRad = (cfg.angle + (Math.random() - 0.5) * 2 * cfg.angleVariance) * Math.PI / 180;
    const speed = cfg.speed + (Math.random() - 0.5) * 2 * cfg.speedVariance;

    // Random lifetime
    const lifetime = cfg.lifetime + (Math.random() - 0.5) * 2 * cfg.lifetimeVariance;

    // Random size
    const sizeVariance = (Math.random() - 0.5) * 2 * cfg.sizeVariance;

    // Random rotation
    const rotationVariance = (Math.random() - 0.5) * 2 * cfg.rotationVariance;

    const particle: Particle = {
      x: cfg.x + (Math.random() - 0.5) * 2 * (cfg.offsetX || 0),
      y: cfg.y + (Math.random() - 0.5) * 2 * (cfg.offsetY || 0),
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      life: lifetime,
      maxLife: lifetime,
      size: cfg.sizeStart + sizeVariance,
      sizeEnd: cfg.sizeEnd + sizeVariance * 0.5,
      color: cfg.colorStart,
      colorEnd: cfg.colorEnd,
      alpha: cfg.alphaStart,
      alphaEnd: cfg.alphaEnd,
      rotation: cfg.rotationStart + rotationVariance,
      rotationSpeed: ((cfg.rotationEnd - cfg.rotationStart) + rotationVariance) / lifetime,
      gravity: cfg.gravity,
    };

    this.particles.push(particle);
  }

  update(dt: number): void {
    // Emit new particles
    if (this.active && this.config.emissionRate > 0) {
      this.emissionAccumulator += dt * this.config.emissionRate;
      while (this.emissionAccumulator >= 1 && this.particles.length < this.config.maxParticles) {
        this.spawnParticle();
        this.emissionAccumulator -= 1;
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update physics
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cfg = this.config;

    ctx.save();

    // Set blend mode
    if (cfg.blendMode === 'additive') {
      ctx.globalCompositeOperation = 'lighter';
    } else if (cfg.blendMode === 'multiply') {
      ctx.globalCompositeOperation = 'multiply';
    }

    for (const p of this.particles) {
      const progress = 1 - p.life / p.maxLife;

      // Interpolate size
      const size = p.size + (p.sizeEnd - p.size) * progress;

      // Interpolate alpha
      const alpha = p.alpha + (p.alphaEnd - p.alpha) * progress;

      // Interpolate color
      const color = this.lerpColor(p.color, p.colorEnd, progress);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;

      // Draw shape
      switch (cfg.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'square':
          ctx.fillRect(-size / 2, -size / 2, size, size);
          break;

        case 'star':
          this.drawStar(ctx, 0, 0, 5, size / 2, size / 4);
          break;

        case 'spark':
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(0, size);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  isActive(): boolean {
    return this.active;
  }

  clear(): void {
    this.particles = [];
  }
}

/**
 * Particle System Manager - manages multiple emitters
 */
export class ParticleSystemManager {
  private emitters: Map<string, ParticleEmitter> = new Map();

  createEmitter(id: string, config: Partial<ParticleEmitterConfig>): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.set(id, emitter);
    return emitter;
  }

  createFromPreset(id: string, presetName: keyof typeof PARTICLE_PRESETS, overrides?: Partial<ParticleEmitterConfig>): ParticleEmitter {
    const preset = PARTICLE_PRESETS[presetName] || {};
    return this.createEmitter(id, { ...preset, ...overrides });
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  removeEmitter(id: string): boolean {
    return this.emitters.delete(id);
  }

  update(dt: number): void {
    for (const emitter of this.emitters.values()) {
      emitter.update(dt);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const emitter of this.emitters.values()) {
      emitter.render(ctx);
    }
  }

  clear(): void {
    this.emitters.clear();
  }

  getTotalParticleCount(): number {
    let total = 0;
    for (const emitter of this.emitters.values()) {
      total += emitter.getParticleCount();
    }
    return total;
  }
}
