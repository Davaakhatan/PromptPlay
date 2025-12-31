import { Engine as MatterEngine } from 'matter-js';
import { hasComponent } from 'bitecs';
import { GameWorld, Deserializer, Transform, Sprite } from '@promptplay/ecs-core';
import { GameSpec } from '@promptplay/shared-types';
import { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
import { MatterPhysics } from './physics/MatterPhysics';
import { InputManager } from './input/InputManager';
import { GameLoop } from './gameloop/GameLoop';
import { InputSystem } from './systems/InputSystem';

export interface Runtime2DConfig {
  width?: number;
  height?: number;
  backgroundColor?: number;
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

  private currentSpec: GameSpec | null = null;
  private isInitialized = false;

  constructor(canvasElement: HTMLCanvasElement, config: Runtime2DConfig = {}) {
    const width = config.width ?? 800;
    const height = config.height ?? 600;
    const backgroundColor = config.backgroundColor ?? 0x1a1a2e;

    this.canvas = canvasElement;

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

    // Create input system
    this.inputSystem = new InputSystem(this.input, this.physics);
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

    // Initialize renderer and physics
    await this.renderer.initialize();
    this.physics.initialize();

    // Do initial render so entities are visible at their gameSpec positions
    this.render();

    this.isInitialized = true;
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
    // Update input state
    this.input.update();

    // Update ECS systems
    this.world.update(deltaTime);

    // Update physics
    this.physics.update(deltaTime);
  }

  private render(): void {
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
