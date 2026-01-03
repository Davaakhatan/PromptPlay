/**
 * InputManager3D - Keyboard and mouse input handling for 3D games
 */
export class InputManager3D {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  private keysReleased: Map<string, boolean> = new Map();

  // Store bound event handlers to properly remove them later
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    // Create bound handlers once
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
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

  // Helper methods for common keys
  isLeftPressed(): boolean {
    return this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA');
  }

  isRightPressed(): boolean {
    return this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD');
  }

  isForwardPressed(): boolean {
    return this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW');
  }

  isBackwardPressed(): boolean {
    return this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS');
  }

  isJumpPressed(): boolean {
    return this.isKeyPressed('Space');
  }

  isJumpHeld(): boolean {
    return this.isKeyDown('Space');
  }

  // Clear pressed/released states (call once per frame)
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
    this.keys.clear();
    this.keysPressed.clear();
    this.keysReleased.clear();
  }
}
