// Gamepad button indices (standard mapping)
export const GamepadButton = {
  A: 0,           // A / Cross
  B: 1,           // B / Circle
  X: 2,           // X / Square
  Y: 3,           // Y / Triangle
  LB: 4,          // Left Bumper
  RB: 5,          // Right Bumper
  LT: 6,          // Left Trigger
  RT: 7,          // Right Trigger
  BACK: 8,        // Back / Select
  START: 9,       // Start
  LS: 10,         // Left Stick Click
  RS: 11,         // Right Stick Click
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16,       // Home / Guide button
} as const;

// Gamepad axis indices
export const GamepadAxis = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3,
} as const;

export interface GamepadState {
  connected: boolean;
  buttons: boolean[];
  buttonsPressed: boolean[];
  axes: number[];
  id: string;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  private keysReleased: Map<string, boolean> = new Map();

  private mousePos = { x: 0, y: 0 };
  private mouseButtons: Map<number, boolean> = new Map();
  private mouseButtonsPressed: Map<number, boolean> = new Map();
  private mouseButtonsReleased: Map<number, boolean> = new Map();

  private element: HTMLElement;

  // Gamepad state
  private gamepads: Map<number, GamepadState> = new Map();
  private previousGamepadButtons: Map<number, boolean[]> = new Map();
  private gamepadDeadzone: number = 0.15;
  private gamepadEnabled: boolean = true;

  // Store bound event handlers to properly remove them later
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleContextMenu: (e: Event) => void;
  private boundHandleGamepadConnected: (e: GamepadEvent) => void;
  private boundHandleGamepadDisconnected: (e: GamepadEvent) => void;

  constructor(element: HTMLElement) {
    this.element = element;

    // Create bound handlers once
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleContextMenu = (e) => e.preventDefault();
    this.boundHandleGamepadConnected = this.handleGamepadConnected.bind(this);
    this.boundHandleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);

    // Mouse events
    this.element.addEventListener('mousemove', this.boundHandleMouseMove);
    this.element.addEventListener('mousedown', this.boundHandleMouseDown);
    this.element.addEventListener('mouseup', this.boundHandleMouseUp);

    // Prevent context menu on right click
    this.element.addEventListener('contextmenu', this.boundHandleContextMenu);

    // Gamepad events
    window.addEventListener('gamepadconnected', this.boundHandleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.boundHandleGamepadDisconnected);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.keys.get(event.code)) {
      this.keysPressed.set(event.code, true);
    }
    this.keys.set(event.code, true);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.code, false);
    this.keysReleased.set(event.code, true);
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.mousePos.x = event.clientX - rect.left;
    this.mousePos.y = event.clientY - rect.top;
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.mouseButtons.get(event.button)) {
      this.mouseButtonsPressed.set(event.button, true);
    }
    this.mouseButtons.set(event.button, true);
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseButtons.set(event.button, false);
    this.mouseButtonsReleased.set(event.button, true);
  }

  private handleGamepadConnected(event: GamepadEvent): void {
    console.log(`Gamepad connected: ${event.gamepad.id}`);
    this.gamepads.set(event.gamepad.index, {
      connected: true,
      buttons: new Array(event.gamepad.buttons.length).fill(false),
      buttonsPressed: new Array(event.gamepad.buttons.length).fill(false),
      axes: new Array(event.gamepad.axes.length).fill(0),
      id: event.gamepad.id,
    });
    this.previousGamepadButtons.set(
      event.gamepad.index,
      new Array(event.gamepad.buttons.length).fill(false)
    );
  }

  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log(`Gamepad disconnected: ${event.gamepad.id}`);
    this.gamepads.delete(event.gamepad.index);
    this.previousGamepadButtons.delete(event.gamepad.index);
  }

  // Poll gamepads (must be called each frame as Gamepad API requires polling)
  private pollGamepads(): void {
    if (!this.gamepadEnabled) return;

    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (!gamepad) continue;

      let state = this.gamepads.get(gamepad.index);
      if (!state) {
        // Auto-register gamepad if not already registered
        state = {
          connected: true,
          buttons: new Array(gamepad.buttons.length).fill(false),
          buttonsPressed: new Array(gamepad.buttons.length).fill(false),
          axes: new Array(gamepad.axes.length).fill(0),
          id: gamepad.id,
        };
        this.gamepads.set(gamepad.index, state);
        this.previousGamepadButtons.set(
          gamepad.index,
          new Array(gamepad.buttons.length).fill(false)
        );
      }

      const prevButtons = this.previousGamepadButtons.get(gamepad.index) || [];

      // Update button states
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const pressed = gamepad.buttons[i].pressed;
        state.buttons[i] = pressed;
        // Detect new press (wasn't pressed last frame, pressed now)
        state.buttonsPressed[i] = pressed && !prevButtons[i];
        prevButtons[i] = pressed;
      }

      // Update axis values with deadzone
      for (let i = 0; i < gamepad.axes.length; i++) {
        const value = gamepad.axes[i];
        state.axes[i] = Math.abs(value) < this.gamepadDeadzone ? 0 : value;
      }
    }
  }

  // Keyboard methods
  isKeyDown(key: string): boolean {
    return this.keys.get(key) ?? false;
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.get(key) ?? false;
  }

  isKeyReleased(key: string): boolean {
    return this.keysReleased.get(key) ?? false;
  }

  // Mouse methods
  isMouseButtonDown(button: number = 0): boolean {
    return this.mouseButtons.get(button) ?? false;
  }

  isMouseButtonPressed(button: number = 0): boolean {
    return this.mouseButtonsPressed.get(button) ?? false;
  }

  isMouseButtonReleased(button: number = 0): boolean {
    return this.mouseButtonsReleased.get(button) ?? false;
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  // Gamepad methods
  isGamepadConnected(index: number = 0): boolean {
    return this.gamepads.get(index)?.connected ?? false;
  }

  getConnectedGamepads(): number[] {
    return Array.from(this.gamepads.keys()).filter(
      i => this.gamepads.get(i)?.connected
    );
  }

  isGamepadButtonDown(button: number, gamepadIndex: number = 0): boolean {
    if (!this.gamepadEnabled) return false;
    return this.gamepads.get(gamepadIndex)?.buttons[button] ?? false;
  }

  isGamepadButtonPressed(button: number, gamepadIndex: number = 0): boolean {
    if (!this.gamepadEnabled) return false;
    return this.gamepads.get(gamepadIndex)?.buttonsPressed[button] ?? false;
  }

  getGamepadAxis(axis: number, gamepadIndex: number = 0): number {
    if (!this.gamepadEnabled) return 0;
    return this.gamepads.get(gamepadIndex)?.axes[axis] ?? 0;
  }

  getGamepadLeftStick(gamepadIndex: number = 0): { x: number; y: number } {
    return {
      x: this.getGamepadAxis(GamepadAxis.LEFT_X, gamepadIndex),
      y: this.getGamepadAxis(GamepadAxis.LEFT_Y, gamepadIndex),
    };
  }

  getGamepadRightStick(gamepadIndex: number = 0): { x: number; y: number } {
    return {
      x: this.getGamepadAxis(GamepadAxis.RIGHT_X, gamepadIndex),
      y: this.getGamepadAxis(GamepadAxis.RIGHT_Y, gamepadIndex),
    };
  }

  setGamepadDeadzone(deadzone: number): void {
    this.gamepadDeadzone = Math.max(0, Math.min(1, deadzone));
  }

  setGamepadEnabled(enabled: boolean): void {
    this.gamepadEnabled = enabled;
  }

  // Helper methods for common keys (now includes gamepad)
  isLeftPressed(): boolean {
    return (
      this.isKeyDown('ArrowLeft') ||
      this.isKeyDown('KeyA') ||
      this.isGamepadButtonDown(GamepadButton.DPAD_LEFT) ||
      this.getGamepadAxis(GamepadAxis.LEFT_X) < -0.5
    );
  }

  isRightPressed(): boolean {
    return (
      this.isKeyDown('ArrowRight') ||
      this.isKeyDown('KeyD') ||
      this.isGamepadButtonDown(GamepadButton.DPAD_RIGHT) ||
      this.getGamepadAxis(GamepadAxis.LEFT_X) > 0.5
    );
  }

  isUpPressed(): boolean {
    return (
      this.isKeyDown('ArrowUp') ||
      this.isKeyDown('KeyW') ||
      this.isGamepadButtonDown(GamepadButton.DPAD_UP) ||
      this.getGamepadAxis(GamepadAxis.LEFT_Y) < -0.5
    );
  }

  isDownPressed(): boolean {
    return (
      this.isKeyDown('ArrowDown') ||
      this.isKeyDown('KeyS') ||
      this.isGamepadButtonDown(GamepadButton.DPAD_DOWN) ||
      this.getGamepadAxis(GamepadAxis.LEFT_Y) > 0.5
    );
  }

  isJumpPressed(): boolean {
    return (
      this.isKeyDown('Space') ||
      this.isGamepadButtonDown(GamepadButton.A)
    );
  }

  isActionPressed(): boolean {
    return (
      this.isKeyDown('KeyE') ||
      this.isKeyDown('Enter') ||
      this.isGamepadButtonDown(GamepadButton.X)
    );
  }

  isPausePressed(): boolean {
    return (
      this.isKeyPressed('Escape') ||
      this.isKeyPressed('KeyP') ||
      this.isGamepadButtonPressed(GamepadButton.START)
    );
  }

  // Get horizontal movement value (-1 to 1)
  getHorizontalAxis(): number {
    // Keyboard/dpad gives discrete values
    if (this.isLeftPressed() && !this.isRightPressed()) return -1;
    if (this.isRightPressed() && !this.isLeftPressed()) return 1;

    // Fallback to analog stick (more precise)
    const stickX = this.getGamepadAxis(GamepadAxis.LEFT_X);
    if (Math.abs(stickX) > this.gamepadDeadzone) return stickX;

    return 0;
  }

  // Get vertical movement value (-1 to 1)
  getVerticalAxis(): number {
    if (this.isUpPressed() && !this.isDownPressed()) return -1;
    if (this.isDownPressed() && !this.isUpPressed()) return 1;

    const stickY = this.getGamepadAxis(GamepadAxis.LEFT_Y);
    if (Math.abs(stickY) > this.gamepadDeadzone) return stickY;

    return 0;
  }

  // Clear pressed/released states (call once per frame)
  update(): void {
    // Poll gamepads before clearing states
    this.pollGamepads();

    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();

    // Clear gamepad pressed states
    for (const state of this.gamepads.values()) {
      state.buttonsPressed.fill(false);
    }
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
    this.element.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.element.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.element.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.element.removeEventListener('contextmenu', this.boundHandleContextMenu);
    window.removeEventListener('gamepadconnected', this.boundHandleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.boundHandleGamepadDisconnected);
  }
}
