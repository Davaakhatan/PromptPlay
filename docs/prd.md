# PromptPlay - Product Requirements Document

## Executive Summary

**Product Name:** PromptPlay
**Version:** 3.0.0
**Date:** January 2025
**Status:** Publishing & Distribution Release

PromptPlay is an **AI-first desktop game engine** that enables users to create 2D games through seamless AI collaboration. Unlike traditional engines where AI assistance is an afterthought, PromptPlay is built from the ground up for AI pair programming. Users can develop games through visual editing, direct coding with AI in the terminal (Claude Code), or conversational development with the built-in AI chat panel.

---

## Product Vision

### Mission
**Make AI-collaborative game development feel native, not tacked on.**

PromptPlay solves the friction of using AI with traditional game engines. In Godot or Unity, users ask AI for code, then manually copy-paste it. In PromptPlay, AI writes code directly to the project files, and the engine instantly reloads—zero friction.

### Target Audience

**Primary: Indie Game Developers (18-35)**
- Comfortable with code
- Want rapid iteration
- Use AI tools (ChatGPT, Claude, GitHub Copilot)
- Frustrated with slow iteration cycles in Unity/Godot

**Secondary: Beginners (16-25)**
- Want to learn game development
- Prefer visual tools + AI guidance
- Need gentle learning curve

**Tertiary: Educators (25-50)**
- Teaching game design or programming
- Need tools that work reliably
- Want students to focus on concepts, not boilerplate

### Success Metrics

**Engagement:**
- Users create first playable game within 10 minutes
- 70%+ retention after first week
- Average 5+ games created per user

**Quality:**
- Engine runs at 60 FPS with 50+ entities
- 95%+ of AI-generated code compiles successfully
- <5% crash rate

**Business (Future):**
- 1,000 MAU within 6 months
- 20% conversion to paid plans (cloud hosting, advanced AI)
- 50+ NPS score

---

## Core Features

### 1. AI Game Generation
**Priority:** P0 (Critical)
**Status:** ✅ Complete

**Description:**
Transform natural language prompts into playable games using ChatGPT API integration.

**User Flow:**
1. User enters text prompt (e.g., "platformer where a fox collects coins")
2. Optionally selects genre (platformer, shooter, puzzle) or auto-detect
3. System sends prompt to ChatGPT API with game generation instructions
4. API returns JSON game specification matching ECS schema
5. Game loads automatically and begins playing

**Technical Requirements:**
- OpenAI SDK integration for ChatGPT API calls
- Genre-specific prompt templates (platformer, shooter, puzzle)
- JSON schema validation using Zod
- Retry logic for failed generations
- Error handling for malformed responses

**Acceptance Criteria:**
- ✅ User can submit text prompt via textarea
- ✅ System generates valid JSON game spec
- ✅ Generated game loads and runs at 60 FPS
- ✅ Support for all 3 demo genres
- ✅ Error messages display for failed generations

---

### 2. Game Canvas & Runtime
**Priority:** P0 (Critical)
**Status:** ✅ Complete

**Description:**
Real-time 2D game rendering and physics simulation using PixiJS and Matter.js.

**Technical Stack:**
- **Rendering:** PixiJS v7 for 2D sprite rendering
- **Physics:** Matter.js for 2D physics simulation
- **Game Loop:** Fixed timestep at 60 FPS
- **Input:** Keyboard (WASD/Arrows) and mouse support

**Features:**
- 800x600 game canvas with rounded corners
- Synchronized rendering between ECS and PixiJS
- Physics body creation from collider components
- Collision detection and response
- Support for static and dynamic entities

**Acceptance Criteria:**
- ✅ Games render at 60 FPS
- ✅ Physics simulation works correctly
- ✅ Keyboard input controls player movement
- ✅ Collisions trigger appropriate events
- ✅ Canvas displays in responsive layout

---

### 3. Game Controls Panel
**Priority:** P0 (Critical)
**Status:** ✅ Complete

**Description:**
User controls for game playback: play, pause, and reset.

**Features:**
- **Play Button:** Start or resume game simulation
- **Pause Button:** Pause game simulation
- **Reset Button:** Reload current game spec from beginning

**Behavior:**
- Controls disabled when no game loaded
- Play/Pause toggle based on game state
- Reset maintains current spec but reloads entities

**Acceptance Criteria:**
- ✅ Play button starts paused game
- ✅ Pause button stops running game
- ✅ Reset button reloads game from spec
- ✅ Controls disabled appropriately

---

### 4. Spec Editor
**Priority:** P1 (High)
**Status:** ✅ Complete

**Description:**
JSON editor for viewing and manually editing game specifications.

**Features:**
- Syntax-highlighted JSON textarea
- Real-time JSON validation
- Error display for invalid JSON
- Statistics display (entity count, system count, size)
- Auto-sync with game canvas on valid edits

**Technical Details:**
- Uses monospace font for code editing
- Validates JSON on every keystroke
- Updates game immediately when JSON becomes valid
- Shows parse errors inline

**Acceptance Criteria:**
- ✅ Displays formatted JSON for loaded games
- ✅ Shows validation errors for invalid JSON
- ✅ Updates game when user edits spec
- ✅ Displays entity/system statistics

---

### 5. Save/Load System
**Priority:** P1 (High)
**Status:** ✅ Complete

**Description:**
Local persistence of game specifications using browser localStorage.

**Features:**
- **Save Dialog:** Enter name for current game spec
- **Load Dialog:** Browse and load saved games
- **Delete:** Remove saved games from localStorage

**Storage Schema:**
```
Key: game_<user_provided_name>
Value: JSON.stringify(GameSpec)
```

**Acceptance Criteria:**
- ✅ User can save current game with custom name
- ✅ User can load previously saved games
- ✅ User can delete saved games
- ✅ Save disabled when no game loaded
- ✅ Games persist across browser sessions

---

### 6. UI/UX Design System
**Priority:** P0 (Critical)
**Status:** ✅ Complete (Redesigned Dec 2024)

**Design Philosophy:**
Minimalist, professional interface with clean typography and subtle interactions. No emojis, no flashy colors, no cyberpunk aesthetics.

**Color Palette:**
- **Primary:** #2563eb (Blue)
- **Backgrounds:** White, #f9fafb (Gray 50)
- **Text:** #111827 (Gray 900), #6b7280 (Gray 500)
- **Borders:** #e5e7eb (Gray 200)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)

**Typography:**
- **Sans Serif:** Inter (300, 400, 500, 600, 700)
- **Monospace:** JetBrains Mono (400, 500)

**Spacing System:**
- Base unit: 4px (0.25rem)
- Scale: 1, 2, 3, 4, 5, 6, 8, 10, 12 (multiplied by base)

**Components:**
- Clean buttons with subtle shadows
- Minimal input fields with focus states
- Card-based layouts with rounded corners
- Badge system for genre tags

**Acceptance Criteria:**
- ✅ No emojis in UI
- ✅ Professional color palette applied
- ✅ Consistent spacing and typography
- ✅ Clean, minimalist aesthetic throughout

---

## Technical Architecture

### Monorepo Structure
```
GameDev/
├── packages/
│   ├── ecs-core/           # Entity Component System
│   ├── runtime-2d/         # PixiJS + Matter.js runtime
│   ├── ai-prompt/          # OpenAI API integration
│   └── shared-types/       # Shared TypeScript types
└── apps/
    └── editor/             # Next.js web application
```

### ECS Architecture

**Components (7 total):**
- Transform: Position, rotation, scale
- Velocity: Linear velocity (vx, vy)
- Sprite: Visual representation
- Collider: Physics collision shape
- Input: Player input handling
- Health: Entity health tracking
- AIBehavior: AI movement patterns

**Systems:**
- PhysicsSystem: Apply gravity and velocity
- InputSystem: Process keyboard/mouse input
- CollisionSystem: Handle collision events
- RenderSystem: Sync ECS to PixiJS sprites

**Game Spec Format:**
```json
{
  "version": "1.0",
  "metadata": {
    "title": "Game Name",
    "genre": "platformer|shooter|puzzle",
    "description": "Game description"
  },
  "config": {
    "gravity": { "x": 0, "y": 1 },
    "worldBounds": { "width": 800, "height": 600 }
  },
  "entities": [
    {
      "name": "entity_name",
      "components": { /* component data */ },
      "tags": ["tag1", "tag2"]
    }
  ],
  "systems": ["physics", "input", "collision", "render"]
}
```

---

## Demo Games

### 1. Platformer
**Theme:** Blue fox collecting golden coins
**Mechanics:**
- Horizontal movement (A/D keys)
- Jump mechanic (Space)
- Gravity and platform collision
- Collectible coins

**Entities:**
- Player (fox with jump controls)
- Ground platform
- 3 floating platforms
- 3 collectible coins

---

### 2. Shooter
**Theme:** Space shooter fighting aliens
**Mechanics:**
- 8-directional movement (WASD)
- Mouse aiming
- Enemy AI (chase behavior)
- Health system

**Entities:**
- Player spaceship
- 3 enemy aliens with chase AI
- Arena boundary walls

---

### 3. Puzzle
**Theme:** Sokoban-style box pushing
**Mechanics:**
- Grid-based movement
- Box pushing
- Target locations
- Win condition

**Entities:**
- Player character
- 3 pushable boxes
- 3 target locations
- Boundary walls

---

## Development Phases

### Phase 1: Foundation (Complete ✅)
- [x] Monorepo setup with pnpm workspaces
- [x] ECS core implementation
- [x] 2D runtime with PixiJS + Matter.js
- [x] OpenAI API integration
- [x] Next.js editor UI
- [x] 3 demo games
- [x] UI redesign (minimalist)

### Phase 2: Enhancement (Future)
- [ ] Proper icon system instead of text labels
- [ ] Syntax highlighting for JSON editor
- [ ] Undo/redo for spec editing
- [ ] Export games as standalone HTML files
- [ ] More game templates (RPG, racing, etc.)
- [ ] Visual asset library (sprites, sounds)
- [ ] Multiplayer support
- [ ] Custom component creation

### Phase 3: Platform (Future)
- [ ] User authentication
- [ ] Cloud save/load
- [ ] Game sharing via URLs
- [ ] Community gallery
- [ ] Remix feature
- [ ] Analytics dashboard

---

## Non-Functional Requirements

### Performance
- Games must run at 60 FPS on modern browsers
- API response time < 5 seconds for game generation
- UI interactions < 100ms response time

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Accessibility
- Keyboard navigation support
- Focus states on interactive elements
- Semantic HTML structure
- ARIA labels where appropriate

### Security
- API keys stored in environment variables
- Input validation on all user text
- XSS prevention in spec editor
- CSP headers configured

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ChatGPT generates invalid JSON | High | Zod validation + retry logic |
| Physics simulation performance issues | Medium | Optimize collision detection, limit entity count |
| Browser compatibility issues | Medium | Polyfills, feature detection |
| API cost overruns | Low | Rate limiting, usage monitoring |

---

## Success Criteria

### MVP Launch Checklist
- [x] All 3 demo genres work end-to-end
- [x] Users can generate games from prompts
- [x] Games run at 60 FPS
- [x] Spec editing works in real-time
- [x] Save/load persists across sessions
- [x] UI is professional and minimalist
- [x] Build completes without errors

### Post-Launch Metrics
- User retention: 40%+ return within 7 days
- Average session duration: 10+ minutes
- Generated games success rate: 90%+
- User satisfaction (NPS): 50+

---

## Appendix

### API Configuration
```bash
# .env.local
OPENAI_API_KEY=sk-...
```

### Build Commands
```bash
# Development
pnpm dev

# Production build
pnpm build

# Run tests
pnpm test
```

### Resources
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [PixiJS Documentation](https://pixijs.com/)
- [Matter.js Documentation](https://brm.io/matter-js/)
- [bitecs Documentation](https://github.com/NateTheGreatt/bitECS)
