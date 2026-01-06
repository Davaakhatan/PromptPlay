// Test: Game Spec Validation and Structure
import { describe, it, expect } from 'vitest';
import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

// Sample game specs for testing
const VALID_PLATFORMER_SPEC: GameSpec = {
  version: '1.0.0',
  metadata: {
    title: 'Test Platformer',
    genre: 'platformer',
    description: 'A test platformer game',
  },
  config: {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 },
  },
  entities: [
    {
      name: 'player',
      components: {
        transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 32, height: 48, tint: 0x4488ff },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 32, height: 48 },
        input: { moveSpeed: 150, jumpForce: 280 },
      },
      tags: ['player'],
    },
    {
      name: 'ground',
      components: {
        transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
        collider: { type: 'box', width: 800, height: 40 },
      },
      tags: ['ground', 'platform'],
    },
  ],
  systems: ['input', 'physics', 'collision', 'render'],
};

describe('GameSpec Structure', () => {
  it('should have required metadata fields', () => {
    expect(VALID_PLATFORMER_SPEC.metadata).toBeDefined();
    expect(VALID_PLATFORMER_SPEC.metadata.title).toBe('Test Platformer');
    expect(VALID_PLATFORMER_SPEC.metadata.genre).toBe('platformer');
  });

  it('should have valid config with gravity and bounds', () => {
    expect(VALID_PLATFORMER_SPEC.config).toBeDefined();
    expect(VALID_PLATFORMER_SPEC.config?.gravity).toEqual({ x: 0, y: 1 });
    expect(VALID_PLATFORMER_SPEC.config?.worldBounds).toEqual({ width: 800, height: 600 });
  });

  it('should have entities array', () => {
    expect(Array.isArray(VALID_PLATFORMER_SPEC.entities)).toBe(true);
    expect(VALID_PLATFORMER_SPEC.entities.length).toBeGreaterThan(0);
  });

  it('should have systems array', () => {
    expect(Array.isArray(VALID_PLATFORMER_SPEC.systems)).toBe(true);
    expect(VALID_PLATFORMER_SPEC.systems).toContain('physics');
    expect(VALID_PLATFORMER_SPEC.systems).toContain('render');
  });
});

describe('Entity Structure', () => {
  const player = VALID_PLATFORMER_SPEC.entities[0];

  it('should have unique name', () => {
    expect(player.name).toBe('player');
  });

  it('should have transform component', () => {
    expect(player.components.transform).toBeDefined();
    expect(player.components.transform?.x).toBe(100);
    expect(player.components.transform?.y).toBe(400);
  });

  it('should have sprite component', () => {
    expect(player.components.sprite).toBeDefined();
    expect(player.components.sprite?.width).toBe(32);
    expect(player.components.sprite?.height).toBe(48);
  });

  it('should have tags array', () => {
    expect(Array.isArray(player.tags)).toBe(true);
    expect(player.tags).toContain('player');
  });

  it('player should have input component', () => {
    expect(player.components.input).toBeDefined();
    expect(player.components.input?.moveSpeed).toBe(150);
    expect(player.components.input?.jumpForce).toBe(280);
  });
});

describe('Entity Operations', () => {
  it('should find entity by name', () => {
    const found = VALID_PLATFORMER_SPEC.entities.find(e => e.name === 'player');
    expect(found).toBeDefined();
    expect(found?.name).toBe('player');
  });

  it('should find entities by tag', () => {
    const platforms = VALID_PLATFORMER_SPEC.entities.filter(
      e => e.tags?.includes('platform')
    );
    expect(platforms.length).toBe(1);
    expect(platforms[0].name).toBe('ground');
  });

  it('should create new entity with required fields', () => {
    const newEntity: EntitySpec = {
      name: 'coin',
      components: {
        transform: { x: 200, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
        collider: { type: 'box', width: 20, height: 20 },
      },
      tags: ['collectible'],
    };

    expect(newEntity.name).toBe('coin');
    expect(newEntity.tags).toContain('collectible');
  });

  it('should duplicate entity with new name', () => {
    const original = VALID_PLATFORMER_SPEC.entities[0];
    const duplicate: EntitySpec = {
      ...original,
      name: `${original.name}_copy`,
      components: {
        ...original.components,
        transform: {
          ...original.components.transform!,
          x: (original.components.transform?.x || 0) + 50,
        },
      },
    };

    expect(duplicate.name).toBe('player_copy');
    expect(duplicate.components.transform?.x).toBe(150);
  });
});

describe('Template Validation', () => {
  it('platformer template should have player with input', () => {
    const player = VALID_PLATFORMER_SPEC.entities.find(e => e.name === 'player');
    expect(player?.components.input).toBeDefined();
    expect(player?.components.velocity).toBeDefined();
  });

  it('platformer should have gravity enabled', () => {
    expect(VALID_PLATFORMER_SPEC.config?.gravity?.y).toBeGreaterThan(0);
  });

  it('should have ground entity', () => {
    const ground = VALID_PLATFORMER_SPEC.entities.find(e => e.tags?.includes('ground'));
    expect(ground).toBeDefined();
  });
});

describe('3D Spec Conversion', () => {
  it('should convert 2D position to 3D', () => {
    const entity2D = VALID_PLATFORMER_SPEC.entities[0];
    const x = entity2D.components.transform?.x || 0;
    const y = entity2D.components.transform?.y || 0;

    // 3D conversion: y becomes z, add y=0 for ground level
    const position3D = {
      x: x,
      y: 0,
      z: y,
    };

    expect(position3D.x).toBe(100);
    expect(position3D.y).toBe(0);
    expect(position3D.z).toBe(400);
  });
});
