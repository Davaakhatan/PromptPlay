import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Health } from '@promptplay/ecs-core';
import { MatterPhysics } from '../physics/MatterPhysics';

export type CollisionHandler = (
  entityA: number,
  entityB: number,
  entityAName: string | undefined,
  entityBName: string | undefined,
  tagsA: string[],
  tagsB: string[],
  world: GameWorld
) => void;

export interface CollisionRule {
  tagA: string;
  tagB: string;
  handler: CollisionHandler;
}

export class CollisionEventSystem implements ISystem {
  private physics: MatterPhysics;
  private rules: CollisionRule[] = [];
  private onCollisionCallbacks: CollisionHandler[] = [];
  private world: GameWorld | null = null;

  constructor(physics: MatterPhysics) {
    this.physics = physics;
  }

  init(world: GameWorld): void {
    this.world = world;

    // Register with physics for collision callbacks
    this.physics.onCollision((eidA, eidB) => {
      this.handleCollision(eidA, eidB);
    });
  }

  private handleCollision(eidA: number, eidB: number): void {
    if (!this.world) return;

    const nameA = this.world.getEntityName(eidA);
    const nameB = this.world.getEntityName(eidB);
    const tagsA = this.world.getTags(eidA);
    const tagsB = this.world.getTags(eidB);

    // Fire general callbacks
    for (const callback of this.onCollisionCallbacks) {
      callback(eidA, eidB, nameA, nameB, tagsA, tagsB, this.world);
    }

    // Check rules
    for (const rule of this.rules) {
      const aHasTagA = tagsA.includes(rule.tagA);
      const aHasTagB = tagsA.includes(rule.tagB);
      const bHasTagA = tagsB.includes(rule.tagA);
      const bHasTagB = tagsB.includes(rule.tagB);

      // Check both orderings
      if (aHasTagA && bHasTagB) {
        rule.handler(eidA, eidB, nameA, nameB, tagsA, tagsB, this.world);
      } else if (aHasTagB && bHasTagA) {
        rule.handler(eidB, eidA, nameB, nameA, tagsB, tagsA, this.world);
      }
    }
  }

  // Add a collision rule based on tags
  addRule(tagA: string, tagB: string, handler: CollisionHandler): void {
    this.rules.push({ tagA, tagB, handler });
  }

  // Add a general collision callback
  onCollision(handler: CollisionHandler): void {
    this.onCollisionCallbacks.push(handler);
  }

  // Remove entity (useful for collectibles)
  removeEntity(eid: number): void {
    if (this.world) {
      this.physics.removeBody(eid);
      this.world.destroyEntity(eid);
    }
  }

  // Damage an entity
  damageEntity(eid: number, amount: number): boolean {
    if (!this.world) return false;

    const w = this.world.getWorld();
    if (!hasComponent(w, Health, eid)) return false;

    Health.current[eid] -= amount;

    if (Health.current[eid] <= 0) {
      Health.current[eid] = 0;
      return true; // Entity died
    }
    return false;
  }

  // Heal an entity
  healEntity(eid: number, amount: number): void {
    if (!this.world) return;

    const w = this.world.getWorld();
    if (!hasComponent(w, Health, eid)) return;

    Health.current[eid] = Math.min(
      Health.current[eid] + amount,
      Health.max[eid]
    );
  }

  update(): void {
    // Collision handling is event-based, no per-frame work needed
  }

  cleanup(): void {
    this.rules = [];
    this.onCollisionCallbacks = [];
    this.world = null;
  }
}
