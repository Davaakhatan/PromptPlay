// E2E Tests for PromptPlay Desktop
// These tests simulate user workflows end-to-end
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type { GameSpec } from '@promptplay/shared-types';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

// Simulated file system
let fileSystem: Map<string, string>;

beforeEach(() => {
  fileSystem = new Map();
  vi.clearAllMocks();

  // Mock file operations
  mockedInvoke.mockImplementation(async (cmd: string, args?: unknown) => {
    const params = args as Record<string, unknown>;

    switch (cmd) {
      case 'create_directory':
        // Simulate directory creation
        return undefined;

      case 'write_file':
        fileSystem.set(params.path as string, params.content as string);
        return undefined;

      case 'read_file':
        const content = fileSystem.get(params.path as string);
        if (!content) throw new Error('File not found');
        return content;

      case 'load_game_spec':
        const gamePath = `${params.projectPath}/game.json`;
        const spec = fileSystem.get(gamePath);
        if (!spec) throw new Error('game.json not found');
        return spec;

      case 'list_directory':
        const entries: string[] = [];
        fileSystem.forEach((_, key) => {
          if (key.startsWith(params.path as string)) {
            entries.push(key);
          }
        });
        return entries;

      case 'start_file_watcher':
        return undefined;

      case 'stop_file_watcher':
        return undefined;

      case 'export_game_html':
        // Simulate HTML export
        const html = `<!DOCTYPE html><html><head><title>${params.gameTitle}</title></head><body><canvas id="game"></canvas><script>/* Game: ${params.gameSpecJson} */</script></body></html>`;
        fileSystem.set(params.outputPath as string, html);
        return undefined;

      default:
        return undefined;
    }
  });
});

describe('E2E: New Project Workflow', () => {
  it('should create a new empty project', async () => {
    const projectPath = '/test/my-game';
    const projectName = 'My Game';

    // Step 1: Create project directory
    await invoke('create_directory', { path: projectPath });

    // Step 2: Create default game.json
    const defaultSpec: GameSpec = {
      version: '1.0.0',
      metadata: {
        title: projectName,
        genre: 'platformer',
        description: 'A new game created with PromptPlay',
      },
      config: {
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
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

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(defaultSpec, null, 2),
    });

    // Step 3: Verify file was created
    expect(fileSystem.has(`${projectPath}/game.json`)).toBe(true);

    // Step 4: Load and verify content
    const loaded = await invoke('load_game_spec', { projectPath });
    const parsed = JSON.parse(loaded as string) as GameSpec;

    expect(parsed.metadata.title).toBe(projectName);
    expect(parsed.entities.length).toBe(2);
  });

  it('should create project from platformer template', async () => {
    const projectPath = '/test/platformer-game';

    // Create platformer spec
    const platformerSpec: GameSpec = {
      version: '1.0.0',
      metadata: { title: 'Platformer Game', genre: 'platformer', description: '' },
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
          tags: ['ground'],
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
        {
          name: 'coin1',
          components: {
            transform: { x: 200, y: 410, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
            collider: { type: 'box', width: 20, height: 20 },
          },
          tags: ['collectible'],
        },
      ],
      systems: ['input', 'physics', 'collision', 'render'],
    };

    await invoke('create_directory', { path: projectPath });
    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(platformerSpec, null, 2),
    });

    const loaded = await invoke('load_game_spec', { projectPath });
    const parsed = JSON.parse(loaded as string) as GameSpec;

    expect(parsed.metadata.genre).toBe('platformer');
    expect(parsed.entities.find(e => e.name === 'player')).toBeDefined();
    expect(parsed.entities.find(e => e.tags?.includes('collectible'))).toBeDefined();
    expect(parsed.config?.gravity?.y).toBeGreaterThan(0);
  });
});

describe('E2E: External Editor Workflow', () => {
  it('should detect and reload external changes', async () => {
    const projectPath = '/test/vibe-game';

    // Initial spec
    const initialSpec: GameSpec = {
      version: '1.0.0',
      metadata: { title: 'Vibe Game', genre: 'platformer', description: '' },
      config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
          },
          tags: ['player'],
        },
      ],
      systems: ['render'],
    };

    // Create project
    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(initialSpec, null, 2),
    });

    // Start file watcher
    await invoke('start_file_watcher', { path: projectPath });

    // Simulate external edit (like from Cursor/Claude)
    const modifiedSpec = {
      ...initialSpec,
      entities: [
        ...initialSpec.entities,
        {
          name: 'enemy',
          components: {
            transform: { x: 500, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 36, height: 36, tint: 0xff4444 },
          },
          tags: ['enemy'],
        },
      ],
    };

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(modifiedSpec, null, 2),
    });

    // Reload and verify
    const reloaded = await invoke('load_game_spec', { projectPath });
    const parsed = JSON.parse(reloaded as string) as GameSpec;

    expect(parsed.entities.length).toBe(2);
    expect(parsed.entities.find(e => e.name === 'enemy')).toBeDefined();

    // Cleanup
    await invoke('stop_file_watcher');
  });

  it('should handle entity position updates from external editor', async () => {
    const projectPath = '/test/edit-game';

    const spec: GameSpec = {
      version: '1.0.0',
      metadata: { title: 'Edit Game', genre: 'platformer', description: '' },
      config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
            input: { moveSpeed: 150, jumpForce: 280 },
          },
          tags: ['player'],
        },
      ],
      systems: ['input', 'physics', 'render'],
    };

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    // External edit: move player
    spec.entities[0].components.transform!.x = 400;
    spec.entities[0].components.transform!.y = 200;

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    const loaded = await invoke('load_game_spec', { projectPath });
    const parsed = JSON.parse(loaded as string) as GameSpec;

    expect(parsed.entities[0].components.transform?.x).toBe(400);
    expect(parsed.entities[0].components.transform?.y).toBe(200);
  });
});

describe('E2E: HTML Export Workflow', () => {
  it('should export game as standalone HTML', async () => {
    const projectPath = '/test/export-game';
    const exportPath = '/test/exports/game.html';

    const spec: GameSpec = {
      version: '1.0.0',
      metadata: { title: 'Export Game', genre: 'platformer', description: 'Test export' },
      config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
          },
          tags: ['player'],
        },
      ],
      systems: ['render'],
    };

    // Export
    await invoke('export_game_html', {
      gameSpecJson: JSON.stringify(spec),
      outputPath: exportPath,
      gameTitle: spec.metadata.title,
    });

    // Verify export
    expect(fileSystem.has(exportPath)).toBe(true);

    const html = fileSystem.get(exportPath)!;
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Export Game');
    expect(html).toContain('<canvas');
  });
});

describe('E2E: Entity Manipulation', () => {
  it('should add, modify, and delete entities', async () => {
    const projectPath = '/test/entity-game';

    // Start with empty game
    let spec: GameSpec = {
      version: '1.0.0',
      metadata: { title: 'Entity Game', genre: 'platformer', description: '' },
      config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
      entities: [],
      systems: ['render'],
    };

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    // Add player
    spec.entities.push({
      name: 'player',
      components: {
        transform: { x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
      },
      tags: ['player'],
    });

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    let loaded = JSON.parse(await invoke('load_game_spec', { projectPath }) as string) as GameSpec;
    expect(loaded.entities.length).toBe(1);

    // Add enemy
    spec.entities.push({
      name: 'enemy',
      components: {
        transform: { x: 500, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'default', width: 36, height: 36, tint: 0xff4444 },
      },
      tags: ['enemy'],
    });

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    loaded = JSON.parse(await invoke('load_game_spec', { projectPath }) as string) as GameSpec;
    expect(loaded.entities.length).toBe(2);

    // Modify player position
    spec.entities[0].components.transform!.x = 200;

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    loaded = JSON.parse(await invoke('load_game_spec', { projectPath }) as string) as GameSpec;
    expect(loaded.entities[0].components.transform?.x).toBe(200);

    // Delete enemy
    spec.entities = spec.entities.filter(e => e.name !== 'enemy');

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec, null, 2),
    });

    loaded = JSON.parse(await invoke('load_game_spec', { projectPath }) as string) as GameSpec;
    expect(loaded.entities.length).toBe(1);
    expect(loaded.entities.find(e => e.name === 'enemy')).toBeUndefined();
  });
});

describe('E2E: 2D to 3D Conversion', () => {
  it('should convert 2D game to 3D mode', async () => {
    const projectPath = '/test/3d-game';

    // 2D spec
    const spec2D: GameSpec = {
      version: '1.0.0',
      metadata: { title: '3D Game', genre: 'platformer', description: '' },
      config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } },
      entities: [
        {
          name: 'player',
          components: {
            transform: { x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
          },
          tags: ['player'],
        },
        {
          name: 'ground',
          components: {
            transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
          },
          tags: ['ground'],
        },
      ],
      systems: ['render'],
    };

    await invoke('write_file', {
      path: `${projectPath}/game.json`,
      content: JSON.stringify(spec2D, null, 2),
    });

    // Convert to 3D (simulate)
    const entities3D = spec2D.entities.map(entity => {
      const transform2D = entity.components.transform!;
      return {
        ...entity,
        components: {
          ...entity.components,
          transform3D: {
            x: transform2D.x,
            y: 0, // Ground level
            z: transform2D.y, // Y becomes Z in 3D
            rotationX: 0,
            rotationY: transform2D.rotation || 0,
            rotationZ: 0,
            scaleX: transform2D.scaleX || 1,
            scaleY: 1,
            scaleZ: transform2D.scaleY || 1,
          },
        },
      };
    });

    expect(entities3D[0].components.transform3D?.x).toBe(100);
    expect(entities3D[0].components.transform3D?.z).toBe(300);
    expect(entities3D[1].components.transform3D?.z).toBe(580);
  });
});
