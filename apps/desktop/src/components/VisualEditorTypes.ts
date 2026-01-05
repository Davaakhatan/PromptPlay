/**
 * Visual Editor Type Definitions
 * Types for Node Graph, Shader Graph, Behavior Tree, and State Machine editors
 */

// ========== Node Graph Types ==========

export interface NodeGraph {
  id: string;
  name: string;
  nodes: NodeGraphNode[];
  connections: NodeConnection[];
  variables: NodeVariable[];
}

export interface NodeGraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface NodeConnection {
  id: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
}

export interface NodeVariable {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'vector2' | 'object';
  defaultValue: unknown;
}

// ========== Shader Graph Types ==========

export interface ShaderGraph {
  id: string;
  name: string;
  nodes: ShaderNode[];
  connections: ShaderConnection[];
}

export interface ShaderNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface ShaderConnection {
  id: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
}

// Shader node types
export type ShaderNodeType =
  | 'color'
  | 'texture'
  | 'uv'
  | 'time'
  | 'math'
  | 'combine'
  | 'split'
  | 'lerp'
  | 'noise'
  | 'output';

// ========== Behavior Tree Types ==========

export interface BehaviorTree {
  id: string;
  name: string;
  nodes: BehaviorTreeNode[];
  rootId: string;
}

export interface BehaviorTreeNode {
  id: string;
  type: 'selector' | 'sequence' | 'parallel' | 'condition' | 'action' | 'decorator';
  name: string;
  position: { x: number; y: number };
  children?: string[];
  condition?: string;
  action?: string;
  decorator?: {
    type: 'inverter' | 'repeater' | 'timeout';
    params?: Record<string, unknown>;
  };
}

export type BehaviorTreeNodeStatus = 'success' | 'failure' | 'running' | 'idle';

// ========== State Machine Types ==========

export interface StateMachine {
  id: string;
  name: string;
  states: StateNode[];
  transitions: StateTransition[];
  currentState: string;
}

export interface StateNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  isInitial: boolean;
  isFinal?: boolean;
  onEnter: StateAction[];
  onUpdate: StateAction[];
  onExit: StateAction[];
}

export interface StateTransition {
  id: string;
  from: string;
  to: string;
  condition: string;
  priority: number;
  actions?: StateAction[];
}

export interface StateAction {
  type: 'set_variable' | 'call_function' | 'emit_event' | 'play_animation' | 'play_sound';
  params: Record<string, unknown>;
}

// ========== Visual Script Data Types ==========

export interface VisualScriptData {
  nodeGraph?: NodeGraph;
  shaderGraph?: ShaderGraph;
  behaviorTree?: BehaviorTree;
  stateMachine?: StateMachine;
}

// ========== Editor Config Types ==========

export interface VisualEditorConfig {
  gridSize: number;
  snapToGrid: boolean;
  showMinimap: boolean;
  theme: 'dark' | 'light';
  nodeSpacing: { x: number; y: number };
}

// Default configurations
export const DEFAULT_EDITOR_CONFIG: VisualEditorConfig = {
  gridSize: 20,
  snapToGrid: true,
  showMinimap: true,
  theme: 'dark',
  nodeSpacing: { x: 200, y: 100 },
};

// ========== Factory Functions ==========

export function createEmptyNodeGraph(name: string = 'New Graph'): NodeGraph {
  return {
    id: `graph_${Date.now()}`,
    name,
    nodes: [
      {
        id: 'start',
        type: 'event',
        position: { x: 100, y: 200 },
        data: { label: 'On Start', eventType: 'start' },
      },
    ],
    connections: [],
    variables: [],
  };
}

export function createEmptyShaderGraph(name: string = 'New Shader'): ShaderGraph {
  return {
    id: `shader_${Date.now()}`,
    name,
    nodes: [
      {
        id: 'output',
        type: 'output',
        position: { x: 500, y: 200 },
        data: { label: 'Material Output' },
      },
      {
        id: 'color',
        type: 'color',
        position: { x: 200, y: 200 },
        data: { color: '#ffffff' },
      },
    ],
    connections: [
      {
        id: 'conn_1',
        sourceId: 'color',
        sourcePort: 'output',
        targetId: 'output',
        targetPort: 'color',
      },
    ],
  };
}

export function createEmptyBehaviorTree(name: string = 'New Behavior'): BehaviorTree {
  return {
    id: `bt_${Date.now()}`,
    name,
    nodes: [
      {
        id: 'root',
        type: 'selector',
        name: 'Root',
        position: { x: 400, y: 50 },
        children: [],
      },
    ],
    rootId: 'root',
  };
}

export function createEmptyStateMachine(name: string = 'New State Machine'): StateMachine {
  return {
    id: `sm_${Date.now()}`,
    name,
    states: [
      {
        id: 'idle',
        name: 'Idle',
        position: { x: 200, y: 200 },
        isInitial: true,
        onEnter: [],
        onUpdate: [],
        onExit: [],
      },
    ],
    transitions: [],
    currentState: 'idle',
  };
}
