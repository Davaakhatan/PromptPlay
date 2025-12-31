# PromptPlay API Reference

## Overview

This document provides a comprehensive API reference for PromptPlay's packages. Use this guide to understand the available classes, methods, and interfaces for building or extending games.

---

## Table of Contents

1. [Shared Types](#shared-types)
2. [ECS Core](#ecs-core)
3. [Runtime 2D](#runtime-2d)
4. [AI Prompt](#ai-prompt)
5. [Editor API Routes](#editor-api-routes)

---

## Shared Types

Package: `@promptplay/shared-types`

### GameSpec

The root interface for game specifications.

```typescript
interface GameSpec {
  version: string;
  metadata: GameMetadata;
  config: GameConfig;
  entities: EntitySpec[];
  systems: string[];
}
```

**Properties:**
- `version` - Spec format version (currently "1.0")
- `metadata` - Game information (title, genre, description)
- `config` - Game configuration (gravity, world bounds)
- `entities` - Array of entity definitions
- `systems` - Array of system names to activate

---

### GameMetadata

```typescript
interface GameMetadata {
  title: string;
  genre: 'platformer' | 'shooter' | 'puzzle';
  description: string;
}
```

**Properties:**
- `title` - Display name of the game
- `genre` - Game type for AI generation and UI
- `description` - Brief game description

---

### GameConfig

```typescript
interface GameConfig {
  gravity: Vector;
  worldBounds: Bounds;
}

interface Vector {
  x: number;
  y: number;
}

interface Bounds {
  width: number;
  height: number;
}
```

**Properties:**
- `gravity` - World gravity vector (x: horizontal, y: vertical)
- `worldBounds` - Game world size in pixels

---

### EntitySpec

```typescript
interface EntitySpec {
  name: string;
  components: Record<string, ComponentData>;
  tags: string[];
}
```

**Properties:**
- `name` - Unique identifier for the entity
- `components` - Map of component name to component data
- `tags` - Array of tags for entity queries

---

### Component Interfaces

#### TransformData

```typescript
interface TransformData {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
```

#### VelocityData

```typescript
interface VelocityData {
  vx: number;
  vy: number;
}
```

#### SpriteData

```typescript
interface SpriteData {
  texture: string;
  width: number;
  height: number;
  tint?: string | number;  // Hex color or number
  visible?: boolean;
  zIndex?: number;         // Render order (higher = front)
  // Sprite sheet support
  frameX?: number;         // Frame X position in sheet
  frameY?: number;         // Frame Y position in sheet
  frameWidth?: number;     // Frame width (0 = full texture)
  frameHeight?: number;    // Frame height (0 = full texture)
  // Anchor point (0-1, default 0.5 = center)
  anchorX?: number;
  anchorY?: number;
  // Flip support
  flipX?: boolean;
  flipY?: boolean;
}
```

#### ColliderData

```typescript
interface ColliderData {
  type: 'box' | 'circle';
  width?: number;  // For box colliders
  height?: number; // For box colliders
  radius?: number; // For circle colliders
  isSensor?: boolean;
  layer?: number;
}
```

#### InputData

```typescript
interface InputData {
  moveSpeed: number;
  jumpForce: number;
}
```

#### HealthData

```typescript
interface HealthData {
  current: number;
  max: number;
}
```

#### AIBehaviorData

```typescript
interface AIBehaviorData {
  behaviorType: 'chase' | 'patrol' | 'idle';
  targetEntity?: number;
  detectionRadius?: number;
  speed: number;
}
```

#### AnimationData

```typescript
interface AnimationData {
  currentFrame?: number;
  frameCount: number;
  frameDuration: number;  // Duration per frame in ms
  isPlaying?: boolean;
  loop?: boolean;
  animationId?: number;
}
```

#### CameraData

```typescript
interface CameraData {
  offsetX?: number;
  offsetY?: number;
  zoom?: number;              // Default: 1
  followTarget?: number;      // Entity ID to follow
  followSmoothing?: number;   // Lerp factor (0-1)
  viewportWidth?: number;
  viewportHeight?: number;
  shakeIntensity?: number;    // Shake amount in pixels
  shakeDuration?: number;     // Shake duration in ms
  isActive?: boolean;
}
```

#### ParticleEmitterData

```typescript
interface ParticleEmitterData {
  emitRate?: number;          // Particles per second
  maxParticles?: number;
  minLifetime?: number;       // Seconds
  maxLifetime?: number;
  minSize?: number;
  maxSize?: number;
  minSpeed?: number;
  maxSpeed?: number;
  minAngle?: number;          // Radians
  maxAngle?: number;
  startColor?: number | string;
  endColor?: number | string;
  gravityX?: number;
  gravityY?: number;
  isEmitting?: boolean;
  burstCount?: number;        // Particles per burst
}
```

#### AudioData

```typescript
interface AudioData {
  source: string;             // Audio file name
  volume?: number;            // 0.0 to 1.0
  pitch?: number;             // Playback rate multiplier
  isPlaying?: boolean;
  loop?: boolean;
  spatial?: boolean;          // 3D positioned audio
  maxDistance?: number;       // Max hearing distance
}
```

---

### ISystem

```typescript
interface ISystem {
  init(world: any): void;
  update(world: any, deltaTime: number): void;
}
```

**Methods:**
- `init(world)` - Called once when system is registered
- `update(world, deltaTime)` - Called every frame with delta time in seconds

---

## ECS Core

Package: `@promptplay/ecs-core`

### World

Main class for managing entities, components, and systems.

#### Constructor

```typescript
constructor()
```

Creates a new ECS world instance.

**Example:**
```typescript
import { World } from '@promptplay/ecs-core';

const world = new World();
```

---

#### Methods

##### `createEntity(): number`

Creates a new entity and returns its ID.

**Returns:** `number` - The entity ID

**Example:**
```typescript
const playerId = world.createEntity();
```

---

##### `destroyEntity(eid: number): void`

Destroys an entity and removes all its components.

**Parameters:**
- `eid` - Entity ID to destroy

**Example:**
```typescript
world.destroyEntity(playerId);
```

---

##### `addTag(eid: number, tag: string): void`

Adds a tag to an entity for queries.

**Parameters:**
- `eid` - Entity ID
- `tag` - Tag name (e.g., "player", "enemy", "collectible")

**Example:**
```typescript
world.addTag(playerId, 'player');
```

---

##### `removeTag(eid: number, tag: string): void`

Removes a tag from an entity.

**Parameters:**
- `eid` - Entity ID
- `tag` - Tag name to remove

**Example:**
```typescript
world.removeTag(enemyId, 'active');
```

---

##### `getEntitiesByTag(tag: string): number[]`

Retrieves all entities with a specific tag.

**Parameters:**
- `tag` - Tag to search for

**Returns:** `number[]` - Array of entity IDs

**Example:**
```typescript
const enemies = world.getEntitiesByTag('enemy');
enemies.forEach(eid => {
  // Process each enemy
});
```

---

##### `registerSystem(system: ISystem): void`

Registers a system to be updated each frame.

**Parameters:**
- `system` - System instance implementing ISystem

**Example:**
```typescript
import { PhysicsSystem } from '@promptplay/ecs-core';

const physicsSystem = new PhysicsSystem();
world.registerSystem(physicsSystem);
```

---

##### `update(deltaTime: number): void`

Updates all registered systems.

**Parameters:**
- `deltaTime` - Time elapsed since last frame (in seconds)

**Example:**
```typescript
function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  world.update(deltaTime);
  requestAnimationFrame(gameLoop);
}
```

---

##### `registerTexture(name: string, url: string): void`

Registers a texture for sprite rendering.

**Parameters:**
- `name` - Texture identifier
- `url` - Path to texture image

**Example:**
```typescript
world.registerTexture('player', '/sprites/player.png');
```

---

### Components

All components are defined using bitecs `defineComponent`.

#### Accessing Components

```typescript
import {
  Transform,
  Velocity,
  Sprite,
  Collider,
  Input,
  Health,
  AIBehavior,
  Animation,
  Camera,
  ParticleEmitter,
  Audio
} from '@promptplay/ecs-core';

// Get transform data for an entity
const x = Transform.x[eid];
const y = Transform.y[eid];

// Set velocity
Velocity.vx[eid] = 5;
Velocity.vy[eid] = -10;

// Check if entity has a component
import { hasComponent } from 'bitecs';
if (hasComponent(world, Input, eid)) {
  // Entity has input component
}
```

---

### Deserializer

Converts GameSpec JSON into ECS entities.

#### `loadGameSpec(world: World, spec: GameSpec): void`

**Parameters:**
- `world` - Target ECS world
- `spec` - Game specification to load

**Example:**
```typescript
import { Deserializer } from '@promptplay/ecs-core';
import { World } from '@promptplay/ecs-core';

const world = new World();
const deserializer = new Deserializer();
deserializer.loadGameSpec(world, gameSpec);
```

---

### Serializer

Converts ECS world into GameSpec JSON.

#### `saveGameSpec(world: World): GameSpec`

**Parameters:**
- `world` - Source ECS world

**Returns:** `GameSpec` - JSON game specification

**Example:**
```typescript
import { Serializer } from '@promptplay/ecs-core';

const serializer = new Serializer();
const spec = serializer.saveGameSpec(world);
console.log(JSON.stringify(spec, null, 2));
```

---

## Runtime 2D

Package: `@promptplay/runtime-2d`

### Runtime2D

Main runtime class for rendering and simulating 2D games.

#### Constructor

```typescript
constructor(canvas: HTMLCanvasElement, options: RuntimeOptions)

interface RuntimeOptions {
  width: number;
  height: number;
  backgroundColor?: number; // Hex color: 0xRRGGBB
}
```

**Parameters:**
- `canvas` - HTML canvas element for rendering
- `options` - Runtime configuration

**Example:**
```typescript
import { Runtime2D } from '@promptplay/runtime-2d';

const canvas = document.getElementById('game-canvas');
const runtime = new Runtime2D(canvas, {
  width: 800,
  height: 600,
  backgroundColor: 0xf9fafb
});
```

---

#### Methods

##### `async loadGameSpec(spec: GameSpec): Promise<void>`

Loads a game specification into the runtime.

**Parameters:**
- `spec` - Game specification to load

**Returns:** `Promise<void>`

**Example:**
```typescript
await runtime.loadGameSpec(gameSpec);
```

---

##### `start(): void`

Starts the game loop.

**Example:**
```typescript
runtime.start();
```

---

##### `pause(): void`

Pauses the game loop.

**Example:**
```typescript
runtime.pause();
```

---

##### `destroy(): void`

Destroys the runtime and cleans up resources.

**Example:**

```typescript
runtime.destroy();
```

---

##### `getEntityAtPoint(x: number, y: number): string | null`

Finds the entity at canvas coordinates (for click-to-select).

**Parameters:**

- `x` - X coordinate on canvas
- `y` - Y coordinate on canvas

**Returns:** `string | null` - Entity name or null if no entity found

**Example:**

```typescript
const entityName = runtime.getEntityAtPoint(mouseX, mouseY);
if (entityName) {
  console.log('Clicked on:', entityName);
}
```

---

##### `getEntityBounds(entityName: string): { x, y, width, height } | null`

Gets the bounds of an entity from ECS state (for selection overlay).

**Parameters:**

- `entityName` - Name of the entity

**Returns:** `{ x, y, width, height } | null` - Entity bounds or null

**Example:**

```typescript
const bounds = runtime.getEntityBounds('player');
if (bounds) {
  // Draw selection box at bounds.x, bounds.y
}
```

---

### Canvas2DRenderer

Canvas2D rendering integration with texture loading and z-ordering.

#### `initialize(): void`

Sets up the Canvas2D context and prepares for rendering.

---

#### `render(): void`

Renders all entities with z-index sorting. Supports:

- Loaded texture images with caching
- Sprite sheet frame rendering
- Anchor points for rotation/scaling pivot
- Horizontal and vertical flipping
- Color tint overlay

---

#### `async preloadTextures(): Promise<void>`

Preloads all textures registered in the world.

---

#### `setAssetBasePath(path: string): void`

Sets the base path for loading texture assets.

**Parameters:**

- `path` - Base directory for assets (e.g., '/assets/' or 'file:///path/to/assets/')

---

#### `cleanup(): void`

Cleans up rendering resources and texture cache.

---

### MatterPhysics

Matter.js physics integration (internal use).

#### `createBody(eid: number, collider: ColliderData, transform: TransformData): void`

Creates a physics body for an entity.

---

#### `step(deltaTime: number): void`

Steps the physics simulation.

---

#### `syncToECS(world: World): void`

Syncs physics body positions back to ECS transforms.

---

### Systems

#### PhysicsSystem

Applies gravity and integrates velocity.

```typescript
import { PhysicsSystem } from '@promptplay/runtime-2d';

const physicsSystem = new PhysicsSystem();
world.registerSystem(physicsSystem);
```

---

#### InputSystem

Processes keyboard and mouse input.

```typescript
import { InputSystem } from '@promptplay/runtime-2d';

const inputManager = runtime.getInputManager();
const inputSystem = new InputSystem(inputManager);
world.registerSystem(inputSystem);
```

---

#### CollisionSystem

Handles collision events.

```typescript
import { CollisionSystem } from '@promptplay/runtime-2d';

const physics = runtime.getPhysics();
const collisionSystem = new CollisionSystem(physics);
world.registerSystem(collisionSystem);
```

---

### InputManager

Manages keyboard and mouse input.

#### Methods

##### `isKeyPressed(key: string): boolean`

**Parameters:**
- `key` - Key code (e.g., 'KeyW', 'Space', 'ArrowUp')

**Returns:** `boolean` - True if key is currently pressed

**Example:**
```typescript
const inputManager = runtime.getInputManager();
if (inputManager.isKeyPressed('Space')) {
  // Jump!
}
```

---

##### `getMousePosition(): { x: number, y: number }`

**Returns:** `{ x, y }` - Mouse position relative to canvas

---

##### `isMousePressed(): boolean`

**Returns:** `boolean` - True if mouse button is pressed

---

## AI Prompt

Package: `@promptplay/ai-prompt`

### OpenAIClient

Client for generating game specifications using OpenAI's API.

#### Constructor

```typescript
constructor(apiKey: string, options?: OpenAIClientOptions)

interface OpenAIClientOptions {
  model?: string; // Default: 'gpt-4'
  retries?: number; // Default: 3
}
```

**Parameters:**
- `apiKey` - OpenAI API key
- `options` - Optional configuration

**Example:**
```typescript
import { OpenAIClient } from '@promptplay/ai-prompt';

const client = new OpenAIClient(process.env.OPENAI_API_KEY);
```

---

#### Methods

##### `async generateGameSpec(prompt: string, genre?: string): Promise<GameSpec>`

Generates a game specification from a text prompt.

**Parameters:**
- `prompt` - Natural language game description
- `genre` - Optional genre hint ('platformer' | 'shooter' | 'puzzle')

**Returns:** `Promise<GameSpec>` - Generated game specification

**Throws:** `Error` if generation fails or validation fails

**Example:**
```typescript
const spec = await client.generateGameSpec(
  'A platformer where a fox collects coins',
  'platformer'
);
```

---

##### `async generateWithRetry(prompt: string, genre?: string): Promise<GameSpec>`

Same as `generateGameSpec` but with automatic retries.

**Parameters:**
- `prompt` - Natural language game description
- `genre` - Optional genre hint

**Returns:** `Promise<GameSpec>` - Generated game specification

**Example:**
```typescript
try {
  const spec = await client.generateWithRetry(userPrompt, selectedGenre);
  console.log('Generated:', spec.metadata.title);
} catch (error) {
  console.error('Failed after retries:', error);
}
```

---

### SpecValidator

Validates game specifications using Zod schemas.

#### `static validate(data: unknown): GameSpec`

Validates and parses a game spec.

**Parameters:**
- `data` - Unknown data to validate

**Returns:** `GameSpec` - Valid game specification

**Throws:** `ZodError` if validation fails

**Example:**
```typescript
import { SpecValidator } from '@promptplay/ai-prompt';

try {
  const spec = SpecValidator.validate(jsonData);
  // spec is guaranteed to be valid
} catch (error) {
  console.error('Invalid spec:', error.errors);
}
```

---

## Editor API Routes

### POST /api/generate

Generates a game specification from a prompt.

#### Request

```typescript
POST /api/generate
Content-Type: application/json

{
  "prompt": string,
  "genre"?: "platformer" | "shooter" | "puzzle"
}
```

**Body Parameters:**
- `prompt` - Game description (required)
- `genre` - Genre hint (optional)

---

#### Response

**Success (200):**
```json
{
  "version": "1.0",
  "metadata": { ... },
  "config": { ... },
  "entities": [ ... ],
  "systems": [ ... ]
}
```

**Error (400):**
```json
{
  "error": "Prompt is required"
}
```

**Error (500):**
```json
{
  "error": "OPENAI_API_KEY not configured"
}
```

or

```json
{
  "error": "Failed to generate game spec. Please try again."
}
```

---

#### Example Usage

**JavaScript:**
```javascript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A platformer with jumping',
    genre: 'platformer'
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error(error.error);
} else {
  const gameSpec = await response.json();
  console.log('Game created:', gameSpec.metadata.title);
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A platformer where you jump","genre":"platformer"}'
```

---

## Usage Examples

### Complete Example: Creating a Custom Game

```typescript
import { World, Deserializer } from '@promptplay/ecs-core';
import { Runtime2D } from '@promptplay/runtime-2d';
import { GameSpec } from '@promptplay/shared-types';

// 1. Create a custom game spec
const customSpec: GameSpec = {
  version: '1.0',
  metadata: {
    title: 'My Custom Game',
    genre: 'platformer',
    description: 'A custom platformer'
  },
  config: {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 }
  },
  entities: [
    {
      name: 'player',
      components: {
        transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { vx: 0, vy: 0 },
        sprite: { texture: 'player', width: 40, height: 40, tint: '#3b82f6ff' },
        collider: { type: 'box', width: 40, height: 40 },
        input: { moveSpeed: 8, jumpForce: -15 }
      },
      tags: ['player']
    },
    {
      name: 'ground',
      components: {
        transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'ground', width: 800, height: 40, tint: '#64748bff' },
        collider: { type: 'box', width: 800, height: 40 }
      },
      tags: ['static']
    }
  ],
  systems: ['physics', 'input', 'collision', 'render']
};

// 2. Initialize runtime
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const runtime = new Runtime2D(canvas, {
  width: 800,
  height: 600,
  backgroundColor: 0xf8fafc
});

// 3. Load and start the game
await runtime.loadGameSpec(customSpec);
runtime.start();

// 4. Control playback
document.getElementById('pause-btn').addEventListener('click', () => {
  runtime.pause();
});

document.getElementById('play-btn').addEventListener('click', () => {
  runtime.start();
});
```

---

### Example: AI-Generated Game

```typescript
import { OpenAIClient } from '@promptplay/ai-prompt';
import { Runtime2D } from '@promptplay/runtime-2d';

const client = new OpenAIClient(process.env.OPENAI_API_KEY);

// Generate game from prompt
const spec = await client.generateWithRetry(
  'Create a space shooter with 5 enemies that chase the player',
  'shooter'
);

// Load into runtime
const runtime = new Runtime2D(canvas, { width: 800, height: 600 });
await runtime.loadGameSpec(spec);
runtime.start();
```

---

## TypeScript Type Checking

All packages include full TypeScript definitions. Enable strict type checking in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "types": ["node"]
  }
}
```

---

## Error Handling

### Common Errors

**Invalid Game Spec:**
```typescript
import { SpecValidator } from '@promptplay/ai-prompt';

try {
  const spec = SpecValidator.validate(data);
} catch (error) {
  if (error.name === 'ZodError') {
    console.error('Validation errors:', error.errors);
  }
}
```

**Runtime Initialization:**
```typescript
try {
  const runtime = new Runtime2D(canvas, options);
} catch (error) {
  console.error('Failed to initialize runtime:', error);
}
```

**API Generation:**
```typescript
try {
  const spec = await client.generateGameSpec(prompt);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
  } else if (error.message.includes('invalid API key')) {
    // Handle auth error
  }
}
```

---

## Best Practices

1. **Always validate specs before loading:**
   ```typescript
   const spec = SpecValidator.validate(jsonData);
   await runtime.loadGameSpec(spec);
   ```

2. **Clean up resources:**
   ```typescript
   // When component unmounts
   useEffect(() => {
     return () => runtime.destroy();
   }, []);
   ```

3. **Handle async operations:**
   ```typescript
   const [loading, setLoading] = useState(false);

   async function generateGame() {
     setLoading(true);
     try {
       const spec = await client.generateGameSpec(prompt);
       await runtime.loadGameSpec(spec);
     } catch (error) {
       handleError(error);
     } finally {
       setLoading(false);
     }
   }
   ```

4. **Use type guards:**
   ```typescript
   function isGameSpec(data: unknown): data is GameSpec {
     try {
       SpecValidator.validate(data);
       return true;
     } catch {
       return false;
     }
   }
   ```

---

## Version Compatibility

| Package | Version | Compatible With |
|---------|---------|-----------------|
| `shared-types` | 1.0.0 | All packages |
| `ecs-core` | 1.0.0 | bitecs ^0.3.40 |
| `runtime-2d` | 1.0.0 | Canvas2D (native), Matter.js ^0.19.x |
| `ai-prompt` | 1.0.0 | OpenAI SDK ^4.x |
| `desktop` | 1.0.0 | Tauri ^2.0, React ^18.x |
| `editor` | 1.0.0 | Next.js ^14.x |

---

*PromptPlay API Reference v1.0*
