# PromptPlay

> AI-First 2D Game Engine with Native Desktop Editor

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is PromptPlay?

PromptPlay is an AI-powered 2D game engine with a native desktop editor. Create playable games by describing them in plain English, or use the visual scene editor to build games interactively.

**Key Features:**

- Native desktop app (Windows, macOS, Linux)
- Visual scene editor with entity management
- Real-time game preview with play/pause controls
- File system access for real project workflows
- Hot reload on file changes

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust (for Tauri desktop app)

### Installation

```bash
# Clone the repository
git clone https://github.com/Davaakhatan/PromptPlay.git
cd PromptPlay

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Run Desktop App

```bash
# Development mode
pnpm --filter promptplay-desktop dev

# Or from apps/desktop
cd apps/desktop && pnpm dev
```

### Run Web Editor

```bash
# Start the web editor
pnpm --filter editor dev

# Open http://localhost:3000
```

---

## Project Structure

```
PromptPlay/
├── apps/
│   ├── desktop/              # Tauri 2.0 native desktop app
│   │   ├── src/              # React frontend
│   │   │   ├── components/   # UI components
│   │   │   │   ├── GameCanvas.tsx
│   │   │   │   ├── SceneTree.tsx
│   │   │   │   ├── Inspector.tsx
│   │   │   │   ├── FileTree.tsx
│   │   │   │   ├── CodeEditor.tsx
│   │   │   │   └── Icons.tsx
│   │   │   └── App.tsx
│   │   └── src-tauri/        # Rust backend
│   │       └── src/
│   │           ├── commands.rs
│   │           └── file_watcher.rs
│   │
│   └── editor/               # Next.js web editor
│
├── packages/
│   ├── ecs-core/             # Entity Component System
│   │   ├── components/       # Transform, Sprite, Collider, etc.
│   │   ├── world/            # GameWorld management
│   │   └── serialization/    # JSON serialization
│   │
│   ├── runtime-2d/           # 2D Game Runtime
│   │   ├── renderers/        # Canvas2D renderer
│   │   ├── physics/          # Matter.js integration
│   │   ├── input/            # Input management
│   │   └── gameloop/         # Fixed timestep loop
│   │
│   ├── ai-prompt/            # AI game generation
│   │   └── templates/        # Genre-specific prompts
│   │
│   └── shared-types/         # TypeScript definitions
│
└── docs/                     # Documentation
```

---

## Desktop App Features

### Visual Scene Editor

- **Scene Tree** - Hierarchical view of all entities with tags
- **Inspector** - Edit entity properties (transform, sprite, collider, etc.)
- **Game Canvas** - Live preview with entity selection
- **Entity Management** - Create, delete, duplicate entities

### File System Integration

- Open game projects from anywhere on disk
- Edit game.json files directly
- Hot reload on file changes
- Code editor with Monaco integration

### Game Preview

- Play/Pause/Reset controls
- Click-to-select entities on canvas
- Selection highlight with corner handles
- Real-time property updates

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Tauri 2.0 | Native app framework |
| **Frontend** | React 18, Vite | UI framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Editor** | Monaco Editor | Code editing |
| **ECS** | bitecs | Entity Component System |
| **Rendering** | Canvas2D | 2D graphics |
| **Physics** | Matter.js | 2D physics simulation |
| **AI** | OpenAI SDK | Game generation |

---

## Game Spec Format

Games are defined in JSON format:

```json
{
  "version": "1.0",
  "metadata": {
    "title": "My Game",
    "genre": "platformer",
    "description": "A simple platformer"
  },
  "config": {
    "gravity": { "x": 0, "y": 1 },
    "worldBounds": { "width": 800, "height": 600 }
  },
  "entities": [
    {
      "name": "player",
      "components": {
        "transform": { "x": 100, "y": 400, "rotation": 0, "scaleX": 1, "scaleY": 1 },
        "sprite": { "texture": "player", "width": 32, "height": 32, "tint": 4886754 },
        "collider": { "type": "box", "width": 32, "height": 32 },
        "input": { "moveSpeed": 5, "jumpForce": -15 }
      },
      "tags": ["player"]
    }
  ],
  "systems": ["physics", "input", "collision", "render"]
}
```

---

## Available Components

| Component | Properties | Description |
|-----------|-----------|-------------|
| **Transform** | x, y, rotation, scaleX, scaleY | Position and orientation |
| **Velocity** | vx, vy | Movement speed |
| **Sprite** | texture, width, height, tint, visible, zIndex, frameX/Y, anchorX/Y, flipX/Y | Visual representation with sprite sheet & layering |
| **Collider** | type, width, height, radius, isSensor, layer | Physics shape |
| **Input** | moveSpeed, jumpForce, canJump | Player controls |
| **Health** | current, max | Damage system |
| **AIBehavior** | type, speed, detectionRadius | Enemy AI |
| **Animation** | frameCount, frameDuration, loop, isPlaying | Sprite animations |
| **Camera** | zoom, followTarget, followSmoothing, shake | Camera control |
| **ParticleEmitter** | emitRate, lifetime, size, speed, colors | Particle effects |

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (all packages)
pnpm dev

# Desktop app
pnpm --filter promptplay-desktop dev
pnpm --filter promptplay-desktop build

# Web editor
pnpm --filter editor dev

# Run tests
pnpm test

# Lint
pnpm lint

# Clean
pnpm clean
```

---

## Build Desktop App

```bash
# Development
cd apps/desktop
pnpm dev

# Production build
pnpm build

# The built app will be in:
# - macOS: src-tauri/target/release/bundle/macos/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/deb/
```

---

## Supported Game Genres

### Platformer
- Gravity-based physics
- Jump mechanics
- Collectibles and enemies

### Shooter
- Top-down or side-scrolling
- Projectile system
- Enemy AI

### Puzzle
- Grid-based movement
- Push mechanics
- Logic challenges

---

## Architecture

### ECS (Entity Component System)

PromptPlay uses bitecs for high-performance game logic:

- **Entities**: Simple numeric IDs
- **Components**: Data stored in TypedArrays
- **Systems**: Logic that operates on components

### Rendering Pipeline

```
GameSpec → Deserializer → ECS World → Canvas2DRenderer → Screen
                                            ↓
                                    Texture Loading
                                    Z-Index Sorting
                                    Sprite Sheet Frames
```

### Physics Integration

Matter.js bodies are synchronized with ECS Transform components:

```
ECS Transform ↔ Matter.js Body ↔ Physics World
```

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Links

- [Documentation](docs/user-guide.md)
- [API Reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
