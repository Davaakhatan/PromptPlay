/**
 * Tests for InputSystem
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addComponent } from 'bitecs';
import { InputSystem } from '../src/systems/InputSystem';
import { GameWorld, Input, Velocity, Transform } from '@promptplay/ecs-core';
import { InputManager } from '../src/input/InputManager';
import { MatterPhysics } from '../src/physics/MatterPhysics';
import { createMockElement, createMockCanvas } from './setup';

describe('InputSystem', () => {
  let inputManager: InputManager;
  let physics: MatterPhysics;
  let inputSystem: InputSystem;
  let world: GameWorld;
  let mockElement: HTMLElement;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockElement = createMockElement();
    mockCanvas = createMockCanvas();
    inputManager = new InputManager(mockElement);
    physics = new MatterPhysics(mockCanvas);
    inputSystem = new InputSystem(inputManager, physics);
    world = new GameWorld();
  });

  function createPlayerEntity(options: {
    moveSpeed?: number;
    jumpForce?: number;
    canJump?: number;
    isGrounded?: number;
    vx?: number;
    vy?: number;
  } = {}): number {
    const eid = world.createEntity('player');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    addComponent(w, Velocity, eid);
    addComponent(w, Input, eid);

    Transform.x[eid] = 100;
    Transform.y[eid] = 100;
    Velocity.vx[eid] = options.vx ?? 0;
    Velocity.vy[eid] = options.vy ?? 0;
    Input.moveSpeed[eid] = options.moveSpeed ?? 5;
    Input.jumpForce[eid] = options.jumpForce ?? -10;
    Input.canJump[eid] = options.canJump ?? 1;
    Input.isGrounded[eid] = options.isGrounded ?? 0;

    return eid;
  }

  describe('init', () => {
    it('should initialize without errors', () => {
      expect(() => inputSystem.init(world)).not.toThrow();
    });
  });

  describe('update', () => {
    it('should do nothing for non-GameWorld', () => {
      expect(() => inputSystem.update({}, 16)).not.toThrow();
    });

    it('should skip entities without Input component', () => {
      const eid = world.createEntity('player');
      const w = world.getWorld();
      addComponent(w, Transform, eid);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      expect(setVelocitySpy).not.toHaveBeenCalled();
    });

    it('should move left when left key is pressed', () => {
      const eid = createPlayerEntity({ moveSpeed: 5 });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(true);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, -5, 0);
    });

    it('should move right when right key is pressed', () => {
      const eid = createPlayerEntity({ moveSpeed: 5 });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 5, 0);
    });

    it('should not move when no keys pressed', () => {
      const eid = createPlayerEntity({ moveSpeed: 5 });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, 0);
    });

    it('should jump when grounded, canJump, and space pressed', () => {
      const eid = createPlayerEntity({
        moveSpeed: 5,
        jumpForce: -15,
        canJump: 1,
        isGrounded: 1
      });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isKeyPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should be called for horizontal movement first, then jump
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, -15);
    });

    it('should not jump when not grounded', () => {
      const eid = createPlayerEntity({
        moveSpeed: 5,
        jumpForce: -15,
        canJump: 1,
        isGrounded: 0
      });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isKeyPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should only set horizontal velocity, not jump
      expect(setVelocitySpy).toHaveBeenCalledTimes(1);
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, 0);
    });

    it('should not jump when canJump is disabled', () => {
      const eid = createPlayerEntity({
        moveSpeed: 5,
        jumpForce: -15,
        canJump: 0,
        isGrounded: 1
      });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isKeyPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should only set horizontal velocity, not jump
      expect(setVelocitySpy).toHaveBeenCalledTimes(1);
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 0, 0);
    });

    it('should preserve vertical velocity during horizontal movement', () => {
      const eid = createPlayerEntity({ moveSpeed: 5, vy: 5 }); // Falling

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(true);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should preserve the vertical velocity (5)
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, -5, 5);
    });

    it('should move and jump simultaneously', () => {
      const eid = createPlayerEntity({
        moveSpeed: 5,
        jumpForce: -15,
        canJump: 1,
        isGrounded: 1
      });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(false);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(true);
      vi.spyOn(inputManager, 'isKeyPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should be called for horizontal movement first, then jump
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 5, 0);
      expect(setVelocitySpy).toHaveBeenCalledWith(eid, 5, -15);
    });

    it('should handle multiple entities with Input', () => {
      const player1 = createPlayerEntity({ moveSpeed: 5 });
      const player2 = createPlayerEntity({ moveSpeed: 10 });

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(true);
      vi.spyOn(inputManager, 'isRightPressed').mockReturnValue(false);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Both entities should have velocity set with their respective speeds
      expect(setVelocitySpy).toHaveBeenCalledWith(player1, -5, 0);
      expect(setVelocitySpy).toHaveBeenCalledWith(player2, -10, 0);
    });

    it('should skip entities without Velocity component', () => {
      const eid = world.createEntity('player');
      const w = world.getWorld();
      addComponent(w, Transform, eid);
      addComponent(w, Input, eid);
      Input.moveSpeed[eid] = 5;

      vi.spyOn(inputManager, 'isLeftPressed').mockReturnValue(true);

      const setVelocitySpy = vi.spyOn(physics, 'setVelocity');
      inputSystem.update(world, 16);

      // Should not call setVelocity for horizontal movement
      expect(setVelocitySpy).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup without errors', () => {
      expect(() => inputSystem.cleanup?.(world)).not.toThrow();
    });
  });
});
