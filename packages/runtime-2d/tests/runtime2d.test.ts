import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime2D } from '../src/Runtime2D';
import { GameSpec } from '@promptplay/shared-types';

// Mock canvas and context
function createMockCanvas(): HTMLCanvasElement {
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    measureText: vi.fn(() => ({ width: 100 })),
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    lineWidth: 1,
    lineCap: 'butt',
  };

  const canvas = {
    width: 800,
    height: 600,
    getContext: vi.fn(() => context),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    })),
    style: {},
  } as unknown as HTMLCanvasElement;

  return canvas;
}

// Basic game spec for testing
function createTestGameSpec(): GameSpec {
  return {
    version: '1.0',
    metadata: {
      title: 'Test Game',
      genre: 'platformer',
    },
    config: {
      gravity: { x: 0, y: 9.8 },
      worldBounds: { width: 800, height: 600 },
    },
    entities: [
      {
        name: 'player',
        components: {
          transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'player', width: 32, height: 32, tint: 0x4A7E82 },
          collider: { type: 'box', width: 32, height: 32 },
          input: { moveSpeed: 5, jumpForce: -15 },
        },
        tags: ['player'],
      },
      {
        name: 'enemy',
        components: {
          transform: { x: 300, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'enemy', width: 32, height: 32, tint: 0xFF0000 },
          collider: { type: 'box', width: 32, height: 32 },
          health: { current: 100, max: 100 },
        },
        tags: ['enemy'],
      },
      {
        name: 'platform',
        components: {
          transform: { x: 400, y: 500, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'platform', width: 200, height: 32, tint: 0x888888 },
          collider: { type: 'box', width: 200, height: 32, isStatic: true },
        },
        tags: ['platform', 'ground'],
      },
    ],
    systems: ['physics', 'input', 'render'],
  };
}

describe('Runtime2D', () => {
  let runtime: Runtime2D;
  let canvas: HTMLCanvasElement;
  let spec: GameSpec;

  beforeEach(() => {
    canvas = createMockCanvas();
    spec = createTestGameSpec();
  });

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
    }
  });

  describe('constructor', () => {
    it('should create runtime with default config', () => {
      runtime = new Runtime2D(canvas);

      expect(runtime).toBeDefined();
      expect(runtime.isRunning()).toBe(false);
      expect(runtime.isPaused()).toBe(false);
    });

    it('should create runtime with custom config', () => {
      runtime = new Runtime2D(canvas, {
        width: 1024,
        height: 768,
        backgroundColor: 0x000000,
        showDebug: true,
      });

      expect(runtime).toBeDefined();
      expect(runtime.isDebugEnabled()).toBe(true);
    });

    it('should initialize subsystems', () => {
      runtime = new Runtime2D(canvas);

      expect(runtime.getWorld()).toBeDefined();
      expect(runtime.getPhysics()).toBeDefined();
      expect(runtime.getInput()).toBeDefined();
      expect(runtime.getCameraSystem()).toBeDefined();
      expect(runtime.getParticleSystem()).toBeDefined();
      expect(runtime.getCollisionSystem()).toBeDefined();
    });
  });

  describe('loadGameSpec', () => {
    it('should load game spec successfully', async () => {
      runtime = new Runtime2D(canvas);

      await runtime.loadGameSpec(spec);

      expect(runtime.getGameSpec()).toBe(spec);
    });

    it('should populate world with entities', async () => {
      runtime = new Runtime2D(canvas);

      await runtime.loadGameSpec(spec);

      const world = runtime.getWorld();
      // 3 user entities + 1 internal _gameManager entity
      expect(world.getEntities().length).toBe(4);
    });

    it('should create entities with correct names', async () => {
      runtime = new Runtime2D(canvas);

      await runtime.loadGameSpec(spec);

      const world = runtime.getWorld();
      expect(world.getEntityIdByName('player')).toBeDefined();
      expect(world.getEntityIdByName('enemy')).toBeDefined();
      expect(world.getEntityIdByName('platform')).toBeDefined();
    });

    it('should cleanup previous game when loading new spec', async () => {
      runtime = new Runtime2D(canvas);

      await runtime.loadGameSpec(spec);
      const firstWorld = runtime.getWorld();
      // 3 user entities + 1 internal _gameManager entity
      expect(firstWorld.getEntities().length).toBe(4);

      // Load new spec
      const newSpec = {
        ...spec,
        entities: [spec.entities[0]], // Only player
      };
      await runtime.loadGameSpec(newSpec);

      // 1 user entity + 1 internal _gameManager entity
      expect(runtime.getWorld().getEntities().length).toBe(2);
    });
  });

  describe('lifecycle controls', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should start the game loop', () => {
      runtime.start();

      expect(runtime.isRunning()).toBe(true);
      expect(runtime.isPaused()).toBe(false);
    });

    it('should stop the game loop', () => {
      runtime.start();
      runtime.stop();

      expect(runtime.isRunning()).toBe(false);
    });

    it('should pause the game loop', () => {
      runtime.start();
      runtime.pause();

      // When paused, isRunning is false but isPaused is true
      expect(runtime.isRunning()).toBe(false);
      expect(runtime.isPaused()).toBe(true);
    });

    it('should resume the game loop', () => {
      runtime.start();
      runtime.pause();
      runtime.resume();

      expect(runtime.isRunning()).toBe(true);
      expect(runtime.isPaused()).toBe(false);
    });

    it('should warn when starting without loading spec', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const uninitRuntime = new Runtime2D(canvas);
      uninitRuntime.start();

      expect(warnSpy).toHaveBeenCalledWith('Runtime not initialized. Call loadGameSpec first.');

      warnSpy.mockRestore();
      uninitRuntime.destroy();
    });
  });

  describe('accessor methods', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should return game spec', () => {
      expect(runtime.getGameSpec()).toBe(spec);
    });

    it('should return world instance', () => {
      const world = runtime.getWorld();
      expect(world).toBeDefined();
      // 3 user entities + 1 internal _gameManager entity
      expect(world.getEntities().length).toBe(4);
    });

    it('should return physics instance', () => {
      const physics = runtime.getPhysics();
      expect(physics).toBeDefined();
    });

    it('should return input instance', () => {
      const input = runtime.getInput();
      expect(input).toBeDefined();
    });

    it('should return FPS', () => {
      expect(runtime.getFps()).toBe(0); // Not running yet
    });
  });

  describe('camera controls', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should return camera system', () => {
      const camera = runtime.getCameraSystem();
      expect(camera).toBeDefined();
    });

    it('should set camera position', () => {
      runtime.setCameraPosition(100, 200);

      const state = runtime.getCameraSystem().getCameraState();
      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
    });

    it('should set zoom level', () => {
      runtime.setZoom(1.5);

      const state = runtime.getCameraSystem().getCameraState();
      expect(state.zoom).toBe(1.5);
    });

    it('should trigger camera shake', () => {
      // Just verify it doesn't throw
      expect(() => runtime.shakeCamera(10, 0.5)).not.toThrow();
    });

    it('should fit camera to entities', () => {
      const result = runtime.fitCameraToEntities();

      expect(result).toBeDefined();
      expect(result!.x).toBeDefined();
      expect(result!.y).toBeDefined();
      expect(result!.zoom).toBeDefined();
    });

    it('should return null when no visible entities', async () => {
      // Create spec with no sprite entities
      const emptySpec: GameSpec = {
        version: '1.0',
        metadata: { title: 'Empty', genre: 'test' },
        config: { gravity: { x: 0, y: 0 }, worldBounds: { width: 800, height: 600 } },
        entities: [],
        systems: [],
      };

      const emptyRuntime = new Runtime2D(canvas);
      await emptyRuntime.loadGameSpec(emptySpec);

      const result = emptyRuntime.fitCameraToEntities();
      expect(result).toBeNull();

      emptyRuntime.destroy();
    });
  });

  describe('particle effects', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should return particle system', () => {
      const particles = runtime.getParticleSystem();
      expect(particles).toBeDefined();
    });

    it('should emit particles', () => {
      runtime.emitParticles(100, 100, 10);

      const particles = runtime.getParticleSystem().getParticles();
      expect(particles.length).toBe(10);
    });

    it('should emit particles with custom config', () => {
      runtime.emitParticles(100, 100, 5, {
        minSize: 20,
        maxSize: 20,
        startColor: 0xff0000ff,
      });

      const particles = runtime.getParticleSystem().getParticles();
      expect(particles.length).toBe(5);
      expect(particles[0].size).toBe(20);
      expect(particles[0].startColor).toBe(0xff0000ff);
    });
  });

  describe('debug overlay', () => {
    it('should start with debug disabled by default', () => {
      runtime = new Runtime2D(canvas);

      expect(runtime.isDebugEnabled()).toBe(false);
    });

    it('should start with debug enabled when configured', () => {
      runtime = new Runtime2D(canvas, { showDebug: true });

      expect(runtime.isDebugEnabled()).toBe(true);
    });

    it('should toggle debug state', () => {
      runtime = new Runtime2D(canvas);

      expect(runtime.isDebugEnabled()).toBe(false);

      runtime.toggleDebug();
      expect(runtime.isDebugEnabled()).toBe(true);

      runtime.toggleDebug();
      expect(runtime.isDebugEnabled()).toBe(false);
    });
  });

  describe('collision system', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should return collision system', () => {
      const collision = runtime.getCollisionSystem();
      expect(collision).toBeDefined();
    });

    it('should add collision rule via convenience method', () => {
      const handler = vi.fn();

      runtime.onTagCollision('player', 'enemy', handler);

      // Collision system should have the rule registered
      expect(runtime.getCollisionSystem()).toBeDefined();
    });
  });

  describe('entity queries', () => {
    beforeEach(async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
    });

    it('should find entity at point', () => {
      // Player is at (100, 100) with size 32x32
      const entityName = runtime.getEntityAtPoint(100, 100);

      expect(entityName).toBe('player');
    });

    it('should return null when no entity at point', () => {
      const entityName = runtime.getEntityAtPoint(9999, 9999);

      expect(entityName).toBeNull();
    });

    it('should get entity bounds by name', () => {
      const bounds = runtime.getEntityBounds('player');

      expect(bounds).toBeDefined();
      expect(bounds!.x).toBe(100);
      expect(bounds!.y).toBe(100);
      expect(bounds!.width).toBe(32);
      expect(bounds!.height).toBe(32);
    });

    it('should return null for non-existent entity', () => {
      const bounds = runtime.getEntityBounds('nonexistent');

      expect(bounds).toBeNull();
    });

    it('should return topmost entity when overlapping', async () => {
      // Create spec with overlapping entities
      const overlappingSpec: GameSpec = {
        version: '1.0',
        metadata: { title: 'Overlap', genre: 'test' },
        config: { gravity: { x: 0, y: 0 }, worldBounds: { width: 800, height: 600 } },
        entities: [
          {
            name: 'bottom',
            components: {
              transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
              sprite: { texture: 't', width: 50, height: 50, tint: 0x000000 },
            },
            tags: [],
          },
          {
            name: 'top',
            components: {
              transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
              sprite: { texture: 't', width: 50, height: 50, tint: 0xffffff },
            },
            tags: [],
          },
        ],
        systems: [],
      };

      const overlapRuntime = new Runtime2D(canvas);
      await overlapRuntime.loadGameSpec(overlappingSpec);

      // Should return the last entity (top-most in render order)
      const entityName = overlapRuntime.getEntityAtPoint(100, 100);
      expect(entityName).toBe('top');

      overlapRuntime.destroy();
    });
  });

  describe('system configuration', () => {
    it('should disable AI when configured', async () => {
      runtime = new Runtime2D(canvas, { enableAI: false });
      await runtime.loadGameSpec(spec);

      // Verify AI system is not added (can't directly check, but shouldn't crash)
      expect(runtime.getWorld()).toBeDefined();
    });

    it('should disable animations when configured', async () => {
      runtime = new Runtime2D(canvas, { enableAnimations: false });
      await runtime.loadGameSpec(spec);

      expect(runtime.getWorld()).toBeDefined();
    });

    it('should disable camera when configured', async () => {
      runtime = new Runtime2D(canvas, { enableCamera: false });
      await runtime.loadGameSpec(spec);

      expect(runtime.getWorld()).toBeDefined();
    });

    it('should disable particles when configured', async () => {
      runtime = new Runtime2D(canvas, { enableParticles: false });
      await runtime.loadGameSpec(spec);

      expect(runtime.getWorld()).toBeDefined();
    });
  });

  describe('cleanup and destroy', () => {
    it('should cleanup on destroy', async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);
      runtime.start();

      runtime.destroy();

      expect(runtime.isRunning()).toBe(false);
    });

    it('should handle multiple destroy calls', async () => {
      runtime = new Runtime2D(canvas);
      await runtime.loadGameSpec(spec);

      // Should not throw on multiple destroys
      expect(() => {
        runtime.destroy();
        runtime.destroy();
      }).not.toThrow();
    });
  });
});
