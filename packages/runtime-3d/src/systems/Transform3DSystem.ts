import { defineQuery, IWorld } from 'bitecs';
import { Transform3D, Velocity3D } from '../components';
import { ThreeRenderer } from '../renderers/ThreeRenderer';

// Query for entities with transform and velocity
const movingQuery = defineQuery([Transform3D, Velocity3D]);

/**
 * System for updating 3D transforms based on velocity
 */
export class Transform3DSystem {
  constructor(private renderer: ThreeRenderer) {}

  /**
   * Execute the transform system
   */
  execute(world: IWorld, dt: number): void {
    const entities = movingQuery(world);

    for (const eid of entities) {
      // Update position based on velocity
      Transform3D.x[eid] += Velocity3D.vx[eid] * dt;
      Transform3D.y[eid] += Velocity3D.vy[eid] * dt;
      Transform3D.z[eid] += Velocity3D.vz[eid] * dt;

      // Update rotation based on angular velocity
      Transform3D.rotationX[eid] += Velocity3D.angularX[eid] * dt;
      Transform3D.rotationY[eid] += Velocity3D.angularY[eid] * dt;
      Transform3D.rotationZ[eid] += Velocity3D.angularZ[eid] * dt;

      // Sync with renderer
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
  }
}
