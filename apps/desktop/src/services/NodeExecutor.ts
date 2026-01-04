// Node Graph Executor - Runs visual scripts at runtime
import type { NodeGraph, NodeInstance, Connection, NodeContext, NodeDefinition } from '../types/NodeEditor';
import { NODE_LIBRARY } from './NodeLibrary';

export interface ExecutionState {
  nodeOutputs: Map<string, Record<string, unknown>>;
  activeFlows: Set<string>;
  variables: Map<string, unknown>;
}

export class NodeExecutor {
  private graph: NodeGraph;
  private context: NodeContext;
  private state: ExecutionState;
  private eventListeners: Map<string, Set<string>> = new Map();

  constructor(graph: NodeGraph, context: NodeContext) {
    this.graph = graph;
    this.context = context;
    this.state = {
      nodeOutputs: new Map(),
      activeFlows: new Set(),
      variables: new Map(),
    };
    this.registerEventNodes();
  }

  // Find all event nodes and register them
  private registerEventNodes(): void {
    for (const node of this.graph.nodes) {
      const definition = NODE_LIBRARY[node.type];
      if (definition?.category === 'events') {
        const eventType = this.getEventType(node);
        if (eventType) {
          if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
          }
          this.eventListeners.get(eventType)!.add(node.id);
        }
      }
    }
  }

  private getEventType(node: NodeInstance): string | null {
    switch (node.type) {
      case 'event_start': return 'start';
      case 'event_update': return 'update';
      case 'event_collision': return 'collision';
      case 'event_key_press': return `key_${node.data.key || 'Space'}`;
      case 'event_mouse_click': return 'mouse_click';
      case 'event_custom': return `custom_${node.data.eventName || 'event'}`;
      default: return null;
    }
  }

  // Trigger an event and execute connected nodes
  triggerEvent(eventType: string, eventData?: unknown): void {
    const nodeIds = this.eventListeners.get(eventType);
    if (!nodeIds) return;

    for (const nodeId of nodeIds) {
      this.executeFromNode(nodeId, { eventData });
    }
  }

  // Execute flow starting from a specific node
  private executeFromNode(nodeId: string, additionalInputs: Record<string, unknown> = {}): void {
    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const definition = NODE_LIBRARY[node.type];
    if (!definition) return;

    // Gather inputs from connected nodes and defaults
    const inputs = this.gatherInputs(node, definition, additionalInputs);

    // Execute the node
    let outputs: Record<string, unknown> = {};
    if (definition.execute) {
      try {
        outputs = definition.execute(inputs, this.context);
      } catch (error) {
        console.error(`Error executing node ${node.id} (${node.type}):`, error);
        return;
      }
    }

    // Store outputs for connected nodes
    this.state.nodeOutputs.set(node.id, outputs);

    // Follow flow connections
    const flowOutputs = definition.outputs.filter(o => o.type === 'flow');
    for (const flowOutput of flowOutputs) {
      // Check if this flow should execute (for branch nodes)
      if (flowOutput.id === 'true' && !outputs.condition) continue;
      if (flowOutput.id === 'false' && outputs.condition) continue;

      const connections = this.findConnectionsFrom(node.id, flowOutput.id);
      for (const connection of connections) {
        this.executeFromNode(connection.toNodeId);
      }
    }
  }

  private gatherInputs(
    node: NodeInstance,
    definition: NodeDefinition,
    additionalInputs: Record<string, unknown>
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = { ...additionalInputs };

    for (const input of definition.inputs) {
      // Check for connection
      const connection = this.findConnectionTo(node.id, input.id);
      if (connection) {
        const sourceOutputs = this.state.nodeOutputs.get(connection.fromNodeId);
        if (sourceOutputs && connection.fromPortId in sourceOutputs) {
          inputs[input.id] = sourceOutputs[connection.fromPortId];
          continue;
        }
        // If connected but no value yet, execute source node first (for non-flow inputs)
        if (input.type !== 'flow') {
          this.executeValueNode(connection.fromNodeId);
          const newOutputs = this.state.nodeOutputs.get(connection.fromNodeId);
          if (newOutputs && connection.fromPortId in newOutputs) {
            inputs[input.id] = newOutputs[connection.fromPortId];
            continue;
          }
        }
      }

      // Check node data for overrides
      if (input.id in node.data) {
        inputs[input.id] = node.data[input.id];
        continue;
      }

      // Use default value
      if (input.defaultValue !== undefined) {
        inputs[input.id] = input.defaultValue;
      }
    }

    return inputs;
  }

  // Execute a value-only node (no flow connections)
  private executeValueNode(nodeId: string): void {
    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const definition = NODE_LIBRARY[node.type];
    if (!definition || !definition.execute) return;

    const inputs = this.gatherInputs(node, definition, {});
    const outputs = definition.execute(inputs, this.context);
    this.state.nodeOutputs.set(node.id, outputs);
  }

  private findConnectionTo(nodeId: string, portId: string): Connection | undefined {
    return this.graph.connections.find(
      c => c.toNodeId === nodeId && c.toPortId === portId
    );
  }

  private findConnectionsFrom(nodeId: string, portId: string): Connection[] {
    return this.graph.connections.filter(
      c => c.fromNodeId === nodeId && c.fromPortId === portId
    );
  }

  // Update the graph (for hot reloading)
  updateGraph(graph: NodeGraph): void {
    this.graph = graph;
    this.eventListeners.clear();
    this.registerEventNodes();
  }

  // Get current variable values
  getVariables(): Map<string, unknown> {
    return this.state.variables;
  }

  // Set a variable
  setVariable(name: string, value: unknown): void {
    this.state.variables.set(name, value);
  }
}

// Create a game context for node execution
export function createNodeContext(
  gameSpec: unknown,
  deltaTime: number = 0.016
): NodeContext {
  const entities = new Map<string, unknown>();

  // Extract entities from game spec
  if (gameSpec && typeof gameSpec === 'object' && 'entities' in gameSpec) {
    const specEntities = (gameSpec as { entities: Array<{ name: string }> }).entities;
    for (const entity of specEntities) {
      entities.set(entity.name, entity);
    }
  }

  return {
    deltaTime,
    gameSpec,
    entities,
    getEntity: (name: string) => entities.get(name) || null,
    updateEntity: (name: string, data: unknown) => {
      entities.set(name, data);
    },
    emit: (event: string, data?: unknown) => {
      console.log(`[NodeExecutor] Event emitted: ${event}`, data);
    },
  };
}

// Singleton executor manager for the running game
class ExecutorManager {
  private executors: Map<string, NodeExecutor> = new Map();

  register(graphId: string, executor: NodeExecutor): void {
    this.executors.set(graphId, executor);
  }

  unregister(graphId: string): void {
    this.executors.delete(graphId);
  }

  get(graphId: string): NodeExecutor | undefined {
    return this.executors.get(graphId);
  }

  triggerAll(eventType: string, eventData?: unknown): void {
    for (const executor of this.executors.values()) {
      executor.triggerEvent(eventType, eventData);
    }
  }

  updateAll(deltaTime: number): void {
    this.triggerAll('update', { deltaTime });
  }
}

export const executorManager = new ExecutorManager();
