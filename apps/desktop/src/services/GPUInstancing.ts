/**
 * GPU Instancing Service
 * Efficient batch rendering for similar objects using WebGL instancing
 */

import * as THREE from 'three';

// Instance data for a single object
export interface InstanceData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: [number, number, number, number];
  userData?: Record<string, unknown>;
}

// Instanced mesh configuration
export interface InstancedMeshConfig {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  maxInstances: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}

// Instance group for managing similar objects
export interface InstanceGroup {
  id: string;
  name: string;
  mesh: THREE.InstancedMesh;
  instances: Map<string, InstanceData>;
  maxInstances: number;
  activeCount: number;
  dirty: boolean;
  boundingBox: THREE.Box3;
}

// Performance statistics
export interface InstancingStats {
  totalGroups: number;
  totalInstances: number;
  activeInstances: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  updateTime: number;
}

// Geometry templates for common shapes
export type GeometryTemplate =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'plane'
  | 'torus'
  | 'capsule';

// Template configuration
export interface GeometryTemplateConfig {
  type: GeometryTemplate;
  params?: Record<string, number>;
}

// Built-in geometry templates
const GEOMETRY_TEMPLATES: Record<GeometryTemplate, () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 16, 16),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cone: () => new THREE.ConeGeometry(0.5, 1, 16),
  plane: () => new THREE.PlaneGeometry(1, 1),
  torus: () => new THREE.TorusGeometry(0.5, 0.2, 8, 16),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 4, 8),
};

class GPUInstancingService {
  private groups: Map<string, InstanceGroup> = new Map();
  private scene: THREE.Scene | null = null;
  private stats: InstancingStats = {
    totalGroups: 0,
    totalInstances: 0,
    activeInstances: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    updateTime: 0,
  };

  // Temporary objects for calculations (reused to avoid allocations)
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempRotation = new THREE.Euler();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();
  private tempColor = new THREE.Color();

  /**
   * Initialize the instancing service with a scene
   */
  initialize(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Create a new instance group
   */
  createGroup(config: InstancedMeshConfig): InstanceGroup {
    const mesh = new THREE.InstancedMesh(
      config.geometry,
      config.material,
      config.maxInstances
    );

    mesh.name = config.name;
    mesh.castShadow = config.castShadow ?? true;
    mesh.receiveShadow = config.receiveShadow ?? true;
    mesh.frustumCulled = config.frustumCulled ?? true;
    mesh.count = 0; // Start with 0 visible instances

    // Enable instance color if material supports it
    if (config.material instanceof THREE.MeshStandardMaterial ||
        config.material instanceof THREE.MeshBasicMaterial ||
        config.material instanceof THREE.MeshPhongMaterial) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(config.maxInstances * 3),
        3
      );
    }

    const group: InstanceGroup = {
      id: config.id,
      name: config.name,
      mesh,
      instances: new Map(),
      maxInstances: config.maxInstances,
      activeCount: 0,
      dirty: false,
      boundingBox: new THREE.Box3(),
    };

    this.groups.set(config.id, group);

    if (this.scene) {
      this.scene.add(mesh);
    }

    this.updateStats();
    return group;
  }

  /**
   * Create instance group from geometry template
   */
  createGroupFromTemplate(
    id: string,
    name: string,
    template: GeometryTemplate,
    material: THREE.Material,
    maxInstances: number = 1000
  ): InstanceGroup {
    const geometry = GEOMETRY_TEMPLATES[template]();
    return this.createGroup({
      id,
      name,
      geometry,
      material,
      maxInstances,
    });
  }

  /**
   * Add an instance to a group
   */
  addInstance(groupId: string, instance: InstanceData): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn(`Instance group ${groupId} not found`);
      return false;
    }

    if (group.instances.size >= group.maxInstances) {
      console.warn(`Instance group ${groupId} is at max capacity`);
      return false;
    }

    group.instances.set(instance.id, instance);
    group.dirty = true;
    this.updateStats();
    return true;
  }

  /**
   * Add multiple instances at once
   */
  addInstances(groupId: string, instances: InstanceData[]): number {
    let added = 0;
    for (const instance of instances) {
      if (this.addInstance(groupId, instance)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Update an existing instance
   */
  updateInstance(groupId: string, instanceId: string, updates: Partial<InstanceData>): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const instance = group.instances.get(instanceId);
    if (!instance) return false;

    // Apply updates
    if (updates.position) instance.position = updates.position;
    if (updates.rotation) instance.rotation = updates.rotation;
    if (updates.scale) instance.scale = updates.scale;
    if (updates.color) instance.color = updates.color;
    if (updates.userData) instance.userData = { ...instance.userData, ...updates.userData };

    group.dirty = true;
    return true;
  }

  /**
   * Remove an instance from a group
   */
  removeInstance(groupId: string, instanceId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const deleted = group.instances.delete(instanceId);
    if (deleted) {
      group.dirty = true;
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all instances from a group
   */
  clearGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.instances.clear();
    group.activeCount = 0;
    group.mesh.count = 0;
    group.dirty = false;
    this.updateStats();
  }

  /**
   * Remove an entire instance group
   */
  removeGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    if (this.scene) {
      this.scene.remove(group.mesh);
    }

    group.mesh.geometry.dispose();
    if (Array.isArray(group.mesh.material)) {
      group.mesh.material.forEach(m => m.dispose());
    } else {
      group.mesh.material.dispose();
    }

    this.groups.delete(groupId);
    this.updateStats();
    return true;
  }

  /**
   * Update all dirty instance groups
   */
  update(): void {
    const startTime = performance.now();

    for (const group of this.groups.values()) {
      if (group.dirty) {
        this.updateGroup(group);
      }
    }

    this.stats.updateTime = performance.now() - startTime;
  }

  /**
   * Update a specific instance group
   */
  private updateGroup(group: InstanceGroup): void {
    const instances = Array.from(group.instances.values());
    group.activeCount = instances.length;
    group.mesh.count = group.activeCount;

    // Reset bounding box
    group.boundingBox.makeEmpty();

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];

      // Set position, rotation, scale
      this.tempPosition.set(...instance.position);
      this.tempRotation.set(...instance.rotation);
      this.tempQuaternion.setFromEuler(this.tempRotation);
      this.tempScale.set(...instance.scale);

      // Compose matrix
      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      group.mesh.setMatrixAt(i, this.tempMatrix);

      // Set color if provided
      if (instance.color && group.mesh.instanceColor) {
        this.tempColor.setRGB(instance.color[0], instance.color[1], instance.color[2]);
        group.mesh.setColorAt(i, this.tempColor);
      }

      // Expand bounding box
      group.boundingBox.expandByPoint(this.tempPosition);
    }

    // Mark buffers for update
    group.mesh.instanceMatrix.needsUpdate = true;
    if (group.mesh.instanceColor) {
      group.mesh.instanceColor.needsUpdate = true;
    }

    group.dirty = false;
  }

  /**
   * Get instance at a specific position (ray casting)
   */
  getInstanceAtPosition(
    groupId: string,
    raycaster: THREE.Raycaster
  ): InstanceData | null {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const intersects = raycaster.intersectObject(group.mesh);
    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const instances = Array.from(group.instances.values());
      return instances[intersects[0].instanceId] || null;
    }

    return null;
  }

  /**
   * Get all instances within a bounding box
   */
  getInstancesInBox(groupId: string, box: THREE.Box3): InstanceData[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    const results: InstanceData[] = [];
    for (const instance of group.instances.values()) {
      this.tempPosition.set(...instance.position);
      if (box.containsPoint(this.tempPosition)) {
        results.push(instance);
      }
    }
    return results;
  }

  /**
   * Get all instances within a sphere
   */
  getInstancesInSphere(
    groupId: string,
    center: THREE.Vector3,
    radius: number
  ): InstanceData[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    const radiusSq = radius * radius;
    const results: InstanceData[] = [];

    for (const instance of group.instances.values()) {
      this.tempPosition.set(...instance.position);
      if (this.tempPosition.distanceToSquared(center) <= radiusSq) {
        results.push(instance);
      }
    }
    return results;
  }

  /**
   * Batch update positions for animation
   */
  batchUpdatePositions(
    groupId: string,
    updates: Array<{ id: string; position: [number, number, number] }>
  ): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    for (const update of updates) {
      const instance = group.instances.get(update.id);
      if (instance) {
        instance.position = update.position;
      }
    }
    group.dirty = true;
  }

  /**
   * Sort instances by distance from camera (for transparency)
   */
  sortByDistance(groupId: string, cameraPosition: THREE.Vector3): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    const instances = Array.from(group.instances.entries());
    instances.sort((a, b) => {
      this.tempPosition.set(...a[1].position);
      const distA = this.tempPosition.distanceToSquared(cameraPosition);
      this.tempPosition.set(...b[1].position);
      const distB = this.tempPosition.distanceToSquared(cameraPosition);
      return distB - distA; // Back to front
    });

    // Rebuild map in sorted order
    group.instances.clear();
    for (const [id, instance] of instances) {
      group.instances.set(id, instance);
    }
    group.dirty = true;
  }

  /**
   * Get statistics
   */
  getStats(): InstancingStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalGroups = this.groups.size;
    this.stats.totalInstances = 0;
    this.stats.activeInstances = 0;
    this.stats.drawCalls = this.groups.size;
    this.stats.triangles = 0;
    this.stats.memoryUsage = 0;

    for (const group of this.groups.values()) {
      this.stats.totalInstances += group.maxInstances;
      this.stats.activeInstances += group.instances.size;

      const triangles = group.mesh.geometry.index
        ? group.mesh.geometry.index.count / 3
        : group.mesh.geometry.attributes.position.count / 3;
      this.stats.triangles += triangles * group.instances.size;

      // Estimate memory usage (matrices + colors)
      this.stats.memoryUsage += group.maxInstances * 64; // 4x4 float matrix
      if (group.mesh.instanceColor) {
        this.stats.memoryUsage += group.maxInstances * 12; // RGB float
      }
    }
  }

  /**
   * Get all groups
   */
  getGroups(): InstanceGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get a specific group
   */
  getGroup(groupId: string): InstanceGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get all instances in a group
   */
  getInstances(groupId: string): InstanceData[] {
    const group = this.groups.get(groupId);
    return group ? Array.from(group.instances.values()) : [];
  }

  /**
   * Create scatter instances (e.g., for vegetation)
   */
  createScatter(
    groupId: string,
    count: number,
    bounds: THREE.Box3,
    options: {
      minScale?: number;
      maxScale?: number;
      uniformScale?: boolean;
      randomRotation?: boolean;
      alignToSurface?: boolean;
      heightmap?: (x: number, z: number) => number;
      density?: (x: number, z: number) => number;
    } = {}
  ): void {
    const {
      minScale = 0.8,
      maxScale = 1.2,
      uniformScale = true,
      randomRotation = true,
      heightmap,
      density,
    } = options;

    const size = bounds.getSize(new THREE.Vector3());
    let created = 0;

    while (created < count) {
      const x = bounds.min.x + Math.random() * size.x;
      const z = bounds.min.z + Math.random() * size.z;

      // Check density
      if (density && Math.random() > density(x, z)) {
        continue;
      }

      const y = heightmap ? heightmap(x, z) : bounds.min.y;

      // Random scale
      const scaleValue = minScale + Math.random() * (maxScale - minScale);
      const scale: [number, number, number] = uniformScale
        ? [scaleValue, scaleValue, scaleValue]
        : [
            minScale + Math.random() * (maxScale - minScale),
            minScale + Math.random() * (maxScale - minScale),
            minScale + Math.random() * (maxScale - minScale),
          ];

      // Random rotation
      const rotation: [number, number, number] = randomRotation
        ? [0, Math.random() * Math.PI * 2, 0]
        : [0, 0, 0];

      this.addInstance(groupId, {
        id: `scatter_${created}`,
        position: [x, y, z],
        rotation,
        scale,
      });

      created++;
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const groupId of this.groups.keys()) {
      this.removeGroup(groupId);
    }
    this.scene = null;
  }
}

// Singleton instance
export const gpuInstancing = new GPUInstancingService();
