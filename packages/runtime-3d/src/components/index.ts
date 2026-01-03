import { defineComponent, Types } from 'bitecs';

/**
 * 3D Transform component
 * Position, rotation (Euler), and scale in 3D space
 */
export const Transform3D = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  rotationX: Types.f32,
  rotationY: Types.f32,
  rotationZ: Types.f32,
  scaleX: Types.f32,
  scaleY: Types.f32,
  scaleZ: Types.f32,
});

/**
 * Mesh component
 * Defines 3D geometry and rendering properties
 */
export const Mesh = defineComponent({
  geometry: Types.ui8,      // 0=box, 1=sphere, 2=plane, 3=cylinder, 4=cone, 5=torus, 6=custom
  width: Types.f32,
  height: Types.f32,
  depth: Types.f32,
  radius: Types.f32,
  widthSegments: Types.ui16,
  heightSegments: Types.ui16,
  materialId: Types.eid,    // Reference to entity with Material component
  castShadow: Types.ui8,
  receiveShadow: Types.ui8,
  visible: Types.ui8,
});

/**
 * Material component
 * PBR material properties
 */
export const Material = defineComponent({
  color: Types.ui32,           // RGB packed integer
  metallic: Types.f32,
  roughness: Types.f32,
  opacity: Types.f32,
  emissive: Types.ui32,        // RGB packed integer
  emissiveIntensity: Types.f32,
  transparent: Types.ui8,
  side: Types.ui8,             // 0=front, 1=back, 2=double
  wireframe: Types.ui8,
  flatShading: Types.ui8,
});

/**
 * Light component
 * Light source properties
 */
export const Light = defineComponent({
  type: Types.ui8,             // 0=ambient, 1=directional, 2=point, 3=spot, 4=hemisphere
  color: Types.ui32,           // RGB packed integer
  intensity: Types.f32,
  castShadow: Types.ui8,
  shadowMapSize: Types.ui16,
  shadowBias: Types.f32,
  // Target (for directional/spot)
  targetX: Types.f32,
  targetY: Types.f32,
  targetZ: Types.f32,
  // Range (for point/spot)
  distance: Types.f32,
  decay: Types.f32,
  // Spot specific
  angle: Types.f32,
  penumbra: Types.f32,
  // Hemisphere
  groundColor: Types.ui32,
});

/**
 * Velocity3D component
 * Linear and angular velocity in 3D space
 */
export const Velocity3D = defineComponent({
  vx: Types.f32,
  vy: Types.f32,
  vz: Types.f32,
  angularX: Types.f32,
  angularY: Types.f32,
  angularZ: Types.f32,
});

/**
 * Camera3D component
 * 3D camera properties
 */
export const Camera3D = defineComponent({
  type: Types.ui8,             // 0=perspective, 1=orthographic
  fov: Types.f32,
  near: Types.f32,
  far: Types.f32,
  orthoSize: Types.f32,
  isActive: Types.ui8,
  followTarget: Types.eid,
  followSmoothing: Types.f32,
  followOffsetX: Types.f32,
  followOffsetY: Types.f32,
  followOffsetZ: Types.f32,
  lookAtTarget: Types.eid,
});

/**
 * Collider3D component
 * 3D physics collider
 */
export const Collider3D = defineComponent({
  type: Types.ui8,             // 0=box, 1=sphere, 2=capsule, 3=cylinder, 4=mesh
  width: Types.f32,
  height: Types.f32,
  depth: Types.f32,
  radius: Types.f32,
  mass: Types.f32,
  friction: Types.f32,
  restitution: Types.f32,
  isTrigger: Types.ui8,
  collisionGroup: Types.ui16,
  collisionMask: Types.ui16,
});

// Geometry type constants
export const GeometryType = {
  BOX: 0,
  SPHERE: 1,
  PLANE: 2,
  CYLINDER: 3,
  CONE: 4,
  TORUS: 5,
  CUSTOM: 6,
} as const;

// Light type constants
export const LightType = {
  AMBIENT: 0,
  DIRECTIONAL: 1,
  POINT: 2,
  SPOT: 3,
  HEMISPHERE: 4,
} as const;

// Camera type constants
export const CameraType = {
  PERSPECTIVE: 0,
  ORTHOGRAPHIC: 1,
} as const;

// Material side constants
export const MaterialSide = {
  FRONT: 0,
  BACK: 1,
  DOUBLE: 2,
} as const;

// Collider type constants
export const ColliderType = {
  BOX: 0,
  SPHERE: 1,
  CAPSULE: 2,
  CYLINDER: 3,
  MESH: 4,
} as const;

/**
 * RigidBody3D component
 * Physics rigid body properties
 */
export const RigidBody3D = defineComponent({
  type: Types.ui8,              // 0=dynamic, 1=static, 2=kinematic
  mass: Types.f32,
  linearDamping: Types.f32,
  angularDamping: Types.f32,
  fixedRotation: Types.ui8,     // 1 = locked rotation
  sleepSpeedLimit: Types.f32,
  sleepTimeLimit: Types.f32,
  isSleeping: Types.ui8,
});

// RigidBody type constants
export const RigidBodyType = {
  DYNAMIC: 0,
  STATIC: 1,
  KINEMATIC: 2,
} as const;
