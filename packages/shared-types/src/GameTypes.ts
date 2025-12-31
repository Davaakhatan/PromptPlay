// Game specification types for JSON serialization
export interface GameSpec {
  version: string;
  metadata: GameMetadata;
  config: GameConfig;
  entities: EntitySpec[];
  systems: string[];
  settings?: GameSettings;
}

export interface GameMetadata {
  title: string;
  name?: string;
  genre: 'platformer' | 'shooter' | 'puzzle';
  description: string;
}

export interface GameConfig {
  gravity: { x: number; y: number };
  worldBounds: { width: number; height: number };
}

export interface GameSettings {
  physics?: {
    gravity?: number;
    friction?: number;
  };
}

export interface EntitySpec {
  name: string;
  components: EntityComponents;
  tags?: string[];
}

export interface EntityComponents {
  transform?: TransformComponent;
  velocity?: VelocityComponent;
  sprite?: SpriteComponent;
  collider?: ColliderComponent;
  input?: InputComponent;
  health?: HealthComponent;
  aiBehavior?: AIBehaviorComponent;
  animation?: AnimationComponent;
  camera?: CameraComponent;
  particleEmitter?: ParticleEmitterComponent;
}

// Component type definitions
export interface TransformComponent {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
}

export interface SpriteComponent {
  texture: string;
  width: number;
  height: number;
  tint?: string | number;
  visible?: boolean;
  zIndex?: number;
  // Sprite sheet support
  frameX?: number;
  frameY?: number;
  frameWidth?: number;
  frameHeight?: number;
  // Anchor point (0-1)
  anchorX?: number;
  anchorY?: number;
  // Flip
  flipX?: boolean;
  flipY?: boolean;
}

export interface ColliderComponent {
  type: 'box' | 'circle';
  width?: number;
  height?: number;
  radius?: number;
  isSensor?: boolean;
  layer?: number;
}

export interface InputComponent {
  moveSpeed: number;
  jumpForce: number;
  canJump?: boolean;
  keys?: {
    left?: string;
    right?: string;
    jump?: string;
  };
}

export interface HealthComponent {
  current: number;
  max: number;
}

export interface AIBehaviorComponent {
  type: 'patrol' | 'chase' | 'flee';
  speed: number;
  detectionRadius: number;
  targetEntity?: number;
  patrolRange?: number;
}

export interface AnimationComponent {
  currentFrame?: number;
  frameCount: number;
  frameDuration: number;
  isPlaying?: boolean;
  loop?: boolean;
  animationId?: number;
}

export interface CameraComponent {
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
  followTarget?: number;
  followSmoothing?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  shakeIntensity?: number;
  shakeDuration?: number;
  isActive?: boolean;
}

export interface ParticleEmitterComponent {
  emitRate?: number;
  maxParticles?: number;
  minLifetime?: number;
  maxLifetime?: number;
  minSize?: number;
  maxSize?: number;
  minSpeed?: number;
  maxSpeed?: number;
  minAngle?: number;
  maxAngle?: number;
  startColor?: number | string;
  endColor?: number | string;
  gravityX?: number;
  gravityY?: number;
  isEmitting?: boolean;
  burstCount?: number;
}
