# @promptplay/ai-prompt

> AI Integration for PromptPlay - Natural language game generation with Claude

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Claude API](https://img.shields.io/badge/Claude-API-purple.svg)](https://www.anthropic.com/api)

## Overview

The AI Prompt package powers PromptPlay's natural language game creation:

- **System Prompts** - Genre-specific prompts for accurate game generation
- **Spec Validation** - Validate AI-generated GameSpec against schema
- **Template Library** - Platformer, shooter, puzzle base prompts
- **Context Building** - Include game state for modification requests

## Installation

```bash
pnpm add @promptplay/ai-prompt
```

## Quick Start

```typescript
import {
  SYSTEM_PROMPT,
  PLATFORMER_PROMPT,
  validateGameSpec,
  isValidGameSpec,
} from '@promptplay/ai-prompt';

// Use system prompt with your AI client
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: SYSTEM_PROMPT + PLATFORMER_PROMPT,
  messages: [
    {
      role: 'user',
      content: 'Create a platformer with a blue player that can double-jump',
    },
  ],
});

// Validate the generated spec
const spec = JSON.parse(response.content[0].text);
const errors = validateGameSpec(spec);

if (errors.length === 0) {
  console.log('Valid game spec!');
} else {
  console.error('Validation errors:', errors);
}
```

## System Prompts

### Base System Prompt

The `SYSTEM_PROMPT` defines the GameSpec JSON schema and rules for generation:

```typescript
import { SYSTEM_PROMPT } from '@promptplay/ai-prompt';

// Contains:
// - Full GameSpec JSON schema
// - Component definitions (transform, sprite, collider, etc.)
// - Generation rules (gravity settings, positioning, etc.)
// - Tag conventions (static, player, enemy, etc.)
```

### Genre-Specific Prompts

```typescript
import {
  PLATFORMER_PROMPT,
  SHOOTER_PROMPT,
  PUZZLE_PROMPT,
} from '@promptplay/ai-prompt';

// Platformer: Side-scrolling, gravity, platforms, jump mechanics
// Shooter: Top-down or side-view, projectiles, enemies
// Puzzle: Grid-based, objects, win conditions
```

## Prompt Templates

### Platformer

```typescript
import { PLATFORMER_PROMPT } from '@promptplay/ai-prompt';

// Adds:
// - Platform placement patterns
// - Player spawn conventions
// - Enemy patrol behaviors
// - Collectible placement
// - Level progression hints
```

### Shooter

```typescript
import { SHOOTER_PROMPT } from '@promptplay/ai-prompt';

// Adds:
// - Weapon systems
// - Enemy wave patterns
// - Projectile physics
// - Health/damage conventions
// - Zero-gravity movement
```

### Puzzle

```typescript
import { PUZZLE_PROMPT } from '@promptplay/ai-prompt';

// Adds:
// - Grid snapping
// - Object interaction rules
// - Win condition patterns
// - Puzzle mechanics (push, collect, activate)
```

## Validation

### Validate GameSpec

```typescript
import { validateGameSpec } from '@promptplay/ai-prompt';

const spec = {
  version: '1.0',
  metadata: { title: 'Test', genre: 'platformer', description: '' },
  config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
  entities: [],
  systems: ['physics', 'render'],
};

const errors = validateGameSpec(spec);
// Returns array of error messages, empty if valid

if (errors.length > 0) {
  console.error('Invalid spec:', errors);
}
```

### Quick Validation Check

```typescript
import { isValidGameSpec } from '@promptplay/ai-prompt';

if (isValidGameSpec(spec)) {
  // Spec is valid, proceed
  runtime.loadGameSpec(spec);
}
```

## Building Context for Modifications

When modifying an existing game, include current state in the prompt:

```typescript
const currentSpec = runtime.getGameSpec();

const modificationPrompt = `
Here is the current game state:
${JSON.stringify(currentSpec, null, 2)}

User request: "${userMessage}"

Modify the game spec to fulfill the request. Return the complete updated JSON.
`;
```

## Integration Patterns

### Desktop App Integration

The desktop app uses Tauri's Rust backend for AI calls:

```typescript
// In desktop app (src-tauri/src/ai_client.rs)
// - Handles Claude API authentication
// - Streams responses for real-time feedback
// - Manages conversation history

// Frontend sends requests via Tauri commands
import { invoke } from '@tauri-apps/api/core';

const response = await invoke('ai_chat', {
  message: 'Add a red enemy that chases the player',
  currentSpec: gameSpec,
});
```

### Demo Mode

For testing without API keys:

```typescript
// Demo mode simulates AI responses with template modifications
const demoResponses = {
  'add enemy': generateEnemyEntity,
  'change color': modifyEntityColor,
  'add platform': generatePlatformEntity,
};
```

## Best Practices

### Prompt Engineering

1. **Be Specific** - Include exact colors, sizes, positions when needed
2. **Use Genre Context** - Always include appropriate genre prompt
3. **Validate Output** - Always validate before loading into runtime
4. **Handle Errors** - AI may occasionally generate invalid JSON

### Context Management

```typescript
// Keep context focused - don't send entire game history
const relevantContext = {
  entities: currentSpec.entities.slice(0, 10), // Limit entity count
  config: currentSpec.config,
  metadata: currentSpec.metadata,
};
```

### Error Handling

```typescript
try {
  const spec = JSON.parse(aiResponse);
  const errors = validateGameSpec(spec);

  if (errors.length > 0) {
    // Ask AI to fix errors
    const fixPrompt = `The previous response had these errors: ${errors.join(', ')}. Please fix and return valid JSON.`;
  }
} catch (e) {
  // Handle JSON parse error
  console.error('AI returned invalid JSON');
}
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `SYSTEM_PROMPT` | string | Base system prompt with schema |
| `PLATFORMER_PROMPT` | string | Platformer-specific additions |
| `SHOOTER_PROMPT` | string | Shooter-specific additions |
| `PUZZLE_PROMPT` | string | Puzzle-specific additions |
| `validateGameSpec` | function | Validate spec, return errors |
| `isValidGameSpec` | function | Quick boolean validation |

### validateGameSpec

```typescript
function validateGameSpec(spec: unknown): string[];
```

Returns an array of error messages. Empty array means valid.

**Checks:**
- Required fields (version, metadata, config, entities, systems)
- Entity structure (name, components)
- Component property types
- Valid genres (platformer, shooter, puzzle)
- Valid collider types (box, circle)
- Valid AI behavior types (patrol, chase, flee)

### isValidGameSpec

```typescript
function isValidGameSpec(spec: unknown): boolean;
```

Returns `true` if spec is valid, `false` otherwise.

## Architecture

```
ai-prompt/
├── src/
│   ├── index.ts              # Main exports
│   ├── OpenAIClient.ts       # Generic AI client (for reference)
│   ├── templates/
│   │   ├── base.ts           # SYSTEM_PROMPT
│   │   ├── platformer.ts     # PLATFORMER_PROMPT
│   │   ├── shooter.ts        # SHOOTER_PROMPT
│   │   └── puzzle.ts         # PUZZLE_PROMPT
│   └── validators/
│       └── SpecValidator.ts  # Validation functions
└── package.json
```

## Future Enhancements

- **JSON Schema** - Full JSON Schema for IDE integration
- **Streaming Support** - Token-by-token validation
- **Custom Templates** - User-defined genre templates
- **AI Playtesting** - Automated game testing feedback

## License

MIT License - see [LICENSE](../../LICENSE) for details.
