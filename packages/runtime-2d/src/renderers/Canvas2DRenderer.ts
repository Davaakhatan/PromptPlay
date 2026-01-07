import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Sprite, Health } from '@promptplay/ecs-core';
import { CameraState } from '../systems/CameraSystem';

// Tilemap types (matches @promptplay/shared-types)
export interface TileDefinition {
  id: number;
  name: string;
  color: string;
  collision: boolean;
  properties?: Record<string, unknown>;
  imageRect?: { x: number; y: number; width: number; height: number };
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  data: number[][];
}

export interface TilemapSpec {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: TilemapLayer[];
  tileset: TileDefinition[];
  tilesetImage?: string;
  tilesetColumns?: number;
}

// Particle data for rendering
export interface RenderableParticle {
  x: number;
  y: number;
  size: number;
  lifetime: number;
  maxLifetime: number;
  startColor: number;
  endColor: number;
}

// Debug info for overlay
export interface DebugInfo {
  fps: number;
  entityCount: number;
  particleCount: number;
  showDebug: boolean;
}

// HUD info for game state display
export interface HUDInfo {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  level: number;
  timeRemaining: number;
  showHUD: boolean;
  gameState: number; // 0=menu, 1=playing, 2=paused, 3=gameOver, 4=won
}

// Texture cache entry
interface TextureEntry {
  image: HTMLImageElement;
  loaded: boolean;
  error: boolean;
}

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: GameWorld;
  private width: number;
  private height: number;
  private backgroundColor: string;

  // Camera state
  private cameraState: CameraState | null = null;

  // Particles to render
  private particles: RenderableParticle[] = [];

  // Debug overlay
  private debugInfo: DebugInfo = {
    fps: 0,
    entityCount: 0,
    particleCount: 0,
    showDebug: false,
  };

  // HUD overlay
  private hudInfo: HUDInfo = {
    score: 0,
    highScore: 0,
    lives: 3,
    maxLives: 3,
    level: 1,
    timeRemaining: 0,
    showHUD: true,
    gameState: 1,
  };

  // Health bar settings
  private showHealthBars: boolean = true;
  private healthBarHeight: number = 6;
  private healthBarWidth: number = 40;
  private healthBarOffset: number = 10; // Distance above entity

  // Texture cache: textureId -> TextureEntry
  private textureCache: Map<number, TextureEntry> = new Map();

  // Asset base path for loading textures
  private assetBasePath: string = '';

  // Tilemap data
  private tilemap: TilemapSpec | null = null;
  private tilesetImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement, world: GameWorld, options: {
    width: number;
    height: number;
    backgroundColor: number;
    assetBasePath?: string;
  }) {
    this.canvas = canvas;
    this.world = world;
    this.width = options.width;
    this.height = options.height;
    this.assetBasePath = options.assetBasePath || '';

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

  setAssetBasePath(path: string): void {
    this.assetBasePath = path;
  }

  setCameraState(state: CameraState | null): void {
    this.cameraState = state;
  }

  setParticles(particles: RenderableParticle[]): void {
    this.particles = particles;
  }

  setDebugInfo(info: Partial<DebugInfo>): void {
    Object.assign(this.debugInfo, info);
  }

  toggleDebug(): void {
    this.debugInfo.showDebug = !this.debugInfo.showDebug;
  }

  setHUD(info: Partial<HUDInfo>): void {
    Object.assign(this.hudInfo, info);
  }

  toggleHUD(): void {
    this.hudInfo.showHUD = !this.hudInfo.showHUD;
  }

  // Health bar configuration
  setHealthBarConfig(config: {
    show?: boolean;
    width?: number;
    height?: number;
    offset?: number;
  }): void {
    if (config.show !== undefined) this.showHealthBars = config.show;
    if (config.width !== undefined) this.healthBarWidth = config.width;
    if (config.height !== undefined) this.healthBarHeight = config.height;
    if (config.offset !== undefined) this.healthBarOffset = config.offset;
  }

  toggleHealthBars(): void {
    this.showHealthBars = !this.showHealthBars;
  }

  // Set tilemap for rendering
  setTilemap(tilemap: TilemapSpec | null): void {
    this.tilemap = tilemap;

    // Load tileset image if present
    if (tilemap?.tilesetImage) {
      const img = new Image();
      img.onload = () => {
        this.tilesetImage = img;
      };
      img.src = tilemap.tilesetImage;
    } else {
      this.tilesetImage = null;
    }
  }

  // Get current tilemap
  getTilemap(): TilemapSpec | null {
    return this.tilemap;
  }

  // Load a texture by name and cache it
  loadTexture(textureName: string, textureId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already cached
      if (this.textureCache.has(textureId)) {
        const entry = this.textureCache.get(textureId)!;
        if (entry.loaded) {
          resolve();
          return;
        }
        if (entry.error) {
          reject(new Error(`Texture ${textureName} failed to load`));
          return;
        }
      }

      // Create new image
      const img = new Image();
      const entry: TextureEntry = {
        image: img,
        loaded: false,
        error: false,
      };
      this.textureCache.set(textureId, entry);

      img.onload = () => {
        entry.loaded = true;
        resolve();
      };

      img.onerror = () => {
        entry.error = true;
        console.warn(`Failed to load texture: ${textureName}`);
        resolve(); // Don't reject, just fallback to color rendering
      };

      // Build texture path
      const path = this.buildTexturePath(textureName);
      img.src = path;
    });
  }

  private buildTexturePath(textureName: string): string {
    // If already a full path or data URL, use as-is
    if (textureName.startsWith('http') || textureName.startsWith('data:') || textureName.startsWith('/')) {
      return textureName;
    }

    // Add extension if not present
    let fileName = textureName;
    if (!fileName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      fileName += '.png';
    }

    // Combine with base path
    if (this.assetBasePath) {
      return `${this.assetBasePath}/${fileName}`;
    }

    return fileName;
  }

  // Preload all textures from world
  async preloadTextures(): Promise<void> {
    const entities = this.world.getEntities();
    const w = this.world.getWorld();
    const loadPromises: Promise<void>[] = [];

    for (const eid of entities) {
      if (hasComponent(w, Sprite, eid)) {
        const textureId = Sprite.textureId[eid];
        const textureName = this.world.getTextureName(textureId);
        if (textureName && !this.textureCache.has(textureId)) {
          loadPromises.push(this.loadTexture(textureName, textureId));
        }
      }
    }

    await Promise.all(loadPromises);
  }

  async initialize(): Promise<void> {
    // Preload textures on init
    await this.preloadTextures();
  }

  render(): void {
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    // Clear canvas with background color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply camera transformation
    this.ctx.save();
    if (this.cameraState) {
      const cam = this.cameraState;
      // Center camera on viewport
      this.ctx.translate(this.width / 2, this.height / 2);
      // Apply zoom
      this.ctx.scale(cam.zoom, cam.zoom);
      // Apply camera position (inverted - move world opposite to camera)
      this.ctx.translate(-cam.x + cam.shakeOffsetX, -cam.y + cam.shakeOffsetY);
    }

    // Render tilemap first (background layer)
    this.renderTilemap();

    // Collect renderable entities with z-index for sorting
    const renderables: { eid: number; zIndex: number }[] = [];

    for (const eid of entities) {
      if (!hasComponent(w, Sprite, eid) || !hasComponent(w, Transform, eid)) {
        continue;
      }
      // Check if visible
      if (Sprite.visible[eid] !== 1) {
        continue;
      }
      renderables.push({
        eid,
        zIndex: Sprite.zIndex[eid] || 0,
      });
    }

    // Sort by z-index (lower first = background, higher last = foreground)
    renderables.sort((a, b) => a.zIndex - b.zIndex);

    // Render sorted entities
    for (const { eid } of renderables) {
      this.renderEntity(eid);
    }

    // Render health bars above entities
    if (this.showHealthBars) {
      this.renderHealthBars(renderables.map(r => r.eid));
    }

    // Render particles
    this.renderParticles();

    // Restore camera transformation
    this.ctx.restore();

    // Render HUD overlay (not affected by camera)
    if (this.hudInfo.showHUD) {
      this.renderHUD();
    }

    // Render debug overlay (not affected by camera)
    if (this.debugInfo.showDebug) {
      this.renderDebugOverlay();
    }
  }

  private renderEntity(eid: number): void {
    const x = Transform.x[eid];
    const y = Transform.y[eid];
    const rotation = Transform.rotation[eid];
    const scaleX = Transform.scaleX[eid];
    const scaleY = Transform.scaleY[eid];

    const width = Sprite.width[eid];
    const height = Sprite.height[eid];
    const tint = Sprite.tint[eid];
    const textureId = Sprite.textureId[eid];

    // Get anchor (default to center)
    const anchorX = Sprite.anchorX[eid] || 0.5;
    const anchorY = Sprite.anchorY[eid] || 0.5;

    // Get flip state
    const flipX = Sprite.flipX[eid] === 1;
    const flipY = Sprite.flipY[eid] === 1;

    // Get sprite sheet frame data
    const frameX = Sprite.frameX[eid] || 0;
    const frameY = Sprite.frameY[eid] || 0;
    const frameWidth = Sprite.frameWidth[eid] || 0;
    const frameHeight = Sprite.frameHeight[eid] || 0;

    // Save context state
    this.ctx.save();

    // Apply transformations
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.scale(
      scaleX * (flipX ? -1 : 1),
      scaleY * (flipY ? -1 : 1)
    );

    // Calculate draw position based on anchor
    const drawX = -width * anchorX;
    const drawY = -height * anchorY;

    // Check for loaded texture
    const textureEntry = this.textureCache.get(textureId);

    if (textureEntry && textureEntry.loaded) {
      // Draw image with optional sprite sheet frame
      const img = textureEntry.image;

      if (frameWidth > 0 && frameHeight > 0) {
        // Draw sprite sheet frame
        this.ctx.drawImage(
          img,
          frameX * frameWidth, frameY * frameHeight, // Source x, y
          frameWidth, frameHeight, // Source width, height
          drawX, drawY, // Dest x, y
          width, height // Dest width, height
        );
      } else {
        // Draw full image
        this.ctx.drawImage(img, drawX, drawY, width, height);
      }

      // Apply tint as overlay if not white
      if (tint !== 0xFFFFFF && tint !== 0xFFFFFFFF) {
        this.ctx.globalCompositeOperation = 'multiply';
        const colorHex = (tint & 0xFFFFFF).toString(16).padStart(6, '0');
        this.ctx.fillStyle = `#${colorHex}`;
        this.ctx.fillRect(drawX, drawY, width, height);
        this.ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      // Fallback: Draw colored rectangle
      const colorHex = (tint & 0xFFFFFF).toString(16).padStart(6, '0');
      const color = `#${colorHex}`;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(drawX, drawY, width, height);

      // Draw outline for better visibility in editor
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(drawX, drawY, width, height);
    }

    // Restore context state
    this.ctx.restore();
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      const progress = p.lifetime / p.maxLifetime;

      // Interpolate color
      const color = this.lerpColor(p.startColor, p.endColor, progress);
      const alpha = 1 - progress; // Fade out

      // Convert to CSS color
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderHealthBars(entityIds: number[]): void {
    const w = this.world.getWorld();
    const ctx = this.ctx;

    for (const eid of entityIds) {
      // Only render health bar if entity has Health component
      if (!hasComponent(w, Health, eid)) continue;

      const currentHealth = Health.current[eid];
      const maxHealth = Health.max[eid];

      // Skip if full health or no max health set
      if (maxHealth <= 0 || currentHealth >= maxHealth) continue;

      const x = Transform.x[eid];
      const y = Transform.y[eid];
      const spriteHeight = Sprite.height[eid];

      // Position bar above entity
      const barX = x - this.healthBarWidth / 2;
      const barY = y - spriteHeight / 2 - this.healthBarOffset - this.healthBarHeight;

      // Health percentage
      const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));

      // Draw background (dark)
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX - 1, barY - 1, this.healthBarWidth + 2, this.healthBarHeight + 2);

      // Draw health bar background (red for missing health)
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

      // Draw current health (green to yellow to red based on percentage)
      let healthColor: string;
      if (healthPercent > 0.6) {
        healthColor = '#33ff33'; // Green
      } else if (healthPercent > 0.3) {
        healthColor = '#ffff33'; // Yellow
      } else {
        healthColor = '#ff6633'; // Orange-red
      }
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, this.healthBarWidth * healthPercent, this.healthBarHeight);

      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

      ctx.restore();
    }
  }

  private renderTilemap(): void {
    if (!this.tilemap) return;

    const { width, height, tileSize, layers, tileset } = this.tilemap;

    // Render each layer (bottom to top)
    for (const layer of layers) {
      if (!layer.visible) continue;

      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;

      // Render tiles in this layer
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = layer.data[y]?.[x] || 0;
          if (tileId === 0) continue; // Empty tile

          const tile = tileset.find(t => t.id === tileId);
          if (!tile) continue;

          const destX = x * tileSize;
          const destY = y * tileSize;

          // Draw image tile if tileset image is loaded and tile has imageRect
          if (this.tilesetImage && tile.imageRect) {
            this.ctx.drawImage(
              this.tilesetImage,
              tile.imageRect.x,
              tile.imageRect.y,
              tile.imageRect.width,
              tile.imageRect.height,
              destX,
              destY,
              tileSize,
              tileSize
            );
          } else {
            // Fallback to color
            this.ctx.fillStyle = tile.color;
            this.ctx.fillRect(destX, destY, tileSize, tileSize);
          }
        }
      }

      this.ctx.restore();
    }
  }

  private lerpColor(start: number, end: number, t: number): number {
    const sr = (start >> 16) & 0xff;
    const sg = (start >> 8) & 0xff;
    const sb = start & 0xff;
    const er = (end >> 16) & 0xff;
    const eg = (end >> 8) & 0xff;
    const eb = end & 0xff;

    const r = Math.round(sr + (er - sr) * t);
    const g = Math.round(sg + (eg - sg) * t);
    const b = Math.round(sb + (eb - sb) * t);

    return (r << 16) | (g << 8) | b;
  }

  private renderHUD(): void {
    const ctx = this.ctx;
    const { score, lives, maxLives, level, timeRemaining, gameState } = this.hudInfo;

    // HUD offset to avoid editor UI overlays
    // Left offset clears the "Playing/Editing" badge, right offset clears toolbar buttons
    const leftOffset = 130;
    const rightOffset = 350; // Large offset to clear toolbar buttons
    const topOffset = 70; // Below the top UI bar

    // Score display (top-left, offset to avoid "Playing" badge)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(`Score: ${score}`, leftOffset, topOffset);

    // Level display
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`Level ${level}`, leftOffset, topOffset + 23);

    // Lives display - render as hearts below score/level (left side, below Level text)
    // Draw hearts using canvas shapes for better cross-platform compatibility
    const heartSize = 18;
    const heartSpacing = 24;
    const heartY = topOffset + 48; // Below Level text

    // Add "Lives:" label
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Lives:', leftOffset, heartY + heartSize / 2);

    for (let i = 0; i < maxLives; i++) {
      const heartX = leftOffset + 55 + (i * heartSpacing);
      this.drawHeart(ctx, heartX, heartY, heartSize, i < lives ? '#ff3366' : '#555555');
    }

    // Time remaining (if > 0)
    if (timeRemaining > 0) {
      const seconds = Math.ceil(timeRemaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = seconds <= 10 ? '#ff4444' : '#ffffff';
      ctx.fillText(`${minutes}:${secs.toString().padStart(2, '0')}`, this.width / 2, 35);
    }

    ctx.restore();

    // Game state overlays
    if (gameState === 3) {
      // Game Over
      this.renderGameOverlay('GAME OVER', '#ff4444', 'Press R to restart');
    } else if (gameState === 4) {
      // Won
      this.renderGameOverlay('YOU WIN!', '#44ff44', 'Press R to play again');
    } else if (gameState === 2) {
      // Paused
      this.renderGameOverlay('PAUSED', '#ffffff', 'Press P to continue');
    }
  }

  private renderGameOverlay(title: string, color: string, subtitle: string): void {
    const ctx = this.ctx;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Title
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(title, this.width / 2, this.height / 2 - 20);

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(subtitle, this.width / 2, this.height / 2 + 30);
    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    // Reset shadow for heart drawing
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = color;

    // Draw heart using two circles and a triangle for better compatibility
    const radius = size * 0.3;
    const leftCircleX = x - radius * 0.7;
    const rightCircleX = x + radius * 0.7;
    const circleY = y + radius;

    // Left circle
    ctx.beginPath();
    ctx.arc(leftCircleX, circleY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Right circle
    ctx.beginPath();
    ctx.arc(rightCircleX, circleY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Triangle pointing down
    ctx.beginPath();
    ctx.moveTo(x - size * 0.45, circleY);
    ctx.lineTo(x + size * 0.45, circleY);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderDebugOverlay(): void {
    const padding = 10;
    const lineHeight = 18;
    const lines = [
      `FPS: ${this.debugInfo.fps}`,
      `Entities: ${this.debugInfo.entityCount}`,
      `Particles: ${this.debugInfo.particleCount}`,
      `Textures: ${this.textureCache.size}`,
    ];

    if (this.cameraState) {
      lines.push(`Camera: (${this.cameraState.x.toFixed(0)}, ${this.cameraState.y.toFixed(0)})`);
      lines.push(`Zoom: ${this.cameraState.zoom.toFixed(2)}x`);
    }

    // Draw background
    const boxWidth = 160;
    const boxHeight = lines.length * lineHeight + padding * 2;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(padding, padding, boxWidth, boxHeight);

    // Draw text
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px monospace';
    lines.forEach((line, i) => {
      this.ctx.fillText(line, padding * 2, padding * 2 + i * lineHeight);
    });
  }

  cleanup(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    // Clear texture cache
    this.textureCache.clear();
  }

  // Get canvas for external use
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Get context for external use
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  // Get texture cache size
  getTextureCount(): number {
    return this.textureCache.size;
  }

  // Check if a texture is loaded
  isTextureLoaded(textureId: number): boolean {
    const entry = this.textureCache.get(textureId);
    return entry?.loaded ?? false;
  }
}
