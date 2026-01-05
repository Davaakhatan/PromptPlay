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
  execute: (_inputs, context) => ({ delta: context.deltaTime }),
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

// Motion Nodes - Easing Functions
const easeInQuadNode: NodeDefinition = {
  type: 'ease_in_quad',
  category: 'motion',
  title: 'Ease In Quad',
  description: 'Quadratic ease-in curve',
  icon: '⤵',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    return { result: t * t };
  },
};

const easeOutQuadNode: NodeDefinition = {
  type: 'ease_out_quad',
  category: 'motion',
  title: 'Ease Out Quad',
  description: 'Quadratic ease-out curve',
  icon: '⤴',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    return { result: t * (2 - t) };
  },
};

const easeInOutQuadNode: NodeDefinition = {
  type: 'ease_in_out_quad',
  category: 'motion',
  title: 'Ease In Out Quad',
  description: 'Quadratic ease-in-out curve',
  icon: '↔',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    return { result: t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t };
  },
};

const easeInCubicNode: NodeDefinition = {
  type: 'ease_in_cubic',
  category: 'motion',
  title: 'Ease In Cubic',
  description: 'Cubic ease-in curve',
  icon: '⤵',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    return { result: t * t * t };
  },
};

const easeOutCubicNode: NodeDefinition = {
  type: 'ease_out_cubic',
  category: 'motion',
  title: 'Ease Out Cubic',
  description: 'Cubic ease-out curve',
  icon: '⤴',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    const t1 = t - 1;
    return { result: t1 * t1 * t1 + 1 };
  },
};

const easeInOutCubicNode: NodeDefinition = {
  type: 'ease_in_out_cubic',
  category: 'motion',
  title: 'Ease In Out Cubic',
  description: 'Cubic ease-in-out curve',
  icon: '↔',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    return { result: t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1 };
  },
};

const easeOutElasticNode: NodeDefinition = {
  type: 'ease_out_elastic',
  category: 'motion',
  title: 'Ease Out Elastic',
  description: 'Elastic overshoot ease-out',
  icon: '🌀',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    const t = inputs.t as number;
    if (t === 0 || t === 1) return { result: t };
    const p = 0.3;
    return { result: Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1 };
  },
};

const easeOutBounceNode: NodeDefinition = {
  type: 'ease_out_bounce',
  category: 'motion',
  title: 'Ease Out Bounce',
  description: 'Bouncing ease-out',
  icon: '⚾',
  inputs: [
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'number' },
  ],
  execute: (inputs) => {
    let t = inputs.t as number;
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return { result: n1 * t * t };
    } else if (t < 2 / d1) {
      t -= 1.5 / d1;
      return { result: n1 * t * t + 0.75 };
    } else if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return { result: n1 * t * t + 0.9375 };
    } else {
      t -= 2.625 / d1;
      return { result: n1 * t * t + 0.984375 };
    }
  },
};

// Motion Nodes - Keyframe & Interpolation
const keyframeLerpNode: NodeDefinition = {
  type: 'keyframe_lerp',
  category: 'motion',
  title: 'Keyframe Lerp',
  description: 'Interpolate between keyframe values with easing',
  icon: '📊',
  inputs: [
    { id: 'from', name: 'From', type: 'number', defaultValue: 0 },
    { id: 'to', name: 'To', type: 'number', defaultValue: 100 },
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0 },
    { id: 'eased_t', name: 'Eased T', type: 'number' },
  ],
  outputs: [
    { id: 'value', name: 'Value', type: 'number' },
  ],
  execute: (inputs) => {
    const from = inputs.from as number;
    const to = inputs.to as number;
    const t = (inputs.eased_t !== undefined ? inputs.eased_t : inputs.t) as number;
    return { value: from + (to - from) * t };
  },
};

const timerNode: NodeDefinition = {
  type: 'timer',
  category: 'motion',
  title: 'Timer',
  description: 'Track elapsed time with duration',
  icon: '⏱',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'duration', name: 'Duration', type: 'number', defaultValue: 1 },
    { id: 'loop', name: 'Loop', type: 'boolean', defaultValue: false },
  ],
  outputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 't', name: 'T (0-1)', type: 'number' },
    { id: 'elapsed', name: 'Elapsed', type: 'number' },
    { id: 'complete', name: 'On Complete', type: 'flow' },
  ],
  execute: (inputs, context) => {
    const duration = inputs.duration as number || 1;
    const loop = inputs.loop as boolean;
    context.emit('start_timer', { duration, loop });
    return { t: 0, elapsed: 0 };
  },
};

const delayNode: NodeDefinition = {
  type: 'delay',
  category: 'motion',
  title: 'Delay',
  description: 'Delay execution by specified time',
  icon: '⏳',
  inputs: [
    { id: 'flow', name: 'Flow', type: 'flow' },
    { id: 'seconds', name: 'Seconds', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'flow', name: 'Then', type: 'flow' },
  ],
  execute: (inputs, context) => {
    context.emit('delay', { seconds: inputs.seconds });
    return {};
  },
};

// Motion Nodes - Path Following
const makeVector2Node: NodeDefinition = {
  type: 'make_vector2',
  category: 'motion',
  title: 'Make Vector2',
  description: 'Create a 2D vector from X and Y',
  icon: '📍',
  inputs: [
    { id: 'x', name: 'X', type: 'number', defaultValue: 0 },
    { id: 'y', name: 'Y', type: 'number', defaultValue: 0 },
  ],
  outputs: [
    { id: 'vector', name: 'Vector', type: 'vector2' },
  ],
  execute: (inputs) => ({ vector: { x: inputs.x, y: inputs.y } }),
};

const breakVector2Node: NodeDefinition = {
  type: 'break_vector2',
  category: 'motion',
  title: 'Break Vector2',
  description: 'Get X and Y from a 2D vector',
  icon: '📍',
  inputs: [
    { id: 'vector', name: 'Vector', type: 'vector2' },
  ],
  outputs: [
    { id: 'x', name: 'X', type: 'number' },
    { id: 'y', name: 'Y', type: 'number' },
  ],
  execute: (inputs) => {
    const vec = inputs.vector as { x: number; y: number } | null;
    return { x: vec?.x ?? 0, y: vec?.y ?? 0 };
  },
};

const lerpVector2Node: NodeDefinition = {
  type: 'lerp_vector2',
  category: 'motion',
  title: 'Lerp Vector2',
  description: 'Interpolate between two vectors',
  icon: '↗',
  inputs: [
    { id: 'a', name: 'A', type: 'vector2' },
    { id: 'b', name: 'B', type: 'vector2' },
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'vector2' },
  ],
  execute: (inputs) => {
    const a = inputs.a as { x: number; y: number } || { x: 0, y: 0 };
    const b = inputs.b as { x: number; y: number } || { x: 0, y: 0 };
    const t = inputs.t as number;
    return {
      result: {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }
    };
  },
};

const bezierCurveNode: NodeDefinition = {
  type: 'bezier_curve',
  category: 'motion',
  title: 'Bezier Curve',
  description: 'Quadratic bezier curve interpolation',
  icon: '〰',
  inputs: [
    { id: 'start', name: 'Start', type: 'vector2' },
    { id: 'control', name: 'Control', type: 'vector2' },
    { id: 'end', name: 'End', type: 'vector2' },
    { id: 't', name: 'T (0-1)', type: 'number', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'point', name: 'Point', type: 'vector2' },
  ],
  execute: (inputs) => {
    const start = inputs.start as { x: number; y: number } || { x: 0, y: 0 };
    const control = inputs.control as { x: number; y: number } || { x: 0, y: 0 };
    const end = inputs.end as { x: number; y: number } || { x: 0, y: 0 };
    const t = inputs.t as number;
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    return {
      point: {
        x: mt2 * start.x + 2 * mt * t * control.x + t2 * end.x,
        y: mt2 * start.y + 2 * mt * t * control.y + t2 * end.y,
      }
    };
  },
};

// Motion Nodes - Physics-based Motion
const springNode: NodeDefinition = {
  type: 'spring',
  category: 'motion',
  title: 'Spring',
  description: 'Spring physics - move towards target with bounce',
  icon: '🔄',
  inputs: [
    { id: 'current', name: 'Current', type: 'number' },
    { id: 'target', name: 'Target', type: 'number' },
    { id: 'velocity', name: 'Velocity', type: 'number', defaultValue: 0 },
    { id: 'stiffness', name: 'Stiffness', type: 'number', defaultValue: 100 },
    { id: 'damping', name: 'Damping', type: 'number', defaultValue: 10 },
    { id: 'mass', name: 'Mass', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'value', name: 'Value', type: 'number' },
    { id: 'new_velocity', name: 'New Velocity', type: 'number' },
  ],
  execute: (inputs, context) => {
    const current = inputs.current as number;
    const target = inputs.target as number;
    const velocity = inputs.velocity as number;
    const stiffness = inputs.stiffness as number;
    const damping = inputs.damping as number;
    const mass = inputs.mass as number || 1;
    const dt = context.deltaTime || 1/60;

    const displacement = current - target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    const newVelocity = velocity + acceleration * dt;
    const newValue = current + newVelocity * dt;

    return { value: newValue, new_velocity: newVelocity };
  },
};

const smoothDampNode: NodeDefinition = {
  type: 'smooth_damp',
  category: 'motion',
  title: 'Smooth Damp',
  description: 'Smoothly interpolate to target (like Unity SmoothDamp)',
  icon: '〜',
  inputs: [
    { id: 'current', name: 'Current', type: 'number' },
    { id: 'target', name: 'Target', type: 'number' },
    { id: 'velocity', name: 'Velocity', type: 'number', defaultValue: 0 },
    { id: 'smooth_time', name: 'Smooth Time', type: 'number', defaultValue: 0.3 },
    { id: 'max_speed', name: 'Max Speed', type: 'number', defaultValue: 1000 },
  ],
  outputs: [
    { id: 'value', name: 'Value', type: 'number' },
    { id: 'new_velocity', name: 'New Velocity', type: 'number' },
  ],
  execute: (inputs, context) => {
    const current = inputs.current as number;
    const target = inputs.target as number;
    let velocity = inputs.velocity as number;
    const smoothTime = Math.max(0.0001, inputs.smooth_time as number);
    const maxSpeed = inputs.max_speed as number;
    const dt = context.deltaTime || 1/60;

    const omega = 2 / smoothTime;
    const x = omega * dt;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    let change = current - target;
    const maxChange = maxSpeed * smoothTime;
    change = Math.max(-maxChange, Math.min(maxChange, change));

    const temp = (velocity + omega * change) * dt;
    velocity = (velocity - omega * temp) * exp;
    let value = target + (change + temp) * exp;

    if ((target - current > 0) === (value > target)) {
      value = target;
      velocity = (value - target) / dt;
    }

    return { value, new_velocity: velocity };
  },
};

const moveTowardsNode: NodeDefinition = {
  type: 'move_towards',
  category: 'motion',
  title: 'Move Towards',
  description: 'Move value towards target by max delta',
  icon: '→',
  inputs: [
    { id: 'current', name: 'Current', type: 'number' },
    { id: 'target', name: 'Target', type: 'number' },
    { id: 'max_delta', name: 'Max Delta', type: 'number', defaultValue: 1 },
  ],
  outputs: [
    { id: 'value', name: 'Value', type: 'number' },
  ],
  execute: (inputs) => {
    const current = inputs.current as number;
    const target = inputs.target as number;
    const maxDelta = inputs.max_delta as number;

    if (Math.abs(target - current) <= maxDelta) {
      return { value: target };
    }
    return { value: current + Math.sign(target - current) * maxDelta };
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
  // Motion - Easing
  ease_in_quad: easeInQuadNode,
  ease_out_quad: easeOutQuadNode,
  ease_in_out_quad: easeInOutQuadNode,
  ease_in_cubic: easeInCubicNode,
  ease_out_cubic: easeOutCubicNode,
  ease_in_out_cubic: easeInOutCubicNode,
  ease_out_elastic: easeOutElasticNode,
  ease_out_bounce: easeOutBounceNode,
  // Motion - Keyframe & Timing
  keyframe_lerp: keyframeLerpNode,
  timer: timerNode,
  delay: delayNode,
  // Motion - Vectors & Paths
  make_vector2: makeVector2Node,
  break_vector2: breakVector2Node,
  lerp_vector2: lerpVector2Node,
  bezier_curve: bezierCurveNode,
  // Motion - Physics
  spring: springNode,
  smooth_damp: smoothDampNode,
  move_towards: moveTowardsNode,
  // Audio
  play_sound: playSoundNode,
};

// Get nodes by category (includes custom nodes)
export function getNodesByCategory(category: NodeDefinition['category']): NodeDefinition[] {
  const builtIn = Object.values(NODE_LIBRARY).filter(node => node.category === category);

  // Import custom nodes dynamically to avoid circular dependency
  if (category === 'custom') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CustomNodeRegistry } = require('./CustomNodeRegistry');
      return [...builtIn, ...CustomNodeRegistry.getAll()];
    } catch {
      return builtIn;
    }
  }

  return builtIn;
}

// Get all categories
export function getCategories(): NodeDefinition['category'][] {
  return ['events', 'logic', 'math', 'entities', 'physics', 'input', 'animation', 'motion', 'audio', 'custom'];
}

// Get a node definition by type (checks both built-in and custom)
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  if (NODE_LIBRARY[type]) {
    return NODE_LIBRARY[type];
  }

  // Check custom nodes
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CustomNodeRegistry } = require('./CustomNodeRegistry');
    return CustomNodeRegistry.get(type);
  } catch {
    return undefined;
  }
}

// Get all node definitions (built-in + custom)
export function getAllNodes(): NodeDefinition[] {
  const builtIn = Object.values(NODE_LIBRARY);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CustomNodeRegistry } = require('./CustomNodeRegistry');
    return [...builtIn, ...CustomNodeRegistry.getAll()];
  } catch {
    return builtIn;
  }
}
