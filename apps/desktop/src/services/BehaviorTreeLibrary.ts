// Behavior Tree Library - Node definitions for AI decision making

import type {
  BehaviorNodeDefinition,
  BehaviorNodeType,
  BehaviorNodeCategory,
  BehaviorStatus,
  BehaviorContext,
  BehaviorNodeState,
  BehaviorNodeInstance,
  BehaviorConnection,
} from '../types/BehaviorTree';

/**
 * All behavior tree node definitions
 */
export const BEHAVIOR_NODE_DEFINITIONS: BehaviorNodeDefinition[] = [
  // === COMPOSITE NODES ===
  {
    type: 'bt_sequence',
    category: 'composite',
    title: 'Sequence',
    description: 'Runs children in order. Fails if any child fails, succeeds if all succeed.',
    icon: '→',
    color: '#3b82f6',
    inputs: [],
    outputs: [],
    maxChildren: -1,
    minChildren: 1,
  },
  {
    type: 'bt_selector',
    category: 'composite',
    title: 'Selector',
    description: 'Runs children in order until one succeeds. Fails only if all fail.',
    icon: '?',
    color: '#3b82f6',
    inputs: [],
    outputs: [],
    maxChildren: -1,
    minChildren: 1,
  },
  {
    type: 'bt_parallel',
    category: 'composite',
    title: 'Parallel',
    description: 'Runs all children simultaneously. Configurable success/failure policy.',
    icon: '∥',
    color: '#3b82f6',
    inputs: [
      { id: 'successPolicy', name: 'Success Policy', type: 'string', defaultValue: 'all' },
      { id: 'failurePolicy', name: 'Failure Policy', type: 'string', defaultValue: 'one' },
    ],
    outputs: [],
    maxChildren: -1,
    minChildren: 1,
  },
  {
    type: 'bt_random_selector',
    category: 'composite',
    title: 'Random Selector',
    description: 'Randomly selects one child to run.',
    icon: 'R?',
    color: '#3b82f6',
    inputs: [],
    outputs: [],
    maxChildren: -1,
    minChildren: 1,
  },
  {
    type: 'bt_random_sequence',
    category: 'composite',
    title: 'Random Sequence',
    description: 'Runs all children in random order.',
    icon: 'R>',
    color: '#3b82f6',
    inputs: [],
    outputs: [],
    maxChildren: -1,
    minChildren: 1,
  },

  // === DECORATOR NODES ===
  {
    type: 'bt_inverter',
    category: 'decorator',
    title: 'Inverter',
    description: 'Inverts the result of its child (success→failure, failure→success).',
    icon: '¬',
    color: '#8b5cf6',
    inputs: [],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_succeeder',
    category: 'decorator',
    title: 'Succeeder',
    description: 'Always returns success, regardless of child result.',
    icon: '✓',
    color: '#8b5cf6',
    inputs: [],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_failer',
    category: 'decorator',
    title: 'Failer',
    description: 'Always returns failure, regardless of child result.',
    icon: '✗',
    color: '#8b5cf6',
    inputs: [],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_repeater',
    category: 'decorator',
    title: 'Repeater',
    description: 'Repeats child execution N times.',
    icon: 'Rp',
    color: '#8b5cf6',
    inputs: [
      { id: 'count', name: 'Repeat Count', type: 'number', defaultValue: 3 },
    ],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_repeat_until_fail',
    category: 'decorator',
    title: 'Repeat Until Fail',
    description: 'Repeats child until it fails.',
    icon: '↻✗',
    color: '#8b5cf6',
    inputs: [
      { id: 'maxIterations', name: 'Max Iterations', type: 'number', defaultValue: 100 },
    ],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_repeat_until_success',
    category: 'decorator',
    title: 'Repeat Until Success',
    description: 'Repeats child until it succeeds.',
    icon: '↻✓',
    color: '#8b5cf6',
    inputs: [
      { id: 'maxIterations', name: 'Max Iterations', type: 'number', defaultValue: 100 },
    ],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_cooldown',
    category: 'decorator',
    title: 'Cooldown',
    description: 'Adds a cooldown period between executions.',
    icon: 'CD',
    color: '#8b5cf6',
    inputs: [
      { id: 'duration', name: 'Cooldown (s)', type: 'number', defaultValue: 1.0 },
    ],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },
  {
    type: 'bt_timeout',
    category: 'decorator',
    title: 'Timeout',
    description: 'Fails if child takes longer than specified time.',
    icon: '⌛',
    color: '#8b5cf6',
    inputs: [
      { id: 'timeout', name: 'Timeout (s)', type: 'number', defaultValue: 5.0 },
    ],
    outputs: [],
    maxChildren: 1,
    minChildren: 1,
  },

  // === ACTION NODES ===
  {
    type: 'bt_action',
    category: 'action',
    title: 'Action',
    description: 'Executes a custom action on the entity.',
    icon: 'Act',
    color: '#22c55e',
    inputs: [
      { id: 'actionType', name: 'Action Type', type: 'string', defaultValue: 'move' },
      { id: 'targetX', name: 'Target X', type: 'number', defaultValue: 0 },
      { id: 'targetY', name: 'Target Y', type: 'number', defaultValue: 0 },
      { id: 'speed', name: 'Speed', type: 'number', defaultValue: 100 },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },
  {
    type: 'bt_wait',
    category: 'action',
    title: 'Wait',
    description: 'Waits for a specified duration.',
    icon: 'W',
    color: '#22c55e',
    inputs: [
      { id: 'duration', name: 'Duration (s)', type: 'number', defaultValue: 1.0 },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },
  {
    type: 'bt_log',
    category: 'action',
    title: 'Log',
    description: 'Logs a message to the console.',
    icon: 'Log',
    color: '#22c55e',
    inputs: [
      { id: 'message', name: 'Message', type: 'string', defaultValue: 'Debug message' },
      { id: 'level', name: 'Level', type: 'string', defaultValue: 'info' },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },
  {
    type: 'bt_set_blackboard',
    category: 'action',
    title: 'Set Blackboard',
    description: 'Sets a value in the blackboard.',
    icon: 'Set',
    color: '#22c55e',
    inputs: [
      { id: 'key', name: 'Key', type: 'string', defaultValue: 'myVariable' },
      { id: 'value', name: 'Value', type: 'any', defaultValue: '' },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },

  // === CONDITION NODES ===
  {
    type: 'bt_condition',
    category: 'condition',
    title: 'Condition',
    description: 'Checks a condition and returns success or failure.',
    icon: 'If',
    color: '#f59e0b',
    inputs: [
      { id: 'conditionType', name: 'Condition', type: 'string', defaultValue: 'distance' },
      { id: 'targetEntity', name: 'Target Entity', type: 'string', defaultValue: 'Player' },
      { id: 'threshold', name: 'Threshold', type: 'number', defaultValue: 100 },
      { id: 'comparison', name: 'Comparison', type: 'string', defaultValue: 'less' },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },
  {
    type: 'bt_check_blackboard',
    category: 'condition',
    title: 'Check Blackboard',
    description: 'Checks if a blackboard value matches expected.',
    icon: 'Get',
    color: '#f59e0b',
    inputs: [
      { id: 'key', name: 'Key', type: 'string', defaultValue: 'myVariable' },
      { id: 'expectedValue', name: 'Expected Value', type: 'any', defaultValue: true },
      { id: 'comparison', name: 'Comparison', type: 'string', defaultValue: 'equals' },
    ],
    outputs: [],
    maxChildren: 0,
    minChildren: 0,
  },
];

/**
 * Node definitions indexed by type
 */
export const BEHAVIOR_NODE_LIBRARY: Record<BehaviorNodeType, BehaviorNodeDefinition> =
  BEHAVIOR_NODE_DEFINITIONS.reduce((acc, def) => {
    acc[def.type] = def;
    return acc;
  }, {} as Record<BehaviorNodeType, BehaviorNodeDefinition>);

/**
 * Get node definition by type
 */
export function getBehaviorNodeDefinition(type: BehaviorNodeType): BehaviorNodeDefinition | null {
  return BEHAVIOR_NODE_LIBRARY[type] || null;
}

/**
 * Get all nodes in a category
 */
export function getBehaviorNodesByCategory(category: BehaviorNodeCategory): BehaviorNodeDefinition[] {
  return BEHAVIOR_NODE_DEFINITIONS.filter(def => def.category === category);
}

/**
 * Category metadata
 */
export const BEHAVIOR_CATEGORIES: Record<BehaviorNodeCategory, { name: string; description: string; color: string }> = {
  composite: {
    name: 'Composite',
    description: 'Control flow nodes with multiple children',
    color: '#3b82f6',
  },
  decorator: {
    name: 'Decorator',
    description: 'Modify child node behavior',
    color: '#8b5cf6',
  },
  action: {
    name: 'Action',
    description: 'Perform actions in the game world',
    color: '#22c55e',
  },
  condition: {
    name: 'Condition',
    description: 'Check game state conditions',
    color: '#f59e0b',
  },
};

/**
 * Behavior Tree Executor - runs behavior trees
 */
export class BehaviorTreeExecutor {
  private nodeStates: Map<string, BehaviorNodeState> = new Map();
  private tree: {
    nodes: BehaviorNodeInstance[];
    connections: BehaviorConnection[];
    rootId: string | null;
    blackboard: Record<string, unknown>;
  };

  constructor(tree: {
    nodes: BehaviorNodeInstance[];
    connections: BehaviorConnection[];
    rootId: string | null;
    blackboard: Record<string, unknown>;
  }) {
    this.tree = tree;
  }

  /**
   * Reset all node states
   */
  reset(): void {
    this.nodeStates.clear();
  }

  /**
   * Get children of a node, sorted by order
   */
  private getChildren(nodeId: string): BehaviorNodeInstance[] {
    const childConnections = this.tree.connections
      .filter(c => c.parentId === nodeId)
      .sort((a, b) => a.order - b.order);

    return childConnections
      .map(c => this.tree.nodes.find(n => n.id === c.childId))
      .filter((n): n is BehaviorNodeInstance => n !== undefined);
  }

  /**
   * Get or create node state
   */
  private getNodeState(nodeId: string): BehaviorNodeState {
    if (!this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        nodeId,
        status: 'success',
        runningTime: 0,
        data: {},
      });
    }
    return this.nodeStates.get(nodeId)!;
  }

  /**
   * Execute the behavior tree
   */
  execute(context: BehaviorContext): BehaviorStatus {
    if (!this.tree.rootId) return 'failure';

    const rootNode = this.tree.nodes.find(n => n.id === this.tree.rootId);
    if (!rootNode) return 'failure';

    // Merge tree blackboard with context
    const mergedContext = {
      ...context,
      blackboard: { ...this.tree.blackboard, ...context.blackboard },
    };

    return this.executeNode(rootNode, mergedContext);
  }

  /**
   * Execute a single node
   */
  private executeNode(node: BehaviorNodeInstance, context: BehaviorContext): BehaviorStatus {
    const definition = getBehaviorNodeDefinition(node.type);
    if (!definition) return 'failure';

    const state = this.getNodeState(node.id);
    const children = this.getChildren(node.id);

    // Execute based on node type
    switch (node.type) {
      // === COMPOSITE NODES ===
      case 'bt_sequence':
        return this.executeSequence(children, context, state);

      case 'bt_selector':
        return this.executeSelector(children, context, state);

      case 'bt_parallel':
        return this.executeParallel(node, children, context);

      case 'bt_random_selector':
        return this.executeRandomSelector(children, context, state);

      case 'bt_random_sequence':
        return this.executeRandomSequence(children, context, state);

      // === DECORATOR NODES ===
      case 'bt_inverter':
        return this.executeInverter(children[0], context);

      case 'bt_succeeder':
        return this.executeSucceeder(children[0], context);

      case 'bt_failer':
        return this.executeFailer(children[0], context);

      case 'bt_repeater':
        return this.executeRepeater(node, children[0], context, state);

      case 'bt_repeat_until_fail':
        return this.executeRepeatUntilFail(node, children[0], context, state);

      case 'bt_repeat_until_success':
        return this.executeRepeatUntilSuccess(node, children[0], context, state);

      case 'bt_cooldown':
        return this.executeCooldown(node, children[0], context, state);

      case 'bt_timeout':
        return this.executeTimeout(node, children[0], context, state);

      // === ACTION NODES ===
      case 'bt_action':
        return this.executeAction(node, context, state);

      case 'bt_wait':
        return this.executeWait(node, context, state);

      case 'bt_log':
        return this.executeLog(node, context);

      case 'bt_set_blackboard':
        return this.executeSetBlackboard(node, context);

      // === CONDITION NODES ===
      case 'bt_condition':
        return this.executeCondition(node, context);

      case 'bt_check_blackboard':
        return this.executeCheckBlackboard(node, context);

      default:
        return 'failure';
    }
  }

  // === COMPOSITE IMPLEMENTATIONS ===

  private executeSequence(children: BehaviorNodeInstance[], context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    const startIndex = (state.data.currentIndex as number) || 0;

    for (let i = startIndex; i < children.length; i++) {
      const result = this.executeNode(children[i], context);

      if (result === 'running') {
        state.data.currentIndex = i;
        return 'running';
      }

      if (result === 'failure') {
        state.data.currentIndex = 0;
        return 'failure';
      }
    }

    state.data.currentIndex = 0;
    return 'success';
  }

  private executeSelector(children: BehaviorNodeInstance[], context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    const startIndex = (state.data.currentIndex as number) || 0;

    for (let i = startIndex; i < children.length; i++) {
      const result = this.executeNode(children[i], context);

      if (result === 'running') {
        state.data.currentIndex = i;
        return 'running';
      }

      if (result === 'success') {
        state.data.currentIndex = 0;
        return 'success';
      }
    }

    state.data.currentIndex = 0;
    return 'failure';
  }

  private executeParallel(node: BehaviorNodeInstance, children: BehaviorNodeInstance[], context: BehaviorContext): BehaviorStatus {
    const successPolicy = (node.data.successPolicy as string) || 'all';
    const failurePolicy = (node.data.failurePolicy as string) || 'one';

    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of children) {
      const result = this.executeNode(child, context);
      if (result === 'success') successCount++;
      else if (result === 'failure') failureCount++;
      else runningCount++;
    }

    // Check failure policy
    if (failurePolicy === 'one' && failureCount > 0) return 'failure';
    if (failurePolicy === 'all' && failureCount === children.length) return 'failure';

    // Check success policy
    if (successPolicy === 'one' && successCount > 0) return 'success';
    if (successPolicy === 'all' && successCount === children.length) return 'success';

    if (runningCount > 0) return 'running';

    return 'success';
  }

  private executeRandomSelector(children: BehaviorNodeInstance[], context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!state.data.shuffledIndices) {
      state.data.shuffledIndices = this.shuffleArray([...Array(children.length).keys()]);
      state.data.currentIndex = 0;
    }

    const indices = state.data.shuffledIndices as number[];
    const startIndex = (state.data.currentIndex as number) || 0;

    for (let i = startIndex; i < indices.length; i++) {
      const result = this.executeNode(children[indices[i]], context);

      if (result === 'running') {
        state.data.currentIndex = i;
        return 'running';
      }

      if (result === 'success') {
        state.data.shuffledIndices = null;
        state.data.currentIndex = 0;
        return 'success';
      }
    }

    state.data.shuffledIndices = null;
    state.data.currentIndex = 0;
    return 'failure';
  }

  private executeRandomSequence(children: BehaviorNodeInstance[], context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!state.data.shuffledIndices) {
      state.data.shuffledIndices = this.shuffleArray([...Array(children.length).keys()]);
      state.data.currentIndex = 0;
    }

    const indices = state.data.shuffledIndices as number[];
    const startIndex = (state.data.currentIndex as number) || 0;

    for (let i = startIndex; i < indices.length; i++) {
      const result = this.executeNode(children[indices[i]], context);

      if (result === 'running') {
        state.data.currentIndex = i;
        return 'running';
      }

      if (result === 'failure') {
        state.data.shuffledIndices = null;
        state.data.currentIndex = 0;
        return 'failure';
      }
    }

    state.data.shuffledIndices = null;
    state.data.currentIndex = 0;
    return 'success';
  }

  // === DECORATOR IMPLEMENTATIONS ===

  private executeInverter(child: BehaviorNodeInstance | undefined, context: BehaviorContext): BehaviorStatus {
    if (!child) return 'failure';
    const result = this.executeNode(child, context);
    if (result === 'success') return 'failure';
    if (result === 'failure') return 'success';
    return 'running';
  }

  private executeSucceeder(child: BehaviorNodeInstance | undefined, context: BehaviorContext): BehaviorStatus {
    if (!child) return 'success';
    const result = this.executeNode(child, context);
    if (result === 'running') return 'running';
    return 'success';
  }

  private executeFailer(child: BehaviorNodeInstance | undefined, context: BehaviorContext): BehaviorStatus {
    if (!child) return 'failure';
    const result = this.executeNode(child, context);
    if (result === 'running') return 'running';
    return 'failure';
  }

  private executeRepeater(node: BehaviorNodeInstance, child: BehaviorNodeInstance | undefined, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!child) return 'failure';

    const count = (node.data.count as number) || 3;
    const iteration = (state.data.iteration as number) || 0;

    if (iteration >= count) {
      state.data.iteration = 0;
      return 'success';
    }

    const result = this.executeNode(child, context);

    if (result === 'running') return 'running';

    state.data.iteration = iteration + 1;

    if ((state.data.iteration as number) >= count) {
      state.data.iteration = 0;
      return 'success';
    }

    return 'running';
  }

  private executeRepeatUntilFail(node: BehaviorNodeInstance, child: BehaviorNodeInstance | undefined, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!child) return 'success';

    const maxIterations = (node.data.maxIterations as number) || 100;
    const iteration = (state.data.iteration as number) || 0;

    if (iteration >= maxIterations) {
      state.data.iteration = 0;
      return 'success';
    }

    const result = this.executeNode(child, context);

    if (result === 'failure') {
      state.data.iteration = 0;
      return 'success';
    }

    if (result === 'running') return 'running';

    state.data.iteration = iteration + 1;
    return 'running';
  }

  private executeRepeatUntilSuccess(node: BehaviorNodeInstance, child: BehaviorNodeInstance | undefined, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!child) return 'failure';

    const maxIterations = (node.data.maxIterations as number) || 100;
    const iteration = (state.data.iteration as number) || 0;

    if (iteration >= maxIterations) {
      state.data.iteration = 0;
      return 'failure';
    }

    const result = this.executeNode(child, context);

    if (result === 'success') {
      state.data.iteration = 0;
      return 'success';
    }

    if (result === 'running') return 'running';

    state.data.iteration = iteration + 1;
    return 'running';
  }

  private executeCooldown(node: BehaviorNodeInstance, child: BehaviorNodeInstance | undefined, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!child) return 'failure';

    const duration = (node.data.duration as number) || 1.0;
    const lastExecutionTime = (state.data.lastExecutionTime as number) || 0;

    state.runningTime += context.deltaTime;

    if (state.runningTime - lastExecutionTime < duration) {
      return 'failure';
    }

    const result = this.executeNode(child, context);

    if (result !== 'running') {
      state.data.lastExecutionTime = state.runningTime;
    }

    return result;
  }

  private executeTimeout(node: BehaviorNodeInstance, child: BehaviorNodeInstance | undefined, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    if (!child) return 'failure';

    const timeout = (node.data.timeout as number) || 5.0;

    if (state.status !== 'running') {
      state.data.startTime = 0;
    }

    state.data.startTime = ((state.data.startTime as number) || 0) + context.deltaTime;

    if ((state.data.startTime as number) >= timeout) {
      state.data.startTime = 0;
      return 'failure';
    }

    return this.executeNode(child, context);
  }

  // === ACTION IMPLEMENTATIONS ===

  private executeAction(node: BehaviorNodeInstance, _context: BehaviorContext, _state: BehaviorNodeState): BehaviorStatus {
    const actionType = (node.data.actionType as string) || 'move';

    switch (actionType) {
      case 'move':
        // TODO: Implement actual movement
        return 'success';
      case 'attack':
        // TODO: Implement attack
        return 'success';
      case 'flee':
        // TODO: Implement flee
        return 'success';
      default:
        return 'success';
    }
  }

  private executeWait(node: BehaviorNodeInstance, context: BehaviorContext, state: BehaviorNodeState): BehaviorStatus {
    const duration = (node.data.duration as number) || 1.0;

    state.data.elapsed = ((state.data.elapsed as number) || 0) + context.deltaTime;

    if ((state.data.elapsed as number) >= duration) {
      state.data.elapsed = 0;
      return 'success';
    }

    return 'running';
  }

  private executeLog(node: BehaviorNodeInstance, _context: BehaviorContext): BehaviorStatus {
    const message = (node.data.message as string) || 'Debug';
    const level = (node.data.level as string) || 'info';

    switch (level) {
      case 'error':
        console.error(`[BT] ${message}`);
        break;
      case 'warn':
        console.warn(`[BT] ${message}`);
        break;
      default:
        console.log(`[BT] ${message}`);
    }

    return 'success';
  }

  private executeSetBlackboard(node: BehaviorNodeInstance, context: BehaviorContext): BehaviorStatus {
    const key = (node.data.key as string) || 'variable';
    const value = node.data.value;

    context.blackboard[key] = value;
    this.tree.blackboard[key] = value;

    return 'success';
  }

  // === CONDITION IMPLEMENTATIONS ===

  private executeCondition(node: BehaviorNodeInstance, _context: BehaviorContext): BehaviorStatus {
    const conditionType = (node.data.conditionType as string) || 'always';
    const threshold = (node.data.threshold as number) || 100;

    switch (conditionType) {
      case 'always':
        return 'success';
      case 'never':
        return 'failure';
      case 'random':
        return Math.random() < (threshold / 100) ? 'success' : 'failure';
      default:
        // TODO: Implement actual conditions
        return 'success';
    }
  }

  private executeCheckBlackboard(node: BehaviorNodeInstance, context: BehaviorContext): BehaviorStatus {
    const key = (node.data.key as string) || 'variable';
    const expectedValue = node.data.expectedValue;
    const comparison = (node.data.comparison as string) || 'equals';

    const actualValue = context.blackboard[key];

    switch (comparison) {
      case 'equals':
        return actualValue === expectedValue ? 'success' : 'failure';
      case 'not_equals':
        return actualValue !== expectedValue ? 'success' : 'failure';
      case 'greater':
        return (actualValue as number) > (expectedValue as number) ? 'success' : 'failure';
      case 'less':
        return (actualValue as number) < (expectedValue as number) ? 'success' : 'failure';
      case 'exists':
        return actualValue !== undefined ? 'success' : 'failure';
      default:
        return 'failure';
    }
  }

  // === HELPERS ===

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Create a default behavior tree
 */
export function createDefaultBehaviorTree(): {
  id: string;
  name: string;
  rootId: string | null;
  nodes: BehaviorNodeInstance[];
  connections: BehaviorConnection[];
  blackboard: Record<string, unknown>;
  viewport: { x: number; y: number; zoom: number };
} {
  const rootId = 'root_' + Date.now();

  return {
    id: `bt_${Date.now()}`,
    name: 'New Behavior Tree',
    rootId,
    nodes: [
      {
        id: rootId,
        type: 'bt_selector',
        position: { x: 300, y: 100 },
        data: {},
      },
    ],
    connections: [],
    blackboard: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export default BEHAVIOR_NODE_LIBRARY;
