import { hasComponent } from 'bitecs';
import { ISystem, GameWorld, Transform, Velocity, Input } from '@promptplay/ecs-core';
import { InputManager } from '../input/InputManager';
import { MatterPhysics } from '../physics/MatterPhysics';

export class InputSystem implements ISystem {
  private inputManager: InputManager;
  private physics: MatterPhysics;

  constructor(inputManager: InputManager, physics: MatterPhysics) {
    this.inputManager = inputManager;
    this.physics = physics;
  }

  init(world: any): void {
    // No initialization needed
  }

  update(world: any, deltaTime: number): void {
    if (!(world instanceof GameWorld)) return;

    const w = world.getWorld();
    const entities = world.getEntities();

    for (const eid of entities) {
      if (!hasComponent(w, Input, eid)) continue;

      // IMPORTANT: Force small values for Matter.js physics
      // Old games have extreme values (200-400) that cause player to fly off screen
      // Scale down to Matter.js-appropriate values (typically 3-10)
      const rawMoveSpeed = Input.moveSpeed[eid];
      const rawJumpForce = Math.abs(Input.jumpForce[eid]); // Handle negative values from old games

      // Scale values: if > 50, divide by 40 to get reasonable Matter.js values
      const moveSpeed = rawMoveSpeed > 50 ? rawMoveSpeed / 40 : rawMoveSpeed;
      const jumpForce = rawJumpForce > 50 ? rawJumpForce / 40 : rawJumpForce;

      const canJump = Input.canJump[eid] === 1;
      const isGrounded = Input.isGrounded[eid] === 1;

      // Horizontal movement
      let vx = 0;
      if (this.inputManager.isLeftPressed()) {
        vx = -moveSpeed;
      } else if (this.inputManager.isRightPressed()) {
        vx = moveSpeed;
      }

      // Apply horizontal velocity
      if (hasComponent(w, Velocity, eid)) {
        // Preserve vertical velocity, update horizontal
        const currentVy = Velocity.vy[eid];
        this.physics.setVelocity(eid, vx, currentVy);
      }

      // Jump only when grounded and canJump is enabled
      // Use isKeyPressed for single jump (not held)
      // Negate jumpForce so positive values = jump up (Matter.js has positive Y = down)
      if (canJump && isGrounded && this.inputManager.isKeyPressed('Space')) {
        this.physics.setVelocity(eid, vx, -jumpForce);
      }
    }

    // Clear pressed/released states for next frame
    this.inputManager.update();
  }

  cleanup?(world: any): void {
    // No cleanup needed
  }
}
