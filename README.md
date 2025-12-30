# PromptPlay

AI-powered game engine where natural language prompts become playable 2D/3D games.

## Project Overview

PromptPlay is a web-first, modular, ECS-based game engine that lets users create playable games (2D, 3D, FPS/TPS) via natural language prompts. Built with TypeScript, Next.js, and powered by ChatGPT API for game generation.

## Architecture

- **ECS Core**: Entity Component System using bitecs.ts
- **2D Runtime**: PixiJS rendering + Matter.js physics
- **AI Integration**: ChatGPT API for prompt-to-game JSON generation
- **Editor**: Next.js web dashboard for game creation

## Project Structure

```text
PromptPlay/
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── ecs-core/         # ECS components, systems, world management
│   ├── runtime-2d/       # PixiJS + Matter.js integration
│   └── ai-prompt/        # ChatGPT API client + templates
└── apps/
    └── editor/           # Next.js game creation dashboard
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- ChatGPT API key

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start editor in development mode
pnpm --filter editor dev
```

## Development Status

### Week 1: Core ECS & Foundation ✅

- [x] Monorepo setup with pnpm workspaces
- [x] TypeScript configuration
- [x] ECS core with bitecs.ts
- [x] Core components (Transform, Velocity, Sprite, Collider, Input, Health, AIBehavior)
- [x] World management class
- [x] Serializer/Deserializer for JSON specs
- [x] Unit tests

### Week 2: Runtime & AI Integration ✅

- [x] PixiJS 2D rendering integration
- [x] Matter.js physics integration
- [x] Game loop and input manager
- [x] ChatGPT API client (OpenAI SDK)
- [x] Prompt templates for genres (platformer, shooter, puzzle)
- [x] Spec validation (Zod)

### Week 3: Editor & Demos ✅

- [x] Next.js editor application with unique cyberpunk/synthwave UI
- [x] Prompt input UI with genre selector
- [x] Game canvas component with Runtime2D integration
- [x] Spec editor for JSON editing
- [x] Control panel (play/pause/reset)
- [x] Save/load functionality with localStorage
- [x] API route for ChatGPT generation
- [x] Demo games (platformer, shooter, puzzle)

## Technology Stack

- **Frontend**: TypeScript, Next.js, React
- **Rendering**: PixiJS (2D), Three.js (3D planned)
- **Physics**: Matter.js (2D), Cannon.js (3D planned)
- **ECS**: bitecs.ts
- **AI**: ChatGPT API
- **Build**: Turbo, pnpm workspaces
- **Testing**: Vitest

## License

MIT

## Contributing

This is a solo project. Contributions and feedback are welcome!
