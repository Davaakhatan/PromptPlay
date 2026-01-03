# PromptPlay Testing Guide

This guide covers testing patterns and best practices for PromptPlay development.

## Overview

PromptPlay uses **Vitest** for testing with the following goals:

- **80%+ coverage** on runtime-2d package
- **Fast feedback** with watch mode
- **Reliable tests** that don't flake

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @promptplay/runtime-2d test

# Run with coverage
pnpm --filter @promptplay/runtime-2d test --coverage

# Watch mode (re-run on file changes)
pnpm --filter @promptplay/runtime-2d test --watch

# Run single test file
pnpm --filter @promptplay/runtime-2d test animationSystem

# Run tests matching pattern
pnpm --filter @promptplay/runtime-2d test --grep "should advance frame"
```

## Test Structure

### File Organization

```
packages/runtime-2d/
├── src/
│   ├── systems/
│   │   ├── AnimationSystem.ts
│   │   └── InputSystem.ts
│   └── physics/
│       └── MatterPhysics.ts
└── tests/
    ├── animationSystem.test.ts
    ├── inputSystem.test.ts
    └── physics.test.ts
```

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ComponentName', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize test state
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up resources
  });

  describe('feature group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

## Testing Patterns

### Testing ECS Systems

```typescript
import { GameWorld, Transform, Velocity } from '@promptplay/ecs-core';
import { addComponent } from 'bitecs';

describe('MySystem', () => {
  let world: GameWorld;
  let mySystem: MySystem;

  beforeEach(() => {
    world = new GameWorld();
    mySystem = new MySystem();
    mySystem.init(world);
  });

  // Helper to create test entities
  function createTestEntity(): number {
    const eid = world.createEntity('test-entity');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    Transform.x[eid] = 100;
    Transform.y[eid] = 200;

    addComponent(w, Velocity, eid);
    Velocity.vx[eid] = 10;
    Velocity.vy[eid] = 0;

    return eid;
  }

  it('should update entity position based on velocity', () => {
    const eid = createTestEntity();
    const initialX = Transform.x[eid];

    mySystem.update(world, 1); // 1 second delta

    expect(Transform.x[eid]).toBe(initialX + 10);
  });
});
```

### Testing Animation System

```typescript
describe('AnimationSystem', () => {
  function createAnimatedEntity(
    frameCount: number,
    frameDuration: number,
    loop = true
  ): number {
    const eid = world.createEntity('animated');
    const w = world.getWorld();

    addComponent(w, Sprite, eid);
    addComponent(w, Animation, eid);

    Animation.frameCount[eid] = frameCount;
    Animation.frameDuration[eid] = frameDuration;
    Animation.loop[eid] = loop ? 1 : 0;
    Animation.isPlaying[eid] = 1;
    Animation.currentFrame[eid] = 0;
    Animation.elapsed[eid] = 0;

    return eid;
  }

  describe('frame advancement', () => {
    it('should advance frame after frame duration', () => {
      const eid = createAnimatedEntity(4, 100); // 4 frames, 100ms

      animationSystem.update(world, 0.1); // 100ms

      expect(Animation.currentFrame[eid]).toBe(1);
    });

    it('should accumulate time across updates', () => {
      const eid = createAnimatedEntity(4, 100);

      animationSystem.update(world, 0.05); // 50ms
      animationSystem.update(world, 0.05); // 50ms

      expect(Animation.currentFrame[eid]).toBe(1);
    });
  });

  describe('looping', () => {
    it('should loop back to frame 0 when enabled', () => {
      const eid = createAnimatedEntity(3, 100, true);
      Animation.currentFrame[eid] = 2; // Last frame

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(0);
    });

    it('should stop at last frame when disabled', () => {
      const eid = createAnimatedEntity(3, 100, false);
      Animation.currentFrame[eid] = 2;

      animationSystem.update(world, 0.1);

      expect(Animation.currentFrame[eid]).toBe(2);
      expect(Animation.isPlaying[eid]).toBe(0);
    });
  });
});
```

### Testing Physics

```typescript
import { MatterPhysics } from '../src/physics/MatterPhysics';
import { Engine as MatterEngine } from 'matter-js';

describe('MatterPhysics', () => {
  let engine: MatterEngine;
  let world: GameWorld;
  let physics: MatterPhysics;

  beforeEach(() => {
    engine = MatterEngine.create({ gravity: { x: 0, y: 1 } });
    world = new GameWorld();
    physics = new MatterPhysics(engine, world);
    physics.initialize();
  });

  afterEach(() => {
    physics.cleanup();
  });

  function createPhysicsEntity(isStatic = false): number {
    const eid = world.createEntity('physics-entity');
    const w = world.getWorld();

    addComponent(w, Transform, eid);
    Transform.x[eid] = 100;
    Transform.y[eid] = 100;

    addComponent(w, Collider, eid);
    Collider.type[eid] = 0; // box
    Collider.width[eid] = 32;
    Collider.height[eid] = 32;

    if (isStatic) {
      world.addTag(eid, 'static');
    }

    return eid;
  }

  describe('body creation', () => {
    it('should create body for entity with collider', () => {
      const eid = createPhysicsEntity();

      physics.update(0.016);

      const body = physics.getBody(eid);
      expect(body).toBeDefined();
    });

    it('should create static body for tagged entities', () => {
      const eid = createPhysicsEntity(true);

      physics.update(0.016);

      const body = physics.getBody(eid);
      expect(body?.isStatic).toBe(true);
    });
  });

  describe('ground detection', () => {
    it('should detect when entity is grounded', () => {
      const eid = createPhysicsEntity();
      // Setup ground contact...

      expect(physics.isGrounded(eid)).toBe(true);
    });
  });
});
```

### Testing Input System

```typescript
import { InputManager } from '../src/input/InputManager';

describe('InputManager', () => {
  let canvas: HTMLCanvasElement;
  let inputManager: InputManager;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    inputManager.cleanup();
  });

  function simulateKeyDown(key: string): void {
    const event = new KeyboardEvent('keydown', { code: key });
    window.dispatchEvent(event);
  }

  function simulateKeyUp(key: string): void {
    const event = new KeyboardEvent('keyup', { code: key });
    window.dispatchEvent(event);
  }

  describe('key state tracking', () => {
    it('should track key down state', () => {
      simulateKeyDown('Space');

      expect(inputManager.isKeyDown('Space')).toBe(true);
    });

    it('should track key up state', () => {
      simulateKeyDown('Space');
      simulateKeyUp('Space');

      expect(inputManager.isKeyDown('Space')).toBe(false);
    });

    it('should detect key pressed (edge trigger)', () => {
      simulateKeyDown('Space');

      expect(inputManager.isKeyPressed('Space')).toBe(true);

      inputManager.update(); // Clear pressed state

      expect(inputManager.isKeyPressed('Space')).toBe(false);
    });
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

describe('with mocks', () => {
  it('should call callback on collision', () => {
    const callback = vi.fn();

    physics.onCollision('player', 'enemy', callback);
    // Trigger collision...

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.any(Number), // playerEid
      expect.any(Number)  // enemyEid
    );
  });

  it('should use mocked time', () => {
    vi.useFakeTimers();

    gameLoop.start(updateFn, renderFn);
    vi.advanceTimersByTime(1000);

    expect(updateFn).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
```

### Testing Canvas Renderer

```typescript
describe('Canvas2DRenderer', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let renderer: Canvas2DRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;

    // Spy on context methods
    vi.spyOn(ctx, 'drawImage');
    vi.spyOn(ctx, 'fillRect');
    vi.spyOn(ctx, 'clearRect');

    renderer = new Canvas2DRenderer(canvas, world, {
      width: 800,
      height: 600,
    });
  });

  it('should clear canvas before rendering', async () => {
    await renderer.initialize();
    renderer.render();

    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('should draw sprites in z-order', async () => {
    // Create entities with different z-indices...

    renderer.render();

    // Verify draw order by checking call order
    const calls = (ctx.drawImage as any).mock.calls;
    // Assert correct order...
  });
});
```

## Edge Cases to Test

### ECS Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle empty world', () => {
    expect(() => system.update(world, 0.016)).not.toThrow();
  });

  it('should handle entity without required components', () => {
    const eid = world.createEntity('incomplete');
    // Only add some components, not all required

    expect(() => system.update(world, 0.016)).not.toThrow();
  });

  it('should handle destroyed entities', () => {
    const eid = createTestEntity();
    world.destroyEntity(eid);

    expect(() => system.update(world, 0.016)).not.toThrow();
  });

  it('should handle zero delta time', () => {
    createTestEntity();

    expect(() => system.update(world, 0)).not.toThrow();
  });

  it('should handle very large delta time', () => {
    createTestEntity();

    expect(() => system.update(world, 10)).not.toThrow();
  });
});
```

### Physics Edge Cases

```typescript
describe('physics edge cases', () => {
  it('should handle overlapping bodies', () => {
    // Create two bodies at same position
    const eid1 = createPhysicsEntity();
    const eid2 = createPhysicsEntity();
    Transform.x[eid2] = Transform.x[eid1];
    Transform.y[eid2] = Transform.y[eid1];

    expect(() => physics.update(0.016)).not.toThrow();
  });

  it('should handle zero-size colliders', () => {
    const eid = createPhysicsEntity();
    Collider.width[eid] = 0;
    Collider.height[eid] = 0;

    expect(() => physics.update(0.016)).not.toThrow();
  });
});
```

## Test Coverage

### Viewing Coverage Report

```bash
pnpm --filter @promptplay/runtime-2d test --coverage

# Open HTML report
open packages/runtime-2d/coverage/index.html
```

### Coverage Targets

| Package | Target | Current |
|---------|--------|---------|
| runtime-2d | 80% | 80%+ |
| ecs-core | 70% | TBD |
| ai-prompt | 60% | TBD |

### What to Cover

**Must cover:**
- Public API methods
- State transitions
- Error handling paths
- Edge cases

**May skip:**
- Private helper functions (if tested via public API)
- Trivial getters/setters
- Debug/logging code

## Best Practices

### Do

- Write tests before or alongside code
- Use descriptive test names
- Test one thing per test
- Use helper functions for entity creation
- Clean up resources in afterEach

### Don't

- Test implementation details
- Depend on test execution order
- Use hardcoded timeouts (use fake timers)
- Leave console.log in tests
- Skip flaky tests (fix them)

### Naming Conventions

```typescript
// Good: Describes behavior
it('should advance frame after frame duration', () => {});
it('should loop back to frame 0 when loop is enabled', () => {});
it('should stop at last frame when loop is disabled', () => {});

// Bad: Too vague
it('works', () => {});
it('handles animation', () => {});
it('test 1', () => {});
```

## Debugging Tests

### Run Single Test

```bash
pnpm --filter @promptplay/runtime-2d test --grep "should advance frame"
```

### Debug Mode

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/vitest run
```

### Verbose Output

```bash
pnpm --filter @promptplay/runtime-2d test --reporter=verbose
```

### View Failed Diffs

Vitest shows detailed diffs for failed assertions. Use `toMatchSnapshot()` for complex objects.

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Manual workflow dispatch

CI configuration is in `.github/workflows/test.yml`.

## Adding Tests for New Features

1. Create test file in `tests/` directory
2. Follow existing patterns in similar tests
3. Cover happy path, edge cases, and errors
4. Run full test suite before committing
5. Ensure coverage doesn't decrease

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/) (for React components)
- [bitecs Testing Patterns](https://github.com/NateTheGreatt/bitecs)
