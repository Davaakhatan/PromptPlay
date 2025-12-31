import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Transform, Velocity, AIBehavior } from '@promptplay/ecs-core';
import { MatterPhysics } from '../physics/MatterPhysics';

// Behavior types
const BEHAVIOR_PATROL = 0;
const BEHAVIOR_CHASE = 1;
const BEHAVIOR_FLEE = 2;

export class AIBehaviorSystem implements ISystem {
  private physics: MatterPhysics;
  private patrolDirections: Map<number, number> = new Map(); // eid -> direction (1 or -1)
  private patrolTimers: Map<number, number> = new Map(); // eid -> time until direction change

  constructor(physics: MatterPhysics) {
    this.physics = physics;
  }

  init(world: any): void {
    // Initialize patrol directions
    if (!(world instanceof GameWorld)) return;

    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, AIBehavior, eid)) {
        this.patrolDirections.set(eid, 1);
        this.patrolTimers.set(eid, 2 + Math.random() * 2); // 2-4 seconds
      }
    }
  }

  update(world: any, deltaTime: number): void {
    if (!(world instanceof GameWorld)) return;

    const w = world.getWorld();
    const entities = world.getEntities();

    // Find player entity for chase/flee behaviors
    const playerEid = this.findPlayerEntity(world);

    for (const eid of entities) {
      if (!hasComponent(w, AIBehavior, eid)) continue;
      if (!hasComponent(w, Transform, eid)) continue;

      const behaviorType = AIBehavior.behaviorType[eid];
      const speed = AIBehavior.speed[eid];
      const detectionRadius = AIBehavior.detectionRadius[eid];

      switch (behaviorType) {
        case BEHAVIOR_PATROL:
          this.updatePatrol(eid, speed, deltaTime);
          break;
        case BEHAVIOR_CHASE:
          this.updateChase(eid, playerEid, speed, detectionRadius, world);
          break;
        case BEHAVIOR_FLEE:
          this.updateFlee(eid, playerEid, speed, detectionRadius, world);
          break;
      }
    }
  }

  private findPlayerEntity(world: GameWorld): number | undefined {
    const playerEntities = world.getEntitiesByTag('player');
    return playerEntities.length > 0 ? playerEntities[0] : undefined;
  }

  private updatePatrol(eid: number, speed: number, deltaTime: number): void {
    // Update patrol timer
    let timer = this.patrolTimers.get(eid) ?? 0;
    timer -= deltaTime;

    if (timer <= 0) {
      // Change direction
      const currentDir = this.patrolDirections.get(eid) ?? 1;
      this.patrolDirections.set(eid, -currentDir);
      timer = 2 + Math.random() * 2; // Reset timer
    }

    this.patrolTimers.set(eid, timer);

    // Move in current direction
    const direction = this.patrolDirections.get(eid) ?? 1;
    const vx = direction * speed;

    // Preserve vertical velocity
    const currentVy = Velocity.vy[eid] ?? 0;
    this.physics.setVelocity(eid, vx, currentVy);
  }

  private updateChase(
    eid: number,
    targetEid: number | undefined,
    speed: number,
    detectionRadius: number,
    world: GameWorld
  ): void {
    if (targetEid === undefined) return;

    const w = world.getWorld();
    if (!hasComponent(w, Transform, targetEid)) return;

    const myX = Transform.x[eid];
    const myY = Transform.y[eid];
    const targetX = Transform.x[targetEid];
    const targetY = Transform.y[targetEid];

    // Calculate distance to target
    const dx = targetX - myX;
    const dy = targetY - myY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only chase if within detection radius
    if (distance > detectionRadius) {
      // Stop moving if target is out of range
      const currentVy = Velocity.vy[eid] ?? 0;
      this.physics.setVelocity(eid, 0, currentVy);
      return;
    }

    // Normalize direction and apply speed
    if (distance > 0) {
      const vx = (dx / distance) * speed;
      // For platformers, usually only chase horizontally
      const currentVy = Velocity.vy[eid] ?? 0;
      this.physics.setVelocity(eid, vx, currentVy);
    }
  }

  private updateFlee(
    eid: number,
    threatEid: number | undefined,
    speed: number,
    detectionRadius: number,
    world: GameWorld
  ): void {
    if (threatEid === undefined) return;

    const w = world.getWorld();
    if (!hasComponent(w, Transform, threatEid)) return;

    const myX = Transform.x[eid];
    const myY = Transform.y[eid];
    const threatX = Transform.x[threatEid];
    const threatY = Transform.y[threatEid];

    // Calculate distance to threat
    const dx = myX - threatX; // Opposite direction for fleeing
    const dy = myY - threatY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only flee if threat is within detection radius
    if (distance > detectionRadius) {
      // Stop fleeing if threat is far enough
      const currentVy = Velocity.vy[eid] ?? 0;
      this.physics.setVelocity(eid, 0, currentVy);
      return;
    }

    // Flee in opposite direction
    if (distance > 0) {
      const vx = (dx / distance) * speed;
      const currentVy = Velocity.vy[eid] ?? 0;
      this.physics.setVelocity(eid, vx, currentVy);
    }
  }

  cleanup?(world: any): void {
    this.patrolDirections.clear();
    this.patrolTimers.clear();
  }
}
