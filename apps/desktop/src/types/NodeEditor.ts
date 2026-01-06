// Node Editor Types for Visual Scripting (ComfyUI-Style)

export type PortType = 'flow' | 'number' | 'string' | 'boolean' | 'vector2' | 'entity' | 'any';

export interface Port {
  id: string;
  name: string;
  type: PortType;
  defaultValue?: unknown;
}

export interface NodeDefinition {
  type: string;
  category: 'events' | 'logic' | 'math' | 'entities' | 'physics' | 'input' | 'animation' | 'audio' | 'motion' | 'custom';
  title: string;
  description: string;
  icon?: string;
  color?: string;
  inputs: Port[];
  outputs: Port[];
  execute?: (inputs: Record<string, unknown>, context: NodeContext) => Record<string, unknown>;
}

export interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  collapsed?: boolean;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

/**
 * A node group - visual grouping of nodes for organization
 */
export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  // Bounding box (in graph coordinates)
  position: { x: number; y: number };
  size: { width: number; height: number };
  // IDs of nodes contained in this group
  nodeIds: string[];
  // Optional description
  description?: string;
  // Whether the group is collapsed (hides contained nodes)
  collapsed?: boolean;
}

/**
 * A comment/note on the node graph
 */
export interface NodeComment {
  id: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  fontSize?: number;
}

export interface NodeGraph {
  id: string;
  name: string;
  nodes: NodeInstance[];
  connections: Connection[];
  groups?: NodeGroup[];
  comments?: NodeComment[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface NodeContext {
  deltaTime: number;
  gameSpec: unknown;
  entities: Map<string, unknown>;
  pressedKeys?: Set<string>;
  getEntity: (name: string) => unknown | null;
  updateEntity: (name: string, data: unknown) => void;
  emit: (event: string, data?: unknown) => void;
}

// Port type colors for visual distinction
export const PORT_COLORS: Record<PortType, string> = {
  flow: '#ffffff',
  number: '#4ade80',
  string: '#f472b6',
  boolean: '#fb923c',
  vector2: '#60a5fa',
  entity: '#a78bfa',
  any: '#94a3b8',
};

// Node category colors
export const CATEGORY_COLORS: Record<NodeDefinition['category'], string> = {
  events: '#ef4444',
  logic: '#f59e0b',
  math: '#22c55e',
  entities: '#3b82f6',
  physics: '#8b5cf6',
  input: '#ec4899',
  animation: '#14b8a6',
  audio: '#f97316',
  motion: '#06b6d4',
  custom: '#6b7280',
};
