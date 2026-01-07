// Custom Node Registry - Allows users to define and register custom visual script nodes

import type { NodeDefinition, PortType, NodeContext } from '../types/NodeEditor';

/**
 * Valid port types for custom nodes
 */
const VALID_PORT_TYPES: readonly string[] = [
  'flow', 'boolean', 'number', 'string', 'vector2', 'color', 'entity', 'any'
] as const;

/**
 * Reserved node type prefixes (built-in nodes)
 */
const RESERVED_PREFIXES = ['event_', 'action_', 'control_', 'math_', 'logic_', 'input_'];

/**
 * Validation result for custom nodes
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

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
   * Validate a custom node definition
   */
  validate(node: Partial<CustomNodeInput>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!node.type) {
      errors.push('Node type is required');
    } else {
      // Type format validation
      if (!/^[a-z][a-z0-9_]*$/.test(node.type)) {
        errors.push('Node type must be lowercase alphanumeric with underscores, starting with a letter');
      }
      // Check for reserved prefixes
      if (RESERVED_PREFIXES.some(prefix => node.type!.startsWith(prefix))) {
        errors.push(`Node type cannot start with reserved prefix: ${RESERVED_PREFIXES.join(', ')}`);
      }
      // Check for duplicates
      if (this.customNodes.has(node.type)) {
        warnings.push(`Node type "${node.type}" already exists and will be overwritten`);
      }
    }

    if (!node.title) {
      errors.push('Node title is required');
    } else if (node.title.length < 2) {
      errors.push('Node title must be at least 2 characters');
    } else if (node.title.length > 50) {
      warnings.push('Node title is very long (>50 chars), consider shortening');
    }

    if (!node.execute) {
      errors.push('Node execute function is required');
    } else if (typeof node.execute !== 'function') {
      errors.push('Node execute must be a function');
    }

    // Validate inputs
    if (node.inputs) {
      const inputIds = new Set<string>();
      for (let i = 0; i < node.inputs.length; i++) {
        const input = node.inputs[i];
        if (!input.id) {
          errors.push(`Input ${i}: id is required`);
        } else if (inputIds.has(input.id)) {
          errors.push(`Input ${i}: duplicate id "${input.id}"`);
        } else {
          inputIds.add(input.id);
        }

        if (!input.name) {
          errors.push(`Input ${i}: name is required`);
        }

        if (!input.type) {
          errors.push(`Input ${i}: type is required`);
        } else if (!VALID_PORT_TYPES.includes(input.type)) {
          errors.push(`Input ${i}: invalid type "${input.type}". Valid types: ${VALID_PORT_TYPES.join(', ')}`);
        }
      }
    }

    // Validate outputs
    if (node.outputs) {
      const outputIds = new Set<string>();
      for (let i = 0; i < node.outputs.length; i++) {
        const output = node.outputs[i];
        if (!output.id) {
          errors.push(`Output ${i}: id is required`);
        } else if (outputIds.has(output.id)) {
          errors.push(`Output ${i}: duplicate id "${output.id}"`);
        } else {
          outputIds.add(output.id);
        }

        if (!output.name) {
          errors.push(`Output ${i}: name is required`);
        }

        if (!output.type) {
          errors.push(`Output ${i}: type is required`);
        } else if (!VALID_PORT_TYPES.includes(output.type)) {
          errors.push(`Output ${i}: invalid type "${output.type}". Valid types: ${VALID_PORT_TYPES.join(', ')}`);
        }
      }
    }

    // Warnings for best practices
    if (!node.description) {
      warnings.push('Consider adding a description for better documentation');
    }
    if (!node.outputs || node.outputs.length === 0) {
      warnings.push('Node has no outputs - it may not be useful in a graph');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Register a custom node with validation
   */
  register(node: CustomNodeInput, options?: { skipValidation?: boolean }): ValidationResult {
    // Validate unless explicitly skipped
    if (!options?.skipValidation) {
      const validation = this.validate(node);
      if (!validation.valid) {
        console.error('[CustomNodeRegistry] Validation failed:', validation.errors);
        return validation;
      }
      if (validation.warnings.length > 0) {
        console.warn('[CustomNodeRegistry] Validation warnings:', validation.warnings);
      }
    }

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

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Register multiple nodes at once with validation
   */
  registerAll(nodes: CustomNodeInput[], options?: { skipValidation?: boolean }): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const validNodes: CustomNodeInput[] = [];

    // Validate all nodes first
    for (const node of nodes) {
      if (!options?.skipValidation) {
        const validation = this.validate(node);
        if (!validation.valid) {
          allErrors.push(`Node "${node.type || 'unnamed'}": ${validation.errors.join(', ')}`);
        } else {
          validNodes.push(node);
          allWarnings.push(...validation.warnings.map(w => `Node "${node.type}": ${w}`));
        }
      } else {
        validNodes.push(node);
      }
    }

    // Only register valid nodes
    for (const node of validNodes) {
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

    if (validNodes.length > 0) {
      this.notifyListeners();
    }

    if (allErrors.length > 0) {
      console.error('[CustomNodeRegistry] Some nodes failed validation:', allErrors);
    }
    if (allWarnings.length > 0) {
      console.warn('[CustomNodeRegistry] Validation warnings:', allWarnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
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
    icon: '♥',
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
    icon: '∿',
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
