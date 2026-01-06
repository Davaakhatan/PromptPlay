// Behavior Tree Types - AI Decision Making System

/**
 * Status returned by behavior tree nodes
 */
export type BehaviorStatus = 'success' | 'failure' | 'running';

/**
 * Types of behavior tree nodes
 */
export type BehaviorNodeType =
  // Composite nodes (have children)
  | 'bt_sequence'      // Runs children in order, fails if any fail
  | 'bt_selector'      // Runs children in order until one succeeds
  | 'bt_parallel'      // Runs all children simultaneously
  | 'bt_random_selector' // Randomly selects a child to run
  | 'bt_random_sequence' // Runs children in random order
  // Decorator nodes (modify child behavior)
  | 'bt_inverter'      // Inverts child result
  | 'bt_succeeder'     // Always returns success
  | 'bt_failer'        // Always returns failure
  | 'bt_repeater'      // Repeats child N times
  | 'bt_repeat_until_fail' // Repeats child until it fails
  | 'bt_repeat_until_success' // Repeats child until it succeeds
  | 'bt_cooldown'      // Adds cooldown between executions
  | 'bt_timeout'       // Fails if child takes too long
  // Leaf nodes (actions and conditions)
  | 'bt_action'        // Performs an action
  | 'bt_condition'     // Checks a condition
  | 'bt_wait'          // Waits for specified time
  | 'bt_log'           // Logs a message
  | 'bt_set_blackboard' // Sets a blackboard value
  | 'bt_check_blackboard'; // Checks a blackboard value

/**
 * Category of behavior tree node
 */
export type BehaviorNodeCategory = 'composite' | 'decorator' | 'action' | 'condition';

/**
 * Port definition for behavior tree nodes
 */
export interface BehaviorPort {
  id: string;
  name: string;
  type: 'flow' | 'number' | 'string' | 'boolean' | 'entity' | 'any';
  defaultValue?: unknown;
}

/**
 * Definition of a behavior tree node type
 */
export interface BehaviorNodeDefinition {
  type: BehaviorNodeType;
  category: BehaviorNodeCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
  inputs: BehaviorPort[];
  outputs: BehaviorPort[];
  // Maximum number of children (-1 for unlimited)
  maxChildren: number;
  // Minimum number of children
  minChildren: number;
}

/**
 * Instance of a behavior tree node
 */
export interface BehaviorNodeInstance {
  id: string;
  type: BehaviorNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  collapsed?: boolean;
}

/**
 * Connection between behavior tree nodes (parent-child relationship)
 */
export interface BehaviorConnection {
  id: string;
  parentId: string;
  childId: string;
  // Order index for children (0 = first child)
  order: number;
}

/**
 * Complete behavior tree definition
 */
export interface BehaviorTree {
  id: string;
  name: string;
  description?: string;
  // Root node ID
  rootId: string | null;
  nodes: BehaviorNodeInstance[];
  connections: BehaviorConnection[];
  // Blackboard variables for sharing data between nodes
  blackboard: Record<string, unknown>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Context passed to behavior tree nodes during execution
 */
export interface BehaviorContext {
  // Delta time since last update
  deltaTime: number;
  // The entity this tree is attached to
  entity: unknown;
  // Blackboard for sharing data
  blackboard: Record<string, unknown>;
  // Game world reference
  gameWorld: unknown;
  // Get entity by name
  getEntity: (name: string) => unknown | null;
  // Update entity properties
  updateEntity: (name: string, data: unknown) => void;
  // Emit an event
  emit: (event: string, data?: unknown) => void;
}

/**
 * Runtime state of a behavior tree node
 */
export interface BehaviorNodeState {
  nodeId: string;
  status: BehaviorStatus;
  // Time spent in current status (for running nodes)
  runningTime: number;
  // Custom state data
  data: Record<string, unknown>;
}

/**
 * Node category colors
 */
export const BEHAVIOR_CATEGORY_COLORS: Record<BehaviorNodeCategory, string> = {
  composite: '#3b82f6',   // Blue
  decorator: '#8b5cf6',   // Purple
  action: '#22c55e',      // Green
  condition: '#f59e0b',   // Orange
};

/**
 * Node type icons
 */
export const BEHAVIOR_NODE_ICONS: Record<BehaviorNodeType, string> = {
  bt_sequence: '→',
  bt_selector: '?',
  bt_parallel: '∥',
  bt_random_selector: '⚄',
  bt_random_sequence: '⇝',
  bt_inverter: '¬',
  bt_succeeder: '✓',
  bt_failer: '✗',
  bt_repeater: '↺',
  bt_repeat_until_fail: '↻✗',
  bt_repeat_until_success: '↻✓',
  bt_cooldown: '◷',
  bt_timeout: '⌛',
  bt_action: '↯',
  bt_condition: '?',
  bt_wait: '‖',
  bt_log: '¶',
  bt_set_blackboard: '≡',
  bt_check_blackboard: '⌕',
};
