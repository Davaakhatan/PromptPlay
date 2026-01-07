/**
 * Test setup file for runtime-2d package
 * Provides mocks for Canvas2D, Matter.js, and browser APIs
 */
import { vi, beforeEach, afterEach } from 'vitest';

// Mock time tracking
let mockTime = 0;

// Mock performance.now to return our controlled mock time
vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

// Mock requestAnimationFrame / cancelAnimationFrame
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = ++animationFrameId;
  animationFrameCallbacks.set(id, callback);
  return id;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  animationFrameCallbacks.delete(id);
});

// Helper to advance animation frames in tests
// This sets the mock time and invokes scheduled callbacks
export function advanceAnimationFrame(timestamp: number): void {
  mockTime = timestamp;
  const callbacks = Array.from(animationFrameCallbacks.values());
  animationFrameCallbacks.clear();
  callbacks.forEach(cb => cb(timestamp));
}

// Helper to set mock time without triggering callbacks
export function setMockTime(timestamp: number): void {
  mockTime = timestamp;
}

// Helper to get current mock time
export function getMockTime(): number {
  return mockTime;
}

// Create a mock Canvas2D context
export function createMockCanvas2DContext(): CanvasRenderingContext2D {
  const ctx = {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',

    // Methods
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),

    // Transformation
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),

    // Image/text
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),

    // Clipping
    clip: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),

    // Pixel manipulation
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),

    // Gradients/patterns
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),

    // Other
    createPath2D: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  return ctx;
}

// Create a mock HTMLCanvasElement
export function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = createMockCanvas2DContext();

  const canvas = {
    width,
    height,
    getContext: vi.fn((contextType: string) => {
      if (contextType === '2d') {
        return ctx;
      }
      return null;
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    toBlob: vi.fn((callback) => callback(new Blob())),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: {},
  } as unknown as HTMLCanvasElement;

  return canvas;
}

// Create a mock HTMLElement for InputManager
export function createMockElement(): HTMLElement {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
  } as unknown as HTMLElement;
}

// Create a mock Image for texture loading
export function createMockImage(): HTMLImageElement {
  const img = {
    src: '',
    width: 64,
    height: 64,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    complete: false,
    naturalWidth: 64,
    naturalHeight: 64,
  };

  // Simulate async load when src is set
  Object.defineProperty(img, 'src', {
    set(value: string) {
      (img as any)._src = value;
      // Auto-trigger onload in next tick (simulate successful load by default)
      setTimeout(() => {
        img.complete = true;
        if (img.onload) img.onload();
      }, 0);
    },
    get() {
      return (img as any)._src || '';
    },
  });

  return img as unknown as HTMLImageElement;
}

// Mock Image constructor
(global as any).Image = vi.fn(() => createMockImage());

// Mock navigator.getGamepads for gamepad input tests
Object.defineProperty(global.navigator, 'getGamepads', {
  value: vi.fn(() => []),
  writable: true,
  configurable: true,
});

// Mock KeyboardEvent
export function createKeyboardEvent(type: string, code: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    type,
    code,
    key: options.key || code,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as unknown as KeyboardEvent;
}

// Mock MouseEvent
export function createMouseEvent(type: string, x: number, y: number, button = 0): MouseEvent {
  return {
    type,
    clientX: x,
    clientY: y,
    button,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as MouseEvent;
}

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  animationFrameId = 0;
  animationFrameCallbacks.clear();
  mockTime = 0;
  // Re-mock performance.now after clearAllMocks
  vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
});

afterEach(() => {
  vi.restoreAllMocks();
});
