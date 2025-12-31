import { Application, Sprite as PixiSprite, Graphics, Container } from 'pixi.js';
import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Sprite } from '@promptplay/ecs-core';

export class PixiRenderer {
  private app: Application;
  private world: GameWorld;
  private spriteMap: Map<number, Container> = new Map();

  constructor(app: Application, world: GameWorld) {
    this.app = app;
    this.world = world;
  }

  async initialize(): Promise<void> {
    // Query all entities with Sprite + Transform
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, Sprite, eid) && hasComponent(w, Transform, eid)) {
        this.createSprite(eid);
      }
    }
  }

  private createSprite(eid: number): void {
    const width = Sprite.width[eid];
    const height = Sprite.height[eid];
    const tint = Sprite.tint[eid];

    // Create a colored rectangle using Graphics
    const graphics = new Graphics();
    const color = tint & 0xffffff; // Remove alpha channel

    graphics.beginFill(color);
    graphics.drawRect(-width / 2, -height / 2, width, height);
    graphics.endFill();

    this.spriteMap.set(eid, graphics);
    this.app.stage.addChild(graphics);
  }

  render(): void {
    const w = this.world.getWorld();

    // Update all sprites from ECS data
    for (const [eid, container] of this.spriteMap) {
      if (!hasComponent(w, Transform, eid)) continue;

      container.x = Transform.x[eid];
      container.y = Transform.y[eid];
      container.rotation = Transform.rotation[eid];
      container.scale.set(Transform.scaleX[eid], Transform.scaleY[eid]);
      container.visible = Sprite.visible[eid] === 1;
    }
  }

  // Add new sprite for dynamically created entities
  addSprite(eid: number): void {
    if (!this.spriteMap.has(eid)) {
      this.createSprite(eid);
    }
  }

  // Remove sprite when entity is destroyed
  removeSprite(eid: number): void {
    const container = this.spriteMap.get(eid);
    if (container) {
      this.app.stage.removeChild(container);
      container.destroy();
      this.spriteMap.delete(eid);
    }
  }

  cleanup(): void {
    for (const [, container] of this.spriteMap) {
      container.destroy();
    }
    this.spriteMap.clear();
    this.app.stage.removeChildren();
  }
}
