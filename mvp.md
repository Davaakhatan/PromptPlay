# PromptPlay Desktop MVP
## AI-First 2D Game Engine

**Date:** December 30, 2024
**Goal:** Build a Tauri desktop game engine where users create 2D games through AI collaboration
**Developer:** Solo (you)
**Target MVP Timeline:** 13 weeks

---

## Vision

PromptPlay is the first game engine **designed for AI pair programming from the ground up**. Unlike Godot or Unity where AI is an afterthought, PromptPlay makes collaborating with AI as natural as using the engine itself.

**Two Ways to Develop:**

1. **Beginners**: Use visual scene editor + chat with AI
2. **Developers**: Code in Claude Code terminal → auto-reload in engine

**Core Problem Solved:**
- Godot + AI: User asks AI → AI gives code → User manually applies → Friction
- PromptPlay: User asks AI → AI writes files → Engine auto-reloads → Seamless

---

## Architecture

### Desktop Application (Tauri 2.0)

**Why Tauri over Web?**
- Full file system access for real project folders
- File watching for external editor integration
- Native performance
- Small bundle size (3-5MB vs Electron's 100MB+)
- Cross-platform (Windows, macOS, Linux)

**Tech Stack:**

```
Frontend (UI)    → React + TypeScript + Tailwind CSS
Backend (Rust)   → Tauri 2.0 + tokio
Game Runtime     → PixiJS (rendering) + Matter.js (physics)
Code Editor      → Monaco Editor (VSCode in browser)
File Watching    → notify (Rust) / chokidar (Node)
AI Integration   → Anthropic API (Claude)
Build System     → Vite (frontend) + Cargo (Rust)
```

### Game Projects

Users work with **real folders on disk** (not browser storage):

```
my-platformer/              # User's game project
├── .promptplay/
│   ├── project.json        # Project metadata
│   └── chat-history.json   # AI conversation
├── game.json               # ECS game specification
├── src/                    # Custom TypeScript code
│   ├── components/
│   ├── systems/
│   └── main.ts
└── assets/
    ├── sprites/
    └── sounds/
```

### ECS Architecture (Reuse Existing!)

All existing packages (`ecs-core`, `runtime-2d`, `shared-types`) will be imported unchanged!

**Components:**
- Transform, Velocity, Sprite, Collider, Input, Health, AIBehavior

**Systems:**
- PhysicsSystem, InputSystem, CollisionSystem, RenderSystem

**Game Spec:**
- Declarative JSON defines entities, components, systems
- Custom TypeScript extends functionality

---

## MVP Scope

### Phase 1 MVP (Weeks 1-3): Basic Desktop App
**Goal:** Desktop app that can load and run games

- ✅ Tauri app with React UI
- ✅ File system operations (open/create project)
- ✅ Game canvas with PixiJS
- ✅ Load existing `game.json` specs
- ✅ Play/pause/reset controls
- ✅ Monaco code editor for TypeScript files

**Success Metric:** Can open a platformer project and play it

### Phase 2 MVP (Weeks 4-5): Hot Reload
**Goal:** Support external editors like Claude Code

- ✅ File watcher detects code changes
- ✅ Auto-reload game when files change
- ✅ TypeScript compilation (esbuild)
- ✅ Execute custom components/systems
- ✅ Error overlay with stack traces

**Success Metric:** Edit code in Claude Code → game updates instantly

### Phase 3 MVP (Weeks 6-8): Visual Editor
**Goal:** Godot-quality scene editor

- ✅ Scene tree (hierarchical entity list)
- ✅ Inspector panel (edit components)
- ✅ Click to select entities
- ✅ Drag-and-drop from asset browser
- ✅ Save changes to `game.json`

**Success Metric:** Create a simple platformer without code

### Phase 4 MVP (Weeks 9-11): AI Integration
**Goal:** AI pair programming built-in

- ✅ Chat panel in UI
- ✅ Anthropic API client (Rust)
- ✅ AI reads project files
- ✅ AI suggests code changes (show diffs)
- ✅ User approves → files update
- ✅ Chat history persists

**Success Metric:** Chat "add double-jump" → AI implements it → works

### Phase 5 MVP (Weeks 12-13): Polish & Export
**Goal:** Ready for beta users

- ✅ Export games as HTML files
- ✅ Keyboard shortcuts (Ctrl+S, Ctrl+O, etc.)
- ✅ Welcome screen with templates
- ✅ Sample projects (platformer, shooter, puzzle)
- ✅ Professional UI/UX

**Success Metric:** Share a playable game link

---

## Success Criteria

Desktop PromptPlay v1.0 MVP is done when:

1. ✅ User can create new game project
2. ✅ Visual editor works (drag-drop, inspector)
3. ✅ Code editor works (Monaco, TypeScript)
4. ✅ File watcher works (Claude Code integration)
5. ✅ AI chat works (modify game via conversation)
6. ✅ Can export game as HTML
7. ✅ Runs at 60 FPS with <50 entities
8. ✅ 3 demo genres work (platformer, shooter, puzzle)

---

## Non-Goals for MVP

**Future Features (Post-MVP):**
- 3D graphics (Three.js)
- Multiplayer/networking
- Mobile deployment (Capacitor)
- Visual scripting (node editor)
- Animation timeline
- Particle effects
- Sound/music editor
- Sprite editor
- Tilemap editor
- Save/load game state

**Scope Discipline:**
MVP focuses on **core workflow**: AI collaboration + file watching + visual editing. Everything else is post-MVP.

---

## Migration from Web MVP

**Existing Code (Reusable):**
- `packages/ecs-core` ✅ Copy unchanged
- `packages/runtime-2d` ✅ Copy unchanged
- `packages/shared-types` ✅ Copy unchanged
- `packages/ai-prompt` ⚠️ Adapt to Rust Anthropic client

**Rebuild from Scratch:**
- `apps/editor` → New Tauri app
- UI components → React (but desktop-specific)
- API routes → Rust IPC commands

**Estimated Migration Effort:** 2-3 weeks (Phase 1)

---

## Development Environment

### Requirements

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (install via rustup)
- Tauri CLI (`cargo install tauri-cli`)

### Setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Create new Tauri app
npm create tauri-app@latest

# Install dependencies
pnpm install

# Run dev
pnpm tauri dev

# Build for production
pnpm tauri build
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tauri learning curve | Medium | Follow official docs, start simple |
| Rust/TypeScript bridge complexity | Medium | Use Tauri's built-in IPC, avoid complex data |
| File watching performance | Low | Use debouncing, limit watch scope |
| TypeScript compilation speed | Low | Use esbuild (fast), cache builds |
| AI API costs | Low | Rate limiting, user brings own key |
| Cross-platform bugs | Medium | Test on all platforms weekly |

---

## Timeline Summary

```
Weeks 1-3:  Tauri foundation + game runtime
Weeks 4-5:  File watching + hot reload
Weeks 6-8:  Visual scene editor
Weeks 9-11: AI chat integration
Weeks 12-13: Polish + export

Total: 13 weeks to MVP
```

---

## Post-MVP Roadmap (Future)

**Phase 2 (Months 4-6):**
- 3D support (Three.js)
- Advanced AI features (code review, debugging)
- Performance profiling tools
- Plugin system

**Phase 3 (Months 7-12):**
- Multiplayer framework
- Mobile export (Capacitor)
- Steam/itch.io publishing
- Asset store

**Phase 4 (Year 2):**
- Visual scripting
- Animation editor
- Sound designer
- Community marketplace

---

## Metrics for Success

**Usage Metrics:**
- Weekly active users
- Games created per user
- AI chat interactions per session
- Export rate (% users who export games)

**Quality Metrics:**
- Engine performance (FPS in benchmark scenes)
- Time to first playable game
- User satisfaction (NPS score)
- Bug reports per release

**Business Metrics (Future):**
- Conversion to paid plans
- Asset store transactions
- Enterprise licenses

---

## Conclusion

PromptPlay Desktop MVP focuses on **one thing done exceptionally well**: AI-collaborative 2D game development. By constraining scope and building on proven technologies (Tauri, React, PixiJS), we can ship a polished v1.0 in 13 weeks.

The key innovation isn't flashy features—it's making AI pair programming feel **native** instead of tacked on.
