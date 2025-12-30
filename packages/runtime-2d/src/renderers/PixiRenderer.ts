import { Application, Sprite as PixiSprite, Graphics, Texture } from 'pixi.js';
import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Sprite } from '@promptplay/ecs-core';

export class PixiRenderer {
  private app: Application;
  private world: GameWorld;
  private spriteMap: Map<number, PixiSprite> = new Map();
  private textureCache: Map<string, Texture> = new Map();

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
        await this.createSprite(eid);
      }
    }
  }

  private async createSprite(eid: number): Promise<void> {
    const textureId = Sprite.textureId[eid];
    const textureName = this.world.getTextureName(textureId) ?? 'default';

    // Get or create texture
    const texture = await this.getTexture(
      textureName,
      Sprite.width[eid],
      Sprite.height[eid],
      Sprite.tint[eid]
    );

    const sprite = new PixiSprite(texture);
    sprite.anchor.set(0.5, 0.5); // Center origin

    this.spriteMap.set(eid, sprite);
    this.app.stage.addChild(sprite);
  }

  private async getTexture(
    name: string,
    width: number,
    height: number,
    tint: number
  ): Promise<Texture> {
    const cacheKey = `${name}_${width}_${height}_${tint}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    // For MVP, create colored rectangle placeholders
    const graphics = new Graphics();
    const color = tint & 0xffffff; // Remove alpha channel for fill color
    graphics.beginFill(color, 1);
    graphics.drawRect(-width / 2, -height / 2, width, height);
    graphics.endFill();

    const texture = this.app.renderer.generateTexture(graphics);
    this.textureCache.set(cacheKey, texture);

    return texture;
  }

  render(): void {
    const w = this.world.getWorld();

    // Update all sprites from ECS data
    for (const [eid, sprite] of this.spriteMap) {
      if (!hasComponent(w, Transform, eid)) continue;

      sprite.x = Transform.x[eid];
      sprite.y = Transform.y[eid];
      sprite.rotation = Transform.rotation[eid];
      sprite.scale.set(Transform.scaleX[eid], Transform.scaleY[eid]);
      sprite.visible = Sprite.visible[eid] === 1;
    }
  }

  // Add new sprite for dynamically created entities
  async addSprite(eid: number): Promise<void> {
    if (!this.spriteMap.has(eid)) {
      await this.createSprite(eid);
    }
  }

  // Remove sprite when entity is destroyed
  removeSprite(eid: number): void {
    const sprite = this.spriteMap.get(eid);
    if (sprite) {
      this.app.stage.removeChild(sprite);
      sprite.destroy();
      this.spriteMap.delete(eid);
    }
  }

  cleanup(): void {
    for (const [eid, sprite] of this.spriteMap) {
      sprite.destroy();
    }
    this.spriteMap.clear();
    this.textureCache.clear();
  }
}
