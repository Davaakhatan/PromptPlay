/**
 * Test setup file for runtime-3d package
 * Provides mocks for Three.js, Cannon-es, and browser APIs
 */
import { vi, beforeEach, afterEach } from 'vitest';

// Mock time tracking
let mockTime = 0;

// Mock performance.now
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

// Helper to advance animation frames
export function advanceAnimationFrame(timestamp: number): void {
  mockTime = timestamp;
  const callbacks = Array.from(animationFrameCallbacks.values());
  animationFrameCallbacks.clear();
  callbacks.forEach(cb => cb(timestamp));
}

// Helper to set mock time
export function setMockTime(timestamp: number): void {
  mockTime = timestamp;
}

// Helper to get current mock time
export function getMockTime(): number {
  return mockTime;
}

// Mock WebGLRenderingContext
const mockWebGLContext = {
  canvas: { width: 800, height: 600 },
  getExtension: vi.fn(() => null),
  getParameter: vi.fn((param) => {
    // Return sensible defaults for common parameters
    if (param === 7938) return 'WebGL 2.0'; // VERSION
    if (param === 7936) return 'Mock Vendor'; // VENDOR
    if (param === 7937) return 'Mock Renderer'; // RENDERER
    return null;
  }),
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  useProgram: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  createFramebuffer: vi.fn(() => ({})),
  bindFramebuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  createRenderbuffer: vi.fn(() => ({})),
  bindRenderbuffer: vi.fn(),
  renderbufferStorage: vi.fn(),
  framebufferRenderbuffer: vi.fn(),
  checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  blendFunc: vi.fn(),
  cullFace: vi.fn(),
  frontFace: vi.fn(),
  getUniformLocation: vi.fn(() => ({})),
  getAttribLocation: vi.fn(() => 0),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn(),
  deleteFramebuffer: vi.fn(),
  deleteRenderbuffer: vi.fn(),
  getShaderInfoLog: vi.fn(() => ''),
  getProgramInfoLog: vi.fn(() => ''),
  pixelStorei: vi.fn(),
  activeTexture: vi.fn(),
  scissor: vi.fn(),
  colorMask: vi.fn(),
  depthMask: vi.fn(),
  stencilMask: vi.fn(),
  stencilFunc: vi.fn(),
  stencilOp: vi.fn(),
};

// Create mock canvas
export function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const canvas = {
    width,
    height,
    style: {},
    getContext: vi.fn((contextType: string) => {
      if (contextType === 'webgl' || contextType === 'webgl2') {
        return mockWebGLContext;
      }
      if (contextType === '2d') {
        return {
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          fillStyle: '',
        };
      }
      return null;
    }),
    getBoundingClientRect: vi.fn(() => ({
      left: 0, top: 0, right: width, bottom: height,
      width, height, x: 0, y: 0, toJSON: () => ({}),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  } as unknown as HTMLCanvasElement;

  return canvas;
}

// Mock Three.js classes
vi.mock('three', () => {
  const Vector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    length: vi.fn(() => Math.sqrt(x * x + y * y + z * z)),
    clone: vi.fn(() => ({ x, y, z })),
  }));

  const Euler = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
  }));

  const Quaternion = vi.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0, w: 1,
    setFromEuler: vi.fn().mockReturnThis(),
  }));

  const Color = vi.fn().mockImplementation((color?: string | number) => ({
    r: 1, g: 1, b: 1,
    setHex: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }));

  const Object3D = vi.fn().mockImplementation(() => ({
    position: new Vector3(),
    rotation: new Euler(),
    scale: new Vector3(1, 1, 1),
    quaternion: new Quaternion(),
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    children: [],
    visible: true,
    castShadow: false,
    receiveShadow: false,
  }));

  const Mesh = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    geometry: null,
    material: null,
    isMesh: true,
  }));

  const Scene = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isScene: true,
    background: null,
    fog: null,
  }));

  const PerspectiveCamera = vi.fn().mockImplementation((fov = 75, aspect = 1, near = 0.1, far = 1000) => ({
    ...new Object3D(),
    isPerspectiveCamera: true,
    fov, aspect, near, far,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  }));

  const OrthographicCamera = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isOrthographicCamera: true,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  }));

  const mockDomElement = {
    width: 800,
    height: 600,
    style: {},
    getContext: vi.fn((contextType: string) => {
      if (contextType === 'webgl' || contextType === 'webgl2') {
        return mockWebGLContext;
      }
      return null;
    }),
  };

  const WebGLRenderer = vi.fn().mockImplementation(() => ({
    domElement: mockDomElement,
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    shadowMap: { enabled: false, type: 0 },
    outputColorSpace: '',
    toneMapping: 0,
    toneMappingExposure: 1,
  }));

  const TextureLoader = vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad, _onProgress, _onError) => {
      const texture = {
        colorSpace: '',
        wrapS: 0,
        wrapT: 0,
        repeat: { set: vi.fn() },
      };
      if (onLoad) {
        setTimeout(() => onLoad(texture), 0);
      }
      return texture;
    }),
  }));

  const BoxGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const SphereGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const PlaneGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const CylinderGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const ConeGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const TorusGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const MeshStandardMaterial = vi.fn().mockImplementation(() => ({
    color: new Color(),
    metalness: 0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
    dispose: vi.fn(),
  }));

  const AmbientLight = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isAmbientLight: true,
    color: new Color(),
    intensity: 1,
  }));

  const DirectionalLight = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isDirectionalLight: true,
    color: new Color(),
    intensity: 1,
    target: new Object3D(),
    shadow: { mapSize: { width: 1024, height: 1024 }, camera: {} },
  }));

  const PointLight = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isPointLight: true,
    color: new Color(),
    intensity: 1,
    distance: 0,
    decay: 2,
  }));

  const SpotLight = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isSpotLight: true,
    color: new Color(),
    intensity: 1,
    angle: Math.PI / 4,
    penumbra: 0,
    target: new Object3D(),
  }));

  const HemisphereLight = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
    isHemisphereLight: true,
  }));

  const GridHelper = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
  }));

  const AxesHelper = vi.fn().mockImplementation(() => ({
    ...new Object3D(),
  }));

  const Fog = vi.fn().mockImplementation(() => ({
    color: new Color(),
    near: 1,
    far: 1000,
  }));

  const Raycaster = vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => []),
  }));

  const Vector2 = vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y }));

  return {
    Vector3,
    Vector2,
    Euler,
    Quaternion,
    Color,
    Object3D,
    Mesh,
    Scene,
    PerspectiveCamera,
    OrthographicCamera,
    WebGLRenderer,
    TextureLoader,
    BoxGeometry,
    SphereGeometry,
    PlaneGeometry,
    CylinderGeometry,
    ConeGeometry,
    TorusGeometry,
    MeshStandardMaterial,
    AmbientLight,
    DirectionalLight,
    PointLight,
    SpotLight,
    HemisphereLight,
    GridHelper,
    AxesHelper,
    Fog,
    Raycaster,
    SRGBColorSpace: 'srgb',
    ACESFilmicToneMapping: 4,
    PCFSoftShadowMap: 2,
    RepeatWrapping: 1000,
  };
});

// Mock Cannon-es
vi.mock('cannon-es', () => {
  const Vec3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    vadd: vi.fn().mockReturnThis(),
    vsub: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis(),
  }));

  const Quaternion = vi.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0, w: 1,
    setFromEuler: vi.fn().mockReturnThis(),
  }));

  const Body = vi.fn().mockImplementation(() => ({
    position: new Vec3(),
    velocity: new Vec3(),
    angularVelocity: new Vec3(),
    quaternion: new Quaternion(),
    mass: 1,
    type: 1, // DYNAMIC
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    applyForce: vi.fn(),
    applyImpulse: vi.fn(),
  }));

  const Box = vi.fn().mockImplementation(() => ({}));
  const Sphere = vi.fn().mockImplementation(() => ({}));
  const Plane = vi.fn().mockImplementation(() => ({}));
  const Cylinder = vi.fn().mockImplementation(() => ({}));

  const World = vi.fn().mockImplementation(() => ({
    gravity: new Vec3(0, -9.82, 0),
    addBody: vi.fn(),
    removeBody: vi.fn(),
    step: vi.fn(),
    bodies: [],
  }));

  const Material = vi.fn().mockImplementation(() => ({}));
  const ContactMaterial = vi.fn().mockImplementation(() => ({}));

  return {
    Vec3,
    Quaternion,
    Body,
    Box,
    Sphere,
    Plane,
    Cylinder,
    World,
    Material,
    ContactMaterial,
    BODY_TYPES: { DYNAMIC: 1, STATIC: 2, KINEMATIC: 4 },
  };
});

// Mock GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad) => {
      // Simulate async load
      setTimeout(() => {
        onLoad({
          scene: {
            traverse: vi.fn(),
            children: [],
          },
        });
      }, 0);
    }),
    parse: vi.fn(),
  })),
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  animationFrameId = 0;
  animationFrameCallbacks.clear();
  mockTime = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock keyboard events
export function createKeyboardEvent(type: string, code: string): KeyboardEvent {
  return {
    type,
    code,
    key: code,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent;
}

// Mock mouse events
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
