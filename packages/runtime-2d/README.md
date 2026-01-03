# @promptplay/runtime-2d

> 2D Game Runtime for PromptPlay - Canvas2D rendering with Matter.js physics

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.19-orange.svg)](https://brm.io/matter-js/)
[![Test Coverage](https://img.shields.io/badge/Coverage-80%25+-brightgreen.svg)](tests/)

## Overview

The Runtime2D package provides a complete 2D game engine built on PromptPlay's ECS architecture:

- **Canvas2D Rendering** - Fast, compatible, no WebGL required
- **Matter.js Physics** - Full 2D physics simulation with collision detection
- **Built-in Systems** - Input, Animation, AI, Camera, Particles, Collision Events
- **Game Loop** - Fixed timestep with interpolation, pause/resume support
- **Debug Overlay** - FPS, entity count, collider visualization

## Installation

```bash
pnpm add @promptplay/runtime-2d
```

## Quick Start

```typescript
import { Runtime2D } from '@promptplay/runtime-2d';
import type { GameSpec } from '@promptplay/shared-types';

// Get canvas element
const canvas = document.getElementById('game') as HTMLCanvasElement;

// Create runtime
const runtime = new Runtime2D(canvas, {
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
  showDebug: true,
});

// Load game specification
const gameSpec: GameSpec = {
  version: '1.0',
  metadata: {
    title: 'My Game',
    genre: 'platformer',
    description: 'A simple platformer',
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
        collider: { type: 'box', width: 32, height: 32 },
        input: { moveSpeed: 200, jumpForce: 400, canJump: true },
      },
      tags: ['player'],
    },
  ],
  systems: ['physics', 'input', 'collision', 'render'],
};

// Load and start
await runtime.loadGameSpec(gameSpec);
runtime.start();
```

## Configuration

```typescript
interface Runtime2DConfig {
  width?: number;         // Canvas width (default: 800)
  height?: number;        // Canvas height (default: 600)
  backgroundColor?: number; // Background color (default: 0x1a1a2e)
  enableAI?: boolean;     // Enable AI behavior system (default: true)
  enableAnimations?: boolean; // Enable animation system (default: true)
  enableCamera?: boolean; // Enable camera system (default: true)
  enableParticles?: boolean; // Enable particle system (default: true)
  showDebug?: boolean;    // Show debug overlay (default: false)
}
```

## Runtime API

### Lifecycle Control

```typescript
// Load a game specification
await runtime.loadGameSpec(gameSpec);

// Start the game loop
runtime.start();

// Pause/Resume
runtime.pause();
runtime.resume();

// Stop completely
runtime.stop();

// Check state
runtime.isRunning(); // true/false
runtime.isPaused();  // true/false

// Clean up resources
runtime.destroy();
```

### Camera Control

```typescript
// Get camera system
const camera = runtime.getCameraSystem();

// Set camera position
runtime.setCameraPosition(400, 300);

// Set zoom level (1 = 100%)
runtime.setZoom(1.5);

// Screen shake effect
runtime.shakeCamera(10, 500); // intensity, duration(ms)

// Fit camera to show all entities
const bounds = runtime.fitCameraToEntities();
// Returns: { x, y, zoom } or null if no entities
```

### Particle Effects

```typescript
// Get particle system
const particles = runtime.getParticleSystem();

// Emit burst of particles
runtime.emitParticles(x, y, count, {
  minLifetime: 0.5,
  maxLifetime: 1.5,
  minSize: 2,
  maxSize: 8,
  startColor: 0xff6600ff,
  endColor: 0xff000000,
  gravityY: 200,
});
```

### Collision Events

```typescript
// Get collision system
const collisions = runtime.getCollisionSystem();

// Add collision rule between tagged entities
runtime.onTagCollision('player', 'coin', (playerEid, coinEid) => {
  console.log('Player collected coin!');
  world.destroyEntity(coinEid);
});

runtime.onTagCollision('player', 'enemy', (playerEid, enemyEid) => {
  console.log('Player hit enemy!');
  Health.current[playerEid] -= 10;
});
```

### Entity Queries

```typescript
// Get entity at screen position
const entityName = runtime.getEntityAtPoint(mouseX, mouseY);

// Get entity bounds
const bounds = runtime.getEntityBounds('player');
// Returns: { x, y, width, height } or null
```

### Debug Features

```typescript
// Toggle debug overlay
runtime.toggleDebug();

// Check if debug is enabled
runtime.isDebugEnabled();

// Get current FPS
runtime.getFps();
```

### Direct Access

```typescript
// Access ECS world directly
const world = runtime.getWorld();

// Access physics engine
const physics = runtime.getPhysics();

// Access input manager
const input = runtime.getInput();

// Get loaded game spec
const spec = runtime.getGameSpec();
```

## Built-in Systems

### InputSystem
Handles keyboard input for player-controlled entities.

```typescript
// Default controls:
// Arrow keys or WASD for movement
// Space for jump

// Custom key bindings via Input component:
{
  input: {
    moveSpeed: 200,
    jumpForce: 400,
    keys: {
      left: 'KeyA',
      right: 'KeyD',
      jump: 'Space'
    }
  }
}
```

### AnimationSystem
Advances sprite animations based on frame timing.

```typescript
// Animation component configuration:
{
  animation: {
    currentFrame: 0,
    frameCount: 8,
    frameDuration: 100, // ms per frame
    loop: true,
    isPlaying: true,
    spriteSheet: 'player-walk.png',
    frameWidth: 32,
    frameHeight: 32,
    states: [
      { name: 'idle', frameStart: 0, frameEnd: 3, frameDuration: 150, loop: true },
      { name: 'walk', frameStart: 4, frameEnd: 11, frameDuration: 80, loop: true },
      { name: 'jump', frameStart: 12, frameEnd: 15, frameDuration: 100, loop: false }
    ]
  }
}
```

### AIBehaviorSystem
Handles enemy AI patterns.

```typescript
// Patrol: Move back and forth
{
  aiBehavior: {
    type: 'patrol',
    speed: 100,
    patrolRange: 200
  }
}

// Chase: Follow player when in range
{
  aiBehavior: {
    type: 'chase',
    speed: 150,
    detectionRadius: 200
  }
}

// Flee: Run away from player
{
  aiBehavior: {
    type: 'flee',
    speed: 180,
    detectionRadius: 150
  }
}
```

### CameraSystem
Manages viewport, following, and effects.

```typescript
{
  camera: {
    isActive: true,
    followTarget: playerEntityId,
    followSmoothing: 0.1,
    zoom: 1,
    offsetX: 0,
    offsetY: -50 // Camera offset above player
  }
}
```

### ParticleSystem
Manages particle lifecycle and emission.

```typescript
{
  particleEmitter: {
    isEmitting: true,
    emitRate: 50,
    maxParticles: 200,
    minLifetime: 0.5,
    maxLifetime: 2,
    minSize: 2,
    maxSize: 6,
    minSpeed: 50,
    maxSpeed: 150,
    startColor: 0xffcc00ff,
    endColor: 0xff000000,
    gravityY: 100
  }
}
```

### CollisionEventSystem
Fires callbacks when tagged entities collide.

## Physics (Matter.js)

### Creating Bodies

Physics bodies are automatically created for entities with both `Transform` and `Collider` components.

```typescript
// Box collider
{
  collider: {
    type: 'box',
    width: 32,
    height: 32
  }
}

// Circle collider
{
  collider: {
    type: 'circle',
    radius: 16
  }
}

// Sensor (trigger zone - no physical response)
{
  collider: {
    type: 'box',
    width: 64,
    height: 64,
    isSensor: true
  }
}

// Static body (immovable)
// Add 'static' tag to entity
{
  tags: ['static', 'platform']
}
```

### Physics API

```typescript
const physics = runtime.getPhysics();

// Set gravity
physics.setGravity(0, 1.5);

// Get body for entity
const body = physics.getBody(entityId);

// Apply force
physics.applyForce(entityId, { x: 100, y: -500 });

// Check if entity is on ground
const grounded = physics.isGrounded(entityId);
```

## Rendering

The Canvas2D renderer provides:

- **Sprite rendering** with texture atlas support
- **Z-index sorting** for proper layering
- **Color tinting** for dynamic effects
- **Camera transforms** (pan, zoom, shake)
- **Particle rendering** with color interpolation
- **Debug overlay** with collider visualization

### Texture Loading

Textures are loaded automatically when referenced in sprite components. The renderer maintains a texture cache for performance.

```typescript
// Textures are referenced by name in sprite component
{
  sprite: {
    texture: 'player.png', // Loaded from assets folder
    width: 32,
    height: 32
  }
}
```

## Architecture

```
runtime-2d/
├── src/
│   ├── Runtime2D.ts          # Main orchestrator
│   ├── renderers/
│   │   ├── Canvas2DRenderer.ts
│   │   └── PixiRenderer.ts   # Alternative WebGL renderer
│   ├── physics/
│   │   └── MatterPhysics.ts  # Matter.js wrapper
│   ├── input/
│   │   └── InputManager.ts   # Keyboard/mouse handling
│   ├── gameloop/
│   │   └── GameLoop.ts       # Fixed timestep loop
│   └── systems/
│       ├── InputSystem.ts
│       ├── AnimationSystem.ts
│       ├── AIBehaviorSystem.ts
│       ├── CameraSystem.ts
│       ├── ParticleSystem.ts
│       ├── CollisionEventSystem.ts
│       └── AudioSystem.ts
├── tests/                    # 284+ tests, 80%+ coverage
│   ├── Runtime2D.test.ts
│   ├── systems/*.test.ts
│   └── physics/*.test.ts
└── index.ts
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

## Performance

- **60 FPS target** with fixed timestep physics
- **Efficient batch rendering** for sprites
- **Spatial partitioning** in Matter.js for collision
- **Object pooling** for particles

## Examples

### Platformer Setup

```typescript
const platformerSpec: GameSpec = {
  version: '1.0',
  metadata: { title: 'Platformer', genre: 'platformer', description: '' },
  config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
  entities: [
    {
      name: 'player',
      components: {
        transform: { x: 100, y: 400 },
        sprite: { texture: 'player', width: 32, height: 48 },
        collider: { type: 'box', width: 32, height: 48 },
        input: { moveSpeed: 200, jumpForce: 400, canJump: true },
        health: { current: 100, max: 100 },
      },
      tags: ['player'],
    },
    {
      name: 'ground',
      components: {
        transform: { x: 400, y: 580 },
        sprite: { texture: 'ground', width: 800, height: 40 },
        collider: { type: 'box', width: 800, height: 40 },
      },
      tags: ['static', 'platform'],
    },
  ],
  systems: ['physics', 'input', 'collision', 'render'],
};
```

### Top-Down Shooter

```typescript
const shooterSpec: GameSpec = {
  version: '1.0',
  metadata: { title: 'Shooter', genre: 'shooter', description: '' },
  config: { gravity: { x: 0, y: 0 }, worldBounds: { width: 800, height: 600 } },
  entities: [
    {
      name: 'player',
      components: {
        transform: { x: 400, y: 300 },
        sprite: { texture: 'ship', width: 48, height: 48 },
        collider: { type: 'circle', radius: 20 },
        input: { moveSpeed: 300, jumpForce: 0 },
        health: { current: 3, max: 3 },
      },
      tags: ['player'],
    },
  ],
  systems: ['physics', 'input', 'collision', 'render'],
};
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.
