// Custom Node Registry - Allows users to define and register custom visual script nodes

import type { NodeDefinition, PortType, NodeContext } from '../types/NodeEditor';

/**
 * Custom node definition input - simplified interface for users
 */
export interface CustomNodeInput {
  type: string;
  title: string;
  description?: string;
  icon?: string;
  inputs?: Array<{
    id: string;
    name: string;
    type: PortType;
    defaultValue?: unknown;
  }>;
  outputs?: Array<{
    id: string;
    name: string;
    type: PortType;
  }>;
  execute: (inputs: Record<string, unknown>, context: NodeContext) => Record<string, unknown>;
}

/**
 * Custom node file format (saved in project scripts/nodes/)
 */
export interface CustomNodeFile {
  version: string;
  nodes: CustomNodeInput[];
}

/**
 * Registry for managing custom user-defined nodes
 */
class CustomNodeRegistryClass {
  private customNodes: Map<string, NodeDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Register a custom node
   */
  register(node: CustomNodeInput): void {
    const definition: NodeDefinition = {
      type: node.type,
      category: 'custom',
      title: node.title,
      description: node.description || '',
      icon: node.icon || '🔧',
      inputs: node.inputs || [],
      outputs: node.outputs || [],
      execute: node.execute,
    };

    this.customNodes.set(node.type, definition);
    this.notifyListeners();
  }

  /**
   * Register multiple nodes at once
   */
  registerAll(nodes: CustomNodeInput[]): void {
    for (const node of nodes) {
      const definition: NodeDefinition = {
        type: node.type,
        category: 'custom',
        title: node.title,
        description: node.description || '',
        icon: node.icon || '🔧',
        inputs: node.inputs || [],
        outputs: node.outputs || [],
        execute: node.execute,
      };
      this.customNodes.set(node.type, definition);
    }
    this.notifyListeners();
  }

  /**
   * Unregister a custom node
   */
  unregister(type: string): boolean {
    const result = this.customNodes.delete(type);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Clear all custom nodes
   */
  clear(): void {
    this.customNodes.clear();
    this.notifyListeners();
  }

  /**
   * Get a custom node definition by type
   */
  get(type: string): NodeDefinition | undefined {
    return this.customNodes.get(type);
  }

  /**
   * Get all custom node definitions
   */
  getAll(): NodeDefinition[] {
    return Array.from(this.customNodes.values());
  }

  /**
   * Check if a custom node type exists
   */
  has(type: string): boolean {
    return this.customNodes.has(type);
  }

  /**
   * Get count of registered custom nodes
   */
  get count(): number {
    return this.customNodes.size;
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Parse custom nodes from TypeScript/JavaScript code
   * This uses a simple eval-based approach for the execute function
   */
  parseFromCode(code: string): CustomNodeInput[] {
    const nodes: CustomNodeInput[] = [];

    // Match defineCustomNode({ ... }) calls
    const nodeRegex = /defineCustomNode\s*\(\s*(\{[\s\S]*?\})\s*\)/g;
    let match;

    while ((match = nodeRegex.exec(code)) !== null) {
      try {
        // Use Function constructor to safely evaluate the object
        const evalFn = new Function('return ' + match[1]);
        const nodeConfig = evalFn();

        if (nodeConfig.type && nodeConfig.title && nodeConfig.execute) {
          nodes.push(nodeConfig);
        }
      } catch (e) {
        console.warn('Failed to parse custom node:', e);
      }
    }

    return nodes;
  }

  /**
   * Load custom nodes from a JSON file format
   */
  loadFromJSON(json: CustomNodeFile): void {
    if (json.version && json.nodes) {
      // Convert execute functions from string if needed
      const nodes: CustomNodeInput[] = json.nodes.map(node => ({
        ...node,
        execute: typeof node.execute === 'string'
          ? new Function('inputs', 'context', node.execute as unknown as string) as CustomNodeInput['execute']
          : node.execute,
      }));
      this.registerAll(nodes);
    }
  }
}

// Singleton instance
export const CustomNodeRegistry = new CustomNodeRegistryClass();

/**
 * Helper function for defining custom nodes (used in user code)
 * This is a no-op that just returns the config - parsing happens separately
 */
export function defineCustomNode(config: CustomNodeInput): CustomNodeInput {
  return config;
}

// Example custom nodes for documentation
export const EXAMPLE_CUSTOM_NODES: CustomNodeInput[] = [
  {
    type: 'custom_health_check',
    title: 'Health Check',
    description: 'Check if entity health is below threshold',
    icon: '❤️',
    inputs: [
      { id: 'entity', name: 'Entity', type: 'entity' },
      { id: 'threshold', name: 'Threshold', type: 'number', defaultValue: 30 },
    ],
    outputs: [
      { id: 'is_low', name: 'Is Low', type: 'boolean' },
      { id: 'current', name: 'Current HP', type: 'number' },
    ],
    execute: (inputs) => {
      const entity = inputs.entity as { health?: { current: number } } | null;
      const threshold = inputs.threshold as number;
      const current = entity?.health?.current ?? 100;
      return { is_low: current < threshold, current };
    },
  },
  {
    type: 'custom_distance',
    title: 'Distance 2D',
    description: 'Calculate distance between two points',
    icon: '📏',
    inputs: [
      { id: 'x1', name: 'X1', type: 'number', defaultValue: 0 },
      { id: 'y1', name: 'Y1', type: 'number', defaultValue: 0 },
      { id: 'x2', name: 'X2', type: 'number', defaultValue: 0 },
      { id: 'y2', name: 'Y2', type: 'number', defaultValue: 0 },
    ],
    outputs: [
      { id: 'distance', name: 'Distance', type: 'number' },
    ],
    execute: (inputs) => {
      const dx = (inputs.x2 as number) - (inputs.x1 as number);
      const dy = (inputs.y2 as number) - (inputs.y1 as number);
      return { distance: Math.sqrt(dx * dx + dy * dy) };
    },
  },
  {
    type: 'custom_wave',
    title: 'Sine Wave',
    description: 'Generate a sine wave value over time',
    icon: '〰️',
    inputs: [
      { id: 'time', name: 'Time', type: 'number', defaultValue: 0 },
      { id: 'frequency', name: 'Frequency', type: 'number', defaultValue: 1 },
      { id: 'amplitude', name: 'Amplitude', type: 'number', defaultValue: 1 },
      { id: 'offset', name: 'Offset', type: 'number', defaultValue: 0 },
    ],
    outputs: [
      { id: 'value', name: 'Value', type: 'number' },
    ],
    execute: (inputs) => {
      const time = inputs.time as number;
      const frequency = inputs.frequency as number;
      const amplitude = inputs.amplitude as number;
      const offset = inputs.offset as number;
      return { value: Math.sin(time * frequency * Math.PI * 2) * amplitude + offset };
    },
  },
  {
    type: 'custom_clamp_vector',
    title: 'Clamp Vector',
    description: 'Clamp vector magnitude to max length',
    icon: '📐',
    inputs: [
      { id: 'vector', name: 'Vector', type: 'vector2' },
      { id: 'max_length', name: 'Max Length', type: 'number', defaultValue: 1 },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'vector2' },
      { id: 'was_clamped', name: 'Was Clamped', type: 'boolean' },
    ],
    execute: (inputs) => {
      const vec = inputs.vector as { x: number; y: number } || { x: 0, y: 0 };
      const maxLen = inputs.max_length as number;
      const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

      if (len > maxLen && len > 0) {
        const scale = maxLen / len;
        return {
          result: { x: vec.x * scale, y: vec.y * scale },
          was_clamped: true,
        };
      }
      return { result: vec, was_clamped: false };
    },
  },
];

export default CustomNodeRegistry;
