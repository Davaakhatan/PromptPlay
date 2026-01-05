import type { GameSpec, EntitySpec } from '@promptplay/shared-types';
import { advancedAI } from './AdvancedAIService';

// Level generation types
export interface LevelConfig {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  style: 'linear' | 'open-world' | 'maze' | 'vertical' | 'hub';
  theme: string;
  width: number;
  height: number;
  playerStart?: { x: number; y: number };
  objectives?: string[];
}

export interface GeneratedLevel {
  name: string;
  entities: EntitySpec[];
  spawnPoints: { x: number; y: number; type: string }[];
  checkpoints: { x: number; y: number }[];
  objectives: LevelObjective[];
  bounds: { width: number; height: number };
  metadata: {
    difficulty: string;
    estimatedTime: string;
    entityCount: number;
  };
}

export interface LevelObjective {
  id: string;
  type: 'collect' | 'reach' | 'defeat' | 'survive' | 'escort' | 'puzzle';
  description: string;
  target?: string;
  count?: number;
  position?: { x: number; y: number };
  optional: boolean;
}

export interface LevelPattern {
  name: string;
  description: string;
  entities: Partial<EntitySpec>[];
  connections: { from: number; to: number; type: string }[];
}

/**
 * AI Level Designer Service
 * Generates complete game levels using AI and procedural techniques
 */
class AILevelDesignerService {
  private patterns: Map<string, LevelPattern[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Platformer patterns
    this.patterns.set('platformer', [
      {
        name: 'staircase',
        description: 'Ascending platforms',
        entities: [
          { name: 'Platform1', components: { transform: { x: 0, y: 0 } } },
          { name: 'Platform2', components: { transform: { x: 100, y: -50 } } },
          { name: 'Platform3', components: { transform: { x: 200, y: -100 } } },
        ],
        connections: [{ from: 0, to: 1, type: 'jump' }, { from: 1, to: 2, type: 'jump' }],
      },
      {
        name: 'gap_challenge',
        description: 'Platforms with gaps',
        entities: [
          { name: 'Platform1', components: { transform: { x: 0, y: 0 } } },
          { name: 'Platform2', components: { transform: { x: 150, y: 0 } } },
          { name: 'Hazard', components: { transform: { x: 75, y: 50 } }, tags: ['hazard'] },
        ],
        connections: [{ from: 0, to: 1, type: 'long_jump' }],
      },
      {
        name: 'moving_platform',
        description: 'Moving platform section',
        entities: [
          { name: 'MovingPlatform', components: { transform: { x: 0, y: 0 }, motion: { type: 'horizontal', range: 100, speed: 50 } } },
        ],
        connections: [],
      },
      {
        name: 'collectible_run',
        description: 'Line of collectibles',
        entities: [
          { name: 'Coin1', components: { transform: { x: 0, y: -20 } }, tags: ['collectible'] },
          { name: 'Coin2', components: { transform: { x: 30, y: -20 } }, tags: ['collectible'] },
          { name: 'Coin3', components: { transform: { x: 60, y: -20 } }, tags: ['collectible'] },
        ],
        connections: [],
      },
    ]);

    // Shooter patterns
    this.patterns.set('shooter', [
      {
        name: 'cover_point',
        description: 'Cover with enemy',
        entities: [
          { name: 'Cover', components: { transform: { x: 0, y: 0 }, collider: { type: 'box', width: 50, height: 30, isStatic: true } } },
          { name: 'Enemy', components: { transform: { x: 100, y: 0 }, ai: { type: 'patrol' } }, tags: ['enemy'] },
        ],
        connections: [],
      },
      {
        name: 'ambush_zone',
        description: 'Multiple enemies in ambush',
        entities: [
          { name: 'Enemy1', components: { transform: { x: -50, y: 0 }, ai: { type: 'ambush' } }, tags: ['enemy'] },
          { name: 'Enemy2', components: { transform: { x: 50, y: 0 }, ai: { type: 'ambush' } }, tags: ['enemy'] },
        ],
        connections: [],
      },
    ]);

    // Puzzle patterns
    this.patterns.set('puzzle', [
      {
        name: 'switch_door',
        description: 'Switch that opens door',
        entities: [
          { name: 'Switch', components: { transform: { x: 0, y: 0 }, trigger: { type: 'switch', target: 'Door' } }, tags: ['interactive'] },
          { name: 'Door', components: { transform: { x: 100, y: 0 }, door: { isOpen: false } }, tags: ['door'] },
        ],
        connections: [{ from: 0, to: 1, type: 'activates' }],
      },
      {
        name: 'push_block',
        description: 'Pushable block puzzle',
        entities: [
          { name: 'PushBlock', components: { transform: { x: 0, y: 0 }, physics: { isPushable: true } }, tags: ['pushable'] },
          { name: 'PressurePlate', components: { transform: { x: 100, y: 0 }, trigger: { type: 'weight' } }, tags: ['trigger'] },
        ],
        connections: [{ from: 0, to: 1, type: 'must_reach' }],
      },
    ]);
  }

  /**
   * Generate a complete level based on configuration
   */
  async generateLevel(gameSpec: GameSpec, config: LevelConfig): Promise<GeneratedLevel> {
    const entities: EntitySpec[] = [];
    const spawnPoints: { x: number; y: number; type: string }[] = [];
    const checkpoints: { x: number; y: number }[] = [];
    const objectives: LevelObjective[] = [];

    const genre = gameSpec.metadata?.genre || 'platformer';
    const patterns = this.patterns.get(genre) || this.patterns.get('platformer')!;

    // Generate ground/base
    entities.push(this.createGround(config.width, config.height));

    // Player start
    const playerStart = config.playerStart || { x: 100, y: config.height - 100 };
    spawnPoints.push({ ...playerStart, type: 'player' });

    // Generate level structure based on style
    switch (config.style) {
      case 'linear':
        this.generateLinearLevel(entities, config, patterns, checkpoints);
        break;
      case 'vertical':
        this.generateVerticalLevel(entities, config, patterns, checkpoints);
        break;
      case 'maze':
        this.generateMazeLevel(entities, config, patterns);
        break;
      case 'open-world':
        this.generateOpenWorldLevel(entities, config, patterns, spawnPoints);
        break;
      case 'hub':
        this.generateHubLevel(entities, config, patterns);
        break;
    }

    // Add difficulty-based elements
    this.applyDifficulty(entities, config.difficulty);

    // Generate objectives
    objectives.push(...this.generateObjectives(entities, config));

    // Add collectibles
    this.addCollectibles(entities, config);

    // Add enemies based on difficulty
    this.addEnemies(entities, config, genre);

    return {
      name: config.name,
      entities,
      spawnPoints,
      checkpoints,
      objectives,
      bounds: { width: config.width, height: config.height },
      metadata: {
        difficulty: config.difficulty,
        estimatedTime: this.estimatePlayTime(config),
        entityCount: entities.length,
      },
    };
  }

  private createGround(width: number, height: number): EntitySpec {
    return {
      name: 'Ground',
      components: {
        transform: { x: width / 2, y: height - 20, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { width, height: 40, texture: 'ground' },
        collider: { type: 'box', width, height: 40, isStatic: true },
      },
      tags: ['ground', 'static'],
    };
  }

  private generateLinearLevel(
    entities: EntitySpec[],
    config: LevelConfig,
    patterns: LevelPattern[],
    checkpoints: { x: number; y: number }[]
  ): void {
    const segmentWidth = 300;
    const segments = Math.floor(config.width / segmentWidth);
    let currentX = 150;

    for (let i = 0; i < segments; i++) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      pattern.entities.forEach((templateEntity, idx) => {
        const entity: EntitySpec = {
          name: `${pattern.name}_${i}_${idx}`,
          components: {
            transform: {
              x: currentX + (templateEntity.components?.transform?.x || 0),
              y: config.height - 100 + (templateEntity.components?.transform?.y || 0),
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            sprite: { width: 80, height: 20, texture: 'platform' },
            collider: { type: 'box', width: 80, height: 20, isStatic: true },
            ...templateEntity.components,
          },
          tags: templateEntity.tags || ['platform'],
        };
        entities.push(entity);
      });

      // Add checkpoint every 3 segments
      if (i > 0 && i % 3 === 0) {
        checkpoints.push({ x: currentX, y: config.height - 150 });
      }

      currentX += segmentWidth;
    }

    // Add finish point
    entities.push({
      name: 'Finish',
      components: {
        transform: { x: config.width - 100, y: config.height - 100, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { width: 40, height: 60, texture: 'flag' },
        collider: { type: 'box', width: 40, height: 60, isSensor: true },
        trigger: { type: 'finish' },
      },
      tags: ['finish', 'goal'],
    });
  }

  private generateVerticalLevel(
    entities: EntitySpec[],
    config: LevelConfig,
    _patterns: LevelPattern[],
    checkpoints: { x: number; y: number }[]
  ): void {
    const levelHeight = config.height * 2;
    const platformCount = Math.floor(levelHeight / 80);

    for (let i = 0; i < platformCount; i++) {
      const x = 100 + Math.random() * (config.width - 200);
      const y = config.height - 100 - i * 80;

      entities.push({
        name: `Platform_${i}`,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: 100 + Math.random() * 50, height: 20, texture: 'platform' },
          collider: { type: 'box', width: 100, height: 20, isStatic: true },
        },
        tags: ['platform'],
      });

      if (i > 0 && i % 5 === 0) {
        checkpoints.push({ x, y: y - 30 });
      }
    }
  }

  private generateMazeLevel(
    entities: EntitySpec[],
    config: LevelConfig,
    _patterns: LevelPattern[]
  ): void {
    const cellSize = 100;
    const cols = Math.floor(config.width / cellSize);
    const rows = Math.floor(config.height / cellSize);

    // Simple maze generation using recursive backtracking
    const maze = this.generateMazeGrid(cols, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (maze[y][x] === 1) {
          entities.push({
            name: `Wall_${x}_${y}`,
            components: {
              transform: {
                x: x * cellSize + cellSize / 2,
                y: y * cellSize + cellSize / 2,
                rotation: 0, scaleX: 1, scaleY: 1
              },
              sprite: { width: cellSize - 10, height: cellSize - 10, texture: 'wall' },
              collider: { type: 'box', width: cellSize - 10, height: cellSize - 10, isStatic: true },
            },
            tags: ['wall', 'static'],
          });
        }
      }
    }
  }

  private generateMazeGrid(cols: number, rows: number): number[][] {
    const maze: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(1));

    const carve = (x: number, y: number) => {
      maze[y][x] = 0;
      const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]].sort(() => Math.random() - 0.5);

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 1) {
          maze[y + dy / 2][x + dx / 2] = 0;
          carve(nx, ny);
        }
      }
    };

    carve(1, 1);
    return maze;
  }

  private generateOpenWorldLevel(
    entities: EntitySpec[],
    config: LevelConfig,
    _patterns: LevelPattern[],
    spawnPoints: { x: number; y: number; type: string }[]
  ): void {
    // Create terrain variations
    const terrainPoints = 10;
    for (let i = 0; i < terrainPoints; i++) {
      const x = (config.width / terrainPoints) * i + config.width / terrainPoints / 2;
      const heightVar = Math.sin(i * 0.5) * 50;

      entities.push({
        name: `Terrain_${i}`,
        components: {
          transform: { x, y: config.height - 50 + heightVar, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: config.width / terrainPoints + 10, height: 100, texture: 'terrain' },
          collider: { type: 'box', width: config.width / terrainPoints + 10, height: 100, isStatic: true },
        },
        tags: ['terrain', 'static'],
      });
    }

    // Add points of interest
    const poiCount = 5;
    for (let i = 0; i < poiCount; i++) {
      const x = Math.random() * (config.width - 200) + 100;
      const y = config.height - 200;
      spawnPoints.push({ x, y, type: 'poi' });

      entities.push({
        name: `POI_${i}`,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: 60, height: 80, texture: 'building' },
          collider: { type: 'box', width: 60, height: 80, isStatic: true },
        },
        tags: ['poi', 'building'],
      });
    }
  }

  private generateHubLevel(
    entities: EntitySpec[],
    config: LevelConfig,
    _patterns: LevelPattern[]
  ): void {
    const centerX = config.width / 2;
    const centerY = config.height / 2;

    // Central platform
    entities.push({
      name: 'HubCenter',
      components: {
        transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { width: 200, height: 200, texture: 'hub_center' },
        collider: { type: 'box', width: 200, height: 200, isStatic: true },
      },
      tags: ['hub', 'center'],
    });

    // Portals to other areas
    const portalCount = 4;
    for (let i = 0; i < portalCount; i++) {
      const angle = (Math.PI * 2 / portalCount) * i;
      const distance = 250;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      entities.push({
        name: `Portal_${i}`,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: 50, height: 80, texture: 'portal' },
          collider: { type: 'box', width: 50, height: 80, isSensor: true },
          trigger: { type: 'portal', destination: `level_${i + 1}` },
        },
        tags: ['portal', 'interactive'],
      });
    }
  }

  private applyDifficulty(entities: EntitySpec[], difficulty: string): void {
    const difficultyMultipliers = {
      easy: { hazards: 0.5, spacing: 1.5 },
      medium: { hazards: 1.0, spacing: 1.0 },
      hard: { hazards: 1.5, spacing: 0.8 },
      expert: { hazards: 2.0, spacing: 0.6 },
    };

    const mult = difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || difficultyMultipliers.medium;

    // Adjust platform sizes based on difficulty
    entities.forEach(entity => {
      if (entity.tags?.includes('platform')) {
        const sprite = entity.components.sprite as { width?: number };
        if (sprite?.width) {
          sprite.width = Math.max(40, sprite.width * mult.spacing);
        }
      }
    });
  }

  private generateObjectives(entities: EntitySpec[], config: LevelConfig): LevelObjective[] {
    const objectives: LevelObjective[] = [];

    // Main objective - reach the end
    objectives.push({
      id: 'main_reach',
      type: 'reach',
      description: 'Reach the finish',
      position: { x: config.width - 100, y: config.height - 100 },
      optional: false,
    });

    // Collect all coins
    const collectibleCount = entities.filter(e => e.tags?.includes('collectible')).length;
    if (collectibleCount > 0) {
      objectives.push({
        id: 'collect_all',
        type: 'collect',
        description: `Collect all ${collectibleCount} items`,
        count: collectibleCount,
        optional: true,
      });
    }

    // Defeat all enemies
    const enemyCount = entities.filter(e => e.tags?.includes('enemy')).length;
    if (enemyCount > 0) {
      objectives.push({
        id: 'defeat_all',
        type: 'defeat',
        description: `Defeat all ${enemyCount} enemies`,
        count: enemyCount,
        optional: true,
      });
    }

    return objectives;
  }

  private addCollectibles(entities: EntitySpec[], config: LevelConfig): void {
    const collectibleCounts = {
      easy: 10,
      medium: 15,
      hard: 20,
      expert: 25,
    };

    const count = collectibleCounts[config.difficulty as keyof typeof collectibleCounts] || 15;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * (config.width - 100) + 50;
      const y = Math.random() * (config.height - 200) + 50;

      entities.push({
        name: `Coin_${i}`,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: 20, height: 20, texture: 'coin' },
          collider: { type: 'circle', radius: 10, isSensor: true },
        },
        tags: ['collectible', 'coin'],
      });
    }
  }

  private addEnemies(entities: EntitySpec[], config: LevelConfig, genre: string): void {
    const enemyCounts = {
      easy: 3,
      medium: 6,
      hard: 10,
      expert: 15,
    };

    const count = enemyCounts[config.difficulty as keyof typeof enemyCounts] || 6;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * (config.width - 200) + 100;
      const y = config.height - 100;

      entities.push({
        name: `Enemy_${i}`,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { width: 30, height: 30, texture: 'enemy' },
          collider: { type: 'box', width: 30, height: 30 },
          velocity: { vx: 0, vy: 0 },
          health: { current: 3, max: 3 },
          ai: {
            type: genre === 'shooter' ? 'chase' : 'patrol',
            speed: 50 + config.difficulty === 'expert' ? 30 : 0,
            detectionRange: 150,
          },
        },
        tags: ['enemy'],
      });
    }
  }

  private estimatePlayTime(config: LevelConfig): string {
    const baseTimes = {
      easy: 2,
      medium: 4,
      hard: 6,
      expert: 10,
    };

    const baseTime = baseTimes[config.difficulty as keyof typeof baseTimes] || 4;
    const sizeMultiplier = (config.width * config.height) / (800 * 600);
    const minutes = Math.round(baseTime * sizeMultiplier);

    return `${minutes}-${minutes + 2} minutes`;
  }

  /**
   * Generate level using AI (when available)
   */
  async generateLevelWithAI(
    gameSpec: GameSpec,
    prompt: string,
    config: Partial<LevelConfig> = {}
  ): Promise<GeneratedLevel> {
    // Try AI generation first
    if (advancedAI.isAvailable()) {
      try {
        const levelIdeas = await advancedAI.generateLevelIdeas(gameSpec, 1);
        if (levelIdeas.length > 0) {
          const idea = levelIdeas[0];
          return this.generateLevel(gameSpec, {
            name: idea.name,
            difficulty: idea.difficulty,
            style: 'linear',
            theme: idea.description,
            width: config.width || 1600,
            height: config.height || 600,
            ...config,
          });
        }
      } catch (err) {
        console.error('AI level generation failed, using procedural:', err);
      }
    }

    // Fallback to procedural generation
    return this.generateLevel(gameSpec, {
      name: config.name || 'Generated Level',
      difficulty: config.difficulty || 'medium',
      style: config.style || 'linear',
      theme: prompt,
      width: config.width || 1600,
      height: config.height || 600,
    });
  }
}

// Singleton instance
export const aiLevelDesigner = new AILevelDesignerService();
