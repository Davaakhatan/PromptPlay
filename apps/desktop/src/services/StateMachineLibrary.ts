// State Machine Library - FSM execution and utilities

import type {
  StateMachine,
  State,
  Transition,
  TransitionCondition,
  StateAction,
  StateMachineContext,
  StateMachineRuntime,
} from '../types/StateMachine';

/**
 * State Machine Executor - runs finite state machines
 */
export class StateMachineExecutor {
  private machine: StateMachine;
  private runtime: StateMachineRuntime;
  private parameters: Record<string, number | boolean>;

  constructor(machine: StateMachine) {
    this.machine = machine;
    this.runtime = {
      currentStateId: this.getInitialStateId(),
      stateTime: 0,
      transitionProgress: 0,
    };
    this.parameters = this.initializeParameters();
  }

  /**
   * Get the initial state ID
   */
  private getInitialStateId(): string {
    const initial = this.machine.states.find(s => s.isInitial);
    if (initial) return initial.id;
    // Default to first state
    return this.machine.states[0]?.id || '';
  }

  /**
   * Initialize parameter values from definitions
   */
  private initializeParameters(): Record<string, number | boolean> {
    const params: Record<string, number | boolean> = {};
    for (const param of this.machine.parameters) {
      params[param.name] = param.defaultValue;
    }
    return params;
  }

  /**
   * Get current state
   */
  getCurrentState(): State | null {
    return this.machine.states.find(s => s.id === this.runtime.currentStateId) || null;
  }

  /**
   * Get current state name
   */
  getCurrentStateName(): string {
    return this.getCurrentState()?.name || 'Unknown';
  }

  /**
   * Set a parameter value
   */
  setParameter(name: string, value: number | boolean): void {
    this.parameters[name] = value;
  }

  /**
   * Get a parameter value
   */
  getParameter(name: string): number | boolean | undefined {
    return this.parameters[name];
  }

  /**
   * Set a trigger (automatically resets after use)
   */
  setTrigger(name: string): void {
    this.parameters[name] = true;
  }

  /**
   * Reset the state machine to initial state
   */
  reset(): void {
    this.runtime = {
      currentStateId: this.getInitialStateId(),
      stateTime: 0,
      transitionProgress: 0,
    };
    this.parameters = this.initializeParameters();
  }

  /**
   * Update the state machine
   */
  update(context: StateMachineContext): void {
    const currentState = this.getCurrentState();
    if (!currentState) return;

    // Update state time
    this.runtime.stateTime += context.deltaTime;

    // Execute onUpdate actions
    if (currentState.onUpdate) {
      this.executeActions(currentState.onUpdate, context);
    }

    // Check for transitions
    const transition = this.findValidTransition(context);
    if (transition) {
      this.performTransition(transition, context);
    }

    // Reset triggers
    this.resetTriggers();
  }

  /**
   * Find a valid transition from current state
   */
  private findValidTransition(context: StateMachineContext): Transition | null {
    const transitions = this.machine.transitions
      .filter(t => t.fromStateId === this.runtime.currentStateId)
      .sort((a, b) => b.priority - a.priority);

    for (const transition of transitions) {
      if (this.evaluateConditions(transition, context)) {
        return transition;
      }
    }

    return null;
  }

  /**
   * Evaluate transition conditions
   */
  private evaluateConditions(transition: Transition, context: StateMachineContext): boolean {
    if (transition.conditions.length === 0) return true;

    const results = transition.conditions.map(cond => this.evaluateCondition(cond, context));

    if (transition.conditionMode === 'all') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: TransitionCondition, _context: StateMachineContext): boolean {
    switch (condition.type) {
      case 'parameter': {
        const value = this.parameters[condition.parameter || ''];
        if (value === undefined) return false;
        return this.compare(value, condition.operator, condition.value);
      }

      case 'trigger': {
        const triggered = this.parameters[condition.parameter || ''];
        return triggered === true;
      }

      case 'time': {
        return this.compare(this.runtime.stateTime, condition.operator, condition.value as number);
      }

      case 'custom': {
        // Custom conditions can be implemented by extending the executor
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * Compare two values with an operator
   */
  private compare(a: unknown, operator: TransitionCondition['operator'], b: unknown): boolean {
    switch (operator) {
      case 'equals':
        return a === b;
      case 'not_equals':
        return a !== b;
      case 'greater':
        return (a as number) > (b as number);
      case 'less':
        return (a as number) < (b as number);
      case 'greater_equals':
        return (a as number) >= (b as number);
      case 'less_equals':
        return (a as number) <= (b as number);
      default:
        return false;
    }
  }

  /**
   * Perform a transition to a new state
   */
  private performTransition(transition: Transition, context: StateMachineContext): void {
    const fromState = this.machine.states.find(s => s.id === transition.fromStateId);
    const toState = this.machine.states.find(s => s.id === transition.toStateId);

    if (!toState) return;

    // Execute exit actions
    if (fromState?.onExit) {
      this.executeActions(fromState.onExit, context);
    }

    // Update runtime
    this.runtime.previousStateId = this.runtime.currentStateId;
    this.runtime.currentStateId = toState.id;
    this.runtime.stateTime = 0;
    this.runtime.transitionProgress = 0;

    // Execute enter actions
    if (toState.onEnter) {
      this.executeActions(toState.onEnter, context);
    }
  }

  /**
   * Execute state actions
   */
  private executeActions(actions: StateAction[], context: StateMachineContext): void {
    for (const action of actions) {
      this.executeAction(action, context);
    }
  }

  /**
   * Execute a single action
   */
  private executeAction(action: StateAction, context: StateMachineContext): void {
    switch (action.type) {
      case 'set_parameter': {
        const name = action.data.parameter as string;
        const value = action.data.value as number | boolean;
        this.setParameter(name, value);
        break;
      }

      case 'play_animation': {
        const animationName = action.data.animation as string;
        context.playAnimation?.(animationName);
        break;
      }

      case 'emit_event': {
        const eventName = action.data.event as string;
        const eventData = action.data.data;
        context.emit(eventName, eventData);
        break;
      }

      case 'set_velocity': {
        const vx = action.data.vx as number;
        const vy = action.data.vy as number;
        context.setVelocity?.(vx, vy);
        break;
      }

      case 'custom':
        // Custom actions can be implemented by extending
        break;
    }
  }

  /**
   * Reset all trigger parameters
   */
  private resetTriggers(): void {
    for (const param of this.machine.parameters) {
      if (param.type === 'trigger') {
        this.parameters[param.name] = false;
      }
    }
  }

  /**
   * Force transition to a specific state
   */
  forceTransition(stateId: string, context: StateMachineContext): void {
    const toState = this.machine.states.find(s => s.id === stateId);
    if (!toState) return;

    const fromState = this.getCurrentState();

    // Execute exit actions
    if (fromState?.onExit) {
      this.executeActions(fromState.onExit, context);
    }

    // Update runtime
    this.runtime.previousStateId = this.runtime.currentStateId;
    this.runtime.currentStateId = stateId;
    this.runtime.stateTime = 0;

    // Execute enter actions
    if (toState.onEnter) {
      this.executeActions(toState.onEnter, context);
    }
  }

  /**
   * Get runtime state info
   */
  getRuntime(): StateMachineRuntime {
    return { ...this.runtime };
  }

  /**
   * Get all parameter values
   */
  getParameters(): Record<string, number | boolean> {
    return { ...this.parameters };
  }
}

/**
 * Create a default state machine
 */
export function createDefaultStateMachine(): StateMachine {
  const idleStateId = `state_idle_${Date.now()}`;
  const walkStateId = `state_walk_${Date.now() + 1}`;

  return {
    id: `sm_${Date.now()}`,
    name: 'New State Machine',
    states: [
      {
        id: idleStateId,
        name: 'Idle',
        position: { x: 200, y: 200 },
        isInitial: true,
        color: '#6b7280',
      },
      {
        id: walkStateId,
        name: 'Walk',
        position: { x: 450, y: 200 },
        color: '#f59e0b',
      },
    ],
    transitions: [
      {
        id: `trans_${Date.now()}`,
        fromStateId: idleStateId,
        toStateId: walkStateId,
        conditions: [
          {
            id: `cond_${Date.now()}`,
            type: 'parameter',
            parameter: 'speed',
            operator: 'greater',
            value: 0,
          },
        ],
        conditionMode: 'all',
        priority: 0,
      },
      {
        id: `trans_${Date.now() + 1}`,
        fromStateId: walkStateId,
        toStateId: idleStateId,
        conditions: [
          {
            id: `cond_${Date.now() + 1}`,
            type: 'parameter',
            parameter: 'speed',
            operator: 'equals',
            value: 0,
          },
        ],
        conditionMode: 'all',
        priority: 0,
      },
    ],
    parameters: [
      {
        id: `param_${Date.now()}`,
        name: 'speed',
        type: 'float',
        defaultValue: 0,
      },
      {
        id: `param_${Date.now() + 1}`,
        name: 'isGrounded',
        type: 'bool',
        defaultValue: true,
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * Validate a state machine for errors
 */
export function validateStateMachine(machine: StateMachine): string[] {
  const errors: string[] = [];

  // Check for states
  if (machine.states.length === 0) {
    errors.push('State machine has no states');
  }

  // Check for initial state
  const hasInitial = machine.states.some(s => s.isInitial);
  if (!hasInitial && machine.states.length > 0) {
    errors.push('No initial state defined');
  }

  // Check for multiple initial states
  const initialCount = machine.states.filter(s => s.isInitial).length;
  if (initialCount > 1) {
    errors.push('Multiple initial states defined');
  }

  // Check transitions reference valid states
  for (const transition of machine.transitions) {
    const fromExists = machine.states.some(s => s.id === transition.fromStateId);
    const toExists = machine.states.some(s => s.id === transition.toStateId);

    if (!fromExists) {
      errors.push(`Transition references non-existent source state: ${transition.fromStateId}`);
    }
    if (!toExists) {
      errors.push(`Transition references non-existent target state: ${transition.toStateId}`);
    }
  }

  // Check conditions reference valid parameters
  for (const transition of machine.transitions) {
    for (const condition of transition.conditions) {
      if (condition.type === 'parameter' || condition.type === 'trigger') {
        const paramExists = machine.parameters.some(p => p.name === condition.parameter);
        if (!paramExists) {
          errors.push(`Condition references non-existent parameter: ${condition.parameter}`);
        }
      }
    }
  }

  // Check for orphan states (no incoming transitions)
  for (const state of machine.states) {
    if (!state.isInitial) {
      const hasIncoming = machine.transitions.some(t => t.toStateId === state.id);
      if (!hasIncoming) {
        errors.push(`State "${state.name}" has no incoming transitions and is not initial`);
      }
    }
  }

  return errors;
}

/**
 * Preset state machines for common use cases
 */
export const STATE_MACHINE_PRESETS: Record<string, () => StateMachine> = {
  playerMovement: () => {
    const idleId = `idle_${Date.now()}`;
    const walkId = `walk_${Date.now()}`;
    const runId = `run_${Date.now()}`;
    const jumpId = `jump_${Date.now()}`;
    const fallId = `fall_${Date.now()}`;

    return {
      id: `sm_player_${Date.now()}`,
      name: 'Player Movement',
      states: [
        { id: idleId, name: 'Idle', position: { x: 250, y: 250 }, isInitial: true, color: '#6b7280' },
        { id: walkId, name: 'Walk', position: { x: 450, y: 150 }, color: '#22c55e' },
        { id: runId, name: 'Run', position: { x: 450, y: 350 }, color: '#f59e0b' },
        { id: jumpId, name: 'Jump', position: { x: 650, y: 150 }, color: '#3b82f6' },
        { id: fallId, name: 'Fall', position: { x: 650, y: 350 }, color: '#ef4444' },
      ],
      transitions: [
        { id: `t1_${Date.now()}`, fromStateId: idleId, toStateId: walkId, conditions: [{ id: 'c1', type: 'parameter', parameter: 'speed', operator: 'greater', value: 0 }], conditionMode: 'all', priority: 0 },
        { id: `t2_${Date.now()}`, fromStateId: walkId, toStateId: idleId, conditions: [{ id: 'c2', type: 'parameter', parameter: 'speed', operator: 'equals', value: 0 }], conditionMode: 'all', priority: 0 },
        { id: `t3_${Date.now()}`, fromStateId: walkId, toStateId: runId, conditions: [{ id: 'c3', type: 'parameter', parameter: 'speed', operator: 'greater', value: 5 }], conditionMode: 'all', priority: 1 },
        { id: `t4_${Date.now()}`, fromStateId: runId, toStateId: walkId, conditions: [{ id: 'c4', type: 'parameter', parameter: 'speed', operator: 'less_equals', value: 5 }], conditionMode: 'all', priority: 0 },
        { id: `t5_${Date.now()}`, fromStateId: idleId, toStateId: jumpId, conditions: [{ id: 'c5', type: 'trigger', parameter: 'jump' }], conditionMode: 'all', priority: 2 },
        { id: `t6_${Date.now()}`, fromStateId: walkId, toStateId: jumpId, conditions: [{ id: 'c6', type: 'trigger', parameter: 'jump' }], conditionMode: 'all', priority: 2 },
        { id: `t7_${Date.now()}`, fromStateId: jumpId, toStateId: fallId, conditions: [{ id: 'c7', type: 'parameter', parameter: 'velocityY', operator: 'less', value: 0 }], conditionMode: 'all', priority: 0 },
        { id: `t8_${Date.now()}`, fromStateId: fallId, toStateId: idleId, conditions: [{ id: 'c8', type: 'parameter', parameter: 'isGrounded', operator: 'equals', value: true }], conditionMode: 'all', priority: 0 },
      ],
      parameters: [
        { id: 'p1', name: 'speed', type: 'float', defaultValue: 0 },
        { id: 'p2', name: 'velocityY', type: 'float', defaultValue: 0 },
        { id: 'p3', name: 'isGrounded', type: 'bool', defaultValue: true },
        { id: 'p4', name: 'jump', type: 'trigger', defaultValue: false },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  },

  enemyAI: () => {
    const patrolId = `patrol_${Date.now()}`;
    const chaseId = `chase_${Date.now()}`;
    const attackId = `attack_${Date.now()}`;
    const retreatId = `retreat_${Date.now()}`;

    return {
      id: `sm_enemy_${Date.now()}`,
      name: 'Enemy AI',
      states: [
        { id: patrolId, name: 'Patrol', position: { x: 200, y: 200 }, isInitial: true, color: '#22c55e' },
        { id: chaseId, name: 'Chase', position: { x: 450, y: 150 }, color: '#f59e0b' },
        { id: attackId, name: 'Attack', position: { x: 650, y: 200 }, color: '#ef4444' },
        { id: retreatId, name: 'Retreat', position: { x: 450, y: 350 }, color: '#8b5cf6' },
      ],
      transitions: [
        { id: `t1_${Date.now()}`, fromStateId: patrolId, toStateId: chaseId, conditions: [{ id: 'c1', type: 'parameter', parameter: 'playerDistance', operator: 'less', value: 300 }], conditionMode: 'all', priority: 0 },
        { id: `t2_${Date.now()}`, fromStateId: chaseId, toStateId: patrolId, conditions: [{ id: 'c2', type: 'parameter', parameter: 'playerDistance', operator: 'greater', value: 400 }], conditionMode: 'all', priority: 0 },
        { id: `t3_${Date.now()}`, fromStateId: chaseId, toStateId: attackId, conditions: [{ id: 'c3', type: 'parameter', parameter: 'playerDistance', operator: 'less', value: 50 }], conditionMode: 'all', priority: 1 },
        { id: `t4_${Date.now()}`, fromStateId: attackId, toStateId: chaseId, conditions: [{ id: 'c4', type: 'parameter', parameter: 'playerDistance', operator: 'greater', value: 80 }], conditionMode: 'all', priority: 0 },
        { id: `t5_${Date.now()}`, fromStateId: attackId, toStateId: retreatId, conditions: [{ id: 'c5', type: 'parameter', parameter: 'health', operator: 'less', value: 20 }], conditionMode: 'all', priority: 2 },
        { id: `t6_${Date.now()}`, fromStateId: retreatId, toStateId: patrolId, conditions: [{ id: 'c6', type: 'parameter', parameter: 'health', operator: 'greater', value: 50 }], conditionMode: 'all', priority: 0 },
      ],
      parameters: [
        { id: 'p1', name: 'playerDistance', type: 'float', defaultValue: 999 },
        { id: 'p2', name: 'health', type: 'float', defaultValue: 100 },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  },
};

export default StateMachineExecutor;
