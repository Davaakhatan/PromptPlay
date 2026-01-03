// Main game class
export { Game3D, type Game3DOptions } from './Game3D';

// Renderer
export { ThreeRenderer, type ThreeRendererOptions } from './renderers/ThreeRenderer';

// Components
export {
  Transform3D,
  Mesh,
  Material,
  Light,
  Velocity3D,
  Camera3D,
  Collider3D,
  // Type constants
  GeometryType,
  LightType,
  CameraType,
  MaterialSide,
  ColliderType,
} from './components';

// Systems
export { Render3DSystem } from './systems/Render3DSystem';
export { Transform3DSystem } from './systems/Transform3DSystem';

// Re-export Three.js types that users might need
export type { Scene, WebGLRenderer, PerspectiveCamera, OrthographicCamera } from 'three';
