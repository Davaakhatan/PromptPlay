/**
 * Occlusion Culling Service
 * Prevents rendering of objects not visible to the camera
 */

import * as THREE from 'three';

// Culling result for an object
export interface CullingResult {
  objectId: string;
  visible: boolean;
  reason: 'visible' | 'frustum' | 'distance' | 'occluded' | 'size';
  distance: number;
  screenSize: number;
}

// Cullable object
export interface CullableObject {
  id: string;
  object: THREE.Object3D;
  bounds: THREE.Box3 | THREE.Sphere;
  priority: number; // Higher priority objects checked first for occlusion
  alwaysVisible?: boolean;
  occluder?: boolean; // Can this object occlude others?
  minScreenSize?: number; // Minimum screen size to render
}

// Occlusion query result
export interface OcclusionQuery {
  objectId: string;
  queryId: WebGLQuery | null;
  pending: boolean;
  visible: boolean;
}

// Culling statistics
export interface CullingStats {
  totalObjects: number;
  visibleObjects: number;
  frustumCulled: number;
  distanceCulled: number;
  occlusionCulled: number;
  sizeCulled: number;
  updateTime: number;
  occlusionQueryTime: number;
}

// Culling configuration
export interface CullingConfig {
  enableFrustumCulling: boolean;
  enableDistanceCulling: boolean;
  enableOcclusionCulling: boolean;
  enableSizeCulling: boolean;
  maxDistance: number;
  minScreenSize: number;
  occlusionSamples: number;
  updateFrequency: number;
}

// Portal for portal-based occlusion
export interface Portal {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  vertices: THREE.Vector3[];
  connectedCells: [string, string];
}

// Cell for cell-based occlusion
export interface Cell {
  id: string;
  bounds: THREE.Box3;
  objects: string[];
  portals: string[];
  visible: boolean;
}

class OcclusionCullingService {
  private objects: Map<string, CullableObject> = new Map();
  private results: Map<string, CullingResult> = new Map();
  private queries: Map<string, OcclusionQuery> = new Map();
  private cells: Map<string, Cell> = new Map();
  private portals: Map<string, Portal> = new Map();

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  // Renderer stored for future WebGL occlusion queries
  private internalRenderer: THREE.WebGLRenderer | null = null;

  private frustum = new THREE.Frustum();
  private projectionMatrix = new THREE.Matrix4();
  private cameraPosition = new THREE.Vector3();
  private tempBox = new THREE.Box3();
  private tempSphere = new THREE.Sphere();
  private tempVector = new THREE.Vector3();

  private config: CullingConfig = {
    enableFrustumCulling: true,
    enableDistanceCulling: true,
    enableOcclusionCulling: false, // Disabled by default (expensive)
    enableSizeCulling: true,
    maxDistance: 500,
    minScreenSize: 0.01, // 1% of screen
    occlusionSamples: 8,
    updateFrequency: 1,
  };

  private stats: CullingStats = {
    totalObjects: 0,
    visibleObjects: 0,
    frustumCulled: 0,
    distanceCulled: 0,
    occlusionCulled: 0,
    sizeCulled: 0,
    updateTime: 0,
    occlusionQueryTime: 0,
  };

  private frameCounter = 0;

  /**
   * Initialize the culling system
   */
  initialize(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ): void {
    this.scene = scene;
    this.camera = camera;
    this.internalRenderer = renderer;
  }

  /**
   * Register an object for culling
   */
  registerObject(obj: CullableObject): void {
    this.objects.set(obj.id, obj);
    this.results.set(obj.id, {
      objectId: obj.id,
      visible: true,
      reason: 'visible',
      distance: 0,
      screenSize: 1,
    });
    this.updateStats();
  }

  /**
   * Register multiple objects
   */
  registerObjects(objs: CullableObject[]): void {
    for (const obj of objs) {
      this.registerObject(obj);
    }
  }

  /**
   * Unregister an object
   */
  unregisterObject(objectId: string): boolean {
    const deleted = this.objects.delete(objectId);
    this.results.delete(objectId);
    this.queries.delete(objectId);
    this.updateStats();
    return deleted;
  }

  /**
   * Update culling for all objects
   */
  update(): void {
    if (!this.camera || !this.scene) return;

    this.frameCounter++;
    if (this.frameCounter < this.config.updateFrequency) return;
    this.frameCounter = 0;

    const startTime = performance.now();
    this.resetStats();

    // Update camera matrices
    this.camera.updateMatrixWorld();
    this.projectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projectionMatrix);
    this.cameraPosition.copy(this.camera.position);

    // Process each object
    for (const [id, obj] of this.objects) {
      const result = this.cullObject(obj);
      this.results.set(id, result);

      // Apply visibility
      obj.object.visible = result.visible;

      // Update stats
      if (result.visible) {
        this.stats.visibleObjects++;
      } else {
        switch (result.reason) {
          case 'frustum':
            this.stats.frustumCulled++;
            break;
          case 'distance':
            this.stats.distanceCulled++;
            break;
          case 'occluded':
            this.stats.occlusionCulled++;
            break;
          case 'size':
            this.stats.sizeCulled++;
            break;
        }
      }
    }

    this.stats.updateTime = performance.now() - startTime;
  }

  /**
   * Cull a single object
   */
  private cullObject(obj: CullableObject): CullingResult {
    // Always visible override
    if (obj.alwaysVisible) {
      return {
        objectId: obj.id,
        visible: true,
        reason: 'visible',
        distance: 0,
        screenSize: 1,
      };
    }

    // Get bounds
    const bounds = this.getObjectBounds(obj);
    const center = bounds instanceof THREE.Sphere
      ? bounds.center
      : bounds.getCenter(this.tempVector);

    // Calculate distance
    const distance = this.cameraPosition.distanceTo(center);

    // Distance culling
    if (this.config.enableDistanceCulling && distance > this.config.maxDistance) {
      return {
        objectId: obj.id,
        visible: false,
        reason: 'distance',
        distance,
        screenSize: 0,
      };
    }

    // Frustum culling
    if (this.config.enableFrustumCulling) {
      const inFrustum = bounds instanceof THREE.Sphere
        ? this.frustum.intersectsSphere(bounds)
        : this.frustum.intersectsBox(bounds);

      if (!inFrustum) {
        return {
          objectId: obj.id,
          visible: false,
          reason: 'frustum',
          distance,
          screenSize: 0,
        };
      }
    }

    // Screen size culling
    const screenSize = this.calculateScreenSize(bounds, distance);
    if (this.config.enableSizeCulling) {
      const minSize = obj.minScreenSize ?? this.config.minScreenSize;
      if (screenSize < minSize) {
        return {
          objectId: obj.id,
          visible: false,
          reason: 'size',
          distance,
          screenSize,
        };
      }
    }

    // Occlusion culling (expensive, use sparingly)
    if (this.config.enableOcclusionCulling && this.shouldCheckOcclusion(obj, distance)) {
      const occluded = this.checkOcclusion(obj, bounds);
      if (occluded) {
        return {
          objectId: obj.id,
          visible: false,
          reason: 'occluded',
          distance,
          screenSize,
        };
      }
    }

    return {
      objectId: obj.id,
      visible: true,
      reason: 'visible',
      distance,
      screenSize,
    };
  }

  /**
   * Get bounds for an object
   */
  private getObjectBounds(obj: CullableObject): THREE.Box3 | THREE.Sphere {
    if (obj.bounds instanceof THREE.Sphere) {
      this.tempSphere.copy(obj.bounds);
      this.tempSphere.center.add(obj.object.position);
      return this.tempSphere;
    }

    this.tempBox.copy(obj.bounds);
    this.tempBox.translate(obj.object.position);
    return this.tempBox;
  }

  /**
   * Calculate screen size of an object
   */
  private calculateScreenSize(
    bounds: THREE.Box3 | THREE.Sphere,
    distance: number
  ): number {
    if (!this.camera) return 0;

    const radius = bounds instanceof THREE.Sphere
      ? bounds.radius
      : bounds.getSize(this.tempVector).length() / 2;

    // Calculate angular size
    const angularSize = 2 * Math.atan(radius / distance);

    // Convert to screen fraction
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    return angularSize / fov;
  }

  /**
   * Determine if occlusion check is needed
   */
  private shouldCheckOcclusion(obj: CullableObject, distance: number): boolean {
    // Don't check occlusion for near objects or occluders
    if (obj.occluder) return false;
    if (distance < 10) return false;

    // Check based on priority
    return obj.priority > 0;
  }

  /**
   * Check if object is occluded (simplified ray-based check)
   */
  private checkOcclusion(
    obj: CullableObject,
    bounds: THREE.Box3 | THREE.Sphere
  ): boolean {
    // Get occluders that are closer than this object
    const occluders = Array.from(this.objects.values()).filter(
      o => o.occluder && o.id !== obj.id
    );

    if (occluders.length === 0) return false;

    // Sample multiple points on the object
    const samples = this.generateSamplePoints(bounds);
    let occludedCount = 0;

    for (const sample of samples) {
      for (const occluder of occluders) {
        const occBounds = this.getObjectBounds(occluder);
        if (this.rayIntersectsBounds(this.cameraPosition, sample, occBounds)) {
          occludedCount++;
          break;
        }
      }
    }

    // Object is occluded if most sample points are blocked
    return occludedCount >= samples.length * 0.8;
  }

  /**
   * Generate sample points on bounds
   */
  private generateSamplePoints(bounds: THREE.Box3 | THREE.Sphere): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const count = this.config.occlusionSamples;

    if (bounds instanceof THREE.Sphere) {
      // Sample points on sphere surface
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        points.push(
          new THREE.Vector3(
            bounds.center.x + bounds.radius * Math.sin(phi) * Math.cos(theta),
            bounds.center.y + bounds.radius * Math.sin(phi) * Math.sin(theta),
            bounds.center.z + bounds.radius * Math.cos(phi)
          )
        );
      }
    } else {
      // Sample corners and center of box
      const min = bounds.min;
      const max = bounds.max;
      const center = bounds.getCenter(new THREE.Vector3());

      points.push(center);
      points.push(new THREE.Vector3(min.x, min.y, min.z));
      points.push(new THREE.Vector3(max.x, min.y, min.z));
      points.push(new THREE.Vector3(min.x, max.y, min.z));
      points.push(new THREE.Vector3(max.x, max.y, min.z));
      points.push(new THREE.Vector3(min.x, min.y, max.z));
      points.push(new THREE.Vector3(max.x, min.y, max.z));
      points.push(new THREE.Vector3(min.x, max.y, max.z));
      points.push(new THREE.Vector3(max.x, max.y, max.z));
    }

    return points.slice(0, count);
  }

  /**
   * Check if ray intersects bounds
   */
  private rayIntersectsBounds(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    bounds: THREE.Box3 | THREE.Sphere
  ): boolean {
    const direction = target.clone().sub(origin).normalize();
    const ray = new THREE.Ray(origin, direction);
    const maxDistance = origin.distanceTo(target);

    if (bounds instanceof THREE.Sphere) {
      const intersection = ray.intersectSphere(bounds, this.tempVector);
      return intersection !== null && origin.distanceTo(intersection) < maxDistance;
    }

    const intersection = ray.intersectBox(bounds, this.tempVector);
    return intersection !== null && origin.distanceTo(intersection) < maxDistance;
  }

  /**
   * Add a cell for cell-based occlusion
   */
  addCell(cell: Cell): void {
    this.cells.set(cell.id, cell);
  }

  /**
   * Add a portal for portal-based occlusion
   */
  addPortal(portal: Portal): void {
    this.portals.set(portal.id, portal);
  }

  /**
   * Update cell visibility using PVS (Potentially Visible Set)
   */
  updateCellVisibility(): void {
    if (!this.camera) return;

    // Find current cell
    let currentCell: Cell | null = null;
    for (const cell of this.cells.values()) {
      if (cell.bounds.containsPoint(this.cameraPosition)) {
        currentCell = cell;
        break;
      }
    }

    // Reset all cells to invisible
    for (const cell of this.cells.values()) {
      cell.visible = false;
    }

    if (!currentCell) return;

    // Mark current cell and connected cells visible
    this.markVisibleCells(currentCell, new Set());
  }

  /**
   * Recursively mark visible cells through portals
   */
  private markVisibleCells(cell: Cell, visited: Set<string>): void {
    if (visited.has(cell.id)) return;
    visited.add(cell.id);

    cell.visible = true;

    // Check portals
    for (const portalId of cell.portals) {
      const portal = this.portals.get(portalId);
      if (!portal) continue;

      // Check if portal is visible from camera
      if (!this.isPortalVisible(portal)) continue;

      // Find connected cell
      const connectedCellId = portal.connectedCells.find(id => id !== cell.id);
      if (!connectedCellId) continue;

      const connectedCell = this.cells.get(connectedCellId);
      if (connectedCell) {
        this.markVisibleCells(connectedCell, visited);
      }
    }
  }

  /**
   * Check if portal is visible from camera
   */
  private isPortalVisible(portal: Portal): boolean {
    // Check if camera is in front of portal
    const toCamera = this.cameraPosition.clone().sub(portal.position);
    const dot = toCamera.dot(portal.normal);
    if (dot < 0) return false;

    // Check if portal is in frustum
    const sphere = new THREE.Sphere();
    const box = new THREE.Box3().setFromPoints(portal.vertices);
    box.getBoundingSphere(sphere);

    return this.frustum.intersectsSphere(sphere);
  }

  /**
   * Get culling result for an object
   */
  getResult(objectId: string): CullingResult | undefined {
    return this.results.get(objectId);
  }

  /**
   * Get all visible objects
   */
  getVisibleObjects(): CullableObject[] {
    return Array.from(this.objects.values()).filter(
      obj => this.results.get(obj.id)?.visible
    );
  }

  /**
   * Get statistics
   */
  getStats(): CullingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats.totalObjects = this.objects.size;
    this.stats.visibleObjects = 0;
    this.stats.frustumCulled = 0;
    this.stats.distanceCulled = 0;
    this.stats.occlusionCulled = 0;
    this.stats.sizeCulled = 0;
  }

  /**
   * Update object count
   */
  private updateStats(): void {
    this.stats.totalObjects = this.objects.size;
  }

  /**
   * Configure culling settings
   */
  configure(config: Partial<CullingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CullingConfig {
    return { ...this.config };
  }

  /**
   * Debug: Visualize culling bounds
   */
  createDebugVisualization(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CullingDebug';

    const visibleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    const culledMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    for (const [id, obj] of this.objects) {
      const result = this.results.get(id);
      const bounds = this.getObjectBounds(obj);

      let helper: THREE.Mesh;
      if (bounds instanceof THREE.Sphere) {
        const geometry = new THREE.SphereGeometry(bounds.radius, 8, 8);
        helper = new THREE.Mesh(geometry, result?.visible ? visibleMaterial : culledMaterial);
        helper.position.copy(bounds.center);
      } else {
        const size = bounds.getSize(new THREE.Vector3());
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        helper = new THREE.Mesh(geometry, result?.visible ? visibleMaterial : culledMaterial);
        bounds.getCenter(helper.position);
      }

      group.add(helper);
    }

    return group;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.objects.clear();
    this.results.clear();
    this.queries.clear();
    this.cells.clear();
    this.portals.clear();
    this.scene = null;
    this.camera = null;
    this.internalRenderer = null;
  }

  /**
   * Get renderer (for future WebGL occlusion queries)
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.internalRenderer;
  }
}

// Singleton instance
export const occlusionCulling = new OcclusionCullingService();
