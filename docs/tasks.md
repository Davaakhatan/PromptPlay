# PromptPlay Desktop - Task Breakdown

## Overview
This document provides a comprehensive task breakdown for the PromptPlay Desktop project (Tauri 2.0), organized by work package and priority.

**Status:** Architecture Pivot to Desktop (December 2024)
**Previous Version:** Web-based MVP (Complete)
**Current Version:** Tauri Desktop Engine

---

## Migration Status

### Web MVP (Complete ✅)
The initial web-based prototype is complete with all core features:
- AI game generation via prompts
- 2D runtime (PixiJS + Matter.js)
- Game controls and spec editor
- Save/load system
- Minimalist UI redesign

### Desktop Pivot (In Progress ⏳)
Moving to Tauri desktop architecture to enable:
- File system access for real project folders
- External editor integration (Claude Code)
- Built-in AI chat panel
- Visual scene editor
- Professional game engine UX

---

## Work Package 1: Core Infrastructure (Web MVP) ✅ COMPLETE

### WP1.1: Monorepo Setup ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Initialize Git repository
- [x] Create pnpm workspace configuration
- [x] Set up Turbo for build orchestration
- [x] Configure root package.json with scripts
- [x] Set up base TypeScript configuration
- [x] Configure ESLint and Prettier
- [x] Create directory structure for packages and apps

**Deliverables:**
- Working monorepo with 4 packages + 1 app
- Build system configured with Turbo
- Shared TypeScript configuration

---

### WP1.2: Shared Types Package ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Define GameSpec interface
- [x] Define EntitySpec interface
- [x] Define ComponentSpec interfaces
- [x] Define ISystem interface
- [x] Export all shared types
- [x] Configure package.json for publishing

**Deliverables:**
- @promptplay/shared-types package
- TypeScript types for all ECS data structures

---

## Work Package 2: ECS Core ✅ COMPLETE

### WP2.1: Component Definitions ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Implement Transform component (x, y, rotation, scale)
- [x] Implement Velocity component (vx, vy)
- [x] Implement Sprite component (texture, size, tint)
- [x] Implement Collider component (type, size, sensor)
- [x] Implement Input component (moveSpeed, jumpForce)
- [x] Implement Health component (current, max)
- [x] Implement AIBehavior component (type, speed, detection)

**Deliverables:**
- 7 bitecs component definitions
- Component registration system

---

### WP2.2: World Management ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Create World class with bitecs integration
- [x] Implement entity creation/deletion
- [x] Implement tag system for entity queries
- [x] Implement system registration
- [x] Implement update loop management
- [x] Add texture registry for sprite mapping
- [x] Unit tests for World class

**Deliverables:**
- World management class
- Entity lifecycle management
- Tag-based entity queries

---

### WP2.3: Serialization ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Implement Serializer (World → JSON)
- [x] Implement Deserializer (JSON → World)
- [x] Handle component data transformation
- [x] Handle tag assignment
- [x] Validate game spec schema
- [x] Unit tests for serialization

**Deliverables:**
- Bidirectional JSON serialization
- Schema validation

---

## Work Package 3: 2D Runtime ✅ COMPLETE

### WP3.1: PixiJS Integration ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Create PixiRenderer class
- [x] Implement sprite creation from ECS Sprite components
- [x] Implement transform sync (ECS → PixiJS)
- [x] Implement sprite lifecycle management
- [x] Handle texture loading (placeholder colored rectangles)
- [x] Optimize rendering performance

**Deliverables:**
- PixiRenderer with ECS sync
- Sprite rendering at 60 FPS

---

### WP3.2: Matter.js Physics ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Create MatterPhysics class
- [x] Implement body creation from Collider components
- [x] Implement physics simulation step
- [x] Implement position sync (Matter → ECS)
- [x] Handle static vs dynamic bodies
- [x] Implement collision event handling

**Deliverables:**
- MatterPhysics integration
- Collision detection and response

---

### WP3.3: Game Loop ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Implement GameLoop class
- [x] Fixed timestep at 60 FPS
- [x] System update orchestration
- [x] Delta time calculation
- [x] Frame skipping for performance

**Deliverables:**
- Stable 60 FPS game loop
- Fixed timestep simulation

---

### WP3.4: Input System ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Create InputManager class
- [x] Keyboard event listeners (WASD, Arrows, Space)
- [x] Mouse event listeners (position, click)
- [x] Implement InputSystem (ECS system)
- [x] Apply input to entity velocity
- [x] Handle jump mechanics with ground detection

**Deliverables:**
- InputManager for event handling
- InputSystem for ECS integration

---

### WP3.5: Core Systems ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Implement PhysicsSystem (gravity, velocity integration)
- [x] Implement CollisionSystem (event handling, collectibles)
- [x] Implement RenderSystem (ECS → PixiJS sync)
- [x] Test system integration

**Deliverables:**
- 3 core ECS systems
- System lifecycle management

---

### WP3.6: Runtime2D Main Class ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Create Runtime2D orchestration class
- [x] Implement loadGameSpec() method
- [x] Implement start() method
- [x] Implement pause() method
- [x] Implement destroy() method
- [x] Integrate all subsystems (PixiJS, Matter, ECS, Input)

**Deliverables:**
- Runtime2D public API
- Full subsystem integration

---

## Work Package 4: AI Integration ✅ COMPLETE

### WP4.1: OpenAI Client ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Install OpenAI SDK
- [x] Create OpenAIClient class
- [x] Implement generateGameSpec() method
- [x] Configure API key from environment
- [x] Implement retry logic
- [x] Error handling and logging

**Deliverables:**
- OpenAIClient class
- API integration

---

### WP4.2: Prompt Templates ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Create base system prompt template
- [x] Create platformer genre template
- [x] Create shooter genre template
- [x] Create puzzle genre template
- [x] Document ECS JSON schema in prompts
- [x] Test prompt effectiveness

**Deliverables:**
- 4 prompt templates
- Genre-specific guidance

---

### WP4.3: Validation ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Install Zod for schema validation
- [x] Create Zod schemas for GameSpec
- [x] Create Zod schemas for components
- [x] Implement SpecValidator class
- [x] Handle validation errors gracefully

**Deliverables:**
- Zod validation schemas
- SpecValidator utility

---

## Work Package 5: Editor Application ✅ COMPLETE

### WP5.1: Next.js Setup ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Initialize Next.js 14 with App Router
- [x] Configure TypeScript
- [x] Set up module path aliases
- [x] Configure environment variables
- [x] Install dependencies

**Deliverables:**
- Next.js application structure
- Development environment

---

### WP5.2: UI Components - Phase 1 ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Create PromptInput component
- [x] Create GameCanvas component
- [x] Create ControlPanel component
- [x] Create SpecEditor component
- [x] Create SaveLoadPanel component
- [x] Component CSS modules (cyberpunk style)

**Deliverables:**
- 5 React components
- Initial styling

---

### WP5.3: Page Layout ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Create main page.tsx
- [x] Implement state management (gameSpec, isPlaying)
- [x] Implement tab switching (Canvas/Spec)
- [x] Implement component integration
- [x] Responsive grid layout

**Deliverables:**
- Main application page
- Component orchestration

---

### WP5.4: API Route ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Create /api/generate route
- [x] Integrate OpenAIClient
- [x] Handle request/response
- [x] Error handling
- [x] Validate API key configuration

**Deliverables:**
- Working API endpoint
- Frontend-backend integration

---

### WP5.5: UI Redesign - Minimalist ✅
**Priority:** P0 | **Effort:** 2 days | **Status:** Complete

- [x] Remove all emojis from UI
- [x] Create professional color palette
- [x] Update globals.css with new design system
- [x] Update page.module.css
- [x] Update all component CSS modules
- [x] Change canvas background color
- [x] Test and validate new design

**Deliverables:**
- Minimalist professional UI
- No emojis, clean design
- Consistent design system

---

## Work Package 6: Demo Games ✅ COMPLETE

### WP6.1: Platformer Demo ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Create platformer.json spec
- [x] Player entity with jump controls
- [x] Ground and platform entities
- [x] Collectible coin entities
- [x] Test gameplay loop

**Deliverables:**
- platformer.json in /public/demos

---

### WP6.2: Shooter Demo ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Create shooter.json spec
- [x] Player entity with 8-directional movement
- [x] Enemy entities with chase AI
- [x] Boundary wall entities
- [x] Test AI behavior

**Deliverables:**
- shooter.json in /public/demos

---

### WP6.3: Puzzle Demo ✅
**Priority:** P0 | **Effort:** 1 day | **Status:** Complete

- [x] Create puzzle.json spec
- [x] Player entity with grid movement
- [x] Pushable box entities
- [x] Target location entities
- [x] Test puzzle mechanics

**Deliverables:**
- puzzle.json in /public/demos

---

## Work Package 7: Testing & Polish ⏳ IN PROGRESS

### WP7.1: Unit Tests
**Priority:** P1 | **Effort:** 3 days | **Status:** Partial

- [x] ECS core tests (basic)
- [ ] Serialization tests (comprehensive)
- [ ] Runtime tests
- [ ] Component tests
- [ ] System tests
- [ ] Achieve 80%+ code coverage

**Deliverables:**
- Comprehensive test suite
- CI/CD integration

---

### WP7.2: Integration Tests
**Priority:** P1 | **Effort:** 2 days | **Status:** Not Started

- [ ] End-to-end game generation flow
- [ ] Save/load functionality
- [ ] Spec editing and validation
- [ ] Game playback controls

**Deliverables:**
- E2E test suite using Playwright

---

### WP7.3: Manual Testing
**Priority:** P0 | **Effort:** 2 days | **Status:** Partial

- [x] Test all 3 demo games
- [x] Test prompt-to-game flow
- [ ] Test edge cases (invalid JSON, API errors)
- [ ] Cross-browser testing
- [ ] Performance profiling

**Deliverables:**
- Test report
- Bug fixes

---

### WP7.4: Documentation
**Priority:** P1 | **Effort:** 2 days | **Status:** In Progress

- [x] README.md for root
- [x] Package-specific READMEs
- [x] PRD document
- [x] Architecture document
- [x] Task breakdown
- [ ] API documentation
- [ ] User guide

**Deliverables:**
- Complete documentation set

---

## Future Enhancements (Phase 2+)

### Icon System
**Priority:** P2 | **Effort:** 3 days

- [ ] Research icon library (Lucide, Heroicons)
- [ ] Install icon package
- [ ] Replace text labels with icons
- [ ] Update button components
- [ ] Update UI components

---

### Syntax Highlighting
**Priority:** P2 | **Effort:** 2 days

- [ ] Install Monaco Editor or CodeMirror
- [ ] Integrate with SpecEditor component
- [ ] Configure JSON syntax highlighting
- [ ] Add line numbers
- [ ] Add error markers

---

### Undo/Redo
**Priority:** P2 | **Effort:** 3 days

- [ ] Implement history stack for spec edits
- [ ] Add undo/redo buttons
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- [ ] Test history management

---

### Export Standalone Games
**Priority:** P2 | **Effort:** 5 days

- [ ] Create standalone HTML template
- [ ] Bundle runtime and game spec
- [ ] Generate downloadable ZIP file
- [ ] Test exported games

---

### Visual Asset Library
**Priority:** P2 | **Effort:** 10 days

- [ ] Design asset management system
- [ ] Create sprite upload UI
- [ ] Integrate sprites with runtime
- [ ] Sound effect support
- [ ] Asset browser component

---

## Task Dependencies

```
WP1 (Monorepo) → WP2 (ECS) → WP3 (Runtime) → WP5 (Editor)
                              ↓
                            WP4 (AI) → WP5.4 (API Route)
                              ↓
                            WP6 (Demos)
                              ↓
                            WP7 (Testing)
```

---

## Effort Summary

| Work Package | Estimated Days | Actual Days | Status |
|--------------|----------------|-------------|--------|
| WP1: Infrastructure | 2 | 2 | ✅ Complete |
| WP2: ECS Core | 7 | 7 | ✅ Complete |
| WP3: 2D Runtime | 13 | 13 | ✅ Complete |
| WP4: AI Integration | 5 | 5 | ✅ Complete |
| WP5: Editor App | 8 | 8 | ✅ Complete |
| WP6: Demo Games | 3 | 3 | ✅ Complete |
| WP7: Testing | 7 | 2 | ⏳ In Progress |
| **Total** | **45 days** | **40 days** | **89% Complete** |

---

## Risk Register

| Task | Risk | Mitigation |
|------|------|------------|
| WP4.1 | OpenAI API rate limits | Implement exponential backoff |
| WP3.2 | Physics performance | Optimize collision detection |
| WP5.5 | Design inconsistency | Use design tokens from globals.css |
| WP7.1 | Low test coverage | Allocate dedicated testing time |

---

## Work Package 8: Tauri Desktop Foundation ✅ COMPLETE

### WP8.1: Tauri Setup & Project Structure ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Install Rust toolchain (rustup)
- [x] Install Tauri CLI (`cargo install tauri-cli`)
- [x] Initialize new Tauri app with React + TypeScript
- [x] Configure Vite + Tailwind CSS
- [x] Set up monorepo integration with existing packages
- [x] Create basic window layout (Scene | Code | Inspector)
- [x] Test Tauri app runs on macOS

**Deliverables:**
- Working Tauri desktop application
- React frontend with three-panel layout
- Existing packages integrated via imports

---

### WP8.2: File System Operations (Rust IPC) ✅
**Priority:** P0 | **Effort:** 4 days | **Status:** Complete

- [x] Implement `open_project(path)` command
- [x] Implement `create_project(name, location)` command
- [x] Implement `read_file(path)` command
- [x] Implement `write_file(path, content)` command
- [x] Implement `list_directory(path)` command
- [x] Create FileTree component (React)
- [x] Test project folder operations

**Deliverables:**
- Rust IPC commands for file operations
- File tree UI component
- Open/create project workflows

---

### WP8.3: Game Runtime Integration ✅
**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Copy packages/ from web MVP (ecs-core, runtime-2d, shared-types)
- [x] Configure package imports in Tauri frontend
- [x] Create GameCanvas component with PixiJS
- [x] Integrate Runtime2D class
- [x] Load game.json from project folder
- [x] Implement play/pause/reset controls
- [x] Test with platformer demo

**Deliverables:**
- Game runtime working in desktop app
- Can load and play game.json specs

---

### WP8.4: Monaco Code Editor Integration ✅
**Priority:** P0 | **Effort:** 4 days | **Status:** Complete

- [x] Install @monaco-editor/react
- [x] Create CodeEditor component with tabs
- [x] Configure TypeScript language support
- [x] Implement file editing workflow
- [x] Sync editor with file tree selection
- [x] Add keyboard shortcuts (Ctrl+S save)
- [x] Test editing TypeScript files

**Deliverables:**
- Monaco editor integrated
- Can edit and save TypeScript files
- Tab-based multi-file editing

---

## Work Package 9: Hot Reload System ✅ COMPLETE

### WP9.1: File Watcher (Rust) ✅

**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Implement file watcher with notify crate
- [x] Watch project directory recursively
- [x] Detect changes to game.json, src/\*\*/\*.ts, assets/\*
- [x] Emit IPC events to frontend on file changes
- [x] Add debouncing (300ms) to prevent spam
- [x] Test with external editor (VSCode, Claude Code)

**Deliverables:**
- File watcher detecting external changes
- IPC events sent to frontend

---

### WP9.2: Auto-Reload System ✅

**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Frontend listens to file-changed events
- [x] Reload game runtime on game.json changes
- [x] Reload game on TypeScript file changes
- [x] Preserve game state when possible
- [x] Show "Reloading..." indicator
- [x] Display errors on failed reload

**Deliverables:**
- Seamless auto-reload on file changes
- Works with Claude Code terminal workflow

---

### WP9.3: TypeScript Compilation
**Priority:** P0 | **Effort:** 4 days | **Status:** Not Started

- [ ] Integrate esbuild or swc for TS compilation
- [ ] Compile src/ directory to JavaScript
- [ ] Bundle with game runtime
- [ ] Handle compilation errors gracefully
- [ ] Display errors in UI overlay
- [ ] Cache builds for performance

**Deliverables:**
- Custom TypeScript code compiles and runs
- Error reporting in UI

---

## Work Package 10: Visual Scene Editor ✅ COMPLETE

### WP10.1: Scene Tree Component ✅

**Priority:** P0 | **Effort:** 4 days | **Status:** Complete

- [x] Create SceneTree component (left panel)
- [x] Display hierarchical entity list from game.json
- [x] Implement entity selection (click to select)
- [x] Sync selection with game canvas
- [x] Add/delete entity buttons
- [x] Duplicate entity functionality

**Deliverables:**
- Scene tree UI matching Godot quality
- Entity selection working

---

### WP10.2: Inspector Panel ✅

**Priority:** P0 | **Effort:** 5 days | **Status:** Complete

- [x] Create Inspector component (right panel)
- [x] Display selected entity's components
- [x] Edit Transform (x, y, rotation, scale) with sliders
- [x] Edit Sprite (texture dropdown, size, tint color picker)
- [x] Edit Collider (type dropdown, size)
- [x] Edit Input, Health, AIBehavior components
- [x] Tag management (add/remove tags)
- [x] Save changes back to game.json
- [x] Auto-reload game on component changes

**Deliverables:**
- Visual component editor with color pickers, sliders, dropdowns
- Real-time game updates on property changes

---

### WP10.3: Canvas Entity Selection ✅

**Priority:** P1 | **Effort:** 3 days | **Status:** Complete

- [x] Click entities in game canvas to select
- [x] Highlight selected entity with bounding box
- [x] Sync selection with scene tree
- [x] Show transform gizmos (move/rotate/scale)
- [x] Drag entities in canvas to move
- [x] Grid snapping for positioning
- [x] Keyboard shortcuts (W/E/R for tools)

**Deliverables:**
- Interactive game canvas
- Visual entity manipulation with gizmos

---

### WP10.4: Asset Browser ✅

**Priority:** P1 | **Effort:** 4 days | **Status:** Complete

- [x] Create AssetBrowser component (left panel tab)
- [x] List image and sound files in project folder
- [x] Grid and list view modes
- [x] Filter by asset type (images/sounds)
- [x] Directory navigation with breadcrumbs
- [x] Image thumbnails in grid view

**Deliverables:**
- Asset management UI
- File browsing workflow

---

## Work Package 11: AI Integration ⏳ IN PROGRESS

### WP11.1: Chat Panel UI ✅

**Priority:** P0 | **Effort:** 3 days | **Status:** Complete

- [x] Create ChatPanel component (right side, toggleable)
- [x] Message list with user/AI bubbles
- [x] Input field with send button
- [x] Markdown rendering for code blocks (react-markdown + remark-gfm)
- [x] Loading indicator during AI response
- [x] Error handling for API failures
- [x] Settings panel for API key configuration
- [x] Demo mode fallback when no API key

**Deliverables:**

- Chat UI component with full markdown support

---

### WP11.2: Anthropic API Client (Rust) ✅

**Priority:** P0 | **Effort:** 4 days | **Status:** Complete

- [x] Create Rust client for Anthropic API
- [x] Implement ai_send_message IPC command
- [x] Read game context and pass to AI
- [x] Handle API errors gracefully
- [x] ai_set_api_key and ai_check_api_key commands
- [ ] Stream AI responses to frontend (future enhancement)
- [ ] Store chat history in .promptplay/chat-history.json (future enhancement)

**Deliverables:**
- Anthropic API integration
- Chat backend working

---

### WP11.3: AI Code Generation ⏳

**Priority:** P0 | **Effort:** 5 days | **Status:** In Progress

- [x] Create AI prompt templates for game dev
- [x] AI can read current game.json
- [x] AI suggests code changes (JSON code blocks)
- [x] User approves → apply changes to game
- [ ] Show diff preview before applying
- [ ] AI can create components/systems
- [ ] AI can debug errors
- [ ] Test with real scenarios

**Deliverables:**
- End-to-end AI pair programming
- Code generation working

---

## Work Package 12: Export & Polish ✅ COMPLETE

### WP12.1: Game Export System ✅

**Priority:** P1 | **Effort:** 4 days | **Status:** Complete

- [x] Build system for bundling game
- [x] Export as single HTML file
- [ ] Export as web folder (for hosting) (future)
- [x] Minify and optimize assets (embedded in HTML)
- [x] Test exported games work standalone
- [x] Add export UI (Ctrl+E / Export button)

**Deliverables:**

- Game export functionality with embedded Canvas2D + Matter.js runtime

---

### WP12.2: UI/UX Polish ✅

**Priority:** P1 | **Effort:** 5 days | **Status:** Complete

- [x] Refine Tailwind design system
- [x] Add keyboard shortcuts (Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+E)
- [x] Welcome screen with templates
- [x] Sample projects (platformer, shooter, puzzle, empty)
- [ ] In-app tutorials/tooltips (future)
- [x] Error messages with helpful hints (ErrorDisplay component)
- [x] Loading states and animations (LoadingSpinner, slide-in notifications)

**Deliverables:**
- Polished professional UI
- Beta-ready experience

---

## Tauri Desktop Timeline Summary

| Phase | Work Packages | Estimated Weeks | Status |
|-------|---------------|-----------------|--------|
| Phase 1: Foundation | WP8 (Desktop app + runtime) | 2 weeks | ✅ Complete |
| Phase 2: Hot Reload | WP9 (File watching + TS compilation) | 1.5 weeks | ✅ Complete |
| Phase 3: Visual Editor | WP10 (Scene tree + inspector + assets) | 2.5 weeks | ✅ Complete |
| Phase 4: AI Integration | WP11 (Chat + Anthropic API) | 2 weeks | ⏳ In Progress |
| Phase 5: Export & Polish | WP12 (Export + UX polish) | 1.5 weeks | ✅ Complete |
| **Total Desktop MVP** | **WP8-WP12** | **~10 weeks** | **~90% Complete** |

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete documentation updates (PRD, MVP, Tasks)
2. 🚧 Install Rust and Tauri CLI
3. 🚧 Initialize new Tauri app structure
4. 🚧 Begin WP8.1: Tauri setup

### Short Term (Weeks 1-2)
1. Complete WP8: Tauri foundation
2. Get game runtime working in desktop app
3. Integrate Monaco code editor
4. Test with existing game demos

### Medium Term (Weeks 3-6)
1. Implement file watching and hot reload
2. Build visual scene editor
3. Add asset browser
4. Achieve feature parity with web MVP

### Long Term (Weeks 7-10)
1. AI chat integration
2. Game export system
3. UI/UX polish
4. Beta testing and launch

---

## Work Package 13: AI-Powered Visual Script Generation (Future)

### WP13.1: Code Pattern Detection
**Priority:** P2 | **Effort:** 5 days | **Status:** Planned

- [ ] Analyze game code/scripts using AST parsing
- [ ] Detect state machine patterns (state variables, transitions)
- [ ] Detect behavior tree patterns (if/else chains, AI decisions)
- [ ] Detect node graph patterns (event handlers, data flow)
- [ ] Detect shader-like patterns (math operations, color manipulations)

**Deliverables:**
- Code pattern detection engine
- Pattern classification system

---

### WP13.2: Auto-Generate Node Graph from Code
**Priority:** P2 | **Effort:** 4 days | **Status:** Planned

- [ ] Parse event handlers (onUpdate, onCollision, etc.)
- [ ] Convert if/else chains to branch nodes
- [ ] Convert function calls to action nodes
- [ ] Map variables to get/set nodes
- [ ] Generate connections based on data flow
- [ ] Position nodes using auto-layout algorithm

**Deliverables:**
- Code → Node Graph converter
- Auto-layout for generated nodes

---

### WP13.3: Auto-Generate State Machine from Code
**Priority:** P2 | **Effort:** 4 days | **Status:** Planned

- [ ] Detect state enum/string variables
- [ ] Detect switch/case or if/else state checks
- [ ] Extract state transition conditions
- [ ] Map to StateMachine states and transitions
- [ ] Detect enter/exit/update actions per state

**Deliverables:**
- Code → State Machine converter
- Automatic state detection

---

### WP13.4: Auto-Generate Behavior Tree from Code
**Priority:** P2 | **Effort:** 4 days | **Status:** Planned

- [ ] Detect AI decision patterns (conditions → actions)
- [ ] Detect priority-based logic (try A, else try B)
- [ ] Detect sequence patterns (do A then B then C)
- [ ] Map to Selector/Sequence/Condition/Action nodes
- [ ] Build tree hierarchy from nested conditions

**Deliverables:**
- Code → Behavior Tree converter
- AI pattern recognition

---

### WP13.5: Auto-Generate Shader Graph from Code
**Priority:** P2 | **Effort:** 4 days | **Status:** Planned

- [ ] Detect material/color manipulation code
- [ ] Detect math operations (sin, cos, lerp, etc.)
- [ ] Detect UV coordinate usage
- [ ] Detect time-based animations
- [ ] Map to shader nodes (math, texture, output)

**Deliverables:**
- Code → Shader Graph converter
- Visual shader from procedural code

---

### WP13.6: AI-Assisted Pattern Detection
**Priority:** P2 | **Effort:** 5 days | **Status:** Planned

- [ ] Use Claude API to analyze code semantics
- [ ] AI suggests which visual editor to use
- [ ] AI explains detected patterns to user
- [ ] AI helps refine generated visual scripts
- [ ] Bidirectional sync: visual changes → code updates

**Deliverables:**
- AI-enhanced code analysis
- Smart suggestions for visual scripting

---

### WP13 Summary

| Feature | Input | Output |
|---------|-------|--------|
| **Node Graph Generation** | Event handlers, conditionals | Flow-based visual script |
| **State Machine Generation** | State variables, transitions | State diagram |
| **Behavior Tree Generation** | AI decision code | Hierarchical behavior tree |
| **Shader Graph Generation** | Material/color code | Node-based shader |

**Use Cases:**
1. Import existing game code → Auto-generate visual scripts
2. Write code in Monaco → See visual representation update live
3. AI analyzes your code and suggests visual script improvements
4. Beginners can learn visual scripting by seeing code equivalents

---

## Work Package 14: Debug & Fix (v3.0.0 Polish)

### Priority 1: Critical Issues

#### WP14.1: 3D Entity Dragging
**File:** `apps/desktop/src/components/GameCanvas3D.tsx`
**Status:** ✅ Complete

- [x] Implement raycasting for 3D object selection
- [x] Add drag plane calculation based on camera orientation
- [x] Update entity position during drag with proper 3D math
- [x] Handle depth/Z-axis constraints
- [x] Add global mouse up handler
- [x] Add cursor styling during drag

---

#### WP14.2: AI Art Generation Mock Indicator
**File:** `apps/desktop/src/services/AIArtGenerator.ts`
**Status:** ✅ Complete

- [x] Add clear "Demo Mode" indicator when returning placeholders
- [x] Document API integration requirements
- [x] Add loading states for image generation
- [x] Implement proper error handling (auto-dismiss notifications)

---

#### WP14.3: Platform Export Documentation
**File:** `apps/desktop/src/services/PlatformExportService.ts`
**Status:** ✅ Complete

- [x] Add "Simulation Mode" indicator to mock exports
- [x] Document actual requirements for each platform
- [x] Add progress reporting for real export steps
- [x] Create platform-specific setup guides (getSetupGuide method)

---

### Priority 2: High Priority Features

#### WP14.4: Node Editor Execution Logic
**File:** `apps/desktop/src/components/NodeEditor/index.tsx`
**Status:** ✅ Complete

- [x] Implement actual node execution logic (NodeExecutor class)
- [x] Add proper data flow between nodes (gatherInputs, executeValueNode)
- [x] Implement all node types (math, logic, events, actions, input, entities)
- [x] Add runtime execution engine (test execution with console logging)
- [x] Key simulation (W, A, S, D, Space) via UI buttons and keyboard
- [x] Entity loading from game spec
- [x] Execution console with detailed flow logging
- [ ] Connect to actual game runtime (future enhancement)

---

#### WP14.5: WebGPU Renderer Integration
**File:** `apps/desktop/src/services/WebGPURenderer.ts`
**Status:** ✅ Complete

- [x] Add WebGPU context initialization in GameCanvas3D
- [x] Implement fallback to WebGL when WebGPU unavailable
- [x] Connect compute shaders for particle systems
- [x] Add performance comparison tools

---

#### WP14.6: Tilemap Editor Painting
**File:** `apps/desktop/src/components/TilemapEditor.tsx`
**Status:** ✅ Complete

- [x] Fix tile painting on canvas (already working)
- [x] Add tile selection from tileset (already working)
- [x] Implement flood fill tool (already working)
- [x] Add layer management (fixed hover visibility)
- [x] Fix tileset import/loading (added sprite sheet import)
- [x] Add keyboard shortcuts (B, E, G, I for tools)
- [x] Add selected tile preview in toolbar

---

### Priority 3: Medium Priority Enhancements

#### WP14.7: Animation Timeline Improvements
**File:** `apps/desktop/src/components/AnimationTimeline.tsx`
**Status:** ✅ Complete

- [x] Add easing curve editor
- [x] Implement multi-track editing
- [x] Add keyframe copy/paste
- [x] Fix playback synchronization

---

#### WP14.8: Terrain Editor Fix
**File:** `apps/desktop/src/components/TerrainEditor.tsx`
**Status:** ✅ Complete

- [x] Implement heightmap generation
- [x] Add brush-based terrain sculpting
- [x] Implement texture painting
- [x] Add terrain LOD system

---

#### WP14.9: Shader Editor Enhancement
**File:** `apps/desktop/src/components/ShaderEditor.tsx`
**Status:** ✅ Complete

- [x] Add real-time shader preview
- [x] Implement error highlighting
- [x] Add uniform controls
- [x] Support both GLSL and WGSL

---

### Priority 4: Polish & Code Quality

#### WP14.10: AI Chat Context
**File:** `apps/desktop/src/components/AIPromptPanel.tsx`
**Status:** ✅ Complete

- [x] Pass current scene state to AI
- [x] Include entity hierarchy in prompts
- [x] Add ability to reference specific entities (@ mentions with autocomplete)

---

#### WP14.11: Video Recording Quality
**File:** `apps/desktop/src/services/ScreenCaptureService.ts`
**Status:** ✅ Complete

- [x] Add resolution selection (480p, 720p, 1080p, 4K, custom)
- [x] Add framerate options (24, 30, 60 fps)
- [x] Implement format selection (MP4, WebM)
- [x] Add audio recording option with microphone support

---

#### WP14.12: TypeScript Strict Mode
**Files:** Various
**Status:** ⏳ Pending

- [ ] Enable stricter TypeScript settings
- [ ] Fix all `any` types in event handlers
- [ ] Add proper null checks
- [ ] Fix implicit any in service callbacks

---

### WP14 Summary

| Task | Priority | Status |
|------|----------|--------|
| 3D Entity Dragging | Critical | ✅ Complete |
| AI Art Mock Indicator | Critical | ✅ Complete |
| Platform Export Docs | Critical | ✅ Complete |
| Node Editor Logic | High | ✅ Complete |
| WebGPU Integration | High | ✅ Complete |
| Tilemap Editor | High | ✅ Complete |
| Animation Timeline | Medium | ✅ Complete |
| Terrain Editor | Medium | ✅ Complete |
| Shader Editor | Medium | ✅ Complete |
| AI Chat Context | Low | ✅ Complete |
| Video Recording | Low | ✅ Complete |
| TypeScript Strict | Low | ⏳ Pending |
