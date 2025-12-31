export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  private keysReleased: Map<string, boolean> = new Map();

  private mousePos = { x: 0, y: 0 };
  private mouseButtons: Map<number, boolean> = new Map();
  private mouseButtonsPressed: Map<number, boolean> = new Map();
  private mouseButtonsReleased: Map<number, boolean> = new Map();

  private element: HTMLElement;

  // Store bound event handlers to properly remove them later
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleContextMenu: (e: Event) => void;

  constructor(element: HTMLElement) {
    this.element = element;

    // Create bound handlers once
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleContextMenu = (e) => e.preventDefault();

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
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
    this.element.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.element.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.element.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.element.removeEventListener('contextmenu', this.boundHandleContextMenu);
  }
}
