/**
 * Level of Detail (LOD) System
 * Automatically switches between different detail levels based on camera distance
 */

import * as THREE from 'three';

// LOD level configuration
export interface LODLevel {
  distance: number;
  object: THREE.Object3D | null;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  visible?: boolean;
}

// LOD object configuration
export interface LODObjectConfig {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  levels: LODLevel[];
  fadeTransition?: boolean;
  fadeDistance?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

// LOD group for managing multiple LOD objects
export interface LODGroup {
  id: string;
  name: string;
  lod: THREE.LOD;
  config: LODObjectConfig;
  currentLevel: number;
  bounds: THREE.Sphere;
}

// LOD statistics
export interface LODStats {
  totalObjects: number;
  visibleObjects: number;
  levelDistribution: Record<number, number>;
  trianglesRendered: number;
  trianglesSaved: number;
  updateTime: number;
}

// Automatic LOD generation settings
export interface AutoLODSettings {
  levels: number;
  ratio: number; // Reduction ratio per level (0.5 = 50% reduction)
  distances: readonly number[] | number[];
  preserveEdges?: boolean;
  preserveUVs?: boolean;
}

// Built-in LOD presets
export const LOD_PRESETS = {
  low: {
    levels: 2,
    ratio: 0.3,
    distances: [0, 50],
  },
  medium: {
    levels: 3,
    ratio: 0.5,
    distances: [0, 30, 80],
  },
  high: {
    levels: 4,
    ratio: 0.6,
    distances: [0, 20, 50, 100],
  },
  ultra: {
    levels: 5,
    ratio: 0.7,
    distances: [0, 15, 35, 70, 150],
  },
} as const;

class LODSystemService {
  private objects: Map<string, LODGroup> = new Map();
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private stats: LODStats = {
    totalObjects: 0,
    visibleObjects: 0,
    levelDistribution: {},
    trianglesRendered: 0,
    trianglesSaved: 0,
    updateTime: 0,
  };

  // Configuration
  private updateFrequency: number = 1; // Update every N frames
  private frameCounter: number = 0;
  private autoUpdate: boolean = true;
  private maxDistance: number = 1000;
  private hysteresis: number = 1.1; // Prevent LOD popping

  /**
   * Initialize the LOD system
   */
  initialize(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Create a new LOD object
   */
  createLOD(config: LODObjectConfig): LODGroup {
    const lod = new THREE.LOD();
    lod.name = config.name;
    lod.position.set(...config.position);

    if (config.rotation) {
      lod.rotation.set(...config.rotation);
    }
    if (config.scale) {
      lod.scale.set(...config.scale);
    }

    // Add LOD levels
    for (const level of config.levels) {
      if (level.object) {
        level.object.castShadow = config.castShadow ?? true;
        level.object.receiveShadow = config.receiveShadow ?? true;
        lod.addLevel(level.object, level.distance);
      } else if (level.geometry && level.material) {
        const mesh = new THREE.Mesh(level.geometry, level.material);
        mesh.castShadow = config.castShadow ?? true;
        mesh.receiveShadow = config.receiveShadow ?? true;
        lod.addLevel(mesh, level.distance);
      }
    }

    // Calculate bounding sphere
    const bounds = new THREE.Sphere();
    const box = new THREE.Box3().setFromObject(lod);
    box.getBoundingSphere(bounds);

    const group: LODGroup = {
      id: config.id,
      name: config.name,
      lod,
      config,
      currentLevel: 0,
      bounds,
    };

    this.objects.set(config.id, group);

    if (this.scene) {
      this.scene.add(lod);
    }

    this.updateStats();
    return group;
  }

  /**
   * Create LOD from a base geometry with automatic simplification
   */
  createAutoLOD(
    id: string,
    name: string,
    baseGeometry: THREE.BufferGeometry,
    baseMaterial: THREE.Material,
    position: [number, number, number],
    settings: AutoLODSettings = LOD_PRESETS.medium
  ): LODGroup {
    const levels: LODLevel[] = [];

    for (let i = 0; i < settings.levels; i++) {
      const ratio = Math.pow(settings.ratio, i);
      const geometry = this.simplifyGeometry(baseGeometry, ratio, settings);
      const material = i === 0 ? baseMaterial : baseMaterial.clone();

      levels.push({
        distance: settings.distances[i] || i * 30,
        object: null,
        geometry,
        material,
      });
    }

    return this.createLOD({
      id,
      name,
      position,
      levels,
    });
  }

  /**
   * Simplify geometry (basic implementation - for production use a proper mesh decimation library)
   */
  private simplifyGeometry(
    geometry: THREE.BufferGeometry,
    ratio: number,
    _settings: AutoLODSettings
  ): THREE.BufferGeometry {
    if (ratio >= 1) return geometry.clone();

    const simplified = geometry.clone();
    const position = simplified.getAttribute('position');

    if (!position) return simplified;

    // Simple vertex reduction (for demo - use proper decimation in production)
    const targetCount = Math.floor(position.count * ratio);
    if (targetCount < 3) return simplified;

    // This is a placeholder - in production, use libraries like:
    // - meshoptimizer
    // - simplify-js
    // - Or implement proper quadric error metrics

    // For now, just return a scaled-down version
    // Real implementation would use edge collapse or vertex clustering

    return simplified;
  }

  /**
   * Create LOD for instanced meshes
   */
  createInstancedLOD(
    id: string,
    name: string,
    config: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      instanceCount: number;
      lodLevels: Array<{ geometry: THREE.BufferGeometry; distance: number }>;
    }
  ): LODGroup {
    const levels: LODLevel[] = [];

    // Full detail instanced mesh
    const fullMesh = new THREE.InstancedMesh(
      config.geometry,
      config.material,
      config.instanceCount
    );
    levels.push({ distance: 0, object: fullMesh });

    // Lower detail levels
    for (const level of config.lodLevels) {
      const mesh = new THREE.InstancedMesh(
        level.geometry,
        config.material,
        config.instanceCount
      );
      levels.push({ distance: level.distance, object: mesh });
    }

    return this.createLOD({
      id,
      name,
      position: [0, 0, 0],
      levels,
    });
  }

  /**
   * Update all LOD objects
   */
  update(): void {
    if (!this.autoUpdate || !this.camera) return;

    this.frameCounter++;
    if (this.frameCounter < this.updateFrequency) return;
    this.frameCounter = 0;

    const startTime = performance.now();
    this.stats.levelDistribution = {};
    this.stats.visibleObjects = 0;
    this.stats.trianglesRendered = 0;
    this.stats.trianglesSaved = 0;

    const cameraPosition = this.camera.position;

    for (const group of this.objects.values()) {
      // Update Three.js LOD
      group.lod.update(this.camera);

      // Calculate distance
      const distance = cameraPosition.distanceTo(group.lod.position);

      // Determine current level
      const newLevel = this.calculateLevel(group, distance);

      // Apply hysteresis to prevent popping
      if (newLevel !== group.currentLevel) {
        const threshold = group.config.levels[newLevel]?.distance || 0;
        const shouldSwitch =
          newLevel > group.currentLevel
            ? distance > threshold * this.hysteresis
            : distance < threshold / this.hysteresis;

        if (shouldSwitch) {
          group.currentLevel = newLevel;
        }
      }

      // Update stats
      if (distance < this.maxDistance) {
        this.stats.visibleObjects++;
        this.stats.levelDistribution[group.currentLevel] =
          (this.stats.levelDistribution[group.currentLevel] || 0) + 1;

        // Count triangles
        const currentObject = group.lod.levels[group.currentLevel]?.object;
        if (currentObject instanceof THREE.Mesh) {
          const geo = currentObject.geometry;
          const triangles = geo.index
            ? geo.index.count / 3
            : geo.attributes.position.count / 3;
          this.stats.trianglesRendered += triangles;

          // Calculate saved triangles
          const fullObject = group.lod.levels[0]?.object;
          if (fullObject instanceof THREE.Mesh && group.currentLevel > 0) {
            const fullGeo = fullObject.geometry;
            const fullTriangles = fullGeo.index
              ? fullGeo.index.count / 3
              : fullGeo.attributes.position.count / 3;
            this.stats.trianglesSaved += fullTriangles - triangles;
          }
        }
      }
    }

    this.stats.updateTime = performance.now() - startTime;
  }

  /**
   * Calculate appropriate LOD level for distance
   */
  private calculateLevel(group: LODGroup, distance: number): number {
    const levels = group.config.levels;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (distance >= levels[i].distance) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Force LOD level for an object
   */
  forceLevel(objectId: string, level: number): void {
    const group = this.objects.get(objectId);
    if (!group) return;

    const clampedLevel = Math.max(0, Math.min(level, group.config.levels.length - 1));

    // Hide all levels except forced one
    for (let i = 0; i < group.lod.levels.length; i++) {
      const obj = group.lod.levels[i].object;
      obj.visible = i === clampedLevel;
    }

    group.currentLevel = clampedLevel;
  }

  /**
   * Reset forced LOD level
   */
  resetForceLevel(objectId: string): void {
    const group = this.objects.get(objectId);
    if (!group) return;

    // Re-enable automatic LOD switching
    for (const level of group.lod.levels) {
      level.object.visible = true;
    }
  }

  /**
   * Set visibility for an object
   */
  setVisible(objectId: string, visible: boolean): void {
    const group = this.objects.get(objectId);
    if (group) {
      group.lod.visible = visible;
    }
  }

  /**
   * Update object position
   */
  setPosition(objectId: string, position: [number, number, number]): void {
    const group = this.objects.get(objectId);
    if (group) {
      group.lod.position.set(...position);
      group.config.position = position;
    }
  }

  /**
   * Remove an LOD object
   */
  removeObject(objectId: string): boolean {
    const group = this.objects.get(objectId);
    if (!group) return false;

    if (this.scene) {
      this.scene.remove(group.lod);
    }

    // Dispose geometries and materials
    for (const level of group.lod.levels) {
      if (level.object instanceof THREE.Mesh) {
        level.object.geometry?.dispose();
        if (Array.isArray(level.object.material)) {
          level.object.material.forEach(m => m.dispose());
        } else {
          level.object.material?.dispose();
        }
      }
    }

    this.objects.delete(objectId);
    this.updateStats();
    return true;
  }

  /**
   * Get all LOD objects
   */
  getObjects(): LODGroup[] {
    return Array.from(this.objects.values());
  }

  /**
   * Get a specific LOD object
   */
  getObject(objectId: string): LODGroup | undefined {
    return this.objects.get(objectId);
  }

  /**
   * Get statistics
   */
  getStats(): LODStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalObjects = this.objects.size;
  }

  /**
   * Set configuration
   */
  configure(options: {
    updateFrequency?: number;
    autoUpdate?: boolean;
    maxDistance?: number;
    hysteresis?: number;
  }): void {
    if (options.updateFrequency !== undefined) {
      this.updateFrequency = options.updateFrequency;
    }
    if (options.autoUpdate !== undefined) {
      this.autoUpdate = options.autoUpdate;
    }
    if (options.maxDistance !== undefined) {
      this.maxDistance = options.maxDistance;
    }
    if (options.hysteresis !== undefined) {
      this.hysteresis = options.hysteresis;
    }
  }

  /**
   * Get objects within distance
   */
  getObjectsWithinDistance(distance: number): LODGroup[] {
    if (!this.camera) return [];

    const cameraPosition = this.camera.position;
    return Array.from(this.objects.values()).filter(group => {
      return cameraPosition.distanceTo(group.lod.position) <= distance;
    });
  }

  /**
   * Create billboard LOD (2D sprite for far distances)
   */
  createBillboardLOD(
    id: string,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    billboardTexture: THREE.Texture,
    position: [number, number, number],
    billboardDistance: number = 100
  ): LODGroup {
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: billboardTexture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale sprite to match object size
    const box = new THREE.Box3().setFromBufferAttribute(
      geometry.getAttribute('position') as THREE.BufferAttribute
    );
    const size = box.getSize(new THREE.Vector3());
    sprite.scale.set(size.x, size.y, 1);

    return this.createLOD({
      id,
      name,
      position,
      levels: [
        { distance: 0, object: new THREE.Mesh(geometry, material) },
        { distance: billboardDistance, object: sprite },
      ],
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const objectId of this.objects.keys()) {
      this.removeObject(objectId);
    }
    this.scene = null;
    this.camera = null;
  }
}

// Singleton instance
export const lodSystem = new LODSystemService();
