import { Application } from 'pixi.js';
import { Engine as MatterEngine } from 'matter-js';
import { GameWorld, Deserializer } from '@promptplay/ecs-core';
import { GameSpec } from '@promptplay/shared-types';
import { PixiRenderer } from './renderers/PixiRenderer';
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
  private pixiApp: Application;
  private matterEngine: MatterEngine;
  private world: GameWorld;
  private renderer: PixiRenderer;
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

    // Initialize PixiJS
    this.pixiApp = new Application({
      view: canvasElement,
      width,
      height,
      backgroundColor,
      antialias: true,
    });

    // Initialize Matter.js
    this.matterEngine = MatterEngine.create({
      gravity: { x: 0, y: 1 },
    });

    // Initialize ECS world
    this.world = new GameWorld();

    // Initialize subsystems
    this.renderer = new PixiRenderer(this.pixiApp, this.world);
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
    this.pixiApp.destroy(true, { children: true, texture: true });
  }
}
