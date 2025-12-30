# PromptPlay - User Guide

## Welcome to PromptPlay! 🎮

PromptPlay is an AI-powered game engine that transforms your ideas into playable 2D games. Simply describe what you want, and watch your game come to life in seconds.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Game](#creating-your-first-game)
3. [Understanding the Interface](#understanding-the-interface)
4. [Game Controls](#game-controls)
5. [Editing Game Specs](#editing-game-specs)
6. [Saving and Loading Games](#saving-and-loading-games)
7. [Writing Effective Prompts](#writing-effective-prompts)
8. [Supported Game Genres](#supported-game-genres)
9. [Troubleshooting](#troubleshooting)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- OpenAI API key (for game generation)
- Internet connection

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd GameDev
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure your API key:**
   Create a `.env.local` file in `apps/editor/`:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server:**
   ```bash
   pnpm --filter editor dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

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

## Understanding the Interface

### Layout Overview

```
┌─────────────────────────────────────────────────────┐
│  PromptPlay Logo                    [Save] [Load]   │
├──────────────┬──────────────────────────────────────┤
│              │  [Game Tab] [Spec Tab]               │
│  Create Your │  ┌────────────────────────────────┐  │
│  Game        │  │                                │  │
│              │  │     Game Canvas Area           │  │
│  Genre:      │  │     800x600 pixels             │  │
│  [Select]    │  │                                │  │
│              │  └────────────────────────────────┘  │
│  Describe:   │  Genre: platformer | Title: Fox...   │
│  [Textarea]  │  Controls: WASD/Arrows, Space...     │
│              │                                       │
│  [Generate]  │                                       │
│              │                                       │
│ Quick        │                                       │
│ Examples...  │                                       │
│              │                                       │
│ Game         │                                       │
│ Controls     │                                       │
│ [Play/Pause] │                                       │
│ [Reset]      │                                       │
└──────────────┴───────────────────────────────────────┘
```

### Left Panel

**Create Your Game Section:**
- **Genre Dropdown:** Select game type or auto-detect
- **Description Textarea:** Describe your game idea
- **Generate Button:** Create your game (with wand icon)
- **Quick Examples:** Pre-made prompts to try

**Game Controls Section:**
- **Play/Pause Button:** Start or pause the game
- **Reset Button:** Restart the current game

### Center Panel

**Tab Bar:**
- **Game Tab:** View and play your game
- **Spec Tab:** View/edit the JSON specification

**Game Canvas:**
- 800x600 pixel game area
- Real-time rendering at 60 FPS
- Displays active game

**Info Bar:**
- Shows genre, title, and controls

### Header

**Logo:** PromptPlay branding with sparkle icon
**Save Button:** Save current game to browser storage
**Load Button:** Load previously saved games

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

**Happy creating! 🎮✨**

---

*PromptPlay v1.0 - AI-Powered Game Engine*
