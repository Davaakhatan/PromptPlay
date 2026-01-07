import { hasComponent } from 'bitecs';
import { GameSpec, EntitySpec, EntityComponents } from '@promptplay/shared-types';
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

export class Serializer {
  static serialize(world: GameWorld): GameSpec {
    const spec: GameSpec = {
      version: '1.0',
      metadata: world.getMetadata(),
      config: world.getConfig(),
      entities: [],
      systems: world.getSystemNames(),
    };

    const entities = world.getEntities();
    for (const eid of entities) {
      const entitySpec = this.serializeEntity(world, eid);
      spec.entities.push(entitySpec);
    }

    return spec;
  }

  private static serializeEntity(world: GameWorld, eid: number): EntitySpec {
    const w = world.getWorld();
    const components: EntityComponents = {};

    // Serialize Transform
    if (hasComponent(w, Transform, eid)) {
      components.transform = {
        x: Transform.x[eid],
        y: Transform.y[eid],
        rotation: Transform.rotation[eid],
        scaleX: Transform.scaleX[eid],
        scaleY: Transform.scaleY[eid],
      };
    }

    // Serialize Velocity
    if (hasComponent(w, Velocity, eid)) {
      components.velocity = {
        vx: Velocity.vx[eid],
        vy: Velocity.vy[eid],
      };
    }

    // Serialize Sprite
    if (hasComponent(w, Sprite, eid)) {
      const textureId = Sprite.textureId[eid];
      const textureName = world.getTextureName(textureId) ?? 'unknown';

      components.sprite = {
        texture: textureName,
        width: Sprite.width[eid],
        height: Sprite.height[eid],
        tint: '#' + Sprite.tint[eid].toString(16).padStart(8, '0'),
        visible: Sprite.visible[eid] === 1,
        zIndex: Sprite.zIndex[eid],
        // Sprite sheet
        frameX: Sprite.frameX[eid],
        frameY: Sprite.frameY[eid],
        frameWidth: Sprite.frameWidth[eid],
        frameHeight: Sprite.frameHeight[eid],
        // Anchor
        anchorX: Sprite.anchorX[eid],
        anchorY: Sprite.anchorY[eid],
        // Flip
        flipX: Sprite.flipX[eid] === 1,
        flipY: Sprite.flipY[eid] === 1,
      };
    }

    // Serialize Collider
    if (hasComponent(w, Collider, eid)) {
      const type = Collider.type[eid] === 0 ? 'box' : 'circle';
      components.collider = {
        type,
        width: Collider.width[eid],
        height: Collider.height[eid],
        radius: Collider.radius[eid],
        isSensor: Collider.isSensor[eid] === 1,
        layer: Collider.layer[eid],
      };
    }

    // Serialize Input
    if (hasComponent(w, Input, eid)) {
      components.input = {
        moveSpeed: Input.moveSpeed[eid],
        jumpForce: Input.jumpForce[eid],
        canJump: Input.canJump[eid] === 1,
      };
    }

    // Serialize Health
    if (hasComponent(w, Health, eid)) {
      components.health = {
        current: Health.current[eid],
        max: Health.max[eid],
      };
    }

    // Serialize AIBehavior
    if (hasComponent(w, AIBehavior, eid)) {
      const behaviorType = AIBehavior.behaviorType[eid];
      const behaviorTypeStr =
        behaviorType === 0 ? 'patrol' : behaviorType === 1 ? 'chase' : 'flee';

      components.aiBehavior = {
        type: behaviorTypeStr,
        speed: AIBehavior.speed[eid],
        detectionRadius: AIBehavior.detectionRadius[eid],
        targetEntity: AIBehavior.targetEntity[eid],
      };
    }

    // Serialize Animation
    if (hasComponent(w, Animation, eid)) {
      components.animation = {
        currentFrame: Animation.currentFrame[eid],
        frameCount: Animation.frameCount[eid],
        frameDuration: Animation.frameDuration[eid],
        isPlaying: Animation.isPlaying[eid] === 1,
        loop: Animation.loop[eid] === 1,
        animationId: Animation.animationId[eid],
      };
    }

    // Serialize Camera
    if (hasComponent(w, Camera, eid)) {
      components.camera = {
        offsetX: Camera.offsetX[eid],
        offsetY: Camera.offsetY[eid],
        zoom: Camera.zoom[eid],
        followTarget: Camera.followTarget[eid],
        followSmoothing: Camera.followSmoothing[eid],
        viewportWidth: Camera.viewportWidth[eid],
        viewportHeight: Camera.viewportHeight[eid],
        shakeIntensity: Camera.shakeIntensity[eid],
        shakeDuration: Camera.shakeDuration[eid],
        isActive: Camera.isActive[eid] === 1,
      };
    }

    // Serialize ParticleEmitter
    if (hasComponent(w, ParticleEmitter, eid)) {
      components.particleEmitter = {
        emitRate: ParticleEmitter.emitRate[eid],
        maxParticles: ParticleEmitter.maxParticles[eid],
        minLifetime: ParticleEmitter.minLifetime[eid],
        maxLifetime: ParticleEmitter.maxLifetime[eid],
        minSize: ParticleEmitter.minSize[eid],
        maxSize: ParticleEmitter.maxSize[eid],
        minSpeed: ParticleEmitter.minSpeed[eid],
        maxSpeed: ParticleEmitter.maxSpeed[eid],
        minAngle: ParticleEmitter.minAngle[eid],
        maxAngle: ParticleEmitter.maxAngle[eid],
        startColor: ParticleEmitter.startColor[eid],
        endColor: ParticleEmitter.endColor[eid],
        gravityX: ParticleEmitter.gravityX[eid],
        gravityY: ParticleEmitter.gravityY[eid],
        isEmitting: ParticleEmitter.isEmitting[eid] === 1,
        burstCount: ParticleEmitter.burstCount[eid],
      };
    }

    // Serialize Audio
    if (hasComponent(w, Audio, eid)) {
      const audioId = Audio.sourceId[eid];
      const audioName = world.getAudioName(audioId) ?? 'unknown';

      components.audio = {
        source: audioName,
        volume: Audio.volume[eid],
        pitch: Audio.pitch[eid],
        isPlaying: Audio.isPlaying[eid] === 1,
        loop: Audio.loop[eid] === 1,
        spatial: Audio.spatial[eid] === 1,
        maxDistance: Audio.maxDistance[eid],
      };
    }

    const entitySpec: EntitySpec = {
      name: world.getEntityName(eid) ?? `entity_${eid}`,
      components,
      tags: world.getTags(eid),
    };

    return entitySpec;
  }
}
