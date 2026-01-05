// State Machine Types - Finite State Machine for game logic and animations

/**
 * State in the finite state machine
 */
export interface State {
  id: string;
  name: string;
  position: { x: number; y: number };
  // Whether this is the initial/entry state
  isInitial?: boolean;
  // Color for visual distinction
  color?: string;
  // Actions to execute when entering this state
  onEnter?: StateAction[];
  // Actions to execute while in this state (every frame)
  onUpdate?: StateAction[];
  // Actions to execute when leaving this state
  onExit?: StateAction[];
  // Custom data stored in the state
  data?: Record<string, unknown>;
}

/**
 * Transition between states
 */
export interface Transition {
  id: string;
  fromStateId: string;
  toStateId: string;
  // Conditions that must be met to trigger this transition
  conditions: TransitionCondition[];
  // How conditions are evaluated: 'all' = AND, 'any' = OR
  conditionMode: 'all' | 'any';
  // Priority for when multiple transitions are possible
  priority: number;
  // Whether this transition can interrupt running state actions
  canInterrupt?: boolean;
  // Transition duration for blending (useful for animations)
  duration?: number;
}

/**
 * Condition for a transition
 */
export interface TransitionCondition {
  id: string;
  // Type of condition
  type: 'parameter' | 'trigger' | 'time' | 'custom';
  // Parameter name (for parameter conditions)
  parameter?: string;
  // Comparison operator
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'greater_equals' | 'less_equals';
  // Value to compare against
  value: unknown;
}

/**
 * Action to execute in a state
 */
export interface StateAction {
  id: string;
  type: 'set_parameter' | 'play_animation' | 'emit_event' | 'set_velocity' | 'custom';
  // Action-specific data
  data: Record<string, unknown>;
}

/**
 * Parameter types for the state machine
 */
export type ParameterType = 'float' | 'int' | 'bool' | 'trigger';

/**
 * Parameter definition
 */
export interface Parameter {
  id: string;
  name: string;
  type: ParameterType;
  defaultValue: number | boolean;
}

/**
 * Complete state machine definition
 */
export interface StateMachine {
  id: string;
  name: string;
  description?: string;
  states: State[];
  transitions: Transition[];
  parameters: Parameter[];
  // Currently active state ID (for runtime)
  currentStateId?: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Runtime context for state machine execution
 */
export interface StateMachineContext {
  // Delta time since last update
  deltaTime: number;
  // Current parameter values
  parameters: Record<string, number | boolean>;
  // Entity this state machine is attached to
  entity: unknown;
  // Game world reference
  gameWorld: unknown;
  // Emit an event
  emit: (event: string, data?: unknown) => void;
  // Play an animation
  playAnimation?: (animationName: string) => void;
  // Set entity velocity
  setVelocity?: (vx: number, vy: number) => void;
}

/**
 * Runtime state for execution
 */
export interface StateMachineRuntime {
  // Current state ID
  currentStateId: string;
  // Time spent in current state
  stateTime: number;
  // Previous state ID (for transition logic)
  previousStateId?: string;
  // Currently evaluating transition
  pendingTransitionId?: string;
  // Transition progress (0 to 1)
  transitionProgress: number;
}

/**
 * State colors for different purposes
 */
export const STATE_COLORS = {
  default: '#3b82f6',    // Blue
  initial: '#22c55e',    // Green
  combat: '#ef4444',     // Red
  movement: '#f59e0b',   // Orange
  idle: '#6b7280',       // Gray
  special: '#8b5cf6',    // Purple
};

/**
 * Parameter type colors
 */
export const PARAMETER_COLORS: Record<ParameterType, string> = {
  float: '#22c55e',      // Green
  int: '#3b82f6',        // Blue
  bool: '#f59e0b',       // Orange
  trigger: '#ef4444',    // Red
};

/**
 * Operator display names
 */
export const OPERATOR_LABELS: Record<TransitionCondition['operator'], string> = {
  equals: '=',
  not_equals: '≠',
  greater: '>',
  less: '<',
  greater_equals: '≥',
  less_equals: '≤',
};
