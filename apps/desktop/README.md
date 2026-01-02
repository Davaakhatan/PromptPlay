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

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Rust + Tauri 2.0
- **Game Runtime**: Canvas2D + Matter.js (from monorepo packages)
- **Compiler**: esbuild-wasm for TypeScript compilation

## Project Structure

```
apps/desktop/
├── src/                        # React frontend
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Main component
│   ├── index.css              # Global styles
│   ├── components/            # UI components
│   │   ├── GameCanvas.tsx     # Game rendering canvas
│   │   ├── SceneTree.tsx      # Entity hierarchy view
│   │   ├── Inspector.tsx      # Property editor
│   │   ├── FileTree.tsx       # File browser
│   │   ├── CodeEditor.tsx     # Monaco code editor
│   │   ├── AIPromptPanel.tsx  # AI chat interface
│   │   ├── ScriptRunner.tsx   # TypeScript runner
│   │   ├── JSONEditorPanel.tsx # JSON editor
│   │   ├── AssetBrowser.tsx   # Asset management
│   │   └── WelcomeScreen.tsx  # Project launcher
│   ├── hooks/                 # React hooks
│   │   └── useStreamingAI.ts  # Streaming AI responses
│   └── services/              # Business logic
│       ├── ChatHistoryService.ts  # Chat persistence
│       ├── CompilationService.ts  # TypeScript compilation
│       └── FileSystem.ts          # File operations
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Tauri app entry
│   │   ├── commands.rs       # IPC commands
│   │   └── file_watcher.rs   # Hot reload
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
├── package.json              # Node dependencies
├── vite.config.ts            # Vite configuration
└── tailwind.config.js        # Tailwind configuration
```

## Features

### Visual Scene Editor

- **Scene Tree** - Hierarchical entity view with search/filter
- **Entity Operations** - Create, rename, copy, paste, duplicate, delete
- **Tag System** - Organize entities with visual tags
- **Drag Selection** - Click to select entities on canvas
- **Resize Handles** - Visual handles for entity sizing

### AI Assistant

- **Natural Language** - Describe changes in plain English
- **Chat History** - Persistent sessions saved per project
- **Streaming Display** - Token-by-token response rendering
- **Context Awareness** - AI understands game spec and selection
- **Example Prompts** - Quick-start templates for common tasks

### TypeScript Compilation

- **esbuild Integration** - Fast in-browser TypeScript compilation
- **Live Validation** - Real-time error checking as you type
- **Custom Systems** - Create and load custom game systems
- **Module Management** - Load/unload compiled modules
- **Script Templates** - Built-in templates for common patterns

### Monaco Code Editor

- **Syntax Highlighting** - TypeScript, JavaScript, JSON, CSS, HTML
- **Error Markers** - Visual error indicators from compilation
- **Auto-complete** - IntelliSense for TypeScript
- **Keyboard Shortcuts** - Cmd+S to save, standard editor keys
- **Line Navigation** - Click errors to jump to line

### Undo/Redo System

- **Visual Timeline** - See history with change indicators
- **Unlimited Undo** - Go back to any previous state
- **Keyboard Support** - Ctrl+Z / Ctrl+Shift+Z
- **Save Indicator** - Visual feedback for unsaved changes

### Export System

- **HTML Export** - Single-file standalone games
- **Asset Bundling** - All textures embedded
- **Cross-Platform** - Works in any modern browser

### Game Preview

- **Play/Pause/Reset** - Full playback controls
- **Entity Selection** - Click to select in running game
- **Physics Debug** - Visualize colliders and physics
- **Real-time Updates** - Changes reflect immediately

### File System

- **Project Browser** - Open projects from disk
- **File Tree** - Navigate project directories
- **Hot Reload** - Auto-reload on file changes
- **Recent Projects** - Quick access to previous work

## Keyboard Shortcuts

| Shortcut                       | Action           |
| ------------------------------ | ---------------- |
| `Ctrl+S` / `Cmd+S`             | Save file        |
| `Ctrl+Z` / `Cmd+Z`             | Undo             |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo             |
| `Ctrl+C` / `Cmd+C`             | Copy entity      |
| `Ctrl+V` / `Cmd+V`             | Paste entity     |
| `Ctrl+D` / `Cmd+D`             | Duplicate entity |
| `Delete` / `Backspace`         | Delete entity    |
| `Escape`                       | Deselect / Close |

## Services

### ChatHistoryService

Manages persistent chat sessions per project:

- Sessions stored in `.promptplay/chat-history.json`
- Auto-generates titles from first message
- Keeps last 50 sessions per project

### CompilationService

esbuild-wasm powered TypeScript compiler:

- Validates TypeScript without executing
- Compiles and loads custom modules
- Creates sandboxed script execution
- Exports system functions for game loop

### FileSystem

Tauri IPC wrapper for file operations:

- Read/write text and binary files
- Directory listing and creation
- File existence checks
- Path utilities

## Status

**Complete:**

- Tauri 2.0 desktop app
- File system operations
- Visual scene editor
- Entity management (CRUD + copy/paste)
- Monaco code editor
- TypeScript compilation (esbuild)
- AI chat with history
- Streaming AI responses
- Undo/Redo with timeline
- Export to HTML
- Keyboard shortcuts
- Search/filter in SceneTree
- Physics debug overlay
