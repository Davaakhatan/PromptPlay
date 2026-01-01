import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../src/input/InputManager';
import { createMockElement, createKeyboardEvent, createMouseEvent } from './setup';

describe('InputManager', () => {
  let inputManager: InputManager;
  let element: HTMLElement;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  let keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    element = createMockElement();

    // Capture event handlers
    vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'keydown') keydownHandler = handler as (e: KeyboardEvent) => void;
      if (type === 'keyup') keyupHandler = handler as (e: KeyboardEvent) => void;
    });

    // Spy on removeEventListener for cleanup tests
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

    inputManager = new InputManager(element);
  });

  afterEach(() => {
    inputManager.cleanup();
    keydownHandler = null;
    keyupHandler = null;
  });

  describe('keyboard input', () => {
    it('should track key down state', () => {
      const event = createKeyboardEvent('keydown', 'KeyA');
      keydownHandler?.(event);

      expect(inputManager.isKeyDown('KeyA')).toBe(true);
    });

    it('should track key up state', () => {
      const downEvent = createKeyboardEvent('keydown', 'KeyA');
      keydownHandler?.(downEvent);

      const upEvent = createKeyboardEvent('keyup', 'KeyA');
      keyupHandler?.(upEvent);

      expect(inputManager.isKeyDown('KeyA')).toBe(false);
    });

    it('should track key pressed (just pressed this frame)', () => {
      const event = createKeyboardEvent('keydown', 'Space');
      keydownHandler?.(event);

      expect(inputManager.isKeyPressed('Space')).toBe(true);
    });

    it('should clear key pressed after update', () => {
      const event = createKeyboardEvent('keydown', 'Space');
      keydownHandler?.(event);

      inputManager.update();

      expect(inputManager.isKeyPressed('Space')).toBe(false);
      // Key should still be down
      expect(inputManager.isKeyDown('Space')).toBe(true);
    });

    it('should track key released', () => {
      const downEvent = createKeyboardEvent('keydown', 'KeyW');
      keydownHandler?.(downEvent);

      const upEvent = createKeyboardEvent('keyup', 'KeyW');
      keyupHandler?.(upEvent);

      expect(inputManager.isKeyReleased('KeyW')).toBe(true);
    });

    it('should clear key released after update', () => {
      const downEvent = createKeyboardEvent('keydown', 'KeyW');
      keydownHandler?.(downEvent);

      const upEvent = createKeyboardEvent('keyup', 'KeyW');
      keyupHandler?.(upEvent);

      inputManager.update();

      expect(inputManager.isKeyReleased('KeyW')).toBe(false);
    });

    it('should not set pressed again if key is held', () => {
      const event1 = createKeyboardEvent('keydown', 'KeyA');
      keydownHandler?.(event1);

      inputManager.update();

      // Simulate holding key (repeated keydown events)
      const event2 = createKeyboardEvent('keydown', 'KeyA');
      keydownHandler?.(event2);

      expect(inputManager.isKeyPressed('KeyA')).toBe(false);
    });
  });

  describe('directional helpers', () => {
    it('should detect left arrow press', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'ArrowLeft'));
      expect(inputManager.isLeftPressed()).toBe(true);
    });

    it('should detect A key as left', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'KeyA'));
      expect(inputManager.isLeftPressed()).toBe(true);
    });

    it('should detect right arrow press', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'ArrowRight'));
      expect(inputManager.isRightPressed()).toBe(true);
    });

    it('should detect D key as right', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'KeyD'));
      expect(inputManager.isRightPressed()).toBe(true);
    });

    it('should detect up arrow press', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'ArrowUp'));
      expect(inputManager.isUpPressed()).toBe(true);
    });

    it('should detect W key as up', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'KeyW'));
      expect(inputManager.isUpPressed()).toBe(true);
    });

    it('should detect down arrow press', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'ArrowDown'));
      expect(inputManager.isDownPressed()).toBe(true);
    });

    it('should detect S key as down', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'KeyS'));
      expect(inputManager.isDownPressed()).toBe(true);
    });

    it('should detect space as jump', () => {
      keydownHandler?.(createKeyboardEvent('keydown', 'Space'));
      expect(inputManager.isJumpPressed()).toBe(true);
    });
  });

  describe('mouse input', () => {
    let mousedownHandler: ((e: MouseEvent) => void) | null = null;
    let mouseupHandler: ((e: MouseEvent) => void) | null = null;
    let mousemoveHandler: ((e: MouseEvent) => void) | null = null;

    beforeEach(() => {
      // Capture mouse event handlers from element
      (element.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
        (type: string, handler: EventListener) => {
          if (type === 'mousedown') mousedownHandler = handler as (e: MouseEvent) => void;
          if (type === 'mouseup') mouseupHandler = handler as (e: MouseEvent) => void;
          if (type === 'mousemove') mousemoveHandler = handler as (e: MouseEvent) => void;
        }
      );

      // Reinitialize to capture handlers
      inputManager.cleanup();
      inputManager = new InputManager(element);
    });

    it('should track mouse position', () => {
      mousemoveHandler?.(createMouseEvent('mousemove', 100, 200));

      const pos = inputManager.getMousePosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should track mouse button down', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));

      expect(inputManager.isMouseButtonDown(0)).toBe(true);
    });

    it('should track mouse button up', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));
      mouseupHandler?.(createMouseEvent('mouseup', 100, 200, 0));

      expect(inputManager.isMouseButtonDown(0)).toBe(false);
    });

    it('should track mouse button pressed (just pressed)', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));

      expect(inputManager.isMouseButtonPressed(0)).toBe(true);
    });

    it('should track mouse button released', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));
      mouseupHandler?.(createMouseEvent('mouseup', 100, 200, 0));

      expect(inputManager.isMouseButtonReleased(0)).toBe(true);
    });

    it('should clear mouse button pressed after update', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));
      inputManager.update();

      expect(inputManager.isMouseButtonPressed(0)).toBe(false);
    });

    it('should clear mouse button released after update', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 0));
      mouseupHandler?.(createMouseEvent('mouseup', 100, 200, 0));
      inputManager.update();

      expect(inputManager.isMouseButtonReleased(0)).toBe(false);
    });

    it('should track right mouse button', () => {
      mousedownHandler?.(createMouseEvent('mousedown', 100, 200, 2));

      expect(inputManager.isMouseButtonDown(2)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on cleanup', () => {
      inputManager.cleanup();

      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(element.removeEventListener).toHaveBeenCalled();
    });
  });
});
