/**
 * Weather System - Dynamic weather effects including rain, snow, fog, wind, and more
 */

export interface WindSettings {
  direction: [number, number, number]; // Normalized direction
  speed: number; // m/s
  gustiness: number; // 0-1, variation in wind speed
  gustFrequency: number; // Hz, how often gusts occur
  turbulence: number; // 0-1, small-scale variations
}

export interface RainSettings {
  enabled: boolean;
  intensity: number; // 0-1
  dropSize: number;
  dropSpeed: number;
  dropCount: number;
  splashEnabled: boolean;
  splashIntensity: number;
  puddleFormation: boolean;
  puddleRate: number;
  rippleEffect: boolean;
  windAffect: number; // How much wind affects rain direction
  soundVolume: number;
  lightDimming: number; // How much rain dims ambient light
}

export interface SnowSettings {
  enabled: boolean;
  intensity: number; // 0-1
  flakeSize: number;
  flakeSpeed: number;
  flakeCount: number;
  accumulation: boolean;
  accumulationRate: number;
  maxAccumulation: number;
  meltRate: number;
  windAffect: number;
  turbulence: number;
  soundVolume: number;
}

export interface FogSettings {
  enabled: boolean;
  type: 'linear' | 'exponential' | 'exponential_squared' | 'height' | 'volumetric';
  color: [number, number, number];
  density: number;
  nearDistance: number;
  farDistance: number;
  heightFalloff: number; // For height fog
  heightMax: number;
  heightMin: number;
  noiseEnabled: boolean;
  noiseScale: number;
  noiseSpeed: number;
  noiseIntensity: number;
}

export interface CloudSettings {
  enabled: boolean;
  type: 'procedural' | 'skybox' | 'volumetric';
  coverage: number; // 0-1
  altitude: number;
  thickness: number;
  color: [number, number, number];
  shadowIntensity: number;
  windSpeed: number;
  scale: number;
  detailScale: number;
  lightAbsorption: number;
  lightScattering: number;
}

export interface LightningSettings {
  enabled: boolean;
  frequency: number; // Average seconds between strikes
  duration: number; // Flash duration
  color: [number, number, number];
  intensity: number;
  branchCount: number;
  thunderDelay: number; // Seconds after flash
  thunderVolume: number;
  flashAmbient: boolean; // Flash entire scene
}

export interface SunShaftSettings {
  enabled: boolean;
  intensity: number;
  decay: number;
  weight: number;
  samples: number;
  color: [number, number, number];
}

export interface RainbowSettings {
  enabled: boolean;
  intensity: number;
  radius: number;
  width: number;
  doubleRainbow: boolean;
}

export interface AuroraSettings {
  enabled: boolean;
  intensity: number;
  speed: number;
  colors: Array<[number, number, number]>;
  scale: number;
  height: number;
}

export interface WeatherPreset {
  id: string;
  name: string;
  category: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'special';
  description?: string;
  settings: Partial<WeatherState>;
  transitionDuration?: number;
}

export interface WeatherState {
  wind: WindSettings;
  rain: RainSettings;
  snow: SnowSettings;
  fog: FogSettings;
  clouds: CloudSettings;
  lightning: LightningSettings;
  sunShafts: SunShaftSettings;
  rainbow: RainbowSettings;
  aurora: AuroraSettings;
  temperature: number; // Celsius, affects some effects
  humidity: number; // 0-1
  pressure: number; // hPa, for simulation
  ambientLight: number; // Multiplier for ambient light
  skyTint: [number, number, number]; // Color tint for sky
}

export interface WeatherTransition {
  from: WeatherState;
  to: WeatherState;
  duration: number;
  elapsed: number;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
}

export interface WeatherZone {
  id: string;
  name: string;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  weather: Partial<WeatherState>;
  priority: number;
  blendDistance: number;
}

// Default weather presets
const weatherPresets: WeatherPreset[] = [
  {
    id: 'clear-day',
    name: 'Clear Day',
    category: 'clear',
    description: 'Bright sunny day with clear skies',
    settings: {
      wind: { direction: [1, 0, 0.2], speed: 2, gustiness: 0.1, gustFrequency: 0.1, turbulence: 0.1 },
      rain: { enabled: false, intensity: 0, dropSize: 0.02, dropSpeed: 15, dropCount: 0, splashEnabled: false, splashIntensity: 0, puddleFormation: false, puddleRate: 0, rippleEffect: false, windAffect: 0.5, soundVolume: 0, lightDimming: 0 },
      snow: { enabled: false, intensity: 0, flakeSize: 0.05, flakeSpeed: 1, flakeCount: 0, accumulation: false, accumulationRate: 0, maxAccumulation: 0, meltRate: 0, windAffect: 0.8, turbulence: 0.3, soundVolume: 0 },
      fog: { enabled: false, type: 'exponential', color: [0.8, 0.85, 0.9], density: 0, nearDistance: 1, farDistance: 1000, heightFalloff: 1, heightMax: 100, heightMin: 0, noiseEnabled: false, noiseScale: 0.1, noiseSpeed: 0.5, noiseIntensity: 0 },
      clouds: { enabled: true, type: 'procedural', coverage: 0.2, altitude: 1000, thickness: 200, color: [1, 1, 1], shadowIntensity: 0.1, windSpeed: 10, scale: 1, detailScale: 0.3, lightAbsorption: 0.5, lightScattering: 0.8 },
      lightning: { enabled: false, frequency: 30, duration: 0.2, color: [1, 1, 1], intensity: 5, branchCount: 3, thunderDelay: 3, thunderVolume: 0.8, flashAmbient: true },
      sunShafts: { enabled: true, intensity: 0.5, decay: 0.95, weight: 0.5, samples: 50, color: [1, 0.95, 0.8] },
      rainbow: { enabled: false, intensity: 0, radius: 0.4, width: 0.02, doubleRainbow: false },
      aurora: { enabled: false, intensity: 0, speed: 0.1, colors: [[0.2, 1, 0.4], [0.4, 0.6, 1]], scale: 1, height: 500 },
      temperature: 22,
      humidity: 0.4,
      pressure: 1013,
      ambientLight: 1.0,
      skyTint: [0.5, 0.7, 1.0],
    },
  },
  {
    id: 'partly-cloudy',
    name: 'Partly Cloudy',
    category: 'cloudy',
    description: 'Some clouds passing by',
    settings: {
      clouds: { enabled: true, type: 'procedural', coverage: 0.5, altitude: 800, thickness: 300, color: [0.95, 0.95, 0.95], shadowIntensity: 0.3, windSpeed: 15, scale: 1.2, detailScale: 0.4, lightAbsorption: 0.6, lightScattering: 0.7 },
      ambientLight: 0.85,
      skyTint: [0.55, 0.7, 0.95],
    },
  },
  {
    id: 'overcast',
    name: 'Overcast',
    category: 'cloudy',
    description: 'Heavy cloud cover',
    settings: {
      clouds: { enabled: true, type: 'procedural', coverage: 0.9, altitude: 600, thickness: 500, color: [0.7, 0.7, 0.75], shadowIntensity: 0.5, windSpeed: 8, scale: 2, detailScale: 0.5, lightAbsorption: 0.8, lightScattering: 0.5 },
      fog: { enabled: true, type: 'exponential', color: [0.7, 0.75, 0.8], density: 0.001, nearDistance: 10, farDistance: 500, heightFalloff: 1, heightMax: 200, heightMin: 0, noiseEnabled: false, noiseScale: 0.1, noiseSpeed: 0.5, noiseIntensity: 0 },
      ambientLight: 0.6,
      skyTint: [0.5, 0.55, 0.65],
      humidity: 0.7,
    },
  },
  {
    id: 'light-rain',
    name: 'Light Rain',
    category: 'rainy',
    description: 'Gentle rainfall',
    settings: {
      rain: { enabled: true, intensity: 0.3, dropSize: 0.02, dropSpeed: 12, dropCount: 2000, splashEnabled: true, splashIntensity: 0.5, puddleFormation: true, puddleRate: 0.1, rippleEffect: true, windAffect: 0.5, soundVolume: 0.3, lightDimming: 0.2 },
      clouds: { enabled: true, type: 'procedural', coverage: 0.85, altitude: 500, thickness: 400, color: [0.6, 0.6, 0.65], shadowIntensity: 0.4, windSpeed: 12, scale: 1.5, detailScale: 0.4, lightAbsorption: 0.7, lightScattering: 0.5 },
      fog: { enabled: true, type: 'exponential', color: [0.65, 0.7, 0.75], density: 0.002, nearDistance: 5, farDistance: 300, heightFalloff: 1, heightMax: 150, heightMin: 0, noiseEnabled: true, noiseScale: 0.2, noiseSpeed: 1, noiseIntensity: 0.3 },
      wind: { direction: [0.8, 0, 0.6], speed: 5, gustiness: 0.3, gustFrequency: 0.2, turbulence: 0.2 },
      ambientLight: 0.5,
      skyTint: [0.45, 0.5, 0.6],
      humidity: 0.85,
      temperature: 15,
    },
  },
  {
    id: 'heavy-rain',
    name: 'Heavy Rain',
    category: 'rainy',
    description: 'Intense rainfall',
    settings: {
      rain: { enabled: true, intensity: 0.8, dropSize: 0.03, dropSpeed: 18, dropCount: 8000, splashEnabled: true, splashIntensity: 1, puddleFormation: true, puddleRate: 0.3, rippleEffect: true, windAffect: 0.7, soundVolume: 0.7, lightDimming: 0.4 },
      clouds: { enabled: true, type: 'procedural', coverage: 1, altitude: 400, thickness: 600, color: [0.4, 0.4, 0.45], shadowIntensity: 0.6, windSpeed: 20, scale: 2, detailScale: 0.5, lightAbsorption: 0.9, lightScattering: 0.3 },
      fog: { enabled: true, type: 'exponential', color: [0.5, 0.55, 0.6], density: 0.005, nearDistance: 2, farDistance: 150, heightFalloff: 0.5, heightMax: 100, heightMin: 0, noiseEnabled: true, noiseScale: 0.3, noiseSpeed: 2, noiseIntensity: 0.5 },
      wind: { direction: [0.7, 0, 0.7], speed: 12, gustiness: 0.5, gustFrequency: 0.3, turbulence: 0.4 },
      ambientLight: 0.35,
      skyTint: [0.35, 0.4, 0.5],
      humidity: 0.95,
      temperature: 12,
    },
  },
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    category: 'stormy',
    description: 'Heavy rain with lightning and thunder',
    settings: {
      rain: { enabled: true, intensity: 1, dropSize: 0.04, dropSpeed: 22, dropCount: 12000, splashEnabled: true, splashIntensity: 1, puddleFormation: true, puddleRate: 0.5, rippleEffect: true, windAffect: 0.8, soundVolume: 0.9, lightDimming: 0.5 },
      clouds: { enabled: true, type: 'procedural', coverage: 1, altitude: 300, thickness: 800, color: [0.25, 0.25, 0.3], shadowIntensity: 0.8, windSpeed: 30, scale: 2.5, detailScale: 0.6, lightAbsorption: 0.95, lightScattering: 0.2 },
      fog: { enabled: true, type: 'exponential', color: [0.35, 0.4, 0.45], density: 0.008, nearDistance: 1, farDistance: 100, heightFalloff: 0.3, heightMax: 80, heightMin: 0, noiseEnabled: true, noiseScale: 0.4, noiseSpeed: 3, noiseIntensity: 0.6 },
      lightning: { enabled: true, frequency: 8, duration: 0.15, color: [1, 1, 0.9], intensity: 10, branchCount: 5, thunderDelay: 2, thunderVolume: 1, flashAmbient: true },
      wind: { direction: [0.6, 0.1, 0.8], speed: 20, gustiness: 0.7, gustFrequency: 0.5, turbulence: 0.6 },
      ambientLight: 0.2,
      skyTint: [0.25, 0.28, 0.35],
      humidity: 1,
      temperature: 10,
      pressure: 990,
    },
  },
  {
    id: 'light-snow',
    name: 'Light Snow',
    category: 'snowy',
    description: 'Gentle snowfall',
    settings: {
      snow: { enabled: true, intensity: 0.3, flakeSize: 0.04, flakeSpeed: 0.8, flakeCount: 1500, accumulation: true, accumulationRate: 0.05, maxAccumulation: 0.2, meltRate: 0.01, windAffect: 0.6, turbulence: 0.4, soundVolume: 0.2 },
      clouds: { enabled: true, type: 'procedural', coverage: 0.8, altitude: 600, thickness: 400, color: [0.85, 0.85, 0.9], shadowIntensity: 0.2, windSpeed: 8, scale: 1.5, detailScale: 0.4, lightAbsorption: 0.5, lightScattering: 0.8 },
      fog: { enabled: true, type: 'exponential', color: [0.9, 0.92, 0.95], density: 0.001, nearDistance: 10, farDistance: 400, heightFalloff: 1, heightMax: 200, heightMin: 0, noiseEnabled: false, noiseScale: 0.1, noiseSpeed: 0.5, noiseIntensity: 0 },
      wind: { direction: [1, 0, 0.3], speed: 3, gustiness: 0.2, gustFrequency: 0.15, turbulence: 0.15 },
      ambientLight: 0.75,
      skyTint: [0.7, 0.75, 0.85],
      humidity: 0.7,
      temperature: -2,
    },
  },
  {
    id: 'blizzard',
    name: 'Blizzard',
    category: 'snowy',
    description: 'Heavy snow with strong winds',
    settings: {
      snow: { enabled: true, intensity: 1, flakeSize: 0.06, flakeSpeed: 2, flakeCount: 10000, accumulation: true, accumulationRate: 0.2, maxAccumulation: 1, meltRate: 0, windAffect: 1, turbulence: 0.8, soundVolume: 0.6 },
      clouds: { enabled: true, type: 'procedural', coverage: 1, altitude: 300, thickness: 600, color: [0.7, 0.72, 0.78], shadowIntensity: 0.4, windSpeed: 40, scale: 3, detailScale: 0.6, lightAbsorption: 0.7, lightScattering: 0.6 },
      fog: { enabled: true, type: 'exponential', color: [0.8, 0.82, 0.88], density: 0.015, nearDistance: 1, farDistance: 50, heightFalloff: 0.5, heightMax: 50, heightMin: 0, noiseEnabled: true, noiseScale: 0.5, noiseSpeed: 4, noiseIntensity: 0.7 },
      wind: { direction: [0.8, 0.1, 0.6], speed: 25, gustiness: 0.8, gustFrequency: 0.4, turbulence: 0.7 },
      ambientLight: 0.4,
      skyTint: [0.6, 0.62, 0.7],
      humidity: 0.9,
      temperature: -15,
    },
  },
  {
    id: 'morning-fog',
    name: 'Morning Fog',
    category: 'foggy',
    description: 'Dense low-lying fog',
    settings: {
      fog: { enabled: true, type: 'height', color: [0.85, 0.88, 0.92], density: 0.02, nearDistance: 0, farDistance: 200, heightFalloff: 0.02, heightMax: 30, heightMin: 0, noiseEnabled: true, noiseScale: 0.1, noiseSpeed: 0.3, noiseIntensity: 0.4 },
      clouds: { enabled: true, type: 'procedural', coverage: 0.3, altitude: 1000, thickness: 200, color: [1, 0.98, 0.95], shadowIntensity: 0.1, windSpeed: 5, scale: 1, detailScale: 0.3, lightAbsorption: 0.4, lightScattering: 0.9 },
      wind: { direction: [1, 0, 0], speed: 1, gustiness: 0.05, gustFrequency: 0.05, turbulence: 0.05 },
      ambientLight: 0.7,
      skyTint: [0.7, 0.75, 0.85],
      humidity: 0.95,
      temperature: 8,
    },
  },
  {
    id: 'dust-storm',
    name: 'Dust Storm',
    category: 'special',
    description: 'Sandy dust storm',
    settings: {
      fog: { enabled: true, type: 'exponential', color: [0.8, 0.65, 0.45], density: 0.01, nearDistance: 1, farDistance: 100, heightFalloff: 1, heightMax: 300, heightMin: 0, noiseEnabled: true, noiseScale: 0.3, noiseSpeed: 3, noiseIntensity: 0.6 },
      wind: { direction: [1, 0.2, 0.5], speed: 30, gustiness: 0.6, gustFrequency: 0.3, turbulence: 0.5 },
      ambientLight: 0.5,
      skyTint: [0.7, 0.55, 0.35],
      humidity: 0.1,
      temperature: 35,
    },
  },
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    category: 'special',
    description: 'Aurora borealis display',
    settings: {
      aurora: { enabled: true, intensity: 0.8, speed: 0.15, colors: [[0.2, 0.9, 0.4], [0.3, 0.5, 0.9], [0.8, 0.3, 0.6]], scale: 1.5, height: 400 },
      clouds: { enabled: false, type: 'procedural', coverage: 0.1, altitude: 1000, thickness: 100, color: [0.8, 0.8, 0.85], shadowIntensity: 0.05, windSpeed: 5, scale: 1, detailScale: 0.3, lightAbsorption: 0.3, lightScattering: 0.9 },
      fog: { enabled: false, type: 'exponential', color: [0.1, 0.15, 0.25], density: 0, nearDistance: 10, farDistance: 1000, heightFalloff: 1, heightMax: 100, heightMin: 0, noiseEnabled: false, noiseScale: 0.1, noiseSpeed: 0.5, noiseIntensity: 0 },
      ambientLight: 0.15,
      skyTint: [0.1, 0.15, 0.25],
      temperature: -10,
    },
  },
  {
    id: 'post-rain-rainbow',
    name: 'Rainbow',
    category: 'special',
    description: 'Clearing weather with rainbow',
    settings: {
      rain: { enabled: true, intensity: 0.05, dropSize: 0.02, dropSpeed: 10, dropCount: 200, splashEnabled: false, splashIntensity: 0, puddleFormation: false, puddleRate: 0, rippleEffect: false, windAffect: 0.3, soundVolume: 0.1, lightDimming: 0.05 },
      clouds: { enabled: true, type: 'procedural', coverage: 0.4, altitude: 800, thickness: 300, color: [0.9, 0.9, 0.92], shadowIntensity: 0.2, windSpeed: 10, scale: 1.2, detailScale: 0.4, lightAbsorption: 0.5, lightScattering: 0.8 },
      rainbow: { enabled: true, intensity: 0.7, radius: 0.4, width: 0.025, doubleRainbow: true },
      sunShafts: { enabled: true, intensity: 0.7, decay: 0.93, weight: 0.6, samples: 60, color: [1, 0.95, 0.85] },
      ambientLight: 0.85,
      skyTint: [0.55, 0.7, 0.95],
      humidity: 0.7,
    },
  },
];

// Default weather state
const defaultWeatherState: WeatherState = {
  wind: {
    direction: [1, 0, 0],
    speed: 0,
    gustiness: 0,
    gustFrequency: 0,
    turbulence: 0,
  },
  rain: {
    enabled: false,
    intensity: 0,
    dropSize: 0.02,
    dropSpeed: 15,
    dropCount: 0,
    splashEnabled: false,
    splashIntensity: 0,
    puddleFormation: false,
    puddleRate: 0,
    rippleEffect: false,
    windAffect: 0.5,
    soundVolume: 0,
    lightDimming: 0,
  },
  snow: {
    enabled: false,
    intensity: 0,
    flakeSize: 0.05,
    flakeSpeed: 1,
    flakeCount: 0,
    accumulation: false,
    accumulationRate: 0,
    maxAccumulation: 0,
    meltRate: 0,
    windAffect: 0.8,
    turbulence: 0.3,
    soundVolume: 0,
  },
  fog: {
    enabled: false,
    type: 'exponential',
    color: [0.8, 0.85, 0.9],
    density: 0,
    nearDistance: 1,
    farDistance: 1000,
    heightFalloff: 1,
    heightMax: 100,
    heightMin: 0,
    noiseEnabled: false,
    noiseScale: 0.1,
    noiseSpeed: 0.5,
    noiseIntensity: 0,
  },
  clouds: {
    enabled: false,
    type: 'procedural',
    coverage: 0,
    altitude: 1000,
    thickness: 200,
    color: [1, 1, 1],
    shadowIntensity: 0,
    windSpeed: 10,
    scale: 1,
    detailScale: 0.3,
    lightAbsorption: 0.5,
    lightScattering: 0.8,
  },
  lightning: {
    enabled: false,
    frequency: 30,
    duration: 0.2,
    color: [1, 1, 1],
    intensity: 5,
    branchCount: 3,
    thunderDelay: 3,
    thunderVolume: 0.8,
    flashAmbient: true,
  },
  sunShafts: {
    enabled: false,
    intensity: 0,
    decay: 0.95,
    weight: 0.5,
    samples: 50,
    color: [1, 0.95, 0.8],
  },
  rainbow: {
    enabled: false,
    intensity: 0,
    radius: 0.4,
    width: 0.02,
    doubleRainbow: false,
  },
  aurora: {
    enabled: false,
    intensity: 0,
    speed: 0.1,
    colors: [[0.2, 1, 0.4], [0.4, 0.6, 1]],
    scale: 1,
    height: 500,
  },
  temperature: 20,
  humidity: 0.5,
  pressure: 1013,
  ambientLight: 1,
  skyTint: [0.5, 0.7, 1],
};

class WeatherSystemService {
  private currentState: WeatherState;
  private transition: WeatherTransition | null = null;
  private zones: Map<string, WeatherZone> = new Map();
  private presets: WeatherPreset[] = [...weatherPresets];
  private listeners: Set<(state: WeatherState) => void> = new Set();
  private lastLightningTime: number = 0;
  private gustOffset: number = 0;

  constructor() {
    this.currentState = this.deepClone(defaultWeatherState);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get current weather state
   */
  getCurrentState(): WeatherState {
    return this.deepClone(this.currentState);
  }

  /**
   * Set weather state immediately
   */
  setState(state: Partial<WeatherState>): void {
    this.currentState = this.mergeState(this.currentState, state);
    this.notifyListeners();
  }

  /**
   * Apply a preset
   */
  applyPreset(presetId: string, transition: boolean = true): boolean {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return false;

    if (transition && preset.transitionDuration) {
      this.transitionTo(preset.settings, preset.transitionDuration);
    } else if (transition) {
      this.transitionTo(preset.settings, 5); // Default 5 second transition
    } else {
      this.setState(preset.settings);
    }

    return true;
  }

  /**
   * Start transition to new weather
   */
  transitionTo(
    target: Partial<WeatherState>,
    duration: number,
    easing: WeatherTransition['easing'] = 'ease_in_out'
  ): void {
    const targetState = this.mergeState(this.deepClone(defaultWeatherState), target);

    this.transition = {
      from: this.deepClone(this.currentState),
      to: targetState,
      duration,
      elapsed: 0,
      easing,
    };
  }

  /**
   * Update weather system (call each frame)
   */
  update(deltaTime: number): void {
    // Update transition
    if (this.transition) {
      this.transition.elapsed += deltaTime;
      const t = Math.min(this.transition.elapsed / this.transition.duration, 1);
      const easedT = this.applyEasing(t, this.transition.easing);

      this.currentState = this.lerpState(this.transition.from, this.transition.to, easedT);

      if (t >= 1) {
        this.transition = null;
      }

      this.notifyListeners();
    }

    // Update wind gusts
    this.gustOffset += deltaTime;

    // Update lightning
    if (this.currentState.lightning.enabled) {
      this.updateLightning(deltaTime);
    }
  }

  private applyEasing(t: number, easing: WeatherTransition['easing']): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease_in':
        return t * t;
      case 'ease_out':
        return t * (2 - t);
      case 'ease_in_out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  private lerpState(from: WeatherState, to: WeatherState, t: number): WeatherState {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpColor = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t),
    ];

    return {
      wind: {
        direction: lerpColor(from.wind.direction, to.wind.direction, t),
        speed: lerp(from.wind.speed, to.wind.speed, t),
        gustiness: lerp(from.wind.gustiness, to.wind.gustiness, t),
        gustFrequency: lerp(from.wind.gustFrequency, to.wind.gustFrequency, t),
        turbulence: lerp(from.wind.turbulence, to.wind.turbulence, t),
      },
      rain: {
        enabled: t > 0.5 ? to.rain.enabled : from.rain.enabled,
        intensity: lerp(from.rain.intensity, to.rain.intensity, t),
        dropSize: lerp(from.rain.dropSize, to.rain.dropSize, t),
        dropSpeed: lerp(from.rain.dropSpeed, to.rain.dropSpeed, t),
        dropCount: Math.floor(lerp(from.rain.dropCount, to.rain.dropCount, t)),
        splashEnabled: t > 0.5 ? to.rain.splashEnabled : from.rain.splashEnabled,
        splashIntensity: lerp(from.rain.splashIntensity, to.rain.splashIntensity, t),
        puddleFormation: t > 0.5 ? to.rain.puddleFormation : from.rain.puddleFormation,
        puddleRate: lerp(from.rain.puddleRate, to.rain.puddleRate, t),
        rippleEffect: t > 0.5 ? to.rain.rippleEffect : from.rain.rippleEffect,
        windAffect: lerp(from.rain.windAffect, to.rain.windAffect, t),
        soundVolume: lerp(from.rain.soundVolume, to.rain.soundVolume, t),
        lightDimming: lerp(from.rain.lightDimming, to.rain.lightDimming, t),
      },
      snow: {
        enabled: t > 0.5 ? to.snow.enabled : from.snow.enabled,
        intensity: lerp(from.snow.intensity, to.snow.intensity, t),
        flakeSize: lerp(from.snow.flakeSize, to.snow.flakeSize, t),
        flakeSpeed: lerp(from.snow.flakeSpeed, to.snow.flakeSpeed, t),
        flakeCount: Math.floor(lerp(from.snow.flakeCount, to.snow.flakeCount, t)),
        accumulation: t > 0.5 ? to.snow.accumulation : from.snow.accumulation,
        accumulationRate: lerp(from.snow.accumulationRate, to.snow.accumulationRate, t),
        maxAccumulation: lerp(from.snow.maxAccumulation, to.snow.maxAccumulation, t),
        meltRate: lerp(from.snow.meltRate, to.snow.meltRate, t),
        windAffect: lerp(from.snow.windAffect, to.snow.windAffect, t),
        turbulence: lerp(from.snow.turbulence, to.snow.turbulence, t),
        soundVolume: lerp(from.snow.soundVolume, to.snow.soundVolume, t),
      },
      fog: {
        enabled: t > 0.5 ? to.fog.enabled : from.fog.enabled,
        type: t > 0.5 ? to.fog.type : from.fog.type,
        color: lerpColor(from.fog.color, to.fog.color, t),
        density: lerp(from.fog.density, to.fog.density, t),
        nearDistance: lerp(from.fog.nearDistance, to.fog.nearDistance, t),
        farDistance: lerp(from.fog.farDistance, to.fog.farDistance, t),
        heightFalloff: lerp(from.fog.heightFalloff, to.fog.heightFalloff, t),
        heightMax: lerp(from.fog.heightMax, to.fog.heightMax, t),
        heightMin: lerp(from.fog.heightMin, to.fog.heightMin, t),
        noiseEnabled: t > 0.5 ? to.fog.noiseEnabled : from.fog.noiseEnabled,
        noiseScale: lerp(from.fog.noiseScale, to.fog.noiseScale, t),
        noiseSpeed: lerp(from.fog.noiseSpeed, to.fog.noiseSpeed, t),
        noiseIntensity: lerp(from.fog.noiseIntensity, to.fog.noiseIntensity, t),
      },
      clouds: {
        enabled: t > 0.5 ? to.clouds.enabled : from.clouds.enabled,
        type: t > 0.5 ? to.clouds.type : from.clouds.type,
        coverage: lerp(from.clouds.coverage, to.clouds.coverage, t),
        altitude: lerp(from.clouds.altitude, to.clouds.altitude, t),
        thickness: lerp(from.clouds.thickness, to.clouds.thickness, t),
        color: lerpColor(from.clouds.color, to.clouds.color, t),
        shadowIntensity: lerp(from.clouds.shadowIntensity, to.clouds.shadowIntensity, t),
        windSpeed: lerp(from.clouds.windSpeed, to.clouds.windSpeed, t),
        scale: lerp(from.clouds.scale, to.clouds.scale, t),
        detailScale: lerp(from.clouds.detailScale, to.clouds.detailScale, t),
        lightAbsorption: lerp(from.clouds.lightAbsorption, to.clouds.lightAbsorption, t),
        lightScattering: lerp(from.clouds.lightScattering, to.clouds.lightScattering, t),
      },
      lightning: {
        enabled: t > 0.5 ? to.lightning.enabled : from.lightning.enabled,
        frequency: lerp(from.lightning.frequency, to.lightning.frequency, t),
        duration: lerp(from.lightning.duration, to.lightning.duration, t),
        color: lerpColor(from.lightning.color, to.lightning.color, t),
        intensity: lerp(from.lightning.intensity, to.lightning.intensity, t),
        branchCount: Math.floor(lerp(from.lightning.branchCount, to.lightning.branchCount, t)),
        thunderDelay: lerp(from.lightning.thunderDelay, to.lightning.thunderDelay, t),
        thunderVolume: lerp(from.lightning.thunderVolume, to.lightning.thunderVolume, t),
        flashAmbient: t > 0.5 ? to.lightning.flashAmbient : from.lightning.flashAmbient,
      },
      sunShafts: {
        enabled: t > 0.5 ? to.sunShafts.enabled : from.sunShafts.enabled,
        intensity: lerp(from.sunShafts.intensity, to.sunShafts.intensity, t),
        decay: lerp(from.sunShafts.decay, to.sunShafts.decay, t),
        weight: lerp(from.sunShafts.weight, to.sunShafts.weight, t),
        samples: Math.floor(lerp(from.sunShafts.samples, to.sunShafts.samples, t)),
        color: lerpColor(from.sunShafts.color, to.sunShafts.color, t),
      },
      rainbow: {
        enabled: t > 0.5 ? to.rainbow.enabled : from.rainbow.enabled,
        intensity: lerp(from.rainbow.intensity, to.rainbow.intensity, t),
        radius: lerp(from.rainbow.radius, to.rainbow.radius, t),
        width: lerp(from.rainbow.width, to.rainbow.width, t),
        doubleRainbow: t > 0.5 ? to.rainbow.doubleRainbow : from.rainbow.doubleRainbow,
      },
      aurora: {
        enabled: t > 0.5 ? to.aurora.enabled : from.aurora.enabled,
        intensity: lerp(from.aurora.intensity, to.aurora.intensity, t),
        speed: lerp(from.aurora.speed, to.aurora.speed, t),
        colors: t > 0.5 ? to.aurora.colors : from.aurora.colors,
        scale: lerp(from.aurora.scale, to.aurora.scale, t),
        height: lerp(from.aurora.height, to.aurora.height, t),
      },
      temperature: lerp(from.temperature, to.temperature, t),
      humidity: lerp(from.humidity, to.humidity, t),
      pressure: lerp(from.pressure, to.pressure, t),
      ambientLight: lerp(from.ambientLight, to.ambientLight, t),
      skyTint: lerpColor(from.skyTint, to.skyTint, t),
    };
  }

  private mergeState(base: WeatherState, update: Partial<WeatherState>): WeatherState {
    const result = this.deepClone(base);

    for (const key in update) {
      if (update[key as keyof WeatherState] !== undefined) {
        const value = update[key as keyof WeatherState];
        if (typeof value === 'object' && !Array.isArray(value)) {
          (result as unknown as Record<string, unknown>)[key] = {
            ...(result as unknown as Record<string, unknown>)[key] as Record<string, unknown>,
            ...(value as unknown as Record<string, unknown>),
          };
        } else {
          (result as unknown as Record<string, unknown>)[key] = value;
        }
      }
    }

    return result;
  }

  private updateLightning(_deltaTime: number): void {
    const now = Date.now() / 1000;
    const timeSinceLastStrike = now - this.lastLightningTime;

    // Random chance based on frequency
    if (timeSinceLastStrike > this.currentState.lightning.frequency * 0.5) {
      const chance = 1 / (this.currentState.lightning.frequency * 60); // Per frame chance
      if (Math.random() < chance) {
        this.lastLightningTime = now;
        // Trigger lightning event - listeners can respond
      }
    }
  }

  /**
   * Get current wind with gusts applied
   */
  getCurrentWind(): { direction: [number, number, number]; speed: number } {
    const wind = this.currentState.wind;
    const gustPhase = Math.sin(this.gustOffset * wind.gustFrequency * Math.PI * 2);
    const gustAmount = gustPhase * wind.gustiness * 0.5 + 0.5;
    const turbulenceNoise = Math.sin(this.gustOffset * 7) * wind.turbulence;

    const speed = wind.speed * (1 + gustAmount + turbulenceNoise);

    // Add slight direction variation from turbulence
    const dirVariation = turbulenceNoise * 0.1;
    const direction: [number, number, number] = [
      wind.direction[0] + dirVariation,
      wind.direction[1],
      wind.direction[2] + dirVariation,
    ];

    // Normalize
    const len = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
    direction[0] /= len;
    direction[1] /= len;
    direction[2] /= len;

    return { direction, speed };
  }

  /**
   * Get weather at specific position (considering zones)
   */
  getWeatherAtPosition(position: [number, number, number]): WeatherState {
    let result = this.deepClone(this.currentState);

    // Find applicable zones sorted by priority
    const applicableZones: { zone: WeatherZone; blend: number }[] = [];

    this.zones.forEach((zone) => {
      const { min, max } = zone.bounds;

      // Check if position is in or near zone
      let insideX = position[0] >= min[0] && position[0] <= max[0];
      let insideY = position[1] >= min[1] && position[1] <= max[1];
      let insideZ = position[2] >= min[2] && position[2] <= max[2];

      if (insideX && insideY && insideZ) {
        applicableZones.push({ zone, blend: 1 });
      } else if (zone.blendDistance > 0) {
        // Calculate distance-based blend
        const distX = insideX ? 0 : Math.min(Math.abs(position[0] - min[0]), Math.abs(position[0] - max[0]));
        const distY = insideY ? 0 : Math.min(Math.abs(position[1] - min[1]), Math.abs(position[1] - max[1]));
        const distZ = insideZ ? 0 : Math.min(Math.abs(position[2] - min[2]), Math.abs(position[2] - max[2]));

        const dist = Math.sqrt(distX ** 2 + distY ** 2 + distZ ** 2);
        if (dist < zone.blendDistance) {
          const blend = 1 - dist / zone.blendDistance;
          applicableZones.push({ zone, blend });
        }
      }
    });

    // Sort by priority and apply
    applicableZones.sort((a, b) => b.zone.priority - a.zone.priority);

    for (const { zone, blend } of applicableZones) {
      const zoneState = this.mergeState(result, zone.weather);
      result = this.lerpState(result, zoneState, blend);
    }

    return result;
  }

  /**
   * Add weather zone
   */
  addZone(zone: Omit<WeatherZone, 'id'>): WeatherZone {
    const newZone: WeatherZone = {
      ...zone,
      id: `zone_${Date.now()}`,
    };
    this.zones.set(newZone.id, newZone);
    return newZone;
  }

  /**
   * Remove weather zone
   */
  removeZone(id: string): boolean {
    return this.zones.delete(id);
  }

  /**
   * Get all zones
   */
  getZones(): WeatherZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Get all presets
   */
  getPresets(): WeatherPreset[] {
    return [...this.presets];
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: WeatherPreset['category']): WeatherPreset[] {
    return this.presets.filter((p) => p.category === category);
  }

  /**
   * Add custom preset
   */
  addPreset(preset: Omit<WeatherPreset, 'id'>): WeatherPreset {
    const newPreset: WeatherPreset = {
      ...preset,
      id: `custom_${Date.now()}`,
    };
    this.presets.push(newPreset);
    return newPreset;
  }

  /**
   * Subscribe to weather changes
   */
  subscribe(callback: (state: WeatherState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.getCurrentState();
    this.listeners.forEach((callback) => callback(state));
  }

  /**
   * Export current weather to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.currentState, null, 2);
  }

  /**
   * Import weather from JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const state = JSON.parse(json) as WeatherState;
      this.setState(state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if it's raining
   */
  isRaining(): boolean {
    return this.currentState.rain.enabled && this.currentState.rain.intensity > 0.1;
  }

  /**
   * Check if it's snowing
   */
  isSnowing(): boolean {
    return this.currentState.snow.enabled && this.currentState.snow.intensity > 0.1;
  }

  /**
   * Get visibility distance based on fog and precipitation
   */
  getVisibilityDistance(): number {
    let visibility = 10000; // Default 10km

    if (this.currentState.fog.enabled) {
      visibility = Math.min(visibility, this.currentState.fog.farDistance);
    }

    if (this.isRaining()) {
      visibility = Math.min(visibility, visibility * (1 - this.currentState.rain.intensity * 0.5));
    }

    if (this.isSnowing()) {
      visibility = Math.min(visibility, visibility * (1 - this.currentState.snow.intensity * 0.7));
    }

    return visibility;
  }
}

export const weatherSystem = new WeatherSystemService();
