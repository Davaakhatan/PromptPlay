import { addComponent } from 'bitecs';
import { GameSpec, EntitySpec } from '@promptplay/shared-types';
import { GameWorld } from '../world/World';
import {
  Transform,
  Velocity,
  Sprite,
  Collider,
  Input,
  Health,
  AIBehavior,
  Animation,
  Camera,
  ParticleEmitter,
  Audio,
} from '../components';

export class Deserializer {
  static deserialize(world: GameWorld, spec: GameSpec): void {
    // Clear existing world
    world.clear();

    // Set metadata and config
    world.setMetadata(spec.metadata);
    world.setConfig(spec.config);

    // Create entities
    for (const entitySpec of spec.entities) {
      this.deserializeEntity(world, entitySpec);
    }
  }

  private static deserializeEntity(world: GameWorld, entitySpec: EntitySpec): number {
    const w = world.getWorld();
    const eid = world.createEntity(entitySpec.name);
    const components = entitySpec.components;

    // Deserialize Transform
    if (components.transform) {
      addComponent(w, Transform, eid);
      Transform.x[eid] = components.transform.x;
      Transform.y[eid] = components.transform.y;
      Transform.rotation[eid] = components.transform.rotation ?? 0;
      Transform.scaleX[eid] = components.transform.scaleX ?? 1;
      Transform.scaleY[eid] = components.transform.scaleY ?? 1;
    }

    // Deserialize Velocity
    if (components.velocity) {
      addComponent(w, Velocity, eid);
      Velocity.vx[eid] = components.velocity.vx ?? 0;
      Velocity.vy[eid] = components.velocity.vy ?? 0;
    }

    // Deserialize Sprite
    if (components.sprite) {
      addComponent(w, Sprite, eid);
      const textureId = world.getTextureId(components.sprite.texture);
      Sprite.textureId[eid] = textureId;
      Sprite.width[eid] = components.sprite.width;
      Sprite.height[eid] = components.sprite.height;

      // Parse tint color (default to white if not specified)
      let tint = 0xffffffff;
      if (components.sprite.tint !== undefined) {
        if (typeof components.sprite.tint === 'number') {
          tint = components.sprite.tint;
        } else if (typeof components.sprite.tint === 'string') {
          tint = parseInt(components.sprite.tint.replace('#', ''), 16);
        }
      }
      Sprite.tint[eid] = tint;
      Sprite.visible[eid] = components.sprite.visible !== false ? 1 : 0;

      // Z-index for layer ordering
      Sprite.zIndex[eid] = components.sprite.zIndex ?? 0;

      // Sprite sheet support
      Sprite.frameX[eid] = components.sprite.frameX ?? 0;
      Sprite.frameY[eid] = components.sprite.frameY ?? 0;
      Sprite.frameWidth[eid] = components.sprite.frameWidth ?? 0;
      Sprite.frameHeight[eid] = components.sprite.frameHeight ?? 0;

      // Anchor point (default center)
      Sprite.anchorX[eid] = components.sprite.anchorX ?? 0.5;
      Sprite.anchorY[eid] = components.sprite.anchorY ?? 0.5;

      // Flip support
      Sprite.flipX[eid] = components.sprite.flipX ? 1 : 0;
      Sprite.flipY[eid] = components.sprite.flipY ? 1 : 0;
    }

    // Deserialize Collider
    if (components.collider) {
      addComponent(w, Collider, eid);
      Collider.type[eid] = components.collider.type === 'box' ? 0 : 1;
      Collider.width[eid] = components.collider.width ?? 0;
      Collider.height[eid] = components.collider.height ?? 0;
      Collider.radius[eid] = components.collider.radius ?? 0;
      Collider.isSensor[eid] = components.collider.isSensor ? 1 : 0;
      Collider.layer[eid] = components.collider.layer ?? 0;
    }

    // Deserialize Input
    if (components.input) {
      addComponent(w, Input, eid);
      Input.moveSpeed[eid] = components.input.moveSpeed ?? 200;
      Input.jumpForce[eid] = components.input.jumpForce ?? -400;
      Input.canJump[eid] = (components.input.canJump ?? true) ? 1 : 0;
    }

    // Deserialize Health
    if (components.health) {
      addComponent(w, Health, eid);
      Health.current[eid] = components.health.current;
      Health.max[eid] = components.health.max;
    }

    // Deserialize AIBehavior
    if (components.aiBehavior) {
      addComponent(w, AIBehavior, eid);
      const behaviorType =
        components.aiBehavior.type === 'patrol'
          ? 0
          : components.aiBehavior.type === 'chase'
          ? 1
          : 2;
      AIBehavior.behaviorType[eid] = behaviorType;
      AIBehavior.speed[eid] = components.aiBehavior.speed ?? 50;
      AIBehavior.detectionRadius[eid] = components.aiBehavior.detectionRadius ?? 100;
      AIBehavior.targetEntity[eid] = components.aiBehavior.targetEntity ?? 0;
    }

    // Deserialize Animation
    if (components.animation) {
      addComponent(w, Animation, eid);
      Animation.currentFrame[eid] = components.animation.currentFrame ?? 0;
      Animation.frameCount[eid] = components.animation.frameCount ?? 1;
      Animation.frameDuration[eid] = components.animation.frameDuration ?? 100;
      Animation.elapsed[eid] = 0;
      Animation.isPlaying[eid] = (components.animation.isPlaying ?? true) ? 1 : 0;
      Animation.loop[eid] = (components.animation.loop ?? true) ? 1 : 0;
      Animation.animationId[eid] = components.animation.animationId ?? 0;
    }

    // Deserialize Camera
    if (components.camera) {
      addComponent(w, Camera, eid);
      Camera.offsetX[eid] = components.camera.offsetX ?? 0;
      Camera.offsetY[eid] = components.camera.offsetY ?? 0;
      Camera.zoom[eid] = components.camera.zoom ?? 1;
      Camera.followTarget[eid] = components.camera.followTarget ?? 0;
      Camera.followSmoothing[eid] = components.camera.followSmoothing ?? 0.1;
      Camera.viewportWidth[eid] = components.camera.viewportWidth ?? 800;
      Camera.viewportHeight[eid] = components.camera.viewportHeight ?? 600;
      Camera.shakeIntensity[eid] = components.camera.shakeIntensity ?? 0;
      Camera.shakeDuration[eid] = components.camera.shakeDuration ?? 0;
      Camera.shakeElapsed[eid] = 0;
      Camera.isActive[eid] = (components.camera.isActive ?? false) ? 1 : 0;
    }

    // Deserialize ParticleEmitter
    if (components.particleEmitter) {
      addComponent(w, ParticleEmitter, eid);
      const pe = components.particleEmitter;
      ParticleEmitter.emitRate[eid] = pe.emitRate ?? 10;
      ParticleEmitter.maxParticles[eid] = pe.maxParticles ?? 100;
      ParticleEmitter.minLifetime[eid] = pe.minLifetime ?? 0.5;
      ParticleEmitter.maxLifetime[eid] = pe.maxLifetime ?? 1.5;
      ParticleEmitter.minSize[eid] = pe.minSize ?? 2;
      ParticleEmitter.maxSize[eid] = pe.maxSize ?? 8;
      ParticleEmitter.minSpeed[eid] = pe.minSpeed ?? 50;
      ParticleEmitter.maxSpeed[eid] = pe.maxSpeed ?? 150;
      ParticleEmitter.minAngle[eid] = pe.minAngle ?? 0;
      ParticleEmitter.maxAngle[eid] = pe.maxAngle ?? Math.PI * 2;

      // Parse colors
      let startColor = 0xFFFF00;
      let endColor = 0xFF0000;
      if (pe.startColor !== undefined) {
        startColor = typeof pe.startColor === 'string'
          ? parseInt(pe.startColor.replace('#', ''), 16)
          : pe.startColor;
      }
      if (pe.endColor !== undefined) {
        endColor = typeof pe.endColor === 'string'
          ? parseInt(pe.endColor.replace('#', ''), 16)
          : pe.endColor;
      }
      ParticleEmitter.startColor[eid] = startColor;
      ParticleEmitter.endColor[eid] = endColor;

      ParticleEmitter.gravityX[eid] = pe.gravityX ?? 0;
      ParticleEmitter.gravityY[eid] = pe.gravityY ?? 0;
      ParticleEmitter.isEmitting[eid] = (pe.isEmitting ?? true) ? 1 : 0;
      ParticleEmitter.burstCount[eid] = pe.burstCount ?? 0;
      ParticleEmitter.timeSinceEmit[eid] = 0;
      ParticleEmitter.activeParticles[eid] = 0;
    }

    // Deserialize Audio
    if (components.audio) {
      addComponent(w, Audio, eid);
      const audioId = world.getAudioId(components.audio.source);
      Audio.sourceId[eid] = audioId;
      Audio.volume[eid] = components.audio.volume ?? 1;
      Audio.pitch[eid] = components.audio.pitch ?? 1;
      Audio.isPlaying[eid] = (components.audio.isPlaying ?? false) ? 1 : 0;
      Audio.loop[eid] = (components.audio.loop ?? false) ? 1 : 0;
      Audio.spatial[eid] = (components.audio.spatial ?? false) ? 1 : 0;
      Audio.maxDistance[eid] = components.audio.maxDistance ?? 1000;
    }

    // Add tags
    if (entitySpec.tags) {
      for (const tag of entitySpec.tags) {
        world.addTag(eid, tag);
      }
    }

    return eid;
  }
}
