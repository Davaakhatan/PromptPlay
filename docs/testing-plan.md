# PromptPlay Testing Plan & Feature Assessment

## Current Status: v6.1.0

Based on codebase analysis, PromptPlay has **60+ components** and **75+ services**. Here's the testing plan and feature gaps.

---

## Running Automated Tests

```bash
# Navigate to desktop app
cd apps/desktop

# Install test dependencies (first time only)
pnpm add -D vitest @vitest/coverage-v8 jsdom

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run specific test file
pnpm vitest run tests/gameSpec.test.ts
pnpm vitest run tests/nodeExecutor.test.ts
pnpm vitest run tests/projectOperations.test.ts
pnpm vitest run tests/e2e.test.ts
```

### Test Files Created

| File | Description | Tests |
|------|-------------|-------|
| `tests/gameSpec.test.ts` | Game spec structure validation | 15+ |
| `tests/nodeExecutor.test.ts` | Visual script node execution | 20+ |
| `tests/projectOperations.test.ts` | Project CRUD operations | 15+ |
| `tests/e2e.test.ts` | End-to-end workflow simulation | 10+ |

---

## Manual Test Tasks

### Test 1: Project Creation
**Goal:** Verify new project workflow works end-to-end

1. Launch PromptPlay desktop app
2. Click "New Blank Project" on Welcome Screen
3. Choose save location and project name
4. Verify `game.json` is created with default player + ground
5. Verify project opens in editor

**Expected Structure:**
```
my-game/
└── game.json
```

---

### Test 2: Template-Based Project
**Goal:** Verify all 4 templates work

1. Create from "Platformer" template → verify player, platforms, coins
2. Create from "Shooter" template → verify player, enemies, walls
3. Create from "Puzzle" template → verify player, blocks, goal
4. Create from "Empty" template → verify single player entity

---

### Test 3: External Editor Integration (Vibe Coding)
**Goal:** Verify hot reload with Cursor/Claude Code

1. Create new project in PromptPlay
2. Open project folder in Cursor or VS Code
3. Edit `game.json` externally (add new entity)
4. Switch back to PromptPlay
5. Verify changes appear automatically (no manual refresh)

**Files to Test:**
- `game.json` - main game spec
- Any asset files in project folder

---

### Test 4: 2D Mode Play Test
**Goal:** Verify 2D game runtime works

1. Open platformer template
2. Click Play button
3. Test WASD/Arrow keys movement
4. Test Space for jump
5. Verify physics (gravity, collision)
6. Verify coin collection (sensor collision)

---

### Test 5: 3D Mode Play Test
**Goal:** Verify 3D runtime works

1. Toggle to 3D mode (button in toolbar)
2. Verify scene renders in Three.js
3. Test camera orbit controls (drag to rotate)
4. Test player movement in 3D
5. Verify physics works (Cannon-es)

---

### Test 6: Node Editor Execution
**Goal:** Verify visual scripts execute

1. Switch to "Nodes" view mode
2. Create simple graph: On Update → Get Entity → Log
3. Click "Test Execute" button
4. Verify execution console shows output
5. Test key simulation (W, A, S, D, Space buttons)

---

### Test 7: Export HTML
**Goal:** Verify standalone export works

1. Create a simple game
2. Press Ctrl+E or File → Export HTML
3. Save the HTML file
4. Open HTML in browser
5. Verify game plays standalone (no server needed)

---

### Test 8: AI Chat Integration
**Goal:** Verify AI can modify game

1. Open AI Panel (right side toggle)
2. Type: "Add a red enemy at position 500, 300"
3. Verify entity appears in scene tree
4. Type: "Make the player jump higher"
5. Verify jumpForce increases in inspector

---

## Feature Readiness for "Vibe Coding"

### What's Ready (Working)

| Feature | Status | Notes |
|---------|--------|-------|
| Project Creation | ✅ Ready | Templates + blank project |
| File Watcher | ✅ Ready | Rust-based with 500ms debounce |
| Hot Reload | ✅ Ready | Auto-reloads on game.json changes |
| Visual Editor | ✅ Ready | Scene tree, inspector, canvas |
| 2D Runtime | ✅ Ready | Canvas2D + Matter.js |
| 3D Runtime | ✅ Ready | Three.js + Cannon-es |
| HTML Export | ✅ Ready | Self-contained single file |
| AI Chat | ✅ Ready | Demo mode + API integration |
| Node Editor | ✅ Ready | Full execution engine |

### What Needs Work

| Feature | Status | Gap |
|---------|--------|-----|
| Custom Scripts | ⚠️ Partial | TypeScript compilation exists but not fully integrated |
| Script Hot Reload | ⚠️ Partial | File watcher exists, but script execution needs runtime integration |
| External Asset Loading | ⚠️ Partial | Basic support, but textures default to colored rectangles |
| Sprite Import | ⚠️ Partial | UI exists but needs testing |
| Sound Integration | ⚠️ Partial | SoundManagerService exists but not connected to game runtime |

---

## Vibe Coding Workflow

### Current Workflow (What Works Now)

1. **Create Project** in PromptPlay
2. **Open in Cursor/Claude** - edit `game.json` directly
3. **Changes Auto-Reload** - PromptPlay picks up changes
4. **Play & Test** - in PromptPlay editor

### Ideal Workflow (What We Need)

1. Create project with proper folder structure:
   ```
   my-game/
   ├── game.json          # Game spec (entities, physics, etc.)
   ├── scripts/           # Custom game logic
   │   └── player.ts      # Player-specific code
   ├── assets/            # Sprites, sounds
   │   ├── player.png
   │   └── coin.wav
   └── .promptplay/       # Editor metadata
       └── settings.json
   ```

2. External editor (Cursor/Claude) can:
   - Edit `game.json` for entities and components
   - Write TypeScript in `scripts/` for custom logic
   - Both trigger hot reload

3. PromptPlay compiles and runs scripts automatically

---

## Missing Features for Full Vibe Coding

### Priority 1: Script Runtime Integration

**Current:** Scripts folder exists, TypeScript compilation works, but scripts don't run in game.

**Need:**
- [ ] Auto-import scripts from `scripts/` folder
- [ ] Execute custom systems alongside built-in systems
- [ ] Support component lifecycle (onUpdate, onCollision, etc.)

### Priority 2: Asset Pipeline

**Current:** Assets can be referenced but default to colored rectangles.

**Need:**
- [ ] Auto-scan `assets/` folder for images/sounds
- [ ] Load textures from project folder
- [ ] Hot reload assets on change

### Priority 3: Project Scaffold

**Current:** Only creates `game.json`.

**Need:**
- [ ] Create full folder structure on project creation
- [ ] Include sample script template
- [ ] Include README for external editor guidance

### Priority 4: External Editor Hints

**Need:**
- [ ] `.promptplay/schema.json` - JSON Schema for game.json autocomplete
- [ ] `.vscode/settings.json` - VS Code configuration
- [ ] Type definitions for script writing

---

## Quick Fixes Before Testing

1. **Update version in WelcomeScreen** - shows v3.0.0, should be v6.1.0
2. **Verify file watcher triggers** - test with console.log
3. **Test HTML export** - verify it generates valid standalone HTML

---

## Game Ideas for Testing

### 2D Game: "Coin Rush"
- Player collects coins
- Platforms at different heights
- Timer countdown
- Score display
- Tests: physics, input, collision, UI

### 3D Game: "Maze Runner"
- First-person camera
- Maze of walls
- Collect keys to unlock exit
- Tests: 3D physics, camera, collisions

---

## Next Steps

1. Run through Test 1-8 in order
2. Document any failures
3. Fix critical issues
4. Build the two demo games
5. Export and share
