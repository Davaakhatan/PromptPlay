import * as CANNON from 'cannon-es';

export interface PhysicsConfig {
  gravity?: { x: number; y: number; z: number };
  allowSleep?: boolean;
  broadphase?: 'naive' | 'sap';
  iterations?: number;
}

export interface RigidBodyOptions {
  mass?: number;
  type?: 'dynamic' | 'static' | 'kinematic';
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  material?: CANNON.Material;
}

export interface ColliderShape {
  type: 'box' | 'sphere' | 'cylinder' | 'capsule' | 'plane';
  // Box dimensions
  width?: number;
  height?: number;
  depth?: number;
  // Sphere/Cylinder/Capsule
  radius?: number;
  // Capsule specific
  capsuleHeight?: number;
  // Offset from body center
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
}

/**
 * Cannon-es physics wrapper for 3D physics simulation
 */
export class CannonPhysics {
  public readonly world: CANNON.World;
  private bodies: Map<number, CANNON.Body> = new Map();
  private contactMaterials: Map<string, CANNON.ContactMaterial> = new Map();

  // Default materials
  public readonly defaultMaterial: CANNON.Material;
  public readonly groundMaterial: CANNON.Material;
  public readonly bouncyMaterial: CANNON.Material;
  public readonly slipperyMaterial: CANNON.Material;

  constructor(config: PhysicsConfig = {}) {
    this.world = new CANNON.World();

    // Set gravity (default: Earth-like)
    const gravity = config.gravity ?? { x: 0, y: -9.82, z: 0 };
    this.world.gravity.set(gravity.x, gravity.y, gravity.z);

    // Configure solver (cast to GSSolver for iterations access)
    (this.world.solver as CANNON.GSSolver).iterations = config.iterations ?? 10;
    this.world.allowSleep = config.allowSleep ?? true;

    // Set broadphase
    if (config.broadphase === 'sap') {
      this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    } else {
      this.world.broadphase = new CANNON.NaiveBroadphase();
    }

    // Create default materials
    this.defaultMaterial = new CANNON.Material('default');
    this.groundMaterial = new CANNON.Material('ground');
    this.bouncyMaterial = new CANNON.Material('bouncy');
    this.slipperyMaterial = new CANNON.Material('slippery');

    // Setup default contact materials
    this.setupDefaultContactMaterials();
  }

  /**
   * Setup default contact material interactions
   */
  private setupDefaultContactMaterials(): void {
    // Default-to-default contact
    const defaultContact = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(defaultContact);

    // Default-to-ground contact
    const groundContact = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.groundMaterial,
      {
        friction: 0.5,
        restitution: 0.05,
      }
    );
    this.world.addContactMaterial(groundContact);

    // Bouncy material contacts
    const bouncyContact = new CANNON.ContactMaterial(
      this.bouncyMaterial,
      this.defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.9,
      }
    );
    this.world.addContactMaterial(bouncyContact);

    // Slippery material contacts
    const slipperyContact = new CANNON.ContactMaterial(
      this.slipperyMaterial,
      this.defaultMaterial,
      {
        friction: 0.01,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(slipperyContact);
  }

  /**
   * Create a collider shape
   */
  createShape(shape: ColliderShape): CANNON.Shape {
    switch (shape.type) {
      case 'box':
        return new CANNON.Box(
          new CANNON.Vec3(
            (shape.width ?? 1) / 2,
            (shape.height ?? 1) / 2,
            (shape.depth ?? 1) / 2
          )
        );

      case 'sphere':
        return new CANNON.Sphere(shape.radius ?? 0.5);

      case 'cylinder':
        return new CANNON.Cylinder(
          shape.radius ?? 0.5,
          shape.radius ?? 0.5,
          shape.height ?? 1,
          16
        );

      case 'capsule': {
        // Cannon-es doesn't have native capsule, use compound shape
        const radius = shape.radius ?? 0.5;
        const halfHeight = (shape.capsuleHeight ?? 1) / 2;

        // Create cylinder body with sphere caps
        const cylinder = new CANNON.Cylinder(radius, radius, halfHeight * 2, 16);
        // For simplicity, return cylinder - full capsule would need compound body
        return cylinder;
      }

      case 'plane':
        return new CANNON.Plane();

      default:
        return new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    }
  }

  /**
   * Create a rigid body for an entity
   */
  createBody(
    entityId: number,
    shape: ColliderShape,
    position: { x: number; y: number; z: number },
    options: RigidBodyOptions = {}
  ): CANNON.Body {
    const cannonShape = this.createShape(shape);

    // Determine body type (use number type to avoid TS enum issues)
    let bodyType: number = CANNON.Body.DYNAMIC;
    if (options.type === 'static') {
      bodyType = CANNON.Body.STATIC;
    } else if (options.type === 'kinematic') {
      bodyType = CANNON.Body.KINEMATIC;
    }

    const body = new CANNON.Body({
      mass: options.type === 'static' ? 0 : (options.mass ?? 1),
      type: bodyType as typeof CANNON.Body.DYNAMIC,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: options.material ?? this.defaultMaterial,
      linearDamping: options.linearDamping ?? 0.01,
      angularDamping: options.angularDamping ?? 0.01,
      fixedRotation: options.fixedRotation ?? false,
    });

    // Add shape with offset if specified
    if (shape.offsetX || shape.offsetY || shape.offsetZ) {
      body.addShape(
        cannonShape,
        new CANNON.Vec3(
          shape.offsetX ?? 0,
          shape.offsetY ?? 0,
          shape.offsetZ ?? 0
        )
      );
    } else {
      body.addShape(cannonShape);
    }

    // Store entity ID in userData
    (body as unknown as { userData: { entityId: number } }).userData = { entityId };

    // Add to world and store
    this.world.addBody(body);
    this.bodies.set(entityId, body);

    return body;
  }

  /**
   * Get body for entity
   */
  getBody(entityId: number): CANNON.Body | undefined {
    return this.bodies.get(entityId);
  }

  /**
   * Remove body for entity
   */
  removeBody(entityId: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(entityId);
    }
  }

  /**
   * Set body position
   */
  setPosition(entityId: number, x: number, y: number, z: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.position.set(x, y, z);
      body.velocity.setZero();
      body.angularVelocity.setZero();
    }
  }

  /**
   * Set body velocity
   */
  setVelocity(entityId: number, vx: number, vy: number, vz: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.velocity.set(vx, vy, vz);
    }
  }

  /**
   * Apply force to body
   */
  applyForce(entityId: number, fx: number, fy: number, fz: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.applyForce(new CANNON.Vec3(fx, fy, fz));
    }
  }

  /**
   * Apply impulse to body
   */
  applyImpulse(entityId: number, ix: number, iy: number, iz: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.applyImpulse(new CANNON.Vec3(ix, iy, iz));
    }
  }

  /**
   * Set gravity
   */
  setGravity(x: number, y: number, z: number): void {
    this.world.gravity.set(x, y, z);
  }

  /**
   * Step the physics simulation
   */
  step(dt: number, maxSubSteps = 3): void {
    this.world.step(1 / 60, dt, maxSubSteps);
  }

  /**
   * Get all body positions for syncing with renderer
   */
  getBodyStates(): Map<number, {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
  }> {
    const states = new Map();

    this.bodies.forEach((body, entityId) => {
      states.set(entityId, {
        position: {
          x: body.position.x,
          y: body.position.y,
          z: body.position.z,
        },
        quaternion: {
          x: body.quaternion.x,
          y: body.quaternion.y,
          z: body.quaternion.z,
          w: body.quaternion.w,
        },
        velocity: {
          x: body.velocity.x,
          y: body.velocity.y,
          z: body.velocity.z,
        },
      });
    });

    return states;
  }

  /**
   * Get single body state
   */
  getBodyState(entityId: number): {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
  } | null {
    const body = this.bodies.get(entityId);
    if (!body) return null;

    return {
      position: {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      },
      quaternion: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
      velocity: {
        x: body.velocity.x,
        y: body.velocity.y,
        z: body.velocity.z,
      },
    };
  }

  /**
   * Add collision event listener
   */
  onCollision(
    callback: (entityA: number, entityB: number, event: 'begin' | 'end') => void
  ): void {
    // Define collision event interface locally since cannon-es doesn't export it
    interface CollisionEvent {
      bodyA: CANNON.Body;
      bodyB: CANNON.Body;
    }

    this.world.addEventListener('beginContact', (event: CollisionEvent) => {
      const bodyA = event.bodyA as unknown as { userData?: { entityId: number } };
      const bodyB = event.bodyB as unknown as { userData?: { entityId: number } };

      if (bodyA.userData?.entityId !== undefined && bodyB.userData?.entityId !== undefined) {
        callback(bodyA.userData.entityId, bodyB.userData.entityId, 'begin');
      }
    });

    this.world.addEventListener('endContact', (event: CollisionEvent) => {
      const bodyA = event.bodyA as unknown as { userData?: { entityId: number } };
      const bodyB = event.bodyB as unknown as { userData?: { entityId: number } };

      if (bodyA.userData?.entityId !== undefined && bodyB.userData?.entityId !== undefined) {
        callback(bodyA.userData.entityId, bodyB.userData.entityId, 'end');
      }
    });
  }

  /**
   * Create a constraint between two bodies
   */
  createDistanceConstraint(
    entityA: number,
    entityB: number,
    distance?: number
  ): CANNON.DistanceConstraint | null {
    const bodyA = this.bodies.get(entityA);
    const bodyB = this.bodies.get(entityB);

    if (!bodyA || !bodyB) return null;

    const constraint = new CANNON.DistanceConstraint(bodyA, bodyB, distance);
    this.world.addConstraint(constraint);
    return constraint;
  }

  /**
   * Create a hinge constraint (revolute joint)
   */
  createHingeConstraint(
    entityA: number,
    entityB: number,
    pivotA: { x: number; y: number; z: number },
    axisA: { x: number; y: number; z: number },
    pivotB: { x: number; y: number; z: number },
    axisB: { x: number; y: number; z: number }
  ): CANNON.HingeConstraint | null {
    const bodyA = this.bodies.get(entityA);
    const bodyB = this.bodies.get(entityB);

    if (!bodyA || !bodyB) return null;

    const constraint = new CANNON.HingeConstraint(bodyA, bodyB, {
      pivotA: new CANNON.Vec3(pivotA.x, pivotA.y, pivotA.z),
      axisA: new CANNON.Vec3(axisA.x, axisA.y, axisA.z),
      pivotB: new CANNON.Vec3(pivotB.x, pivotB.y, pivotB.z),
      axisB: new CANNON.Vec3(axisB.x, axisB.y, axisB.z),
    });
    this.world.addConstraint(constraint);
    return constraint;
  }

  /**
   * Clear all bodies
   */
  clear(): void {
    this.bodies.forEach((body) => {
      this.world.removeBody(body);
    });
    this.bodies.clear();
  }

  /**
   * Dispose physics world
   */
  dispose(): void {
    this.clear();
  }
}
