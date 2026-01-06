import { Engine as MatterEngine } from 'matter-js';
import { hasComponent } from 'bitecs';
import { GameWorld, Deserializer, Transform, Sprite } from '@promptplay/ecs-core';
import { GameSpec } from '@promptplay/shared-types';
import { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
import { MatterPhysics } from './physics/MatterPhysics';
import { InputManager } from './input/InputManager';
import { GameLoop } from './gameloop/GameLoop';
import { InputSystem } from './systems/InputSystem';
import { AnimationSystem } from './systems/AnimationSystem';
import { AIBehaviorSystem } from './systems/AIBehaviorSystem';
import { CameraSystem } from './systems/CameraSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionEventSystem } from './systems/CollisionEventSystem';

export interface Runtime2DConfig {
  width?: number;
  height?: number;
  backgroundColor?: number;
  enableAI?: boolean;
  enableAnimations?: boolean;
  enableCamera?: boolean;
  enableParticles?: boolean;
  showDebug?: boolean;
}

export class Runtime2D {
  private canvas: HTMLCanvasElement;
  private matterEngine: MatterEngine;
  private world: GameWorld;
  private renderer: Canvas2DRenderer;
  private physics: MatterPhysics;
  private input: InputManager;
  private gameLoop: GameLoop;
  private inputSystem: InputSystem;
  private animationSystem: AnimationSystem;
  private aiBehaviorSystem: AIBehaviorSystem;
  private cameraSystem: CameraSystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionEventSystem;

  private currentSpec: GameSpec | null = null;
  private isInitialized = false;
  private config: Runtime2DConfig;
  private showDebug: boolean;

  constructor(canvasElement: HTMLCanvasElement, config: Runtime2DConfig = {}) {
    const width = config.width ?? 800;
    const height = config.height ?? 600;
    const backgroundColor = config.backgroundColor ?? 0x1a1a2e;

    this.canvas = canvasElement;
    this.config = config;

    // Initialize Matter.js
    this.matterEngine = MatterEngine.create({
      gravity: { x: 0, y: 1 },
    });

    // Initialize ECS world
    this.world = new GameWorld();

    // Initialize Canvas2D renderer (no WebGL required)
    this.renderer = new Canvas2DRenderer(canvasElement, this.world, {
      width,
      height,
      backgroundColor,
    });

    // Initialize subsystems
    this.physics = new MatterPhysics(this.matterEngine, this.world);
    this.input = new InputManager(canvasElement);
    this.gameLoop = new GameLoop();

    // Create systems
    this.inputSystem = new InputSystem(this.input, this.physics);
    this.animationSystem = new AnimationSystem();
    this.aiBehaviorSystem = new AIBehaviorSystem(this.physics);
    this.cameraSystem = new CameraSystem(width, height);
    this.particleSystem = new ParticleSystem();
    this.collisionSystem = new CollisionEventSystem(this.physics);

    // Debug overlay
    this.showDebug = config.showDebug ?? false;
    if (this.showDebug) {
      this.renderer.setDebugInfo({ showDebug: true });
    }
  }

  async loadGameSpec(spec: GameSpec): Promise<void> {
    // Clear previous game
    if (this.isInitialized) {
      this.cleanup();
    }

    this.currentSpec = spec;

    // Deserialize spec into world
    Deserializer.deserialize(this.world, spec);

    // Set physics gravity from config
    this.physics.setGravity(spec.config.gravity.x, spec.config.gravity.y);

    // Add input system to world
    this.world.addSystem(this.inputSystem);

    // Add animation system if enabled
    if (this.config.enableAnimations !== false) {
      this.world.addSystem(this.animationSystem);
    }

    // Add AI behavior system if enabled
    if (this.config.enableAI !== false) {
      this.world.addSystem(this.aiBehaviorSystem);
    }

    // Add camera system if enabled
    if (this.config.enableCamera !== false) {
      this.world.addSystem(this.cameraSystem);
    }

    // Add particle system if enabled
    if (this.config.enableParticles !== false) {
      this.world.addSystem(this.particleSystem);
    }

    // Add collision event system
    this.world.addSystem(this.collisionSystem);

    // Initialize renderer and physics
    await this.renderer.initialize();
    this.physics.initialize();

    // Load tilemap if present in spec
    if (spec.tilemap) {
      this.renderer.setTilemap(spec.tilemap);
      // Add tilemap collision bodies
      this.addTilemapCollision(spec.tilemap);
    }

    // Do initial render so entities are visible at their gameSpec positions
    this.render();

    this.isInitialized = true;
  }

  // Add collision bodies for tilemap tiles marked as collision
  private addTilemapCollision(tilemap: NonNullable<GameSpec['tilemap']>): void {
    const { width, height, tileSize, layers, tileset } = tilemap;

    // Create a map of collision tile IDs for fast lookup
    const collisionTileIds = new Set(
      tileset.filter(t => t.collision).map(t => t.id)
    );

    if (collisionTileIds.size === 0) return;

    // Check all layers for collision tiles
    for (const layer of layers) {
      if (!layer.visible) continue;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = layer.data[y]?.[x] || 0;
          if (tileId === 0 || !collisionTileIds.has(tileId)) continue;

          // Create a static physics body for this tile
          const tileX = x * tileSize + tileSize / 2;
          const tileY = y * tileSize + tileSize / 2;

          this.physics.addStaticBody(
            `tile_${layer.id}_${x}_${y}`,
            tileX,
            tileY,
            tileSize,
            tileSize
          );
        }
      }
    }
  }

  start(): void {
    if (!this.isInitialized) {
      console.warn('Runtime not initialized. Call loadGameSpec first.');
      return;
    }

    this.gameLoop.start(
      (deltaTime) => this.update(deltaTime),
      () => this.render()
    );
  }

  stop(): void {
    this.gameLoop.stop();
  }

  pause(): void {
    this.gameLoop.pause();
  }

  resume(): void {
    this.gameLoop.resume();
  }

  private update(deltaTime: number): void {
    // Update ECS systems (InputSystem checks for key presses here)
    this.world.update(deltaTime);

    // Update physics
    this.physics.update(deltaTime);

    // Clear input pressed/released states at END of frame
    // This must be called AFTER systems have processed input
    this.input.update();
  }

  private render(): void {
    // Update renderer with camera state
    if (this.config.enableCamera !== false) {
      this.renderer.setCameraState(this.cameraSystem.getCameraState());
    }

    // Update renderer with particles
    if (this.config.enableParticles !== false) {
      const particles = this.particleSystem.getParticles();
      this.renderer.setParticles(particles.map(p => ({
        x: p.x,
        y: p.y,
        size: p.size,
        lifetime: p.lifetime,
        maxLifetime: p.maxLifetime,
        startColor: p.startColor,
        endColor: p.endColor,
      })));
    }

    // Update debug info
    if (this.showDebug) {
      this.renderer.setDebugInfo({
        fps: this.gameLoop.getFps(),
        entityCount: this.world.getEntities().length,
        particleCount: this.particleSystem.getParticles().length,
      });
    }

    this.renderer.render();
  }

  // Get current game spec
  getGameSpec(): GameSpec | null {
    return this.currentSpec;
  }

  // Get world instance for direct manipulation
  getWorld(): GameWorld {
    return this.world;
  }

  // Get physics instance for direct manipulation
  getPhysics(): MatterPhysics {
    return this.physics;
  }

  // Get input instance for querying
  getInput(): InputManager {
    return this.input;
  }

  // Get current FPS
  getFps(): number {
    return this.gameLoop.getFps();
  }

  // Check if runtime is currently running
  isRunning(): boolean {
    return this.gameLoop.getIsRunning();
  }

  // Check if runtime is paused
  isPaused(): boolean {
    return this.gameLoop.getIsPaused();
  }

  // Camera controls
  getCameraSystem(): CameraSystem {
    return this.cameraSystem;
  }

  shakeCamera(intensity: number, duration: number): void {
    this.cameraSystem.shake(this.world, intensity, duration);
  }

  setZoom(zoom: number): void {
    this.cameraSystem.setZoom(this.world, zoom);
  }

  setCameraPosition(x: number, y: number): void {
    this.cameraSystem.setPosition(x, y);
  }

  // Fit camera to show all entities
  fitCameraToEntities(): { x: number; y: number; zoom: number } | null {
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let hasVisibleEntities = false;

    for (const eid of entities) {
      if (!hasComponent(w, Transform, eid) || !hasComponent(w, Sprite, eid)) {
        continue;
      }

      const x = Transform.x[eid];
      const y = Transform.y[eid];
      const width = Sprite.width[eid];
      const height = Sprite.height[eid];

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      minX = Math.min(minX, x - halfWidth);
      maxX = Math.max(maxX, x + halfWidth);
      minY = Math.min(minY, y - halfHeight);
      maxY = Math.max(maxY, y + halfHeight);
      hasVisibleEntities = true;
    }

    if (!hasVisibleEntities) return null;

    // Add padding
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate center and required zoom
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const viewport = this.cameraSystem.getViewportSize();
    const zoomX = viewport.width / contentWidth;
    const zoomY = viewport.height / contentHeight;
    const zoom = Math.min(zoomX, zoomY, 2); // Cap at 2x zoom

    // Apply camera settings
    this.cameraSystem.setPosition(centerX, centerY);
    this.cameraSystem.setZoom(this.world, zoom);

    return { x: centerX, y: centerY, zoom };
  }

  // Particle effects
  getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  emitParticles(x: number, y: number, count: number, config?: Parameters<ParticleSystem['burst']>[4]): void {
    this.particleSystem.burst(this.world, x, y, count, config);
  }

  // Debug overlay
  toggleDebug(): void {
    this.showDebug = !this.showDebug;
    this.renderer.setDebugInfo({ showDebug: this.showDebug });
  }

  isDebugEnabled(): boolean {
    return this.showDebug;
  }

  // Collision events
  getCollisionSystem(): CollisionEventSystem {
    return this.collisionSystem;
  }

  // Convenience method to add collision rule
  onTagCollision(tagA: string, tagB: string, handler: Parameters<CollisionEventSystem['addRule']>[2]): void {
    this.collisionSystem.addRule(tagA, tagB, handler);
  }

  // Get entity at point using actual ECS Transform positions (same as renderer)
  getEntityAtPoint(x: number, y: number): string | null {
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    // Check entities in reverse order (top-most first)
    for (let i = entities.length - 1; i >= 0; i--) {
      const eid = entities[i];

      if (!hasComponent(w, Transform, eid) || !hasComponent(w, Sprite, eid)) {
        continue;
      }

      // Read from actual ECS components (same source as renderer)
      const entityX = Transform.x[eid];
      const entityY = Transform.y[eid];
      const width = Sprite.width[eid];
      const height = Sprite.height[eid];

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      if (
        x >= entityX - halfWidth &&
        x <= entityX + halfWidth &&
        y >= entityY - halfHeight &&
        y <= entityY + halfHeight
      ) {
        return this.world.getEntityName(eid) || null;
      }
    }

    return null;
  }

  // Get entity bounds from actual ECS state (for selection overlay)
  getEntityBounds(entityName: string): { x: number; y: number; width: number; height: number } | null {
    const eid = this.world.getEntityIdByName(entityName);
    if (eid === undefined) return null;

    const w = this.world.getWorld();
    if (!hasComponent(w, Transform, eid) || !hasComponent(w, Sprite, eid)) {
      return null;
    }

    return {
      x: Transform.x[eid],
      y: Transform.y[eid],
      width: Sprite.width[eid],
      height: Sprite.height[eid],
    };
  }

  private cleanup(): void {
    this.stop();
    this.renderer.cleanup();
    this.physics.cleanup();
    this.world.clear();
    this.isInitialized = false;
  }

  destroy(): void {
    this.cleanup();
    this.input.cleanup();
  }
}
