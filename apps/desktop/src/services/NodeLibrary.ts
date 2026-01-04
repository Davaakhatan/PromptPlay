// Built-in Node Library for Visual Scripting

import type { NodeDefinition } from '../types/NodeEditor';

// Event Nodes
const onStartNode: NodeDefinition = {
  type: 'on_start',
  category: 'events',
  title: 'On Start',
  description: 'Triggered when the game starts',
  icon: '▶',
  inputs: [],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: () => ({}),
};

const onUpdateNode: NodeDefinition = {
  type: 'on_update',
  category: 'events',
  title: 'On Update',
  description: 'Triggered every frame',
  icon: '🔄',
  inputs: [],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'delta', name: 'Delta Time', type: 'number' },
  ],
  execute: (inputs, context) => ({ delta: context.deltaTime }),
};

const onCollisionNode: NodeDefinition = {
  type: 'on_collision',
  category: 'events',
  title: 'On Collision',
  description: 'Triggered when entities collide',
  icon: '💥',
  inputs: [
    { id: 'entity', name: 'Entity', type: 'entity' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'other', name: 'Other Entity', type: 'entity' },
  ],
  execute: (inputs) => ({ other: inputs.eventData }),
};

const onKeyPressNode: NodeDefinition = {
  type: 'on_key_press',
  category: 'events',
  title: 'On Key Press',
  description: 'Triggered when a key is pressed',
  icon: '⌨',
  inputs: [
    { id: 'key', name: 'Key', type: 'string', defaultValue: 'Space' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: () => ({}),
};

// Logic Nodes
const branchNode: NodeDefinition = {
  type: 'branch',
  category: 'logic',
  title: 'Branch',
  description: 'Conditional branching (if/else)',
  icon: '⑂',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'condition', name: 'Condition', type: 'boolean' },
  ],
  outputs: [
    { id: 'true', name: 'True', type: 'flow' },
    { id: 'false', name: 'False', type: 'flow' },
  ],
  execute: (inputs) => ({ condition: Boolean(inputs.condition) }),
};

const compareNode: NodeDefinition = {
  type: 'compare',
  category: 'logic',
  title: 'Compare',
  description: 'Compare two values',
  icon: '⋈',
  inputs: [
    { id: 'a', name: 'A', type: 'number' },
    { id: 'b', name: 'B', type: 'number' },
  ],
  outputs: [
    { id: 'equal', name: 'A = B', type: 'boolean' },
    { id: 'greater', name: 'A > B', type: 'boolean' },
    { id: 'less', name: 'A < B', type: 'boolean' },
  ],
  execute: (inputs) => ({
    equal: inputs.a === inputs.b,
    greater: (inputs.a as number) > (inputs.b as number),
    less: (inputs.a as number) < (inputs.b as number),
  }),
};

const andNode: NodeDefinition = {
  type: 'and',
  category: 'logic',
  title: 'AND',
  description: 'Logical AND operation',
  icon: '∧',
  inputs: [
    { id: 'a', name: 'A', type: 'boolean' },
    { id: 'b', name: 'B', type: 'boolean' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'boolean' },
  ],
  execute: (inputs) => ({ result: Boolean(inputs.a) && Boolean(inputs.b) }),
};

const orNode: NodeDefinition = {
  type: 'or',
  category: 'logic',
  title: 'OR',
  description: 'Logical OR operation',
  icon: '∨',
  inputs: [
    { id: 'a', name: 'A', type: 'boolean' },
    { id: 'b', name: 'B', type: 'boolean' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'boolean' },
  ],
  execute: (inputs) => ({ result: Boolean(inputs.a) || Boolean(inputs.b) }),
};

const notNode: NodeDefinition = {
  type: 'not',
  category: 'logic',
  title: 'NOT',
  description: 'Logical NOT operation',
  icon: '¬',
  inputs: [
    { id: 'value', name: 'Value', type: 'boolean' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'boolean' },
  ],
  execute: (inputs) => ({ result: !Boolean(inputs.value) }),
};

// Math Nodes
const addNode: NodeDefinition = {
  type: 'add',
  category: 'math',
  title: 'Add',
  description: 'Add two numbers',
  icon: '+',
  inputs: [
    { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
    { id: 'b', name: 'B', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({ result: (inputs.a as number) + (inputs.b as number) }),
};

const subtractNode: NodeDefinition = {
  type: 'subtract',
  category: 'math',
  title: 'Subtract',
  description: 'Subtract two numbers',
  icon: '−',
  inputs: [
    { id: 'a', name: 'A', type: 'number', defaultValue: 0 },
    { id: 'b', name: 'B', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({ result: (inputs.a as number) - (inputs.b as number) }),
};

const multiplyNode: NodeDefinition = {
  type: 'multiply',
  category: 'math',
  title: 'Multiply',
  description: 'Multiply two numbers',
  icon: '×',
  inputs: [
    { id: 'a', name: 'A', type: 'number', defaultValue: 1 },
    { id: 'b', name: 'B', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({ result: (inputs.a as number) * (inputs.b as number) }),
};

const divideNode: NodeDefinition = {
  type: 'divide',
  category: 'math',
  title: 'Divide',
  description: 'Divide two numbers',
  icon: '÷',
  inputs: [
    { id: 'a', name: 'A', type: 'number', defaultValue: 1 },
    { id: 'b', name: 'B', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({ result: (inputs.b as number) !== 0 ? (inputs.a as number) / (inputs.b as number) : 0 }),
};

const clampNode: NodeDefinition = {
  type: 'clamp',
  category: 'math',
  title: 'Clamp',
  description: 'Clamp a value between min and max',
  icon: '⊏',
  inputs: [
    { id: 'value', name: 'Value', type: 'number' },
    { id: 'min', name: 'Min', type: 'number', defaultValue: 0 },
    { id: 'max', name: 'Max', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({
    result: Math.max(inputs.min as number, Math.min(inputs.max as number, inputs.value as number))
  }),
};

const lerpNode: NodeDefinition = {
  type: 'lerp',
  category: 'math',
  title: 'Lerp',
  description: 'Linear interpolation between two values',
  icon: '↔',
  inputs: [
    { id: 'a', name: 'A', type: 'number' },
    { id: 'b', name: 'B', type: 'number' },
    { id: 't', name: 'T', type: 'number', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({
    result: (inputs.a as number) + ((inputs.b as number) - (inputs.a as number)) * (inputs.t as number)
  }),
};

const randomNode: NodeDefinition = {
  type: 'random',
  category: 'math',
  title: 'Random',
  description: 'Generate a random number',
  icon: '🎲',
  inputs: [
    { id: 'min', name: 'Min', type: 'number', defaultValue: 0 },
    { id: 'max', name: 'Max', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => ({
    result: (inputs.min as number) + Math.random() * ((inputs.max as number) - (inputs.min as number))
  }),
};

// Entity Nodes
const getEntityNode: NodeDefinition = {
  type: 'get_entity',
  category: 'entities',
  title: 'Get Entity',
  description: 'Get an entity by name',
  icon: '📦',
  inputs: [
    { id: 'name', name: 'Name', type: 'string' },
  ],
  outputs: [
    { id: 'entity', name: 'Entity', type: 'entity' },
  ],
  execute: (inputs, context) => ({ entity: context.getEntity(inputs.name as string) }),
};

const getPositionNode: NodeDefinition = {
  type: 'get_position',
  category: 'entities',
  title: 'Get Position',
  description: 'Get entity position',
  icon: '📍',
  inputs: [
    { id: 'entity', name: 'Entity', type: 'entity' },
  ],
  outputs: [
    { id: 'x', name: 'X', type: 'number' },
    { id: 'y', name: 'Y', type: 'number' },
  ],
  execute: (inputs) => {
    const entity = inputs.entity as { transform?: { x: number; y: number } } | null;
    return { x: entity?.transform?.x ?? 0, y: entity?.transform?.y ?? 0 };
  },
};

const setPositionNode: NodeDefinition = {
  type: 'set_position',
  category: 'entities',
  title: 'Set Position',
  description: 'Set entity position',
  icon: '📍',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
    { id: 'x', name: 'X', type: 'number' },
    { id: 'y', name: 'Y', type: 'number' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string; transform?: { x: number; y: number } } | null;
    if (entity?.transform) {
      entity.transform.x = inputs.x as number;
      entity.transform.y = inputs.y as number;
      context.updateEntity(entity.name, entity);
    }
    return {};
  },
};

const getVelocityNode: NodeDefinition = {
  type: 'get_velocity',
  category: 'entities',
  title: 'Get Velocity',
  description: 'Get entity velocity',
  icon: '➡',
  inputs: [
    { id: 'entity', name: 'Entity', type: 'entity' },
  ],
  outputs: [
    { id: 'vx', name: 'VX', type: 'number' },
    { id: 'vy', name: 'VY', type: 'number' },
  ],
  execute: (inputs) => {
    const entity = inputs.entity as { physics?: { velocityX: number; velocityY: number } } | null;
    return { vx: entity?.physics?.velocityX ?? 0, vy: entity?.physics?.velocityY ?? 0 };
  },
};

const setVelocityNode: NodeDefinition = {
  type: 'set_velocity',
  category: 'entities',
  title: 'Set Velocity',
  description: 'Set entity velocity',
  icon: '➡',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
    { id: 'vx', name: 'VX', type: 'number' },
    { id: 'vy', name: 'VY', type: 'number' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string; physics?: { velocityX: number; velocityY: number } } | null;
    if (entity?.physics) {
      entity.physics.velocityX = inputs.vx as number;
      entity.physics.velocityY = inputs.vy as number;
      context.updateEntity(entity.name, entity);
    }
    return {};
  },
};

const destroyEntityNode: NodeDefinition = {
  type: 'destroy_entity',
  category: 'entities',
  title: 'Destroy Entity',
  description: 'Remove an entity from the game',
  icon: '💀',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string } | null;
    if (entity) {
      context.emit('destroy_entity', entity.name);
    }
    return {};
  },
};

// Physics Nodes
const applyForceNode: NodeDefinition = {
  type: 'apply_force',
  category: 'physics',
  title: 'Apply Force',
  description: 'Apply a force to an entity',
  icon: '💨',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
    { id: 'x', name: 'Force X', type: 'number' },
    { id: 'y', name: 'Force Y', type: 'number' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string } | null;
    if (entity) {
      context.emit('apply_force', { entity: entity.name, x: inputs.x, y: inputs.y });
    }
    return {};
  },
};

const applyImpulseNode: NodeDefinition = {
  type: 'apply_impulse',
  category: 'physics',
  title: 'Apply Impulse',
  description: 'Apply an instant impulse to an entity',
  icon: '⚡',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
    { id: 'x', name: 'Impulse X', type: 'number' },
    { id: 'y', name: 'Impulse Y', type: 'number' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string } | null;
    if (entity) {
      context.emit('apply_impulse', { entity: entity.name, x: inputs.x, y: inputs.y });
    }
    return {};
  },
};

// Input Nodes
const getKeyNode: NodeDefinition = {
  type: 'get_key',
  category: 'input',
  title: 'Get Key',
  description: 'Check if a key is pressed',
  icon: '⌨',
  inputs: [
    { id: 'key', name: 'Key', type: 'string', defaultValue: 'Space' },
  ],
  outputs: [
    { id: 'pressed', name: 'Pressed', type: 'boolean' },
  ],
  execute: () => {
    // Input state would be passed via context in real implementation
    return { pressed: false };
  },
};

const getMousePositionNode: NodeDefinition = {
  type: 'get_mouse_position',
  category: 'input',
  title: 'Get Mouse Position',
  description: 'Get current mouse position',
  icon: '🖱',
  inputs: [],
  outputs: [
    { id: 'x', name: 'X', type: 'number' },
    { id: 'y', name: 'Y', type: 'number' },
  ],
  execute: () => {
    // Mouse state would be passed via context in real implementation
    return { x: 0, y: 0 };
  },
};

const getAxisNode: NodeDefinition = {
  type: 'get_axis',
  category: 'input',
  title: 'Get Axis',
  description: 'Get input axis value (-1 to 1)',
  icon: '🕹',
  inputs: [
    { id: 'axis', name: 'Axis', type: 'string', defaultValue: 'Horizontal' },
  ],
  outputs: [
    { id: 'value', name: 'Value', type: 'number' },
  ],
  execute: () => {
    // Axis state would be passed via context in real implementation
    return { value: 0 };
  },
};

// Animation Nodes
const playAnimationNode: NodeDefinition = {
  type: 'play_animation',
  category: 'animation',
  title: 'Play Animation',
  description: 'Play an animation on an entity',
  icon: '🎬',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'entity', name: 'Entity', type: 'entity' },
    { id: 'animation', name: 'Animation', type: 'string' },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const entity = inputs.entity as { name: string } | null;
    if (entity) {
      context.emit('play_animation', { entity: entity.name, animation: inputs.animation });
    }
    return {};
  },
};

const tweenNode: NodeDefinition = {
  type: 'tween',
  category: 'animation',
  title: 'Tween',
  description: 'Animate a value over time',
  icon: '〰',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'from', name: 'From', type: 'number' },
    { id: 'to', name: 'To', type: 'number' },
    { id: 'duration', name: 'Duration', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'value', name: 'Value', type: 'number' },
    { id: 'complete', name: 'On Complete', type: 'flow' },
  ],
  execute: (inputs, context) => {
    context.emit('start_tween', { from: inputs.from, to: inputs.to, duration: inputs.duration });
    return { value: inputs.from };
  },
};

// Audio Nodes
const playSoundNode: NodeDefinition = {
  type: 'play_sound',
  category: 'audio',
  title: 'Play Sound',
  description: 'Play a sound effect',
  icon: '🔊',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'sound', name: 'Sound', type: 'string' },
    { id: 'volume', name: 'Volume', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
  ],
  execute: (inputs, context) => {
    context.emit('play_sound', { sound: inputs.sound, volume: inputs.volume });
    return {};
  },
};

// All nodes registry
export const NODE_LIBRARY: Record<string, NodeDefinition> = {
  // Events
  on_start: onStartNode,
  on_update: onUpdateNode,
  on_collision: onCollisionNode,
  on_key_press: onKeyPressNode,
  // Logic
  branch: branchNode,
  compare: compareNode,
  and: andNode,
  or: orNode,
  not: notNode,
  // Math
  add: addNode,
  subtract: subtractNode,
  multiply: multiplyNode,
  divide: divideNode,
  clamp: clampNode,
  lerp: lerpNode,
  random: randomNode,
  // Entities
  get_entity: getEntityNode,
  get_position: getPositionNode,
  set_position: setPositionNode,
  get_velocity: getVelocityNode,
  set_velocity: setVelocityNode,
  destroy_entity: destroyEntityNode,
  // Physics
  apply_force: applyForceNode,
  apply_impulse: applyImpulseNode,
  // Input
  get_key: getKeyNode,
  get_mouse_position: getMousePositionNode,
  get_axis: getAxisNode,
  // Animation
  play_animation: playAnimationNode,
  tween: tweenNode,
  // Audio
  play_sound: playSoundNode,
};

// Get nodes by category
export function getNodesByCategory(category: NodeDefinition['category']): NodeDefinition[] {
  return Object.values(NODE_LIBRARY).filter(node => node.category === category);
}

// Get all categories
export function getCategories(): NodeDefinition['category'][] {
  return ['events', 'logic', 'math', 'entities', 'physics', 'input', 'animation', 'audio', 'custom'];
}
