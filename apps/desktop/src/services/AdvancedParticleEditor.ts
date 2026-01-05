/**
 * Advanced Particle Editor - Professional particle system with curves, forces, and modules
 */

export interface CurvePoint {
  time: number; // 0-1
  value: number;
  inTangent?: number;
  outTangent?: number;
}

export interface GradientStop {
  time: number; // 0-1
  color: [number, number, number, number]; // RGBA
}

export interface ParticleCurve {
  mode: 'constant' | 'curve' | 'random_between_curves' | 'random_between_constants';
  constantValue?: number;
  constantMin?: number;
  constantMax?: number;
  curve?: CurvePoint[];
  curveMin?: CurvePoint[];
  curveMax?: CurvePoint[];
  multiplier?: number;
}

export interface ParticleGradient {
  mode: 'constant' | 'gradient' | 'random_between_gradients';
  constantColor?: [number, number, number, number];
  gradient?: GradientStop[];
  gradientMin?: GradientStop[];
  gradientMax?: GradientStop[];
}

export interface EmitterShape {
  type: 'point' | 'sphere' | 'hemisphere' | 'cone' | 'box' | 'circle' | 'edge' | 'mesh';
  radius?: number;
  radiusThickness?: number;
  angle?: number;
  arc?: number;
  arcMode?: 'random' | 'loop' | 'ping-pong';
  arcSpread?: number;
  length?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  emitFrom?: 'volume' | 'surface' | 'edge';
  alignToDirection?: boolean;
  randomizeDirection?: number;
  sphericalDirectionAmount?: number;
}

export interface ForceField {
  id: string;
  type: 'directional' | 'radial' | 'vortex' | 'turbulence' | 'drag';
  enabled: boolean;
  strength: ParticleCurve;
  position?: [number, number, number];
  direction?: [number, number, number];
  radius?: number;
  falloff?: 'none' | 'linear' | 'squared';
  frequency?: number; // For turbulence
  octaves?: number; // For turbulence
}

export interface CollisionModule {
  enabled: boolean;
  type: 'world' | 'planes';
  mode: '2d' | '3d';
  dampen: number;
  bounce: number;
  lifetimeLoss: number;
  minKillSpeed: number;
  maxKillSpeed: number;
  radiusScale: number;
  planes?: Array<{
    position: [number, number, number];
    normal: [number, number, number];
  }>;
  sendCollisionMessages?: boolean;
  particleRadius?: number;
}

export interface SubEmitter {
  id: string;
  triggerEvent: 'birth' | 'death' | 'collision';
  emitter: string; // Reference to another particle system
  probability: number;
  inherit: {
    velocity: boolean;
    color: boolean;
    size: boolean;
    rotation: boolean;
    lifetime: boolean;
  };
}

export interface TextureSheetAnimation {
  enabled: boolean;
  mode: 'grid' | 'sprites';
  tiles: { x: number; y: number };
  animation: 'whole_sheet' | 'single_row';
  frame: ParticleCurve;
  startFrame: ParticleCurve;
  cycleCount?: number;
  rowIndex?: number;
  speedRange?: [number, number];
  fps?: number;
}

export interface TrailModule {
  enabled: boolean;
  ratio: number;
  lifetime: ParticleCurve;
  minimumVertexDistance: number;
  worldSpace: boolean;
  dieWithParticle: boolean;
  textureMode: 'stretch' | 'tile' | 'per_segment';
  sizeAffectsWidth: boolean;
  sizeAffectsLifetime: boolean;
  inheritParticleColor: boolean;
  colorOverLifetime: ParticleGradient;
  widthOverTrail: ParticleCurve;
  colorOverTrail: ParticleGradient;
  generateLightingData: boolean;
  shadowBias: number;
}

export interface NoiseModule {
  enabled: boolean;
  strength: ParticleCurve;
  frequency: number;
  scrollSpeed: ParticleCurve;
  damping: boolean;
  octaveCount: number;
  octaveMultiplier: number;
  octaveScale: number;
  quality: 'low' | 'medium' | 'high';
  separateAxes: boolean;
  strengthX?: ParticleCurve;
  strengthY?: ParticleCurve;
  strengthZ?: ParticleCurve;
  remap: ParticleCurve;
  remapEnabled: boolean;
  positionAmount: ParticleCurve;
  rotationAmount: ParticleCurve;
  sizeAmount: ParticleCurve;
}

export interface LightsModule {
  enabled: boolean;
  ratio: number;
  useRandomDistribution: boolean;
  useParticleColor: boolean;
  sizeAffectsRange: boolean;
  alphaAffectsIntensity: boolean;
  range: ParticleCurve;
  rangeMultiplier: number;
  intensity: ParticleCurve;
  intensityMultiplier: number;
  maxLights: number;
}

export interface AdvancedParticleSystem {
  id: string;
  name: string;
  // Main module
  duration: number;
  looping: boolean;
  prewarm: boolean;
  startDelay: ParticleCurve;
  startLifetime: ParticleCurve;
  startSpeed: ParticleCurve;
  startSize: ParticleCurve;
  startSize3D?: {
    enabled: boolean;
    x: ParticleCurve;
    y: ParticleCurve;
    z: ParticleCurve;
  };
  startRotation: ParticleCurve;
  startRotation3D?: {
    enabled: boolean;
    x: ParticleCurve;
    y: ParticleCurve;
    z: ParticleCurve;
  };
  startColor: ParticleGradient;
  gravityModifier: ParticleCurve;
  simulationSpace: 'local' | 'world' | 'custom';
  simulationSpeed: number;
  deltaTime: 'scaled' | 'unscaled';
  scalingMode: 'hierarchy' | 'local' | 'shape';
  playOnAwake: boolean;
  maxParticles: number;
  // Emission module
  emission: {
    enabled: boolean;
    rateOverTime: ParticleCurve;
    rateOverDistance: ParticleCurve;
    bursts: Array<{
      time: number;
      count: ParticleCurve;
      cycles: number;
      interval: number;
      probability: number;
    }>;
  };
  // Shape module
  shape: EmitterShape;
  // Velocity over lifetime
  velocityOverLifetime: {
    enabled: boolean;
    linear: { x: ParticleCurve; y: ParticleCurve; z: ParticleCurve };
    space: 'local' | 'world';
    orbital: { x: ParticleCurve; y: ParticleCurve; z: ParticleCurve };
    offset: { x: ParticleCurve; y: ParticleCurve; z: ParticleCurve };
    radial: ParticleCurve;
    speedModifier: ParticleCurve;
  };
  // Limit velocity over lifetime
  limitVelocityOverLifetime: {
    enabled: boolean;
    speed: ParticleCurve;
    dampen: number;
    separateAxes: boolean;
    space: 'local' | 'world';
    drag?: ParticleCurve;
    multiplyDragByParticleSize?: boolean;
    multiplyDragByParticleVelocity?: boolean;
  };
  // Inherit velocity
  inheritVelocity: {
    enabled: boolean;
    mode: 'initial' | 'current';
    multiplier: ParticleCurve;
  };
  // Force over lifetime
  forceOverLifetime: {
    enabled: boolean;
    x: ParticleCurve;
    y: ParticleCurve;
    z: ParticleCurve;
    space: 'local' | 'world';
    randomize: boolean;
  };
  // Color over lifetime
  colorOverLifetime: {
    enabled: boolean;
    color: ParticleGradient;
  };
  // Size over lifetime
  sizeOverLifetime: {
    enabled: boolean;
    size: ParticleCurve;
    separateAxes: boolean;
    x?: ParticleCurve;
    y?: ParticleCurve;
    z?: ParticleCurve;
  };
  // Rotation over lifetime
  rotationOverLifetime: {
    enabled: boolean;
    angularVelocity: ParticleCurve;
    separateAxes: boolean;
    x?: ParticleCurve;
    y?: ParticleCurve;
    z?: ParticleCurve;
  };
  // External forces
  externalForces: {
    enabled: boolean;
    multiplier: number;
    influenceFilter: 'layer' | 'list';
    influenceMask?: number;
    forceFields: ForceField[];
  };
  // Modules
  noise: NoiseModule;
  collision: CollisionModule;
  trails: TrailModule;
  textureSheetAnimation: TextureSheetAnimation;
  lights: LightsModule;
  subEmitters: SubEmitter[];
  // Renderer
  renderer: {
    renderMode: 'billboard' | 'stretched_billboard' | 'horizontal_billboard' | 'vertical_billboard' | 'mesh';
    material?: string;
    sortMode: 'none' | 'by_distance' | 'oldest_first' | 'youngest_first';
    sortingFudge: number;
    minParticleSize: number;
    maxParticleSize: number;
    cameraScale?: number;
    velocityScale?: number;
    lengthScale?: number;
    mesh?: string;
    normalDirection?: number;
    shadowCastingMode?: 'off' | 'on' | 'two_sided' | 'shadows_only';
    receiveShadows?: boolean;
    pivot?: [number, number, number];
    flip?: [number, number, number];
    allowRoll?: boolean;
  };
}

export interface ParticlePreset {
  id: string;
  name: string;
  category: 'fire' | 'water' | 'smoke' | 'magic' | 'weather' | 'explosion' | 'nature' | 'sci-fi' | 'custom';
  description?: string;
  system: Partial<AdvancedParticleSystem>;
  thumbnail?: string;
}

// Helper to create a constant curve
const constant = (value: number): ParticleCurve => ({
  mode: 'constant',
  constantValue: value,
});

// Helper to create a random between constants
const randomBetween = (min: number, max: number): ParticleCurve => ({
  mode: 'random_between_constants',
  constantMin: min,
  constantMax: max,
});

// Helper to create a linear curve
const linearCurve = (start: number, end: number): ParticleCurve => ({
  mode: 'curve',
  curve: [
    { time: 0, value: start },
    { time: 1, value: end },
  ],
});

// Helper for constant color
const constantColor = (r: number, g: number, b: number, a: number = 1): ParticleGradient => ({
  mode: 'constant',
  constantColor: [r, g, b, a],
});

// Default particle presets
const particlePresets: ParticlePreset[] = [
  {
    id: 'fire-torch',
    name: 'Torch Fire',
    category: 'fire',
    description: 'Flickering torch flame',
    system: {
      name: 'Torch Fire',
      duration: 1,
      looping: true,
      startLifetime: randomBetween(0.5, 1.0),
      startSpeed: randomBetween(1, 2),
      startSize: randomBetween(0.2, 0.5),
      startColor: { mode: 'constant', constantColor: [1, 0.5, 0.1, 1] },
      gravityModifier: constant(-0.5),
      maxParticles: 100,
      emission: {
        enabled: true,
        rateOverTime: constant(30),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: { type: 'cone', angle: 15, radius: 0.1 },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [1, 0.8, 0.2, 1] },
            { time: 0.5, color: [1, 0.3, 0.0, 0.8] },
            { time: 1, color: [0.5, 0.1, 0.0, 0] },
          ],
        },
      },
      sizeOverLifetime: { enabled: true, size: linearCurve(1, 0), separateAxes: false },
    },
  },
  {
    id: 'fire-explosion',
    name: 'Explosion',
    category: 'explosion',
    description: 'Fiery explosion burst',
    system: {
      name: 'Explosion',
      duration: 0.5,
      looping: false,
      startLifetime: randomBetween(0.3, 0.8),
      startSpeed: randomBetween(5, 10),
      startSize: randomBetween(0.5, 1.5),
      startColor: { mode: 'constant', constantColor: [1, 0.6, 0.0, 1] },
      gravityModifier: constant(0.5),
      maxParticles: 200,
      emission: {
        enabled: true,
        rateOverTime: constant(0),
        rateOverDistance: constant(0),
        bursts: [{ time: 0, count: constant(100), cycles: 1, interval: 0, probability: 1 }],
      },
      shape: { type: 'sphere', radius: 0.5 },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [1, 1, 0.5, 1] },
            { time: 0.3, color: [1, 0.5, 0.0, 1] },
            { time: 0.7, color: [0.5, 0.1, 0.0, 0.5] },
            { time: 1, color: [0.2, 0.05, 0.0, 0] },
          ],
        },
      },
      sizeOverLifetime: {
        enabled: true,
        size: {
          mode: 'curve',
          curve: [
            { time: 0, value: 0.5 },
            { time: 0.2, value: 1 },
            { time: 1, value: 0 },
          ],
        },
        separateAxes: false,
      },
    },
  },
  {
    id: 'smoke-puff',
    name: 'Smoke Puff',
    category: 'smoke',
    description: 'Soft smoke puff',
    system: {
      name: 'Smoke Puff',
      duration: 2,
      looping: true,
      startLifetime: randomBetween(2, 4),
      startSpeed: randomBetween(0.5, 1),
      startSize: randomBetween(0.3, 0.6),
      startColor: { mode: 'constant', constantColor: [0.5, 0.5, 0.5, 0.3] },
      gravityModifier: constant(-0.1),
      maxParticles: 50,
      emission: {
        enabled: true,
        rateOverTime: constant(10),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: { type: 'cone', angle: 30, radius: 0.2 },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [0.6, 0.6, 0.6, 0] },
            { time: 0.2, color: [0.5, 0.5, 0.5, 0.3] },
            { time: 0.8, color: [0.4, 0.4, 0.4, 0.2] },
            { time: 1, color: [0.3, 0.3, 0.3, 0] },
          ],
        },
      },
      sizeOverLifetime: { enabled: true, size: linearCurve(1, 2), separateAxes: false },
      noise: {
        enabled: true,
        strength: constant(0.5),
        frequency: 0.5,
        scrollSpeed: constant(0.5),
        damping: false,
        octaveCount: 2,
        octaveMultiplier: 0.5,
        octaveScale: 2,
        quality: 'medium',
        separateAxes: false,
        remap: constant(0),
        remapEnabled: false,
        positionAmount: constant(1),
        rotationAmount: constant(0),
        sizeAmount: constant(0),
      },
    },
  },
  {
    id: 'rain',
    name: 'Rain',
    category: 'weather',
    description: 'Falling raindrops',
    system: {
      name: 'Rain',
      duration: 1,
      looping: true,
      startLifetime: constant(1),
      startSpeed: constant(20),
      startSize: { mode: 'random_between_constants', constantMin: 0.02, constantMax: 0.05 },
      startColor: { mode: 'constant', constantColor: [0.7, 0.8, 1, 0.6] },
      gravityModifier: constant(0),
      maxParticles: 1000,
      emission: {
        enabled: true,
        rateOverTime: constant(500),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: {
        type: 'box',
        scale: [20, 0.1, 20],
        position: [0, 10, 0],
        emitFrom: 'volume',
      },
      renderer: {
        renderMode: 'stretched_billboard',
        velocityScale: 0.1,
        lengthScale: 3,
        sortMode: 'none',
        sortingFudge: 0,
        minParticleSize: 0,
        maxParticleSize: 1,
      },
    },
  },
  {
    id: 'snow',
    name: 'Snow',
    category: 'weather',
    description: 'Gentle snowfall',
    system: {
      name: 'Snow',
      duration: 1,
      looping: true,
      startLifetime: randomBetween(5, 8),
      startSpeed: randomBetween(0.5, 1.5),
      startSize: randomBetween(0.05, 0.15),
      startRotation: randomBetween(0, 360),
      startColor: { mode: 'constant', constantColor: [1, 1, 1, 0.9] },
      gravityModifier: constant(0.02),
      maxParticles: 500,
      emission: {
        enabled: true,
        rateOverTime: constant(100),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: {
        type: 'box',
        scale: [15, 0.1, 15],
        position: [0, 8, 0],
        emitFrom: 'volume',
      },
      rotationOverLifetime: {
        enabled: true,
        angularVelocity: randomBetween(-45, 45),
        separateAxes: false,
      },
      noise: {
        enabled: true,
        strength: constant(0.3),
        frequency: 0.3,
        scrollSpeed: constant(0.2),
        damping: false,
        octaveCount: 1,
        octaveMultiplier: 0.5,
        octaveScale: 2,
        quality: 'low',
        separateAxes: true,
        strengthX: constant(0.3),
        strengthY: constant(0.1),
        strengthZ: constant(0.3),
        remap: constant(0),
        remapEnabled: false,
        positionAmount: constant(1),
        rotationAmount: constant(0),
        sizeAmount: constant(0),
      },
    },
  },
  {
    id: 'magic-sparkle',
    name: 'Magic Sparkles',
    category: 'magic',
    description: 'Shimmering magical particles',
    system: {
      name: 'Magic Sparkles',
      duration: 1,
      looping: true,
      startLifetime: randomBetween(0.5, 1.5),
      startSpeed: randomBetween(0.5, 2),
      startSize: randomBetween(0.05, 0.15),
      startColor: { mode: 'constant', constantColor: [0.5, 0.8, 1, 1] },
      gravityModifier: constant(-0.2),
      maxParticles: 200,
      emission: {
        enabled: true,
        rateOverTime: constant(50),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: { type: 'sphere', radius: 0.5, radiusThickness: 1 },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [0.8, 0.9, 1, 0] },
            { time: 0.2, color: [0.5, 0.8, 1, 1] },
            { time: 0.5, color: [0.8, 0.5, 1, 1] },
            { time: 0.8, color: [1, 0.8, 0.5, 0.5] },
            { time: 1, color: [1, 1, 1, 0] },
          ],
        },
      },
      sizeOverLifetime: {
        enabled: true,
        size: {
          mode: 'curve',
          curve: [
            { time: 0, value: 0 },
            { time: 0.1, value: 1 },
            { time: 0.5, value: 0.8 },
            { time: 1, value: 0 },
          ],
        },
        separateAxes: false,
      },
    },
  },
  {
    id: 'water-splash',
    name: 'Water Splash',
    category: 'water',
    description: 'Water droplet splash',
    system: {
      name: 'Water Splash',
      duration: 0.5,
      looping: false,
      startLifetime: randomBetween(0.3, 0.6),
      startSpeed: randomBetween(3, 6),
      startSize: randomBetween(0.05, 0.15),
      startColor: { mode: 'constant', constantColor: [0.7, 0.85, 1, 0.7] },
      gravityModifier: constant(2),
      maxParticles: 100,
      emission: {
        enabled: true,
        rateOverTime: constant(0),
        rateOverDistance: constant(0),
        bursts: [{ time: 0, count: constant(50), cycles: 1, interval: 0, probability: 1 }],
      },
      shape: { type: 'hemisphere', radius: 0.3, arc: 180 },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [0.8, 0.9, 1, 0.8] },
            { time: 0.5, color: [0.7, 0.85, 1, 0.6] },
            { time: 1, color: [0.6, 0.8, 1, 0] },
          ],
        },
      },
      sizeOverLifetime: { enabled: true, size: linearCurve(1, 0.5), separateAxes: false },
    },
  },
  {
    id: 'leaves-falling',
    name: 'Falling Leaves',
    category: 'nature',
    description: 'Autumn leaves gently falling',
    system: {
      name: 'Falling Leaves',
      duration: 1,
      looping: true,
      startLifetime: randomBetween(3, 6),
      startSpeed: randomBetween(0.2, 0.5),
      startSize: randomBetween(0.1, 0.25),
      startRotation: randomBetween(0, 360),
      startColor: {
        mode: 'random_between_gradients',
        gradientMin: [{ time: 0, color: [0.9, 0.6, 0.1, 1] }],
        gradientMax: [{ time: 0, color: [0.8, 0.3, 0.0, 1] }],
      },
      gravityModifier: constant(0.05),
      maxParticles: 100,
      emission: {
        enabled: true,
        rateOverTime: constant(15),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: {
        type: 'box',
        scale: [10, 0.1, 10],
        position: [0, 5, 0],
        emitFrom: 'volume',
      },
      rotationOverLifetime: {
        enabled: true,
        angularVelocity: randomBetween(-90, 90),
        separateAxes: false,
      },
      noise: {
        enabled: true,
        strength: constant(0.5),
        frequency: 0.3,
        scrollSpeed: constant(0.3),
        damping: false,
        octaveCount: 2,
        octaveMultiplier: 0.5,
        octaveScale: 2,
        quality: 'medium',
        separateAxes: true,
        strengthX: constant(0.6),
        strengthY: constant(0.2),
        strengthZ: constant(0.6),
        remap: constant(0),
        remapEnabled: false,
        positionAmount: constant(1),
        rotationAmount: constant(0.5),
        sizeAmount: constant(0),
      },
    },
  },
  {
    id: 'portal',
    name: 'Portal',
    category: 'sci-fi',
    description: 'Swirling portal effect',
    system: {
      name: 'Portal',
      duration: 1,
      looping: true,
      startLifetime: constant(1),
      startSpeed: constant(0),
      startSize: randomBetween(0.1, 0.2),
      startColor: { mode: 'constant', constantColor: [0.3, 0.6, 1, 1] },
      gravityModifier: constant(0),
      maxParticles: 300,
      emission: {
        enabled: true,
        rateOverTime: constant(100),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: { type: 'circle', radius: 2, radiusThickness: 0.1, arc: 360 },
      velocityOverLifetime: {
        enabled: true,
        linear: { x: constant(0), y: constant(0), z: constant(0) },
        space: 'local',
        orbital: { x: constant(0), y: constant(0), z: constant(180) },
        offset: { x: constant(0), y: constant(0), z: constant(0) },
        radial: constant(-1),
        speedModifier: constant(1),
      },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [0.2, 0.4, 1, 0] },
            { time: 0.3, color: [0.3, 0.6, 1, 1] },
            { time: 0.7, color: [0.5, 0.3, 1, 1] },
            { time: 1, color: [0.8, 0.2, 1, 0] },
          ],
        },
      },
      sizeOverLifetime: { enabled: true, size: linearCurve(1, 0), separateAxes: false },
      trails: {
        enabled: true,
        ratio: 0.5,
        lifetime: constant(0.3),
        minimumVertexDistance: 0.05,
        worldSpace: false,
        dieWithParticle: true,
        textureMode: 'stretch',
        sizeAffectsWidth: true,
        sizeAffectsLifetime: false,
        inheritParticleColor: true,
        colorOverLifetime: constantColor(1, 1, 1, 1),
        widthOverTrail: linearCurve(1, 0),
        colorOverTrail: constantColor(1, 1, 1, 1),
        generateLightingData: false,
        shadowBias: 0,
      },
    },
  },
  {
    id: 'dust-motes',
    name: 'Dust Motes',
    category: 'nature',
    description: 'Floating dust particles',
    system: {
      name: 'Dust Motes',
      duration: 1,
      looping: true,
      startLifetime: randomBetween(5, 10),
      startSpeed: randomBetween(0.01, 0.05),
      startSize: randomBetween(0.01, 0.03),
      startColor: { mode: 'constant', constantColor: [1, 1, 0.9, 0.3] },
      gravityModifier: constant(0),
      maxParticles: 200,
      emission: {
        enabled: true,
        rateOverTime: constant(20),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: {
        type: 'box',
        scale: [5, 3, 5],
        emitFrom: 'volume',
      },
      noise: {
        enabled: true,
        strength: constant(0.1),
        frequency: 0.2,
        scrollSpeed: constant(0.1),
        damping: false,
        octaveCount: 1,
        octaveMultiplier: 0.5,
        octaveScale: 2,
        quality: 'low',
        separateAxes: false,
        remap: constant(0),
        remapEnabled: false,
        positionAmount: constant(1),
        rotationAmount: constant(0),
        sizeAmount: constant(0),
      },
      colorOverLifetime: {
        enabled: true,
        color: {
          mode: 'gradient',
          gradient: [
            { time: 0, color: [1, 1, 0.9, 0] },
            { time: 0.2, color: [1, 1, 0.9, 0.3] },
            { time: 0.8, color: [1, 1, 0.9, 0.3] },
            { time: 1, color: [1, 1, 0.9, 0] },
          ],
        },
      },
    },
  },
];

class AdvancedParticleEditorService {
  private systems: Map<string, AdvancedParticleSystem> = new Map();
  private presets: ParticlePreset[] = [...particlePresets];

  constructor() {
    // Initialize presets as systems
    this.presets.forEach((preset) => {
      const system = this.createSystemFromPreset(preset);
      this.systems.set(system.id, system);
    });
  }

  /**
   * Create default particle system
   */
  createDefaultSystem(name: string): AdvancedParticleSystem {
    const system: AdvancedParticleSystem = {
      id: `ps_${Date.now()}`,
      name,
      duration: 5,
      looping: true,
      prewarm: false,
      startDelay: constant(0),
      startLifetime: randomBetween(1, 2),
      startSpeed: randomBetween(1, 3),
      startSize: randomBetween(0.1, 0.3),
      startRotation: constant(0),
      startColor: constantColor(1, 1, 1, 1),
      gravityModifier: constant(0),
      simulationSpace: 'local',
      simulationSpeed: 1,
      deltaTime: 'scaled',
      scalingMode: 'local',
      playOnAwake: true,
      maxParticles: 1000,
      emission: {
        enabled: true,
        rateOverTime: constant(10),
        rateOverDistance: constant(0),
        bursts: [],
      },
      shape: {
        type: 'cone',
        angle: 25,
        radius: 0.5,
      },
      velocityOverLifetime: {
        enabled: false,
        linear: { x: constant(0), y: constant(0), z: constant(0) },
        space: 'local',
        orbital: { x: constant(0), y: constant(0), z: constant(0) },
        offset: { x: constant(0), y: constant(0), z: constant(0) },
        radial: constant(0),
        speedModifier: constant(1),
      },
      limitVelocityOverLifetime: {
        enabled: false,
        speed: constant(10),
        dampen: 0.1,
        separateAxes: false,
        space: 'local',
      },
      inheritVelocity: {
        enabled: false,
        mode: 'initial',
        multiplier: constant(0),
      },
      forceOverLifetime: {
        enabled: false,
        x: constant(0),
        y: constant(0),
        z: constant(0),
        space: 'local',
        randomize: false,
      },
      colorOverLifetime: {
        enabled: false,
        color: constantColor(1, 1, 1, 1),
      },
      sizeOverLifetime: {
        enabled: false,
        size: constant(1),
        separateAxes: false,
      },
      rotationOverLifetime: {
        enabled: false,
        angularVelocity: constant(0),
        separateAxes: false,
      },
      externalForces: {
        enabled: false,
        multiplier: 1,
        influenceFilter: 'layer',
        forceFields: [],
      },
      noise: {
        enabled: false,
        strength: constant(1),
        frequency: 0.5,
        scrollSpeed: constant(0),
        damping: false,
        octaveCount: 1,
        octaveMultiplier: 0.5,
        octaveScale: 2,
        quality: 'high',
        separateAxes: false,
        remap: constant(0),
        remapEnabled: false,
        positionAmount: constant(1),
        rotationAmount: constant(0),
        sizeAmount: constant(0),
      },
      collision: {
        enabled: false,
        type: 'world',
        mode: '3d',
        dampen: 0.2,
        bounce: 0.3,
        lifetimeLoss: 0,
        minKillSpeed: 0,
        maxKillSpeed: 10000,
        radiusScale: 1,
      },
      trails: {
        enabled: false,
        ratio: 1,
        lifetime: constant(1),
        minimumVertexDistance: 0.2,
        worldSpace: false,
        dieWithParticle: true,
        textureMode: 'stretch',
        sizeAffectsWidth: true,
        sizeAffectsLifetime: false,
        inheritParticleColor: true,
        colorOverLifetime: constantColor(1, 1, 1, 1),
        widthOverTrail: constant(1),
        colorOverTrail: constantColor(1, 1, 1, 1),
        generateLightingData: false,
        shadowBias: 0,
      },
      textureSheetAnimation: {
        enabled: false,
        mode: 'grid',
        tiles: { x: 1, y: 1 },
        animation: 'whole_sheet',
        frame: constant(0),
        startFrame: constant(0),
      },
      lights: {
        enabled: false,
        ratio: 0,
        useRandomDistribution: false,
        useParticleColor: true,
        sizeAffectsRange: true,
        alphaAffectsIntensity: true,
        range: constant(1),
        rangeMultiplier: 1,
        intensity: constant(1),
        intensityMultiplier: 1,
        maxLights: 20,
      },
      subEmitters: [],
      renderer: {
        renderMode: 'billboard',
        sortMode: 'none',
        sortingFudge: 0,
        minParticleSize: 0,
        maxParticleSize: 0.5,
      },
    };

    this.systems.set(system.id, system);
    return system;
  }

  /**
   * Create system from preset
   */
  createSystemFromPreset(preset: ParticlePreset): AdvancedParticleSystem {
    const base = this.createDefaultSystem(preset.name);
    const merged = this.deepMerge(base as unknown as Record<string, unknown>, preset.system as unknown as Record<string, unknown>);
    merged.id = `ps_${preset.id}_${Date.now()}`;
    this.systems.set(merged.id, merged);
    return merged;
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): AdvancedParticleSystem {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (target[key] || {}) as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result as unknown as AdvancedParticleSystem;
  }

  /**
   * Get system by ID
   */
  getSystem(id: string): AdvancedParticleSystem | undefined {
    return this.systems.get(id);
  }

  /**
   * Update system
   */
  updateSystem(
    id: string,
    updates: Partial<AdvancedParticleSystem>
  ): AdvancedParticleSystem | undefined {
    const system = this.systems.get(id);
    if (!system) return undefined;

    const updated = { ...system, ...updates };
    this.systems.set(id, updated);
    return updated;
  }

  /**
   * Delete system
   */
  deleteSystem(id: string): boolean {
    return this.systems.delete(id);
  }

  /**
   * Get all systems
   */
  getAllSystems(): AdvancedParticleSystem[] {
    return Array.from(this.systems.values());
  }

  /**
   * Get all presets
   */
  getPresets(): ParticlePreset[] {
    return [...this.presets];
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: ParticlePreset['category']): ParticlePreset[] {
    return this.presets.filter((p) => p.category === category);
  }

  /**
   * Add custom preset
   */
  addPreset(system: AdvancedParticleSystem, category: ParticlePreset['category']): ParticlePreset {
    const preset: ParticlePreset = {
      id: `preset_${Date.now()}`,
      name: system.name,
      category,
      system: { ...system },
    };
    this.presets.push(preset);
    return preset;
  }

  /**
   * Evaluate curve at time
   */
  evaluateCurve(curve: ParticleCurve, time: number): number {
    switch (curve.mode) {
      case 'constant':
        return curve.constantValue ?? 0;

      case 'random_between_constants':
        return (
          (curve.constantMin ?? 0) +
          Math.random() * ((curve.constantMax ?? 1) - (curve.constantMin ?? 0))
        );

      case 'curve':
        if (!curve.curve || curve.curve.length === 0) return 0;
        return this.interpolateCurve(curve.curve, time) * (curve.multiplier ?? 1);

      case 'random_between_curves':
        if (!curve.curveMin || !curve.curveMax) return 0;
        const min = this.interpolateCurve(curve.curveMin, time);
        const max = this.interpolateCurve(curve.curveMax, time);
        return (min + Math.random() * (max - min)) * (curve.multiplier ?? 1);

      default:
        return 0;
    }
  }

  private interpolateCurve(points: CurvePoint[], time: number): number {
    if (points.length === 0) return 0;
    if (points.length === 1) return points[0].value;

    // Clamp time
    if (time <= points[0].time) return points[0].value;
    if (time >= points[points.length - 1].time) return points[points.length - 1].value;

    // Find surrounding points
    let i = 0;
    while (i < points.length - 1 && points[i + 1].time < time) i++;

    const p0 = points[i];
    const p1 = points[i + 1];
    const t = (time - p0.time) / (p1.time - p0.time);

    // Hermite interpolation if tangents available
    if (p0.outTangent !== undefined && p1.inTangent !== undefined) {
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      return h00 * p0.value + h10 * p0.outTangent + h01 * p1.value + h11 * p1.inTangent;
    }

    // Linear interpolation
    return p0.value + (p1.value - p0.value) * t;
  }

  /**
   * Evaluate gradient at time
   */
  evaluateGradient(gradient: ParticleGradient, time: number): [number, number, number, number] {
    switch (gradient.mode) {
      case 'constant':
        return gradient.constantColor ?? [1, 1, 1, 1];

      case 'gradient':
        if (!gradient.gradient || gradient.gradient.length === 0) return [1, 1, 1, 1];
        return this.interpolateGradient(gradient.gradient, time);

      case 'random_between_gradients':
        if (!gradient.gradientMin || !gradient.gradientMax) return [1, 1, 1, 1];
        const min = this.interpolateGradient(gradient.gradientMin, time);
        const max = this.interpolateGradient(gradient.gradientMax, time);
        const t = Math.random();
        return [
          min[0] + (max[0] - min[0]) * t,
          min[1] + (max[1] - min[1]) * t,
          min[2] + (max[2] - min[2]) * t,
          min[3] + (max[3] - min[3]) * t,
        ];

      default:
        return [1, 1, 1, 1];
    }
  }

  private interpolateGradient(
    stops: GradientStop[],
    time: number
  ): [number, number, number, number] {
    if (stops.length === 0) return [1, 1, 1, 1];
    if (stops.length === 1) return stops[0].color;

    // Clamp time
    if (time <= stops[0].time) return stops[0].color;
    if (time >= stops[stops.length - 1].time) return stops[stops.length - 1].color;

    // Find surrounding stops
    let i = 0;
    while (i < stops.length - 1 && stops[i + 1].time < time) i++;

    const s0 = stops[i];
    const s1 = stops[i + 1];
    const t = (time - s0.time) / (s1.time - s0.time);

    return [
      s0.color[0] + (s1.color[0] - s0.color[0]) * t,
      s0.color[1] + (s1.color[1] - s0.color[1]) * t,
      s0.color[2] + (s1.color[2] - s0.color[2]) * t,
      s0.color[3] + (s1.color[3] - s0.color[3]) * t,
    ];
  }

  /**
   * Export system to JSON
   */
  exportSystem(id: string): string | null {
    const system = this.systems.get(id);
    if (!system) return null;
    return JSON.stringify(system, null, 2);
  }

  /**
   * Import system from JSON
   */
  importSystem(json: string): AdvancedParticleSystem | null {
    try {
      const system = JSON.parse(json) as AdvancedParticleSystem;
      system.id = `ps_imported_${Date.now()}`;
      this.systems.set(system.id, system);
      return system;
    } catch {
      return null;
    }
  }

  /**
   * Add force field
   */
  addForceField(systemId: string, field: Omit<ForceField, 'id'>): ForceField | undefined {
    const system = this.systems.get(systemId);
    if (!system) return undefined;

    const forceField: ForceField = {
      ...field,
      id: `ff_${Date.now()}`,
    };

    system.externalForces.forceFields.push(forceField);
    return forceField;
  }

  /**
   * Add emission burst
   */
  addBurst(
    systemId: string,
    time: number,
    count: number,
    cycles: number = 1,
    interval: number = 0
  ): boolean {
    const system = this.systems.get(systemId);
    if (!system) return false;

    system.emission.bursts.push({
      time,
      count: constant(count),
      cycles,
      interval,
      probability: 1,
    });

    return true;
  }

  /**
   * Add sub emitter
   */
  addSubEmitter(
    systemId: string,
    emitterId: string,
    trigger: SubEmitter['triggerEvent']
  ): SubEmitter | undefined {
    const system = this.systems.get(systemId);
    if (!system) return undefined;

    const subEmitter: SubEmitter = {
      id: `se_${Date.now()}`,
      triggerEvent: trigger,
      emitter: emitterId,
      probability: 1,
      inherit: {
        velocity: false,
        color: true,
        size: false,
        rotation: false,
        lifetime: false,
      },
    };

    system.subEmitters.push(subEmitter);
    return subEmitter;
  }
}

export const advancedParticleEditor = new AdvancedParticleEditorService();
