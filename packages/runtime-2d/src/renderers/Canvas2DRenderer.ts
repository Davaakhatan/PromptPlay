import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Sprite } from '@promptplay/ecs-core';
import { CameraState } from '../systems/CameraSystem';

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

  // Texture cache: textureId -> TextureEntry
  private textureCache: Map<number, TextureEntry> = new Map();

  // Asset base path for loading textures
  private assetBasePath: string = '';

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

    // Render particles
    this.renderParticles();

    // Restore camera transformation
    this.ctx.restore();

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
