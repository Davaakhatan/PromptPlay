# Changelog

All notable changes to PromptPlay are documented in this file.

## [0.1.0] - 2025-01-02

### Phase 1: Testing Foundation

- Created test infrastructure for runtime-2d package
- Added mock Canvas2D context for renderer tests
- Added mock Matter.js for physics tests
- Implemented renderer, physics, and system tests

### Phase 2: FileSystem Completion

- Implemented binary file operations in Rust backend
- Added `read_file`, `write_file`, `create_directory` Tauri commands
- Updated TauriFileSystem class with full file operations
- Added comprehensive error handling for file operations

### Phase 3: Component Refactoring

- Refactored large components into smaller modules
- Created dedicated hooks for state management
- Extracted reusable UI components
- Improved code organization and maintainability

### Phase 4: Multi-Entity Selection

- Added entity selection state management
- Implemented click-to-select on canvas
- Added visual selection indicators with handles
- Keyboard shortcuts for entity operations (copy/paste/delete)

### Phase 5: Scene Management

- Scene tree with hierarchical entity display
- Entity search and filter functionality
- Tag-based organization system
- Drag-and-drop entity reordering

### Phase 6: Prefab System

- Built-in entity templates
- Quick-add buttons for common entities
- Component preset system
- Entity duplication with Ctrl+D

### Phase 7: Animation Editor

- Animation component support
- Sprite sheet frame configuration
- Animation playback controls
- Frame timing and loop settings

### Phase 8: Physics Debugging

- Physics debug overlay on canvas
- Collider visualization
- Real-time physics property editing
- Matter.js integration improvements

### Phase 9: TypeScript Custom Code Compilation

- Integrated esbuild-wasm for in-browser TypeScript compilation
- Created CompilationService for code validation and execution
- Added ScriptRunner component with module management
- Monaco editor integration with real-time error markers
- Script templates for common game systems
- Module load/unload functionality

### Phase 10: Advanced AI Features

- Created ChatHistoryService for persistent chat sessions
- Implemented useStreamingAI hook for token-by-token responses
- Added chat session management UI (create, switch, delete)
- Project-based chat history storage in `.promptplay/` directory
- Context-aware AI responses (game spec, selected entity, errors)
- Quick example prompts for common tasks

### UI/UX Polish

- Compact right panel tabs for better screen fit
- Save status indicator with visual feedback
- Undo/Redo timeline with history visualization
- Keyboard shortcuts throughout the application
- Welcome screen with recent projects
- Export to standalone HTML

## Features Summary

### Core Engine

- Entity Component System (bitecs)
- Canvas2D rendering with z-ordering
- Matter.js physics integration
- Fixed timestep game loop

### Editor

- Visual scene tree with search/filter
- Property inspector with component editors
- Monaco code editor with TypeScript support
- JSON editor for direct spec editing
- Asset browser for texture management

### AI Integration

- Natural language game modification
- Streaming responses with typing effect
- Persistent chat history
- Context-aware suggestions

### Export

- Standalone HTML export
- Embedded assets
- Cross-platform compatibility

## Technical Details

- **Desktop Framework**: Tauri 2.0
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Compiler**: esbuild-wasm
- **ECS**: bitecs
- **Physics**: Matter.js
- **Editor**: Monaco Editor
