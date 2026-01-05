/**
 * TemplateService - Game template generation and management
 *
 * Provides:
 * - Built-in game templates (10+ varieties)
 * - AI-powered template generation from descriptions
 * - Template customization helpers
 */

import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  genre: 'platformer' | 'shooter' | 'puzzle';
  icon: string; // Emoji or icon identifier
  color: string; // Tailwind color class
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  preview?: string; // Base64 thumbnail
}

/**
 * Built-in game templates
 */
export const GAME_TEMPLATES: GameTemplate[] = [
  // Platformers
  {
    id: 'platformer-basic',
    name: 'Basic Platformer',
    description: 'Classic side-scrolling with player, platforms, and collectibles',
    genre: 'platformer',
    icon: 'game',
    color: 'blue',
    difficulty: 'beginner',
    tags: ['platformer', 'beginner', 'classic'],
  },
  {
    id: 'platformer-adventure',
    name: 'Adventure Platformer',
    description: 'Multi-level adventure with enemies, power-ups, and checkpoints',
    genre: 'platformer',
    icon: 'map',
    color: 'emerald',
    difficulty: 'intermediate',
    tags: ['platformer', 'adventure', 'enemies'],
  },
  {
    id: 'platformer-precision',
    name: 'Precision Platformer',
    description: 'Challenging obstacle course with spikes, moving platforms, and tight jumps',
    genre: 'platformer',
    icon: 'skull',
    color: 'red',
    difficulty: 'advanced',
    tags: ['platformer', 'hard', 'precision'],
  },
  {
    id: 'endless-runner',
    name: 'Endless Runner',
    description: 'Auto-scrolling runner with obstacles and score tracking',
    genre: 'platformer',
    icon: 'run',
    color: 'orange',
    difficulty: 'intermediate',
    tags: ['runner', 'endless', 'score'],
  },

  // Shooters
  {
    id: 'shooter-space',
    name: 'Space Shooter',
    description: 'Classic top-down space shooter with waves of enemies',
    genre: 'shooter',
    icon: 'rocket',
    color: 'purple',
    difficulty: 'beginner',
    tags: ['shooter', 'space', 'arcade'],
  },
  {
    id: 'shooter-twin-stick',
    name: 'Twin-Stick Shooter',
    description: 'Arena shooter with 360-degree movement and shooting',
    genre: 'shooter',
    icon: 'target',
    color: 'rose',
    difficulty: 'intermediate',
    tags: ['shooter', 'arena', 'action'],
  },
  {
    id: 'shooter-bullet-hell',
    name: 'Bullet Hell',
    description: 'Intense shooter with complex bullet patterns',
    genre: 'shooter',
    icon: 'explosion',
    color: 'pink',
    difficulty: 'advanced',
    tags: ['shooter', 'bullet-hell', 'hard'],
  },

  // Puzzles
  {
    id: 'puzzle-sokoban',
    name: 'Box Pusher',
    description: 'Push boxes onto targets in this Sokoban-style puzzle',
    genre: 'puzzle',
    icon: 'cube',
    color: 'amber',
    difficulty: 'beginner',
    tags: ['puzzle', 'sokoban', 'logic'],
  },
  {
    id: 'puzzle-maze',
    name: 'Maze Runner',
    description: 'Navigate through mazes to find the exit',
    genre: 'puzzle',
    icon: 'maze',
    color: 'cyan',
    difficulty: 'beginner',
    tags: ['puzzle', 'maze', 'exploration'],
  },
  {
    id: 'puzzle-physics',
    name: 'Physics Puzzle',
    description: 'Use physics to solve puzzles with balls and blocks',
    genre: 'puzzle',
    icon: 'cog',
    color: 'slate',
    difficulty: 'intermediate',
    tags: ['puzzle', 'physics', 'creative'],
  },

  // Special
  {
    id: 'empty',
    name: 'Empty Project',
    description: 'Start from scratch with just a player entity',
    genre: 'platformer',
    icon: 'document',
    color: 'gray',
    difficulty: 'beginner',
    tags: ['empty', 'blank', 'custom'],
  },
];

/**
 * Get template spec by ID
 */
export function getTemplateSpec(templateId: string, projectName: string): GameSpec {
  const template = GAME_TEMPLATES.find(t => t.id === templateId);
  const genre = template?.genre || 'platformer';

  const baseSpec: GameSpec = {
    version: '1.0',
    metadata: {
      title: projectName,
      genre,
      description: template?.description || `A ${genre} game created with PromptPlay`,
    },
    config: {
      gravity: genre === 'shooter' ? { x: 0, y: 0 } : { x: 0, y: 1 },
      worldBounds: { width: 800, height: 600 },
    },
    entities: [],
    systems: ['physics', 'input', 'collision', 'render'],
  };

  switch (templateId) {
    case 'platformer-basic':
      return {
        ...baseSpec,
        entities: [
          createPlayer(100, 400),
          createGround(),
          createPlatform('platform_1', 200, 480, 150),
          createPlatform('platform_2', 450, 380, 150),
          createPlatform('platform_3', 650, 280, 150),
          createCoin('coin_1', 200, 440),
          createCoin('coin_2', 450, 340),
          createCoin('coin_3', 650, 240),
        ],
      };

    case 'platformer-adventure':
      return {
        ...baseSpec,
        entities: [
          createPlayer(100, 400),
          createGround(),
          createPlatform('platform_1', 250, 480, 120),
          createPlatform('platform_2', 450, 400, 100),
          createPlatform('platform_3', 650, 320, 120),
          createEnemy('enemy_1', 450, 370, 'patrol'),
          createEnemy('enemy_2', 650, 290, 'patrol'),
          createCoin('coin_1', 250, 440),
          createCoin('coin_2', 550, 360),
          createCheckpoint('checkpoint_1', 750, 280),
        ],
        systems: ['physics', 'input', 'collision', 'render', 'ai'],
      };

    case 'platformer-precision':
      return {
        ...baseSpec,
        entities: [
          createPlayer(50, 500),
          createGround(),
          createPlatform('platform_1', 150, 520, 80),
          createPlatform('platform_2', 280, 450, 60),
          createPlatform('platform_3', 400, 380, 60),
          createPlatform('platform_4', 520, 310, 60),
          createPlatform('platform_5', 650, 240, 60),
          createSpikes('spikes_1', 200, 568),
          createSpikes('spikes_2', 350, 568),
          createSpikes('spikes_3', 500, 568),
          createGoal('goal', 750, 200),
        ],
      };

    case 'endless-runner':
      return {
        ...baseSpec,
        entities: [
          { ...createPlayer(150, 400), components: { ...createPlayer(150, 400).components, velocity: { vx: 100, vy: 0 } } },
          createGround(),
          createPlatform('obstacle_1', 500, 520, 40),
          createPlatform('obstacle_2', 700, 520, 40),
          createCoin('coin_1', 400, 450),
          createCoin('coin_2', 600, 400),
        ],
      };

    case 'shooter-space':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'shooter' },
        config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
        entities: [
          createShip('player', 400, 500),
          createAlien('alien_1', 200, 100),
          createAlien('alien_2', 400, 100),
          createAlien('alien_3', 600, 100),
          createAlien('alien_4', 300, 180),
          createAlien('alien_5', 500, 180),
        ],
        systems: ['physics', 'input', 'collision', 'render', 'ai'],
      };

    case 'shooter-twin-stick':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'shooter' },
        config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
        entities: [
          createShip('player', 400, 300),
          createChaser('enemy_1', 100, 100),
          createChaser('enemy_2', 700, 100),
          createChaser('enemy_3', 100, 500),
          createChaser('enemy_4', 700, 500),
          createWall('wall_top', 400, 10, 800, 20),
          createWall('wall_bottom', 400, 590, 800, 20),
          createWall('wall_left', 10, 300, 20, 600),
          createWall('wall_right', 790, 300, 20, 600),
        ],
        systems: ['physics', 'input', 'collision', 'render', 'ai'],
      };

    case 'shooter-bullet-hell':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'shooter' },
        config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
        entities: [
          createShip('player', 400, 500),
          createBoss('boss', 400, 100),
        ],
        systems: ['physics', 'input', 'collision', 'render', 'ai', 'particles'],
      };

    case 'puzzle-sokoban':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'puzzle' },
        config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
        entities: [
          createPuzzlePlayer(200, 300),
          createBox('box_1', 300, 300),
          createBox('box_2', 400, 300),
          createTarget('target_1', 500, 200),
          createTarget('target_2', 600, 200),
          createWall('wall_top', 400, 100, 400, 20),
          createWall('wall_bottom', 400, 500, 400, 20),
          createWall('wall_left', 100, 300, 20, 400),
          createWall('wall_right', 700, 300, 20, 400),
        ],
      };

    case 'puzzle-maze':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'puzzle' },
        config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
        entities: [
          createPuzzlePlayer(100, 100),
          createGoal('exit', 700, 500),
          // Maze walls
          createWall('wall_1', 200, 150, 20, 200),
          createWall('wall_2', 350, 250, 200, 20),
          createWall('wall_3', 500, 150, 20, 220),
          createWall('wall_4', 400, 400, 200, 20),
          createWall('wall_5', 600, 350, 20, 150),
        ],
      };

    case 'puzzle-physics':
      return {
        ...baseSpec,
        metadata: { ...baseSpec.metadata, genre: 'puzzle' },
        entities: [
          createBall('ball_1', 200, 100),
          createBall('ball_2', 300, 100),
          createRamp('ramp_1', 250, 300, 200),
          createBasket('basket', 600, 500),
          createGround(),
        ],
      };

    case 'empty':
    default:
      return {
        ...baseSpec,
        entities: [createPlayer(400, 300)],
      };
  }
}

// Entity factory functions
function createPlayer(x: number, y: number): EntitySpec {
  return {
    name: 'player',
    components: {
      transform: { x, y },
      sprite: { texture: 'player', width: 32, height: 48, tint: '#3498dbff' },
      collider: { type: 'box', width: 32, height: 48 },
      input: { moveSpeed: 200, jumpForce: 400, canJump: true },
      health: { current: 100, max: 100 },
    },
    tags: ['player'],
  };
}

function createGround(): EntitySpec {
  return {
    name: 'ground',
    components: {
      transform: { x: 400, y: 580 },
      sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
      collider: { type: 'box', width: 800, height: 40 },
    },
    tags: ['static', 'platform'],
  };
}

function createPlatform(name: string, x: number, y: number, width: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'platform', width, height: 20, tint: '#34495eff' },
      collider: { type: 'box', width, height: 20 },
    },
    tags: ['static', 'platform'],
  };
}

function createCoin(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'coin', width: 24, height: 24, tint: '#f1c40fff' },
      collider: { type: 'circle', radius: 12, isSensor: true },
    },
    tags: ['collectible'],
  };
}

function createEnemy(name: string, x: number, y: number, aiType: 'patrol' | 'chase' | 'flee'): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'enemy', width: 32, height: 32, tint: '#e74c3cff' },
      collider: { type: 'box', width: 32, height: 32 },
      health: { current: 50, max: 50 },
      aiBehavior: { type: aiType, speed: 80, detectionRadius: 150, patrolRange: 100 },
    },
    tags: ['enemy'],
  };
}

function createSpikes(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'spikes', width: 64, height: 24, tint: '#7f8c8dff' },
      collider: { type: 'box', width: 64, height: 24, isSensor: true },
    },
    tags: ['static', 'hazard'],
  };
}

function createGoal(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'goal', width: 48, height: 64, tint: '#2ecc71ff' },
      collider: { type: 'box', width: 48, height: 64, isSensor: true },
    },
    tags: ['trigger', 'goal'],
  };
}

function createCheckpoint(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'checkpoint', width: 32, height: 48, tint: '#9b59b6ff' },
      collider: { type: 'box', width: 32, height: 48, isSensor: true },
    },
    tags: ['trigger', 'checkpoint'],
  };
}

function createShip(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'ship', width: 48, height: 48, tint: '#3498dbff' },
      collider: { type: 'circle', radius: 20 },
      input: { moveSpeed: 300, jumpForce: 0 },
      health: { current: 3, max: 3 },
    },
    tags: ['player'],
  };
}

function createAlien(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'alien', width: 40, height: 40, tint: '#e74c3cff' },
      collider: { type: 'box', width: 40, height: 40 },
      health: { current: 1, max: 1 },
      aiBehavior: { type: 'patrol', speed: 50, detectionRadius: 0, patrolRange: 50 },
    },
    tags: ['enemy'],
  };
}

function createChaser(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'chaser', width: 36, height: 36, tint: '#e67e22ff' },
      collider: { type: 'circle', radius: 16 },
      health: { current: 1, max: 1 },
      aiBehavior: { type: 'chase', speed: 120, detectionRadius: 400 },
    },
    tags: ['enemy'],
  };
}

function createBoss(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'boss', width: 80, height: 80, tint: '#8e44adff' },
      collider: { type: 'circle', radius: 35 },
      health: { current: 100, max: 100 },
      aiBehavior: { type: 'patrol', speed: 30, detectionRadius: 0, patrolRange: 200 },
    },
    tags: ['enemy', 'boss'],
  };
}

function createWall(name: string, x: number, y: number, width: number, height: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'wall', width, height, tint: '#2c3e50ff' },
      collider: { type: 'box', width, height },
    },
    tags: ['static', 'wall'],
  };
}

function createPuzzlePlayer(x: number, y: number): EntitySpec {
  return {
    name: 'player',
    components: {
      transform: { x, y },
      sprite: { texture: 'player', width: 40, height: 40, tint: '#3498dbff' },
      collider: { type: 'box', width: 40, height: 40 },
      input: { moveSpeed: 150, jumpForce: 0 },
    },
    tags: ['player'],
  };
}

function createBox(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'box', width: 40, height: 40, tint: '#8e44adff' },
      collider: { type: 'box', width: 40, height: 40 },
    },
    tags: ['pushable'],
  };
}

function createTarget(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'target', width: 44, height: 44, tint: '#27ae60ff', zIndex: -1 },
      collider: { type: 'box', width: 44, height: 44, isSensor: true },
    },
    tags: ['target'],
  };
}

function createBall(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'ball', width: 30, height: 30, tint: '#e74c3cff' },
      collider: { type: 'circle', radius: 15 },
      velocity: { vx: 0, vy: 0 },
    },
    tags: ['ball'],
  };
}

function createRamp(name: string, x: number, y: number, width: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y, rotation: -0.3 },
      sprite: { texture: 'ramp', width, height: 20, tint: '#7f8c8dff' },
      collider: { type: 'box', width, height: 20 },
    },
    tags: ['static', 'ramp'],
  };
}

function createBasket(name: string, x: number, y: number): EntitySpec {
  return {
    name,
    components: {
      transform: { x, y },
      sprite: { texture: 'basket', width: 80, height: 40, tint: '#27ae60ff' },
      collider: { type: 'box', width: 80, height: 40, isSensor: true },
    },
    tags: ['goal', 'basket'],
  };
}

/**
 * Get templates filtered by criteria
 */
export function getTemplates(filter?: {
  genre?: 'platformer' | 'shooter' | 'puzzle';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}): GameTemplate[] {
  let templates = [...GAME_TEMPLATES];

  if (filter?.genre) {
    templates = templates.filter(t => t.genre === filter.genre);
  }

  if (filter?.difficulty) {
    templates = templates.filter(t => t.difficulty === filter.difficulty);
  }

  if (filter?.tags && filter.tags.length > 0) {
    templates = templates.filter(t =>
      filter.tags!.some(tag => t.tags.includes(tag))
    );
  }

  return templates;
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): GameTemplate | undefined {
  return GAME_TEMPLATES.find(t => t.id === id);
}

// Custom template interface extends GameTemplate with spec data
export interface CustomTemplate extends GameTemplate {
  isCustom: true;
  spec: GameSpec;
  createdAt: string;
  updatedAt: string;
}

// Storage key for custom templates in localStorage (will be migrated to file system later)
const CUSTOM_TEMPLATES_KEY = 'promptplay_custom_templates';

/**
 * Get all custom templates from storage
 */
export function getCustomTemplates(): CustomTemplate[] {
  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load custom templates:', e);
  }
  return [];
}

/**
 * Save a game spec as a custom template
 */
export function saveAsTemplate(
  spec: GameSpec,
  templateName: string,
  templateDescription: string,
  options?: {
    icon?: string;
    color?: string;
    tags?: string[];
  }
): CustomTemplate {
  const now = new Date().toISOString();
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Determine genre from spec
  const genre = spec.metadata?.genre as 'platformer' | 'shooter' | 'puzzle' || 'platformer';

  // Determine difficulty based on entity count
  const entityCount = spec.entities?.length || 0;
  const difficulty: 'beginner' | 'intermediate' | 'advanced' =
    entityCount <= 5 ? 'beginner' :
    entityCount <= 15 ? 'intermediate' : 'advanced';

  const customTemplate: CustomTemplate = {
    id,
    name: templateName,
    description: templateDescription,
    genre,
    icon: options?.icon || '📁',
    color: options?.color || 'violet',
    difficulty,
    tags: options?.tags || ['custom', genre],
    isCustom: true,
    spec: {
      ...spec,
      metadata: {
        ...spec.metadata,
        title: templateName,
        description: templateDescription,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  // Get existing templates and add new one
  const existing = getCustomTemplates();
  existing.push(customTemplate);

  // Save to storage
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(existing));

  return customTemplate;
}

/**
 * Delete a custom template by ID
 */
export function deleteCustomTemplate(templateId: string): boolean {
  const templates = getCustomTemplates();
  const filtered = templates.filter(t => t.id !== templateId);

  if (filtered.length === templates.length) {
    return false; // Template not found
  }

  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Update a custom template
 */
export function updateCustomTemplate(
  templateId: string,
  updates: Partial<Pick<CustomTemplate, 'name' | 'description' | 'icon' | 'color' | 'tags' | 'spec'>>
): CustomTemplate | null {
  const templates = getCustomTemplates();
  const index = templates.findIndex(t => t.id === templateId);

  if (index === -1) {
    return null;
  }

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  return templates[index];
}

/**
 * Get a custom template's spec by ID
 */
export function getCustomTemplateSpec(templateId: string): GameSpec | null {
  const templates = getCustomTemplates();
  const template = templates.find(t => t.id === templateId);
  return template?.spec || null;
}

/**
 * Get all templates (built-in + custom)
 */
export function getAllTemplates(): (GameTemplate | CustomTemplate)[] {
  return [...GAME_TEMPLATES, ...getCustomTemplates()];
}

/**
 * Suggest template based on description
 */
export function suggestTemplate(description: string): GameTemplate {
  const lower = description.toLowerCase();

  // Check for shooter keywords
  if (lower.includes('shoot') || lower.includes('space') || lower.includes('alien') ||
      lower.includes('bullet') || lower.includes('gun') || lower.includes('enemy waves')) {
    if (lower.includes('bullet hell') || lower.includes('intense') || lower.includes('hard')) {
      return GAME_TEMPLATES.find(t => t.id === 'shooter-bullet-hell')!;
    }
    if (lower.includes('arena') || lower.includes('twin') || lower.includes('360')) {
      return GAME_TEMPLATES.find(t => t.id === 'shooter-twin-stick')!;
    }
    return GAME_TEMPLATES.find(t => t.id === 'shooter-space')!;
  }

  // Check for puzzle keywords
  if (lower.includes('puzzle') || lower.includes('box') || lower.includes('push') ||
      lower.includes('maze') || lower.includes('logic') || lower.includes('brain')) {
    if (lower.includes('maze') || lower.includes('navigate')) {
      return GAME_TEMPLATES.find(t => t.id === 'puzzle-maze')!;
    }
    if (lower.includes('physics') || lower.includes('ball') || lower.includes('ramp')) {
      return GAME_TEMPLATES.find(t => t.id === 'puzzle-physics')!;
    }
    return GAME_TEMPLATES.find(t => t.id === 'puzzle-sokoban')!;
  }

  // Check for runner keywords
  if (lower.includes('runner') || lower.includes('endless') || lower.includes('auto')) {
    return GAME_TEMPLATES.find(t => t.id === 'endless-runner')!;
  }

  // Check for difficulty keywords
  if (lower.includes('hard') || lower.includes('difficult') || lower.includes('precision') ||
      lower.includes('challenge')) {
    return GAME_TEMPLATES.find(t => t.id === 'platformer-precision')!;
  }

  if (lower.includes('adventure') || lower.includes('enemy') || lower.includes('level')) {
    return GAME_TEMPLATES.find(t => t.id === 'platformer-adventure')!;
  }

  // Default to basic platformer
  return GAME_TEMPLATES.find(t => t.id === 'platformer-basic')!;
}
