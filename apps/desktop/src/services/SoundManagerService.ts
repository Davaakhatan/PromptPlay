/**
 * Sound Manager Service - Audio playback and management for games
 */

export interface SoundAsset {
  id: string;
  name: string;
  url: string;
  type: 'sfx' | 'music' | 'ambient';
  duration?: number;
  volume: number;
  loop: boolean;
}

export interface SoundInstance {
  id: string;
  assetId: string;
  audio: HTMLAudioElement;
  isPlaying: boolean;
  startTime: number;
}

class SoundManagerService {
  private sounds: Map<string, SoundAsset> = new Map();
  private instances: Map<string, SoundInstance> = new Map();
  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 1.0;
  private ambientVolume: number = 1.0;
  private currentMusic: SoundInstance | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new AudioContext();
        }
        window.removeEventListener('click', initAudio);
        window.removeEventListener('keydown', initAudio);
      };
      window.addEventListener('click', initAudio);
      window.addEventListener('keydown', initAudio);
    }
  }

  /**
   * Register a sound asset
   */
  registerSound(asset: SoundAsset): void {
    this.sounds.set(asset.id, asset);
  }

  /**
   * Register multiple sound assets
   */
  registerSounds(assets: SoundAsset[]): void {
    assets.forEach(asset => this.registerSound(asset));
  }

  /**
   * Get all registered sounds
   */
  getSounds(): SoundAsset[] {
    return Array.from(this.sounds.values());
  }

  /**
   * Get sounds by type
   */
  getSoundsByType(type: SoundAsset['type']): SoundAsset[] {
    return this.getSounds().filter(s => s.type === type);
  }

  /**
   * Load a sound from URL
   */
  async loadSound(url: string, name?: string, type: SoundAsset['type'] = 'sfx'): Promise<SoundAsset> {
    const id = `sound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const asset: SoundAsset = {
      id,
      name: name || url.split('/').pop() || 'Untitled',
      url,
      type,
      volume: 1.0,
      loop: type === 'music' || type === 'ambient',
    };

    // Preload to get duration
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
        asset.duration = audio.duration;
        resolve();
      });
      audio.addEventListener('error', () => {
        reject(new Error(`Failed to load audio: ${url}`));
      });
    });

    this.registerSound(asset);
    return asset;
  }

  /**
   * Play a sound effect (one-shot)
   */
  playSFX(soundId: string, volume?: number): SoundInstance | null {
    const asset = this.sounds.get(soundId);
    if (!asset) {
      console.warn(`Sound not found: ${soundId}`);
      return null;
    }

    const audio = new Audio(asset.url);
    audio.volume = (volume ?? asset.volume) * this.sfxVolume * this.masterVolume;
    audio.loop = false;

    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instance: SoundInstance = {
      id: instanceId,
      assetId: soundId,
      audio,
      isPlaying: true,
      startTime: Date.now(),
    };

    this.instances.set(instanceId, instance);

    audio.play().catch(err => {
      console.error('Failed to play sound:', err);
      instance.isPlaying = false;
    });

    audio.addEventListener('ended', () => {
      instance.isPlaying = false;
      this.instances.delete(instanceId);
    });

    return instance;
  }

  /**
   * Play background music (replaces current music)
   */
  playMusic(soundId: string, fadeIn: number = 0): SoundInstance | null {
    const asset = this.sounds.get(soundId);
    if (!asset) {
      console.warn(`Sound not found: ${soundId}`);
      return null;
    }

    // Stop current music
    if (this.currentMusic) {
      this.stopMusic(fadeIn > 0 ? fadeIn / 2 : 0);
    }

    const audio = new Audio(asset.url);
    audio.loop = true;

    const targetVolume = asset.volume * this.musicVolume * this.masterVolume;

    if (fadeIn > 0) {
      audio.volume = 0;
      this.fadeAudio(audio, 0, targetVolume, fadeIn);
    } else {
      audio.volume = targetVolume;
    }

    const instanceId = `music_${Date.now()}`;
    const instance: SoundInstance = {
      id: instanceId,
      assetId: soundId,
      audio,
      isPlaying: true,
      startTime: Date.now(),
    };

    this.instances.set(instanceId, instance);
    this.currentMusic = instance;

    audio.play().catch(err => {
      console.error('Failed to play music:', err);
      instance.isPlaying = false;
    });

    return instance;
  }

  /**
   * Stop current music
   */
  stopMusic(fadeOut: number = 0): void {
    if (!this.currentMusic) return;

    const instance = this.currentMusic;

    if (fadeOut > 0) {
      this.fadeAudio(instance.audio, instance.audio.volume, 0, fadeOut, () => {
        instance.audio.pause();
        instance.isPlaying = false;
        this.instances.delete(instance.id);
      });
    } else {
      instance.audio.pause();
      instance.isPlaying = false;
      this.instances.delete(instance.id);
    }

    this.currentMusic = null;
  }

  /**
   * Pause/resume music
   */
  toggleMusic(): boolean {
    if (!this.currentMusic) return false;

    if (this.currentMusic.isPlaying) {
      this.currentMusic.audio.pause();
      this.currentMusic.isPlaying = false;
    } else {
      this.currentMusic.audio.play();
      this.currentMusic.isPlaying = true;
    }

    return this.currentMusic.isPlaying;
  }

  /**
   * Play ambient sound (can have multiple)
   */
  playAmbient(soundId: string, volume?: number): SoundInstance | null {
    const asset = this.sounds.get(soundId);
    if (!asset) {
      console.warn(`Sound not found: ${soundId}`);
      return null;
    }

    const audio = new Audio(asset.url);
    audio.volume = (volume ?? asset.volume) * this.ambientVolume * this.masterVolume;
    audio.loop = true;

    const instanceId = `ambient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instance: SoundInstance = {
      id: instanceId,
      assetId: soundId,
      audio,
      isPlaying: true,
      startTime: Date.now(),
    };

    this.instances.set(instanceId, instance);

    audio.play().catch(err => {
      console.error('Failed to play ambient:', err);
      instance.isPlaying = false;
    });

    return instance;
  }

  /**
   * Stop a specific sound instance
   */
  stopSound(instanceId: string, fadeOut: number = 0): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (fadeOut > 0) {
      this.fadeAudio(instance.audio, instance.audio.volume, 0, fadeOut, () => {
        instance.audio.pause();
        instance.isPlaying = false;
        this.instances.delete(instanceId);
      });
    } else {
      instance.audio.pause();
      instance.isPlaying = false;
      this.instances.delete(instanceId);
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(fadeOut: number = 0): void {
    this.instances.forEach((_, id) => this.stopSound(id, fadeOut));
    this.currentMusic = null;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set SFX volume (0-1)
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set ambient volume (0-1)
   */
  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Get volume levels
   */
  getVolumes(): { master: number; sfx: number; music: number; ambient: number } {
    return {
      master: this.masterVolume,
      sfx: this.sfxVolume,
      music: this.musicVolume,
      ambient: this.ambientVolume,
    };
  }

  /**
   * Update volumes on all playing sounds
   */
  private updateAllVolumes(): void {
    this.instances.forEach(instance => {
      const asset = this.sounds.get(instance.assetId);
      if (!asset) return;

      let typeVolume = this.sfxVolume;
      if (asset.type === 'music') typeVolume = this.musicVolume;
      if (asset.type === 'ambient') typeVolume = this.ambientVolume;

      instance.audio.volume = asset.volume * typeVolume * this.masterVolume;
    });
  }

  /**
   * Fade audio volume
   */
  private fadeAudio(
    audio: HTMLAudioElement,
    from: number,
    to: number,
    duration: number,
    onComplete?: () => void
  ): void {
    const startTime = Date.now();
    const diff = to - from;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      audio.volume = from + diff * progress;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else if (onComplete) {
        onComplete();
      }
    };

    requestAnimationFrame(tick);
  }

  /**
   * Get currently playing instances
   */
  getPlayingInstances(): SoundInstance[] {
    return Array.from(this.instances.values()).filter(i => i.isPlaying);
  }

  /**
   * Check if music is currently playing
   */
  isMusicPlaying(): boolean {
    return this.currentMusic?.isPlaying ?? false;
  }

  /**
   * Remove a sound asset
   */
  removeSound(soundId: string): void {
    // Stop any playing instances of this sound
    this.instances.forEach((instance, id) => {
      if (instance.assetId === soundId) {
        this.stopSound(id);
      }
    });
    this.sounds.delete(soundId);
  }

  /**
   * Clear all sounds
   */
  clearAll(): void {
    this.stopAll();
    this.sounds.clear();
  }
}

// Singleton instance
export const soundManager = new SoundManagerService();

// Default sound presets for common game sounds
export const SOUND_PRESETS = {
  jump: { type: 'sfx' as const, volume: 0.7 },
  coin: { type: 'sfx' as const, volume: 0.6 },
  explosion: { type: 'sfx' as const, volume: 0.8 },
  hit: { type: 'sfx' as const, volume: 0.7 },
  shoot: { type: 'sfx' as const, volume: 0.5 },
  powerup: { type: 'sfx' as const, volume: 0.7 },
  gameover: { type: 'sfx' as const, volume: 0.8 },
  victory: { type: 'music' as const, volume: 0.6 },
  ambient_wind: { type: 'ambient' as const, volume: 0.3 },
  ambient_rain: { type: 'ambient' as const, volume: 0.4 },
};
