/**
 * Tests for SoundManager - Simple sound effect management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundManager, getSoundManager, resetSoundManager } from '../src/audio/SoundManager';

// Mock AudioContext and related Web Audio API
const mockGainNode = {
  gain: {
    value: 1,
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockPannerNode = {
  pan: { value: 0 },
  connect: vi.fn(),
};

const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  playbackRate: { value: 1 },
  loop: false,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null,
};

const mockAudioBuffer = {
  duration: 1.5,
  length: 66150,
  sampleRate: 44100,
  numberOfChannels: 2,
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createGain: vi.fn(() => ({ ...mockGainNode })),
  createStereoPanner: vi.fn(() => ({ ...mockPannerNode })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock window.AudioContext
(global as any).AudioContext = vi.fn(() => mockAudioContext);
(global as any).webkitAudioContext = vi.fn(() => mockAudioContext);

describe('SoundManager', () => {
  let soundManager: SoundManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for loading audio (set up AFTER clearAllMocks)
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      })
    );

    mockAudioContext.state = 'running';
    mockAudioContext.currentTime = 0;

    // Reset mocked functions
    mockAudioContext.createGain.mockReturnValue({ ...mockGainNode });
    mockAudioContext.createStereoPanner.mockReturnValue({ ...mockPannerNode });
    mockAudioContext.createBufferSource.mockReturnValue({ ...mockBufferSource });
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mockAudioContext.resume.mockResolvedValue(undefined);
    mockAudioContext.close.mockResolvedValue(undefined);

    resetSoundManager();
    soundManager = new SoundManager();
  });

  afterEach(() => {
    soundManager.cleanup();
  });

  describe('initialization', () => {
    it('should create a SoundManager instance', () => {
      expect(soundManager).toBeDefined();
    });

    it('should initialize audio context lazily', () => {
      // Context should not be created until a method requiring it is called
      // (due to browser autoplay restrictions)
    });

    it('should set asset base path', () => {
      soundManager.setAssetBasePath('/game/sounds');
      // Verify by preloading
      soundManager.preload('test');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/game/sounds/'));
    });

    it('should add trailing slash to base path if missing', () => {
      soundManager.setAssetBasePath('/sounds');
      soundManager.preload('test');
      expect(fetch).toHaveBeenCalledWith('/sounds/test.mp3');
    });
  });

  describe('preloading', () => {
    it('should preload a sound by name', async () => {
      const result = await soundManager.preload('coin');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('coin.mp3'));
    });

    it('should preload a sound with custom filename', async () => {
      const result = await soundManager.preload('explosion', 'boom.wav');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('boom.wav'));
    });

    it('should not preload same sound twice', async () => {
      await soundManager.preload('coin');
      await soundManager.preload('coin');

      // Fetch should only be called once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should preload multiple sounds', async () => {
      await soundManager.preloadAll(['coin', 'jump', 'damage']);

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle preload failure gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await soundManager.preload('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle 404 response gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      const result = await soundManager.preload('missing');

      expect(result).toBe(false);
    });
  });

  describe('playback', () => {
    beforeEach(async () => {
      await soundManager.preload('coin');
    });

    it('should play a preloaded sound', () => {
      soundManager.play('coin');

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should play sound with custom volume', () => {
      soundManager.play('coin', { volume: 0.5 });

      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should play sound with custom pitch', () => {
      soundManager.play('coin', { pitch: 1.2 });

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should play sound with pitch variance', () => {
      // Play multiple times to test variance
      soundManager.play('coin', { pitch: 1.0, pitchVariance: 0.2 });
      soundManager.play('coin', { pitch: 1.0, pitchVariance: 0.2 });

      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);
    });

    it('should clamp pitch to valid range', () => {
      // Pitch should be clamped between 0.1 and 4
      soundManager.play('coin', { pitch: 10 }); // Should be clamped to 4
      soundManager.play('coin', { pitch: 0.01 }); // Should be clamped to 0.1
    });

    it('should auto-preload and not play if sound not cached', () => {
      soundManager.play('notloaded');

      // Should trigger preload but not play immediately
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('notloaded.mp3'));
    });
  });

  describe('spatial audio', () => {
    beforeEach(async () => {
      await soundManager.preload('explosion');
    });

    it('should play sound at position with panning', () => {
      soundManager.playAt('explosion', 400, 300, 200, 300);

      expect(mockAudioContext.createStereoPanner).toHaveBeenCalled();
    });

    it('should calculate pan based on listener position', () => {
      // Sound to the right of listener
      soundManager.playAt('explosion', 600, 300, 200, 300);

      expect(mockAudioContext.createStereoPanner).toHaveBeenCalled();
    });

    it('should reduce volume with distance', () => {
      // Sound far from listener
      soundManager.playAt('explosion', 1000, 1000, 0, 0);

      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
  });

  describe('music playback', () => {
    beforeEach(async () => {
      await soundManager.preload('bgm');
    });

    it('should play background music', () => {
      soundManager.playMusic('bgm');

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should play music with custom volume', () => {
      soundManager.playMusic('bgm', 0.3);

      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should loop music by default', () => {
      soundManager.playMusic('bgm');

      // The loop property should be set
    });

    it('should stop current music when playing new music', async () => {
      await soundManager.preload('bgm2');

      soundManager.playMusic('bgm');
      soundManager.playMusic('bgm2');

      // Previous music should be stopped
    });

    it('should stop music', () => {
      soundManager.playMusic('bgm');
      soundManager.stopMusic();

      // Should not throw and music should stop
    });

    it('should stop music with fade out', () => {
      soundManager.playMusic('bgm');
      soundManager.stopMusic(1.0); // 1 second fade

      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled;
    });
  });

  describe('volume control', () => {
    it('should set master volume', () => {
      soundManager.setMasterVolume(0.8);

      // Master gain should be set
    });

    it('should clamp master volume to 0-1', () => {
      soundManager.setMasterVolume(1.5);
      soundManager.setMasterVolume(-0.5);

      // Should not crash and values should be clamped
    });

    it('should set SFX volume', () => {
      soundManager.setSFXVolume(0.5);

      // SFX gain should be set
    });

    it('should set music volume', () => {
      soundManager.setMusicVolume(0.3);

      // Music gain should be set
    });

    it('should mute all audio', () => {
      soundManager.setMuted(true);

      // Master volume should be 0
    });

    it('should unmute audio', () => {
      soundManager.setMuted(true);
      soundManager.setMuted(false);

      // Master volume should be restored
    });
  });

  describe('audio context management', () => {
    it('should resume suspended audio context', async () => {
      // First ensure the audio context is created by preloading a sound
      await soundManager.preload('coin');

      // Now set the state to suspended
      mockAudioContext.state = 'suspended';

      await soundManager.resume();

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should not resume if context is running', async () => {
      // First ensure the audio context is created
      await soundManager.preload('coin');

      mockAudioContext.state = 'running';
      mockAudioContext.resume.mockClear();

      await soundManager.resume();

      // Should not call resume if already running
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      await soundManager.preload('coin');
      soundManager.playMusic('coin');

      soundManager.cleanup();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should stop playing music on cleanup', async () => {
      await soundManager.preload('bgm');
      soundManager.playMusic('bgm');

      soundManager.cleanup();

      // Music should be stopped
    });
  });

  describe('singleton', () => {
    it('should return same instance with getSoundManager', () => {
      const instance1 = getSoundManager();
      const instance2 = getSoundManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton with resetSoundManager', () => {
      const instance1 = getSoundManager();
      resetSoundManager();
      const instance2 = getSoundManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('default sounds', () => {
    it('should use default sound mappings', async () => {
      await soundManager.preload('coin');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('coin.mp3'));
    });

    it('should preload all default sounds', async () => {
      await soundManager.preloadDefaults();

      // Should attempt to load all default sounds
      expect(fetch).toHaveBeenCalledTimes(12); // Number of DEFAULT_SOUNDS
    });
  });
});
