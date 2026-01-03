import { defineQuery, IWorld, hasComponent } from 'bitecs';
import { Input3D, Velocity3D } from '../components';
import { InputManager3D } from '../input/InputManager3D';

// Query for entities with input and velocity
const inputQuery = defineQuery([Input3D, Velocity3D]);

/**
 * System for handling keyboard input in 3D games
 * Applies velocity based on WASD/Arrow key input
 */
export class Input3DSystem {
  constructor(private inputManager: InputManager3D) {}

  /**
   * Execute the input system
   */
  execute(world: IWorld, _dt: number): void {
    const entities = inputQuery(world);

    for (const eid of entities) {
      const moveSpeed = Input3D.moveSpeed[eid];
      const jumpForce = Input3D.jumpForce[eid];
      const canJump = Input3D.canJump[eid] === 1;
      const isGrounded = Input3D.isGrounded[eid] === 1;

      // Horizontal movement (X-Z plane for 3D)
      let vx = 0;
      let vz = 0;

      if (this.inputManager.isLeftPressed()) {
        vx = -moveSpeed;
      } else if (this.inputManager.isRightPressed()) {
        vx = moveSpeed;
      }

      if (this.inputManager.isForwardPressed()) {
        vz = -moveSpeed; // Negative Z is forward in Three.js
      } else if (this.inputManager.isBackwardPressed()) {
        vz = moveSpeed;
      }

      // Apply horizontal velocity
      Velocity3D.vx[eid] = vx;
      Velocity3D.vz[eid] = vz;

      // Jump only when grounded and canJump is enabled
      if (canJump && isGrounded && this.inputManager.isJumpPressed()) {
        Velocity3D.vy[eid] = jumpForce;
        Input3D.isGrounded[eid] = 0; // No longer grounded after jump
      }
    }

    // Clear pressed states for next frame
    this.inputManager.update();
  }
}
