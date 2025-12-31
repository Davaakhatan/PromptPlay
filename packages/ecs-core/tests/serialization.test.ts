import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld } from '../src/world/World';
import { Serializer } from '../src/serialization/Serializer';
import { Deserializer } from '../src/serialization/Deserializer';
import { Transform, Velocity, Sprite, Collider, Input, Health, AIBehavior } from '../src/components';
import { addComponent } from 'bitecs';
import { GameSpec } from '@promptplay/shared-types';

describe('Serialization - Comprehensive Tests', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = new GameWorld();
  });

  describe('All Component Types', () => {
    it('should serialize all component types correctly', () => {
      const w = world.getWorld();
      const eid = world.createEntity('test-entity');

      // Add all component types
      addComponent(w, Transform, eid);
      Transform.x[eid] = 150;
      Transform.y[eid] = 250;
      Transform.rotation[eid] = 45;
      Transform.scaleX[eid] = 1.5;
      Transform.scaleY[eid] = 2.0;

      addComponent(w, Velocity, eid);
      Velocity.vx[eid] = 10;
      Velocity.vy[eid] = -5;

      addComponent(w, Sprite, eid);
      Sprite.textureId[eid] = world.getTextureId('test-sprite');
      Sprite.width[eid] = 64;
      Sprite.height[eid] = 48;
      Sprite.tint[eid] = 0xff00ffff;
      Sprite.visible[eid] = 1;

      addComponent(w, Collider, eid);
      Collider.type[eid] = 0; // box
      Collider.width[eid] = 60;
      Collider.height[eid] = 45;
      Collider.radius[eid] = 0;
      Collider.isSensor[eid] = 0;

      addComponent(w, Input, eid);
      Input.moveSpeed[eid] = 8;
      Input.jumpForce[eid] = -18;

      addComponent(w, Health, eid);
      Health.current[eid] = 75;
      Health.max[eid] = 100;

      addComponent(w, AIBehavior, eid);
      AIBehavior.behaviorType[eid] = 1; // chase
      AIBehavior.targetEntity[eid] = 0;
      AIBehavior.detectionRadius[eid] = 200;
      AIBehavior.speed[eid] = 6;

      world.setMetadata({
        title: 'All Components Test',
        genre: 'platformer',
        description: 'Testing all components'
      });

      // Serialize
      const spec = Serializer.serialize(world);

      // Verify all components are present
      const entity = spec.entities[0];
      expect(entity.components.transform).toBeDefined();
      expect(entity.components.transform?.x).toBe(150);
      expect(entity.components.transform?.rotation).toBe(45);
      expect(entity.components.transform?.scaleX).toBe(1.5);

      expect(entity.components.velocity).toBeDefined();
      expect(entity.components.velocity?.vx).toBe(10);

      expect(entity.components.sprite).toBeDefined();
      expect(entity.components.sprite?.width).toBe(64);
      expect(entity.components.sprite?.texture).toBe('test-sprite');

      expect(entity.components.collider).toBeDefined();
      expect(entity.components.collider?.type).toBe('box');
      expect(entity.components.collider?.width).toBe(60);

      expect(entity.components.input).toBeDefined();
      expect(entity.components.input?.moveSpeed).toBe(8);

      expect(entity.components.health).toBeDefined();
      expect(entity.components.health?.current).toBe(75);

      expect(entity.components.aiBehavior).toBeDefined();
      expect(entity.components.aiBehavior?.behaviorType).toBe('chase');
      expect(entity.components.aiBehavior?.speed).toBe(6);
    });

    it('should deserialize all component types correctly', () => {
      const spec: GameSpec = {
        version: '1.0',
        metadata: {
          title: 'Full Components Game',
          genre: 'shooter',
          description: 'All components'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'enemy',
          components: {
            transform: { x: 300, y: 200, rotation: 90, scaleX: 1.2, scaleY: 0.8 },
            velocity: { vx: -3, vy: 2 },
            sprite: { texture: 'enemy', width: 40, height: 40, tint: '#ff0000ff' },
            collider: { type: 'circle', radius: 20, isSensor: false },
            health: { current: 50, max: 50 },
            aiBehavior: { behaviorType: 'patrol', speed: 4, detectionRadius: 150 }
          },
          tags: ['enemy', 'ai']
        }],
        systems: ['physics', 'collision', 'render']
      };

      Deserializer.deserialize(world, spec);

      const entities = world.getEntities();
      expect(entities).toHaveLength(1);

      const eid = entities[0];
      const w = world.getWorld();

      // Verify Transform
      expect(Transform.x[eid]).toBe(300);
      expect(Transform.y[eid]).toBe(200);
      expect(Transform.rotation[eid]).toBe(90);
      expect(Transform.scaleX[eid]).toBe(1.2);
      expect(Transform.scaleY[eid]).toBe(0.8);

      // Verify Velocity
      expect(Velocity.vx[eid]).toBe(-3);
      expect(Velocity.vy[eid]).toBe(2);

      // Verify Sprite
      expect(Sprite.width[eid]).toBe(40);
      expect(Sprite.height[eid]).toBe(40);

      // Verify Collider
      expect(Collider.type[eid]).toBe(1); // circle
      expect(Collider.radius[eid]).toBe(20);

      // Verify Health
      expect(Health.current[eid]).toBe(50);
      expect(Health.max[eid]).toBe(50);

      // Verify AIBehavior
      expect(AIBehavior.behaviorType[eid]).toBe(2); // patrol
      expect(AIBehavior.speed[eid]).toBe(4);
      expect(AIBehavior.detectionRadius[eid]).toBe(150);

      // Verify tags
      expect(world.hasTag(eid, 'enemy')).toBe(true);
      expect(world.hasTag(eid, 'ai')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle entity with no components', () => {
      const w = world.getWorld();
      const eid = world.createEntity('empty');
      world.addTag(eid, 'marker');

      world.setMetadata({
        title: 'Empty Entity Test',
        genre: 'puzzle',
        description: 'Testing empty entities'
      });

      const spec = Serializer.serialize(world);

      expect(spec.entities).toHaveLength(1);
      expect(spec.entities[0].name).toBe('empty');
      expect(spec.entities[0].tags).toContain('marker');
      expect(Object.keys(spec.entities[0].components)).toHaveLength(0);
    });

    it('should handle multiple entities with mixed components', () => {
      const w = world.getWorld();

      // Entity 1: Player with input
      const player = world.createEntity('player');
      addComponent(w, Transform, player);
      Transform.x[player] = 100;
      Transform.y[player] = 400;
      addComponent(w, Input, player);
      Input.moveSpeed[player] = 10;
      world.addTag(player, 'player');

      // Entity 2: Enemy with AI
      const enemy = world.createEntity('enemy');
      addComponent(w, Transform, enemy);
      Transform.x[enemy] = 500;
      Transform.y[enemy] = 200;
      addComponent(w, AIBehavior, enemy);
      AIBehavior.behaviorType[enemy] = 1; // chase
      world.addTag(enemy, 'enemy');

      // Entity 3: Static platform
      const platform = world.createEntity('platform');
      addComponent(w, Transform, platform);
      Transform.x[platform] = 400;
      Transform.y[platform] = 580;
      addComponent(w, Collider, platform);
      Collider.type[platform] = 0; // box
      world.addTag(platform, 'static');

      world.setMetadata({
        title: 'Mixed Entities',
        genre: 'platformer',
        description: 'Different entity types'
      });

      const spec = Serializer.serialize(world);

      expect(spec.entities).toHaveLength(3);

      const playerSpec = spec.entities.find(e => e.name === 'player');
      expect(playerSpec?.components.input).toBeDefined();
      expect(playerSpec?.components.aiBehavior).toBeUndefined();

      const enemySpec = spec.entities.find(e => e.name === 'enemy');
      expect(enemySpec?.components.aiBehavior).toBeDefined();
      expect(enemySpec?.components.input).toBeUndefined();

      const platformSpec = spec.entities.find(e => e.name === 'platform');
      expect(platformSpec?.components.collider).toBeDefined();
      expect(platformSpec?.components.input).toBeUndefined();
    });

    it('should preserve exact numeric values', () => {
      const w = world.getWorld();
      const eid = world.createEntity('precision-test');

      addComponent(w, Transform, eid);
      Transform.x[eid] = 123.456;
      Transform.y[eid] = 789.012;
      Transform.rotation[eid] = 33.333;
      Transform.scaleX[eid] = 0.5;
      Transform.scaleY[eid] = 1.25;

      addComponent(w, Velocity, eid);
      Velocity.vx[eid] = -7.89;
      Velocity.vy[eid] = 12.34;

      world.setMetadata({
        title: 'Precision Test',
        genre: 'puzzle',
        description: 'Testing numeric precision'
      });

      const spec = Serializer.serialize(world);
      const newWorld = new GameWorld();
      Deserializer.deserialize(newWorld, spec);

      const newEid = newWorld.getEntities()[0];

      // Check values are preserved (with floating point tolerance)
      expect(Transform.x[newEid]).toBeCloseTo(123.456, 2);
      expect(Transform.y[newEid]).toBeCloseTo(789.012, 2);
      expect(Transform.rotation[newEid]).toBeCloseTo(33.333, 2);
      expect(Velocity.vx[newEid]).toBeCloseTo(-7.89, 2);
      expect(Velocity.vy[newEid]).toBeCloseTo(12.34, 2);
    });

    it('should handle special tint values', () => {
      const w = world.getWorld();
      const eid = world.createEntity('tint-test');

      addComponent(w, Sprite, eid);
      Sprite.textureId[eid] = world.getTextureId('sprite');
      Sprite.width[eid] = 32;
      Sprite.height[eid] = 32;
      Sprite.tint[eid] = 0xffffff00; // White, fully transparent
      Sprite.visible[eid] = 0; // Hidden

      world.setMetadata({
        title: 'Tint Test',
        genre: 'puzzle',
        description: 'Testing tint values'
      });

      const spec = Serializer.serialize(world);

      expect(spec.entities[0].components.sprite?.tint).toBe('#ffffff00');
      expect(spec.entities[0].components.sprite?.visible).toBe(false);

      const newWorld = new GameWorld();
      Deserializer.deserialize(newWorld, spec);

      const newEid = newWorld.getEntities()[0];
      expect(Sprite.tint[newEid]).toBe(0xffffff00);
      expect(Sprite.visible[newEid]).toBe(0);
    });

    it('should handle multiple tags per entity', () => {
      const w = world.getWorld();
      const eid = world.createEntity('multi-tag');

      addComponent(w, Transform, eid);
      Transform.x[eid] = 100;
      Transform.y[eid] = 100;

      world.addTag(eid, 'player');
      world.addTag(eid, 'controllable');
      world.addTag(eid, 'damageable');
      world.addTag(eid, 'visible');

      world.setMetadata({
        title: 'Multi Tag Test',
        genre: 'platformer',
        description: 'Testing multiple tags'
      });

      const spec = Serializer.serialize(world);

      expect(spec.entities[0].tags).toHaveLength(4);
      expect(spec.entities[0].tags).toContain('player');
      expect(spec.entities[0].tags).toContain('controllable');
      expect(spec.entities[0].tags).toContain('damageable');
      expect(spec.entities[0].tags).toContain('visible');

      const newWorld = new GameWorld();
      Deserializer.deserialize(newWorld, spec);

      const newEid = newWorld.getEntities()[0];
      expect(newWorld.hasTag(newEid, 'player')).toBe(true);
      expect(newWorld.hasTag(newEid, 'controllable')).toBe(true);
      expect(newWorld.hasTag(newEid, 'damageable')).toBe(true);
      expect(newWorld.hasTag(newEid, 'visible')).toBe(true);
    });

    it('should handle circle collider type', () => {
      const spec: GameSpec = {
        version: '1.0',
        metadata: {
          title: 'Circle Collider Test',
          genre: 'puzzle',
          description: 'Testing circle colliders'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'ball',
          components: {
            transform: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
            collider: { type: 'circle', radius: 25, isSensor: true }
          },
          tags: ['ball']
        }],
        systems: ['physics', 'collision']
      };

      Deserializer.deserialize(world, spec);

      const eid = world.getEntities()[0];
      expect(Collider.type[eid]).toBe(1); // circle
      expect(Collider.radius[eid]).toBe(25);
      expect(Collider.isSensor[eid]).toBe(1);
    });

    it('should handle config values correctly', () => {
      const spec: GameSpec = {
        version: '1.0',
        metadata: {
          title: 'Config Test',
          genre: 'platformer',
          description: 'Testing config'
        },
        config: {
          gravity: { x: 0.5, y: 1.5 },
          worldBounds: { width: 1024, height: 768 }
        },
        entities: [],
        systems: []
      };

      Deserializer.deserialize(world, spec);

      const config = world.getConfig();
      expect(config.gravity.x).toBe(0.5);
      expect(config.gravity.y).toBe(1.5);
      expect(config.worldBounds.width).toBe(1024);
      expect(config.worldBounds.height).toBe(768);
    });
  });

  describe('Round-trip Tests', () => {
    it('should maintain data integrity through serialize-deserialize cycle', () => {
      const w = world.getWorld();

      // Create a complex scene
      const player = world.createEntity('player');
      addComponent(w, Transform, player);
      Transform.x[player] = 100;
      Transform.y[player] = 400;
      addComponent(w, Velocity, player);
      Velocity.vx[player] = 0;
      Velocity.vy[player] = 0;
      addComponent(w, Sprite, player);
      Sprite.textureId[player] = world.getTextureId('player');
      Sprite.width[player] = 40;
      Sprite.height[player] = 40;
      Sprite.tint[player] = 0x3b82f6ff;
      addComponent(w, Input, player);
      Input.moveSpeed[player] = 8;
      Input.jumpForce[player] = -15;
      world.addTag(player, 'player');

      const enemy = world.createEntity('enemy1');
      addComponent(w, Transform, enemy);
      Transform.x[enemy] = 600;
      Transform.y[enemy] = 150;
      addComponent(w, AIBehavior, enemy);
      AIBehavior.behaviorType[enemy] = 1; // chase
      AIBehavior.speed[enemy] = 5;
      world.addTag(enemy, 'enemy');

      world.setMetadata({
        title: 'Round Trip Test',
        genre: 'platformer',
        description: 'Testing round trip'
      });

      world.setConfig({
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 }
      });

      // Serialize
      const spec1 = Serializer.serialize(world);

      // Deserialize into new world
      const world2 = new GameWorld();
      Deserializer.deserialize(world2, spec1);

      // Serialize again
      const spec2 = Serializer.serialize(world2);

      // Both specs should be identical
      expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
    });

    it('should handle empty world serialization', () => {
      world.setMetadata({
        title: 'Empty World',
        genre: 'puzzle',
        description: 'No entities'
      });

      const spec = Serializer.serialize(world);

      expect(spec.entities).toHaveLength(0);
      expect(spec.metadata.title).toBe('Empty World');

      const newWorld = new GameWorld();
      Deserializer.deserialize(newWorld, spec);

      expect(newWorld.getEntities()).toHaveLength(0);
      expect(newWorld.getMetadata().title).toBe('Empty World');
    });
  });
});
