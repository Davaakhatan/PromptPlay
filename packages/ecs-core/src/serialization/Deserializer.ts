import { addComponent } from 'bitecs';
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
      Transform.rotation[eid] = components.transform.rotation;
      Transform.scaleX[eid] = components.transform.scaleX;
      Transform.scaleY[eid] = components.transform.scaleY;
    }

    // Deserialize Velocity
    if (components.velocity) {
      addComponent(w, Velocity, eid);
      Velocity.vx[eid] = components.velocity.vx;
      Velocity.vy[eid] = components.velocity.vy;
    }

    // Deserialize Sprite
    if (components.sprite) {
      addComponent(w, Sprite, eid);
      const textureId = world.getTextureId(components.sprite.texture);
      Sprite.textureId[eid] = textureId;
      Sprite.width[eid] = components.sprite.width;
      Sprite.height[eid] = components.sprite.height;

      // Parse tint color (default to white if not specified)
      const tint = components.sprite.tint
        ? parseInt(components.sprite.tint.replace('#', ''), 16)
        : 0xffffffff;
      Sprite.tint[eid] = tint;
      Sprite.visible[eid] = 1;
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
      Input.moveSpeed[eid] = components.input.moveSpeed;
      Input.jumpForce[eid] = components.input.jumpForce;
      Input.canJump[eid] = components.input.canJump ?? true ? 1 : 0;
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
      AIBehavior.speed[eid] = components.aiBehavior.speed;
      AIBehavior.detectionRadius[eid] = components.aiBehavior.detectionRadius;
      AIBehavior.targetEntity[eid] = components.aiBehavior.targetEntity ?? 0;
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
