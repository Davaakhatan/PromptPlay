# @promptplay/shared-types

> TypeScript Type Definitions for PromptPlay Game Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## Overview

This package contains all shared TypeScript type definitions used across PromptPlay packages:

- **GameSpec Types** - Game specification, entities, components
- **ECS Types** - System interface, entity IDs, component types
- **API Types** - AI chat, file system, export interfaces
- **Scene Types** - Multi-scene support, scene configuration
- **Prefab Types** - Reusable entity templates

## Installation

```bash
pnpm add @promptplay/shared-types
```

## Usage

```typescript
import type {
  GameSpec,
  EntitySpec,
  TransformComponent,
  SpriteComponent,
  ISystem,
  Prefab,
  SceneSpec,
} from '@promptplay/shared-types';
```

## Type Reference

### GameSpec

The root type for game definitions.

```typescript
interface GameSpec {
  version: string;                    // Schema version (e.g., "1.0")
  metadata: GameMetadata;             // Title, genre, description
  config: GameConfig;                 // Physics, world settings
  entities: EntitySpec[];             // Entity definitions
  scenes?: SceneSpec[];               // Multi-scene support
  activeScene?: string;               // Current scene ID
  systems: string[];                  // Active system names
  settings?: GameSettings;            // Additional settings
}
```

### GameMetadata

```typescript
interface GameMetadata {
  title: string;
  name?: string;
  genre: 'platformer' | 'shooter' | 'puzzle';
  description: string;
}
```

### GameConfig

```typescript
interface GameConfig {
  gravity: { x: number; y: number };
  worldBounds: { width: number; height: number };
}
```

### EntitySpec

```typescript
interface EntitySpec {
  name: string;                       // Unique entity identifier
  components: EntityComponents;       // Component data
  tags?: string[];                    // Tags for queries
}

interface EntityComponents {
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
```

## Component Types

### TransformComponent

```typescript
interface TransformComponent {
  x: number;
  y: number;
  rotation?: number;      // Radians
  scaleX?: number;        // Default: 1
  scaleY?: number;        // Default: 1
}
```

### VelocityComponent

```typescript
interface VelocityComponent {
  vx: number;             // Pixels per second
  vy: number;
}
```

### SpriteComponent

```typescript
interface SpriteComponent {
  texture: string;        // Texture name or path
  width: number;
  height: number;
  tint?: string | number; // Color tint ("#RRGGBBAA" or 0xRRGGBBAA)
  visible?: boolean;      // Default: true
  zIndex?: number;        // Render order
  // Sprite sheet support
  frameX?: number;
  frameY?: number;
  frameWidth?: number;
  frameHeight?: number;
  // Anchor (0-1)
  anchorX?: number;
  anchorY?: number;
  // Flip
  flipX?: boolean;
  flipY?: boolean;
}
```

### ColliderComponent

```typescript
interface ColliderComponent {
  type: 'box' | 'circle';
  width?: number;         // For box
  height?: number;        // For box
  radius?: number;        // For circle
  isSensor?: boolean;     // Trigger only, no physics
  layer?: number;         // Collision layer
}
```

### InputComponent

```typescript
interface InputComponent {
  moveSpeed: number;      // Movement speed
  jumpForce: number;      // Jump impulse
  canJump?: boolean;      // Jump enabled
  keys?: {
    left?: string;        // Key code (e.g., "KeyA")
    right?: string;
    jump?: string;
  };
}
```

### HealthComponent

```typescript
interface HealthComponent {
  current: number;
  max: number;
}
```

### AIBehaviorComponent

```typescript
interface AIBehaviorComponent {
  type: 'patrol' | 'chase' | 'flee';
  speed: number;
  detectionRadius: number;
  targetEntity?: number;  // Entity ID to target
  patrolRange?: number;   // For patrol behavior
}
```

### AnimationComponent

```typescript
interface AnimationComponent {
  currentFrame?: number;
  frameCount: number;
  frameDuration: number;  // Milliseconds
  isPlaying?: boolean;
  loop?: boolean;
  animationId?: number;
  // Sprite sheet
  spriteSheet?: string;
  frameWidth?: number;
  frameHeight?: number;
  // State machine
  currentState?: string;
  states?: AnimationState[];
}

interface AnimationState {
  name: string;
  frameStart: number;
  frameEnd: number;
  frameDuration: number;
  loop: boolean;
  transitions?: AnimationTransition[];
}

interface AnimationTransition {
  to: string;             // Target state name
  condition: AnimationCondition;
}

interface AnimationCondition {
  type: 'immediate' | 'onComplete' | 'parameter';
  parameter?: string;
  comparator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value?: string | number | boolean;
}
```

### CameraComponent

```typescript
interface CameraComponent {
  offsetX?: number;
  offsetY?: number;
  zoom?: number;          // 1 = 100%
  followTarget?: number;  // Entity ID to follow
  followSmoothing?: number; // 0-1 interpolation
  viewportWidth?: number;
  viewportHeight?: number;
  shakeIntensity?: number;
  shakeDuration?: number;
  isActive?: boolean;
}
```

### ParticleEmitterComponent

```typescript
interface ParticleEmitterComponent {
  emitRate?: number;      // Particles per second
  maxParticles?: number;
  minLifetime?: number;
  maxLifetime?: number;
  minSize?: number;
  maxSize?: number;
  minSpeed?: number;
  maxSpeed?: number;
  minAngle?: number;      // Radians
  maxAngle?: number;
  startColor?: number | string;
  endColor?: number | string;
  gravityX?: number;
  gravityY?: number;
  isEmitting?: boolean;
  burstCount?: number;
}
```

### AudioComponent

```typescript
interface AudioComponent {
  source: string;         // Audio file path
  volume?: number;        // 0-1
  pitch?: number;         // Playback speed
  isPlaying?: boolean;
  loop?: boolean;
  spatial?: boolean;      // 3D audio
  maxDistance?: number;
}
```

## Scene Types

### SceneSpec

```typescript
interface SceneSpec {
  id: string;
  name: string;
  entities: EntitySpec[];
  config?: SceneConfig;
}

interface SceneConfig {
  gravity?: { x: number; y: number };
  worldBounds?: { width: number; height: number };
  backgroundColor?: string;
}
```

## Prefab Types

### Prefab

```typescript
type PrefabCategory =
  | 'player'
  | 'enemy'
  | 'platform'
  | 'collectible'
  | 'projectile'
  | 'effect'
  | 'ui'
  | 'custom';

interface Prefab {
  id: string;
  name: string;
  description?: string;
  category: PrefabCategory;
  icon?: string;          // Icon identifier or emoji
  entity: Omit<EntitySpec, 'name'>; // Template without name
  isBuiltIn?: boolean;
}
```

## ECS Types

### ISystem

```typescript
interface ISystem {
  init(world: any): void;
  update(world: any, deltaTime: number): void;
  cleanup?(world: any): void;
}
```

### ComponentType

```typescript
enum ComponentType {
  Transform,
  Velocity,
  Sprite,
  Collider,
  Input,
  Health,
  AIBehavior,
}
```

### EntityId

```typescript
type EntityId = number;
```

## API Types

See [APITypes.ts](src/APITypes.ts) for:

- `AIMessage` - Chat message structure
- `AIResponse` - AI response format
- `FileSystemAPI` - File operations interface
- `ExportOptions` - HTML/Desktop export settings

## Architecture

```
shared-types/
├── src/
│   ├── index.ts          # Re-exports all types
│   ├── ECSTypes.ts       # ISystem, ComponentType, EntityId
│   ├── GameTypes.ts      # GameSpec, EntitySpec, Components
│   └── APITypes.ts       # AI, FileSystem, Export interfaces
└── package.json
```

## Usage Examples

### Creating a Game Spec

```typescript
import type { GameSpec } from '@promptplay/shared-types';

const myGame: GameSpec = {
  version: '1.0',
  metadata: {
    title: 'My Game',
    genre: 'platformer',
    description: 'A fun platformer',
  },
  config: {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 },
  },
  entities: [
    {
      name: 'player',
      components: {
        transform: { x: 100, y: 300 },
        sprite: { texture: 'player', width: 32, height: 32 },
        input: { moveSpeed: 200, jumpForce: 400 },
      },
      tags: ['player'],
    },
  ],
  systems: ['physics', 'input', 'render'],
};
```

### Implementing a System

```typescript
import type { ISystem } from '@promptplay/shared-types';

class MySystem implements ISystem {
  init(world: any): void {
    console.log('System initialized');
  }

  update(world: any, deltaTime: number): void {
    // Update logic
  }

  cleanup(world: any): void {
    console.log('System cleaned up');
  }
}
```

### Creating a Prefab

```typescript
import type { Prefab } from '@promptplay/shared-types';

const enemyPrefab: Prefab = {
  id: 'enemy-basic',
  name: 'Basic Enemy',
  description: 'A patrolling enemy',
  category: 'enemy',
  icon: '👾',
  entity: {
    components: {
      transform: { x: 0, y: 0 },
      sprite: { texture: 'enemy', width: 32, height: 32, tint: '#ff0000ff' },
      collider: { type: 'box', width: 32, height: 32 },
      health: { current: 50, max: 50 },
      aiBehavior: { type: 'patrol', speed: 100, detectionRadius: 150 },
    },
    tags: ['enemy'],
  },
  isBuiltIn: true,
};
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.
