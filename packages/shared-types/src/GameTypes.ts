// Scene specification for multi-scene support
export interface SceneSpec {
  id: string;
  name: string;
  entities: EntitySpec[];
  config?: SceneConfig;
}

export interface SceneConfig {
  gravity?: { x: number; y: number };
  worldBounds?: { width: number; height: number };
  backgroundColor?: string;
}

// Game specification types for JSON serialization
export interface GameSpec {
  version: string;
  metadata: GameMetadata;
  config: GameConfig;
  // Legacy: flat entity list (for backwards compatibility with single-scene games)
  entities: EntitySpec[];
  // Multi-scene support (optional)
  scenes?: SceneSpec[];
  activeScene?: string; // Scene ID
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
  audio?: AudioComponent;
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
  // Sprite sheet support
  spriteSheet?: string; // Path to sprite sheet image
  frameWidth?: number;
  frameHeight?: number;
  // Animation state machine
  currentState?: string;
  states?: AnimationState[];
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

export interface AudioComponent {
  source: string;
  volume?: number;
  pitch?: number;
  isPlaying?: boolean;
  loop?: boolean;
  spatial?: boolean;
  maxDistance?: number;
}

// Animation state machine types
export interface AnimationState {
  name: string;
  frameStart: number; // Starting frame index in sprite sheet
  frameEnd: number; // Ending frame index
  frameDuration: number; // Duration per frame in ms
  loop: boolean;
  transitions?: AnimationTransition[];
}

export interface AnimationTransition {
  to: string; // Target state name
  condition: AnimationCondition;
}

export interface AnimationCondition {
  type: 'immediate' | 'onComplete' | 'parameter';
  parameter?: string; // Parameter name if type is 'parameter'
  comparator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value?: string | number | boolean;
}

// Prefab system types
export type PrefabCategory = 'player' | 'enemy' | 'platform' | 'collectible' | 'projectile' | 'effect' | 'ui' | 'custom';

export interface Prefab {
  id: string;
  name: string;
  description?: string;
  category: PrefabCategory;
  icon?: string; // Icon identifier or emoji
  entity: Omit<EntitySpec, 'name'>; // Entity template without name
  isBuiltIn?: boolean;
}

// Game Package types for import/export
export interface GamePackage {
  /** Package format version */
  formatVersion: '1.0';
  /** The game specification */
  gameSpec: GameSpec;
  /** Package metadata */
  packageMetadata: PackageMetadata;
  /** Embedded assets (base64 encoded) */
  assets?: EmbeddedAsset[];
  /** Custom prefabs used in this game */
  prefabs?: Prefab[];
  /** Chat history for AI context (optional) */
  chatHistory?: ChatMessage[];
}

export interface PackageMetadata {
  /** When the package was created */
  createdAt: string;
  /** When the package was last modified */
  modifiedAt: string;
  /** Author name or identifier */
  author?: string;
  /** Package description (can differ from game description) */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Thumbnail image as base64 data URL */
  thumbnail?: string;
  /** PromptPlay version used to create this package */
  engineVersion?: string;
}

export interface EmbeddedAsset {
  /** Asset filename (e.g., "player.png") */
  name: string;
  /** Asset type */
  type: 'image' | 'audio' | 'spritesheet' | 'other';
  /** MIME type (e.g., "image/png") */
  mimeType: string;
  /** Base64 encoded data */
  data: string;
  /** Original file size in bytes */
  size?: number;
}

export interface ChatMessage {
  /** Message role */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: string;
}
