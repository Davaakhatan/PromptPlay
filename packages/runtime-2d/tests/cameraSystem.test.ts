import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld, Transform, Camera } from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';
import { CameraSystem } from '../src/systems/CameraSystem';

describe('CameraSystem', () => {
  let world: GameWorld;
  let cameraSystem: CameraSystem;

  beforeEach(() => {
    world = new GameWorld();
    cameraSystem = new CameraSystem(800, 600);
  });

  function createCamera(options: {
    x?: number;
    y?: number;
    zoom?: number;
    isActive?: boolean;
    followTarget?: number;
    followSmoothing?: number;
    offsetX?: number;
    offsetY?: number;
  } = {}): number {
    const eid = world.createEntity('camera');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, Camera, eid);

    Transform.x[eid] = options.x ?? 400;
    Transform.y[eid] = options.y ?? 300;

    Camera.zoom[eid] = options.zoom ?? 1;
    Camera.isActive[eid] = options.isActive !== false ? 1 : 0;
    Camera.followTarget[eid] = options.followTarget ?? 0;
    Camera.followSmoothing[eid] = options.followSmoothing ?? 0;
    Camera.offsetX[eid] = options.offsetX ?? 0;
    Camera.offsetY[eid] = options.offsetY ?? 0;
    Camera.viewportWidth[eid] = 800;
    Camera.viewportHeight[eid] = 600;

    return eid;
  }

  function createTarget(x: number, y: number): number {
    const eid = world.createEntity('target');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    Transform.x[eid] = x;
    Transform.y[eid] = y;

    return eid;
  }

  describe('initialization', () => {
    it('should initialize with viewport dimensions', () => {
      const viewport = cameraSystem.getViewportSize();
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
    });

    it('should default camera to center of viewport', () => {
      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(400);
      expect(state.y).toBe(300);
    });

    it('should set viewport dimensions on active cameras', () => {
      const eid = createCamera({ zoom: 0 });
      cameraSystem.init(world);

      expect(Camera.viewportWidth[eid]).toBe(800);
      expect(Camera.viewportHeight[eid]).toBe(600);
      expect(Camera.zoom[eid]).toBe(1); // Should default to 1 if 0
    });
  });

  describe('camera state', () => {
    it('should return camera state with default values', () => {
      const state = cameraSystem.getCameraState();

      expect(state).toHaveProperty('x');
      expect(state).toHaveProperty('y');
      expect(state).toHaveProperty('zoom');
      expect(state).toHaveProperty('shakeOffsetX');
      expect(state).toHaveProperty('shakeOffsetY');
      expect(state.zoom).toBe(1);
      expect(state.shakeOffsetX).toBe(0);
      expect(state.shakeOffsetY).toBe(0);
    });
  });

  describe('position update', () => {
    it('should update camera position from Transform', () => {
      createCamera({ x: 200, y: 150 });
      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(200);
      expect(state.y).toBe(150);
    });

    it('should apply camera offset', () => {
      createCamera({ x: 200, y: 150, offsetX: 50, offsetY: -30 });
      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(250);
      expect(state.y).toBe(120);
    });

    it('should not update inactive cameras', () => {
      createCamera({ x: 200, y: 150, isActive: false });
      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      // Should remain at default center position
      expect(state.x).toBe(400);
      expect(state.y).toBe(300);
    });
  });

  describe('follow target', () => {
    it('should follow target entity', () => {
      const target = createTarget(500, 400);
      createCamera({ followTarget: target });

      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(500);
      expect(state.y).toBe(400);
    });

    it('should apply offset when following', () => {
      const target = createTarget(500, 400);
      createCamera({ followTarget: target, offsetX: 100, offsetY: 50 });

      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(600);
      expect(state.y).toBe(450);
    });

    it('should smoothly follow target', () => {
      const target = createTarget(700, 500);
      createCamera({ x: 400, y: 300, followTarget: target, followSmoothing: 0.9 });

      // Initialize camera position
      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      // Should be moving towards target but not there yet
      expect(state.x).toBeGreaterThan(400);
      expect(state.x).toBeLessThan(700);
      expect(state.y).toBeGreaterThan(300);
      expect(state.y).toBeLessThan(500);
    });

    it('should ignore invalid follow target', () => {
      createCamera({ x: 200, y: 150, followTarget: 99999 }); // Non-existent entity

      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      // Should use camera's own transform
      expect(state.x).toBe(200);
      expect(state.y).toBe(150);
    });
  });

  describe('zoom', () => {
    it('should update zoom from Camera component', () => {
      createCamera({ zoom: 2 });
      cameraSystem.update(world, 0.016);

      const state = cameraSystem.getCameraState();
      expect(state.zoom).toBe(2);
    });

    it('should set zoom via setZoom method', () => {
      createCamera();
      cameraSystem.setZoom(world, 1.5);

      const state = cameraSystem.getCameraState();
      expect(state.zoom).toBe(1.5);
    });

    it('should clamp zoom to valid range', () => {
      createCamera();

      cameraSystem.setZoom(world, 0.01); // Too small
      expect(cameraSystem.getCameraState().zoom).toBe(0.1);

      cameraSystem.setZoom(world, 100); // Too large
      expect(cameraSystem.getCameraState().zoom).toBe(10);
    });
  });

  describe('screen shake', () => {
    it('should start shake with intensity and duration', () => {
      createCamera();
      cameraSystem.shake(world, 10, 0.5);

      // Verify shake was set on camera entity
      const entities = world.getEntities();
      const cameraEid = entities[0];
      expect(Camera.shakeIntensity[cameraEid]).toBe(10);
      expect(Camera.shakeDuration[cameraEid]).toBe(0.5);
      expect(Camera.shakeElapsed[cameraEid]).toBe(0);
    });

    it('should apply shake offset during shake', () => {
      createCamera();
      const eid = world.getEntities()[0];

      Camera.shakeDuration[eid] = 0.5;
      Camera.shakeIntensity[eid] = 10;
      Camera.shakeElapsed[eid] = 0;

      cameraSystem.update(world, 0.1);

      const state = cameraSystem.getCameraState();
      // Shake offset should be non-zero
      expect(Math.abs(state.shakeOffsetX) > 0 || Math.abs(state.shakeOffsetY) > 0).toBe(true);
    });

    it('should decay shake over time', () => {
      createCamera();
      const eid = world.getEntities()[0];

      Camera.shakeDuration[eid] = 0.5;
      Camera.shakeIntensity[eid] = 10;
      Camera.shakeElapsed[eid] = 0;

      // Update near end of shake
      Camera.shakeElapsed[eid] = 0.4; // 80% through
      cameraSystem.update(world, 0.05);

      // Shake should be weaker near end
      const state = cameraSystem.getCameraState();
      expect(Math.abs(state.shakeOffsetX)).toBeLessThan(10);
      expect(Math.abs(state.shakeOffsetY)).toBeLessThan(10);
    });

    it('should reset shake when duration is complete', () => {
      createCamera();
      const eid = world.getEntities()[0];

      Camera.shakeDuration[eid] = 0.5;
      Camera.shakeIntensity[eid] = 10;
      Camera.shakeElapsed[eid] = 0.5; // At end

      cameraSystem.update(world, 0.1);

      expect(Camera.shakeDuration[eid]).toBe(0);
      expect(Camera.shakeIntensity[eid]).toBe(0);
      expect(cameraSystem.getCameraState().shakeOffsetX).toBe(0);
      expect(cameraSystem.getCameraState().shakeOffsetY).toBe(0);
    });
  });

  describe('setPosition', () => {
    it('should set camera position directly', () => {
      cameraSystem.setPosition(300, 250);

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(300);
      expect(state.y).toBe(250);
    });
  });

  describe('cleanup', () => {
    it('should reset camera state on cleanup', () => {
      createCamera({ x: 100, y: 100, zoom: 2 });
      cameraSystem.update(world, 0.016);

      cameraSystem.cleanup();

      const state = cameraSystem.getCameraState();
      expect(state.x).toBe(400); // Center of 800
      expect(state.y).toBe(300); // Center of 600
      expect(state.zoom).toBe(1);
      expect(state.shakeOffsetX).toBe(0);
      expect(state.shakeOffsetY).toBe(0);
    });
  });
});
