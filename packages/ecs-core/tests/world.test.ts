import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld } from '../src/world/World';
import { Serializer } from '../src/serialization/Serializer';
import { Deserializer } from '../src/serialization/Deserializer';
import { Transform, Velocity, Sprite } from '../src/components';
import { addComponent } from 'bitecs';
import { GameSpec } from '@promptplay/shared-types';

describe('GameWorld', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new GameWorld();
  });

  it('should create entities', () => {
    const eid = world.createEntity('player');
    expect(eid).toBeGreaterThanOrEqual(0);
    expect(world.getEntityName(eid)).toBe('player');
  });

  it('should add and remove tags', () => {
    const eid = world.createEntity('player');
    world.addTag(eid, 'controllable');
    expect(world.hasTag(eid, 'controllable')).toBe(true);

    world.removeTag(eid, 'controllable');
    expect(world.hasTag(eid, 'controllable')).toBe(false);
  });

  it('should query entities by tag', () => {
    const eid1 = world.createEntity('player');
    const eid2 = world.createEntity('enemy');

    world.addTag(eid1, 'controllable');
    world.addTag(eid2, 'enemy');

    const controllable = world.getEntitiesByTag('controllable');
    expect(controllable).toContain(eid1);
    expect(controllable).not.toContain(eid2);
  });

  it('should manage texture registry', () => {
    const id1 = world.getTextureId('player');
    const id2 = world.getTextureId('enemy');
    const id3 = world.getTextureId('player'); // Should reuse same ID

    expect(id1).not.toBe(id2);
    expect(id1).toBe(id3);
    expect(world.getTextureName(id1)).toBe('player');
  });
});

describe('Serialization', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new GameWorld();
  });

  it('should serialize and deserialize a simple entity', () => {
    const w = world.getWorld();
    const eid = world.createEntity('player');

    // Add components
    addComponent(w, Transform, eid);
    Transform.x[eid] = 100;
    Transform.y[eid] = 200;
    Transform.rotation[eid] = 0;
    Transform.scaleX[eid] = 1;
    Transform.scaleY[eid] = 1;

    addComponent(w, Velocity, eid);
    Velocity.vx[eid] = 5;
    Velocity.vy[eid] = -10;

    world.addTag(eid, 'player');

    // Set metadata
    world.setMetadata({
      title: 'Test Game',
      genre: 'platformer',
      description: 'A test game',
    });

    // Serialize
    const spec = Serializer.serialize(world);

    expect(spec.entities).toHaveLength(1);
    expect(spec.entities[0].name).toBe('player');
    expect(spec.entities[0].components.transform?.x).toBe(100);
    expect(spec.entities[0].components.transform?.y).toBe(200);
    expect(spec.entities[0].components.velocity?.vx).toBe(5);
    expect(spec.entities[0].tags).toContain('player');

    // Deserialize into new world
    const newWorld = new GameWorld();
    Deserializer.deserialize(newWorld, spec);

    const newEid = newWorld.getEntities()[0];
    const nw = newWorld.getWorld();

    expect(Transform.x[newEid]).toBe(100);
    expect(Transform.y[newEid]).toBe(200);
    expect(Velocity.vx[newEid]).toBe(5);
    expect(newWorld.hasTag(newEid, 'player')).toBe(true);
    expect(newWorld.getMetadata().title).toBe('Test Game');
  });

  it('should handle a complete game spec', () => {
    const spec: GameSpec = {
      version: '1.0',
      metadata: {
        title: 'Platformer Game',
        genre: 'platformer',
        description: 'Jump and collect coins',
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
            velocity: { vx: 0, vy: 0 },
            sprite: { texture: 'player', width: 32, height: 32 },
            collider: { type: 'box', width: 32, height: 32 },
            input: { moveSpeed: 5, jumpForce: -15 },
          },
          tags: ['player'],
        },
        {
          name: 'ground',
          components: {
            transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'platform', width: 800, height: 40 },
            collider: { type: 'box', width: 800, height: 40 },
          },
          tags: ['static'],
        },
      ],
      systems: ['physics', 'input', 'render'],
    };

    Deserializer.deserialize(world, spec);

    const entities = world.getEntities();
    expect(entities).toHaveLength(2);

    const playerEntities = world.getEntitiesByTag('player');
    expect(playerEntities).toHaveLength(1);

    const groundEntities = world.getEntitiesByTag('static');
    expect(groundEntities).toHaveLength(1);

    expect(world.getMetadata().title).toBe('Platformer Game');
    expect(world.getConfig().gravity.y).toBe(1);
  });
});
