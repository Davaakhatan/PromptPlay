import * as THREE from 'three';
import type { Scene3DConfig } from '@promptplay/shared-types';

export interface ThreeRendererOptions {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  antialias?: boolean;
  pixelRatio?: number;
}

/**
 * Three.js-based 3D renderer for PromptPlay
 */
export class ThreeRenderer {
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  private width: number;
  private height: number;
  private entityMeshes: Map<number, THREE.Object3D> = new Map();
  private entityLights: Map<number, THREE.Light> = new Map();

  constructor(options: ThreeRendererOptions = {}) {
    const {
      canvas,
      width = 800,
      height = 600,
      antialias = true,
      pixelRatio = window.devicePixelRatio || 1,
    } = options;

    this.width = width;
    this.height = height;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Create default perspective camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Add default lighting
    this.addDefaultLighting();
  }

  /**
   * Add default ambient and directional lighting
   */
  private addDefaultLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    // Main directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 7.5);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -20;
    directional.shadow.camera.right = 20;
    directional.shadow.camera.top = 20;
    directional.shadow.camera.bottom = -20;
    this.scene.add(directional);
  }

  /**
   * Configure scene from spec
   */
  configure(config: Scene3DConfig): void {
    // Background color
    if (config.backgroundColor) {
      this.scene.background = new THREE.Color(config.backgroundColor);
    }

    // Fog
    if (config.fogColor && config.fogNear !== undefined && config.fogFar !== undefined) {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(config.fogColor),
        config.fogNear,
        config.fogFar
      );
    }

    // TODO: Skybox support
    // TODO: Custom ambient lighting
  }

  /**
   * Create a mesh for an entity
   */
  createMesh(
    entityId: number,
    geometryType: string,
    dimensions: { width?: number; height?: number; depth?: number; radius?: number },
    materialProps?: { color?: string; metallic?: number; roughness?: number }
  ): THREE.Mesh {
    // Create geometry based on type
    let geometry: THREE.BufferGeometry;
    const { width = 1, height = 1, depth = 1, radius = 0.5 } = dimensions;

    switch (geometryType) {
      case 'box':
        geometry = new THREE.BoxGeometry(width, height, depth);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(radius, 32, 32);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(width, height);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(radius, height, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(radius, radius * 0.4, 16, 100);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    // Create PBR material
    const material = new THREE.MeshStandardMaterial({
      color: materialProps?.color ? new THREE.Color(materialProps.color) : 0x3498db,
      metalness: materialProps?.metallic ?? 0.1,
      roughness: materialProps?.roughness ?? 0.7,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.entityId = entityId;

    // Remove existing mesh if one exists for this entity
    const existingMesh = this.entityMeshes.get(entityId);
    if (existingMesh) {
      this.scene.remove(existingMesh);
      if (existingMesh instanceof THREE.Mesh) {
        existingMesh.geometry.dispose();
        if (Array.isArray(existingMesh.material)) {
          existingMesh.material.forEach(m => m.dispose());
        } else {
          existingMesh.material.dispose();
        }
      }
    }

    // Store and add to scene
    this.entityMeshes.set(entityId, mesh);
    this.scene.add(mesh);

    return mesh;
  }

  /**
   * Update mesh transform
   */
  updateMeshTransform(
    entityId: number,
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number },
    scale?: { x: number; y: number; z: number }
  ): void {
    const mesh = this.entityMeshes.get(entityId);
    if (!mesh) return;

    mesh.position.set(position.x, position.y, position.z);

    if (rotation) {
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    if (scale) {
      mesh.scale.set(scale.x, scale.y, scale.z);
    }
  }

  /**
   * Create a light for an entity
   */
  createLight(
    entityId: number,
    type: string,
    props: { color?: string; intensity?: number; castShadow?: boolean }
  ): THREE.Light {
    const color = props.color ? new THREE.Color(props.color) : 0xffffff;
    const intensity = props.intensity ?? 1;
    let light: THREE.Light;

    switch (type) {
      case 'ambient':
        light = new THREE.AmbientLight(color, intensity);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(color, intensity);
        if (props.castShadow) {
          (light as THREE.DirectionalLight).castShadow = true;
        }
        break;
      case 'point':
        light = new THREE.PointLight(color, intensity);
        if (props.castShadow) {
          (light as THREE.PointLight).castShadow = true;
        }
        break;
      case 'spot':
        light = new THREE.SpotLight(color, intensity);
        if (props.castShadow) {
          (light as THREE.SpotLight).castShadow = true;
        }
        break;
      case 'hemisphere':
        light = new THREE.HemisphereLight(color, 0x444444, intensity);
        break;
      default:
        light = new THREE.PointLight(color, intensity);
    }

    light.userData.entityId = entityId;
    this.entityLights.set(entityId, light);
    this.scene.add(light);

    return light;
  }

  /**
   * Remove entity mesh
   */
  removeMesh(entityId: number): void {
    const mesh = this.entityMeshes.get(entityId);
    if (mesh) {
      this.scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
      this.entityMeshes.delete(entityId);
    }
  }

  /**
   * Clear all entity meshes (useful when reloading a game)
   */
  clearAllMeshes(): void {
    this.entityMeshes.forEach((mesh, entityId) => {
      this.scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        } else if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        }
      }
    });
    this.entityMeshes.clear();
  }

  /**
   * Remove entity light
   */
  removeLight(entityId: number): void {
    const light = this.entityLights.get(entityId);
    if (light) {
      this.scene.remove(light);
      this.entityLights.delete(entityId);
    }
  }

  /**
   * Get mesh for entity
   */
  getMesh(entityId: number): THREE.Object3D | undefined {
    return this.entityMeshes.get(entityId);
  }

  /**
   * Set active camera
   */
  setCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera): void {
    this.camera = camera;
  }

  /**
   * Update camera aspect ratio
   */
  updateCameraAspect(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.updateCameraAspect();
  }

  /**
   * Render the scene
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Dispose all meshes
    this.entityMeshes.forEach((mesh, entityId) => {
      this.removeMesh(entityId);
    });

    // Dispose all lights
    this.entityLights.forEach((light, entityId) => {
      this.removeLight(entityId);
    });

    // Dispose renderer
    this.renderer.dispose();
  }

  /**
   * Get the canvas element
   */
  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Add a grid helper for debugging
   */
  addGridHelper(size = 20, divisions = 20): void {
    const grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
    this.scene.add(grid);
  }

  /**
   * Add axes helper for debugging
   */
  addAxesHelper(size = 5): void {
    const axes = new THREE.AxesHelper(size);
    this.scene.add(axes);
  }
}
