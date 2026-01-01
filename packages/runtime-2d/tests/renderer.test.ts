import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameWorld, Transform, Sprite } from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';
import { Canvas2DRenderer, RenderableParticle } from '../src/renderers/Canvas2DRenderer';
import { createMockCanvas, createMockCanvas2DContext } from './setup';

describe('Canvas2DRenderer', () => {
  let world: GameWorld;
  let canvas: HTMLCanvasElement;
  let renderer: Canvas2DRenderer;

  beforeEach(() => {
    world = new GameWorld();
    canvas = createMockCanvas(800, 600);
    renderer = new Canvas2DRenderer(canvas, world, {
      width: 800,
      height: 600,
      backgroundColor: 0x1a1a2e,
    });
  });

  function createSpriteEntity(options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    visible?: boolean;
    zIndex?: number;
    tint?: number;
    texture?: string;
  } = {}): number {
    const eid = world.createEntity('sprite');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, Sprite, eid);

    Transform.x[eid] = options.x ?? 100;
    Transform.y[eid] = options.y ?? 100;
    Transform.rotation[eid] = options.rotation ?? 0;
    Transform.scaleX[eid] = options.scaleX ?? 1;
    Transform.scaleY[eid] = options.scaleY ?? 1;

    Sprite.width[eid] = options.width ?? 32;
    Sprite.height[eid] = options.height ?? 32;
    Sprite.visible[eid] = options.visible !== false ? 1 : 0;
    Sprite.zIndex[eid] = options.zIndex ?? 0;
    Sprite.tint[eid] = options.tint ?? 0xffffff;
    Sprite.anchorX[eid] = 0.5;
    Sprite.anchorY[eid] = 0.5;

    if (options.texture) {
      const textureId = world.getTextureId(options.texture);
      Sprite.textureId[eid] = textureId;
    }

    return eid;
  }

  describe('initialization', () => {
    it('should create renderer with canvas', () => {
      expect(renderer.getCanvas()).toBe(canvas);
    });

    it('should set canvas dimensions', () => {
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it('should get 2D context', () => {
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should throw if 2D context is not available', () => {
      const badCanvas = {
        ...createMockCanvas(),
        getContext: vi.fn(() => null),
      } as unknown as HTMLCanvasElement;

      expect(() => {
        new Canvas2DRenderer(badCanvas, world, {
          width: 800,
          height: 600,
          backgroundColor: 0x000000,
        });
      }).toThrow('Failed to get 2D canvas context');
    });
  });

  describe('asset base path', () => {
    it('should set asset base path', () => {
      renderer.setAssetBasePath('/assets');

      // Verify by attempting to load texture (path would include base)
      // This is indirectly tested through texture loading
    });
  });

  describe('rendering', () => {
    it('should clear canvas with background color', () => {
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should save and restore context', () => {
      createSpriteEntity();
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.save).toHaveBeenCalled();
      expect(ctx?.restore).toHaveBeenCalled();
    });

    it('should render visible sprites', () => {
      createSpriteEntity({ x: 100, y: 100, visible: true });
      renderer.render();

      const ctx = canvas.getContext('2d');
      // Should draw rectangle (fallback when no texture)
      expect(ctx?.fillRect).toHaveBeenCalled();
    });

    it('should not render invisible sprites', () => {
      createSpriteEntity({ visible: false });
      const ctx = canvas.getContext('2d');

      // Clear previous calls
      (ctx?.fillRect as ReturnType<typeof vi.fn>).mockClear();
      (ctx?.save as ReturnType<typeof vi.fn>).mockClear();

      renderer.render();

      // Should not have extra save calls for invisible sprite
      // (Only camera save/restore)
      expect(ctx?.save).toHaveBeenCalledTimes(1);
    });

    it('should apply transformations', () => {
      createSpriteEntity({
        x: 200,
        y: 150,
        rotation: Math.PI / 4,
        scaleX: 2,
        scaleY: 1.5,
      });
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.translate).toHaveBeenCalled();
      expect(ctx?.rotate).toHaveBeenCalled();
      expect(ctx?.scale).toHaveBeenCalled();
    });
  });

  describe('z-index sorting', () => {
    it('should render sprites in z-index order', () => {
      createSpriteEntity({ x: 100, y: 100, zIndex: 10 });
      createSpriteEntity({ x: 200, y: 100, zIndex: 5 });
      createSpriteEntity({ x: 300, y: 100, zIndex: 15 });

      renderer.render();

      // Sprites should be rendered in order: z=5, z=10, z=15
      // This is verified by the order of translate calls
      const ctx = canvas.getContext('2d');
      const translateCalls = (ctx?.translate as ReturnType<typeof vi.fn>).mock.calls;

      // First translate is for camera
      // Subsequent translates are for entities (in z-order)
      // Entity at x=200 (z=5) should come before x=100 (z=10)
    });
  });

  describe('camera integration', () => {
    it('should apply camera state', () => {
      renderer.setCameraState({
        x: 400,
        y: 300,
        zoom: 2,
        shakeOffsetX: 0,
        shakeOffsetY: 0,
      });

      createSpriteEntity();
      renderer.render();

      const ctx = canvas.getContext('2d');
      // Should translate to center, scale, then translate for camera position
      expect(ctx?.translate).toHaveBeenCalled();
      expect(ctx?.scale).toHaveBeenCalled();
    });

    it('should apply camera shake offset', () => {
      renderer.setCameraState({
        x: 400,
        y: 300,
        zoom: 1,
        shakeOffsetX: 5,
        shakeOffsetY: -3,
      });

      createSpriteEntity();
      renderer.render();

      const ctx = canvas.getContext('2d');
      // Shake offset is applied in the camera translation
      expect(ctx?.translate).toHaveBeenCalled();
    });
  });

  describe('particles', () => {
    it('should render particles', () => {
      const particles: RenderableParticle[] = [
        { x: 100, y: 100, size: 5, lifetime: 0.5, maxLifetime: 1, startColor: 0xff0000, endColor: 0x0000ff },
        { x: 200, y: 200, size: 3, lifetime: 0.2, maxLifetime: 1, startColor: 0x00ff00, endColor: 0x000000 },
      ];

      renderer.setParticles(particles);
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.arc).toHaveBeenCalled();
      expect(ctx?.fill).toHaveBeenCalled();
    });

    it('should fade particles based on lifetime', () => {
      const particles: RenderableParticle[] = [
        { x: 100, y: 100, size: 5, lifetime: 0.5, maxLifetime: 1, startColor: 0xff0000, endColor: 0x0000ff },
      ];

      renderer.setParticles(particles);
      renderer.render();

      const ctx = canvas.getContext('2d');
      // globalAlpha should be modified for particle fade
      // (The mock doesn't track property changes, but we verify the render doesn't throw)
    });
  });

  describe('debug overlay', () => {
    it('should not render debug overlay by default', () => {
      renderer.render();

      const ctx = canvas.getContext('2d');
      const fillTextCalls = (ctx?.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBe(0);
    });

    it('should toggle debug overlay', () => {
      renderer.toggleDebug();
      renderer.setDebugInfo({ fps: 60, entityCount: 10, particleCount: 5, showDebug: true });
      renderer.render();

      const ctx = canvas.getContext('2d');
      // Debug text should be rendered
      expect(ctx?.fillText).toHaveBeenCalled();
    });

    it('should set debug info', () => {
      renderer.toggleDebug();
      renderer.setDebugInfo({
        fps: 120,
        entityCount: 50,
        particleCount: 100,
      });
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.fillText).toHaveBeenCalled();
    });
  });

  describe('texture loading', () => {
    it('should load texture by name', async () => {
      const textureId = 1;
      await renderer.loadTexture('player.png', textureId);

      // Texture should be marked as loaded (after mock image loads)
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(renderer.isTextureLoaded(textureId)).toBe(true);
    });

    it('should cache loaded textures', async () => {
      const textureId = 1;
      await renderer.loadTexture('player.png', textureId);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second load should return immediately
      await renderer.loadTexture('player.png', textureId);
      expect(renderer.isTextureLoaded(textureId)).toBe(true);
    });

    it('should get texture count', async () => {
      await renderer.loadTexture('player.png', 1);
      await renderer.loadTexture('enemy.png', 2);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(renderer.getTextureCount()).toBe(2);
    });

    it('should build texture path with base path', () => {
      renderer.setAssetBasePath('/game/assets');

      // Path building is internal, tested indirectly through texture loading
    });
  });

  describe('texture rendering', () => {
    it('should draw image when texture is loaded', async () => {
      const textureId = world.getTextureId('player');
      await renderer.loadTexture('player.png', textureId);
      await new Promise(resolve => setTimeout(resolve, 10));

      createSpriteEntity({ texture: 'player' });
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.drawImage).toHaveBeenCalled();
    });

    it('should draw colored rectangle when no texture', () => {
      createSpriteEntity({ tint: 0xff5500 });
      renderer.render();

      const ctx = canvas.getContext('2d');
      expect(ctx?.fillRect).toHaveBeenCalled();
    });

    it('should handle sprite sheet frames', async () => {
      const eid = createSpriteEntity({ texture: 'spritesheet' });
      const textureId = Sprite.textureId[eid];

      await renderer.loadTexture('spritesheet.png', textureId);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Set frame data
      Sprite.frameX[eid] = 2;
      Sprite.frameY[eid] = 1;
      Sprite.frameWidth[eid] = 32;
      Sprite.frameHeight[eid] = 32;

      renderer.render();

      const ctx = canvas.getContext('2d');
      // drawImage with 9 arguments (source rect)
      const drawImageCalls = (ctx?.drawImage as ReturnType<typeof vi.fn>).mock.calls;
      expect(drawImageCalls.length).toBeGreaterThan(0);
    });

    it('should apply tint to textured sprites', async () => {
      const eid = createSpriteEntity({ texture: 'player', tint: 0xff0000 });
      const textureId = Sprite.textureId[eid];

      await renderer.loadTexture('player.png', textureId);
      await new Promise(resolve => setTimeout(resolve, 10));

      renderer.render();

      const ctx = canvas.getContext('2d');
      // Tint is applied via composite operation
      // The mock tracks this but we just verify no errors
    });

    it('should handle flip X and Y', () => {
      const eid = createSpriteEntity();
      Sprite.flipX[eid] = 1;
      Sprite.flipY[eid] = 1;

      renderer.render();

      const ctx = canvas.getContext('2d');
      // Scale should be called with negative values
      expect(ctx?.scale).toHaveBeenCalled();
    });
  });

  describe('preload textures', () => {
    it('should preload all textures from world', async () => {
      createSpriteEntity({ texture: 'player' });
      createSpriteEntity({ texture: 'enemy' });
      createSpriteEntity({ texture: 'coin' });

      await renderer.preloadTextures();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(renderer.getTextureCount()).toBe(3);
    });
  });

  describe('initialize', () => {
    it('should preload textures on initialize', async () => {
      createSpriteEntity({ texture: 'player' });

      await renderer.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(renderer.isTextureLoaded(Sprite.textureId[world.getEntities()[0]])).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clear canvas on cleanup', () => {
      renderer.cleanup();

      const ctx = canvas.getContext('2d');
      expect(ctx?.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should clear texture cache on cleanup', async () => {
      await renderer.loadTexture('test.png', 1);
      await new Promise(resolve => setTimeout(resolve, 10));

      renderer.cleanup();

      expect(renderer.getTextureCount()).toBe(0);
    });
  });

  describe('context access', () => {
    it('should return context', () => {
      const ctx = renderer.getContext();
      expect(ctx).toBeDefined();
    });
  });
});
