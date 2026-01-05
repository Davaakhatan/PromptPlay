// Node Preset Service - Save and load node configurations as reusable presets

import type { NodeInstance, Connection, NodeGraph } from '../types/NodeEditor';

/**
 * A node preset - a reusable collection of nodes and connections
 */
export interface NodePreset {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  // The nodes in this preset (positions are relative to center)
  nodes: NodeInstance[];
  // Connections between nodes in this preset
  connections: Connection[];
}

/**
 * Preset library storage format
 */
export interface PresetLibrary {
  version: string;
  presets: NodePreset[];
}

/**
 * Options for instantiating a preset into a graph
 */
export interface InstantiateOptions {
  // Position to place the preset (center point)
  position?: { x: number; y: number };
  // Offset from original positions
  offset?: { x: number; y: number };
  // Prefix for new node IDs to avoid collisions
  idPrefix?: string;
}

// Storage key for presets
const STORAGE_KEY = 'promptplay_node_presets';

/**
 * Service for managing node presets
 */
class NodePresetServiceClass {
  private presets: Map<string, NodePreset> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Generate a unique ID for a preset
   */
  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique IDs for nodes when instantiating
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save a selection of nodes as a preset
   */
  createPreset(
    name: string,
    nodes: NodeInstance[],
    connections: Connection[],
    options?: { description?: string; category?: string; icon?: string }
  ): NodePreset {
    if (nodes.length === 0) {
      throw new Error('Cannot create preset with no nodes');
    }

    // Calculate center of selection to make positions relative
    const centerX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
    const centerY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;

    // Create relative positions
    const relativeNodes: NodeInstance[] = nodes.map(node => ({
      ...node,
      position: {
        x: node.position.x - centerX,
        y: node.position.y - centerY,
      },
    }));

    // Filter connections to only include those between selected nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const internalConnections = connections.filter(
      conn => nodeIds.has(conn.fromNodeId) && nodeIds.has(conn.toNodeId)
    );

    const now = Date.now();
    const preset: NodePreset = {
      id: this.generateId(),
      name,
      description: options?.description,
      category: options?.category || 'Custom',
      icon: options?.icon || '📦',
      createdAt: now,
      updatedAt: now,
      nodes: relativeNodes,
      connections: internalConnections,
    };

    this.presets.set(preset.id, preset);
    this.saveToStorage();
    this.notifyListeners();

    return preset;
  }

  /**
   * Instantiate a preset into a graph, creating new nodes with unique IDs
   */
  instantiatePreset(
    presetId: string,
    options: InstantiateOptions = {}
  ): { nodes: NodeInstance[]; connections: Connection[] } {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    const position = options.position || { x: 0, y: 0 };
    const offset = options.offset || { x: 0, y: 0 };
    const idPrefix = options.idPrefix || this.generateNodeId();

    // Map old node IDs to new ones
    const idMap = new Map<string, string>();

    // Create new nodes with unique IDs and adjusted positions
    const newNodes: NodeInstance[] = preset.nodes.map(node => {
      const newId = `${idPrefix}_${node.id}`;
      idMap.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + position.x + offset.x,
          y: node.position.y + position.y + offset.y,
        },
        data: { ...node.data },
      };
    });

    // Create new connections with updated node IDs
    const newConnections: Connection[] = preset.connections.map(conn => ({
      id: `${idPrefix}_${conn.id}`,
      fromNodeId: idMap.get(conn.fromNodeId) || conn.fromNodeId,
      fromPortId: conn.fromPortId,
      toNodeId: idMap.get(conn.toNodeId) || conn.toNodeId,
      toPortId: conn.toPortId,
    }));

    return { nodes: newNodes, connections: newConnections };
  }

  /**
   * Get a preset by ID
   */
  getPreset(id: string): NodePreset | undefined {
    return this.presets.get(id);
  }

  /**
   * Get all presets
   */
  getAllPresets(): NodePreset[] {
    return Array.from(this.presets.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: string): NodePreset[] {
    return this.getAllPresets().filter(p => p.category === category);
  }

  /**
   * Get all preset categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const preset of this.presets.values()) {
      if (preset.category) {
        categories.add(preset.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Update a preset's metadata
   */
  updatePreset(
    id: string,
    updates: Partial<Pick<NodePreset, 'name' | 'description' | 'category' | 'icon'>>
  ): NodePreset | undefined {
    const preset = this.presets.get(id);
    if (!preset) return undefined;

    const updated = {
      ...preset,
      ...updates,
      updatedAt: Date.now(),
    };

    this.presets.set(id, updated);
    this.saveToStorage();
    this.notifyListeners();

    return updated;
  }

  /**
   * Delete a preset
   */
  deletePreset(id: string): boolean {
    const result = this.presets.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Import presets from a library object
   */
  importPresets(library: PresetLibrary, overwrite = false): number {
    let imported = 0;

    for (const preset of library.presets) {
      if (!overwrite && this.presets.has(preset.id)) {
        // Generate new ID if not overwriting
        const newPreset = { ...preset, id: this.generateId() };
        this.presets.set(newPreset.id, newPreset);
      } else {
        this.presets.set(preset.id, preset);
      }
      imported++;
    }

    if (imported > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }

    return imported;
  }

  /**
   * Export all presets as a library object
   */
  exportPresets(): PresetLibrary {
    return {
      version: '1.0.0',
      presets: this.getAllPresets(),
    };
  }

  /**
   * Export specific presets
   */
  exportSelectedPresets(ids: string[]): PresetLibrary {
    const presets = ids
      .map(id => this.presets.get(id))
      .filter((p): p is NodePreset => p !== undefined);

    return {
      version: '1.0.0',
      presets,
    };
  }

  /**
   * Subscribe to preset changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get preset count
   */
  get count(): number {
    return this.presets.size;
  }

  /**
   * Clear all presets
   */
  clear(): void {
    this.presets.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Load presets from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const library: PresetLibrary = JSON.parse(stored);
        if (library.presets) {
          for (const preset of library.presets) {
            this.presets.set(preset.id, preset);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load node presets from storage:', e);
    }
  }

  /**
   * Save presets to localStorage
   */
  private saveToStorage(): void {
    try {
      const library = this.exportPresets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    } catch (e) {
      console.warn('Failed to save node presets to storage:', e);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const NodePresetService = new NodePresetServiceClass();

// Built-in preset templates
export const BUILT_IN_PRESETS: NodePreset[] = [
  {
    id: 'builtin_player_controller',
    name: 'Player Controller',
    description: 'Basic WASD movement with keyboard input',
    category: 'Templates',
    icon: '🎮',
    createdAt: 0,
    updatedAt: 0,
    nodes: [
      {
        id: 'input_1',
        type: 'get_axis',
        position: { x: -200, y: 0 },
        data: {},
      },
      {
        id: 'entity_1',
        type: 'get_entity',
        position: { x: -200, y: 150 },
        data: { entityName: 'Player' },
      },
      {
        id: 'velocity_1',
        type: 'set_velocity',
        position: { x: 100, y: 50 },
        data: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'input_1',
        fromPortId: 'horizontal',
        toNodeId: 'velocity_1',
        toPortId: 'vx',
      },
      {
        id: 'conn_2',
        fromNodeId: 'entity_1',
        fromPortId: 'entity',
        toNodeId: 'velocity_1',
        toPortId: 'entity',
      },
    ],
  },
  {
    id: 'builtin_health_damage',
    name: 'Health & Damage',
    description: 'Check health and trigger events when low',
    category: 'Templates',
    icon: '❤️',
    createdAt: 0,
    updatedAt: 0,
    nodes: [
      {
        id: 'entity_1',
        type: 'get_entity',
        position: { x: -200, y: 0 },
        data: { entityName: 'Player' },
      },
      {
        id: 'compare_1',
        type: 'compare',
        position: { x: 50, y: 0 },
        data: { operator: '<' },
      },
      {
        id: 'const_1',
        type: 'constant',
        position: { x: -150, y: 100 },
        data: { value: 30 },
      },
      {
        id: 'branch_1',
        type: 'branch',
        position: { x: 250, y: 0 },
        data: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'const_1',
        fromPortId: 'value',
        toNodeId: 'compare_1',
        toPortId: 'b',
      },
      {
        id: 'conn_2',
        fromNodeId: 'compare_1',
        fromPortId: 'result',
        toNodeId: 'branch_1',
        toPortId: 'condition',
      },
    ],
  },
  {
    id: 'builtin_bounce_animation',
    name: 'Bounce Animation',
    description: 'Bouncy easing animation loop',
    category: 'Templates',
    icon: '⚾',
    createdAt: 0,
    updatedAt: 0,
    nodes: [
      {
        id: 'timer_1',
        type: 'timer',
        position: { x: -200, y: 0 },
        data: { duration: 1, loop: true },
      },
      {
        id: 'ease_1',
        type: 'ease_out_bounce',
        position: { x: 50, y: 0 },
        data: {},
      },
      {
        id: 'lerp_1',
        type: 'keyframe_lerp',
        position: { x: 250, y: 0 },
        data: { from: 0, to: 100 },
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'timer_1',
        fromPortId: 't',
        toNodeId: 'ease_1',
        toPortId: 't',
      },
      {
        id: 'conn_2',
        fromNodeId: 'ease_1',
        fromPortId: 'result',
        toNodeId: 'lerp_1',
        toPortId: 'eased_t',
      },
    ],
  },
  {
    id: 'builtin_follow_target',
    name: 'Follow Target',
    description: 'Smooth follow behavior with smooth damp',
    category: 'Templates',
    icon: '🎯',
    createdAt: 0,
    updatedAt: 0,
    nodes: [
      {
        id: 'entity_1',
        type: 'get_entity',
        position: { x: -300, y: 0 },
        data: { entityName: 'Follower' },
      },
      {
        id: 'entity_2',
        type: 'get_entity',
        position: { x: -300, y: 150 },
        data: { entityName: 'Target' },
      },
      {
        id: 'smooth_1',
        type: 'smooth_damp',
        position: { x: 0, y: 50 },
        data: { smooth_time: 0.3 },
      },
      {
        id: 'setpos_1',
        type: 'set_position',
        position: { x: 250, y: 50 },
        data: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'entity_1',
        fromPortId: 'entity',
        toNodeId: 'setpos_1',
        toPortId: 'entity',
      },
      {
        id: 'conn_2',
        fromNodeId: 'smooth_1',
        fromPortId: 'value',
        toNodeId: 'setpos_1',
        toPortId: 'x',
      },
    ],
  },
  {
    id: 'builtin_spring_motion',
    name: 'Spring Motion',
    description: 'Physics-based spring animation',
    category: 'Templates',
    icon: '🔄',
    createdAt: 0,
    updatedAt: 0,
    nodes: [
      {
        id: 'spring_1',
        type: 'spring',
        position: { x: 0, y: 0 },
        data: { stiffness: 100, damping: 10, mass: 1 },
      },
      {
        id: 'const_1',
        type: 'constant',
        position: { x: -200, y: 50 },
        data: { value: 200 },
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'const_1',
        fromPortId: 'value',
        toNodeId: 'spring_1',
        toPortId: 'target',
      },
    ],
  },
];

export default NodePresetService;
