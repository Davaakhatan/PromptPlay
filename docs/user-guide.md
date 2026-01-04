# PromptPlay - User Guide

## Welcome to PromptPlay

PromptPlay is an AI-powered 2D game engine with a native desktop editor. Create playable games by describing them in plain English, or use the visual scene editor to build games interactively.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Desktop App Overview](#desktop-app-overview)
3. [Creating Your First Game](#creating-your-first-game)
4. [Visual Scene Editor](#visual-scene-editor)
5. [Game Controls](#game-controls)
6. [Editing Game Specs](#editing-game-specs)
7. [File System Integration](#file-system-integration)
8. [Supported Game Genres](#supported-game-genres)
9. [Troubleshooting](#troubleshooting)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust (for Tauri desktop app)
- OpenAI API key (optional, for AI game generation)

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Davaakhatan/PromptPlay.git
   cd PromptPlay
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Build all packages:**

   ```bash
   pnpm build
   ```

4. **Run the desktop app:**

   ```bash
   pnpm --filter promptplay-desktop dev
   ```

   Or from the apps/desktop directory:

   ```bash
   cd apps/desktop && pnpm dev
   ```

### Alternative: Web Editor

If you prefer a browser-based experience:

```bash
pnpm --filter editor dev
# Open http://localhost:3000
```

---

## Desktop App Overview

The PromptPlay desktop app provides a professional game development environment:

### Main Interface

```text
┌─────────────────────────────────────────────────────────────────┐
│  PromptPlay    [Open Project] [Save]   [▶ Play] [⏸ Pause] [↺]  │
├────────────┬──────────────────────────────────┬─────────────────┤
│ SCENE TREE │         GAME CANVAS              │   INSPECTOR     │
│            │                                   │                 │
│ ▼ player   │    ┌─────────────────────┐       │ Transform       │
│ ▼ ground   │    │                     │       │ x: 100  y: 400  │
│ ▼ platform1│    │    Live Game        │       │ rotation: 0     │
│ ▼ platform2│    │    Preview          │       │                 │
│ ▼ coin1    │    │                     │       │ Sprite          │
│ ▼ coin2    │    └─────────────────────┘       │ width: 32       │
│            │                                   │ height: 32      │
├────────────┼───────────────────────────────────┴─────────────────┤
│ FILE TREE  │              CODE EDITOR                            │
│            │                                                      │
│ ▶ project/ │  {                                                  │
│   game.json│    "version": "1.0",                                │
│            │    "entities": [...],                               │
│            │    ...                                              │
└────────────┴─────────────────────────────────────────────────────┘
```

### Key Features

- **Scene Tree** - Hierarchical view of all entities with tags
- **Game Canvas** - Live preview with click-to-select entities
- **Inspector** - Edit entity properties (transform, sprite, collider)
- **File Tree** - Browse project files on disk
- **Code Editor** - Edit game.json with Monaco editor
- **Toolbar** - Play/Pause/Reset controls

---

## Creating Your First Game

### Quick Start (3 Easy Steps)

1. **Choose a Genre** (optional)
   - Select from Platformer, Shooter, or Puzzle
   - Or leave it as "Auto-detect" and let AI figure it out

2. **Describe Your Game**
   - Type what you want in the text area
   - Be specific about characters, objectives, and mechanics
   - Example: *"A platformer where a blue fox jumps across floating platforms to collect golden coins"*

3. **Click "Generate Game"**
   - Wait a few seconds for AI to create your game
   - Your game will automatically start playing!

### Try the Examples

Not sure what to create? Click one of the **Quick examples** below the generate button:

- **Platformer:** Blue fox collecting coins
- **Shooter:** Space combat with aliens
- **Puzzle:** Sokoban-style box pushing

---

## Visual Scene Editor

The desktop app includes a professional visual scene editor for game development.

### Scene Tree Panel

The Scene Tree shows all entities in your game:

- Click an entity to select it
- View entity tags as colored badges
- Entities are listed in creation order

### Inspector Panel

When an entity is selected, the Inspector shows its components:

**Transform Component:**

- Position (x, y)
- Rotation (degrees)
- Scale (scaleX, scaleY)

**Sprite Component:**

- Texture name
- Width and height
- Tint color

**Collider Component:**

- Type (box or circle)
- Dimensions
- Sensor flag

**Input Component (player entities):**

- Move speed
- Jump force

### Game Canvas

The central canvas displays your game:

- **800x600 pixels** default resolution
- **Click to select** entities directly on canvas
- **Blue selection box** shows selected entity bounds
- **Corner handles** indicate selection
- **Entity name label** appears above selection

### Entity Management

- Create new entities from the toolbar
- Delete entities with the delete button
- Duplicate entities for quick level building

---

## File System Integration

The desktop app provides full file system access:

### Opening Projects

1. Click **Open Project** in the toolbar
2. Select a folder containing a `game.json` file
3. The project loads automatically

### Project Structure

```text
my-game/
├── game.json      # Main game specification
├── assets/        # (Future) sprites, sounds
└── scripts/       # (Future) custom behaviors
```

### Hot Reload

The app watches for file changes:

- Edit `game.json` in any external editor
- Changes reload automatically
- No need to restart the app

### Saving Changes

- Click **Save** to write changes to disk
- The Inspector edits update the JSON file
- Code Editor changes save on blur

---

## Game Controls

### Keyboard Controls

**Movement:**
- **Arrow Keys** or **WASD**: Move player character
  - ↑/W: Move up (or jump in platformers)
  - ↓/S: Move down
  - ←/A: Move left
  - →/D: Move right

**Actions:**
- **Space Bar**: Jump (platformers) or shoot (shooters)

**Mouse Controls:**
- **Mouse Movement**: Aim direction (shooters)
- **Mouse Click**: Shoot or interact

### UI Controls

**Playback:**
- **Play Button**: Start or resume game simulation
- **Pause Button**: Freeze game simulation
- **Reset Button**: Reload game from beginning

**Tabs:**
- **Game Tab**: Switch to gameplay view
- **Spec Tab**: Switch to JSON editor view

---

## Editing Game Specs

### What is a Game Spec?

A **game specification** is a JSON document that defines every aspect of your game:
- Entities (player, enemies, platforms, etc.)
- Components (position, physics, sprites, etc.)
- Game configuration (gravity, bounds)
- Metadata (title, genre, description)

### Opening the Spec Editor

1. Click the **Spec** tab in the center panel
2. The JSON specification will appear in a code editor

### Editing the Spec

**Live Editing:**
- Edit the JSON directly in the textarea
- Changes apply immediately when valid
- Invalid JSON shows an error message

**What You Can Change:**

1. **Entity Positions:**
   ```json
   "transform": { "x": 100, "y": 400, ... }
   ```
   - `x`: Horizontal position (0-800)
   - `y`: Vertical position (0-600)

2. **Entity Sizes:**
   ```json
   "sprite": { "width": 40, "height": 40, ... }
   ```

3. **Colors:**
   ```json
   "sprite": { "tint": "#4a90e2ff", ... }
   ```
   - Format: `#RRGGBBAAhex` (RGBA)

4. **Physics Properties:**
   ```json
   "input": { "moveSpeed": 8, "jumpForce": -18 }
   ```

5. **Gravity:**
   ```json
   "config": { "gravity": { "x": 0, "y": 1 } }
   ```
   - `y > 0`: Downward gravity
   - `y = 0`: No gravity

### Spec Statistics

At the bottom of the Spec tab, you'll see:
- **Entities:** Number of game objects
- **Systems:** Number of active systems
- **Size:** Character count of JSON

---

## Saving and Loading Games

### Saving a Game

1. Click the **Save** button (disk icon) in the header
2. Enter a name for your game
3. Click **Save Game**
4. Your game is now stored in browser localStorage

**Note:** Saves are local to your browser and persist across sessions.

### Loading a Game

1. Click the **Load** button (folder icon) in the header
2. Browse your saved games
3. Click **Load** next to the game you want
4. The game will load and be ready to play

### Deleting Saved Games

1. Open the Load dialog
2. Click the **trash icon** next to a saved game
3. Confirm deletion

**Storage Limit:** Browser localStorage is limited (usually 5-10 MB). Delete old saves if needed.

---

## Writing Effective Prompts

### Prompt Structure

**Good prompts include:**
1. **Genre:** What type of game (platformer, shooter, puzzle)
2. **Character:** Who is the player controlling
3. **Objective:** What is the goal
4. **Environment:** Setting or obstacles
5. **Mechanics:** Special actions or rules

### Examples

**Basic (Good):**
```
A platformer where you jump and collect coins
```

**Detailed (Better):**
```
A platformer where a blue fox jumps across floating platforms
to collect 10 golden coins while avoiding red enemies
```

**Specific (Best):**
```
A platformer game with:
- Blue fox character starting at the bottom left
- 5 floating platforms at different heights
- 8 golden coins scattered on platforms
- 2 red enemy characters that patrol left and right
- Gravity enabled with high jumps
- Win condition: collect all coins
```

### Tips for Better Results

**Do:**
- ✅ Be specific about numbers (e.g., "5 platforms" not "some platforms")
- ✅ Describe colors (e.g., "blue player", "red enemies")
- ✅ Mention positions (e.g., "at the top", "spread across the level")
- ✅ State objectives clearly (e.g., "collect all coins to win")
- ✅ Describe movement (e.g., "enemies patrol back and forth")

**Don't:**
- ❌ Use vague terms ("make it fun", "cool graphics")
- ❌ Request impossible features ("3D graphics", "online multiplayer")
- ❌ Overcomplicate (keep it simple for best results)
- ❌ Forget the genre (helps AI understand what to create)

---

## Supported Game Genres

### 1. Platformer

**Characteristics:**
- Gravity-based movement
- Jumping mechanics
- Platforms at various heights
- Collectibles (coins, stars, gems)
- Optional enemies

**Example Prompt:**
```
Create a platformer where a ninja jumps across platforms
to collect stars. Add 4 platforms and 6 stars.
```

**Best For:**
- Jumping challenges
- Collection games
- Vertical level design

---

### 2. Shooter

**Characteristics:**
- Top-down or side view
- 8-directional movement
- Shooting mechanics
- Enemies with AI behavior
- Arena-style boundaries

**Example Prompt:**
```
Create a space shooter where the player fights 5 alien
enemies in a bounded arena. Aliens chase the player.
```

**Best For:**
- Combat scenarios
- Enemy AI demonstrations
- Action-packed gameplay

---

### 3. Puzzle

**Characteristics:**
- Grid-based or tile-based movement
- Object manipulation (pushing boxes)
- Target locations
- Logic-based challenges
- No gravity

**Example Prompt:**
```
Create a Sokoban puzzle with 3 boxes that need to be
pushed onto green target squares
```

**Best For:**
- Logic puzzles
- Strategic gameplay
- Spatial reasoning challenges

---

## Troubleshooting

### Game Won't Generate

**Problem:** Clicking "Generate" does nothing or shows an error

**Solutions:**
1. **Check API Key:**
   - Ensure `OPENAI_API_KEY` is set in `.env.local`
   - Verify the key is valid and active
   - Restart the development server after adding the key

2. **Check Console:**
   - Open browser DevTools (F12)
   - Look for error messages in the Console tab
   - Common errors: API rate limits, network issues

3. **Simplify Prompt:**
   - Try a simpler prompt
   - Use one of the Quick Examples

### Game Loads But Won't Play

**Problem:** Game appears but nothing moves

**Solutions:**
1. **Click Play:**
   - Ensure the Play button (not Pause) is active
   - Game starts paused by default

2. **Check Spec:**
   - Switch to Spec tab
   - Verify entities have proper components
   - Ensure systems array includes required systems

### Controls Don't Work

**Problem:** Player character won't move

**Solutions:**
1. **Focus the Canvas:**
   - Click on the game canvas area
   - Browser needs focus for keyboard input

2. **Check Input Component:**
   - In Spec tab, find player entity
   - Verify it has an `"input"` component
   - Check `moveSpeed` is greater than 0

3. **Try Different Keys:**
   - Test both Arrow keys and WASD
   - Some browsers may block certain keys

### Invalid JSON Error

**Problem:** Editing spec shows "Invalid JSON"

**Solutions:**
1. **Check Syntax:**
   - Ensure all brackets match `{}` and `[]`
   - All strings must have quotes `""`
   - No trailing commas

2. **Use a JSON Validator:**
   - Copy spec to [jsonlint.com](https://jsonlint.com)
   - Find and fix syntax errors

3. **Reset to Working Version:**
   - Click Reset to reload last valid spec
   - Or reload a saved game

### Performance Issues

**Problem:** Game runs slowly or choppy

**Solutions:**
1. **Reduce Entity Count:**
   - Remove unnecessary entities from spec
   - Aim for < 50 entities for best performance

2. **Close Other Tabs:**
   - Browser tabs compete for resources
   - Close unused tabs

3. **Check System Resources:**
   - Close other applications
   - Ensure adequate RAM available

### Can't Save or Load

**Problem:** Save/Load buttons don't work

**Solutions:**
1. **Check Browser Storage:**
   - localStorage must be enabled
   - Private/Incognito mode may block storage
   - Check browser settings for storage permissions

2. **Clear Browser Cache:**
   - If storage is full, clear old data
   - Keep important saves elsewhere

---

## Tips and Best Practices

### Creating Great Games

**1. Start Simple**
- Begin with basic prompts
- Add complexity gradually
- Test each iteration

**2. Use Templates**
- Start with a Quick Example
- Modify to fit your vision
- Save successful variations

**3. Iterate Quickly**
- Generate multiple versions
- Compare results
- Combine best elements

**4. Learn from Specs**
- Study generated JSON
- Understand component structure
- Copy patterns that work

### Optimizing Performance

**Entity Limits:**
- Platformer: 20-30 entities ideal
- Shooter: 10-20 entities (fewer enemies)
- Puzzle: 10-30 entities

**Physics Tips:**
- Use `isSensor: true` for collectibles
- Tag static objects as `"static"`
- Minimize overlapping colliders

**Visual Quality:**
- Use consistent entity sizes
- Maintain visual hierarchy (player larger than items)
- Choose contrasting colors

### Advanced Techniques

**1. Custom Behaviors via Spec Editing:**
```json
"aiBehavior": {
  "type": "chase",
  "speed": 6,
  "detectionRadius": 300
}
```

**2. Fine-tune Physics:**
```json
"config": {
  "gravity": { "x": 0, "y": 0.8 }
}
```
- Lower gravity = floatier jumps
- Higher gravity = faster falling

**3. Precise Positioning:**
```json
"transform": {
  "x": 400,  // Center horizontally (800/2)
  "y": 300   // Center vertically (600/2)
}
```

**4. Create Patterns:**
- Evenly spaced platforms:
  ```
  Platform 1: x: 200, y: 450
  Platform 2: x: 400, y: 350
  Platform 3: x: 600, y: 250
  ```

### Prompt Library

**Collect these proven prompts for future use:**

**Endless Runner:**
```
Platformer with scrolling platforms, player must jump
over gaps, platforms move left automatically
```

**Tower Defense:**
```
Top-down game with waves of enemies moving toward a
base, player must defend by positioning barriers
```

**Maze Chase:**
```
Top-down game where player navigates a maze while
being chased by enemies with patrol patterns
```

**Precision Platformer:**
```
Platformer with small platforms, precise jumps required,
collectibles on difficult-to-reach spots
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl/Cmd + S** | Save current game (when focused) |
| **Ctrl/Cmd + O** | Open load dialog (when focused) |
| **Spacebar** | Jump (in game) |
| **Arrow Keys** | Move player |
| **WASD** | Alternative movement |
| **Tab** | Switch between tabs (Game/Spec) |
| **Esc** | Close dialogs |

---

## FAQ

**Q: Do I need to know how to code?**
A: No! Just describe what you want in plain English. However, understanding JSON basics helps with advanced editing.

**Q: Can I export my games?**
A: Currently, games are saved locally. Export features are planned for future releases.

**Q: How many games can I create?**
A: Unlimited! Limited only by browser storage for saves.

**Q: Can I share my games?**
A: Game sharing features are coming soon. For now, you can share the JSON spec file.

**Q: What if I run out of OpenAI credits?**
A: You'll need to add credits to your OpenAI account or use manual spec editing.

**Q: Can I add custom sprites?**
A: Custom sprite support is planned. Currently uses colored shapes.

**Q: Does it work offline?**
A: Game playback works offline. Generation requires internet for API access.

**Q: Can I make longer games?**
A: Games are designed for quick prototypes. Complex games may require manual spec expansion.

---

## Getting Help

**Resources:**
- [Documentation](/docs/prd.md) - Product requirements
- [Architecture](/docs/architecture.md) - Technical details
- [Tasks](/docs/tasks.md) - Development roadmap

**Report Issues:**
- GitHub Issues: [repository-url]/issues
- Include: Browser version, console errors, steps to reproduce

**Community:**
- Discord: [coming soon]
- Forum: [coming soon]

---

## What's Next?

Now that you understand the basics, try:

1. **Create your first game** using a Quick Example
2. **Modify it** by editing the spec
3. **Save it** for future reference
4. **Experiment** with different prompts
5. **Share** your creations (JSON specs) with friends

**Happy creating!**

---

## New in v3.0

### Mobile Export (PWA)

Export your game as a Progressive Web App:

1. Click **File > Mobile Export** in the menu
2. Choose between **PWA (Mobile)** or **HTML** export
3. Configure settings:
   - **Game Title** - Name shown on home screen
   - **Screen Orientation** - Lock to portrait/landscape or auto-rotate
   - **Theme Color** - Status bar and splash screen color
   - **Touch Controls** - Add on-screen D-pad and buttons
   - **Offline Support** - Works without internet after install
4. Click **Export** to download the files
5. Upload to any HTTPS server for full PWA functionality

### One-Click Publishing

Publish your game to popular platforms:

1. Click **File > Publish** in the menu
2. Select a platform:
   - **itch.io** - Popular indie game platform
   - **GitHub Pages** - Free hosting on GitHub
   - **Mobile PWA** - Install on phones as app
   - **HTML File** - Single file, share anywhere
3. Enter game title and description
4. Click **Export & Publish**
5. Follow the instructions to complete publishing

### AI Playtesting

Get automated feedback on your game:

1. Click the **AI Playtest** button in the toolbar
2. Click **Run Playtest** to start analysis
3. Review results:
   - **Quality Score** (0-100) - Overall game quality
   - **Playability Metrics** - Movement, jumping, collisions, goals
   - **Issues Found** - Critical, warning, and info level issues
   - **Suggestions** - Recommendations for improvement
4. Click **Run Again** to re-analyze after making changes

---

*PromptPlay v3.0 - AI-Powered Game Engine*
