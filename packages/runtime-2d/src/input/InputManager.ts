export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  private keysReleased: Map<string, boolean> = new Map();

  private mousePos = { x: 0, y: 0 };
  private mouseButtons: Map<number, boolean> = new Map();
  private mouseButtonsPressed: Map<number, boolean> = new Map();
  private mouseButtonsReleased: Map<number, boolean> = new Map();

  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Mouse events
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Prevent context menu on right click
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());
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

  // Helper methods for common keys
  isLeftPressed(): boolean {
    return this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA');
  }

  isRightPressed(): boolean {
    return this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD');
  }

  isUpPressed(): boolean {
    return this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW');
  }

  isDownPressed(): boolean {
    return this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS');
  }

  isJumpPressed(): boolean {
    return this.isKeyDown('Space');
  }

  // Clear pressed/released states (call once per frame)
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }
}
