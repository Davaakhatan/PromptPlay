/**
 * SoundManager - Simple sound effect management for game events
 * Works alongside AudioSystem for easy one-shot sound playback
 */

export interface SoundConfig {
  volume?: number;
  pitch?: number;
  pitchVariance?: number; // Random pitch variation for variety
  spatial?: boolean;
}

interface CachedSound {
  buffer: AudioBuffer;
  name: string;
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sounds: Map<string, CachedSound> = new Map();
  private assetBasePath: string = '/assets/audio/';
  private currentMusic: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;
  private initialized: boolean = false;

  // Default sound effect mappings
  private static readonly DEFAULT_SOUNDS: Record<string, string> = {
    coin: 'coin.mp3',
    jump: 'jump.mp3',
    land: 'land.mp3',
    damage: 'damage.mp3',
    death: 'death.mp3',
    powerup: 'powerup.mp3',
    select: 'select.mp3',
    click: 'click.mp3',
    win: 'win.mp3',
    lose: 'lose.mp3',
    explosion: 'explosion.mp3',
    shoot: 'shoot.mp3',
  };

  setAssetBasePath(path: string): void {
    this.assetBasePath = path.endsWith('/') ? path : path + '/';
  }

  private ensureContext(): boolean {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return true;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // SFX channel
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);

      // Music channel
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('SoundManager: Web Audio API not available');
      return false;
    }
  }

  /**
   * Preload a sound effect by name
   */
  async preload(name: string, filename?: string): Promise<boolean> {
    if (!this.ensureContext()) return false;
    if (this.sounds.has(name)) return true;

    const actualFilename = filename || SoundManager.DEFAULT_SOUNDS[name] || `${name}.mp3`;
    const url = this.assetBasePath + actualFilename;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`SoundManager: Could not load ${url}`);
        return false;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.sounds.set(name, { buffer, name: actualFilename });
      return true;
    } catch (e) {
      console.warn(`SoundManager: Failed to load sound '${name}':`, e);
      return false;
    }
  }

  /**
   * Preload multiple sounds
   */
  async preloadAll(sounds: string[]): Promise<void> {
    await Promise.all(sounds.map(s => this.preload(s)));
  }

  /**
   * Preload all default game sounds
   */
  async preloadDefaults(): Promise<void> {
    await this.preloadAll(Object.keys(SoundManager.DEFAULT_SOUNDS));
  }

  /**
   * Play a one-shot sound effect
   */
  play(name: string, config: SoundConfig = {}): void {
    if (!this.ensureContext() || !this.sfxGain) return;

    const cached = this.sounds.get(name);
    if (!cached) {
      // Try to load and play (async, won't play this time)
      this.preload(name);
      return;
    }

    const source = this.audioContext!.createBufferSource();
    source.buffer = cached.buffer;

    // Apply pitch with optional variance
    let pitch = config.pitch ?? 1;
    if (config.pitchVariance) {
      pitch += (Math.random() * 2 - 1) * config.pitchVariance;
    }
    source.playbackRate.value = Math.max(0.1, Math.min(4, pitch));

    // Create gain node for this sound
    const gainNode = this.audioContext!.createGain();
    gainNode.gain.value = config.volume ?? 1;

    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start();
  }

  /**
   * Play sound at a specific position (for spatial audio effect)
   */
  playAt(name: string, x: number, y: number, listenerX: number, listenerY: number, config: SoundConfig = {}): void {
    if (!this.ensureContext() || !this.sfxGain) return;

    const cached = this.sounds.get(name);
    if (!cached) {
      this.preload(name);
      return;
    }

    // Calculate panning based on position
    const dx = x - listenerX;
    const maxPanDistance = 400; // Distance at which pan is at max
    const pan = Math.max(-1, Math.min(1, dx / maxPanDistance));

    // Calculate volume falloff
    const dy = y - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = config.spatial ? 800 : 400;
    const volumeFalloff = Math.max(0, 1 - distance / maxDistance);

    const source = this.audioContext!.createBufferSource();
    source.buffer = cached.buffer;

    let pitch = config.pitch ?? 1;
    if (config.pitchVariance) {
      pitch += (Math.random() * 2 - 1) * config.pitchVariance;
    }
    source.playbackRate.value = Math.max(0.1, Math.min(4, pitch));

    // Create stereo panner
    const panner = this.audioContext!.createStereoPanner();
    panner.pan.value = pan;

    const gainNode = this.audioContext!.createGain();
    gainNode.gain.value = (config.volume ?? 1) * volumeFalloff;

    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.sfxGain);

    source.start();
  }

  /**
   * Play background music (loops by default)
   */
  playMusic(name: string, volume: number = 0.5, loop: boolean = true): void {
    if (!this.ensureContext() || !this.musicGain) return;

    // Stop current music
    this.stopMusic();

    const cached = this.sounds.get(name);
    if (!cached) {
      // Load and play when ready
      this.preload(name).then(loaded => {
        if (loaded) this.playMusic(name, volume, loop);
      });
      return;
    }

    this.currentMusic = this.audioContext!.createBufferSource();
    this.currentMusic.buffer = cached.buffer;
    this.currentMusic.loop = loop;

    this.currentMusicGain = this.audioContext!.createGain();
    this.currentMusicGain.gain.value = volume;

    this.currentMusic.connect(this.currentMusicGain);
    this.currentMusicGain.connect(this.musicGain);

    this.currentMusic.start();
  }

  /**
   * Stop current background music
   */
  stopMusic(fadeOut: number = 0): void {
    if (!this.currentMusic || !this.currentMusicGain) return;

    if (fadeOut > 0 && this.audioContext) {
      // Fade out
      this.currentMusicGain.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + fadeOut
      );
      const music = this.currentMusic;
      setTimeout(() => {
        try { music.stop(); } catch {}
      }, fadeOut * 1000);
    } else {
      try { this.currentMusic.stop(); } catch {}
    }

    this.currentMusic = null;
    this.currentMusicGain = null;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set sound effects volume (0-1)
   */
  setSFXVolume(volume: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    if (this.currentMusicGain) {
      // Also update currently playing music
      this.currentMusicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void {
    this.setMasterVolume(muted ? 0 : 1);
  }

  /**
   * Resume audio context (call after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMusic();
    this.sounds.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}

// Singleton instance for global access
let soundManagerInstance: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
}

export function resetSoundManager(): void {
  if (soundManagerInstance) {
    soundManagerInstance.cleanup();
    soundManagerInstance = null;
  }
}
