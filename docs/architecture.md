# PromptPlay - System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Monorepo Structure](#monorepo-structure)
4. [Package Architecture](#package-architecture)
5. [Data Flow](#data-flow)
6. [Component Details](#component-details)
7. [Technology Stack](#technology-stack)
8. [Design Patterns](#design-patterns)
9. [Performance Considerations](#performance-considerations)
10. [Security Architecture](#security-architecture)

---

## System Overview

PromptPlay is a modular, web-based game engine built on modern JavaScript/TypeScript architecture. The system transforms natural language prompts into playable 2D games through AI-powered specification generation and a custom Entity Component System (ECS) runtime.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Next.js Application (Editor)               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ Prompt Input │  │ Game Canvas  │  │ Spec Editor  │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │         │                 │                 │          │ │
│  │         └─────────────────┴─────────────────┘          │ │
│  │                           │                             │ │
│  │         ┌─────────────────┴─────────────────┐          │ │
│  │         │        State Management            │          │ │
│  │         │     (GameSpec, isPlaying)          │          │ │
│  │         └─────────┬──────────────────────────┘          │ │
│  └───────────────────┼─────────────────────────────────────┘ │
│                      │                                        │
│  ┌───────────────────┴────────────┐  ┌────────────────────┐ │
│  │      Runtime2D                 │  │   OpenAI Client    │ │
│  │  ┌──────────┐  ┌────────────┐ │  │   (AI Prompt)      │ │
│  │  │  PixiJS  │  │ Matter.js  │ │  └──────────┬─────────┘ │
│  │  │ Renderer │  │  Physics   │ │             │            │
│  │  └────┬─────┘  └─────┬──────┘ │             │            │
│  │       └──────────────┬────────┘              │            │
│  │                      │                       │            │
│  │         ┌────────────┴────────────┐          │            │
│  │         │    ECS World            │          │            │
│  │         │  (Components, Systems)  │          │            │
│  │         └─────────────────────────┘          │            │
│  └──────────────────────────────────────────────┘            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │  API    │
                    │ OpenAI  │
                    └─────────┘
```

---

## Architecture Principles

### 1. Separation of Concerns
- **ECS Core:** Pure game logic, no rendering or physics
- **Runtime2D:** Rendering and physics integration, no AI
- **AI Prompt:** AI integration, no game logic
- **Editor:** UI/UX, orchestration only

### 2. Modularity
- Independent packages with clear interfaces
- Packages can be used standalone
- Minimal coupling between packages

### 3. Data-Driven Design
- Games defined as JSON specifications
- Components are pure data structures
- Systems operate on component data

### 4. Composition Over Inheritance
- ECS pattern promotes composition
- Entities composed of reusable components
- No complex inheritance hierarchies

### 5. Type Safety
- TypeScript throughout
- Shared types package for consistency
- Compile-time error detection

---

## Monorepo Structure

### Directory Tree

```
GameDev/
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── package.json                  # Root package scripts
├── tsconfig.base.json            # Shared TypeScript config
├── turbo.json                    # Turbo build configuration
├── .gitignore
├── README.md
│
├── docs/                         # Documentation
│   ├── prd.md                    # Product requirements
│   ├── architecture.md           # This file
│   └── tasks.md                  # Task breakdown
│
├── packages/                     # Shared packages
│   ├── shared-types/             # TypeScript type definitions
│   │   ├── src/
│   │   │   ├── GameSpec.ts
│   │   │   ├── ComponentSpec.ts
│   │   │   ├── ECSTypes.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ecs-core/                 # Entity Component System
│   │   ├── src/
│   │   │   ├── components/       # Component definitions
│   │   │   ├── systems/          # System implementations
│   │   │   ├── world/            # World management
│   │   │   ├── serialization/    # JSON serialization
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── runtime-2d/               # 2D game runtime
│   │   ├── src/
│   │   │   ├── renderers/        # PixiJS integration
│   │   │   ├── physics/          # Matter.js integration
│   │   │   ├── input/            # Input handling
│   │   │   ├── systems/          # Runtime systems
│   │   │   ├── Runtime2D.ts      # Main runtime class
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai-prompt/                # AI integration
│       ├── src/
│       │   ├── OpenAIClient.ts   # OpenAI API client
│       │   ├── templates/        # Prompt templates
│       │   ├── validators/       # Zod schemas
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
└── apps/                         # Applications
    └── editor/                   # Next.js editor app
        ├── src/
        │   ├── app/              # App Router pages
        │   │   ├── api/
        │   │   │   └── generate/
        │   │   │       └── route.ts
        │   │   ├── globals.css
        │   │   ├── page.tsx
        │   │   └── page.module.css
        │   └── components/       # React components
        │       ├── PromptInput.tsx
        │       ├── GameCanvas.tsx
        │       ├── ControlPanel.tsx
        │       ├── SpecEditor.tsx
        │       └── SaveLoadPanel.tsx
        ├── public/
        │   └── demos/            # Demo game specs
        ├── .env.local            # Environment variables
        ├── next.config.mjs
        ├── package.json
        └── tsconfig.json
```

### Package Dependencies

```
editor
  ├── depends on → ecs-core
  ├── depends on → runtime-2d
  ├── depends on → ai-prompt
  └── depends on → shared-types

runtime-2d
  ├── depends on → ecs-core
  └── depends on → shared-types

ecs-core
  └── depends on → shared-types

ai-prompt
  └── depends on → shared-types

shared-types
  └── (no dependencies)
```

---

## Package Architecture

### 1. Shared Types Package

**Purpose:** Centralize all TypeScript type definitions

**Key Files:**
- `GameSpec.ts`: Game specification interface
- `ComponentSpec.ts`: Component data interfaces
- `ECSTypes.ts`: ECS system interfaces

**Exports:**
```typescript
export interface GameSpec {
  version: string;
  metadata: GameMetadata;
  config: GameConfig;
  entities: EntitySpec[];
  systems: string[];
}

export interface EntitySpec {
  name: string;
  components: Record<string, any>;
  tags: string[];
}

export interface ISystem {
  init(world: any): void;
  update(world: any, deltaTime: number): void;
}
```

---

### 2. ECS Core Package

**Purpose:** Manage game state using Entity Component System pattern

#### Components

All components use **bitecs** for memory-efficient storage.

```typescript
// Transform.ts
export const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  rotation: Types.f32,
  scaleX: Types.f32,
  scaleY: Types.f32,
});

// Similar definitions for:
// - Velocity (vx, vy)
// - Sprite (texture, width, height, tint)
// - Collider (type, width, height, radius, isSensor)
// - Input (moveSpeed, jumpForce)
// - Health (current, max)
// - AIBehavior (behaviorType, targetEntity, detectionRadius, speed)
```

#### World Management

```typescript
class World {
  private world: IWorld;              // bitecs world
  private entities: Set<number>;       // Entity IDs
  private tags: Map<string, Set<number>>; // Tag queries
  private systems: ISystem[];         // Registered systems
  private textures: Map<string, string>; // Texture registry

  createEntity(): number;
  destroyEntity(eid: number): void;
  addTag(eid: number, tag: string): void;
  getEntitiesByTag(tag: string): number[];
  registerSystem(system: ISystem): void;
  update(deltaTime: number): void;
  registerTexture(name: string, url: string): void;
}
```

#### Serialization

```typescript
class Deserializer {
  loadGameSpec(world: World, spec: GameSpec): void {
    // 1. Apply config (gravity, world bounds)
    // 2. Create entities with components
    // 3. Assign tags
    // 4. Register systems
  }
}

class Serializer {
  saveGameSpec(world: World): GameSpec {
    // Extract entity data from world
    // Build JSON structure
  }
}
```

---

### 3. Runtime 2D Package

**Purpose:** Render games and simulate physics

#### Runtime2D Class

```typescript
class Runtime2D {
  private world: World;
  private pixiApp: Application;
  private pixiRenderer: PixiRenderer;
  private physics: MatterPhysics;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private systems: ISystem[];

  constructor(canvas: HTMLCanvasElement, options: RuntimeOptions);

  async loadGameSpec(spec: GameSpec): Promise<void> {
    // 1. Clear existing game
    // 2. Deserialize spec into world
    // 3. Initialize physics bodies
    // 4. Create PixiJS sprites
    // 5. Register systems
  }

  start(): void;
  pause(): void;
  destroy(): void;
}
```

#### PixiRenderer

```typescript
class PixiRenderer {
  private app: Application;
  private sprites: Map<number, PixiSprite>;

  initialize(): void;
  createSprite(eid: number, sprite: SpriteData, transform: TransformData): void;
  updateSprites(world: World): void; // Sync ECS → PixiJS
  destroySprite(eid: number): void;
}
```

#### MatterPhysics

```typescript
class MatterPhysics {
  private engine: Matter.Engine;
  private bodies: Map<number, Matter.Body>;

  initialize(gravity: Vector): void;
  createBody(eid: number, collider: ColliderData, transform: TransformData): void;
  step(deltaTime: number): void;
  syncToECS(world: World): void; // Sync Matter → ECS
  onCollision(callback: (a: number, b: number) => void): void;
}
```

#### GameLoop

```typescript
class GameLoop {
  private targetFPS: number = 60;
  private fixedDeltaTime: number = 1 / 60;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  start(updateCallback: (dt: number) => void): void {
    // Fixed timestep game loop
    // Prevents physics issues from variable frame rates
  }

  stop(): void;
}
```

#### Systems

```typescript
// PhysicsSystem.ts
class PhysicsSystem implements ISystem {
  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    // Apply gravity to velocities
    // Integrate velocities into transforms
  }
}

// InputSystem.ts
class InputSystem implements ISystem {
  constructor(private inputManager: InputManager) {}

  update(world: World, deltaTime: number): void {
    // Read input state
    // Update entity velocities based on Input component
  }
}

// CollisionSystem.ts
class CollisionSystem implements ISystem {
  update(world: World, deltaTime: number): void {
    // Handle collision events
    // Trigger collectibles, damage, etc.
  }
}
```

---

### 4. AI Prompt Package

**Purpose:** Generate game specifications from natural language

#### OpenAIClient

```typescript
class OpenAIClient {
  private client: OpenAI;
  private retries: number = 3;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async generateGameSpec(
    userPrompt: string,
    genre?: 'platformer' | 'shooter' | 'puzzle'
  ): Promise<GameSpec> {
    // 1. Select appropriate template
    const template = this.getTemplate(genre);

    // 2. Build prompt
    const systemPrompt = this.buildSystemPrompt(template);

    // 3. Call OpenAI API
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    // 4. Parse and validate response
    const json = JSON.parse(response.choices[0].message.content);
    const spec = SpecValidator.validate(json);

    return spec;
  }

  async generateWithRetry(prompt: string, genre?: string): Promise<GameSpec> {
    // Exponential backoff retry logic
  }
}
```

#### Prompt Templates

```typescript
// base.ts
export const baseSystemPrompt = `
You are a game specification generator for the PromptPlay engine.
Generate valid JSON matching this ECS schema:

{
  "version": "1.0",
  "metadata": { "title", "genre", "description" },
  "config": { "gravity": { x, y }, "worldBounds": { width, height } },
  "entities": [
    {
      "name": string,
      "components": {
        "transform": { x, y, rotation, scaleX, scaleY },
        "velocity": { vx, vy },
        "sprite": { texture, width, height, tint },
        "collider": { type, width, height, radius?, isSensor? },
        "input": { moveSpeed, jumpForce },
        "health": { current, max },
        "aiBehavior": { type, speed, detectionRadius }
      },
      "tags": string[]
    }
  ],
  "systems": ["physics", "input", "collision", "render"]
}

Rules:
- All positions are absolute coordinates
- Use consistent entity sizes
- Ensure entities don't overlap initially
- Player should be tagged "player"
- Static objects tagged "static"
`;

// platformer.ts
export const platformerTemplate = `
${baseSystemPrompt}

Genre: Platformer
- Set gravity.y = 1
- Player needs Input component with jumpForce
- Include platforms with Collider components
- Add collectibles with sensor colliders
`;

// Similar for shooter.ts and puzzle.ts
```

#### Validation

```typescript
import { z } from 'zod';

const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});

const EntitySchema = z.object({
  name: z.string(),
  components: z.record(z.any()),
  tags: z.array(z.string()),
});

const GameSpecSchema = z.object({
  version: z.string(),
  metadata: z.object({
    title: z.string(),
    genre: z.enum(['platformer', 'shooter', 'puzzle']),
    description: z.string(),
  }),
  config: z.object({
    gravity: z.object({ x: z.number(), y: z.number() }),
    worldBounds: z.object({ width: z.number(), height: z.number() }),
  }),
  entities: z.array(EntitySchema),
  systems: z.array(z.string()),
});

export class SpecValidator {
  static validate(data: unknown): GameSpec {
    return GameSpecSchema.parse(data);
  }
}
```

---

### 5. Editor Application

**Purpose:** Web UI for creating and playing games

#### Page Structure

```typescript
// page.tsx
export default function Home() {
  const [gameSpec, setGameSpec] = useState<GameSpec | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'spec'>('canvas');

  const handlePromptSubmit = async (prompt: string, genre?: string) => {
    setIsLoading(true);
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, genre }),
    });
    const spec = await response.json();
    setGameSpec(spec);
    setIsPlaying(true);
    setIsLoading(false);
  };

  return (
    <div>
      <Header />
      <LeftPanel>
        <PromptInput onSubmit={handlePromptSubmit} />
        <ControlPanel isPlaying={isPlaying} onPlay={...} onPause={...} />
      </LeftPanel>
      <CenterPanel>
        <Tabs activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === 'canvas' ? (
          <GameCanvas spec={gameSpec} isPlaying={isPlaying} />
        ) : (
          <SpecEditor spec={gameSpec} onEdit={setGameSpec} />
        )}
      </CenterPanel>
    </div>
  );
}
```

#### API Route

```typescript
// app/api/generate/route.ts
export async function POST(request: NextRequest) {
  const { prompt, genre } = await request.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const client = new OpenAIClient(apiKey);
  const spec = await client.generateWithRetry(prompt, genre);

  return NextResponse.json(spec);
}
```

#### GameCanvas Component

```typescript
export default function GameCanvas({ spec, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime2D | null>(null);

  // Initialize runtime on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    runtimeRef.current = new Runtime2D(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: 0xf9fafb,
    });

    return () => runtimeRef.current?.destroy();
  }, []);

  // Load spec when it changes
  useEffect(() => {
    if (!spec || !runtimeRef.current) return;
    runtimeRef.current.loadGameSpec(spec);
  }, [spec]);

  // Control playback
  useEffect(() => {
    if (!runtimeRef.current) return;
    isPlaying ? runtimeRef.current.start() : runtimeRef.current.pause();
  }, [isPlaying]);

  return <canvas ref={canvasRef} />;
}
```

---

## Data Flow

### Game Generation Flow

```
User Input (Text Prompt)
        ↓
PromptInput Component
        ↓
handlePromptSubmit()
        ↓
POST /api/generate
        ↓
OpenAIClient.generateGameSpec()
        ↓
OpenAI API (GPT-4)
        ↓
JSON GameSpec
        ↓
Zod Validation
        ↓
setState(gameSpec)
        ↓
GameCanvas Component
        ↓
Runtime2D.loadGameSpec()
        ↓
Deserializer.loadGameSpec()
        ↓
ECS World (Entities + Components)
        ↓
PixiRenderer + MatterPhysics
        ↓
Game Rendering on Canvas
```

### Game Loop Flow

```
GameLoop.start()
        ↓
RAF (requestAnimationFrame)
        ↓
Fixed Timestep Accumulator
        ↓
┌─────────────────────────┐
│   System Updates        │
│  1. PhysicsSystem       │
│  2. InputSystem         │
│  3. CollisionSystem     │
│  4. MatterPhysics.step()│
└────────────┬────────────┘
             ↓
    Sync Physics → ECS
             ↓
    PixiRenderer.updateSprites()
             ↓
    Sync ECS → PixiJS
             ↓
         Render Frame
             ↓
    Next RAF tick
```

### Component Data Flow

```
ECS Components (bitecs)
        ↓
    [Read by Systems]
        ↓
   Update Velocities
        ↓
   Update Transforms
        ↓
    [Sync to Physics]
        ↓
Matter.js Body.position
        ↓
Matter.Engine.update()
        ↓
    [Sync back to ECS]
        ↓
  Transform Component
        ↓
    [Sync to Renderer]
        ↓
  PixiJS Sprite.position
        ↓
      Render
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Monorepo | pnpm | 8.x | Package management |
| Build | Turbo | 1.x | Build orchestration |
| Language | TypeScript | 5.3.x | Type safety |
| Runtime | Node.js | 18.x | Development environment |

### ECS & Runtime

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| ECS | bitecs | 0.3.x | Memory-efficient ECS |
| Rendering | PixiJS | 7.3.x | 2D sprite rendering |
| Physics | Matter.js | 0.19.x | 2D physics simulation |
| Input | Native Events | - | Keyboard/mouse handling |

### AI & Validation

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| AI | OpenAI SDK | 4.x | ChatGPT API integration |
| Validation | Zod | 3.22.x | Schema validation |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Next.js | 14.x | React framework |
| UI Library | React | 18.x | Component library |
| Styling | CSS Modules | - | Scoped CSS |
| Fonts | Google Fonts | - | Inter, JetBrains Mono |

### Testing

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Unit Tests | Vitest | 1.x | Fast unit testing |
| E2E Tests | Playwright | (planned) | End-to-end testing |

---

## Design Patterns

### 1. Entity Component System (ECS)

**Pattern:** Data-oriented design for game entities

**Implementation:**
- Entities are IDs (numbers)
- Components are pure data (bitecs)
- Systems contain logic

**Benefits:**
- Performance (cache-friendly)
- Flexibility (composition)
- Scalability (parallel processing)

### 2. Observer Pattern

**Pattern:** Event-driven updates

**Implementation:**
- Matter.js collision events
- Input event listeners
- React state updates

**Benefits:**
- Decoupling
- Reactive updates

### 3. Command Pattern

**Pattern:** Encapsulate requests as objects

**Implementation:**
- Game controls (play, pause, reset)
- Undo/redo (future)

**Benefits:**
- Extensibility
- Testability

### 4. Factory Pattern

**Pattern:** Create objects without specifying exact class

**Implementation:**
- Deserializer creates entities from JSON
- System registration

**Benefits:**
- Abstraction
- Flexibility

### 5. Singleton Pattern

**Pattern:** Single instance of a class

**Implementation:**
- Runtime2D instance per canvas
- InputManager instance

**Benefits:**
- Global access
- Resource management

---

## Performance Considerations

### 1. ECS Performance

**Optimization:** bitecs uses TypedArrays for memory efficiency

**Impact:**
- Reduced garbage collection
- Cache-friendly data access
- Fast iteration over components

### 2. Fixed Timestep

**Optimization:** Decouple simulation from render rate

**Impact:**
- Consistent physics simulation
- Predictable behavior
- Handles frame drops gracefully

### 3. Object Pooling (Future)

**Optimization:** Reuse objects instead of creating/destroying

**Candidates:**
- Bullets in shooter games
- Particle effects

### 4. Spatial Partitioning (Future)

**Optimization:** Reduce collision checks

**Implementation:**
- Quadtree for entity lookups
- Only check nearby entities

### 5. Lazy Loading

**Optimization:** Load assets on demand

**Implementation:**
- Texture loading
- Sound effects (future)

---

## Security Architecture

### 1. API Key Protection

**Risk:** Exposed OpenAI API key

**Mitigation:**
- Store in `.env.local` (not committed)
- Server-side API route only
- Never send to client

### 2. Input Validation

**Risk:** Malicious user input

**Mitigation:**
- Zod schema validation
- Sanitize JSON before loading
- Limit entity count (future)

### 3. XSS Prevention

**Risk:** Cross-site scripting

**Mitigation:**
- React auto-escapes
- No `dangerouslySetInnerHTML`
- CSP headers (future)

### 4. Rate Limiting (Future)

**Risk:** API abuse

**Mitigation:**
- Client-side rate limiting
- Server-side request throttling
- Usage analytics

---

## Deployment Architecture (Future)

### Production Stack

```
CloudFlare CDN
        ↓
   Vercel Edge
        ↓
  Next.js App
        ↓
┌───────────────┐
│   Database    │  (Future: PostgreSQL)
│   - User data │
│   - Games     │
└───────────────┘
        ↓
┌───────────────┐
│   Storage     │  (Future: S3)
│   - Assets    │
│   - Sprites   │
└───────────────┘
```

### Scaling Considerations

1. **Edge Functions:** Deploy API routes to edge for low latency
2. **CDN:** Cache static assets globally
3. **Database Sharding:** Partition user data
4. **Asset CDN:** Separate CDN for game assets

---

## Future Architecture Enhancements

### 1. Multiplayer Support

**Architecture:**
- WebSocket server for real-time communication
- Server-authoritative physics
- Client-side prediction
- Rollback netcode

### 2. Custom Components

**Architecture:**
- Plugin system for custom components
- Component registry
- Runtime component compilation
- Type checking for custom components

### 3. Visual Editor

**Architecture:**
- Drag-and-drop entity placement
- Visual component inspector
- Timeline for animation
- Scene graph visualization

### 4. Asset Pipeline

**Architecture:**
- Asset upload service
- Image optimization
- Sprite sheet generation
- Audio compression

---

## Conclusion

PromptPlay's architecture is designed for:
- **Modularity:** Independent packages
- **Performance:** ECS for efficient game logic
- **Extensibility:** Plugin-ready systems
- **Maintainability:** Clear separation of concerns

The system balances simplicity for MVP with architectural patterns that support future growth into a full-featured game creation platform.
