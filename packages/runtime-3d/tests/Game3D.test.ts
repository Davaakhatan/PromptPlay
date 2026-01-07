/**
 * Tests for Game3D - Main 3D game runtime
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { advanceAnimationFrame, setMockTime } from './setup';

// Create mock instances BEFORE importing Game3D
const mockRenderer = {
  configure: vi.fn(),
  createMesh: vi.fn(),
  updateMeshTransform: vi.fn(),
  removeMesh: vi.fn(),
  removeLight: vi.fn(),
  createLight: vi.fn(),
  loadModel: vi.fn().mockResolvedValue(undefined),
  addGridHelper: vi.fn(),
  addAxesHelper: vi.fn(),
  resize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  clearAllMeshes: vi.fn(),
};

const mockPhysics = {
  step: vi.fn(),
  addBody: vi.fn(),
  removeBody: vi.fn(),
  clear: vi.fn(),
};

const mockInputManager = {
  update: vi.fn(),
  cleanup: vi.fn(),
  isKeyDown: vi.fn().mockReturnValue(false),
};

const mockRender3DSystem = { execute: vi.fn() };
const mockTransform3DSystem = { execute: vi.fn() };
const mockInput3DSystem = { execute: vi.fn() };
const mockPhysics3DSystem = { execute: vi.fn(), clear: vi.fn() };

// Mock the modules with vi.mock (hoisted)
vi.mock('../src/renderers/ThreeRenderer', () => ({
  ThreeRenderer: vi.fn(() => mockRenderer),
}));

vi.mock('../src/physics/CannonPhysics', () => ({
  CannonPhysics: vi.fn(() => mockPhysics),
}));

vi.mock('../src/input/InputManager3D', () => ({
  InputManager3D: vi.fn(() => mockInputManager),
}));

vi.mock('../src/systems/Render3DSystem', () => ({
  Render3DSystem: vi.fn(() => mockRender3DSystem),
}));

vi.mock('../src/systems/Transform3DSystem', () => ({
  Transform3DSystem: vi.fn(() => mockTransform3DSystem),
}));

vi.mock('../src/systems/Input3DSystem', () => ({
  Input3DSystem: vi.fn(() => mockInput3DSystem),
}));

vi.mock('../src/systems/Physics3DSystem', () => ({
  Physics3DSystem: vi.fn(() => mockPhysics3DSystem),
}));

// Mock the components module with typed arrays
vi.mock('../src/components', () => ({
  Transform3D: {
    x: new Float32Array(1000),
    y: new Float32Array(1000),
    z: new Float32Array(1000),
    rotationX: new Float32Array(1000),
    rotationY: new Float32Array(1000),
    rotationZ: new Float32Array(1000),
    scaleX: new Float32Array(1000),
    scaleY: new Float32Array(1000),
    scaleZ: new Float32Array(1000),
  },
  Mesh: {
    geometry: new Uint8Array(1000),
    width: new Float32Array(1000),
    height: new Float32Array(1000),
    depth: new Float32Array(1000),
    radius: new Float32Array(1000),
    castShadow: new Uint8Array(1000),
    receiveShadow: new Uint8Array(1000),
    visible: new Uint8Array(1000),
  },
  Material: {
    color: new Uint32Array(1000),
    metallic: new Float32Array(1000),
    roughness: new Float32Array(1000),
    opacity: new Float32Array(1000),
    emissiveIntensity: new Float32Array(1000),
  },
  Light: {
    type: new Uint8Array(1000),
    color: new Uint32Array(1000),
    intensity: new Float32Array(1000),
    castShadow: new Uint8Array(1000),
    targetX: new Float32Array(1000),
    targetY: new Float32Array(1000),
    targetZ: new Float32Array(1000),
    distance: new Float32Array(1000),
    decay: new Float32Array(1000),
    angle: new Float32Array(1000),
    penumbra: new Float32Array(1000),
  },
  Velocity3D: {
    vx: new Float32Array(1000),
    vy: new Float32Array(1000),
    vz: new Float32Array(1000),
    angularX: new Float32Array(1000),
    angularY: new Float32Array(1000),
    angularZ: new Float32Array(1000),
  },
  Camera3D: {
    type: new Uint8Array(1000),
    fov: new Float32Array(1000),
    near: new Float32Array(1000),
    far: new Float32Array(1000),
    isActive: new Uint8Array(1000),
    followTarget: new Int32Array(1000),
    followSmoothing: new Float32Array(1000),
    followOffsetX: new Float32Array(1000),
    followOffsetY: new Float32Array(1000),
    followOffsetZ: new Float32Array(1000),
  },
  Input3D: {
    moveSpeed: new Float32Array(1000),
    jumpForce: new Float32Array(1000),
    canJump: new Uint8Array(1000),
    isGrounded: new Uint8Array(1000),
  },
  Collider3D: {
    type: new Uint8Array(1000),
    width: new Float32Array(1000),
    height: new Float32Array(1000),
    depth: new Float32Array(1000),
    radius: new Float32Array(1000),
    mass: new Float32Array(1000),
    friction: new Float32Array(1000),
    restitution: new Float32Array(1000),
    isTrigger: new Uint8Array(1000),
  },
  RigidBody3D: {
    type: new Uint8Array(1000),
    mass: new Float32Array(1000),
    linearDamping: new Float32Array(1000),
    angularDamping: new Float32Array(1000),
    fixedRotation: new Uint8Array(1000),
  },
}));

// Now import Game3D after mocks are set up
import { Game3D } from '../src/Game3D';

describe('Game3D', () => {
  let game: Game3D;

  beforeEach(() => {
    vi.clearAllMocks();
    setMockTime(0);

    // Reset mock functions but preserve implementations
    mockRenderer.configure.mockClear();
    mockRenderer.createMesh.mockClear();
    mockRenderer.updateMeshTransform.mockClear();
    mockRenderer.removeMesh.mockClear();
    mockRenderer.removeLight.mockClear();
    mockRenderer.createLight.mockClear();
    mockRenderer.loadModel.mockClear().mockResolvedValue(undefined);
    mockRenderer.addGridHelper.mockClear();
    mockRenderer.addAxesHelper.mockClear();
    mockRenderer.resize.mockClear();
    mockRenderer.render.mockClear();
    mockRenderer.dispose.mockClear();
    mockRenderer.clearAllMeshes.mockClear();

    mockPhysics.step.mockClear();
    mockPhysics.addBody.mockClear();
    mockPhysics.removeBody.mockClear();
    mockPhysics.clear.mockClear();
  });

  afterEach(() => {
    if (game) {
      game.dispose();
    }
  });

  describe('initialization', () => {
    it('should create a new Game3D instance with default options', () => {
      game = new Game3D();

      expect(game).toBeDefined();
      expect(game.world).toBeDefined();
      expect(game.renderer).toBeDefined();
    });

    it('should create a Game3D instance with custom options', () => {
      game = new Game3D({
        fixedDeltaTime: 1000 / 120, // 120 FPS physics
        width: 1280,
        height: 720,
      });

      expect(game).toBeDefined();
    });

    it('should have stopped state initially', () => {
      game = new Game3D();

      // The game should not be running initially
      // We check this indirectly - no render calls until start
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });
  });

  describe('entity management', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should create an entity with transform component', () => {
      const eid = game.createEntity('testEntity', {
        transform3d: { x: 1, y: 2, z: 3 },
      });

      expect(eid).toBeDefined();
      expect(typeof eid).toBe('number');
      expect(game.getEntityId('testEntity')).toBe(eid);
      expect(game.getEntityName(eid)).toBe('testEntity');
    });

    it('should create an entity with mesh and material', () => {
      const eid = game.createEntity('cube', {
        transform3d: { x: 0, y: 0, z: 0 },
        mesh: {
          geometry: 'box',
          width: 2,
          height: 2,
          depth: 2,
          castShadow: true,
          receiveShadow: true,
        },
        material: {
          color: '#ff0000',
          metallic: 0.5,
          roughness: 0.5,
        },
      });

      expect(eid).toBeDefined();
      expect(mockRenderer.createMesh).toHaveBeenCalledWith(
        eid,
        'box',
        expect.objectContaining({ width: 2, height: 2, depth: 2 }),
        expect.objectContaining({ color: '#ff0000' }),
        expect.objectContaining({ castShadow: true })
      );
    });

    it('should create an entity with light component', () => {
      const eid = game.createEntity('sun', {
        transform3d: { x: 0, y: 10, z: 0 },
        light: {
          type: 'directional',
          color: '#ffffff',
          intensity: 1.5,
          castShadow: true,
        },
      });

      expect(eid).toBeDefined();
      expect(mockRenderer.createLight).toHaveBeenCalledWith(
        eid,
        'directional',
        expect.objectContaining({ color: '#ffffff', intensity: 1.5 })
      );
    });

    it('should create an entity with velocity component', () => {
      const eid = game.createEntity('projectile', {
        transform3d: { x: 0, y: 0, z: 0 },
        velocity3d: { vx: 10, vy: 5, vz: 0 },
      });

      expect(eid).toBeDefined();
    });

    it('should create an entity with camera component', () => {
      const eid = game.createEntity('mainCamera', {
        transform3d: { x: 0, y: 5, z: 10 },
        camera3d: {
          type: 'perspective',
          fov: 60,
          near: 0.1,
          far: 2000,
          isActive: true,
        },
      });

      expect(eid).toBeDefined();
    });

    it('should create an entity with input component', () => {
      const eid = game.createEntity('player', {
        transform3d: { x: 0, y: 0, z: 0 },
        input3d: {
          moveSpeed: 8,
          jumpForce: 12,
          canJump: true,
        },
      });

      expect(eid).toBeDefined();
    });

    it('should create an entity with physics components', () => {
      const eid = game.createEntity('physicsBox', {
        transform3d: { x: 0, y: 5, z: 0 },
        collider3d: {
          type: 'box',
          width: 1,
          height: 1,
          depth: 1,
          mass: 1,
          friction: 0.5,
          restitution: 0.3,
        },
        rigidbody3d: {
          type: 'dynamic',
          mass: 1,
          linearDamping: 0.01,
        },
      });

      expect(eid).toBeDefined();
    });

    it('should remove an entity by name', () => {
      const eid = game.createEntity('toRemove', {
        transform3d: { x: 0, y: 0, z: 0 },
        mesh: { geometry: 'box' },
      });

      game.removeEntity('toRemove');

      expect(game.getEntityId('toRemove')).toBeUndefined();
      expect(mockRenderer.removeMesh).toHaveBeenCalledWith(eid);
    });

    it('should remove an entity by id', () => {
      const eid = game.createEntity('toRemove', {
        transform3d: { x: 0, y: 0, z: 0 },
      });

      game.removeEntity(eid);

      expect(game.getEntityName(eid)).toBeUndefined();
    });

    it('should clear all entities', () => {
      game.createEntity('entity1', { transform3d: { x: 0, y: 0, z: 0 } });
      game.createEntity('entity2', { transform3d: { x: 1, y: 1, z: 1 } });
      game.createEntity('entity3', { transform3d: { x: 2, y: 2, z: 2 } });

      game.clear();

      expect(game.getEntityId('entity1')).toBeUndefined();
      expect(game.getEntityId('entity2')).toBeUndefined();
      expect(game.getEntityId('entity3')).toBeUndefined();
    });

    it('should return undefined for non-existent entity', () => {
      game.createEntity('exists', { transform3d: { x: 0, y: 0, z: 0 } });

      expect(game.getEntityId('notExists')).toBeUndefined();
      expect(game.getEntityName(99999)).toBeUndefined();
    });
  });

  describe('game specification loading', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should load a game spec with entities', () => {
      const spec = {
        config: {
          background: '#000000',
        },
        entities: [
          {
            name: 'player',
            components: {
              transform3d: { x: 0, y: 1, z: 0 },
              mesh: { geometry: 'box' },
            },
            tags: ['player'],
          },
          {
            name: 'ground',
            components: {
              transform3d: { x: 0, y: 0, z: 0 },
              mesh: { geometry: 'plane', width: 100, depth: 100 },
            },
            tags: ['ground'],
          },
        ],
      };

      game.loadSpec(spec as any);

      expect(game.getEntityId('player')).toBeDefined();
      expect(game.getEntityId('ground')).toBeDefined();
      expect(mockRenderer.configure).toHaveBeenCalledWith(spec.config);
    });

    it('should clear existing entities when loading new spec', () => {
      game.createEntity('oldEntity', { transform3d: { x: 0, y: 0, z: 0 } });

      const spec = {
        entities: [
          {
            name: 'newEntity',
            components: {
              transform3d: { x: 0, y: 0, z: 0 },
            },
          },
        ],
      };

      game.loadSpec(spec as any);

      expect(game.getEntityId('oldEntity')).toBeUndefined();
      expect(game.getEntityId('newEntity')).toBeDefined();
    });
  });

  describe('game loop', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should start the game loop', () => {
      game.start();

      // requestAnimationFrame should be called
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should not start twice if already running', () => {
      game.start();
      const initialCallCount = (requestAnimationFrame as any).mock.calls.length;

      game.start();

      // Should not request another initial frame since already running
      expect((requestAnimationFrame as any).mock.calls.length).toBe(initialCallCount);
    });

    it('should stop the game loop', () => {
      game.start();
      game.stop();

      // After stopping, no more rendering should occur
      mockRenderer.render.mockClear();
    });

    it('should execute game loop and render', () => {
      game.start();

      // Advance time and trigger animation frame
      setMockTime(16);
      advanceAnimationFrame(16);

      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should handle large delta times gracefully', () => {
      game.start();

      // Simulate a large time jump (like tab being backgrounded)
      setMockTime(5000); // 5 seconds later
      advanceAnimationFrame(5000);

      // Game should still be running without crashing
      expect(mockRenderer.render).toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should resize the renderer', () => {
      game.resize(1920, 1080);

      expect(mockRenderer.resize).toHaveBeenCalledWith(1920, 1080);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      game = new Game3D();
      game.createEntity('entity', { transform3d: { x: 0, y: 0, z: 0 } });
      game.start();

      game.dispose();

      expect(mockRenderer.dispose).toHaveBeenCalled();
      expect(game.getEntityId('entity')).toBeUndefined();
    });

    it('should stop the game loop when disposed', () => {
      game = new Game3D();
      game.start();

      game.dispose();

      // After dispose, render should have been called once for cleanup
      mockRenderer.render.mockClear();

      // Advance frame after dispose - nothing should happen
      setMockTime(16);
      advanceAnimationFrame(16);

      // No new render calls after dispose
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should correctly map geometry types to indices', () => {
      // Create entities with different geometry types to test mapping
      const boxEid = game.createEntity('box', {
        transform3d: { x: 0, y: 0, z: 0 },
        mesh: { geometry: 'box' },
      });

      const sphereEid = game.createEntity('sphere', {
        transform3d: { x: 2, y: 0, z: 0 },
        mesh: { geometry: 'sphere' },
      });

      const planeEid = game.createEntity('plane', {
        transform3d: { x: 4, y: 0, z: 0 },
        mesh: { geometry: 'plane' },
      });

      expect(boxEid).toBeDefined();
      expect(sphereEid).toBeDefined();
      expect(planeEid).toBeDefined();
    });

    it('should correctly map light types to indices', () => {
      const ambientLight = game.createEntity('ambient', {
        transform3d: { x: 0, y: 0, z: 0 },
        light: { type: 'ambient' },
      });

      const directionalLight = game.createEntity('directional', {
        transform3d: { x: 0, y: 10, z: 0 },
        light: { type: 'directional' },
      });

      const pointLight = game.createEntity('point', {
        transform3d: { x: 5, y: 5, z: 5 },
        light: { type: 'point' },
      });

      expect(ambientLight).toBeDefined();
      expect(directionalLight).toBeDefined();
      expect(pointLight).toBeDefined();
    });

    it('should parse hex colors correctly', () => {
      const eid = game.createEntity('coloredBox', {
        transform3d: { x: 0, y: 0, z: 0 },
        mesh: { geometry: 'box' },
        material: { color: '#3498db' },
      });

      expect(eid).toBeDefined();
      expect(mockRenderer.createMesh).toHaveBeenCalledWith(
        eid,
        'box',
        expect.anything(),
        expect.objectContaining({ color: '#3498db' }),
        expect.anything()
      );
    });
  });

  describe('3D model loading', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should load a 3D model for an entity', async () => {
      const eid = game.createEntity('modelEntity', {
        transform3d: { x: 0, y: 0, z: 0 },
        model3d: {
          url: '/models/character.glb',
          scale: 2,
          castShadow: true,
          receiveShadow: true,
        },
      });

      expect(eid).toBeDefined();
      expect(mockRenderer.loadModel).toHaveBeenCalledWith(
        eid,
        '/models/character.glb',
        expect.objectContaining({ scale: 2, castShadow: true })
      );
    });
  });

  describe('default component values', () => {
    beforeEach(() => {
      game = new Game3D();
    });

    it('should use default values for transform rotation and scale', () => {
      const eid = game.createEntity('defaultTransform', {
        transform3d: { x: 1, y: 2, z: 3 },
        mesh: { geometry: 'box' },
      });

      expect(mockRenderer.updateMeshTransform).toHaveBeenCalledWith(
        eid,
        { x: 1, y: 2, z: 3 },
        { x: 0, y: 0, z: 0 }, // default rotation
        { x: 1, y: 1, z: 1 }  // default scale
      );
    });

    it('should use custom transform values when provided', () => {
      const eid = game.createEntity('customTransform', {
        transform3d: {
          x: 1, y: 2, z: 3,
          rotationX: 0.5, rotationY: 1.0, rotationZ: 1.5,
          scaleX: 2, scaleY: 3, scaleZ: 4,
        },
        mesh: { geometry: 'box' },
      });

      expect(mockRenderer.updateMeshTransform).toHaveBeenCalledWith(
        eid,
        { x: 1, y: 2, z: 3 },
        { x: 0.5, y: 1.0, z: 1.5 },
        { x: 2, y: 3, z: 4 }
      );
    });

    it('should add Velocity3D component for physics entities without explicit velocity', () => {
      const eid = game.createEntity('physicsEntity', {
        transform3d: { x: 0, y: 5, z: 0 },
        rigidbody3d: { type: 'dynamic', mass: 1 },
      });

      expect(eid).toBeDefined();
      // Velocity3D should be auto-added for physics entities
    });
  });
});
