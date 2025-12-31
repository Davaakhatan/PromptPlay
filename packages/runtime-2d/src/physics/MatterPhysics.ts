import { Engine, World, Bodies, Body, Events, Pair } from 'matter-js';
import { hasComponent } from 'bitecs';
import { GameWorld, Transform, Velocity, Collider, Input } from '@promptplay/ecs-core';

export class MatterPhysics {
  private engine: Engine;
  private world: GameWorld;
  private bodyMap: Map<number, Body> = new Map();
  private collisionCallbacks: Array<(a: number, b: number) => void> = [];
  private groundContacts: Map<number, Set<number>> = new Map();

  constructor(engine: Engine, world: GameWorld) {
    this.engine = engine;
    this.world = world;

    // Set up collision events
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair, true);
      }
    });

    Events.on(this.engine, 'collisionEnd', (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair, false);
      }
    });
  }

  private getEntityFromBody(body: Body): number | undefined {
    for (const [eid, b] of this.bodyMap) {
      if (b === body) return eid;
    }
    return undefined;
  }

  private handleCollision(pair: Pair, isStart: boolean): void {
    const eidA = this.getEntityFromBody(pair.bodyA);
    const eidB = this.getEntityFromBody(pair.bodyB);

    if (eidA === undefined || eidB === undefined) return;

    // Fire collision callbacks on start
    if (isStart) {
      for (const callback of this.collisionCallbacks) {
        callback(eidA, eidB);
      }
    }

    // Check for ground contact using collision normal
    // Normal points from A to B, so if normal.y < 0, A is on top of B
    if (pair.collision && pair.collision.normal) {
      const normal = pair.collision.normal;

      if (normal.y < -0.5) {
        // A is landing on B
        if (isStart) {
          this.addGroundContact(eidA, eidB);
        } else {
          this.removeGroundContact(eidA, eidB);
        }
      } else if (normal.y > 0.5) {
        // B is landing on A
        if (isStart) {
          this.addGroundContact(eidB, eidA);
        } else {
          this.removeGroundContact(eidB, eidA);
        }
      }
    }
  }

  private addGroundContact(eid: number, groundEid: number): void {
    if (!this.groundContacts.has(eid)) {
      this.groundContacts.set(eid, new Set());
    }
    this.groundContacts.get(eid)!.add(groundEid);
    this.updateGroundedState(eid);
  }

  private removeGroundContact(eid: number, groundEid: number): void {
    const contacts = this.groundContacts.get(eid);
    if (contacts) {
      contacts.delete(groundEid);
      this.updateGroundedState(eid);
    }
  }

  private updateGroundedState(eid: number): void {
    const w = this.world.getWorld();
    if (hasComponent(w, Input, eid)) {
      const contacts = this.groundContacts.get(eid);
      Input.isGrounded[eid] = (contacts && contacts.size > 0) ? 1 : 0;
    }
  }

  isGrounded(eid: number): boolean {
    const contacts = this.groundContacts.get(eid);
    return contacts !== undefined && contacts.size > 0;
  }

  initialize(): void {
    const w = this.world.getWorld();
    const entities = this.world.getEntities();

    for (const eid of entities) {
      if (hasComponent(w, Transform, eid) && hasComponent(w, Collider, eid)) {
        this.createBody(eid);
      }
    }
  }

  private createBody(eid: number): void {
    const x = Transform.x[eid];
    const y = Transform.y[eid];
    const type = Collider.type[eid];

    let body: Body;

    if (type === 0) {
      // Box collider
      const width = Collider.width[eid];
      const height = Collider.height[eid];
      body = Bodies.rectangle(x, y, width, height);
    } else {
      // Circle collider
      const radius = Collider.radius[eid];
      body = Bodies.circle(x, y, radius);
    }

    // Check if entity should be static
    const isStatic = this.world.hasTag(eid, 'static');
    Body.setStatic(body, isStatic);

    // Set as sensor if needed
    const isSensor = Collider.isSensor[eid] === 1;
    body.isSensor = isSensor;

    // Store entity ID in body for collision callbacks
    body.label = `entity_${eid}`;

    this.bodyMap.set(eid, body);
    World.add(this.engine.world, body);
  }

  update(deltaTime: number): void {
    // Step physics simulation (Matter.js expects milliseconds)
    Engine.update(this.engine, deltaTime * 1000);

    const w = this.world.getWorld();

    // Sync physics bodies back to ECS
    for (const [eid, body] of this.bodyMap) {
      if (!hasComponent(w, Transform, eid)) continue;

      // Update transform from physics
      Transform.x[eid] = body.position.x;
      Transform.y[eid] = body.position.y;
      Transform.rotation[eid] = body.angle;

      // Update velocity if component exists
      if (hasComponent(w, Velocity, eid)) {
        Velocity.vx[eid] = body.velocity.x;
        Velocity.vy[eid] = body.velocity.y;
      }
    }
  }

  // Apply force to a body
  applyForce(eid: number, fx: number, fy: number): void {
    const body = this.bodyMap.get(eid);
    if (body && !body.isStatic) {
      Body.applyForce(body, body.position, { x: fx, y: fy });
    }
  }

  // Set velocity directly
  setVelocity(eid: number, vx: number, vy: number): void {
    const body = this.bodyMap.get(eid);
    if (body && !body.isStatic) {
      Body.setVelocity(body, { x: vx, y: vy });
    }
  }

  // Add new body for dynamically created entities
  addBody(eid: number): void {
    if (!this.bodyMap.has(eid)) {
      this.createBody(eid);
    }
  }

  // Remove body when entity is destroyed
  removeBody(eid: number): void {
    const body = this.bodyMap.get(eid);
    if (body) {
      World.remove(this.engine.world, body);
      this.bodyMap.delete(eid);
    }
  }

  // Register collision callback
  onCollision(callback: (a: number, b: number) => void): void {
    this.collisionCallbacks.push(callback);
  }

  // Set gravity
  setGravity(x: number, y: number): void {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
  }

  cleanup(): void {
    for (const [eid, body] of this.bodyMap) {
      World.remove(this.engine.world, body);
    }
    this.bodyMap.clear();
    this.collisionCallbacks = [];
  }
}
