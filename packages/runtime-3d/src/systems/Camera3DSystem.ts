import { defineQuery, IWorld } from 'bitecs';
import * as THREE from 'three';
import { Transform3D, Camera3D } from '../components';
import { ThreeRenderer } from '../renderers/ThreeRenderer';

// Query for camera entities
const cameraQuery = defineQuery([Transform3D, Camera3D]);

/**
 * System for managing 3D cameras
 */
export class Camera3DSystem {
  private renderer: ThreeRenderer;
  private cameras: Map<number, THREE.PerspectiveCamera | THREE.OrthographicCamera> = new Map();
  private activeCamera: number | null = null;

  // Shake state
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private originalPosition = new THREE.Vector3();

  constructor(renderer: ThreeRenderer) {
    this.renderer = renderer;
  }

  /**
   * Execute the camera system
   */
  execute(world: IWorld, dt: number): void {
    const entities = cameraQuery(world);

    for (const eid of entities) {
      // Get or create camera
      let camera = this.cameras.get(eid);
      if (!camera) {
        camera = this.createCamera(eid);
        this.cameras.set(eid, camera);
      }

      // Check if this should be the active camera
      if (Camera3D.isActive[eid] === 1) {
        if (this.activeCamera !== eid) {
          this.activeCamera = eid;
          this.renderer.setCamera(camera);
        }
      }

      // Update camera properties
      this.updateCamera(eid, camera, dt);
    }

    // Update camera shake
    if (this.shakeTimer > 0) {
      this.updateShake(dt);
    }
  }

  /**
   * Create a camera for an entity
   */
  private createCamera(eid: number): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    const isOrthographic = Camera3D.type[eid] === 1;

    if (isOrthographic) {
      const size = Camera3D.orthoSize[eid] || 10;
      const aspect = this.renderer.renderer.domElement.width / this.renderer.renderer.domElement.height;
      return new THREE.OrthographicCamera(
        -size * aspect,
        size * aspect,
        size,
        -size,
        Camera3D.near[eid] || 0.1,
        Camera3D.far[eid] || 1000
      );
    } else {
      return new THREE.PerspectiveCamera(
        Camera3D.fov[eid] || 75,
        this.renderer.renderer.domElement.width / this.renderer.renderer.domElement.height,
        Camera3D.near[eid] || 0.1,
        Camera3D.far[eid] || 1000
      );
    }
  }

  /**
   * Update camera position and properties
   */
  private updateCamera(
    eid: number,
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    dt: number
  ): void {
    const followTarget = Camera3D.followTarget[eid];
    const smoothing = Camera3D.followSmoothing[eid] || 0.1;

    // Calculate target position
    let targetX = Transform3D.x[eid];
    let targetY = Transform3D.y[eid];
    let targetZ = Transform3D.z[eid];

    // If following a target, calculate position relative to target
    if (followTarget >= 0 && Transform3D.x[followTarget] !== undefined) {
      const offsetX = Camera3D.followOffsetX[eid] || 0;
      const offsetY = Camera3D.followOffsetY[eid] || 5;
      const offsetZ = Camera3D.followOffsetZ[eid] || 10;

      targetX = Transform3D.x[followTarget] + offsetX;
      targetY = Transform3D.y[followTarget] + offsetY;
      targetZ = Transform3D.z[followTarget] + offsetZ;

      // Smooth follow
      camera.position.x += (targetX - camera.position.x) * smoothing;
      camera.position.y += (targetY - camera.position.y) * smoothing;
      camera.position.z += (targetZ - camera.position.z) * smoothing;

      // Look at target
      const lookAtTarget = Camera3D.lookAtTarget[eid];
      if (lookAtTarget >= 0 && Transform3D.x[lookAtTarget] !== undefined) {
        camera.lookAt(
          Transform3D.x[lookAtTarget],
          Transform3D.y[lookAtTarget],
          Transform3D.z[lookAtTarget]
        );
      } else {
        camera.lookAt(
          Transform3D.x[followTarget],
          Transform3D.y[followTarget],
          Transform3D.z[followTarget]
        );
      }
    } else {
      // Direct position from transform
      camera.position.set(targetX, targetY, targetZ);
    }

    // Update perspective camera FOV if changed
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = Camera3D.fov[eid] || 75;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  }

  /**
   * Start camera shake effect
   */
  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;

    const camera = this.getActiveCamera();
    if (camera) {
      this.originalPosition.copy(camera.position);
    }
  }

  /**
   * Update camera shake
   */
  private updateShake(dt: number): void {
    this.shakeTimer -= dt;

    const camera = this.getActiveCamera();
    if (!camera) return;

    if (this.shakeTimer <= 0) {
      // Reset to original position
      camera.position.copy(this.originalPosition);
      this.shakeTimer = 0;
      return;
    }

    // Calculate shake offset
    const progress = this.shakeTimer / this.shakeDuration;
    const currentIntensity = this.shakeIntensity * progress;

    camera.position.x = this.originalPosition.x + (Math.random() - 0.5) * currentIntensity;
    camera.position.y = this.originalPosition.y + (Math.random() - 0.5) * currentIntensity;
    camera.position.z = this.originalPosition.z + (Math.random() - 0.5) * currentIntensity;
  }

  /**
   * Get the active camera
   */
  getActiveCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera | null {
    if (this.activeCamera === null) return null;
    return this.cameras.get(this.activeCamera) || null;
  }

  /**
   * Set camera position directly
   */
  setCameraPosition(x: number, y: number, z: number): void {
    const camera = this.getActiveCamera();
    if (camera) {
      camera.position.set(x, y, z);
    }
  }

  /**
   * Set camera look-at target
   */
  setCameraLookAt(x: number, y: number, z: number): void {
    const camera = this.getActiveCamera();
    if (camera) {
      camera.lookAt(x, y, z);
    }
  }

  /**
   * Remove camera for entity
   */
  removeCamera(entityId: number): void {
    this.cameras.delete(entityId);
    if (this.activeCamera === entityId) {
      this.activeCamera = null;
    }
  }

  /**
   * Update camera aspect ratio on resize
   */
  updateAspect(width: number, height: number): void {
    const aspect = width / height;

    this.cameras.forEach((camera) => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const size = camera.top; // Assuming symmetric frustum
        camera.left = -size * aspect;
        camera.right = size * aspect;
        camera.updateProjectionMatrix();
      }
    });
  }
}
