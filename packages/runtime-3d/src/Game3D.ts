import { createWorld, addEntity, removeEntity, addComponent, IWorld } from 'bitecs';
import { ThreeRenderer, ThreeRendererOptions } from './renderers/ThreeRenderer';
import { Render3DSystem } from './systems/Render3DSystem';
import { Transform3DSystem } from './systems/Transform3DSystem';
import { Input3DSystem } from './systems/Input3DSystem';
import { Physics3DSystem } from './systems/Physics3DSystem';
import { InputManager3D } from './input/InputManager3D';
import { CannonPhysics } from './physics/CannonPhysics';
import {
  Transform3D,
  Mesh,
  Material,
  Light,
  Velocity3D,
  Camera3D,
  Input3D,
  Collider3D,
  RigidBody3D,
} from './components';
import type { Game3DSpec, Entity3DComponents } from '@promptplay/shared-types';

export interface Game3DOptions extends ThreeRendererOptions {
  fixedDeltaTime?: number;
}

/**
 * Main 3D game class for PromptPlay
 */
export class Game3D {
  public readonly world: IWorld;
  public readonly renderer: ThreeRenderer;

  private isRunning = false;
  private lastTime = 0;
  private fixedDeltaTime: number;
  private accumulator = 0;

  // Systems
  private render3DSystem: Render3DSystem;
  private transform3DSystem: Transform3DSystem;
  private input3DSystem: Input3DSystem;
  private physics3DSystem: Physics3DSystem;

  // Physics
  private physics: CannonPhysics;

  // Input
  private inputManager: InputManager3D;

  // Entity tracking
  private entityMap: Map<string, number> = new Map();
  private entityNames: Map<number, string> = new Map();

  constructor(options: Game3DOptions = {}) {
    const { fixedDeltaTime = 1000 / 60, ...rendererOptions } = options;

    this.world = createWorld();
    this.renderer = new ThreeRenderer(rendererOptions);
    this.fixedDeltaTime = fixedDeltaTime;

    // Initialize physics with gravity
    this.physics = new CannonPhysics({
      gravity: { x: 0, y: -20, z: 0 },
    });

    // Initialize input
    this.inputManager = new InputManager3D();

    // Initialize systems
    this.render3DSystem = new Render3DSystem(this.renderer);
    this.transform3DSystem = new Transform3DSystem(this.renderer);
    this.input3DSystem = new Input3DSystem(this.inputManager);
    this.physics3DSystem = new Physics3DSystem(this.physics, this.renderer);

    // Add debug helpers in development
    if (process.env.NODE_ENV === 'development') {
      this.renderer.addGridHelper();
      this.renderer.addAxesHelper();
    }
  }

  /**
   * Load a game specification
   */
  loadSpec(spec: Game3DSpec): void {
    // Clear existing entities
    this.clear();

    // Configure scene
    if (spec.config) {
      this.renderer.configure(spec.config);
    }

    // Create entities
    for (const entitySpec of spec.entities) {
      this.createEntity(entitySpec.name, entitySpec.components, entitySpec.tags);
    }
  }

  /**
   * Create an entity with components
   */
  createEntity(
    name: string,
    components: Entity3DComponents,
    tags?: string[]
  ): number {
    const eid = addEntity(this.world);

    // Store name mapping
    this.entityMap.set(name, eid);
    this.entityNames.set(eid, name);

    // Add Transform3D component
    if (components.transform3d) {
      addComponent(this.world, Transform3D, eid);
      const t = components.transform3d;
      Transform3D.x[eid] = t.x;
      Transform3D.y[eid] = t.y;
      Transform3D.z[eid] = t.z;
      Transform3D.rotationX[eid] = t.rotationX ?? 0;
      Transform3D.rotationY[eid] = t.rotationY ?? 0;
      Transform3D.rotationZ[eid] = t.rotationZ ?? 0;
      Transform3D.scaleX[eid] = t.scaleX ?? 1;
      Transform3D.scaleY[eid] = t.scaleY ?? 1;
      Transform3D.scaleZ[eid] = t.scaleZ ?? 1;
    }

    // Add Mesh component
    if (components.mesh) {
      addComponent(this.world, Mesh, eid);
      const m = components.mesh;
      Mesh.geometry[eid] = this.geometryToIndex(m.geometry);
      Mesh.width[eid] = m.width ?? 1;
      Mesh.height[eid] = m.height ?? 1;
      Mesh.depth[eid] = m.depth ?? 1;
      Mesh.radius[eid] = m.radius ?? 0.5;
      Mesh.castShadow[eid] = m.castShadow ? 1 : 0;
      Mesh.receiveShadow[eid] = m.receiveShadow !== false ? 1 : 0;
      Mesh.visible[eid] = m.visible !== false ? 1 : 0;
    }

    // Add Material component
    if (components.material) {
      addComponent(this.world, Material, eid);
      const mat = components.material;
      Material.color[eid] = this.colorToInt(mat.color ?? '#3498db');
      Material.metallic[eid] = mat.metallic ?? 0.1;
      Material.roughness[eid] = mat.roughness ?? 0.7;
      Material.opacity[eid] = mat.opacity ?? 1;
      Material.emissiveIntensity[eid] = mat.emissiveIntensity ?? 0;
    }

    // Add Light component
    if (components.light) {
      addComponent(this.world, Light, eid);
      const l = components.light;
      Light.type[eid] = this.lightTypeToIndex(l.type);
      Light.color[eid] = this.colorToInt(l.color ?? '#ffffff');
      Light.intensity[eid] = l.intensity ?? 1;
      Light.castShadow[eid] = l.castShadow ? 1 : 0;
      Light.targetX[eid] = l.targetX ?? 0;
      Light.targetY[eid] = l.targetY ?? 0;
      Light.targetZ[eid] = l.targetZ ?? 0;
      Light.distance[eid] = l.distance ?? 0;
      Light.decay[eid] = l.decay ?? 2;
      Light.angle[eid] = l.angle ?? Math.PI / 4;
      Light.penumbra[eid] = l.penumbra ?? 0;
    }

    // Add Velocity3D component
    if (components.velocity3d) {
      addComponent(this.world, Velocity3D, eid);
      const v = components.velocity3d;
      Velocity3D.vx[eid] = v.vx;
      Velocity3D.vy[eid] = v.vy;
      Velocity3D.vz[eid] = v.vz;
      Velocity3D.angularX[eid] = v.angularX ?? 0;
      Velocity3D.angularY[eid] = v.angularY ?? 0;
      Velocity3D.angularZ[eid] = v.angularZ ?? 0;
    }

    // Add Camera3D component
    if (components.camera3d) {
      addComponent(this.world, Camera3D, eid);
      const c = components.camera3d;
      Camera3D.type[eid] = c.type === 'orthographic' ? 1 : 0;
      Camera3D.fov[eid] = c.fov ?? 75;
      Camera3D.near[eid] = c.near ?? 0.1;
      Camera3D.far[eid] = c.far ?? 1000;
      Camera3D.isActive[eid] = c.isActive !== false ? 1 : 0;
      Camera3D.followTarget[eid] = c.followTarget ?? -1;
      Camera3D.followSmoothing[eid] = c.followSmoothing ?? 0.1;
      Camera3D.followOffsetX[eid] = c.followOffsetX ?? 0;
      Camera3D.followOffsetY[eid] = c.followOffsetY ?? 5;
      Camera3D.followOffsetZ[eid] = c.followOffsetZ ?? 10;
    }

    // Add Input3D component
    if (components.input3d) {
      addComponent(this.world, Input3D, eid);
      const i = components.input3d;
      Input3D.moveSpeed[eid] = i.moveSpeed ?? 5;
      Input3D.jumpForce[eid] = i.jumpForce ?? 10;
      Input3D.canJump[eid] = i.canJump !== false ? 1 : 0;
      Input3D.isGrounded[eid] = i.isGrounded !== false ? 1 : 0;
    }

    // Add Collider3D component
    if (components.collider3d) {
      addComponent(this.world, Collider3D, eid);
      const c = components.collider3d;
      const colliderTypes = ['box', 'sphere', 'capsule', 'cylinder', 'plane'];
      Collider3D.type[eid] = colliderTypes.indexOf(c.type) !== -1 ? colliderTypes.indexOf(c.type) : 0;
      Collider3D.width[eid] = c.width ?? 1;
      Collider3D.height[eid] = c.height ?? 1;
      Collider3D.depth[eid] = c.depth ?? 1;
      Collider3D.radius[eid] = c.radius ?? 0.5;
      Collider3D.mass[eid] = c.mass ?? 1;
      Collider3D.friction[eid] = c.friction ?? 0.5;
      Collider3D.restitution[eid] = c.restitution ?? 0.3;
      Collider3D.isTrigger[eid] = c.isTrigger ? 1 : 0;
    }

    // Add RigidBody3D component
    if (components.rigidbody3d) {
      addComponent(this.world, RigidBody3D, eid);
      const rb = components.rigidbody3d;
      const bodyTypes = ['dynamic', 'static', 'kinematic'];
      RigidBody3D.type[eid] = bodyTypes.indexOf(rb.type ?? 'dynamic') !== -1 ? bodyTypes.indexOf(rb.type ?? 'dynamic') : 0;
      RigidBody3D.mass[eid] = rb.mass ?? 1;
      RigidBody3D.linearDamping[eid] = rb.linearDamping ?? 0.01;
      RigidBody3D.angularDamping[eid] = rb.angularDamping ?? 0.01;
      RigidBody3D.fixedRotation[eid] = rb.fixedRotation ? 1 : 0;

      // Ensure Velocity3D exists for physics entities (required for proper syncing)
      if (!components.velocity3d) {
        addComponent(this.world, Velocity3D, eid);
        Velocity3D.vx[eid] = 0;
        Velocity3D.vy[eid] = 0;
        Velocity3D.vz[eid] = 0;
        Velocity3D.angularX[eid] = 0;
        Velocity3D.angularY[eid] = 0;
        Velocity3D.angularZ[eid] = 0;
      }
    }

    // Initialize mesh in renderer if mesh component exists
    if (components.mesh && components.transform3d) {
      this.renderer.createMesh(
        eid,
        components.mesh.geometry,
        {
          width: components.mesh.width,
          height: components.mesh.height,
          depth: components.mesh.depth,
          radius: components.mesh.radius,
        },
        components.material ? {
          color: components.material.color,
          metallic: components.material.metallic,
          roughness: components.material.roughness,
        } : undefined,
        {
          castShadow: components.mesh.castShadow ?? true,
          receiveShadow: components.mesh.receiveShadow ?? true,
        }
      );

      // Set initial transform
      this.renderer.updateMeshTransform(
        eid,
        { x: components.transform3d.x, y: components.transform3d.y, z: components.transform3d.z },
        {
          x: components.transform3d.rotationX ?? 0,
          y: components.transform3d.rotationY ?? 0,
          z: components.transform3d.rotationZ ?? 0,
        },
        {
          x: components.transform3d.scaleX ?? 1,
          y: components.transform3d.scaleY ?? 1,
          z: components.transform3d.scaleZ ?? 1,
        }
      );
    }

    // Initialize light in renderer if light component exists
    if (components.light) {
      this.renderer.createLight(eid, components.light.type, {
        color: components.light.color,
        intensity: components.light.intensity,
        castShadow: components.light.castShadow,
      });
    }

    // Load 3D model if model3d component exists
    if (components.model3d && components.transform3d) {
      this.renderer.loadModel(eid, components.model3d.url, {
        scale: components.model3d.scale,
        castShadow: components.model3d.castShadow,
        receiveShadow: components.model3d.receiveShadow,
      }).then(() => {
        // Update transform after model loads
        if (components.transform3d) {
          this.renderer.updateMeshTransform(
            eid,
            { x: components.transform3d.x, y: components.transform3d.y, z: components.transform3d.z },
            {
              x: components.transform3d.rotationX ?? 0,
              y: components.transform3d.rotationY ?? 0,
              z: components.transform3d.rotationZ ?? 0,
            },
            {
              x: components.transform3d.scaleX ?? 1,
              y: components.transform3d.scaleY ?? 1,
              z: components.transform3d.scaleZ ?? 1,
            }
          );
        }
      }).catch((error) => {
        console.error(`Failed to load model for entity ${name}:`, error);
      });
    }

    return eid;
  }

  /**
   * Remove an entity
   */
  removeEntity(nameOrId: string | number): void {
    const eid = typeof nameOrId === 'string' ? this.entityMap.get(nameOrId) : nameOrId;
    if (eid === undefined) return;

    // Remove from renderer
    this.renderer.removeMesh(eid);
    this.renderer.removeLight(eid);

    // Remove from ECS
    removeEntity(this.world, eid);

    // Remove from tracking
    const name = this.entityNames.get(eid);
    if (name) this.entityMap.delete(name);
    this.entityNames.delete(eid);
  }

  /**
   * Clear all entities
   */
  clear(): void {
    const entities = Array.from(this.entityNames.keys());
    for (const eid of entities) {
      this.removeEntity(eid);
    }
    this.entityMap.clear();
    this.entityNames.clear();
    // Clear physics world to ensure no stale bodies remain
    this.physics.clear();
    // Clear physics system tracking state
    this.physics3DSystem.clear();
    // Clear all meshes from renderer (including any orphaned preview meshes)
    this.renderer.clearAllMeshes();
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Fixed timestep for physics
    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.fixedUpdate(this.fixedDeltaTime / 1000);
      this.accumulator -= this.fixedDeltaTime;
    }

    // Variable update for rendering
    this.update(deltaTime / 1000);

    // Render
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Fixed timestep update (for physics)
   */
  private fixedUpdate(dt: number): void {
    // Input system (reads keyboard, sets velocity)
    this.input3DSystem.execute(this.world, dt);
    // Physics system (handles gravity, collisions, updates transforms)
    this.physics3DSystem.execute(this.world, dt);
    // Transform system (for non-physics entities with velocity)
    this.transform3DSystem.execute(this.world, dt);
  }

  /**
   * Variable timestep update
   */
  private update(_dt: number): void {
    // Animation, camera, etc.
  }

  /**
   * Render the scene
   */
  private render(): void {
    this.render3DSystem.execute(this.world);
    this.renderer.render();
  }

  /**
   * Get entity ID by name
   */
  getEntityId(name: string): number | undefined {
    return this.entityMap.get(name);
  }

  /**
   * Get entity name by ID
   */
  getEntityName(eid: number): string | undefined {
    return this.entityNames.get(eid);
  }

  /**
   * Resize the game
   */
  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stop();
    this.clear();
    this.inputManager.cleanup();
    this.renderer.dispose();
  }

  // Helper methods
  private geometryToIndex(geometry: string): number {
    const types = ['box', 'sphere', 'plane', 'cylinder', 'cone', 'torus', 'custom'];
    return types.indexOf(geometry) !== -1 ? types.indexOf(geometry) : 0;
  }

  private lightTypeToIndex(type: string): number {
    const types = ['ambient', 'directional', 'point', 'spot', 'hemisphere'];
    return types.indexOf(type) !== -1 ? types.indexOf(type) : 2;
  }

  private colorToInt(hex: string): number {
    // Remove # and parse
    const clean = hex.replace('#', '').slice(0, 6);
    return parseInt(clean, 16);
  }
}
