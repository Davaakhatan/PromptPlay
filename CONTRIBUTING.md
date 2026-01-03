# Contributing to PromptPlay

Thank you for your interest in contributing to PromptPlay! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive environment. Be kind, constructive, and collaborative.

## Getting Started

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **pnpm 8+** - Package manager
- **Rust** - For Tauri desktop app (optional)
- **Git** - Version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/PromptPlay.git
   cd PromptPlay
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/Davaakhatan/PromptPlay.git
   ```

## Development Setup

### Install Dependencies

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### Run the Desktop App

```bash
# Development mode
cd apps/desktop
pnpm dev
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @promptplay/runtime-2d test

# Run tests with coverage
pnpm --filter @promptplay/runtime-2d test --coverage

# Watch mode
pnpm --filter @promptplay/runtime-2d test --watch
```

### Lint Code

```bash
pnpm lint
```

## Project Structure

```
PromptPlay/
├── apps/
│   └── desktop/                 # Tauri desktop application
│       ├── src/                 # React frontend
│       │   ├── components/      # UI components
│       │   ├── hooks/           # React hooks
│       │   └── services/        # Core services
│       └── src-tauri/           # Rust backend
│
├── packages/
│   ├── ecs-core/               # Entity Component System
│   ├── runtime-2d/             # 2D game runtime
│   ├── ai-prompt/              # AI integration
│   └── shared-types/           # TypeScript types
│
├── docs/                       # Documentation
└── examples/                   # Example games
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/animation-editor` - New features
- `fix/physics-collision` - Bug fixes
- `docs/api-reference` - Documentation
- `refactor/component-split` - Code refactoring
- `test/runtime-coverage` - Test additions

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(animation): add sprite sheet importer
fix(physics): correct ground detection for circles
docs(readme): update installation instructions
test(runtime): add camera system tests
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer `interface` over `type` for objects
- Use explicit return types on exported functions

```typescript
// Good
export function createEntity(name: string): EntityId {
  // ...
}

// Avoid
export function createEntity(name) {
  // ...
}
```

### React

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks

```typescript
// Good - Small, focused component
function EntityItem({ entity, onSelect }: EntityItemProps) {
  return (
    <div onClick={() => onSelect(entity.id)}>
      {entity.name}
    </div>
  );
}

// Avoid - Large, monolithic component
function SceneEditor({ ... }) {
  // 500+ lines of code
}
```

### File Organization

- One component per file
- Co-locate tests with source files or in `tests/` folder
- Use index files for public exports

```
components/
├── AnimationEditor/
│   ├── AnimationEditor.tsx
│   ├── AnimationTimeline.tsx
│   ├── SpriteSheetImporter.tsx
│   └── index.ts
```

## Testing

### Test Requirements

- **New features** must include tests
- **Bug fixes** should include regression tests
- **Minimum 80% coverage** for runtime-2d package

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GameWorld } from '../src/world/World';

describe('GameWorld', () => {
  it('should create entities with unique IDs', () => {
    const world = new GameWorld();
    const entity1 = world.createEntity('player');
    const entity2 = world.createEntity('enemy');

    expect(entity1).not.toBe(entity2);
  });

  it('should add tags to entities', () => {
    const world = new GameWorld();
    const entity = world.createEntity('player');

    world.addTag(entity, 'controllable');

    expect(world.hasTag(entity, 'controllable')).toBe(true);
  });
});
```

### Test Categories

1. **Unit Tests** - Test individual functions/classes
2. **Integration Tests** - Test component interactions
3. **System Tests** - Test ECS systems behavior

See [Testing Guide](docs/testing-guide.md) for detailed patterns.

## Pull Request Process

### Before Submitting

1. **Update from upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests:**
   ```bash
   pnpm test
   ```

3. **Run linter:**
   ```bash
   pnpm lint
   ```

4. **Build all packages:**
   ```bash
   pnpm build
   ```

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test addition

## Testing
- [ ] Added new tests
- [ ] All tests passing
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Added necessary documentation
- [ ] No breaking changes (or documented)
```

### Review Process

1. Submit PR against `main` branch
2. Automated tests run via CI
3. Maintainer reviews code
4. Address feedback
5. Maintainer merges when approved

## Issue Guidelines

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/videos if applicable
- Environment (OS, Node version, etc.)

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered
- Mockups/wireframes if applicable

### Labels

- `bug` - Something isn't working
- `feature` - New feature request
- `docs` - Documentation improvements
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed

## Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - General questions and ideas
- **Discord** - Real-time chat (coming soon)

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to PromptPlay!
