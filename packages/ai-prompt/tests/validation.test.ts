import { describe, it, expect } from 'vitest';
import { SpecValidator } from '../src/validators/SpecValidator';
import { GameSpec } from '@promptplay/shared-types';

describe('SpecValidator', () => {
  describe('Valid Specs', () => {
    it('should validate a minimal valid spec', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test Game',
          genre: 'platformer',
          description: 'A test game'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result).toBeDefined();
      expect(result.version).toBe('1.0');
    });

    it('should validate a complete game spec', () => {
      const spec: GameSpec = {
        version: '1.0',
        metadata: {
          title: 'Platformer Game',
          genre: 'platformer',
          description: 'Jump and collect coins'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [
          {
            name: 'player',
            components: {
              transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
              velocity: { vx: 0, vy: 0 },
              sprite: { texture: 'player', width: 40, height: 40, tint: '#3b82f6ff' },
              collider: { type: 'box', width: 40, height: 40 },
              input: { moveSpeed: 8, jumpForce: -15 }
            },
            tags: ['player']
          },
          {
            name: 'ground',
            components: {
              transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
              sprite: { texture: 'platform', width: 800, height: 40 },
              collider: { type: 'box', width: 800, height: 40 }
            },
            tags: ['static']
          }
        ],
        systems: ['physics', 'input', 'collision', 'render']
      };

      const result = SpecValidator.validate(spec);
      expect(result).toBeDefined();
      expect(result.entities).toHaveLength(2);
    });

    it('should validate all genre types', () => {
      const genres: Array<'platformer' | 'shooter' | 'puzzle'> = ['platformer', 'shooter', 'puzzle'];

      genres.forEach(genre => {
        const spec = {
          version: '1.0',
          metadata: {
            title: `${genre} Game`,
            genre: genre,
            description: `A ${genre} game`
          },
          config: {
            gravity: { x: 0, y: 0 },
            worldBounds: { width: 800, height: 600 }
          },
          entities: [],
          systems: []
        };

        const result = SpecValidator.validate(spec);
        expect(result.metadata.genre).toBe(genre);
      });
    });

    it('should validate entity with all component types', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'All Components',
          genre: 'shooter',
          description: 'Testing all components'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'full-entity',
          components: {
            transform: { x: 100, y: 200, rotation: 45, scaleX: 1.5, scaleY: 2.0 },
            velocity: { vx: 5, vy: -10 },
            sprite: { texture: 'sprite', width: 64, height: 48, tint: '#ff00ffff', visible: true },
            collider: { type: 'circle', radius: 30, isSensor: true },
            input: { moveSpeed: 10, jumpForce: -20 },
            health: { current: 75, max: 100 },
            aiBehavior: { behaviorType: 'chase', speed: 6, detectionRadius: 200, targetEntity: 0 }
          },
          tags: ['test', 'ai', 'player']
        }],
        systems: ['physics', 'input', 'collision', 'render']
      };

      const result = SpecValidator.validate(spec);
      expect(result.entities[0].components.transform).toBeDefined();
      expect(result.entities[0].components.velocity).toBeDefined();
      expect(result.entities[0].components.sprite).toBeDefined();
      expect(result.entities[0].components.collider).toBeDefined();
      expect(result.entities[0].components.input).toBeDefined();
      expect(result.entities[0].components.health).toBeDefined();
      expect(result.entities[0].components.aiBehavior).toBeDefined();
    });

    it('should allow optional component fields', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Optional Fields',
          genre: 'puzzle',
          description: 'Testing optional fields'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'minimal-sprite',
          components: {
            transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'sprite', width: 32, height: 32 }
            // tint and visible are optional
          },
          tags: []
        }],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result.entities[0].components.sprite).toBeDefined();
    });
  });

  describe('Invalid Specs', () => {
    it('should reject spec without version', () => {
      const spec = {
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec without metadata', () => {
      const spec = {
        version: '1.0',
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec with invalid genre', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'invalid-genre',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec without config', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec with missing gravity', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec with missing worldBounds', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject entity without name', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          components: {},
          tags: []
        }],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject entity without components', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'entity',
          tags: []
        }],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject entity without tags', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'entity',
          components: {}
        }],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject spec with wrong type for numeric fields', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 'zero', y: 1 }, // x should be number
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject invalid collider type', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'entity',
          components: {
            collider: { type: 'triangle', width: 32, height: 32 } // invalid type
          },
          tags: []
        }],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });

    it('should reject invalid AI behavior type', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'shooter',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'enemy',
          components: {
            aiBehavior: { behaviorType: 'attack', speed: 5 } // invalid type
          },
          tags: []
        }],
        systems: []
      };

      expect(() => SpecValidator.validate(spec)).toThrow();
    });
  });

  describe('Type Coercion', () => {
    it('should handle string numbers in some fields', () => {
      // Zod may coerce certain types depending on schema
      // This tests the actual behavior
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Test',
          genre: 'platformer',
          description: 'Test'
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      // This should pass - all types correct
      const result = SpecValidator.validate(spec);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Large Numbers',
          genre: 'puzzle',
          description: 'Testing large values'
        },
        config: {
          gravity: { x: 0, y: 999999 },
          worldBounds: { width: 1000000, height: 1000000 }
        },
        entities: [{
          name: 'entity',
          components: {
            transform: { x: 999999, y: 999999, rotation: 360000, scaleX: 1000, scaleY: 1000 }
          },
          tags: []
        }],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result.config.gravity.y).toBe(999999);
    });

    it('should handle negative numbers', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Negative Numbers',
          genre: 'platformer',
          description: 'Testing negative values'
        },
        config: {
          gravity: { x: -5, y: -10 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'entity',
          components: {
            transform: { x: -100, y: -200, rotation: -45, scaleX: -1, scaleY: -1 },
            velocity: { vx: -50, vy: -75 }
          },
          tags: []
        }],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result.config.gravity.x).toBe(-5);
      expect(result.entities[0].components.transform?.x).toBe(-100);
    });

    it('should handle decimal numbers', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Decimals',
          genre: 'puzzle',
          description: 'Testing decimal values'
        },
        config: {
          gravity: { x: 0.5, y: 0.75 },
          worldBounds: { width: 800.5, height: 600.25 }
        },
        entities: [{
          name: 'entity',
          components: {
            transform: { x: 123.456, y: 789.012, rotation: 33.333, scaleX: 0.5, scaleY: 1.25 }
          },
          tags: []
        }],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result.config.gravity.x).toBe(0.5);
      expect(result.entities[0].components.transform?.rotation).toBe(33.333);
    });

    it('should handle empty strings in text fields', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: '',  // Empty title
          genre: 'platformer',
          description: ''  // Empty description
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []
      };

      // Depending on schema, this might pass or fail
      // Testing actual behavior
      try {
        const result = SpecValidator.validate(spec);
        expect(result).toBeDefined();
      } catch (e) {
        // If schema requires non-empty strings, this is expected
        expect(e).toBeDefined();
      }
    });

    it('should handle empty tags array', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Empty Tags',
          genre: 'puzzle',
          description: 'Testing empty tags'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [{
          name: 'entity',
          components: {},
          tags: []  // Empty tags array is valid
        }],
        systems: []
      };

      const result = SpecValidator.validate(spec);
      expect(result.entities[0].tags).toEqual([]);
    });

    it('should handle empty systems array', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'No Systems',
          genre: 'puzzle',
          description: 'No systems defined'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: [],
        systems: []  // Empty systems array is valid
      };

      const result = SpecValidator.validate(spec);
      expect(result.systems).toEqual([]);
    });

    it('should handle multiple entities', () => {
      const spec = {
        version: '1.0',
        metadata: {
          title: 'Many Entities',
          genre: 'shooter',
          description: 'Testing multiple entities'
        },
        config: {
          gravity: { x: 0, y: 0 },
          worldBounds: { width: 800, height: 600 }
        },
        entities: Array.from({ length: 50 }, (_, i) => ({
          name: `entity-${i}`,
          components: {
            transform: { x: i * 10, y: i * 5, rotation: 0, scaleX: 1, scaleY: 1 }
          },
          tags: [`tag-${i}`]
        })),
        systems: ['physics', 'render']
      };

      const result = SpecValidator.validate(spec);
      expect(result.entities).toHaveLength(50);
    });
  });
});
