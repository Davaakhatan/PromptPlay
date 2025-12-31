import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Sprite } from '@promptplay/ecs-core';

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: GameWorld;
  private width: number;
  private height: number;
  private backgroundColor: string;

  constructor(canvas: HTMLCanvasElement, world: GameWorld, options: {
    width: number;
    height: number;
    backgroundColor: number;
  }) {
    this.canvas = canvas;
    this.world = world;
    this.width = options.width;
    this.height = options.height;

    // Convert number color to CSS hex string
    const bgHex = (options.backgroundColor & 0xFFFFFF).toString(16).padStart(6, '0');
    this.backgroundColor = `#${bgHex}`;

    // Get 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;

    // Set canvas size
    canvas.width = this.width;
    canvas.height = this.height;
  }

  async initialize(): Promise<void> {
    // No async initialization needed for Canvas2D
  }

  render(): void {
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    // Clear canvas with background color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Sort entities by z-order if needed (for now, render in order)
    for (const eid of entities) {
      if (!hasComponent(w, Sprite, eid) || !hasComponent(w, Transform, eid)) {
        continue;
      }

      // Check if visible
      if (Sprite.visible[eid] !== 1) {
        continue;
      }

      const x = Transform.x[eid];
      const y = Transform.y[eid];
      const rotation = Transform.rotation[eid];
      const scaleX = Transform.scaleX[eid];
      const scaleY = Transform.scaleY[eid];

      const width = Sprite.width[eid];
      const height = Sprite.height[eid];
      const tint = Sprite.tint[eid];

      // Convert tint to CSS color
      const colorHex = (tint & 0xFFFFFF).toString(16).padStart(6, '0');
      const color = `#${colorHex}`;

      // Save context state
      this.ctx.save();

      // Apply transformations
      this.ctx.translate(x, y);
      this.ctx.rotate(rotation);
      this.ctx.scale(scaleX, scaleY);

      // Draw rectangle centered at origin
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-width / 2, -height / 2, width, height);

      // Restore context state
      this.ctx.restore();
    }
  }

  cleanup(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // Get canvas for external use
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Get context for external use
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
