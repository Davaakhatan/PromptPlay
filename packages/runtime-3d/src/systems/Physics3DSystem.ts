import { defineQuery, enterQuery, exitQuery, hasComponent, IWorld } from 'bitecs';
import { Transform3D, Collider3D, Velocity3D, RigidBody3D, Input3D } from '../components';
import { CannonPhysics, ColliderShape, RigidBodyOptions } from '../physics/CannonPhysics';
import { ThreeRenderer } from '../renderers/ThreeRenderer';
import * as THREE from 'three';

// Query for entities with physics components
const physicsQuery = defineQuery([Transform3D, Collider3D, RigidBody3D]);
const physicsEnterQuery = enterQuery(physicsQuery);
const physicsExitQuery = exitQuery(physicsQuery);

// Collider type mapping
const COLLIDER_TYPES = ['box', 'sphere', 'capsule', 'cylinder', 'plane'] as const;
const BODY_TYPES = ['dynamic', 'static', 'kinematic'] as const;

/**
 * System for handling 3D physics simulation
 */
export class Physics3DSystem {
  private physics: CannonPhysics;
  private renderer?: ThreeRenderer;
  private debugMeshes: Map<number, THREE.LineSegments> = new Map();
  private debugEnabled = false;

  constructor(physics: CannonPhysics, renderer?: ThreeRenderer) {
    this.physics = physics;
    this.renderer = renderer;

    // Setup collision callbacks
    this.physics.onCollision((entityA, entityB, event) => {
      // Dispatch collision events - can be extended to call user callbacks
      if (event === 'begin') {
        this.onCollisionBegin(entityA, entityB);
      } else {
        this.onCollisionEnd(entityA, entityB);
      }
    });
  }

  /**
   * Enable/disable debug visualization
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;

    if (!enabled && this.renderer) {
      // Remove all debug meshes
      this.debugMeshes.forEach((mesh) => {
        this.renderer!.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      this.debugMeshes.clear();
    }
  }

  /**
   * Execute the physics system
   */
  execute(world: IWorld, dt: number): void {
    // Handle new physics entities
    const enteredEntities = physicsEnterQuery(world);
    for (const eid of enteredEntities) {
      this.createPhysicsBody(eid);
    }

    // Handle removed physics entities
    const exitedEntities = physicsExitQuery(world);
    for (const eid of exitedEntities) {
      this.removePhysicsBody(eid);
    }

    // Sync velocities from ECS to physics (for kinematic/player control)
    const entities = physicsQuery(world);
    for (const eid of entities) {
      if (RigidBody3D.type[eid] === 2) {
        // Kinematic body - sync from ECS
        this.physics.setVelocity(
          eid,
          Velocity3D.vx[eid] || 0,
          Velocity3D.vy[eid] || 0,
          Velocity3D.vz[eid] || 0
        );
      } else if (hasComponent(world, Input3D, eid)) {
        // Dynamic body with input - sync horizontal velocity, preserve physics vertical
        const bodyState = this.physics.getBodyState(eid);
        const physicsVy = bodyState?.velocity.y ?? 0;
        // Use ECS vx/vz for horizontal movement, but keep physics vy for gravity/jump
        const inputVy = Velocity3D.vy[eid] || 0;
        // If input has upward velocity (jump), use it; otherwise use physics
        const vy = inputVy > 0 ? inputVy : physicsVy;
        this.physics.setVelocity(
          eid,
          Velocity3D.vx[eid] || 0,
          vy,
          Velocity3D.vz[eid] || 0
        );
      }
    }

    // Step physics simulation
    this.physics.step(dt);

    // Sync physics state back to ECS
    const bodyStates = this.physics.getBodyStates();
    for (const eid of entities) {
      const state = bodyStates.get(eid);
      if (state) {
        // Update transform
        Transform3D.x[eid] = state.position.x;
        Transform3D.y[eid] = state.position.y;
        Transform3D.z[eid] = state.position.z;

        // Convert quaternion to Euler angles
        const euler = this.quaternionToEuler(state.quaternion);
        Transform3D.rotationX[eid] = euler.x;
        Transform3D.rotationY[eid] = euler.y;
        Transform3D.rotationZ[eid] = euler.z;

        // Update velocity
        Velocity3D.vx[eid] = state.velocity.x;
        Velocity3D.vy[eid] = state.velocity.y;
        Velocity3D.vz[eid] = state.velocity.z;
      }
    }

    // Update debug visualization
    if (this.debugEnabled && this.renderer) {
      this.updateDebugVisualization(entities);
    }
  }

  /**
   * Create physics body for an entity
   */
  private createPhysicsBody(eid: number): void {
    const colliderType = COLLIDER_TYPES[Collider3D.type[eid]] || 'box';

    const shape: ColliderShape = {
      type: colliderType,
      width: Collider3D.width[eid] || 1,
      height: Collider3D.height[eid] || 1,
      depth: Collider3D.depth[eid] || 1,
      radius: Collider3D.radius[eid] || 0.5,
    };

    const bodyType = BODY_TYPES[RigidBody3D.type[eid]] || 'dynamic';

    const options: RigidBodyOptions = {
      type: bodyType,
      mass: RigidBody3D.mass[eid] || 1,
      linearDamping: RigidBody3D.linearDamping[eid] || 0.01,
      angularDamping: RigidBody3D.angularDamping[eid] || 0.01,
      fixedRotation: RigidBody3D.fixedRotation[eid] === 1,
    };

    // Get material based on friction/restitution
    if (Collider3D.restitution[eid] > 0.5) {
      options.material = this.physics.bouncyMaterial;
    } else if (Collider3D.friction[eid] < 0.1) {
      options.material = this.physics.slipperyMaterial;
    }

    this.physics.createBody(
      eid,
      shape,
      {
        x: Transform3D.x[eid],
        y: Transform3D.y[eid],
        z: Transform3D.z[eid],
      },
      options
    );

    // Set initial velocity if present
    if (Velocity3D.vx[eid] || Velocity3D.vy[eid] || Velocity3D.vz[eid]) {
      this.physics.setVelocity(
        eid,
        Velocity3D.vx[eid] || 0,
        Velocity3D.vy[eid] || 0,
        Velocity3D.vz[eid] || 0
      );
    }
  }

  /**
   * Remove physics body for an entity
   */
  private removePhysicsBody(eid: number): void {
    this.physics.removeBody(eid);

    // Remove debug mesh if exists
    const debugMesh = this.debugMeshes.get(eid);
    if (debugMesh && this.renderer) {
      this.renderer.scene.remove(debugMesh);
      debugMesh.geometry.dispose();
      (debugMesh.material as THREE.Material).dispose();
      this.debugMeshes.delete(eid);
    }
  }

  /**
   * Convert quaternion to Euler angles
   */
  private quaternionToEuler(q: { x: number; y: number; z: number; w: number }): {
    x: number;
    y: number;
    z: number;
  } {
    const euler = new THREE.Euler();
    const quaternion = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    euler.setFromQuaternion(quaternion);
    return { x: euler.x, y: euler.y, z: euler.z };
  }

  /**
   * Update debug visualization
   */
  private updateDebugVisualization(entities: readonly number[]): void {
    if (!this.renderer) return;

    for (const eid of entities) {
      let debugMesh = this.debugMeshes.get(eid);

      if (!debugMesh) {
        // Create debug mesh
        const newMesh = this.createDebugMesh(eid);
        if (newMesh) {
          debugMesh = newMesh;
          this.debugMeshes.set(eid, newMesh);
          this.renderer.scene.add(newMesh);
        }
      }

      if (debugMesh) {
        // Update position
        debugMesh.position.set(
          Transform3D.x[eid],
          Transform3D.y[eid],
          Transform3D.z[eid]
        );
        debugMesh.rotation.set(
          Transform3D.rotationX[eid],
          Transform3D.rotationY[eid],
          Transform3D.rotationZ[eid]
        );
      }
    }
  }

  /**
   * Create debug wireframe mesh for collider visualization
   */
  private createDebugMesh(eid: number): THREE.LineSegments | null {
    const colliderType = COLLIDER_TYPES[Collider3D.type[eid]] || 'box';
    let geometry: THREE.BufferGeometry;

    switch (colliderType) {
      case 'box':
        geometry = new THREE.BoxGeometry(
          Collider3D.width[eid] || 1,
          Collider3D.height[eid] || 1,
          Collider3D.depth[eid] || 1
        );
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(Collider3D.radius[eid] || 0.5, 16, 8);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          Collider3D.radius[eid] || 0.5,
          Collider3D.radius[eid] || 0.5,
          Collider3D.height[eid] || 1,
          16
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: RigidBody3D.type[eid] === 1 ? 0x00ff00 : 0x00ffff, // Green for static, cyan for dynamic
      linewidth: 1,
    });

    geometry.dispose();
    return new THREE.LineSegments(edges, material);
  }

  /**
   * Collision begin callback
   */
  private onCollisionBegin(_entityA: number, _entityB: number): void {
    // Can be extended to trigger events or callbacks
    // console.log(`Collision begin: ${entityA} <-> ${entityB}`);
  }

  /**
   * Collision end callback
   */
  private onCollisionEnd(_entityA: number, _entityB: number): void {
    // Can be extended to trigger events or callbacks
    // console.log(`Collision end: ${entityA} <-> ${entityB}`);
  }

  /**
   * Apply force to an entity
   */
  applyForce(entityId: number, fx: number, fy: number, fz: number): void {
    this.physics.applyForce(entityId, fx, fy, fz);
  }

  /**
   * Apply impulse to an entity
   */
  applyImpulse(entityId: number, ix: number, iy: number, iz: number): void {
    this.physics.applyImpulse(entityId, ix, iy, iz);
  }

  /**
   * Set entity position (teleport)
   */
  setPosition(entityId: number, x: number, y: number, z: number): void {
    this.physics.setPosition(entityId, x, y, z);
    Transform3D.x[entityId] = x;
    Transform3D.y[entityId] = y;
    Transform3D.z[entityId] = z;
  }

  /**
   * Get physics instance
   */
  getPhysics(): CannonPhysics {
    return this.physics;
  }
}
