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

      const moveSpeed = Input.moveSpeed[eid];
      const jumpForce = Input.jumpForce[eid];

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

      // Jump (only if canJump is true)
      if (Input.canJump[eid] === 1 && this.inputManager.isJumpPressed()) {
        this.physics.applyForce(eid, 0, jumpForce);
      }
    }
  }

  cleanup?(world: any): void {
    // No cleanup needed
  }
}
