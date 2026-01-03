/**
 * 3D-specific types for PromptPlay game engine
 */

// 3D Transform component
export interface Transform3DComponent {
  x: number;
  y: number;
  z: number;
  rotationX?: number;  // Euler angles in radians
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

// Geometry types
export type GeometryType = 'box' | 'sphere' | 'plane' | 'cylinder' | 'cone' | 'torus' | 'custom';

// Mesh component
export interface MeshComponent {
  geometry: GeometryType;
  // Dimensions (interpretation depends on geometry type)
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  // Segments for smoother geometry
  widthSegments?: number;
  heightSegments?: number;
  radialSegments?: number;
  // Material reference (entity ID with Material component)
  materialId?: number;
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
  // Custom model path (for GLTF)
  modelPath?: string;
  // Visibility
  visible?: boolean;
}

// Material component (PBR)
export interface MaterialComponent {
  // Base color
  color?: string;  // Hex color
  // PBR properties
  metallic?: number;     // 0-1
  roughness?: number;    // 0-1
  // Transparency
  opacity?: number;      // 0-1
  transparent?: boolean;
  // Emissive
  emissive?: string;     // Hex color
  emissiveIntensity?: number;
  // Textures (paths)
  map?: string;          // Diffuse/albedo texture
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;        // Ambient occlusion
  // Rendering
  side?: 'front' | 'back' | 'double';
  wireframe?: boolean;
  flatShading?: boolean;
}

// Light types
export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';

// Light component
export interface LightComponent {
  type: LightType;
  color?: string;         // Hex color
  intensity?: number;
  // Shadow settings (for directional, point, spot)
  castShadow?: boolean;
  shadowMapSize?: number; // e.g., 1024, 2048
  shadowBias?: number;
  // For directional and spot lights - target position
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  // For point and spot lights
  distance?: number;      // Maximum range
  decay?: number;         // Falloff
  // For spot lights
  angle?: number;         // Cone angle in radians
  penumbra?: number;      // Edge softness 0-1
  // For hemisphere lights
  groundColor?: string;
}

// 3D Collider component
export interface Collider3DComponent {
  type: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'mesh';
  // Dimensions
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  // Physics properties
  mass?: number;
  friction?: number;
  restitution?: number;  // Bounciness
  // Triggers
  isTrigger?: boolean;
  // Collision groups
  collisionGroup?: number;
  collisionMask?: number;
}

// 3D Velocity component
export interface Velocity3DComponent {
  vx: number;
  vy: number;
  vz: number;
  // Angular velocity
  angularX?: number;
  angularY?: number;
  angularZ?: number;
}

// 3D Camera component
export interface Camera3DComponent {
  type?: 'perspective' | 'orthographic';
  // Perspective camera
  fov?: number;           // Field of view in degrees
  near?: number;
  far?: number;
  // Orthographic camera
  orthoSize?: number;     // Half-height of view
  // Common
  isActive?: boolean;
  // Follow target
  followTarget?: number;  // Entity ID
  followSmoothing?: number;
  followOffsetX?: number;
  followOffsetY?: number;
  followOffsetZ?: number;
  // Look at target
  lookAtTarget?: number;  // Entity ID
}

// 3D Input component
export interface Input3DComponent {
  moveSpeed?: number;     // Movement speed
  jumpForce?: number;     // Jump force
  canJump?: boolean;      // Whether jumping is enabled
  isGrounded?: boolean;   // Whether entity is on ground
}

// 3D RigidBody component
export interface RigidBody3DComponent {
  type?: 'dynamic' | 'static' | 'kinematic';
  mass?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
}

// Extended EntityComponents for 3D
export interface Entity3DComponents {
  transform3d?: Transform3DComponent;
  mesh?: MeshComponent;
  material?: MaterialComponent;
  light?: LightComponent;
  collider3d?: Collider3DComponent;
  velocity3d?: Velocity3DComponent;
  camera3d?: Camera3DComponent;
  input3d?: Input3DComponent;
  rigidbody3d?: RigidBody3DComponent;
}

// 3D Scene configuration
export interface Scene3DConfig {
  // Environment
  backgroundColor?: string;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  // Skybox
  skybox?: string;  // Texture path or preset
  // Ambient lighting
  ambientColor?: string;
  ambientIntensity?: number;
  // Physics
  gravity?: { x: number; y: number; z: number };
}

// 3D Game spec extension
export interface Game3DSpec {
  version: string;
  mode: '3d';
  metadata: {
    title: string;
    genre: string;
    description: string;
  };
  config: Scene3DConfig & {
    worldBounds?: { width: number; height: number; depth: number };
  };
  entities: Array<{
    name: string;
    components: Entity3DComponents;
    tags?: string[];
  }>;
  systems: string[];
}
