import { z } from 'zod';
import { GameSpec } from '@promptplay/shared-types';

const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
});

const VelocitySchema = z.object({
  vx: z.number(),
  vy: z.number(),
});

const SpriteSchema = z.object({
  texture: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  tint: z.string().optional(),
});

const ColliderSchema = z.object({
  type: z.enum(['box', 'circle']),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  isSensor: z.boolean().optional(),
  layer: z.number().optional(),
});

const InputSchema = z.object({
  moveSpeed: z.number(),
  jumpForce: z.number(),
  canJump: z.boolean().optional(),
});

const HealthSchema = z.object({
  current: z.number(),
  max: z.number(),
});

const AIBehaviorSchema = z.object({
  type: z.enum(['patrol', 'chase', 'flee']),
  speed: z.number(),
  detectionRadius: z.number(),
  targetEntity: z.number().optional(),
});

const ComponentsSchema = z.object({
  transform: TransformSchema.optional(),
  velocity: VelocitySchema.optional(),
  sprite: SpriteSchema.optional(),
  collider: ColliderSchema.optional(),
  input: InputSchema.optional(),
  health: HealthSchema.optional(),
  aiBehavior: AIBehaviorSchema.optional(),
});

const EntitySchema = z.object({
  name: z.string(),
  components: ComponentsSchema,
  tags: z.array(z.string()).optional(),
});

const GameSpecSchema = z.object({
  version: z.string(),
  metadata: z.object({
    title: z.string(),
    genre: z.enum(['platformer', 'shooter', 'puzzle']),
    description: z.string(),
  }),
  config: z.object({
    gravity: z.object({
      x: z.number(),
      y: z.number(),
    }),
    worldBounds: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  }),
  entities: z.array(EntitySchema),
  systems: z.array(z.string()),
});

export function validateGameSpec(spec: unknown): GameSpec {
  try {
    return GameSpecSchema.parse(spec);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      throw new Error(`Invalid game spec:\n${issues}`);
    }
    throw error;
  }
}

export function isValidGameSpec(spec: unknown): spec is GameSpec {
  try {
    GameSpecSchema.parse(spec);
    return true;
  } catch {
    return false;
  }
}
