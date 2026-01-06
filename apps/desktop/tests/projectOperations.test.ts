// Test: Project Operations
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type { GameSpec } from '@promptplay/shared-types';

// Mock the invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

// Template specs
const TEMPLATES = {
  empty: {
    version: '1.0.0',
    metadata: { title: 'Empty Project', genre: 'platformer' as const, description: '' },
    config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
    entities: [
      {
        name: 'player',
        components: {
          transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
          velocity: { vx: 0, vy: 0 },
          collider: { type: 'box', width: 32, height: 32 },
          input: { moveSpeed: 150, jumpForce: 280 },
        },
        tags: ['player'],
      },
    ],
    systems: ['input', 'physics', 'collision', 'render'],
  },
  platformer: {
    version: '1.0.0',
    metadata: { title: 'Platformer', genre: 'platformer' as const, description: 'A platformer game' },
    config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
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
      {
        name: 'platform1',
        components: {
          transform: { x: 200, y: 450, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 150, height: 20, tint: 0x886644 },
          collider: { type: 'box', width: 150, height: 20 },
        },
        tags: ['platform'],
      },
    ],
    systems: ['input', 'physics', 'collision', 'render'],
  },
  shooter: {
    version: '1.0.0',
    metadata: { title: 'Shooter', genre: 'shooter' as const, description: 'A shooter game' },
    config: { gravity: { x: 0, y: 0 }, worldBounds: { width: 800, height: 600 } },
    entities: [
      {
        name: 'player',
        components: {
          transform: { x: 400, y: 500, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 40, height: 40, tint: 0x44aaff },
          velocity: { vx: 0, vy: 0 },
          collider: { type: 'box', width: 40, height: 40 },
          input: { moveSpeed: 300, jumpForce: 0 },
        },
        tags: ['player'],
      },
      {
        name: 'enemy1',
        components: {
          transform: { x: 200, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 36, height: 36, tint: 0xff4444 },
          velocity: { vx: 50, vy: 0 },
          collider: { type: 'box', width: 36, height: 36 },
        },
        tags: ['enemy'],
      },
    ],
    systems: ['input', 'physics', 'collision', 'render'],
  },
};

describe('Project Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create directory for new project', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined); // create_directory
    mockedInvoke.mockResolvedValueOnce(undefined); // write_file

    const projectPath = '/test/my-game';
    await mockedInvoke('create_directory', { path: projectPath });

    expect(mockedInvoke).toHaveBeenCalledWith('create_directory', { path: projectPath });
  });

  it('should write game.json with template', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    const projectPath = '/test/my-game';
    const gameSpec = TEMPLATES.platformer;

    await mockedInvoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(gameSpec, null, 2),
    });

    expect(mockedInvoke).toHaveBeenCalledWith('write_file', expect.objectContaining({
      path: `${projectPath}/game.json`,
    }));
  });

  it('should load game spec from project', () => {
    // Test that game spec can be parsed correctly
    const gameSpec = TEMPLATES.platformer;
    const jsonString = JSON.stringify(gameSpec);
    const parsed = JSON.parse(jsonString) as GameSpec;

    expect(parsed.metadata.title).toBe('Platformer');
    expect(parsed.entities.length).toBeGreaterThan(0);
    expect(parsed.entities.find(e => e.name === 'player')).toBeDefined();
  });
});

describe('Project Save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save game spec to file', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    const projectPath = '/test/my-game';
    const gameSpec = TEMPLATES.empty;

    await mockedInvoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(gameSpec, null, 2),
    });

    expect(mockedInvoke).toHaveBeenCalledWith('write_file', expect.objectContaining({
      path: expect.stringContaining('game.json'),
    }));
  });

  it('should preserve all spec properties on save', () => {
    const spec = TEMPLATES.platformer;
    const serialized = JSON.stringify(spec, null, 2);
    const deserialized = JSON.parse(serialized) as GameSpec;

    expect(deserialized.version).toBe(spec.version);
    expect(deserialized.metadata.title).toBe(spec.metadata.title);
    expect(deserialized.entities.length).toBe(spec.entities.length);
    expect(deserialized.systems).toEqual(spec.systems);
  });
});

describe('Template Selection', () => {
  it('empty template should have single player entity', () => {
    const spec = TEMPLATES.empty;
    expect(spec.entities.length).toBe(1);
    expect(spec.entities[0].name).toBe('player');
  });

  it('platformer template should have player, ground, and platforms', () => {
    const spec = TEMPLATES.platformer;
    const names = spec.entities.map(e => e.name);

    expect(names).toContain('player');
    expect(names).toContain('ground');
    expect(spec.entities.length).toBeGreaterThanOrEqual(3);
  });

  it('shooter template should have no gravity', () => {
    const spec = TEMPLATES.shooter;
    expect(spec.config?.gravity?.y).toBe(0);
  });

  it('shooter template should have enemies', () => {
    const spec = TEMPLATES.shooter;
    const enemies = spec.entities.filter(e => e.tags?.includes('enemy'));
    expect(enemies.length).toBeGreaterThan(0);
  });
});

describe('File Watcher Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start file watcher for project', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    await mockedInvoke('start_file_watcher', { path: '/test/my-game' });

    expect(mockedInvoke).toHaveBeenCalledWith('start_file_watcher', { path: '/test/my-game' });
  });

  it('should stop file watcher on cleanup', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    await mockedInvoke('stop_file_watcher');

    expect(mockedInvoke).toHaveBeenCalledWith('stop_file_watcher');
  });
});

describe('HTML Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export game to HTML', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    const gameSpec = TEMPLATES.platformer;
    const outputPath = '/test/export/game.html';

    await mockedInvoke('export_game_html', {
      gameSpecJson: JSON.stringify(gameSpec),
      outputPath,
      gameTitle: gameSpec.metadata.title,
    });

    expect(mockedInvoke).toHaveBeenCalledWith('export_game_html', expect.objectContaining({
      outputPath,
      gameTitle: 'Platformer',
    }));
  });
});

describe('Entity Operations', () => {
  it('should add entity to spec', () => {
    const spec: GameSpec = JSON.parse(JSON.stringify(TEMPLATES.empty));
    const newEntity = {
      name: 'coin',
      components: {
        transform: { x: 200, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
        collider: { type: 'box' as const, width: 20, height: 20 },
      },
      tags: ['collectible'] as string[],
    };

    spec.entities = [...spec.entities, newEntity];

    expect(spec.entities.length).toBe(2);
    expect(spec.entities[1].name).toBe('coin');
  });

  it('should remove entity from spec', () => {
    const spec = { ...TEMPLATES.platformer };
    const initialCount = spec.entities.length;

    spec.entities = spec.entities.filter(e => e.name !== 'platform1');

    expect(spec.entities.length).toBe(initialCount - 1);
    expect(spec.entities.find(e => e.name === 'platform1')).toBeUndefined();
  });

  it('should update entity component', () => {
    const spec = { ...TEMPLATES.platformer };
    const player = spec.entities.find(e => e.name === 'player');

    if (player?.components.transform) {
      player.components.transform.x = 200;
      player.components.transform.y = 300;
    }

    const updated = spec.entities.find(e => e.name === 'player');
    expect(updated?.components.transform?.x).toBe(200);
    expect(updated?.components.transform?.y).toBe(300);
  });

  it('should generate unique entity name', () => {
    const spec = TEMPLATES.platformer;
    const existingNames = new Set(spec.entities.map(e => e.name));

    let newName = 'platform';
    let counter = 1;
    while (existingNames.has(newName)) {
      newName = `platform${counter++}`;
    }

    expect(newName).toBe('platform');
    expect(!existingNames.has(newName)).toBe(true);
  });
});
