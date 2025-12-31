import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Sprite, Animation } from '@promptplay/ecs-core';

export class AnimationSystem implements ISystem {
  init(world: any): void {
    // No initialization needed
  }

  update(world: any, deltaTime: number): void {
    if (!(world instanceof GameWorld)) return;

    const w = world.getWorld();
    const entities = world.getEntities();
    const deltaMs = deltaTime * 1000; // Convert to milliseconds

    for (const eid of entities) {
      if (!hasComponent(w, Animation, eid)) continue;
      if (!hasComponent(w, Sprite, eid)) continue;

      // Skip if not playing
      if (Animation.isPlaying[eid] !== 1) continue;

      const frameCount = Animation.frameCount[eid];
      const frameDuration = Animation.frameDuration[eid];

      if (frameCount <= 1 || frameDuration <= 0) continue;

      // Accumulate time
      Animation.elapsed[eid] += deltaMs;

      // Check if we need to advance frame
      if (Animation.elapsed[eid] >= frameDuration) {
        Animation.elapsed[eid] -= frameDuration;

        let nextFrame = Animation.currentFrame[eid] + 1;

        if (nextFrame >= frameCount) {
          if (Animation.loop[eid] === 1) {
            // Loop back to start
            nextFrame = 0;
          } else {
            // Stop at last frame
            nextFrame = frameCount - 1;
            Animation.isPlaying[eid] = 0;
          }
        }

        Animation.currentFrame[eid] = nextFrame;

        // Update sprite texture ID to reflect current frame
        // The renderer can use (baseTextureId + currentFrame) to get the right frame
        // Or we store the frame in a way the renderer understands
      }
    }
  }

  cleanup?(world: any): void {
    // No cleanup needed
  }
}

// Helper functions for controlling animations
export function playAnimation(eid: number, animationId: number = 0): void {
  Animation.animationId[eid] = animationId;
  Animation.currentFrame[eid] = 0;
  Animation.elapsed[eid] = 0;
  Animation.isPlaying[eid] = 1;
}

export function stopAnimation(eid: number): void {
  Animation.isPlaying[eid] = 0;
}

export function pauseAnimation(eid: number): void {
  Animation.isPlaying[eid] = 0;
}

export function resumeAnimation(eid: number): void {
  Animation.isPlaying[eid] = 1;
}

export function setAnimationFrame(eid: number, frame: number): void {
  Animation.currentFrame[eid] = frame;
  Animation.elapsed[eid] = 0;
}
