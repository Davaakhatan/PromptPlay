import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Audio, Transform } from '@promptplay/ecs-core';

interface AudioSource {
  buffer: AudioBuffer | null;
  name: string;
  loading: boolean;
}

interface PlayingSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  eid: number;
  startTime: number;
}

export class AudioSystem implements ISystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: Map<number, AudioSource> = new Map();
  private playingSounds: Map<number, PlayingSound> = new Map();
  private assetBasePath: string = '/assets/audio/';
  private listenerPosition: { x: number; y: number } = { x: 0, y: 0 };
  private initialized: boolean = false;

  init(world: any): void {
    // AudioContext must be created after user interaction
    // We'll lazily initialize it
  }

  private ensureContext(): boolean {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return true;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('AudioSystem: Web Audio API not available');
      return false;
    }
  }

  setAssetBasePath(path: string): void {
    this.assetBasePath = path.endsWith('/') ? path : path + '/';
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setListenerPosition(x: number, y: number): void {
    this.listenerPosition = { x, y };
    if (this.audioContext?.listener) {
      const listener = this.audioContext.listener;
      if (listener.positionX) {
        listener.positionX.value = x;
        listener.positionY.value = y;
        listener.positionZ.value = 0;
      }
    }
  }

  registerAudioSource(id: number, name: string): void {
    if (!this.sources.has(id)) {
      this.sources.set(id, { buffer: null, name, loading: false });
    }
  }

  async loadAudioSource(id: number): Promise<void> {
    if (!this.ensureContext()) return;

    const source = this.sources.get(id);
    if (!source || source.buffer || source.loading) return;

    source.loading = true;

    try {
      const url = this.assetBasePath + source.name;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      source.buffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn(`AudioSystem: Failed to load audio source ${id}:`, e);
    } finally {
      source.loading = false;
    }
  }

  async preloadAllSources(): Promise<void> {
    const loadPromises: Promise<void>[] = [];
    for (const [id] of this.sources) {
      loadPromises.push(this.loadAudioSource(id));
    }
    await Promise.all(loadPromises);
  }

  update(world: any, deltaTime: number): void {
    if (!(world instanceof GameWorld)) return;
    if (!this.ensureContext()) return;

    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (!hasComponent(w, Audio, eid)) continue;

      const sourceId = Audio.sourceId[eid];
      const isPlaying = Audio.isPlaying[eid] === 1;
      const currentlyPlaying = this.playingSounds.has(eid);

      if (isPlaying && !currentlyPlaying) {
        // Start playing
        this.startSound(world, eid, sourceId);
      } else if (!isPlaying && currentlyPlaying) {
        // Stop playing
        this.stopSound(eid);
      } else if (isPlaying && currentlyPlaying) {
        // Update playing sound
        this.updateSound(world, eid);
      }
    }

    // Clean up finished sounds
    this.cleanupFinishedSounds();
  }

  private startSound(world: GameWorld, eid: number, sourceId: number): void {
    const audioSource = this.sources.get(sourceId);
    if (!audioSource?.buffer || !this.audioContext || !this.masterGain) return;

    const w = world.getWorld();

    // Create audio nodes
    const source = this.audioContext.createBufferSource();
    source.buffer = audioSource.buffer;
    source.playbackRate.value = Audio.pitch[eid] || 1;
    source.loop = Audio.loop[eid] === 1;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = Audio.volume[eid] || 1;

    let pannerNode: PannerNode | undefined;

    // Set up spatial audio if enabled
    if (Audio.spatial[eid] === 1 && hasComponent(w, Transform, eid)) {
      pannerNode = this.audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'linear';
      pannerNode.maxDistance = Audio.maxDistance[eid] || 1000;
      pannerNode.refDistance = 1;
      pannerNode.rolloffFactor = 1;

      const x = Transform.x[eid];
      const y = Transform.y[eid];
      pannerNode.positionX.value = x;
      pannerNode.positionY.value = y;
      pannerNode.positionZ.value = 0;

      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(this.masterGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
    }

    source.start();

    this.playingSounds.set(eid, {
      source,
      gainNode,
      pannerNode,
      eid,
      startTime: this.audioContext.currentTime,
    });

    // Handle non-looping sounds ending
    if (!source.loop) {
      source.onended = () => {
        Audio.isPlaying[eid] = 0;
        this.playingSounds.delete(eid);
      };
    }
  }

  private stopSound(eid: number): void {
    const playing = this.playingSounds.get(eid);
    if (playing) {
      try {
        playing.source.stop();
      } catch (e) {
        // Already stopped
      }
      this.playingSounds.delete(eid);
    }
  }

  private updateSound(world: GameWorld, eid: number): void {
    const playing = this.playingSounds.get(eid);
    if (!playing) return;

    const w = world.getWorld();

    // Update volume
    playing.gainNode.gain.value = Audio.volume[eid] || 1;

    // Update pitch
    playing.source.playbackRate.value = Audio.pitch[eid] || 1;

    // Update spatial position
    if (playing.pannerNode && hasComponent(w, Transform, eid)) {
      playing.pannerNode.positionX.value = Transform.x[eid];
      playing.pannerNode.positionY.value = Transform.y[eid];
    }
  }

  private cleanupFinishedSounds(): void {
    for (const [eid, playing] of this.playingSounds) {
      if (playing.source.loop) continue;

      const buffer = playing.source.buffer;
      if (!buffer || !this.audioContext) continue;

      const elapsed = this.audioContext.currentTime - playing.startTime;
      const duration = buffer.duration / playing.source.playbackRate.value;

      if (elapsed >= duration) {
        this.playingSounds.delete(eid);
      }
    }
  }

  cleanup?(world: any): void {
    // Stop all playing sounds
    for (const [eid] of this.playingSounds) {
      this.stopSound(eid);
    }
    this.playingSounds.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Resume audio context (needed after user interaction)
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Helper functions for controlling audio
export function playAudio(eid: number, volume: number = 1, loop: boolean = false): void {
  Audio.volume[eid] = volume;
  Audio.loop[eid] = loop ? 1 : 0;
  Audio.isPlaying[eid] = 1;
}

export function stopAudio(eid: number): void {
  Audio.isPlaying[eid] = 0;
}

export function setAudioVolume(eid: number, volume: number): void {
  Audio.volume[eid] = Math.max(0, Math.min(1, volume));
}

export function setAudioPitch(eid: number, pitch: number): void {
  Audio.pitch[eid] = Math.max(0.1, Math.min(4, pitch));
}

export function enableSpatialAudio(eid: number, maxDistance: number = 1000): void {
  Audio.spatial[eid] = 1;
  Audio.maxDistance[eid] = maxDistance;
}

export function disableSpatialAudio(eid: number): void {
  Audio.spatial[eid] = 0;
}
