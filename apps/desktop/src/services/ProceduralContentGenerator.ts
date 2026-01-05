import type { EntitySpec } from '@promptplay/shared-types';

// Generation types
export interface GenerationConfig {
  seed?: number;
  complexity: 'simple' | 'moderate' | 'complex';
  style: string;
  constraints?: GenerationConstraint[];
}

export interface GenerationConstraint {
  type: 'size' | 'count' | 'position' | 'color' | 'tag';
  min?: number;
  max?: number;
  values?: unknown[];
}

export interface TerrainConfig {
  width: number;
  height: number;
  type: 'flat' | 'hills' | 'mountains' | 'islands' | 'caves';
  biome: 'forest' | 'desert' | 'snow' | 'volcanic' | 'ocean' | 'plains';
  features: ('trees' | 'rocks' | 'water' | 'paths' | 'structures')[];
}

export interface GeneratedTerrain {
  heightMap: number[][];
  entities: EntitySpec[];
  spawnPoints: { x: number; y: number; type: string }[];
  metadata: {
    biome: string;
    featureCount: number;
    avgHeight: number;
  };
}

export interface ItemConfig {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'key' | 'accessory';
  level?: number;
  theme?: string;
}

export interface GeneratedItem {
  name: string;
  description: string;
  stats: Record<string, number>;
  effects: ItemEffect[];
  rarity: string;
  value: number;
  sprite: string;
}

export interface ItemEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'special';
  stat?: string;
  value: number;
  duration?: number;
}

export interface QuestConfig {
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  type: 'fetch' | 'kill' | 'escort' | 'explore' | 'puzzle' | 'boss';
  theme?: string;
  chainLength?: number;
}

export interface GeneratedQuest {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites?: string[];
  difficulty: string;
  estimatedTime: string;
}

export interface QuestObjective {
  id: string;
  type: 'collect' | 'kill' | 'reach' | 'interact' | 'survive' | 'protect';
  description: string;
  target: string;
  count: number;
  current: number;
  optional: boolean;
}

export interface QuestReward {
  type: 'experience' | 'gold' | 'item' | 'reputation' | 'unlock';
  amount?: number;
  itemId?: string;
  description: string;
}

// Noise functions for terrain generation
class SimplexNoise {
  private perm: number[] = [];

  constructor(seed: number = Math.random() * 10000) {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle using seed
    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = n % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  noise2D(x: number, y: number): number {
    // Simplified 2D noise implementation
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const a = this.perm[X] + Y;
    const b = this.perm[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad(this.perm[a], xf, yf), this.grad(this.perm[b], xf - 1, yf)),
      this.lerp(u, this.grad(this.perm[a + 1], xf, yf - 1), this.grad(this.perm[b + 1], xf - 1, yf - 1))
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

// Random with seed
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Procedural Content Generator Service
 * Generates terrain, items, quests, and other game content procedurally
 */
class ProceduralContentGeneratorService {
  private currentSeed: number = Date.now();

  /**
   * Set the random seed for reproducible generation
   */
  setSeed(seed: number): void {
    this.currentSeed = seed;
  }

  /**
   * Generate terrain with heightmap and features
   */
  generateTerrain(config: TerrainConfig): GeneratedTerrain {
    const noise = new SimplexNoise(this.currentSeed);
    const rng = new SeededRandom(this.currentSeed);

    const heightMap: number[][] = [];
    const entities: EntitySpec[] = [];
    const spawnPoints: { x: number; y: number; type: string }[] = [];

    // Generate height map
    const scale = this.getTerrainScale(config.type);
    const amplitude = this.getTerrainAmplitude(config.type);

    for (let y = 0; y < config.height; y++) {
      heightMap[y] = [];
      for (let x = 0; x < config.width; x++) {
        const nx = x / config.width * scale;
        const ny = y / config.height * scale;

        let height = 0;
        height += noise.noise2D(nx, ny) * amplitude;
        height += noise.noise2D(nx * 2, ny * 2) * (amplitude / 2);
        height += noise.noise2D(nx * 4, ny * 4) * (amplitude / 4);

        // Normalize to 0-1
        height = (height + 1) / 2;

        // Apply terrain type modifications
        height = this.applyTerrainType(height, x, y, config, rng);

        heightMap[y][x] = height;
      }
    }

    // Generate terrain entities based on heightmap
    this.generateTerrainEntities(heightMap, entities, config, rng);

    // Generate features
    for (const feature of config.features) {
      this.generateFeature(feature, heightMap, entities, config, rng);
    }

    // Generate spawn points
    this.generateSpawnPoints(heightMap, spawnPoints, config, rng);

    // Calculate metadata
    let totalHeight = 0;
    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        totalHeight += heightMap[y][x];
      }
    }

    return {
      heightMap,
      entities,
      spawnPoints,
      metadata: {
        biome: config.biome,
        featureCount: entities.length,
        avgHeight: totalHeight / (config.width * config.height),
      },
    };
  }

  private getTerrainScale(type: string): number {
    const scales: Record<string, number> = {
      flat: 2,
      hills: 4,
      mountains: 8,
      islands: 6,
      caves: 10,
    };
    return scales[type] || 4;
  }

  private getTerrainAmplitude(type: string): number {
    const amplitudes: Record<string, number> = {
      flat: 0.1,
      hills: 0.4,
      mountains: 0.8,
      islands: 0.5,
      caves: 0.6,
    };
    return amplitudes[type] || 0.4;
  }

  private applyTerrainType(
    height: number,
    x: number,
    y: number,
    config: TerrainConfig,
    _rng: SeededRandom
  ): number {
    switch (config.type) {
      case 'flat':
        return Math.max(0.3, height * 0.3 + 0.3);

      case 'islands':
        // Create island falloff from center
        const cx = config.width / 2;
        const cy = config.height / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const maxDist = Math.min(config.width, config.height) / 2;
        const falloff = Math.max(0, 1 - dist / maxDist);
        return height * falloff;

      case 'caves':
        // Threshold for caves
        return height > 0.5 ? 1 : 0;

      default:
        return height;
    }
  }

  private generateTerrainEntities(
    heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    _rng: SeededRandom
  ): void {
    const cellSize = 32;

    for (let y = 0; y < heightMap.length; y += 4) {
      for (let x = 0; x < heightMap[0].length; x += 4) {
        const height = heightMap[y][x];
        const terrainType = this.getTerrainTypeFromHeight(height, config.biome);

        if (terrainType !== 'water' || config.features.includes('water')) {
          entities.push({
            name: `Terrain_${x}_${y}`,
            components: {
              transform: {
                x: x * cellSize + cellSize * 2,
                y: y * cellSize + cellSize * 2,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
              },
              sprite: {
                width: cellSize * 4,
                height: cellSize * 4,
                texture: `${config.biome}_${terrainType}`,
              },
              collider: terrainType === 'water'
                ? undefined
                : { type: 'box', width: cellSize * 4, height: cellSize * 4, isStatic: true },
            },
            tags: ['terrain', terrainType, config.biome],
          });
        }
      }
    }
  }

  // Reserved for future use when rendering with colors
  // @ts-expect-error - Intentionally unused for future implementation
  private _getBiomeColors(biome: string): Record<string, string> {
    const biomeColors: Record<string, Record<string, string>> = {
      forest: {
        grass: '#4a7c23',
        dirt: '#6b4423',
        rock: '#5a5a5a',
        water: '#3b82f6',
        sand: '#c2b280',
      },
      desert: {
        grass: '#c2b280',
        dirt: '#d4a574',
        rock: '#8b7355',
        water: '#3b82f6',
        sand: '#e8d5a3',
      },
      snow: {
        grass: '#d4e5f7',
        dirt: '#a8c8e8',
        rock: '#7a8b9c',
        water: '#5b9bd5',
        sand: '#e8eef5',
      },
      volcanic: {
        grass: '#3d3d3d',
        dirt: '#4a3728',
        rock: '#2d2d2d',
        water: '#e53935',
        sand: '#5d4037',
      },
      ocean: {
        grass: '#5d8a66',
        dirt: '#7a6b5a',
        rock: '#5a5a5a',
        water: '#1565c0',
        sand: '#f5e6d3',
      },
      plains: {
        grass: '#7cb342',
        dirt: '#8d6e63',
        rock: '#757575',
        water: '#42a5f5',
        sand: '#d7ccc8',
      },
    };

    return biomeColors[biome] || biomeColors.plains;
  }

  private getTerrainTypeFromHeight(height: number, biome: string): string {
    if (biome === 'ocean') {
      if (height < 0.3) return 'water';
      if (height < 0.4) return 'sand';
      if (height < 0.7) return 'grass';
      return 'rock';
    }

    if (biome === 'desert') {
      if (height < 0.15) return 'water';
      if (height < 0.6) return 'sand';
      if (height < 0.8) return 'dirt';
      return 'rock';
    }

    // Default biome heights
    if (height < 0.2) return 'water';
    if (height < 0.3) return 'sand';
    if (height < 0.6) return 'grass';
    if (height < 0.8) return 'dirt';
    return 'rock';
  }

  private generateFeature(
    feature: string,
    heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    rng: SeededRandom
  ): void {
    const featureCount = Math.floor(config.width * config.height / 1000);

    switch (feature) {
      case 'trees':
        this.generateTrees(heightMap, entities, config, rng, featureCount);
        break;
      case 'rocks':
        this.generateRocks(heightMap, entities, config, rng, featureCount);
        break;
      case 'paths':
        this.generatePaths(heightMap, entities, config, rng);
        break;
      case 'structures':
        this.generateStructures(heightMap, entities, config, rng, Math.floor(featureCount / 10));
        break;
    }
  }

  private generateTrees(
    heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    rng: SeededRandom,
    count: number
  ): void {
    const treeTypes = this.getTreeTypes(config.biome);

    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(0, config.width - 1);
      const y = rng.nextInt(0, config.height - 1);
      const height = heightMap[y]?.[x] ?? 0;

      // Only place trees on appropriate terrain
      if (height > 0.3 && height < 0.7) {
        const treeType = rng.pick(treeTypes);
        entities.push({
          name: `Tree_${i}`,
          components: {
            transform: {
              x: x * 32 + 16,
              y: y * 32,
              rotation: 0,
              scaleX: 0.8 + rng.next() * 0.4,
              scaleY: 0.8 + rng.next() * 0.4,
            },
            sprite: {
              width: 48,
              height: 64,
              texture: treeType,
            },
            collider: {
              type: 'circle',
              radius: 12,
              isStatic: true,
            },
          },
          tags: ['tree', 'obstacle', 'destructible'],
        });
      }
    }
  }

  private getTreeTypes(biome: string): string[] {
    const treeTypes: Record<string, string[]> = {
      forest: ['oak', 'pine', 'birch'],
      desert: ['cactus', 'palm'],
      snow: ['pine_snow', 'dead_tree'],
      volcanic: ['dead_tree', 'burnt_tree'],
      ocean: ['palm', 'coconut'],
      plains: ['oak', 'willow'],
    };
    return treeTypes[biome] || ['tree'];
  }

  private generateRocks(
    heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    rng: SeededRandom,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(0, config.width - 1);
      const y = rng.nextInt(0, config.height - 1);
      const height = heightMap[y]?.[x] ?? 0;

      if (height > 0.5) {
        const size = 16 + rng.next() * 32;
        entities.push({
          name: `Rock_${i}`,
          components: {
            transform: {
              x: x * 32 + 16,
              y: y * 32 + 16,
              rotation: rng.next() * 360,
              scaleX: 1,
              scaleY: 1,
            },
            sprite: {
              width: size,
              height: size * 0.7,
              texture: 'rock',
            },
            collider: {
              type: 'box',
              width: size,
              height: size * 0.7,
              isStatic: true,
            },
          },
          tags: ['rock', 'obstacle', 'mineable'],
        });
      }
    }
  }

  private generatePaths(
    _heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    rng: SeededRandom
  ): void {
    // Generate a path using simple random walk
    const startX = rng.nextInt(0, config.width / 4);
    const startY = rng.nextInt(0, config.height - 1);
    const endX = rng.nextInt(config.width * 3 / 4, config.width - 1);
    // Path walks toward endX, y varies randomly

    let x = startX;
    let y = startY;
    let pathIndex = 0;

    while (x < endX) {
      entities.push({
        name: `Path_${pathIndex++}`,
        components: {
          transform: {
            x: x * 32 + 16,
            y: y * 32 + 16,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          sprite: {
            width: 40,
            height: 40,
            texture: 'path',
          },
        },
        tags: ['path', 'walkable'],
      });

      // Move towards end
      x += rng.nextInt(1, 2);
      y += rng.nextInt(-1, 1);
      y = Math.max(0, Math.min(config.height - 1, y));
    }
  }

  private generateStructures(
    heightMap: number[][],
    entities: EntitySpec[],
    config: TerrainConfig,
    rng: SeededRandom,
    count: number
  ): void {
    const structureTypes = ['house', 'tower', 'ruins', 'shrine'];

    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(config.width / 4, config.width * 3 / 4);
      const y = rng.nextInt(config.height / 4, config.height * 3 / 4);
      const height = heightMap[y]?.[x] ?? 0;

      if (height > 0.3 && height < 0.6) {
        const structureType = rng.pick(structureTypes);
        entities.push({
          name: `Structure_${i}`,
          components: {
            transform: {
              x: x * 32,
              y: y * 32,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            sprite: {
              width: 96,
              height: 96,
              texture: structureType,
            },
            collider: {
              type: 'box',
              width: 80,
              height: 80,
              isStatic: true,
            },
          },
          tags: ['structure', 'building', structureType],
        });
      }
    }
  }

  private generateSpawnPoints(
    heightMap: number[][],
    spawnPoints: { x: number; y: number; type: string }[],
    config: TerrainConfig,
    rng: SeededRandom
  ): void {
    // Player spawn
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = rng.nextInt(0, config.width / 4);
      const y = rng.nextInt(0, config.height - 1);
      const height = heightMap[y]?.[x] ?? 0;

      if (height > 0.3 && height < 0.6) {
        spawnPoints.push({ x: x * 32, y: y * 32, type: 'player' });
        break;
      }
    }

    // Enemy spawns
    const enemyCount = Math.floor(config.width * config.height / 5000);
    for (let i = 0; i < enemyCount; i++) {
      const x = rng.nextInt(config.width / 2, config.width - 1);
      const y = rng.nextInt(0, config.height - 1);
      const height = heightMap[y]?.[x] ?? 0;

      if (height > 0.3 && height < 0.7) {
        spawnPoints.push({ x: x * 32, y: y * 32, type: 'enemy' });
      }
    }

    // Treasure spawns
    const treasureCount = Math.floor(enemyCount / 3);
    for (let i = 0; i < treasureCount; i++) {
      const x = rng.nextInt(0, config.width - 1);
      const y = rng.nextInt(0, config.height - 1);
      const height = heightMap[y]?.[x] ?? 0;

      if (height > 0.5) {
        spawnPoints.push({ x: x * 32, y: y * 32, type: 'treasure' });
      }
    }
  }

  /**
   * Generate a random item
   */
  generateItem(config: ItemConfig): GeneratedItem {
    const rng = new SeededRandom(this.currentSeed++);

    const baseName = this.generateItemName(config, rng);
    const baseStats = this.getBaseStats(config);
    const rarityMultiplier = this.getRarityMultiplier(config.rarity);

    const stats: Record<string, number> = {};
    for (const [stat, value] of Object.entries(baseStats)) {
      stats[stat] = Math.round(value * rarityMultiplier * (0.8 + rng.next() * 0.4));
    }

    const effects = this.generateItemEffects(config, rng);

    return {
      name: baseName,
      description: this.generateItemDescription(config, baseName, stats),
      stats,
      effects,
      rarity: config.rarity,
      value: this.calculateItemValue(stats, config.rarity),
      sprite: `${config.type}_${config.rarity}`,
    };
  }

  private generateItemName(config: ItemConfig, rng: SeededRandom): string {
    const prefixes: Record<string, string[]> = {
      common: ['Simple', 'Basic', 'Plain', 'Worn'],
      uncommon: ['Fine', 'Quality', 'Sturdy', 'Polished'],
      rare: ['Exceptional', 'Superior', 'Masterwork', 'Enchanted'],
      epic: ['Legendary', 'Mythical', 'Ancient', 'Blessed'],
      legendary: ['Divine', 'Godforged', 'Eternal', 'Celestial'],
    };

    const typeNames: Record<string, string[]> = {
      weapon: ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger', 'Spear'],
      armor: ['Helmet', 'Chestplate', 'Gauntlets', 'Boots', 'Shield'],
      consumable: ['Potion', 'Elixir', 'Scroll', 'Food', 'Bomb'],
      material: ['Ore', 'Gem', 'Essence', 'Fragment', 'Crystal'],
      key: ['Key', 'Keystone', 'Sigil', 'Rune'],
      accessory: ['Ring', 'Amulet', 'Bracelet', 'Pendant', 'Charm'],
    };

    const prefix = rng.pick(prefixes[config.rarity] || prefixes.common);
    const typeName = rng.pick(typeNames[config.type] || ['Item']);

    return `${prefix} ${typeName}`;
  }

  private getBaseStats(config: ItemConfig): Record<string, number> {
    const baseStats: Record<string, Record<string, number>> = {
      weapon: { damage: 10, speed: 1, critChance: 5 },
      armor: { defense: 8, health: 20, resistance: 3 },
      consumable: { healing: 30, duration: 10 },
      material: { quality: 10 },
      key: {},
      accessory: { bonus: 5, luck: 2 },
    };

    const base = baseStats[config.type] || {};
    const level = config.level || 1;

    const scaled: Record<string, number> = {};
    for (const [stat, value] of Object.entries(base)) {
      scaled[stat] = Math.round(value * (1 + level * 0.1));
    }

    return scaled;
  }

  private getRarityMultiplier(rarity: string): number {
    const multipliers: Record<string, number> = {
      common: 1,
      uncommon: 1.3,
      rare: 1.7,
      epic: 2.2,
      legendary: 3,
    };
    return multipliers[rarity] || 1;
  }

  private generateItemEffects(config: ItemConfig, rng: SeededRandom): ItemEffect[] {
    const effects: ItemEffect[] = [];
    const effectChance = this.getRarityMultiplier(config.rarity) * 0.2;

    if (rng.next() < effectChance) {
      const effectTypes: ItemEffect['type'][] = ['damage', 'heal', 'buff', 'debuff', 'special'];
      effects.push({
        type: rng.pick(effectTypes),
        stat: rng.pick(['strength', 'agility', 'intellect', 'vitality']),
        value: Math.round(5 * this.getRarityMultiplier(config.rarity)),
        duration: rng.nextInt(5, 30),
      });
    }

    return effects;
  }

  private generateItemDescription(
    config: ItemConfig,
    _name: string,
    stats: Record<string, number>
  ): string {
    const statDesc = Object.entries(stats)
      .map(([stat, value]) => `+${value} ${stat}`)
      .join(', ');

    const rarityDesc: Record<string, string> = {
      common: 'A basic item.',
      uncommon: 'A well-crafted item.',
      rare: 'A masterfully crafted item.',
      epic: 'A legendary item of great power.',
      legendary: 'An item of divine origin.',
    };

    return `${rarityDesc[config.rarity] || ''} ${statDesc}`;
  }

  private calculateItemValue(stats: Record<string, number>, rarity: string): number {
    const baseValue = Object.values(stats).reduce((sum, v) => sum + v, 0) * 10;
    return Math.round(baseValue * this.getRarityMultiplier(rarity));
  }

  /**
   * Generate a quest
   */
  generateQuest(config: QuestConfig): GeneratedQuest {
    const rng = new SeededRandom(this.currentSeed++);

    const questTemplates = this.getQuestTemplates(config.type);
    const template = rng.pick(questTemplates);

    const objectives = this.generateQuestObjectives(config, template, rng);
    const rewards = this.generateQuestRewards(config, rng);

    return {
      id: `quest_${Date.now()}_${rng.nextInt(0, 9999)}`,
      name: this.generateQuestName(config, template, rng),
      description: template.description,
      objectives,
      rewards,
      difficulty: config.difficulty,
      estimatedTime: this.estimateQuestTime(config),
    };
  }

  private getQuestTemplates(type: string): { name: string; description: string; objectiveTypes: string[] }[] {
    const templates: Record<string, { name: string; description: string; objectiveTypes: string[] }[]> = {
      fetch: [
        { name: 'Gathering', description: 'Collect resources from the wilderness.', objectiveTypes: ['collect'] },
        { name: 'Retrieval', description: 'Find and return a lost item.', objectiveTypes: ['collect', 'reach'] },
      ],
      kill: [
        { name: 'Extermination', description: 'Eliminate threats from the area.', objectiveTypes: ['kill'] },
        { name: 'Bounty Hunt', description: 'Track down and defeat a dangerous target.', objectiveTypes: ['kill', 'reach'] },
      ],
      escort: [
        { name: 'Safe Passage', description: 'Protect someone on their journey.', objectiveTypes: ['protect', 'reach'] },
        { name: 'Caravan Guard', description: 'Ensure the caravan reaches its destination.', objectiveTypes: ['protect', 'survive'] },
      ],
      explore: [
        { name: 'Discovery', description: 'Explore uncharted territory.', objectiveTypes: ['reach', 'interact'] },
        { name: 'Cartography', description: 'Map out the unknown regions.', objectiveTypes: ['reach', 'reach', 'reach'] },
      ],
      puzzle: [
        { name: 'Ancient Mystery', description: 'Solve the puzzle left by the ancients.', objectiveTypes: ['interact', 'interact'] },
        { name: 'Riddle Master', description: 'Answer the riddles to proceed.', objectiveTypes: ['interact'] },
      ],
      boss: [
        { name: 'Champion\'s Challenge', description: 'Face the legendary champion.', objectiveTypes: ['kill', 'survive'] },
        { name: 'Dragon Slayer', description: 'Defeat the terrible dragon.', objectiveTypes: ['reach', 'kill'] },
      ],
    };

    return templates[type] || templates.fetch;
  }

  private generateQuestName(
    config: QuestConfig,
    template: { name: string },
    rng: SeededRandom
  ): string {
    const prefixes: Record<string, string[]> = {
      easy: ['Simple', 'Minor', 'Basic'],
      medium: ['Standard', 'Regular', 'Common'],
      hard: ['Challenging', 'Difficult', 'Dangerous'],
      legendary: ['Epic', 'Legendary', 'Impossible'],
    };

    const prefix = rng.pick(prefixes[config.difficulty] || prefixes.medium);
    return `${prefix} ${template.name}`;
  }

  private generateQuestObjectives(
    config: QuestConfig,
    template: { objectiveTypes: string[] },
    rng: SeededRandom
  ): QuestObjective[] {
    const countMultiplier: Record<string, number> = {
      easy: 1,
      medium: 2,
      hard: 3,
      legendary: 5,
    };

    return template.objectiveTypes.map((type, index) => ({
      id: `obj_${index}`,
      type: type as QuestObjective['type'],
      description: this.getObjectiveDescription(type, rng),
      target: this.getObjectiveTarget(type, rng),
      count: Math.round((rng.nextInt(3, 10)) * (countMultiplier[config.difficulty] || 1)),
      current: 0,
      optional: index > 0 && rng.next() > 0.7,
    }));
  }

  private getObjectiveDescription(type: string, rng: SeededRandom): string {
    const descriptions: Record<string, string[]> = {
      collect: ['Gather the required items', 'Find and collect resources', 'Harvest materials'],
      kill: ['Defeat the enemies', 'Eliminate all threats', 'Vanquish your foes'],
      reach: ['Travel to the destination', 'Find the location', 'Navigate to the area'],
      interact: ['Activate the mechanism', 'Use the object', 'Interact with the device'],
      survive: ['Stay alive for the duration', 'Survive the encounter', 'Endure the challenge'],
      protect: ['Keep the target safe', 'Defend your charge', 'Ensure their survival'],
    };

    return rng.pick(descriptions[type] || ['Complete the objective']);
  }

  private getObjectiveTarget(type: string, rng: SeededRandom): string {
    const targets: Record<string, string[]> = {
      collect: ['herbs', 'ore', 'gems', 'artifacts', 'scrolls'],
      kill: ['wolves', 'bandits', 'skeletons', 'goblins', 'boss'],
      reach: ['cave', 'tower', 'ruins', 'village', 'shrine'],
      interact: ['lever', 'altar', 'crystal', 'statue', 'door'],
      survive: ['waves', 'timer', 'ambush', 'storm'],
      protect: ['merchant', 'villager', 'child', 'elder'],
    };

    return rng.pick(targets[type] || ['target']);
  }

  private generateQuestRewards(config: QuestConfig, rng: SeededRandom): QuestReward[] {
    const rewards: QuestReward[] = [];

    const baseXP: Record<string, number> = { easy: 50, medium: 150, hard: 400, legendary: 1000 };
    const baseGold: Record<string, number> = { easy: 25, medium: 100, hard: 300, legendary: 1000 };

    rewards.push({
      type: 'experience',
      amount: Math.round(baseXP[config.difficulty] || 100 * (0.8 + rng.next() * 0.4)),
      description: 'Experience points',
    });

    rewards.push({
      type: 'gold',
      amount: Math.round(baseGold[config.difficulty] || 50 * (0.8 + rng.next() * 0.4)),
      description: 'Gold coins',
    });

    // Chance for item reward
    if (rng.next() > 0.5) {
      const rarities: Record<string, ItemConfig['rarity']> = {
        easy: 'common',
        medium: 'uncommon',
        hard: 'rare',
        legendary: 'epic',
      };
      rewards.push({
        type: 'item',
        itemId: `random_${rarities[config.difficulty] || 'common'}`,
        description: `${rarities[config.difficulty] || 'Common'} item`,
      });
    }

    return rewards;
  }

  private estimateQuestTime(config: QuestConfig): string {
    const times: Record<string, string> = {
      easy: '5-10 minutes',
      medium: '15-30 minutes',
      hard: '30-60 minutes',
      legendary: '1-2 hours',
    };
    return times[config.difficulty] || '15-30 minutes';
  }

  /**
   * Generate a complete game world
   */
  generateWorld(_gameSpec: unknown, config: GenerationConfig): {
    terrain: GeneratedTerrain;
    items: GeneratedItem[];
    quests: GeneratedQuest[];
  } {
    this.setSeed(config.seed || Date.now());

    const terrain = this.generateTerrain({
      width: 100,
      height: 100,
      type: 'hills',
      biome: (config.style as TerrainConfig['biome']) || 'forest',
      features: ['trees', 'rocks', 'paths', 'structures'],
    });

    const items: GeneratedItem[] = [];
    const itemCount = config.complexity === 'simple' ? 10 : config.complexity === 'moderate' ? 25 : 50;
    const rarities: ItemConfig['rarity'][] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary'];

    for (let i = 0; i < itemCount; i++) {
      const rng = new SeededRandom(this.currentSeed + i);
      items.push(this.generateItem({
        rarity: rng.pick(rarities),
        type: rng.pick(['weapon', 'armor', 'consumable', 'accessory']),
        level: rng.nextInt(1, 10),
      }));
    }

    const quests: GeneratedQuest[] = [];
    const questCount = config.complexity === 'simple' ? 3 : config.complexity === 'moderate' ? 7 : 15;
    const difficulties: QuestConfig['difficulty'][] = ['easy', 'easy', 'medium', 'medium', 'hard', 'legendary'];
    const questTypes: QuestConfig['type'][] = ['fetch', 'kill', 'explore', 'escort', 'puzzle', 'boss'];

    for (let i = 0; i < questCount; i++) {
      const rng = new SeededRandom(this.currentSeed + i + 1000);
      quests.push(this.generateQuest({
        difficulty: rng.pick(difficulties),
        type: rng.pick(questTypes),
      }));
    }

    return { terrain, items, quests };
  }
}

// Singleton instance
export const proceduralGenerator = new ProceduralContentGeneratorService();
