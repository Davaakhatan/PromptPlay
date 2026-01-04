# PromptPlay

> **The AI-First Game Engine** - Create 2D & 3D games by describing them in plain English

[![Version](https://img.shields.io/badge/Version-3.0.0-brightgreen.svg)](https://github.com/Davaakhatan/PromptPlay/releases)
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
| 2D & 3D Support | Yes | Yes |
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

### 2D Game Engine

- **Canvas2D Rendering** - Fast, efficient 2D graphics
- **Matter.js Physics** - Full 2D physics simulation
- **Sprite Animation** - Timeline editor with keyframes
- **Particle System** - Effects for explosions, trails, etc.

### 3D Game Engine

- **Three.js Rendering** - Full 3D scene with lighting
- **Cannon-es Physics** - Realistic 3D physics simulation
- **Orbit Controls** - Camera rotation, pan, zoom
- **2D to 3D Conversion** - Switch your 2D game to 3D instantly

### Visual Scene Editor
- **Scene Tree** - Hierarchical entity management with search/filter
- **Inspector** - Edit all component properties visually
- **Game Canvas** - Live preview with selection and transform gizmos
- **Multi-Entity Selection** - Ctrl+Click, Shift+Click, Ctrl+A to select all
- **Undo/Redo Timeline** - Visual history with unlimited undo

### Animation System
- **Animation Editor** - Visual timeline with keyframes
- **Sprite Sheet Importer** - Auto-detect frame dimensions
- **Animation States** - Idle, walk, jump with transitions
- **Playback Controls** - Play, pause, step through frames

### Physics & Debug

- **2D Physics** - Matter.js with collision layers, sensors
- **3D Physics** - Cannon-es with rigid bodies, constraints
- **Debug Overlay** - Collider visualization, velocity vectors
- **Ground Detection** - Automatic grounded state for jumping

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
cd apps/desktop && pnpm tauri dev
```

### Create Your First Game

1. **New Project** - Click "New Project" or use a template
2. **Add Entities** - Use prefabs or create custom entities
3. **Edit Properties** - Transform, sprite, physics in Inspector
4. **AI Assist** - Type "make the player faster" in AI chat
5. **Play & Test** - Click Play, test your game
6. **Switch to 3D** - Toggle to 3D mode to see your game in 3D
7. **Export** - Export as HTML to share

---

## Architecture

```
PromptPlay/
├── apps/
│   └── desktop/                 # Tauri 2.0 Desktop App
│       ├── src/                 # React Frontend
│       │   ├── components/      # 30+ UI Components
│       │   │   ├── GameCanvas   # 2D game preview
│       │   │   ├── GameCanvas3D # 3D game preview
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
│   │   ├── renderers/           # Canvas2D renderer
│   │   ├── physics/             # Matter.js wrapper
│   │   ├── systems/             # Input, Animation, AI, Particles
│   │   └── tests/               # 284 tests, 80%+ coverage
│   │
│   ├── runtime-3d/              # 3D Game Runtime
│   │   ├── Game3D.ts            # Main orchestrator
│   │   ├── renderers/           # Three.js renderer
│   │   ├── physics/             # Cannon-es wrapper
│   │   ├── systems/             # Physics3D, Input3D, Transform3D
│   │   ├── controls/            # OrbitControls for camera
│   │   └── components/          # 3D-specific components
│   │
│   ├── ai-prompt/               # AI Integration
│   │   └── templates/           # Genre-specific prompts
│   │
│   └── shared-types/            # TypeScript Definitions
│       └── 3d/                  # 3D type definitions
│
└── docs/                        # Documentation
    ├── architecture.md
    ├── user-guide.md
    └── api-reference.md
```

---

## Components

### 2D Components

| Component | Description | Key Properties |
|-----------|-------------|----------------|
| **Transform** | Position & orientation | x, y, rotation, scaleX, scaleY |
| **Velocity** | Movement | vx, vy |
| **Sprite** | Visual appearance | texture, width, height, tint, zIndex |
| **Collider** | Physics shape | type (box/circle), dimensions, isSensor |
| **Input** | Player controls | moveSpeed, jumpForce, canJump |
| **Health** | Damage system | current, max |
| **AIBehavior** | Enemy AI | type (patrol/chase/flee), speed |
| **Animation** | Sprite animation | frameCount, frameDuration, loop |
| **Camera** | View control | zoom, followTarget, shake |
| **ParticleEmitter** | Effects | emitRate, lifetime, colors |

### 3D Components

| Component | Description | Key Properties |
|-----------|-------------|----------------|
| **Transform3D** | 3D Position | x, y, z, rotationX/Y/Z, scaleX/Y/Z |
| **Velocity3D** | 3D Movement | vx, vy, vz, angularX/Y/Z |
| **Mesh** | 3D Geometry | geometry (box/sphere/cylinder), dimensions |
| **Material** | Surface appearance | color, metallic, roughness |
| **Collider3D** | 3D Physics shape | type, width, height, depth, radius |
| **RigidBody3D** | Physics body | type (dynamic/static/kinematic), mass |
| **Input3D** | 3D Player controls | moveSpeed, jumpForce, canJump, isGrounded |
| **Light** | Scene lighting | type (ambient/directional/point), intensity |
| **Camera3D** | 3D Camera | fov, near, far, followTarget |

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
| `F3` | Toggle Debug Overlay |
| `Space` | Jump (in game) |
| `WASD/Arrows` | Move (in game) |

---

## Roadmap

### Completed (v1.0)

- [x] 2D Game Engine (Canvas2D + Matter.js)
- [x] Visual Editor with Inspector
- [x] AI Chat Integration (Claude API)
- [x] Animation Editor & Timeline
- [x] Physics System with Debug Overlay
- [x] Prefab System
- [x] Scene Management
- [x] HTML Export
- [x] 80%+ Test Coverage

### Completed (v1.5)

- [x] 3D Support (Three.js + Cannon-es)
- [x] 3D Physics with Rigid Bodies
- [x] OrbitControls for 3D Camera
- [x] 2D to 3D Conversion
- [x] Ground Detection & Jumping

### Completed (v1.6)

- [x] GLTF/GLB Model Loading
- [x] Lighting & Shadows (configurable)
- [x] JSON Schema with 3D Components
- [x] Game Package Import/Export (.promptplay.json)

### Completed (v2.0)

- [x] Dynamic Template Generation (Save as Template)
- [x] Voice Input for AI Chat (Web Speech API)
- [x] Particle System (fire, smoke, sparkles, explosions, rain, snow, confetti)
- [x] Screenshot Capture (PNG/JPEG/WebP)
- [x] Video Recording (WebM)
- [x] Recent Projects (quick access to recent games)
- [x] Entity Search (Cmd/Ctrl+K to search entities)

### Completed (v2.1)

- [x] Sound/Music Manager (SFX, BGM, ambient audio)
- [x] Audio Component (3D spatial audio, volume, loop)
- [x] Animation Timeline Editor (keyframe animations)
- [x] Tilemap Editor (tile-based level design)
- [x] Tilemap Component (tile-based rendering)

### Completed (v3.0)

- [x] Mobile Export (PWA with touch controls, offline support)
- [x] One-Click Publishing (itch.io, GitHub Pages, HTML export)
- [x] AI Playtesting (automated game analysis and feedback)

### v3.1 - Community & Collaboration

- [ ] Community Marketplace (asset sharing, templates, plugins)
- [ ] Collaborative Editing (real-time multiplayer editing)
- [ ] Advanced AI Game Generation (full game from description)
- [ ] Cloud Save & Sync (automatic backup)
- [ ] User Profiles & Authentication

### v3.2 - Advanced AI

- [ ] AI-Powered Level Design (procedural generation)
- [ ] Smart NPC Dialogue System (dynamic conversations)
- [ ] Procedural Content Generation (dungeons, worlds)
- [ ] AI Art Generation Integration (Stable Diffusion, DALL-E)
- [ ] Voice-to-Game Feature (speak and create)

### v4.0 - Visual Scripting (ComfyUI-Style)

- [ ] Node-Based Editor (ComfyUI-inspired workflow)
- [ ] Visual Logic Builder (connect nodes to create behavior)
- [ ] Motion & Animation Nodes (keyframe, easing, paths)
- [ ] Event System Nodes (triggers, conditions, actions)
- [ ] Custom Node Creation (extend with TypeScript)
- [ ] Shader Graph Editor (visual shader creation)
- [ ] Behavior Trees (AI decision making)

### v4.1 - Professional Tools

- [ ] Advanced Particle Editor (GPU particles)
- [ ] Terrain Editor (3D landscapes)
- [ ] Water & Weather Systems (rain, snow, wind)
- [ ] Day/Night Cycle (dynamic lighting)
- [ ] Spline & Path Editor (curves, rails)
- [ ] Cutscene Editor (cinematic sequences)

### v4.2 - Performance & Polish

- [ ] GPU Instancing (thousands of objects)
- [ ] LOD System (Level of Detail)
- [ ] Occlusion Culling (smart rendering)
- [ ] Asset Streaming (large worlds)
- [ ] Memory Optimization (efficient loading)
- [ ] Profiler & Performance Tools

### v5.0 - Multiplayer & Networking

- [ ] Real-time Multiplayer Support
- [ ] Lobby System (matchmaking rooms)
- [ ] Peer-to-Peer & Server Options
- [ ] Leaderboards & Achievements
- [ ] Cloud Functions (serverless logic)
- [ ] Voice Chat Integration

### v5.1 - Monetization & Analytics

- [ ] In-App Purchase Support
- [ ] Ad Integration (rewarded, banner, interstitial)
- [ ] Analytics Dashboard (player behavior)
- [ ] A/B Testing (experiment with features)
- [ ] Crash Reporting (error tracking)
- [ ] Revenue Tracking

### v6.0 - Extended Platforms

- [ ] Console Export (Switch, PlayStation, Xbox)
- [ ] VR/AR Support (WebXR, Oculus, SteamVR)
- [ ] Steam Integration (achievements, workshop)
- [ ] Mobile App Stores (iOS App Store, Google Play)
- [ ] WebGPU Rendering (next-gen graphics)
- [ ] Native Mobile (React Native, Capacitor)

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
| **2D Rendering** | Canvas2D | Fast 2D graphics |
| **2D Physics** | Matter.js | Realistic 2D physics |
| **3D Rendering** | Three.js | Full 3D graphics |
| **3D Physics** | Cannon-es | Realistic 3D physics |
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

# Build 3D runtime
pnpm build --filter=runtime-3d

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

---

**Built with passion for making game development accessible to everyone.**
