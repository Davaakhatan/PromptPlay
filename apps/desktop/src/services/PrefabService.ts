import type { Prefab, PrefabCategory, EntitySpec } from '@promptplay/shared-types';

// Built-in prefabs
const builtInPrefabs: Prefab[] = [
  // Player prefabs
  {
    id: 'builtin-player-platformer',
    name: 'Platformer Player',
    description: 'A player character with movement and jumping',
    category: 'player',
    icon: 'player',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 32, height: 48, tint: 0x4488ff },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 32, height: 48 },
        input: { moveSpeed: 200, jumpForce: -400 },
      },
      tags: ['player'],
    },
  },
  {
    id: 'builtin-player-topdown',
    name: 'Top-Down Player',
    description: 'A player for top-down games (no gravity)',
    category: 'player',
    icon: 'player',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 32, height: 32, tint: 0x44aaff },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 32, height: 32 },
        input: { moveSpeed: 200, jumpForce: 0 },
      },
      tags: ['player'],
    },
  },

  // Enemy prefabs
  {
    id: 'builtin-enemy-patrol',
    name: 'Patrol Enemy',
    description: 'An enemy that patrols back and forth',
    category: 'enemy',
    icon: 'enemy',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 32, height: 32, tint: 0xff4444 },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 32, height: 32 },
        health: { current: 100, max: 100 },
        aiBehavior: { type: 'patrol', speed: 50, detectionRadius: 150, patrolRange: 100 },
      },
      tags: ['enemy'],
    },
  },
  {
    id: 'builtin-enemy-chaser',
    name: 'Chaser Enemy',
    description: 'An enemy that chases the player',
    category: 'enemy',
    icon: 'enemy',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 28, height: 28, tint: 0xff6644 },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 28, height: 28 },
        health: { current: 50, max: 50 },
        aiBehavior: { type: 'chase', speed: 80, detectionRadius: 200 },
      },
      tags: ['enemy'],
    },
  },

  // Platform prefabs
  {
    id: 'builtin-platform-small',
    name: 'Small Platform',
    description: 'A small floating platform',
    category: 'platform',
    icon: 'platform',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 100, height: 20, tint: 0x886644 },
        collider: { type: 'box', width: 100, height: 20 },
      },
      tags: ['platform'],
    },
  },
  {
    id: 'builtin-platform-medium',
    name: 'Medium Platform',
    description: 'A medium-sized platform',
    category: 'platform',
    icon: 'platform',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 200, height: 20, tint: 0x886644 },
        collider: { type: 'box', width: 200, height: 20 },
      },
      tags: ['platform'],
    },
  },
  {
    id: 'builtin-ground',
    name: 'Ground',
    description: 'A wide ground platform',
    category: 'platform',
    icon: 'ground',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
        collider: { type: 'box', width: 800, height: 40 },
      },
      tags: ['ground', 'platform'],
    },
  },

  // Collectible prefabs
  {
    id: 'builtin-coin',
    name: 'Coin',
    description: 'A collectible coin',
    category: 'collectible',
    icon: 'coin',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
        collider: { type: 'circle', radius: 10, isSensor: true },
      },
      tags: ['collectible', 'coin'],
    },
  },
  {
    id: 'builtin-powerup',
    name: 'Power-Up',
    description: 'A power-up item',
    category: 'collectible',
    icon: 'star',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 24, height: 24, tint: 0x44ffaa },
        collider: { type: 'box', width: 24, height: 24, isSensor: true },
      },
      tags: ['collectible', 'powerup'],
    },
  },

  // Projectile prefabs
  {
    id: 'builtin-bullet',
    name: 'Bullet',
    description: 'A fast-moving projectile',
    category: 'projectile',
    icon: 'projectile',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 8, height: 8, tint: 0xffff00 },
        velocity: { vx: 500, vy: 0 },
        collider: { type: 'circle', radius: 4 },
      },
      tags: ['projectile', 'bullet'],
    },
  },

  // Effect prefabs
  {
    id: 'builtin-particle-emitter',
    name: 'Particle Emitter',
    description: 'Emits particles for visual effects',
    category: 'effect',
    icon: 'particles',
    isBuiltIn: true,
    entity: {
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        particleEmitter: {
          emitRate: 20,
          maxParticles: 100,
          minLifetime: 0.5,
          maxLifetime: 1.5,
          minSize: 2,
          maxSize: 8,
          minSpeed: 50,
          maxSpeed: 100,
          minAngle: 0,
          maxAngle: 360,
          startColor: 0xffaa00,
          endColor: 0xff0000,
          gravityY: 50,
          isEmitting: true,
        },
      },
      tags: ['effect', 'particles'],
    },
  },
];

class PrefabService {
  private customPrefabs: Prefab[] = [];
  private storageKey = 'promptplay-custom-prefabs';

  constructor() {
    this.loadCustomPrefabs();
  }

  private loadCustomPrefabs(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.customPrefabs = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Failed to load custom prefabs:', err);
      this.customPrefabs = [];
    }
  }

  private saveCustomPrefabs(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.customPrefabs));
    } catch (err) {
      console.error('Failed to save custom prefabs:', err);
    }
  }

  getAll(): Prefab[] {
    return [...builtInPrefabs, ...this.customPrefabs];
  }

  getBuiltIn(): Prefab[] {
    return builtInPrefabs;
  }

  getCustom(): Prefab[] {
    return this.customPrefabs;
  }

  getByCategory(category: PrefabCategory): Prefab[] {
    return this.getAll().filter(p => p.category === category);
  }

  getById(id: string): Prefab | undefined {
    return this.getAll().find(p => p.id === id);
  }

  createFromEntity(entity: EntitySpec, name: string, category: PrefabCategory, description?: string): Prefab {
    const prefab: Prefab = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category,
      entity: {
        components: JSON.parse(JSON.stringify(entity.components)),
        tags: entity.tags ? [...entity.tags] : [],
      },
      isBuiltIn: false,
    };

    this.customPrefabs.push(prefab);
    this.saveCustomPrefabs();

    return prefab;
  }

  updatePrefab(id: string, updates: Partial<Omit<Prefab, 'id' | 'isBuiltIn'>>): boolean {
    const index = this.customPrefabs.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.customPrefabs[index] = { ...this.customPrefabs[index], ...updates };
    this.saveCustomPrefabs();
    return true;
  }

  deletePrefab(id: string): boolean {
    const index = this.customPrefabs.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.customPrefabs.splice(index, 1);
    this.saveCustomPrefabs();
    return true;
  }

  instantiate(prefab: Prefab, name: string, position?: { x: number; y: number }): EntitySpec {
    const entity: EntitySpec = {
      name,
      components: JSON.parse(JSON.stringify(prefab.entity.components)),
      tags: prefab.entity.tags ? [...prefab.entity.tags] : [],
    };

    // Apply position if provided
    if (position && entity.components.transform) {
      entity.components.transform.x = position.x;
      entity.components.transform.y = position.y;
    }

    return entity;
  }

  getCategories(): { id: PrefabCategory; name: string; icon: string }[] {
    return [
      { id: 'player', name: 'Players', icon: 'player' },
      { id: 'enemy', name: 'Enemies', icon: 'enemy' },
      { id: 'platform', name: 'Platforms', icon: 'platform' },
      { id: 'collectible', name: 'Collectibles', icon: 'coin' },
      { id: 'projectile', name: 'Projectiles', icon: 'projectile' },
      { id: 'effect', name: 'Effects', icon: 'particles' },
      { id: 'ui', name: 'UI', icon: 'ui' },
      { id: 'custom', name: 'Custom', icon: 'custom' },
    ];
  }
}

export const prefabService = new PrefabService();
