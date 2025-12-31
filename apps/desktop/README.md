# PromptPlay Desktop

AI-First 2D Game Engine built with Tauri 2.0

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Rust + Tauri 2.0
- **Game Runtime**: PixiJS + Matter.js (from monorepo packages)

## Project Structure

```
apps/desktop/
├── src/                    # React frontend
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Main component
│   └── index.css          # Global styles
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri app entry
│   │   └── lib.rs         # Library code
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── package.json           # Node dependencies
├── vite.config.ts         # Vite configuration
└── tailwind.config.js     # Tailwind configuration
```

## Features

### Game View
- Load and run games from `game.json` files
- Real-time game rendering with PixiJS
- Physics simulation with Matter.js
- Play/Pause/Reset controls
- 60 FPS performance

### Code View
- Monaco code editor (VSCode in browser)
- File tree with directory navigation
- TypeScript/JavaScript/JSON syntax highlighting
- IntelliSense and autocomplete
- Save files with Cmd+S (Ctrl+S)
- Auto-reload game.json changes

### Three-Panel Layout
- **Left**: File tree and project browser
- **Center**: Game canvas OR code editor (tabbed)
- **Right**: Inspector with game/file metadata

## Status

✅ **Phase 1 Complete - Weeks 1-3**
- ✅ Tauri 2.0 desktop app
- ✅ File system operations (read/write/list)
- ✅ Game runtime integration (PixiJS + Matter.js)
- ✅ Monaco code editor
- ✅ File tree navigation
- ✅ Play/pause/reset controls

⏳ **Phase 2 Next - Weeks 4-5**
- File watcher for hot reload
- TypeScript compilation
- Error overlay
