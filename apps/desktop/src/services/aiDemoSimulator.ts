/**
 * AI Demo Mode Simulator
 * Provides simulated AI responses when no API key is configured
 */
import type { GameSpec } from '@promptplay/shared-types';

export interface AISimulatorResponse {
  message: string;
  updatedSpec?: GameSpec;
}

/**
 * Simulates AI responses for demo mode
 */
export async function simulateAIResponse(
  prompt: string,
  gameSpec: GameSpec
): Promise<AISimulatorResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  const lowerPrompt = prompt.toLowerCase();

  // Add coin
  const addCoinMatch = lowerPrompt.match(/add\s+(?:a\s+)?coin\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (addCoinMatch) {
    return handleAddCoin(gameSpec, parseInt(addCoinMatch[1]), parseInt(addCoinMatch[2]));
  }

  // Make player faster
  if (lowerPrompt.includes('player') && (lowerPrompt.includes('faster') || lowerPrompt.includes('speed'))) {
    return handleMakePlayerFaster(gameSpec, lowerPrompt);
  }

  // Add platform
  const platformMatch = lowerPrompt.match(/add\s+(?:a\s+)?platform\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (platformMatch) {
    return handleAddPlatform(gameSpec, parseInt(platformMatch[1]), parseInt(platformMatch[2]));
  }

  // Add enemy
  const enemyMatch = lowerPrompt.match(/add\s+(?:an?\s+)?enemy\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (enemyMatch) {
    return handleAddEnemy(gameSpec, parseInt(enemyMatch[1]), parseInt(enemyMatch[2]));
  }

  // Add staircase platforms
  const staircaseMatch = lowerPrompt.match(/add\s+(\d+)\s+platforms?\s+(?:in\s+)?(?:a\s+)?staircase/i);
  if (staircaseMatch) {
    return handleAddStaircasePlatforms(gameSpec, parseInt(staircaseMatch[1]));
  }

  // Add health pickup
  const healthMatch = lowerPrompt.match(/(?:add|create)\s+(?:a\s+)?health\s+(?:pickup|item|pack)\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (healthMatch || (lowerPrompt.includes('health') && lowerPrompt.includes('pickup'))) {
    const x = healthMatch?.[1] ? parseInt(healthMatch[1]) : 300;
    const y = healthMatch?.[2] ? parseInt(healthMatch[2]) : 400;
    return handleAddHealthPickup(gameSpec, x, y);
  }

  // Change player color
  const colorMatch = lowerPrompt.match(/(?:change|make|set)\s+(?:the\s+)?player(?:'s)?\s+(?:color\s+)?(?:to\s+)?(red|blue|green|yellow|purple|orange|pink|white)/i);
  if (colorMatch) {
    return handleChangePlayerColor(gameSpec, colorMatch[1].toLowerCase());
  }

  // Make player bigger/smaller
  const sizeMatch = lowerPrompt.match(/make\s+(?:the\s+)?player\s+(bigger|larger|smaller|tiny|huge)/i);
  if (sizeMatch) {
    return handleChangePlayerSize(gameSpec, sizeMatch[1].toLowerCase());
  }

  // Delete entity
  const deleteMatch = lowerPrompt.match(/(?:delete|remove)\s+(?:the\s+)?(?:entity\s+)?["']?(\w+)["']?/i);
  if (deleteMatch) {
    return handleDeleteEntity(gameSpec, deleteMatch[1].toLowerCase());
  }

  // Boost jump
  if (lowerPrompt.includes('jump') && (lowerPrompt.includes('higher') || lowerPrompt.includes('boost') || lowerPrompt.includes('increase'))) {
    return handleBoostJump(gameSpec);
  }

  // Change gravity
  if (lowerPrompt.includes('gravity')) {
    return handleGravityChange(gameSpec, lowerPrompt);
  }

  // Add moving platform
  const movingPlatformMatch = lowerPrompt.match(/add\s+(?:a\s+)?moving\s+platform\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (movingPlatformMatch || (lowerPrompt.includes('moving') && lowerPrompt.includes('platform'))) {
    const x = movingPlatformMatch?.[1] ? parseInt(movingPlatformMatch[1]) : 300;
    const y = movingPlatformMatch?.[2] ? parseInt(movingPlatformMatch[2]) : 350;
    return handleAddMovingPlatform(gameSpec, x, y);
  }

  // Duplicate entity
  const duplicateMatch = lowerPrompt.match(/(?:duplicate|clone|copy)\s+(?:the\s+)?(?:entity\s+)?["']?(\w+)["']?\s*(?:(?:at|to)\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (duplicateMatch) {
    return handleDuplicateEntity(gameSpec, duplicateMatch[1].toLowerCase(), duplicateMatch[2], duplicateMatch[3]);
  }

  // Add multiple entities
  const multipleMatch = lowerPrompt.match(/add\s+(\d+)\s+(coins?|enemies|platforms?|health\s*pickups?)/i);
  if (multipleMatch && !lowerPrompt.includes('staircase')) {
    return handleAddMultiple(gameSpec, parseInt(multipleMatch[1]), multipleMatch[2].toLowerCase());
  }

  // List entities
  if ((lowerPrompt.includes('list') && lowerPrompt.includes('entities')) ||
      (lowerPrompt.includes('show') && lowerPrompt.includes('entities')) ||
      lowerPrompt === 'entities') {
    return handleListEntities(gameSpec);
  }

  // Add spawn point
  const spawnMatch = lowerPrompt.match(/add\s+(?:a\s+)?spawn\s*(?:point)?\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (spawnMatch || lowerPrompt.includes('spawn')) {
    const x = spawnMatch?.[1] ? parseInt(spawnMatch[1]) : 100;
    const y = spawnMatch?.[2] ? parseInt(spawnMatch[2]) : 400;
    return handleAddSpawnPoint(gameSpec, x, y);
  }

  // Add checkpoint
  const checkpointMatch = lowerPrompt.match(/add\s+(?:a\s+)?checkpoint\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (checkpointMatch || lowerPrompt.includes('checkpoint')) {
    const x = checkpointMatch?.[1] ? parseInt(checkpointMatch[1]) : 400;
    const y = checkpointMatch?.[2] ? parseInt(checkpointMatch[2]) : 350;
    return handleAddCheckpoint(gameSpec, x, y);
  }

  // Add component
  const addComponentMatch = lowerPrompt.match(/add\s+(?:a\s+)?(health|velocity|collider|input|aiBehavior|physics)\s+(?:component\s+)?(?:to\s+)?["']?(\w+)["']?/i);
  if (addComponentMatch) {
    return handleAddComponent(gameSpec, addComponentMatch[1].toLowerCase(), addComponentMatch[2].toLowerCase());
  }

  // Create system
  const createSystemMatch = lowerPrompt.match(/(?:create|add)\s+(?:a\s+)?(?:new\s+)?(\w+)\s+system/i);
  if (createSystemMatch) {
    return handleCreateSystem(gameSpec, createSystemMatch[1].toLowerCase());
  }

  // Debug/analyze
  if (lowerPrompt.includes('debug') || lowerPrompt.includes('analyze') ||
      lowerPrompt.includes("what's wrong") || lowerPrompt.includes('problem') ||
      lowerPrompt.includes('issue')) {
    return handleAnalyze(gameSpec);
  }

  // Fix player
  if (lowerPrompt.includes('fix') && lowerPrompt.includes('player')) {
    return handleFixPlayer(gameSpec);
  }

  // Rename game
  const renameMatch = lowerPrompt.match(/(?:rename|change|set)\s+(?:the\s+)?(?:game\s+)?(?:name|title)\s+(?:to\s+)?["']?(.+?)["']?$/i);
  if (renameMatch) {
    return {
      message: `I'll rename the game to **"${renameMatch[1].trim()}"**.`,
      updatedSpec: {
        ...gameSpec,
        metadata: { ...gameSpec.metadata, name: renameMatch[1].trim() },
      },
    };
  }

  // Help command
  if (lowerPrompt === 'help' || lowerPrompt === '?' || lowerPrompt.includes('what can you do')) {
    return { message: getHelpText() };
  }

  // Default response
  return { message: getDefaultResponse(prompt) };
}

// Helper functions
function getUniqueName(baseName: string, existingNames: Set<string>): string {
  let counter = 1;
  while (existingNames.has(`${baseName}${counter}`)) counter++;
  return `${baseName}${counter}`;
}

function handleAddCoin(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('coin', existingNames);

  return {
    message: `I'll add a **coin** at position (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'coin', width: 24, height: 24, tint: 0xffd700 },
          collider: { type: 'circle' as const, radius: 12 },
        },
        tags: ['collectible', 'coin'],
      }],
    },
  };
}

function handleMakePlayerFaster(gameSpec: GameSpec, lowerPrompt: string): AISimulatorResponse {
  const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));
  if (!playerEntity?.components.input) {
    return { message: "I couldn't find a player entity with input controls to modify." };
  }

  const speedIncrease = lowerPrompt.includes('much') ? 1.5 : 1.25;
  const currentSpeed = playerEntity.components.input.moveSpeed || 200;
  const newSpeed = Math.round(currentSpeed * speedIncrease);

  return {
    message: `I'll increase the player's movement speed from **${currentSpeed}** to **${newSpeed}**.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e =>
        e.name === playerEntity.name && e.components.input
          ? { ...e, components: { ...e.components, input: { ...e.components.input, moveSpeed: newSpeed } } }
          : e
      ),
    },
  };
}

function handleAddPlatform(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('platform', existingNames);

  return {
    message: `I'll add a **platform** at (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 },
          collider: { type: 'box' as const, width: 100, height: 20 },
        },
        tags: ['platform'],
      }],
    },
  };
}

function handleAddEnemy(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('enemy', existingNames);

  return {
    message: `I'll add an **enemy** at (${x}, ${y}) with patrol behavior.`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'enemy', width: 32, height: 32, tint: 0xff4444 },
          velocity: { vx: 0, vy: 0 },
          collider: { type: 'box' as const, width: 32, height: 32 },
          aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100 },
          health: { current: 3, max: 3 },
        },
        tags: ['enemy'],
      }],
    },
  };
}

function handleAddStaircasePlatforms(gameSpec: GameSpec, count: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const newEntities = [];

  for (let i = 0; i < count; i++) {
    const name = getUniqueName('platform', existingNames);
    existingNames.add(name);
    newEntities.push({
      name,
      components: {
        transform: { x: 150 + i * 120, y: 450 - i * 60, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 },
        collider: { type: 'box' as const, width: 100, height: 20 },
      },
      tags: ['platform'],
    });
  }

  return {
    message: `I'll add **${count} platforms** in a staircase pattern.`,
    updatedSpec: { ...gameSpec, entities: [...gameSpec.entities, ...newEntities] },
  };
}

function handleAddHealthPickup(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('health', existingNames);

  return {
    message: `I'll add a **health pickup** at (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'health', width: 24, height: 24, tint: 0xff4488 },
          collider: { type: 'box' as const, width: 24, height: 24 },
        },
        tags: ['collectible', 'health', 'pickup'],
      }],
    },
  };
}

function handleChangePlayerColor(gameSpec: GameSpec, colorName: string): AISimulatorResponse {
  const colorMap: Record<string, number> = {
    red: 0xff4444, blue: 0x4488ff, green: 0x44ff44, yellow: 0xffff44,
    purple: 0x9944ff, orange: 0xff8844, pink: 0xff44ff, white: 0xffffff,
  };
  const tint = colorMap[colorName] || 0x4488ff;

  return {
    message: `I'll change the player's color to **${colorName}**.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e =>
        e.tags?.includes('player') && e.components.sprite
          ? { ...e, components: { ...e.components, sprite: { ...e.components.sprite, tint } } }
          : e
      ),
    },
  };
}

function handleChangePlayerSize(gameSpec: GameSpec, sizeWord: string): AISimulatorResponse {
  const scaleMap: Record<string, number> = {
    bigger: 1.5, larger: 1.5, smaller: 0.7, tiny: 0.5, huge: 2.0,
  };
  const scale = scaleMap[sizeWord] || 1;

  return {
    message: `I'll make the player **${sizeWord}** (scale: ${scale}x).`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e =>
        e.tags?.includes('player') && e.components.transform
          ? { ...e, components: { ...e.components, transform: { ...e.components.transform, scaleX: scale, scaleY: scale } } }
          : e
      ),
    },
  };
}

function handleDeleteEntity(gameSpec: GameSpec, entityName: string): AISimulatorResponse {
  const entity = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);
  if (!entity) {
    return { message: `I couldn't find an entity named "${entityName}" to delete.` };
  }

  return {
    message: `I'll remove the entity **${entity.name}** from the game.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.filter(e => e.name.toLowerCase() !== entityName),
    },
  };
}

function handleBoostJump(gameSpec: GameSpec): AISimulatorResponse {
  const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));
  if (!playerEntity?.components.input) {
    return { message: "I couldn't find a player entity with input controls." };
  }

  const currentJump = Math.abs(playerEntity.components.input.jumpForce || 400);
  const newJump = Math.round(currentJump * 1.3);

  return {
    message: `I'll increase the player's jump force from **${currentJump}** to **${newJump}**.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e =>
        e.name === playerEntity.name && e.components.input
          ? { ...e, components: { ...e.components, input: { ...e.components.input, jumpForce: -newJump } } }
          : e
      ),
    },
  };
}

function handleGravityChange(gameSpec: GameSpec, lowerPrompt: string): AISimulatorResponse {
  let newGravity = 800;

  const gravityMatch = lowerPrompt.match(/(\d+)/);
  if (gravityMatch) {
    newGravity = parseFloat(gravityMatch[1]);
  } else if (lowerPrompt.includes('zero') || lowerPrompt.includes('no ') || lowerPrompt.includes('disable')) {
    newGravity = 0;
  } else if (lowerPrompt.includes('moon') || lowerPrompt.includes('low')) {
    newGravity = 200;
  } else if (lowerPrompt.includes('lower') || lowerPrompt.includes('less') || lowerPrompt.includes('reduce')) {
    newGravity = (gameSpec.settings?.physics?.gravity || 800) * 0.5;
  } else if (lowerPrompt.includes('higher') || lowerPrompt.includes('more') || lowerPrompt.includes('increase')) {
    newGravity = (gameSpec.settings?.physics?.gravity || 800) * 1.5;
  }

  const label = newGravity === 0 ? 'zero (space mode!)' : newGravity < 300 ? `${newGravity} (moon-like)` : `${newGravity}`;

  return {
    message: `I'll set gravity to **${label}**.`,
    updatedSpec: {
      ...gameSpec,
      settings: { ...gameSpec.settings, physics: { ...gameSpec.settings?.physics, gravity: newGravity } },
    },
  };
}

function handleAddMovingPlatform(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('movingPlatform', existingNames);

  return {
    message: `I'll add a **moving platform** at (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'platform', width: 120, height: 20, tint: 0x44aaff },
          collider: { type: 'box' as const, width: 120, height: 20 },
          velocity: { vx: 50, vy: 0 },
          aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100, patrolRange: 150 },
        },
        tags: ['platform', 'moving'],
      }],
    },
  };
}

function handleDuplicateEntity(gameSpec: GameSpec, entityName: string, xStr?: string, yStr?: string): AISimulatorResponse {
  const entity = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);
  if (!entity) {
    return { message: `I couldn't find an entity named "${entityName}" to duplicate.` };
  }

  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const baseName = entity.name.replace(/\d+$/, '');
  const name = getUniqueName(baseName, existingNames);

  const x = xStr ? parseInt(xStr) : (entity.components.transform?.x || 0) + 50;
  const y = yStr ? parseInt(yStr) : entity.components.transform?.y || 0;

  const newEntity = {
    ...JSON.parse(JSON.stringify(entity)),
    name,
    components: {
      ...JSON.parse(JSON.stringify(entity.components)),
      transform: { ...entity.components.transform, x, y },
    },
  };

  return {
    message: `I'll duplicate **${entity.name}** as **${name}** at (${x}, ${y}).`,
    updatedSpec: { ...gameSpec, entities: [...gameSpec.entities, newEntity] },
  };
}

function handleAddMultiple(gameSpec: GameSpec, count: number, entityType: string): AISimulatorResponse {
  const limitedCount = Math.min(count, 10);
  const baseType = entityType.replace(/s$/, '').replace(/\s+/g, '');
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const newEntities: any[] = [];

  for (let i = 0; i < limitedCount; i++) {
    const name = getUniqueName(baseType, existingNames);
    existingNames.add(name);
    const x = Math.round(100 + Math.random() * 600);
    const y = Math.round(100 + Math.random() * 400);

    let entity;
    if (baseType === 'coin') {
      entity = { name, components: { transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 }, sprite: { texture: 'coin', width: 24, height: 24, tint: 0xffd700 }, collider: { type: 'circle' as const, radius: 12 } }, tags: ['collectible', 'coin'] };
    } else if (baseType === 'enemy' || baseType === 'enem') {
      entity = { name, components: { transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 }, sprite: { texture: 'enemy', width: 32, height: 32, tint: 0xff4444 }, velocity: { vx: 0, vy: 0 }, collider: { type: 'box' as const, width: 32, height: 32 }, aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100 }, health: { current: 3, max: 3 } }, tags: ['enemy'] };
    } else if (baseType === 'platform') {
      entity = { name, components: { transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 }, sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 }, collider: { type: 'box' as const, width: 100, height: 20 } }, tags: ['platform'] };
    } else {
      entity = { name, components: { transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 }, sprite: { texture: 'health', width: 24, height: 24, tint: 0xff4488 }, collider: { type: 'box' as const, width: 24, height: 24 } }, tags: ['collectible', 'health', 'pickup'] };
    }
    if (entity) newEntities.push(entity);
  }

  return {
    message: `I'll add **${limitedCount} ${baseType}${limitedCount > 1 ? 's' : ''}** at random positions.`,
    updatedSpec: { ...gameSpec, entities: [...gameSpec.entities, ...newEntities] },
  };
}

function handleListEntities(gameSpec: GameSpec): AISimulatorResponse {
  const entityList = gameSpec.entities.map(e => {
    const pos = e.components.transform ? `(${e.components.transform.x}, ${e.components.transform.y})` : '(no position)';
    const tags = e.tags?.join(', ') || 'no tags';
    return `- **${e.name}** at ${pos} [${tags}]`;
  }).join('\n');

  return { message: `**Current Entities (${gameSpec.entities.length}):**\n\n${entityList || 'No entities in the game.'}` };
}

function handleAddSpawnPoint(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('spawn', existingNames);

  return {
    message: `I'll add a **spawn point** at (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'spawn', width: 32, height: 32, tint: 0x44ff44 },
        },
        tags: ['spawn', 'checkpoint'],
      }],
    },
  };
}

function handleAddCheckpoint(gameSpec: GameSpec, x: number, y: number): AISimulatorResponse {
  const existingNames = new Set(gameSpec.entities.map(e => e.name));
  const name = getUniqueName('checkpoint', existingNames);

  return {
    message: `I'll add a **checkpoint flag** at (${x}, ${y}).`,
    updatedSpec: {
      ...gameSpec,
      entities: [...gameSpec.entities, {
        name,
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'checkpoint', width: 20, height: 48, tint: 0xffff00 },
          collider: { type: 'box' as const, width: 20, height: 48 },
        },
        tags: ['checkpoint', 'flag'],
      }],
    },
  };
}

function handleAddComponent(gameSpec: GameSpec, componentType: string, entityName: string): AISimulatorResponse {
  const entity = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);
  if (!entity) {
    return { message: `I couldn't find an entity named "${entityName}".` };
  }

  const componentDefaults: Record<string, object> = {
    health: { current: 100, max: 100 },
    velocity: { vx: 0, vy: 0 },
    collider: { type: 'box', width: 32, height: 32 },
    input: { moveSpeed: 200, jumpForce: -400 },
    aibehavior: { type: 'patrol', speed: 50, detectionRadius: 100 },
    physics: { mass: 1, friction: 0.1, restitution: 0.2 },
  };

  return {
    message: `I'll add a **${componentType}** component to **${entity.name}**.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e =>
        e.name.toLowerCase() === entityName
          ? { ...e, components: { ...e.components, [componentType]: componentDefaults[componentType] || {} } }
          : e
      ),
    },
  };
}

function handleCreateSystem(gameSpec: GameSpec, systemName: string): AISimulatorResponse {
  const existingSystems = gameSpec.systems || [];
  if (existingSystems.some(s => s.toLowerCase() === systemName.toLowerCase())) {
    return { message: `A system named "${systemName}" already exists.` };
  }

  const systemTemplates: Record<string, { name: string; description: string }> = {
    movement: { name: 'MovementSystem', description: 'Handles entity movement based on velocity' },
    collision: { name: 'CollisionSystem', description: 'Detects and resolves collisions' },
    render: { name: 'RenderSystem', description: 'Renders sprites to canvas' },
    input: { name: 'InputSystem', description: 'Handles player input' },
    physics: { name: 'PhysicsSystem', description: 'Applies physics simulation' },
    ai: { name: 'AISystem', description: 'Runs AI behaviors for entities' },
    animation: { name: 'AnimationSystem', description: 'Updates sprite animations' },
    score: { name: 'ScoreSystem', description: 'Tracks and updates score' },
    health: { name: 'HealthSystem', description: 'Manages entity health' },
  };

  const template = systemTemplates[systemName] || {
    name: `${systemName.charAt(0).toUpperCase() + systemName.slice(1)}System`,
    description: `Custom ${systemName} system`,
  };

  return {
    message: `I'll create a new **${template.name}** system.\n\n*${template.description}*`,
    updatedSpec: { ...gameSpec, systems: [...existingSystems, template.name] },
  };
}

function handleAnalyze(gameSpec: GameSpec): AISimulatorResponse {
  const issues: string[] = [];
  const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));

  if (!playerEntity) {
    issues.push('No entity tagged as "player" found');
  } else {
    if (!playerEntity.components.input) issues.push('Player has no input component');
    if (!playerEntity.components.transform) issues.push('Player has no transform component');
    if (!playerEntity.components.collider) issues.push('Player has no collider');
  }

  const platforms = gameSpec.entities.filter(e => e.tags?.includes('platform'));
  if (platforms.length === 0) issues.push('No platforms found - player may fall forever');

  if (issues.length === 0) {
    return {
      message: `**Game Analysis Complete**\n\nNo obvious issues found! Your game has:\n- ${gameSpec.entities.length} entities\n- Player with controls: ${playerEntity ? 'Yes' : 'No'}\n- Platforms: ${platforms.length}`,
    };
  }

  return { message: `**Game Analysis**\n\nFound ${issues.length} potential issue${issues.length > 1 ? 's' : ''}:\n\n${issues.map(i => `- ${i}`).join('\n')}` };
}

function handleFixPlayer(gameSpec: GameSpec): AISimulatorResponse {
  const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));

  if (!playerEntity) {
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    const name = existingNames.has('player') ? getUniqueName('player', existingNames) : 'player';

    return {
      message: `I'll create a new **player** entity with all required components.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, {
          name,
          components: {
            transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'player', width: 32, height: 48, tint: 0x4488ff },
            velocity: { vx: 0, vy: 0 },
            collider: { type: 'box' as const, width: 32, height: 48 },
            input: { moveSpeed: 200, jumpForce: -400 },
          },
          tags: ['player'],
        }],
      },
    };
  }

  const fixes: string[] = [];
  const updatedPlayer = { ...playerEntity, components: { ...playerEntity.components } };

  if (!updatedPlayer.components.transform) {
    updatedPlayer.components.transform = { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 };
    fixes.push('transform');
  }
  if (!updatedPlayer.components.input) {
    updatedPlayer.components.input = { moveSpeed: 200, jumpForce: -400 };
    fixes.push('input');
  }
  if (!updatedPlayer.components.velocity) {
    updatedPlayer.components.velocity = { vx: 0, vy: 0 };
    fixes.push('velocity');
  }
  if (!updatedPlayer.components.collider) {
    updatedPlayer.components.collider = { type: 'box' as const, width: 32, height: 48 };
    fixes.push('collider');
  }

  if (fixes.length === 0) {
    return { message: `Player entity looks complete! No fixes needed.` };
  }

  return {
    message: `I'll add missing components to **${playerEntity.name}**: ${fixes.join(', ')}.`,
    updatedSpec: {
      ...gameSpec,
      entities: gameSpec.entities.map(e => e.name === playerEntity.name ? updatedPlayer : e),
    },
  };
}

function getHelpText(): string {
  return `# AI Assistant Commands

## Add Entities
- \`Add a coin at (200, 400)\`
- \`Add a platform at (300, 500)\`
- \`Add an enemy at (400, 300)\`
- \`Add moving platform\`
- \`Add 5 coins\` / \`Add 3 enemies\`
- \`Add 3 platforms in staircase\`

## Modify Player
- \`Make player faster\` / \`Make player slower\`
- \`Boost the jump\` / \`Jump higher\`
- \`Make player red/blue/green\`
- \`Make player bigger/smaller/huge/tiny\`

## Components & Systems
- \`Add health to enemy1\`
- \`Add velocity to coin1\`
- \`Create physics system\`

## Physics & Settings
- \`Moon gravity\` / \`Zero gravity\`
- \`Set gravity to 500\`

## Debug
- \`List entities\`
- \`Analyze game\`
- \`Fix player\`
- \`Clone player\` / \`Delete coin1\`

*Click the settings icon to add API key for full AI capabilities.*`;
}

function getDefaultResponse(prompt: string): string {
  return `I understand you want to: *"${prompt}"*

I'm running in **demo mode**. Try these commands:

- \`Add a coin/platform/enemy at (x, y)\`
- \`Make player faster/bigger/red\`
- \`Moon gravity\` / \`Zero gravity\`
- \`Analyze game\` / \`Fix player\`

Type \`help\` for full command list.`;
}
