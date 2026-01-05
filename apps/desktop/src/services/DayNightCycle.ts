/**
 * Day/Night Cycle System - Time-based lighting, sky, and ambient changes
 */

export interface TimeOfDay {
  hours: number; // 0-24
  minutes: number; // 0-60
}

export interface SunSettings {
  enabled: boolean;
  color: [number, number, number];
  intensity: number;
  shadowIntensity: number;
  shadowBias: number;
  shadowNormalBias: number;
  shadowResolution: number;
  angularDiameter: number; // Visual size of sun
}

export interface MoonSettings {
  enabled: boolean;
  color: [number, number, number];
  intensity: number;
  phase: number; // 0-1, 0=new moon, 0.5=full moon
  angularDiameter: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
}

export interface SkySettings {
  type: 'procedural' | 'gradient' | 'hdri';
  topColor: [number, number, number];
  horizonColor: [number, number, number];
  bottomColor: [number, number, number];
  sunSize: number;
  sunBloom: number;
  atmosphericScattering: number;
  rayleighCoefficient: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  exposure: number;
  hdriTexture?: string;
  hdriRotation?: number;
}

export interface StarSettings {
  enabled: boolean;
  density: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleAmount: number;
  milkyWayEnabled: boolean;
  milkyWayIntensity: number;
}

export interface AmbientSettings {
  skyColor: [number, number, number];
  equatorColor: [number, number, number];
  groundColor: [number, number, number];
  intensity: number;
  mode: 'flat' | 'trilight' | 'skybox';
}

export interface LightingState {
  sun: SunSettings;
  moon: MoonSettings;
  sky: SkySettings;
  stars: StarSettings;
  ambient: AmbientSettings;
  fogColor: [number, number, number];
  fogDensity: number;
}

export interface TimeKeyframe {
  time: TimeOfDay;
  lighting: Partial<LightingState>;
}

export interface DayNightPreset {
  id: string;
  name: string;
  description?: string;
  latitude: number; // Geographic latitude affects sun angle
  seasonOffset: number; // 0-1, affects day length
  keyframes: TimeKeyframe[];
}

// Color utilities
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
};

// Default keyframes for a typical day
const defaultKeyframes: TimeKeyframe[] = [
  {
    // Night (midnight)
    time: { hours: 0, minutes: 0 },
    lighting: {
      sun: { enabled: false, color: [0, 0, 0], intensity: 0, shadowIntensity: 0, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: true, color: [0.7, 0.75, 0.85], intensity: 0.1, phase: 0.5, angularDiameter: 0.52, shadowEnabled: true, shadowIntensity: 0.3 },
      sky: { type: 'procedural', topColor: [0.02, 0.02, 0.06], horizonColor: [0.05, 0.05, 0.1], bottomColor: [0.01, 0.01, 0.02], sunSize: 0, sunBloom: 0, atmosphericScattering: 0.1, rayleighCoefficient: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 1 },
      stars: { enabled: true, density: 1, brightness: 1, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: true, milkyWayIntensity: 0.5 },
      ambient: { skyColor: [0.02, 0.03, 0.06], equatorColor: [0.01, 0.02, 0.04], groundColor: [0.005, 0.005, 0.01], intensity: 0.1, mode: 'trilight' },
      fogColor: [0.02, 0.02, 0.05],
      fogDensity: 0.001,
    },
  },
  {
    // Dawn (6:00)
    time: { hours: 6, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [1, 0.6, 0.3], intensity: 0.3, shadowIntensity: 0.5, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: true, color: [0.5, 0.55, 0.65], intensity: 0.02, phase: 0.5, angularDiameter: 0.52, shadowEnabled: false, shadowIntensity: 0 },
      sky: { type: 'procedural', topColor: [0.2, 0.35, 0.6], horizonColor: [1, 0.6, 0.4], bottomColor: [0.8, 0.4, 0.3], sunSize: 0.04, sunBloom: 0.5, atmosphericScattering: 0.8, rayleighCoefficient: 2, mieCoefficient: 0.02, mieDirectionalG: 0.9, exposure: 1 },
      stars: { enabled: true, density: 0.3, brightness: 0.2, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: false, milkyWayIntensity: 0 },
      ambient: { skyColor: [0.4, 0.35, 0.45], equatorColor: [0.6, 0.4, 0.35], groundColor: [0.15, 0.1, 0.08], intensity: 0.4, mode: 'trilight' },
      fogColor: [0.7, 0.5, 0.4],
      fogDensity: 0.002,
    },
  },
  {
    // Morning (9:00)
    time: { hours: 9, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [1, 0.95, 0.85], intensity: 0.8, shadowIntensity: 0.8, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: false, color: [0.7, 0.75, 0.85], intensity: 0, phase: 0.5, angularDiameter: 0.52, shadowEnabled: false, shadowIntensity: 0 },
      sky: { type: 'procedural', topColor: [0.3, 0.5, 0.9], horizonColor: [0.6, 0.75, 0.95], bottomColor: [0.5, 0.6, 0.7], sunSize: 0.03, sunBloom: 0.3, atmosphericScattering: 0.5, rayleighCoefficient: 1.5, mieCoefficient: 0.01, mieDirectionalG: 0.85, exposure: 1 },
      stars: { enabled: false, density: 0, brightness: 0, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: false, milkyWayIntensity: 0 },
      ambient: { skyColor: [0.5, 0.6, 0.8], equatorColor: [0.6, 0.65, 0.7], groundColor: [0.2, 0.2, 0.15], intensity: 0.6, mode: 'trilight' },
      fogColor: [0.6, 0.7, 0.8],
      fogDensity: 0.0005,
    },
  },
  {
    // Noon (12:00)
    time: { hours: 12, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [1, 0.98, 0.95], intensity: 1, shadowIntensity: 1, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: false, color: [0.7, 0.75, 0.85], intensity: 0, phase: 0.5, angularDiameter: 0.52, shadowEnabled: false, shadowIntensity: 0 },
      sky: { type: 'procedural', topColor: [0.25, 0.45, 0.85], horizonColor: [0.5, 0.7, 0.95], bottomColor: [0.4, 0.55, 0.65], sunSize: 0.025, sunBloom: 0.2, atmosphericScattering: 0.3, rayleighCoefficient: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 1 },
      stars: { enabled: false, density: 0, brightness: 0, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: false, milkyWayIntensity: 0 },
      ambient: { skyColor: [0.55, 0.65, 0.85], equatorColor: [0.6, 0.65, 0.7], groundColor: [0.25, 0.22, 0.18], intensity: 0.7, mode: 'trilight' },
      fogColor: [0.7, 0.8, 0.9],
      fogDensity: 0.0003,
    },
  },
  {
    // Afternoon (15:00)
    time: { hours: 15, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [1, 0.95, 0.88], intensity: 0.9, shadowIntensity: 0.9, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: false, color: [0.7, 0.75, 0.85], intensity: 0, phase: 0.5, angularDiameter: 0.52, shadowEnabled: false, shadowIntensity: 0 },
      sky: { type: 'procedural', topColor: [0.3, 0.5, 0.85], horizonColor: [0.55, 0.7, 0.9], bottomColor: [0.45, 0.55, 0.6], sunSize: 0.03, sunBloom: 0.25, atmosphericScattering: 0.4, rayleighCoefficient: 1.2, mieCoefficient: 0.008, mieDirectionalG: 0.82, exposure: 1 },
      stars: { enabled: false, density: 0, brightness: 0, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: false, milkyWayIntensity: 0 },
      ambient: { skyColor: [0.55, 0.6, 0.8], equatorColor: [0.58, 0.6, 0.65], groundColor: [0.22, 0.2, 0.15], intensity: 0.65, mode: 'trilight' },
      fogColor: [0.65, 0.75, 0.85],
      fogDensity: 0.0004,
    },
  },
  {
    // Sunset (18:00)
    time: { hours: 18, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [1, 0.5, 0.2], intensity: 0.5, shadowIntensity: 0.6, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.55 },
      moon: { enabled: true, color: [0.6, 0.65, 0.75], intensity: 0.03, phase: 0.5, angularDiameter: 0.52, shadowEnabled: false, shadowIntensity: 0 },
      sky: { type: 'procedural', topColor: [0.15, 0.25, 0.5], horizonColor: [1, 0.5, 0.25], bottomColor: [0.8, 0.3, 0.15], sunSize: 0.05, sunBloom: 0.6, atmosphericScattering: 0.9, rayleighCoefficient: 2.5, mieCoefficient: 0.03, mieDirectionalG: 0.92, exposure: 1 },
      stars: { enabled: true, density: 0.2, brightness: 0.1, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: false, milkyWayIntensity: 0 },
      ambient: { skyColor: [0.35, 0.3, 0.4], equatorColor: [0.5, 0.35, 0.3], groundColor: [0.12, 0.08, 0.06], intensity: 0.35, mode: 'trilight' },
      fogColor: [0.6, 0.4, 0.3],
      fogDensity: 0.0015,
    },
  },
  {
    // Dusk (20:00)
    time: { hours: 20, minutes: 0 },
    lighting: {
      sun: { enabled: true, color: [0.8, 0.3, 0.1], intensity: 0.1, shadowIntensity: 0.2, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: true, color: [0.65, 0.7, 0.8], intensity: 0.06, phase: 0.5, angularDiameter: 0.52, shadowEnabled: true, shadowIntensity: 0.2 },
      sky: { type: 'procedural', topColor: [0.05, 0.08, 0.2], horizonColor: [0.3, 0.2, 0.3], bottomColor: [0.15, 0.1, 0.15], sunSize: 0.03, sunBloom: 0.3, atmosphericScattering: 0.5, rayleighCoefficient: 1.5, mieCoefficient: 0.015, mieDirectionalG: 0.85, exposure: 1 },
      stars: { enabled: true, density: 0.7, brightness: 0.5, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: true, milkyWayIntensity: 0.2 },
      ambient: { skyColor: [0.1, 0.1, 0.18], equatorColor: [0.15, 0.12, 0.18], groundColor: [0.03, 0.03, 0.04], intensity: 0.2, mode: 'trilight' },
      fogColor: [0.1, 0.1, 0.15],
      fogDensity: 0.001,
    },
  },
  {
    // Night (22:00)
    time: { hours: 22, minutes: 0 },
    lighting: {
      sun: { enabled: false, color: [0, 0, 0], intensity: 0, shadowIntensity: 0, shadowBias: 0.0001, shadowNormalBias: 0.02, shadowResolution: 2048, angularDiameter: 0.53 },
      moon: { enabled: true, color: [0.7, 0.75, 0.85], intensity: 0.1, phase: 0.5, angularDiameter: 0.52, shadowEnabled: true, shadowIntensity: 0.3 },
      sky: { type: 'procedural', topColor: [0.02, 0.02, 0.06], horizonColor: [0.05, 0.05, 0.1], bottomColor: [0.01, 0.01, 0.02], sunSize: 0, sunBloom: 0, atmosphericScattering: 0.1, rayleighCoefficient: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, exposure: 1 },
      stars: { enabled: true, density: 1, brightness: 1, twinkleSpeed: 2, twinkleAmount: 0.3, milkyWayEnabled: true, milkyWayIntensity: 0.5 },
      ambient: { skyColor: [0.02, 0.03, 0.06], equatorColor: [0.01, 0.02, 0.04], groundColor: [0.005, 0.005, 0.01], intensity: 0.1, mode: 'trilight' },
      fogColor: [0.02, 0.02, 0.05],
      fogDensity: 0.001,
    },
  },
];

// Presets for different environments
const dayNightPresets: DayNightPreset[] = [
  {
    id: 'temperate',
    name: 'Temperate',
    description: 'Standard temperate climate day/night cycle',
    latitude: 45,
    seasonOffset: 0,
    keyframes: defaultKeyframes,
  },
  {
    id: 'tropical',
    name: 'Tropical',
    description: 'Near-equator day/night cycle',
    latitude: 10,
    seasonOffset: 0,
    keyframes: defaultKeyframes.map((kf) => ({
      ...kf,
      lighting: {
        ...kf.lighting,
        sun: kf.lighting.sun ? { ...kf.lighting.sun, intensity: (kf.lighting.sun.intensity ?? 0) * 1.1 } : undefined,
        ambient: kf.lighting.ambient ? { ...kf.lighting.ambient, intensity: (kf.lighting.ambient.intensity ?? 0) * 1.1 } : undefined,
      },
    })),
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'High latitude with extended twilight',
    latitude: 70,
    seasonOffset: 0,
    keyframes: defaultKeyframes.map((kf) => ({
      ...kf,
      lighting: {
        ...kf.lighting,
        sun: kf.lighting.sun ? { ...kf.lighting.sun, intensity: (kf.lighting.sun.intensity ?? 0) * 0.7 } : undefined,
        sky: kf.lighting.sky
          ? {
              ...kf.lighting.sky,
              topColor: [
                (kf.lighting.sky.topColor?.[0] ?? 0) * 0.9,
                (kf.lighting.sky.topColor?.[1] ?? 0) * 0.95,
                (kf.lighting.sky.topColor?.[2] ?? 1) * 1.1,
              ] as [number, number, number],
            }
          : undefined,
      },
    })),
  },
  {
    id: 'desert',
    name: 'Desert',
    description: 'Hot desert with harsh sunlight',
    latitude: 30,
    seasonOffset: 0,
    keyframes: defaultKeyframes.map((kf) => ({
      ...kf,
      lighting: {
        ...kf.lighting,
        sun: kf.lighting.sun
          ? {
              ...kf.lighting.sun,
              intensity: (kf.lighting.sun.intensity ?? 0) * 1.2,
              color: [1, 0.95, 0.85] as [number, number, number],
            }
          : undefined,
        ambient: kf.lighting.ambient
          ? {
              ...kf.lighting.ambient,
              groundColor: [0.4, 0.35, 0.25] as [number, number, number],
            }
          : undefined,
        fogDensity: 0.0001,
      },
    })),
  },
  {
    id: 'overcast',
    name: 'Overcast',
    description: 'Perpetually cloudy skies',
    latitude: 50,
    seasonOffset: 0,
    keyframes: defaultKeyframes.map((kf) => ({
      ...kf,
      lighting: {
        ...kf.lighting,
        sun: kf.lighting.sun
          ? {
              ...kf.lighting.sun,
              intensity: (kf.lighting.sun.intensity ?? 0) * 0.5,
              shadowIntensity: (kf.lighting.sun.shadowIntensity ?? 0) * 0.5,
            }
          : undefined,
        sky: kf.lighting.sky
          ? {
              ...kf.lighting.sky,
              topColor: [0.5, 0.55, 0.6] as [number, number, number],
              horizonColor: [0.6, 0.65, 0.7] as [number, number, number],
              atmosphericScattering: 0.2,
            }
          : undefined,
        ambient: kf.lighting.ambient
          ? {
              ...kf.lighting.ambient,
              intensity: (kf.lighting.ambient.intensity ?? 0) * 1.2,
            }
          : undefined,
        fogColor: [0.6, 0.65, 0.7] as [number, number, number],
        fogDensity: 0.002,
      },
    })),
  },
];

// Default lighting state
const defaultLightingState: LightingState = {
  sun: {
    enabled: true,
    color: [1, 0.98, 0.95],
    intensity: 1,
    shadowIntensity: 1,
    shadowBias: 0.0001,
    shadowNormalBias: 0.02,
    shadowResolution: 2048,
    angularDiameter: 0.53,
  },
  moon: {
    enabled: false,
    color: [0.7, 0.75, 0.85],
    intensity: 0,
    phase: 0.5,
    angularDiameter: 0.52,
    shadowEnabled: false,
    shadowIntensity: 0,
  },
  sky: {
    type: 'procedural',
    topColor: [0.25, 0.45, 0.85],
    horizonColor: [0.5, 0.7, 0.95],
    bottomColor: [0.4, 0.55, 0.65],
    sunSize: 0.025,
    sunBloom: 0.2,
    atmosphericScattering: 0.3,
    rayleighCoefficient: 1,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    exposure: 1,
  },
  stars: {
    enabled: false,
    density: 0,
    brightness: 0,
    twinkleSpeed: 2,
    twinkleAmount: 0.3,
    milkyWayEnabled: false,
    milkyWayIntensity: 0,
  },
  ambient: {
    skyColor: [0.55, 0.65, 0.85],
    equatorColor: [0.6, 0.65, 0.7],
    groundColor: [0.25, 0.22, 0.18],
    intensity: 0.7,
    mode: 'trilight',
  },
  fogColor: [0.7, 0.8, 0.9],
  fogDensity: 0.0003,
};

class DayNightCycleService {
  private currentTime: TimeOfDay = { hours: 12, minutes: 0 };
  private timeScale: number = 1; // 1 = real time, 60 = 1 minute = 1 hour in game
  private paused: boolean = false;
  private keyframes: TimeKeyframe[] = [...defaultKeyframes];
  private currentState: LightingState;
  private presets: DayNightPreset[] = [...dayNightPresets];
  private latitude: number = 45;
  private dayOfYear: number = 172; // Summer solstice
  private listeners: Set<(state: LightingState, time: TimeOfDay) => void> = new Set();

  constructor() {
    this.currentState = this.deepClone(defaultLightingState);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get current time
   */
  getCurrentTime(): TimeOfDay {
    return { ...this.currentTime };
  }

  /**
   * Get current time as decimal hours
   */
  getTimeAsHours(): number {
    return this.currentTime.hours + this.currentTime.minutes / 60;
  }

  /**
   * Set current time
   */
  setTime(time: TimeOfDay): void {
    this.currentTime = {
      hours: Math.max(0, Math.min(23, Math.floor(time.hours))),
      minutes: Math.max(0, Math.min(59, Math.floor(time.minutes))),
    };
    this.updateLighting();
  }

  /**
   * Set time from decimal hours
   */
  setTimeFromHours(hours: number): void {
    const h = hours % 24;
    this.setTime({
      hours: Math.floor(h),
      minutes: Math.floor((h % 1) * 60),
    });
  }

  /**
   * Get current lighting state
   */
  getCurrentState(): LightingState {
    return this.deepClone(this.currentState);
  }

  /**
   * Get time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set time scale (1 = real time)
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  /**
   * Pause/unpause time progression
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Update the cycle (call each frame)
   */
  update(deltaTime: number): void {
    if (this.paused) return;

    // Advance time
    const minutesToAdd = (deltaTime / 60) * this.timeScale;
    let totalMinutes = this.currentTime.hours * 60 + this.currentTime.minutes + minutesToAdd;

    // Wrap around midnight
    while (totalMinutes >= 24 * 60) {
      totalMinutes -= 24 * 60;
      this.dayOfYear = (this.dayOfYear + 1) % 365;
    }
    while (totalMinutes < 0) {
      totalMinutes += 24 * 60;
      this.dayOfYear = (this.dayOfYear + 364) % 365;
    }

    this.currentTime = {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };

    this.updateLighting();
  }

  /**
   * Update lighting based on current time
   */
  private updateLighting(): void {
    const currentHours = this.getTimeAsHours();

    // Find surrounding keyframes
    let prevKeyframe: TimeKeyframe | null = null;
    let nextKeyframe: TimeKeyframe | null = null;

    const sortedKeyframes = [...this.keyframes].sort(
      (a, b) => a.time.hours * 60 + a.time.minutes - (b.time.hours * 60 + b.time.minutes)
    );

    for (let i = 0; i < sortedKeyframes.length; i++) {
      const kfHours = sortedKeyframes[i].time.hours + sortedKeyframes[i].time.minutes / 60;
      if (kfHours <= currentHours) {
        prevKeyframe = sortedKeyframes[i];
      }
      if (kfHours > currentHours && !nextKeyframe) {
        nextKeyframe = sortedKeyframes[i];
      }
    }

    // Handle wrap-around
    if (!prevKeyframe) {
      prevKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
    }
    if (!nextKeyframe) {
      nextKeyframe = sortedKeyframes[0];
    }

    // Calculate interpolation factor
    const prevHours = prevKeyframe.time.hours + prevKeyframe.time.minutes / 60;
    let nextHours = nextKeyframe.time.hours + nextKeyframe.time.minutes / 60;

    if (nextHours <= prevHours) {
      nextHours += 24; // Handle midnight wrap
    }

    let effectiveCurrentHours = currentHours;
    if (currentHours < prevHours) {
      effectiveCurrentHours += 24;
    }

    const t = (effectiveCurrentHours - prevHours) / (nextHours - prevHours);

    // Interpolate lighting state
    this.currentState = this.lerpLightingState(
      this.applyKeyframeLighting(prevKeyframe.lighting),
      this.applyKeyframeLighting(nextKeyframe.lighting),
      t
    );

    // Calculate sun and moon positions
    this.updateCelestialPositions();

    this.notifyListeners();
  }

  private applyKeyframeLighting(partial: Partial<LightingState>): LightingState {
    return {
      sun: { ...defaultLightingState.sun, ...partial.sun },
      moon: { ...defaultLightingState.moon, ...partial.moon },
      sky: { ...defaultLightingState.sky, ...partial.sky },
      stars: { ...defaultLightingState.stars, ...partial.stars },
      ambient: { ...defaultLightingState.ambient, ...partial.ambient },
      fogColor: partial.fogColor || defaultLightingState.fogColor,
      fogDensity: partial.fogDensity ?? defaultLightingState.fogDensity,
    };
  }

  private lerpLightingState(from: LightingState, to: LightingState, t: number): LightingState {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpColor = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];

    return {
      sun: {
        enabled: t < 0.5 ? from.sun.enabled : to.sun.enabled,
        color: lerpColor(from.sun.color, to.sun.color, t),
        intensity: lerp(from.sun.intensity, to.sun.intensity, t),
        shadowIntensity: lerp(from.sun.shadowIntensity, to.sun.shadowIntensity, t),
        shadowBias: lerp(from.sun.shadowBias, to.sun.shadowBias, t),
        shadowNormalBias: lerp(from.sun.shadowNormalBias, to.sun.shadowNormalBias, t),
        shadowResolution: from.sun.shadowResolution,
        angularDiameter: lerp(from.sun.angularDiameter, to.sun.angularDiameter, t),
      },
      moon: {
        enabled: t < 0.5 ? from.moon.enabled : to.moon.enabled,
        color: lerpColor(from.moon.color, to.moon.color, t),
        intensity: lerp(from.moon.intensity, to.moon.intensity, t),
        phase: lerp(from.moon.phase, to.moon.phase, t),
        angularDiameter: lerp(from.moon.angularDiameter, to.moon.angularDiameter, t),
        shadowEnabled: t < 0.5 ? from.moon.shadowEnabled : to.moon.shadowEnabled,
        shadowIntensity: lerp(from.moon.shadowIntensity, to.moon.shadowIntensity, t),
      },
      sky: {
        type: t < 0.5 ? from.sky.type : to.sky.type,
        topColor: lerpColor(from.sky.topColor, to.sky.topColor, t),
        horizonColor: lerpColor(from.sky.horizonColor, to.sky.horizonColor, t),
        bottomColor: lerpColor(from.sky.bottomColor, to.sky.bottomColor, t),
        sunSize: lerp(from.sky.sunSize, to.sky.sunSize, t),
        sunBloom: lerp(from.sky.sunBloom, to.sky.sunBloom, t),
        atmosphericScattering: lerp(from.sky.atmosphericScattering, to.sky.atmosphericScattering, t),
        rayleighCoefficient: lerp(from.sky.rayleighCoefficient, to.sky.rayleighCoefficient, t),
        mieCoefficient: lerp(from.sky.mieCoefficient, to.sky.mieCoefficient, t),
        mieDirectionalG: lerp(from.sky.mieDirectionalG, to.sky.mieDirectionalG, t),
        exposure: lerp(from.sky.exposure, to.sky.exposure, t),
      },
      stars: {
        enabled: t < 0.5 ? from.stars.enabled : to.stars.enabled,
        density: lerp(from.stars.density, to.stars.density, t),
        brightness: lerp(from.stars.brightness, to.stars.brightness, t),
        twinkleSpeed: lerp(from.stars.twinkleSpeed, to.stars.twinkleSpeed, t),
        twinkleAmount: lerp(from.stars.twinkleAmount, to.stars.twinkleAmount, t),
        milkyWayEnabled: t < 0.5 ? from.stars.milkyWayEnabled : to.stars.milkyWayEnabled,
        milkyWayIntensity: lerp(from.stars.milkyWayIntensity, to.stars.milkyWayIntensity, t),
      },
      ambient: {
        skyColor: lerpColor(from.ambient.skyColor, to.ambient.skyColor, t),
        equatorColor: lerpColor(from.ambient.equatorColor, to.ambient.equatorColor, t),
        groundColor: lerpColor(from.ambient.groundColor, to.ambient.groundColor, t),
        intensity: lerp(from.ambient.intensity, to.ambient.intensity, t),
        mode: from.ambient.mode,
      },
      fogColor: lerpColor(from.fogColor, to.fogColor, t),
      fogDensity: lerp(from.fogDensity, to.fogDensity, t),
    };
  }

  private updateCelestialPositions(): void {
    // Calculate sun position based on time and latitude
    const hourAngle = (this.getTimeAsHours() - 12) * 15 * (Math.PI / 180);
    const declination = this.calculateSolarDeclination();
    const latRad = this.latitude * (Math.PI / 180);

    const sinAltitude =
      Math.sin(latRad) * Math.sin(declination) +
      Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
    // Altitude calculated for future use (e.g., sun position visualization)
    void Math.asin(sinAltitude);

    // Moon is roughly opposite the sun (simplified)
    const moonHourAngle = hourAngle + Math.PI;
    // Moon altitude calculated for future use
    void Math.asin(
      Math.sin(latRad) * Math.sin(-declination) +
        Math.cos(latRad) * Math.cos(-declination) * Math.cos(moonHourAngle)
    );
  }

  private calculateSolarDeclination(): number {
    // Simplified solar declination based on day of year
    const N = this.dayOfYear;
    return 23.45 * Math.sin(((360 / 365) * (N - 81)) * (Math.PI / 180)) * (Math.PI / 180);
  }

  /**
   * Get sun direction vector
   */
  getSunDirection(): [number, number, number] {
    const hourAngle = (this.getTimeAsHours() - 12) * 15 * (Math.PI / 180);
    const declination = this.calculateSolarDeclination();
    const latRad = this.latitude * (Math.PI / 180);

    const sinAlt =
      Math.sin(latRad) * Math.sin(declination) +
      Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
    const altitude = Math.asin(sinAlt);

    const cosAzimuth =
      (Math.sin(declination) - Math.sin(altitude) * Math.sin(latRad)) /
      (Math.cos(altitude) * Math.cos(latRad));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));

    if (hourAngle > 0) {
      azimuth = 2 * Math.PI - azimuth;
    }

    // Convert to direction vector (Y-up coordinate system)
    const x = Math.cos(altitude) * Math.sin(azimuth);
    const y = Math.sin(altitude);
    const z = Math.cos(altitude) * Math.cos(azimuth);

    return [x, y, z];
  }

  /**
   * Get moon direction vector
   */
  getMoonDirection(): [number, number, number] {
    const sunDir = this.getSunDirection();
    // Simplified: moon is roughly opposite sun
    return [-sunDir[0], Math.max(0.1, -sunDir[1] * 0.5), -sunDir[2]];
  }

  /**
   * Set latitude (affects sun angle)
   */
  setLatitude(latitude: number): void {
    this.latitude = Math.max(-90, Math.min(90, latitude));
    this.updateLighting();
  }

  /**
   * Get latitude
   */
  getLatitude(): number {
    return this.latitude;
  }

  /**
   * Set day of year (affects sun angle and day length)
   */
  setDayOfYear(day: number): void {
    this.dayOfYear = Math.max(0, Math.min(364, Math.floor(day)));
    this.updateLighting();
  }

  /**
   * Get day of year
   */
  getDayOfYear(): number {
    return this.dayOfYear;
  }

  /**
   * Get day length in hours
   */
  getDayLength(): number {
    const declination = this.calculateSolarDeclination();
    const latRad = this.latitude * (Math.PI / 180);
    const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);

    if (cosHourAngle < -1) return 24; // Polar day
    if (cosHourAngle > 1) return 0; // Polar night

    const hourAngle = Math.acos(cosHourAngle);
    return (hourAngle * 2 * 180) / (15 * Math.PI);
  }

  /**
   * Get sunrise time
   */
  getSunriseTime(): TimeOfDay {
    const dayLength = this.getDayLength();
    const sunrise = 12 - dayLength / 2;
    return {
      hours: Math.floor(sunrise),
      minutes: Math.floor((sunrise % 1) * 60),
    };
  }

  /**
   * Get sunset time
   */
  getSunsetTime(): TimeOfDay {
    const dayLength = this.getDayLength();
    const sunset = 12 + dayLength / 2;
    return {
      hours: Math.floor(sunset),
      minutes: Math.floor((sunset % 1) * 60),
    };
  }

  /**
   * Check if it's daytime
   */
  isDaytime(): boolean {
    const sunrise = this.getSunriseTime();
    const sunset = this.getSunsetTime();
    const sunriseHours = sunrise.hours + sunrise.minutes / 60;
    const sunsetHours = sunset.hours + sunset.minutes / 60;
    const currentHours = this.getTimeAsHours();

    return currentHours >= sunriseHours && currentHours <= sunsetHours;
  }

  /**
   * Apply preset
   */
  applyPreset(presetId: string): boolean {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return false;

    this.keyframes = [...preset.keyframes];
    this.latitude = preset.latitude;
    this.updateLighting();

    return true;
  }

  /**
   * Get all presets
   */
  getPresets(): DayNightPreset[] {
    return [...this.presets];
  }

  /**
   * Add custom keyframe
   */
  addKeyframe(keyframe: TimeKeyframe): void {
    // Remove existing keyframe at same time
    this.keyframes = this.keyframes.filter(
      (kf) =>
        kf.time.hours !== keyframe.time.hours || kf.time.minutes !== keyframe.time.minutes
    );
    this.keyframes.push(keyframe);
    this.updateLighting();
  }

  /**
   * Remove keyframe
   */
  removeKeyframe(time: TimeOfDay): boolean {
    const initialLength = this.keyframes.length;
    this.keyframes = this.keyframes.filter(
      (kf) => kf.time.hours !== time.hours || kf.time.minutes !== time.minutes
    );
    if (this.keyframes.length < initialLength) {
      this.updateLighting();
      return true;
    }
    return false;
  }

  /**
   * Get all keyframes
   */
  getKeyframes(): TimeKeyframe[] {
    return [...this.keyframes];
  }

  /**
   * Subscribe to lighting changes
   */
  subscribe(callback: (state: LightingState, time: TimeOfDay) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.getCurrentState();
    const time = this.getCurrentTime();
    this.listeners.forEach((callback) => callback(state, time));
  }

  /**
   * Export settings to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        currentTime: this.currentTime,
        timeScale: this.timeScale,
        latitude: this.latitude,
        dayOfYear: this.dayOfYear,
        keyframes: this.keyframes,
      },
      null,
      2
    );
  }

  /**
   * Import settings from JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.currentTime) this.setTime(data.currentTime);
      if (data.timeScale !== undefined) this.timeScale = data.timeScale;
      if (data.latitude !== undefined) this.latitude = data.latitude;
      if (data.dayOfYear !== undefined) this.dayOfYear = data.dayOfYear;
      if (data.keyframes) this.keyframes = data.keyframes;
      this.updateLighting();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get formatted time string
   */
  getFormattedTime(format: '12h' | '24h' = '24h'): string {
    const { hours, minutes } = this.currentTime;
    const mins = Math.floor(minutes).toString().padStart(2, '0');

    if (format === '24h') {
      return `${hours.toString().padStart(2, '0')}:${mins}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      return `${h}:${mins} ${period}`;
    }
  }
}

export const dayNightCycle = new DayNightCycleService();

// Export utility
export { hexToRgb };
