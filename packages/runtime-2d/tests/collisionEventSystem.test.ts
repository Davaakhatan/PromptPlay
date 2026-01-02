import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addComponent } from 'bitecs';
import { CollisionEventSystem, CollisionHandler } from '../src/systems/CollisionEventSystem';
import { GameWorld, Health } from '@promptplay/ecs-core';
import { MatterPhysics } from '../src/physics/MatterPhysics';

// Mock MatterPhysics
function createMockPhysics() {
  let collisionCallback: ((eidA: number, eidB: number) => void) | null = null;

  return {
    onCollision: vi.fn((callback: (eidA: number, eidB: number) => void) => {
      collisionCallback = callback;
    }),
    removeBody: vi.fn(),
    // Helper to trigger collision for testing
    triggerCollision: (eidA: number, eidB: number) => {
      if (collisionCallback) {
        collisionCallback(eidA, eidB);
      }
    },
  };
}

describe('CollisionEventSystem', () => {
  let system: CollisionEventSystem;
  let world: GameWorld;
  let mockPhysics: ReturnType<typeof createMockPhysics>;

  beforeEach(() => {
    mockPhysics = createMockPhysics();
    system = new CollisionEventSystem(mockPhysics as unknown as MatterPhysics);
    world = new GameWorld();
  });

  // Helper to create entity with tags
  function createEntityWithTags(name: string, tags: string[]): number {
    const eid = world.createEntity(name);
    for (const tag of tags) {
      world.addTag(eid, tag);
    }
    return eid;
  }

  // Helper to create entity with health
  function createEntityWithHealth(name: string, current: number, max: number): number {
    const eid = world.createEntity(name);
    const w = world.getWorld();
    addComponent(w, Health, eid);
    Health.current[eid] = current;
    Health.max[eid] = max;
    return eid;
  }

  describe('init', () => {
    it('should register collision callback with physics', () => {
      system.init(world);

      expect(mockPhysics.onCollision).toHaveBeenCalledTimes(1);
      expect(mockPhysics.onCollision).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should store world reference', () => {
      system.init(world);

      // Verify world is stored by checking that collision handling works
      const eid1 = createEntityWithTags('entity1', []);
      const eid2 = createEntityWithTags('entity2', []);

      const handler = vi.fn();
      system.onCollision(handler);

      mockPhysics.triggerCollision(eid1, eid2);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onCollision', () => {
    it('should register general collision callback', () => {
      system.init(world);

      const handler = vi.fn();
      system.onCollision(handler);

      const eid1 = createEntityWithTags('entity1', []);
      const eid2 = createEntityWithTags('entity2', []);

      mockPhysics.triggerCollision(eid1, eid2);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to callback', () => {
      system.init(world);

      const handler = vi.fn();
      system.onCollision(handler);

      const eid1 = createEntityWithTags('player', ['player', 'controllable']);
      const eid2 = createEntityWithTags('enemy', ['enemy', 'hostile']);

      mockPhysics.triggerCollision(eid1, eid2);

      expect(handler).toHaveBeenCalledWith(
        eid1,
        eid2,
        'player',
        'enemy',
        expect.arrayContaining(['player', 'controllable']),
        expect.arrayContaining(['enemy', 'hostile']),
        world
      );
    });

    it('should call multiple registered callbacks', () => {
      system.init(world);

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      system.onCollision(handler1);
      system.onCollision(handler2);
      system.onCollision(handler3);

      const eid1 = createEntityWithTags('a', []);
      const eid2 = createEntityWithTags('b', []);

      mockPhysics.triggerCollision(eid1, eid2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });

  describe('addRule', () => {
    it('should register tag-based collision rule', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'coin', handler);

      const player = createEntityWithTags('player', ['player']);
      const coin = createEntityWithTags('coin', ['coin']);

      mockPhysics.triggerCollision(player, coin);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass entityA as the one with tagA', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'enemy', handler);

      const player = createEntityWithTags('player', ['player']);
      const enemy = createEntityWithTags('enemy', ['enemy']);

      mockPhysics.triggerCollision(player, enemy);

      expect(handler).toHaveBeenCalledWith(
        player, // entityA with tagA
        enemy,  // entityB with tagB
        'player',
        'enemy',
        expect.arrayContaining(['player']),
        expect.arrayContaining(['enemy']),
        world
      );
    });

    it('should handle reversed collision order', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'enemy', handler);

      const player = createEntityWithTags('player', ['player']);
      const enemy = createEntityWithTags('enemy', ['enemy']);

      // Collision reported in reverse order
      mockPhysics.triggerCollision(enemy, player);

      // Handler should still be called with player first (matching tagA)
      expect(handler).toHaveBeenCalledWith(
        player,
        enemy,
        'player',
        'enemy',
        expect.arrayContaining(['player']),
        expect.arrayContaining(['enemy']),
        world
      );
    });

    it('should not fire rule when tags do not match', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'coin', handler);

      const enemy = createEntityWithTags('enemy', ['enemy']);
      const wall = createEntityWithTags('wall', ['wall']);

      mockPhysics.triggerCollision(enemy, wall);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should fire rule only when both tags are present', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'coin', handler);

      const player = createEntityWithTags('player', ['player']);
      const wall = createEntityWithTags('wall', ['wall']); // Not a coin

      mockPhysics.triggerCollision(player, wall);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple rules', () => {
      system.init(world);

      const playerCoinHandler = vi.fn();
      const playerEnemyHandler = vi.fn();
      const bulletEnemyHandler = vi.fn();

      system.addRule('player', 'coin', playerCoinHandler);
      system.addRule('player', 'enemy', playerEnemyHandler);
      system.addRule('bullet', 'enemy', bulletEnemyHandler);

      const player = createEntityWithTags('player', ['player']);
      const coin = createEntityWithTags('coin', ['coin']);
      const enemy = createEntityWithTags('enemy', ['enemy']);
      const bullet = createEntityWithTags('bullet', ['bullet']);

      mockPhysics.triggerCollision(player, coin);
      expect(playerCoinHandler).toHaveBeenCalledTimes(1);
      expect(playerEnemyHandler).not.toHaveBeenCalled();

      mockPhysics.triggerCollision(player, enemy);
      expect(playerEnemyHandler).toHaveBeenCalledTimes(1);

      mockPhysics.triggerCollision(bullet, enemy);
      expect(bulletEnemyHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle entity with multiple tags', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('enemy', 'projectile', handler);

      // Boss is both enemy and boss
      const boss = createEntityWithTags('boss', ['enemy', 'boss']);
      const fireball = createEntityWithTags('fireball', ['projectile', 'fire']);

      mockPhysics.triggerCollision(boss, fireball);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeEntity', () => {
    it('should remove body from physics', () => {
      system.init(world);

      const eid = createEntityWithTags('entity', []);

      system.removeEntity(eid);

      expect(mockPhysics.removeBody).toHaveBeenCalledWith(eid);
    });

    it('should destroy entity from world', () => {
      system.init(world);

      const eid = createEntityWithTags('entity', []);
      expect(world.getEntityName(eid)).toBe('entity');

      system.removeEntity(eid);

      // Entity should no longer exist
      expect(world.getEntityName(eid)).toBeUndefined();
    });

    it('should do nothing before init', () => {
      const eid = world.createEntity('entity');

      // Should not throw when world is not set
      expect(() => system.removeEntity(eid)).not.toThrow();
      expect(mockPhysics.removeBody).not.toHaveBeenCalled();
    });
  });

  describe('damageEntity', () => {
    it('should reduce entity health', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 100, 100);

      system.damageEntity(eid, 30);

      expect(Health.current[eid]).toBe(70);
    });

    it('should return false when entity survives', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 100, 100);

      const died = system.damageEntity(eid, 30);

      expect(died).toBe(false);
    });

    it('should return true when entity dies', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 50, 100);

      const died = system.damageEntity(eid, 50);

      expect(died).toBe(true);
      expect(Health.current[eid]).toBe(0);
    });

    it('should return true when damage exceeds health', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 30, 100);

      const died = system.damageEntity(eid, 100);

      expect(died).toBe(true);
      expect(Health.current[eid]).toBe(0);
    });

    it('should clamp health to 0 on death', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 20, 100);

      system.damageEntity(eid, 50);

      expect(Health.current[eid]).toBe(0);
    });

    it('should return false for entity without Health component', () => {
      system.init(world);

      const eid = createEntityWithTags('wall', []);

      const died = system.damageEntity(eid, 50);

      expect(died).toBe(false);
    });

    it('should return false before init', () => {
      const eid = createEntityWithHealth('player', 100, 100);

      const died = system.damageEntity(eid, 50);

      expect(died).toBe(false);
      expect(Health.current[eid]).toBe(100); // Unchanged
    });

    it('should handle multiple damage applications', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 100, 100);

      system.damageEntity(eid, 20);
      expect(Health.current[eid]).toBe(80);

      system.damageEntity(eid, 30);
      expect(Health.current[eid]).toBe(50);

      const died = system.damageEntity(eid, 60);
      expect(died).toBe(true);
      expect(Health.current[eid]).toBe(0);
    });
  });

  describe('healEntity', () => {
    it('should increase entity health', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 50, 100);

      system.healEntity(eid, 30);

      expect(Health.current[eid]).toBe(80);
    });

    it('should not exceed max health', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 80, 100);

      system.healEntity(eid, 50);

      expect(Health.current[eid]).toBe(100); // Clamped to max
    });

    it('should heal to exactly max when needed', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 60, 100);

      system.healEntity(eid, 40);

      expect(Health.current[eid]).toBe(100);
    });

    it('should do nothing for entity without Health component', () => {
      system.init(world);

      const eid = createEntityWithTags('wall', []);

      // Should not throw
      expect(() => system.healEntity(eid, 50)).not.toThrow();
    });

    it('should do nothing before init', () => {
      const eid = createEntityWithHealth('player', 50, 100);

      system.healEntity(eid, 30);

      expect(Health.current[eid]).toBe(50); // Unchanged
    });

    it('should allow healing after damage', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 100, 100);

      system.damageEntity(eid, 60);
      expect(Health.current[eid]).toBe(40);

      system.healEntity(eid, 30);
      expect(Health.current[eid]).toBe(70);
    });
  });

  describe('update', () => {
    it('should not throw when called', () => {
      system.init(world);

      // Update is a no-op (event-based system)
      expect(() => system.update(world, 0.016)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clear all rules', () => {
      system.init(world);

      const handler = vi.fn();
      system.addRule('player', 'coin', handler);

      system.cleanup();

      // Re-init to set up new world
      system.init(world);

      const player = createEntityWithTags('player', ['player']);
      const coin = createEntityWithTags('coin', ['coin']);

      mockPhysics.triggerCollision(player, coin);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all callbacks', () => {
      system.init(world);

      const handler = vi.fn();
      system.onCollision(handler);

      system.cleanup();

      // Re-init to set up new world
      system.init(world);

      const eid1 = createEntityWithTags('a', []);
      const eid2 = createEntityWithTags('b', []);

      mockPhysics.triggerCollision(eid1, eid2);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear world reference', () => {
      system.init(world);

      const eid = createEntityWithHealth('player', 100, 100);

      system.cleanup();

      // Operations should fail silently
      expect(system.damageEntity(eid, 50)).toBe(false);
      expect(Health.current[eid]).toBe(100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle player collecting coins', () => {
      system.init(world);

      let coinsCollected = 0;
      system.addRule('player', 'coin', (playerEid, coinEid) => {
        coinsCollected++;
        system.removeEntity(coinEid);
      });

      const player = createEntityWithTags('player', ['player']);
      const coin1 = createEntityWithTags('coin1', ['coin']);
      const coin2 = createEntityWithTags('coin2', ['coin']);

      mockPhysics.triggerCollision(player, coin1);
      mockPhysics.triggerCollision(player, coin2);

      expect(coinsCollected).toBe(2);
      expect(mockPhysics.removeBody).toHaveBeenCalledTimes(2);
    });

    it('should handle player-enemy combat', () => {
      system.init(world);

      system.addRule('player', 'enemy', (playerEid, enemyEid) => {
        system.damageEntity(playerEid, 10);
      });

      system.addRule('bullet', 'enemy', (bulletEid, enemyEid) => {
        const died = system.damageEntity(enemyEid, 25);
        system.removeEntity(bulletEid);
        if (died) {
          system.removeEntity(enemyEid);
        }
      });

      const player = createEntityWithTags('player', ['player']);
      addComponent(world.getWorld(), Health, player);
      Health.current[player] = 100;
      Health.max[player] = 100;

      const enemy = createEntityWithTags('enemy', ['enemy']);
      addComponent(world.getWorld(), Health, enemy);
      Health.current[enemy] = 50;
      Health.max[enemy] = 50;

      const bullet1 = createEntityWithTags('bullet1', ['bullet']);
      const bullet2 = createEntityWithTags('bullet2', ['bullet']);

      // Enemy hits player
      mockPhysics.triggerCollision(player, enemy);
      expect(Health.current[player]).toBe(90);

      // First bullet hits enemy
      mockPhysics.triggerCollision(bullet1, enemy);
      expect(Health.current[enemy]).toBe(25);

      // Second bullet kills enemy
      mockPhysics.triggerCollision(bullet2, enemy);
      expect(Health.current[enemy]).toBe(0);
    });

    it('should handle healing pickups', () => {
      system.init(world);

      system.addRule('player', 'healthpack', (playerEid, healthpackEid) => {
        system.healEntity(playerEid, 25);
        system.removeEntity(healthpackEid);
      });

      const player = createEntityWithTags('player', ['player']);
      addComponent(world.getWorld(), Health, player);
      Health.current[player] = 50;
      Health.max[player] = 100;

      const healthpack = createEntityWithTags('healthpack', ['healthpack']);

      mockPhysics.triggerCollision(player, healthpack);

      expect(Health.current[player]).toBe(75);
      expect(mockPhysics.removeBody).toHaveBeenCalledWith(healthpack);
    });
  });
});
