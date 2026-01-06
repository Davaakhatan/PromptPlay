/**
 * AI-friendly schema documentation for GameSpec generation
 * This module provides structured information to help AI generate valid game specs
 */

/**
 * Component combination patterns for common entity types
 */
export const ENTITY_PATTERNS = {
  player: {
    description: 'Player-controlled character',
    requiredComponents: ['transform', 'sprite', 'collider', 'input'],
    optionalComponents: ['health', 'animation', 'audio'],
    requiredTags: ['player'],
    example: {
      name: 'player',
      components: {
        transform: { x: 100, y: 400 },
        sprite: { texture: 'player', width: 32, height: 48, tint: '#3498dbff' },
        collider: { type: 'box', width: 32, height: 48 },
        input: { moveSpeed: 150, jumpForce: 280, canJump: true },
        health: { current: 100, max: 100 },
      },
      tags: ['player'],
    },
  },

  enemy: {
    description: 'AI-controlled hostile entity',
    requiredComponents: ['transform', 'sprite', 'collider', 'aiBehavior'],
    optionalComponents: ['health', 'animation'],
    requiredTags: ['enemy'],
    example: {
      name: 'enemy_1',
      components: {
        transform: { x: 500, y: 400 },
        sprite: { texture: 'enemy', width: 32, height: 32, tint: '#e74c3cff' },
        collider: { type: 'box', width: 32, height: 32 },
        aiBehavior: { type: 'patrol', speed: 100, detectionRadius: 150, patrolRange: 100 },
        health: { current: 50, max: 50 },
      },
      tags: ['enemy'],
    },
  },

  platform: {
    description: 'Static walkable surface',
    requiredComponents: ['transform', 'sprite', 'collider'],
    optionalComponents: [],
    requiredTags: ['static', 'platform'],
    example: {
      name: 'platform_1',
      components: {
        transform: { x: 400, y: 500 },
        sprite: { texture: 'platform', width: 200, height: 32, tint: '#2c3e50ff' },
        collider: { type: 'box', width: 200, height: 32 },
      },
      tags: ['static', 'platform'],
    },
  },

  collectible: {
    description: 'Item that can be collected by player',
    requiredComponents: ['transform', 'sprite', 'collider'],
    optionalComponents: ['animation', 'audio'],
    requiredTags: ['collectible'],
    colliderNote: 'Use isSensor: true for collectibles',
    example: {
      name: 'coin_1',
      components: {
        transform: { x: 300, y: 350 },
        sprite: { texture: 'coin', width: 24, height: 24, tint: '#f1c40fff' },
        collider: { type: 'circle', radius: 12, isSensor: true },
        animation: { frameCount: 8, frameDuration: 100, loop: true },
      },
      tags: ['collectible'],
    },
  },

  projectile: {
    description: 'Moving attack object',
    requiredComponents: ['transform', 'sprite', 'collider', 'velocity'],
    optionalComponents: ['particleEmitter'],
    requiredTags: ['projectile'],
    example: {
      name: 'bullet_1',
      components: {
        transform: { x: 0, y: 0 },
        sprite: { texture: 'bullet', width: 16, height: 8, tint: '#ecf0f1ff' },
        collider: { type: 'box', width: 16, height: 8, isSensor: true },
        velocity: { vx: 500, vy: 0 },
      },
      tags: ['projectile'],
    },
  },

  hazard: {
    description: 'Dangerous obstacle that damages player',
    requiredComponents: ['transform', 'sprite', 'collider'],
    optionalComponents: ['animation', 'particleEmitter'],
    requiredTags: ['hazard'],
    example: {
      name: 'spikes_1',
      components: {
        transform: { x: 600, y: 568 },
        sprite: { texture: 'spikes', width: 64, height: 32, tint: '#7f8c8dff' },
        collider: { type: 'box', width: 64, height: 32, isSensor: true },
      },
      tags: ['static', 'hazard'],
    },
  },

  trigger: {
    description: 'Invisible trigger zone for events',
    requiredComponents: ['transform', 'collider'],
    optionalComponents: ['sprite'],
    requiredTags: ['trigger'],
    example: {
      name: 'level_end',
      components: {
        transform: { x: 750, y: 300 },
        sprite: { texture: 'trigger', width: 64, height: 200, visible: false },
        collider: { type: 'box', width: 64, height: 200, isSensor: true },
      },
      tags: ['trigger'],
    },
  },

  camera: {
    description: 'Camera controller entity',
    requiredComponents: ['transform', 'camera'],
    optionalComponents: [],
    requiredTags: [],
    example: {
      name: 'main_camera',
      components: {
        transform: { x: 400, y: 300 },
        camera: {
          isActive: true,
          zoom: 1,
          followSmoothing: 0.1,
          offsetY: -50,
        },
      },
    },
  },
} as const;

/**
 * Genre-specific configuration defaults
 */
export const GENRE_DEFAULTS = {
  platformer: {
    description: 'Side-scrolling game with gravity and jumping',
    gravity: { x: 0, y: 1 },
    playerInput: { moveSpeed: 150, jumpForce: 280, canJump: true },
    enemyAI: { type: 'patrol', speed: 100, patrolRange: 100 },
    typicalEntities: ['player', 'platforms', 'enemies', 'collectibles'],
    tips: [
      'Place ground platform at bottom (y ≈ 560-580)',
      'Player typically starts on left side',
      'Stack platforms for vertical gameplay',
      'Use coins/collectibles as path guidance',
    ],
  },

  shooter: {
    description: 'Top-down or side-scrolling shooting game',
    gravity: { x: 0, y: 0 },
    playerInput: { moveSpeed: 200, jumpForce: 0, canJump: false },
    enemyAI: { type: 'chase', speed: 150, detectionRadius: 300 },
    typicalEntities: ['player', 'enemies', 'projectiles', 'powerups'],
    tips: [
      'No gravity for free movement',
      'Higher movement speeds',
      'Enemies typically chase or follow patterns',
      'Include projectile spawning logic',
    ],
  },

  puzzle: {
    description: 'Logic or physics puzzle game',
    gravity: { x: 0, y: 1 },
    playerInput: { moveSpeed: 120, jumpForce: 250, canJump: true },
    enemyAI: null,
    typicalEntities: ['player', 'blocks', 'switches', 'doors', 'collectibles'],
    tips: [
      'May or may not have gravity',
      'Focus on interactive objects',
      'Use triggers for puzzle mechanics',
      'Slower movement for precision',
    ],
  },
} as const;

/**
 * Color palette suggestions for consistent styling
 */
export const COLOR_PALETTE = {
  player: {
    blue: '#3498dbff',
    green: '#2ecc71ff',
    purple: '#9b59b6ff',
  },
  enemy: {
    red: '#e74c3cff',
    orange: '#e67e22ff',
    darkRed: '#c0392bff',
  },
  platform: {
    dark: '#2c3e50ff',
    brown: '#8b4513ff',
    gray: '#7f8c8dff',
    green: '#27ae60ff',
  },
  collectible: {
    gold: '#f1c40fff',
    silver: '#bdc3c7ff',
    gem: '#1abc9cff',
  },
  hazard: {
    red: '#e74c3cff',
    gray: '#7f8c8dff',
    orange: '#d35400ff',
  },
  background: {
    dark: '#1a1a2eff',
    sky: '#87ceebff',
    night: '#2c3e50ff',
  },
} as const;

/**
 * Common positioning patterns
 */
export const POSITIONING = {
  // Standard 800x600 canvas positions
  canvas: { width: 800, height: 600 },

  // Ground positions
  groundY: 580, // Center of ground platform at bottom
  groundHeight: 40,

  // Player spawn positions
  playerSpawn: {
    left: { x: 100, y: 400 },
    center: { x: 400, y: 300 },
    right: { x: 700, y: 400 },
  },

  // Platform height levels
  platformLevels: [
    { name: 'ground', y: 580 },
    { name: 'low', y: 480 },
    { name: 'mid', y: 380 },
    { name: 'high', y: 280 },
    { name: 'top', y: 180 },
  ],
} as const;

/**
 * Generate a condensed schema summary for AI context
 */
export function getSchemaContext(): string {
  return `
## GameSpec Schema Summary

### Required Structure
{
  "version": "1.0",
  "metadata": { "title": string, "genre": "platformer"|"shooter"|"puzzle", "description": string },
  "config": { "gravity": {x,y}, "worldBounds": {width,height} },
  "entities": [...],
  "systems": ["physics", "input", "collision", "render"]
}

### Entity Components
- transform: { x, y, rotation?, scaleX?, scaleY? } - REQUIRED for position
- sprite: { texture, width, height, tint?, zIndex? } - REQUIRED for visuals
- collider: { type: "box"|"circle", width/height or radius, isSensor? }
- input: { moveSpeed, jumpForce, canJump? } - For player control
- health: { current, max }
- aiBehavior: { type: "patrol"|"chase"|"flee", speed, detectionRadius }
- animation: { frameCount, frameDuration, loop? }
- camera: { zoom?, followTarget?, followSmoothing? }
- particleEmitter: { emitRate, startColor, endColor, ... }

### Tags (for entity behavior)
- "player" - Player entity
- "enemy" - Hostile entity
- "static" - Immovable (platforms, walls)
- "collectible" - Can be collected
- "hazard" - Damages player
- "trigger" - Event trigger zone

### Genre Settings
- Platformer: gravity {x:0, y:1}, jumpForce: 250-320
- Shooter: gravity {x:0, y:0}, no jump needed
- Puzzle: varies by design

### Color Format
Use hex with alpha: "#RRGGBBaa" (e.g., "#3498dbff" for blue)

### Positioning (800x600 canvas)
- Ground Y: 560-580
- Player spawn: x:100, y:400 (left side)
- Platform widths: 100-800px
`.trim();
}

/**
 * Get example entity JSON for a specific type
 */
export function getEntityExample(
  type: keyof typeof ENTITY_PATTERNS
): string {
  const pattern = ENTITY_PATTERNS[type];
  return JSON.stringify(pattern.example, null, 2);
}

/**
 * Get full game spec example for a genre
 */
export function getGenreExample(genre: 'platformer' | 'shooter' | 'puzzle'): string {
  const examples: Record<string, object> = {
    platformer: {
      version: '1.0',
      metadata: {
        title: 'Platformer Example',
        genre: 'platformer',
        description: 'A simple platformer game',
      },
      config: {
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
      entities: [
        ENTITY_PATTERNS.player.example,
        {
          name: 'ground',
          components: {
            transform: { x: 400, y: 580 },
            sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
            collider: { type: 'box', width: 800, height: 40 },
          },
          tags: ['static', 'platform'],
        },
        ENTITY_PATTERNS.enemy.example,
        ENTITY_PATTERNS.collectible.example,
      ],
      systems: ['physics', 'input', 'collision', 'render', 'animation', 'ai'],
    },
    shooter: {
      version: '1.0',
      metadata: {
        title: 'Shooter Example',
        genre: 'shooter',
        description: 'A simple top-down shooter',
      },
      config: {
        gravity: { x: 0, y: 0 },
        worldBounds: { width: 800, height: 600 },
      },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 400, y: 500 },
            sprite: { texture: 'ship', width: 48, height: 48, tint: '#3498dbff' },
            collider: { type: 'circle', radius: 20 },
            input: { moveSpeed: 200, jumpForce: 0 },
            health: { current: 3, max: 3 },
          },
          tags: ['player'],
        },
        {
          name: 'enemy_1',
          components: {
            transform: { x: 200, y: 100 },
            sprite: { texture: 'enemy', width: 40, height: 40, tint: '#e74c3cff' },
            collider: { type: 'circle', radius: 18 },
            aiBehavior: { type: 'chase', speed: 100, detectionRadius: 400 },
            health: { current: 1, max: 1 },
          },
          tags: ['enemy'],
        },
      ],
      systems: ['physics', 'input', 'collision', 'render', 'ai'],
    },
    puzzle: {
      version: '1.0',
      metadata: {
        title: 'Puzzle Example',
        genre: 'puzzle',
        description: 'A simple puzzle game',
      },
      config: {
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 100, y: 400 },
            sprite: { texture: 'player', width: 32, height: 32, tint: '#3498dbff' },
            collider: { type: 'box', width: 32, height: 32 },
            input: { moveSpeed: 120, jumpForce: 250, canJump: true },
          },
          tags: ['player'],
        },
        {
          name: 'ground',
          components: {
            transform: { x: 400, y: 580 },
            sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
            collider: { type: 'box', width: 800, height: 40 },
          },
          tags: ['static', 'platform'],
        },
        {
          name: 'goal',
          components: {
            transform: { x: 700, y: 400 },
            sprite: { texture: 'goal', width: 48, height: 48, tint: '#2ecc71ff' },
            collider: { type: 'box', width: 48, height: 48, isSensor: true },
          },
          tags: ['trigger'],
        },
      ],
      systems: ['physics', 'input', 'collision', 'render'],
    },
  };

  return JSON.stringify(examples[genre], null, 2);
}
