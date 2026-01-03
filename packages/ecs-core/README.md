# @promptplay/ecs-core

> High-performance Entity Component System (ECS) for PromptPlay game engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![bitecs](https://img.shields.io/badge/bitecs-0.3-green.svg)](https://github.com/NateTheGreatt/bitecs)

## Overview

The ECS Core package provides the foundation for PromptPlay's game logic. Built on [bitecs](https://github.com/NateTheGreatt/bitecs), it offers:

- **12 Built-in Components** - Transform, Sprite, Collider, Input, Health, AIBehavior, Animation, Audio, Camera, ParticleEmitter, Velocity
- **GameWorld Management** - Entity creation, system orchestration, tag-based queries
- **JSON Serialization** - Save and load game state with Serializer/Deserializer
- **High Performance** - Uses typed arrays for cache-friendly data layout

## Installation

```bash
pnpm add @promptplay/ecs-core
```

## Quick Start

```typescript
import {
  GameWorld,
  Transform,
  Sprite,
  Velocity,
  Serializer,
  Deserializer
} from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';

// Create a world
const world = new GameWorld();

// Create an entity
const player = world.createEntity('player');

// Add components
addComponent(world.getWorld(), Transform, player);
Transform.x[player] = 100;
Transform.y[player] = 200;

addComponent(world.getWorld(), Sprite, player);
Sprite.width[player] = 32;
Sprite.height[player] = 32;

// Add tags for queries
world.addTag(player, 'player');
world.addTag(player, 'controllable');

// Query by tag
const players = world.getEntitiesByTag('player');
```

## Components

### Transform
Position and orientation in 2D space.

| Property | Type | Description |
|----------|------|-------------|
| `x` | f32 | X position in pixels |
| `y` | f32 | Y position in pixels |
| `rotation` | f32 | Rotation in radians |
| `scaleX` | f32 | Horizontal scale (1 = 100%) |
| `scaleY` | f32 | Vertical scale (1 = 100%) |

### Velocity
Movement speed for physics-enabled entities.

| Property | Type | Description |
|----------|------|-------------|
| `vx` | f32 | Horizontal velocity (pixels/second) |
| `vy` | f32 | Vertical velocity (pixels/second) |

### Sprite
Visual appearance and rendering properties.

| Property | Type | Description |
|----------|------|-------------|
| `textureId` | ui16 | Texture registry ID |
| `width` | f32 | Display width in pixels |
| `height` | f32 | Display height in pixels |
| `tint` | ui32 | Color tint (0xRRGGBBAA) |
| `visible` | ui8 | Visibility flag (0/1) |
| `zIndex` | i16 | Render order (higher = on top) |
| `flipX` | ui8 | Horizontal flip (0/1) |
| `flipY` | ui8 | Vertical flip (0/1) |

### Collider
Physics collision shape.

| Property | Type | Description |
|----------|------|-------------|
| `type` | ui8 | Shape type (0=box, 1=circle) |
| `width` | f32 | Box width |
| `height` | f32 | Box height |
| `radius` | f32 | Circle radius |
| `isSensor` | ui8 | Trigger only, no physical response |
| `layer` | ui8 | Collision layer for filtering |

### Input
Player control configuration.

| Property | Type | Description |
|----------|------|-------------|
| `moveSpeed` | f32 | Movement speed (pixels/second) |
| `jumpForce` | f32 | Jump impulse strength |
| `canJump` | ui8 | Jump allowed flag |

### Health
Damage and health tracking.

| Property | Type | Description |
|----------|------|-------------|
| `current` | f32 | Current health points |
| `max` | f32 | Maximum health points |

### AIBehavior
Enemy AI patterns.

| Property | Type | Description |
|----------|------|-------------|
| `type` | ui8 | Behavior type (0=patrol, 1=chase, 2=flee) |
| `speed` | f32 | Movement speed |
| `detectionRadius` | f32 | Player detection range |
| `targetEntity` | ui32 | Entity ID to target |
| `patrolRange` | f32 | Patrol distance |

### Animation
Sprite animation control.

| Property | Type | Description |
|----------|------|-------------|
| `currentFrame` | ui16 | Current frame index |
| `frameCount` | ui16 | Total frames |
| `frameDuration` | f32 | Milliseconds per frame |
| `elapsed` | f32 | Time since last frame |
| `isPlaying` | ui8 | Playing flag |
| `loop` | ui8 | Loop animation |
| `animationId` | ui16 | Animation identifier |

### Camera
View and camera effects.

| Property | Type | Description |
|----------|------|-------------|
| `offsetX` | f32 | Camera offset X |
| `offsetY` | f32 | Camera offset Y |
| `zoom` | f32 | Zoom level (1 = 100%) |
| `followTarget` | ui32 | Entity to follow |
| `followSmoothing` | f32 | Follow interpolation (0-1) |
| `shakeIntensity` | f32 | Screen shake amount |
| `shakeDuration` | f32 | Shake time remaining |
| `isActive` | ui8 | Active camera flag |

### ParticleEmitter
Particle effect configuration.

| Property | Type | Description |
|----------|------|-------------|
| `emitRate` | f32 | Particles per second |
| `maxParticles` | ui16 | Maximum particle count |
| `minLifetime` | f32 | Minimum particle life |
| `maxLifetime` | f32 | Maximum particle life |
| `minSize` | f32 | Minimum particle size |
| `maxSize` | f32 | Maximum particle size |
| `isEmitting` | ui8 | Emission active flag |

### Audio
Sound playback.

| Property | Type | Description |
|----------|------|-------------|
| `sourceId` | ui16 | Audio registry ID |
| `volume` | f32 | Volume (0-1) |
| `pitch` | f32 | Pitch multiplier |
| `isPlaying` | ui8 | Playing flag |
| `loop` | ui8 | Loop playback |
| `spatial` | ui8 | 3D spatial audio |

## GameWorld API

### Entity Management

```typescript
// Create entity with optional name
const eid = world.createEntity('player');

// Destroy entity
world.destroyEntity(eid);

// Get entity name
const name = world.getEntityName(eid); // 'player'

// Find entity by name
const playerId = world.getEntityIdByName('player');

// Get all entities
const all = world.getEntities();
```

### Tag System

```typescript
// Add tags
world.addTag(eid, 'enemy');
world.addTag(eid, 'flying');

// Remove tags
world.removeTag(eid, 'flying');

// Check tag
const isEnemy = world.hasTag(eid, 'enemy');

// Query by tag
const enemies = world.getEntitiesByTag('enemy');

// Get all tags for entity
const tags = world.getTags(eid); // ['enemy']
```

### System Management

```typescript
import { ISystem } from '@promptplay/shared-types';

// Create custom system
class GravitySystem implements ISystem {
  init(world: GameWorld): void {
    console.log('Gravity initialized');
  }

  update(world: GameWorld, deltaTime: number): void {
    const entities = world.query([Transform, Velocity]);
    for (const eid of entities) {
      Velocity.vy[eid] += 9.8 * deltaTime;
    }
  }

  cleanup(world: GameWorld): void {
    console.log('Gravity cleaned up');
  }
}

// Add system
world.addSystem(new GravitySystem());

// Update all systems
world.update(deltaTime);

// Remove system
world.removeSystem(gravitySystem);
```

### Texture & Audio Registry

```typescript
// Register textures (returns ID for component storage)
const playerId = world.getTextureId('player.png');
const enemyId = world.getTextureId('enemy.png');

// Get name from ID
const name = world.getTextureName(playerId); // 'player.png'

// Same for audio
const jumpSoundId = world.getAudioId('jump.wav');
```

## Serialization

### Saving Game State

```typescript
import { Serializer } from '@promptplay/ecs-core';
import type { GameSpec } from '@promptplay/shared-types';

// Serialize world to GameSpec
const spec: GameSpec = Serializer.serialize(world);

// Save to JSON
const json = JSON.stringify(spec, null, 2);
```

### Loading Game State

```typescript
import { Deserializer } from '@promptplay/ecs-core';

// Load from JSON
const spec: GameSpec = JSON.parse(jsonString);

// Deserialize into world
Deserializer.deserialize(world, spec);
```

## Creating Custom Components

```typescript
import { defineComponent, Types } from 'bitecs';

// Define a custom component
export const Inventory = defineComponent({
  capacity: Types.ui8,
  itemCount: Types.ui8,
  gold: Types.ui32,
});

// Use it
addComponent(world.getWorld(), Inventory, entity);
Inventory.capacity[entity] = 10;
Inventory.gold[entity] = 100;
```

## Performance Tips

1. **Use Queries** - Cache query results when possible
2. **Batch Operations** - Modify multiple entities in one system update
3. **Component Design** - Keep components small and focused
4. **Avoid Allocations** - Reuse objects instead of creating new ones

## Architecture

```
ecs-core/
├── src/
│   ├── components/      # 12 built-in components
│   │   ├── Transform.ts
│   │   ├── Velocity.ts
│   │   ├── Sprite.ts
│   │   ├── Collider.ts
│   │   ├── Input.ts
│   │   ├── Health.ts
│   │   ├── AIBehavior.ts
│   │   ├── Animation.ts
│   │   ├── Audio.ts
│   │   ├── Camera.ts
│   │   └── Particle.ts
│   ├── world/
│   │   └── World.ts     # GameWorld class
│   ├── serialization/
│   │   ├── Serializer.ts
│   │   └── Deserializer.ts
│   └── index.ts
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.
