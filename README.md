# PromptPlay

> **The AI-First Game Engine** - Create 2D & 3D games by describing them in plain English

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Vision

**PromptPlay aims to be the Unity/Unreal of AI-native game development.**

While traditional game engines require years of learning, PromptPlay lets anyone create games through natural conversation. Describe what you want, and AI builds it. Professional developers get a powerful visual editor with full code access.

**"Describe your game. AI builds it. Play immediately."**

---

## Why PromptPlay?

| Feature | Unity/Unreal | PromptPlay |
|---------|-------------|------------|
| Learning Curve | Months to years | Minutes |
| AI Integration | Plugins/Add-ons | Native, first-class |
| Game Creation | Code + Visual | Conversation + Visual + Code |
| Export | Complex build systems | One-click HTML/Desktop |
| Cost | Subscription/Royalties | Free & Open Source |
| Extensibility | C#/C++/Blueprints | TypeScript |

---

## Features

### AI-Powered Development
- **Natural Language Editing** - "Add a blue player that can double-jump"
- **Context-Aware AI** - Understands your game, entities, and code
- **Streaming Responses** - See AI thinking in real-time
- **Persistent Chat History** - Pick up where you left off
- **Demo Mode** - Try without API key

### Visual Scene Editor
- **Scene Tree** - Hierarchical entity management with search/filter
- **Inspector** - Edit all component properties visually
- **Game Canvas** - Live preview with selection, drag handles, transform gizmos
- **Multi-Entity Selection** - Ctrl+Click, Shift+Click, Ctrl+A to select all
- **Undo/Redo Timeline** - Visual history with unlimited undo

### Animation System
- **Animation Editor** - Visual timeline with keyframes
- **Sprite Sheet Importer** - Auto-detect frame dimensions
- **Animation States** - Idle, walk, jump with transitions
- **Playback Controls** - Play, pause, step through frames

### Physics & Debug
- **Matter.js Integration** - Full 2D physics simulation
- **Physics Debug Overlay** - Collider visualization, velocity vectors
- **Sensor Support** - Trigger zones for collectibles, damage
- **Collision Layers** - Control what collides with what

### Scene & Prefab Management
- **Multiple Scenes** - Level management with scene switching
- **Prefab Library** - Reusable entity templates
- **Built-in Prefabs** - Player, Enemy, Platform, Collectible
- **Custom Prefabs** - Save any entity as reusable prefab

### Code & Scripting
- **Monaco Editor** - Full IDE with IntelliSense
- **TypeScript Compilation** - esbuild-powered, instant feedback
- **Custom Systems** - Extend engine with your own logic
- **Hot Reload** - See changes instantly

### Export & Distribution
- **HTML Export** - Single-file, runs anywhere
- **Desktop Build** - Windows, macOS, Linux via Tauri
- **Embedded Assets** - Everything bundled together
- **No Dependencies** - Exported games run standalone

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Rust (for desktop app)

### Installation

```bash
# Clone the repository
git clone https://github.com/Davaakhatan/PromptPlay.git
cd PromptPlay

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run desktop app
cd apps/desktop && pnpm dev
```

### Create Your First Game

1. **New Project** - Click "New Project" or use a template
2. **Add Entities** - Use prefabs or create custom entities
3. **Edit Properties** - Transform, sprite, physics in Inspector
4. **AI Assist** - Type "make the player faster" in AI chat
5. **Play & Test** - Click Play, test your game
6. **Export** - Export as HTML to share

---

## Architecture

```
PromptPlay/
├── apps/
│   └── desktop/                 # Tauri 2.0 Desktop App
│       ├── src/                 # React Frontend
│       │   ├── components/      # 30+ UI Components
│       │   │   ├── GameCanvas   # Live game preview
│       │   │   ├── Inspector    # Property editor
│       │   │   ├── SceneTree    # Entity hierarchy
│       │   │   ├── AIPromptPanel# AI chat interface
│       │   │   ├── AnimationEditor
│       │   │   ├── PrefabLibrary
│       │   │   └── ...
│       │   ├── hooks/           # Reusable logic
│       │   └── services/        # Core services
│       └── src-tauri/           # Rust Backend
│           └── src/
│               ├── commands.rs  # File, AI, export
│               └── ai_client.rs # Claude integration
│
├── packages/
│   ├── ecs-core/                # Entity Component System
│   │   ├── components/          # 12 built-in components
│   │   ├── world/               # GameWorld management
│   │   └── serialization/       # JSON import/export
│   │
│   ├── runtime-2d/              # 2D Game Runtime
│   │   ├── Runtime2D.ts         # Main orchestrator
│   │   ├── renderers/           # Canvas2D, PixiJS
│   │   ├── physics/             # Matter.js wrapper
│   │   ├── systems/             # Input, Animation, AI, Particles
│   │   └── tests/               # 284 tests, 80%+ coverage
│   │
│   ├── ai-prompt/               # AI Integration
│   │   └── templates/           # Genre-specific prompts
│   │
│   └── shared-types/            # TypeScript Definitions
│
└── docs/                        # Documentation
    ├── architecture.md
    ├── user-guide.md
    └── api-reference.md
```

---

## Components

| Component | Description | Key Properties |
|-----------|-------------|----------------|
| **Transform** | Position & orientation | x, y, rotation, scaleX, scaleY |
| **Velocity** | Movement | vx, vy |
| **Sprite** | Visual appearance | texture, width, height, tint, zIndex, animation frames |
| **Collider** | Physics shape | type (box/circle), dimensions, isSensor |
| **Input** | Player controls | moveSpeed, jumpForce, canJump |
| **Health** | Damage system | current, max |
| **AIBehavior** | Enemy AI | type (patrol/chase/flee), speed, detectionRadius |
| **Animation** | Sprite animation | frameCount, frameDuration, loop, states |
| **Camera** | View control | zoom, followTarget, shake |
| **ParticleEmitter** | Effects | emitRate, lifetime, colors, gravity |
| **Audio** | Sound | source, volume, loop, spatial |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New Project |
| `Cmd/Ctrl + O` | Open Project |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + C` | Copy Entity |
| `Cmd/Ctrl + V` | Paste Entity |
| `Cmd/Ctrl + D` | Duplicate |
| `Cmd/Ctrl + A` | Select All |
| `Delete/Backspace` | Delete Selected |
| `Cmd/Ctrl + E` | Export HTML |
| `D` | Toggle Debug Overlay |
| `?` | Show Shortcuts |

---

## Roadmap

### Current (v1.0)
- [x] 2D Game Engine
- [x] Visual Editor
- [x] AI Chat Integration
- [x] Animation Editor
- [x] Physics System
- [x] Prefab System
- [x] Scene Management
- [x] HTML Export
- [x] 80%+ Test Coverage

### Next (v1.5)
- [ ] JSON Schema for AI
- [ ] Game Package Import/Export
- [ ] Dynamic Template Generation
- [ ] Voice Input

### Future (v2.0)
- [ ] 3D Support (Three.js + Cannon-es)
- [ ] 3D Physics
- [ ] Lighting & Shadows
- [ ] GLTF Model Loading
- [ ] 3D Editor Tools

### Vision (v3.0)
- [ ] Community Marketplace
- [ ] Collaborative Editing
- [ ] Mobile Export
- [ ] AI Playtesting
- [ ] One-Click Publishing

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Tauri 2.0 | Native cross-platform app |
| **Frontend** | React 18, Vite | Fast, modern UI |
| **Styling** | Tailwind CSS | Beautiful, consistent design |
| **Editor** | Monaco | Professional code editing |
| **Compiler** | esbuild-wasm | Instant TypeScript compilation |
| **ECS** | bitecs | High-performance game logic |
| **Rendering** | Canvas2D | Fast 2D graphics |
| **Physics** | Matter.js | Realistic 2D physics |
| **AI** | Claude API | Intelligent game generation |
| **Testing** | Vitest | Fast unit tests |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
pnpm install
pnpm build
pnpm test

# Run tests with coverage
pnpm --filter @promptplay/runtime-2d test

# Lint code
pnpm lint
```

---

## Documentation

- [User Guide](docs/user-guide.md) - Getting started
- [Architecture](docs/architecture.md) - System design
- [API Reference](docs/api-reference.md) - Component & type reference
- [Testing Guide](docs/testing-guide.md) - Testing patterns

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Links

- [GitHub](https://github.com/Davaakhatan/PromptPlay)
- [Documentation](docs/user-guide.md)
- [Discord](#) *(coming soon)*
- [Examples](#) *(coming soon)*

---

**Built with passion for making game development accessible to everyone.**
