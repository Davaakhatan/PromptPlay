import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Transform, Camera } from '@promptplay/ecs-core';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
}

export class CameraSystem implements ISystem {
  private cameraState: CameraState = {
    x: 400, // Default to center of typical 800x600 game world
    y: 300,
    zoom: 1,
    shakeOffsetX: 0,
    shakeOffsetY: 0,
  };

  private viewportWidth: number;
  private viewportHeight: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    // Default camera position to center of viewport
    this.cameraState.x = viewportWidth / 2;
    this.cameraState.y = viewportHeight / 2;
  }

  init(world: GameWorld): void {
    // Find active camera and initialize
    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, Camera, eid) && Camera.isActive[eid] === 1) {
        Camera.viewportWidth[eid] = this.viewportWidth;
        Camera.viewportHeight[eid] = this.viewportHeight;
        if (Camera.zoom[eid] === 0) {
          Camera.zoom[eid] = 1;
        }
      }
    }
  }

  update(world: GameWorld, deltaTime: number): void {
    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (!hasComponent(w, Camera, eid) || Camera.isActive[eid] !== 1) {
        continue;
      }

      // Get camera's own position
      let targetX = 0;
      let targetY = 0;

      if (hasComponent(w, Transform, eid)) {
        targetX = Transform.x[eid];
        targetY = Transform.y[eid];
      }

      // Follow target if set
      const followTarget = Camera.followTarget[eid];
      if (followTarget > 0 && hasComponent(w, Transform, followTarget)) {
        targetX = Transform.x[followTarget];
        targetY = Transform.y[followTarget];
      }

      // Apply offset
      targetX += Camera.offsetX[eid];
      targetY += Camera.offsetY[eid];

      // Smooth follow
      const smoothing = Camera.followSmoothing[eid];
      if (smoothing > 0 && smoothing < 1) {
        const lerpFactor = 1 - Math.pow(smoothing, deltaTime * 60);
        this.cameraState.x += (targetX - this.cameraState.x) * lerpFactor;
        this.cameraState.y += (targetY - this.cameraState.y) * lerpFactor;
      } else {
        this.cameraState.x = targetX;
        this.cameraState.y = targetY;
      }

      // Update zoom
      this.cameraState.zoom = Camera.zoom[eid] || 1;

      // Handle screen shake
      if (Camera.shakeDuration[eid] > 0) {
        Camera.shakeElapsed[eid] += deltaTime;

        if (Camera.shakeElapsed[eid] < Camera.shakeDuration[eid]) {
          const intensity = Camera.shakeIntensity[eid];
          const progress = Camera.shakeElapsed[eid] / Camera.shakeDuration[eid];
          const decay = 1 - progress; // Decay over time

          this.cameraState.shakeOffsetX = (Math.random() * 2 - 1) * intensity * decay;
          this.cameraState.shakeOffsetY = (Math.random() * 2 - 1) * intensity * decay;
        } else {
          // Shake complete
          Camera.shakeDuration[eid] = 0;
          Camera.shakeElapsed[eid] = 0;
          Camera.shakeIntensity[eid] = 0;
          this.cameraState.shakeOffsetX = 0;
          this.cameraState.shakeOffsetY = 0;
        }
      }
    }
  }

  getCameraState(): CameraState {
    return this.cameraState;
  }

  // Trigger screen shake on the active camera
  shake(world: GameWorld, intensity: number, duration: number): void {
    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, Camera, eid) && Camera.isActive[eid] === 1) {
        Camera.shakeIntensity[eid] = intensity;
        Camera.shakeDuration[eid] = duration;
        Camera.shakeElapsed[eid] = 0;
        break;
      }
    }
  }

  // Set zoom on active camera
  setZoom(world: GameWorld, zoom: number): void {
    const clampedZoom = Math.max(0.1, Math.min(10, zoom));
    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, Camera, eid) && Camera.isActive[eid] === 1) {
        Camera.zoom[eid] = clampedZoom;
        break;
      }
    }
    // Also update internal state directly for immediate effect
    this.cameraState.zoom = clampedZoom;
  }

  // Set camera position directly (for editor use)
  setPosition(x: number, y: number): void {
    this.cameraState.x = x;
    this.cameraState.y = y;
  }

  // Get viewport dimensions
  getViewportSize(): { width: number; height: number } {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  cleanup(): void {
    this.cameraState = {
      x: this.viewportWidth / 2,
      y: this.viewportHeight / 2,
      zoom: 1,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
    };
  }
}
