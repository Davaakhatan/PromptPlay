import { defineQuery, enterQuery, exitQuery, IWorld } from 'bitecs';
import { Transform3D, Mesh, Material, Light } from '../components';
import { ThreeRenderer } from '../renderers/ThreeRenderer';

// Query for entities with mesh
const meshQuery = defineQuery([Transform3D, Mesh]);
const meshEnterQuery = enterQuery(meshQuery);
const meshExitQuery = exitQuery(meshQuery);

// Query for entities with light
const lightQuery = defineQuery([Transform3D, Light]);
const lightEnterQuery = enterQuery(lightQuery);
const lightExitQuery = exitQuery(lightQuery);

// Geometry type mapping
const GEOMETRY_NAMES = ['box', 'sphere', 'plane', 'cylinder', 'cone', 'torus', 'custom'];
const LIGHT_TYPE_NAMES = ['ambient', 'directional', 'point', 'spot', 'hemisphere'];

/**
 * System for rendering 3D entities
 */
export class Render3DSystem {
  constructor(private renderer: ThreeRenderer) {}

  /**
   * Execute the render system
   */
  execute(world: IWorld): void {
    // Handle new mesh entities
    const enteredMeshes = meshEnterQuery(world);
    for (const eid of enteredMeshes) {
      this.createMesh(eid);
    }

    // Handle removed mesh entities
    const exitedMeshes = meshExitQuery(world);
    for (const eid of exitedMeshes) {
      this.renderer.removeMesh(eid);
    }

    // Handle new light entities
    const enteredLights = lightEnterQuery(world);
    for (const eid of enteredLights) {
      this.createLight(eid);
    }

    // Handle removed light entities
    const exitedLights = lightExitQuery(world);
    for (const eid of exitedLights) {
      this.renderer.removeLight(eid);
    }

    // Update existing mesh transforms
    const meshes = meshQuery(world);
    for (const eid of meshes) {
      this.updateMeshTransform(eid);
    }

    // Update light positions
    const lights = lightQuery(world);
    for (const eid of lights) {
      this.updateLightTransform(eid);
    }
  }

  /**
   * Create a mesh for an entity
   */
  private createMesh(eid: number): void {
    const geometryType = GEOMETRY_NAMES[Mesh.geometry[eid]] || 'box';

    // Convert packed color to hex
    const colorInt = Material.color[eid] || 0x3498db;
    const color = '#' + colorInt.toString(16).padStart(6, '0');

    this.renderer.createMesh(
      eid,
      geometryType,
      {
        width: Mesh.width[eid] || 1,
        height: Mesh.height[eid] || 1,
        depth: Mesh.depth[eid] || 1,
        radius: Mesh.radius[eid] || 0.5,
      },
      {
        color,
        metallic: Material.metallic[eid] || 0.1,
        roughness: Material.roughness[eid] || 0.7,
      }
    );
  }

  /**
   * Create a light for an entity
   */
  private createLight(eid: number): void {
    const lightType = LIGHT_TYPE_NAMES[Light.type[eid]] || 'point';

    // Convert packed color to hex
    const colorInt = Light.color[eid] || 0xffffff;
    const color = '#' + colorInt.toString(16).padStart(6, '0');

    this.renderer.createLight(eid, lightType, {
      color,
      intensity: Light.intensity[eid] || 1,
      castShadow: Light.castShadow[eid] === 1,
    });
  }

  /**
   * Update mesh transform
   */
  private updateMeshTransform(eid: number): void {
    this.renderer.updateMeshTransform(
      eid,
      {
        x: Transform3D.x[eid],
        y: Transform3D.y[eid],
        z: Transform3D.z[eid],
      },
      {
        x: Transform3D.rotationX[eid],
        y: Transform3D.rotationY[eid],
        z: Transform3D.rotationZ[eid],
      },
      {
        x: Transform3D.scaleX[eid] || 1,
        y: Transform3D.scaleY[eid] || 1,
        z: Transform3D.scaleZ[eid] || 1,
      }
    );
  }

  /**
   * Update light transform
   */
  private updateLightTransform(eid: number): void {
    const light = this.renderer.getMesh(eid);
    if (light) {
      light.position.set(
        Transform3D.x[eid],
        Transform3D.y[eid],
        Transform3D.z[eid]
      );
    }
  }
}
