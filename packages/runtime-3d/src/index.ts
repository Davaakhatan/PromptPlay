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
  RigidBody3D,
  Input3D,
  // Type constants
  GeometryType,
  LightType,
  CameraType,
  MaterialSide,
  ColliderType,
  RigidBodyType,
} from './components';

// Systems
export { Render3DSystem } from './systems/Render3DSystem';
export { Transform3DSystem } from './systems/Transform3DSystem';
export { Physics3DSystem } from './systems/Physics3DSystem';
export { Camera3DSystem } from './systems/Camera3DSystem';
export { LightingSystem } from './systems/LightingSystem';
export { Input3DSystem } from './systems/Input3DSystem';

// Input
export { InputManager3D } from './input/InputManager3D';

// Physics
export {
  CannonPhysics,
  type PhysicsConfig,
  type RigidBodyOptions,
  type ColliderShape,
} from './physics/CannonPhysics';

// Controls
export { OrbitControls } from './controls/OrbitControls';

// Re-export Three.js types that users might need
export type { Scene, WebGLRenderer, PerspectiveCamera, OrthographicCamera } from 'three';

// Re-export Cannon-es types that users might need
export type { World as CannonWorld, Body as CannonBody } from 'cannon-es';
