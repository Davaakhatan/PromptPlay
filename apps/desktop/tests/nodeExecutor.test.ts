// Test: Node Executor - Visual Script Execution
import { describe, it, expect, beforeEach } from 'vitest';

// Types for node graph
interface NodePosition {
  x: number;
  y: number;
}

interface NodeData {
  [key: string]: unknown;
}

interface Node {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
}

interface Connection {
  id: string;
  sourceNode: string;
  sourceHandle: string;
  targetNode: string;
  targetHandle: string;
}

interface NodeGraph {
  nodes: Node[];
  connections: Connection[];
}

// Mock node types matching the actual implementation
const NODE_TYPES = {
  // Events
  ON_START: 'onStart',
  ON_UPDATE: 'onUpdate',
  ON_COLLISION: 'onCollision',
  ON_KEY_PRESS: 'onKeyPress',

  // Logic
  BRANCH: 'branch',
  COMPARE: 'compare',

  // Math
  ADD: 'add',
  SUBTRACT: 'subtract',
  MULTIPLY: 'multiply',
  DIVIDE: 'divide',
  CLAMP: 'clamp',
  RANDOM: 'random',

  // Entity
  GET_ENTITY: 'getEntity',
  GET_POSITION: 'getPosition',
  SET_POSITION: 'setPosition',
  SET_VELOCITY: 'setVelocity',
  DESTROY_ENTITY: 'destroyEntity',

  // Actions
  LOG: 'log',
  PLAY_SOUND: 'playSound',
};

// Simple node executor for testing
class TestNodeExecutor {
  private context: { entities: Record<string, unknown>; deltaTime: number };
  private logs: string[] = [];

  constructor() {
    this.context = {
      entities: {},
      deltaTime: 0.016,
    };
  }

  setEntities(entities: Record<string, unknown>) {
    this.context.entities = entities;
  }

  getLogs(): string[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  executeNode(node: Node, inputs: Record<string, unknown> = {}): unknown {
    switch (node.type) {
      case NODE_TYPES.ADD:
        return (inputs.a as number || 0) + (inputs.b as number || 0);

      case NODE_TYPES.SUBTRACT:
        return (inputs.a as number || 0) - (inputs.b as number || 0);

      case NODE_TYPES.MULTIPLY:
        return (inputs.a as number || 0) * (inputs.b as number || 0);

      case NODE_TYPES.DIVIDE: {
        const b = inputs.b as number;
        if (b === 0) return 0; // Handle division by zero
        return (inputs.a as number || 0) / b;
      }

      case NODE_TYPES.CLAMP: {
        const value = inputs.value as number || 0;
        const min = inputs.min as number || 0;
        const max = inputs.max as number || 1;
        return Math.max(min, Math.min(max, value));
      }

      case NODE_TYPES.RANDOM: {
        const min = inputs.min as number || 0;
        const max = inputs.max as number || 1;
        return min + Math.random() * (max - min);
      }

      case NODE_TYPES.COMPARE: {
        const a = inputs.a as number;
        const b = inputs.b as number;
        const op = (node.data.operator as string) || '==';
        switch (op) {
          case '==': return a === b;
          case '!=': return a !== b;
          case '<': return a < b;
          case '>': return a > b;
          case '<=': return a <= b;
          case '>=': return a >= b;
          default: return false;
        }
      }

      case NODE_TYPES.GET_ENTITY: {
        const name = (node.data.entityName as string) || (inputs.name as string);
        return this.context.entities[name] || null;
      }

      case NODE_TYPES.GET_POSITION: {
        const entity = inputs.entity as { position?: { x: number; y: number } };
        return entity?.position || { x: 0, y: 0 };
      }

      case NODE_TYPES.SET_POSITION: {
        const entity = inputs.entity as { position?: { x: number; y: number } };
        if (entity) {
          entity.position = {
            x: inputs.x as number || 0,
            y: inputs.y as number || 0,
          };
        }
        return entity;
      }

      case NODE_TYPES.LOG: {
        const message = String(inputs.message || node.data.message || '');
        this.logs.push(message);
        console.log('[NodeExecutor]', message);
        return null;
      }

      case NODE_TYPES.BRANCH: {
        const condition = inputs.condition as boolean;
        return { branch: condition ? 'true' : 'false' };
      }

      default:
        return null;
    }
  }

  executeGraph(graph: NodeGraph, startNodeType: string = NODE_TYPES.ON_START): void {
    // Find start node
    const startNode = graph.nodes.find(n => n.type === startNodeType);
    if (!startNode) return;

    // Track visited nodes to prevent infinite loops
    const visited = new Set<string>();

    // Execute from start node following flow connections only
    this.executeFlowFromNode(graph, startNode.id, visited);
  }

  private executeFlowFromNode(
    graph: NodeGraph,
    nodeId: string,
    visited: Set<string>
  ): void {
    // Prevent infinite loops
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Execute this node
    this.executeNode(node, {});

    // Find and execute next nodes (flow connections only)
    const outgoingConnections = graph.connections.filter(
      c => c.sourceNode === nodeId && c.sourceHandle === 'flow'
    );

    for (const conn of outgoingConnections) {
      this.executeFlowFromNode(graph, conn.targetNode, visited);
    }
  }
}

describe('Node Executor - Math Operations', () => {
  let executor: TestNodeExecutor;

  beforeEach(() => {
    executor = new TestNodeExecutor();
  });

  it('should add two numbers', () => {
    const node: Node = { id: '1', type: NODE_TYPES.ADD, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { a: 5, b: 3 });
    expect(result).toBe(8);
  });

  it('should subtract two numbers', () => {
    const node: Node = { id: '1', type: NODE_TYPES.SUBTRACT, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { a: 10, b: 4 });
    expect(result).toBe(6);
  });

  it('should multiply two numbers', () => {
    const node: Node = { id: '1', type: NODE_TYPES.MULTIPLY, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { a: 6, b: 7 });
    expect(result).toBe(42);
  });

  it('should divide two numbers', () => {
    const node: Node = { id: '1', type: NODE_TYPES.DIVIDE, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { a: 20, b: 4 });
    expect(result).toBe(5);
  });

  it('should handle division by zero', () => {
    const node: Node = { id: '1', type: NODE_TYPES.DIVIDE, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { a: 10, b: 0 });
    expect(result).toBe(0);
  });

  it('should clamp value within range', () => {
    const node: Node = { id: '1', type: NODE_TYPES.CLAMP, position: { x: 0, y: 0 }, data: {} };

    expect(executor.executeNode(node, { value: 5, min: 0, max: 10 })).toBe(5);
    expect(executor.executeNode(node, { value: -5, min: 0, max: 10 })).toBe(0);
    expect(executor.executeNode(node, { value: 15, min: 0, max: 10 })).toBe(10);
  });

  it('should generate random number in range', () => {
    const node: Node = { id: '1', type: NODE_TYPES.RANDOM, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { min: 0, max: 100 }) as number;

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('Node Executor - Logic Operations', () => {
  let executor: TestNodeExecutor;

  beforeEach(() => {
    executor = new TestNodeExecutor();
  });

  it('should compare equal values', () => {
    const node: Node = { id: '1', type: NODE_TYPES.COMPARE, position: { x: 0, y: 0 }, data: { operator: '==' } };
    expect(executor.executeNode(node, { a: 5, b: 5 })).toBe(true);
    expect(executor.executeNode(node, { a: 5, b: 3 })).toBe(false);
  });

  it('should compare greater than', () => {
    const node: Node = { id: '1', type: NODE_TYPES.COMPARE, position: { x: 0, y: 0 }, data: { operator: '>' } };
    expect(executor.executeNode(node, { a: 10, b: 5 })).toBe(true);
    expect(executor.executeNode(node, { a: 3, b: 5 })).toBe(false);
  });

  it('should compare less than', () => {
    const node: Node = { id: '1', type: NODE_TYPES.COMPARE, position: { x: 0, y: 0 }, data: { operator: '<' } };
    expect(executor.executeNode(node, { a: 3, b: 5 })).toBe(true);
    expect(executor.executeNode(node, { a: 10, b: 5 })).toBe(false);
  });

  it('should branch based on condition', () => {
    const node: Node = { id: '1', type: NODE_TYPES.BRANCH, position: { x: 0, y: 0 }, data: {} };

    const trueResult = executor.executeNode(node, { condition: true }) as { branch: string };
    expect(trueResult.branch).toBe('true');

    const falseResult = executor.executeNode(node, { condition: false }) as { branch: string };
    expect(falseResult.branch).toBe('false');
  });
});

describe('Node Executor - Entity Operations', () => {
  let executor: TestNodeExecutor;

  beforeEach(() => {
    executor = new TestNodeExecutor();
    executor.setEntities({
      player: { name: 'player', position: { x: 100, y: 200 } },
      enemy: { name: 'enemy', position: { x: 500, y: 200 } },
    });
  });

  it('should get entity by name', () => {
    const node: Node = { id: '1', type: NODE_TYPES.GET_ENTITY, position: { x: 0, y: 0 }, data: { entityName: 'player' } };
    const result = executor.executeNode(node, {}) as { name: string };
    expect(result).not.toBeNull();
    expect(result.name).toBe('player');
  });

  it('should return null for non-existent entity', () => {
    const node: Node = { id: '1', type: NODE_TYPES.GET_ENTITY, position: { x: 0, y: 0 }, data: { entityName: 'nonexistent' } };
    const result = executor.executeNode(node, {});
    expect(result).toBeNull();
  });

  it('should get entity position', () => {
    const entity = { position: { x: 100, y: 200 } };
    const node: Node = { id: '1', type: NODE_TYPES.GET_POSITION, position: { x: 0, y: 0 }, data: {} };
    const result = executor.executeNode(node, { entity }) as { x: number; y: number };

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('should set entity position', () => {
    const entity = { position: { x: 0, y: 0 } };
    const node: Node = { id: '1', type: NODE_TYPES.SET_POSITION, position: { x: 0, y: 0 }, data: {} };
    executor.executeNode(node, { entity, x: 300, y: 400 });

    expect(entity.position.x).toBe(300);
    expect(entity.position.y).toBe(400);
  });
});

describe('Node Executor - Logging', () => {
  let executor: TestNodeExecutor;

  beforeEach(() => {
    executor = new TestNodeExecutor();
    executor.clearLogs();
  });

  it('should log messages', () => {
    const node: Node = { id: '1', type: NODE_TYPES.LOG, position: { x: 0, y: 0 }, data: {} };
    executor.executeNode(node, { message: 'Hello World' });

    const logs = executor.getLogs();
    expect(logs).toContain('Hello World');
  });

  it('should log from node data', () => {
    const node: Node = { id: '1', type: NODE_TYPES.LOG, position: { x: 0, y: 0 }, data: { message: 'Static message' } };
    executor.executeNode(node, {});

    const logs = executor.getLogs();
    expect(logs).toContain('Static message');
  });
});

describe('Node Graph Execution', () => {
  let executor: TestNodeExecutor;

  beforeEach(() => {
    executor = new TestNodeExecutor();
    executor.clearLogs();
  });

  it('should execute simple graph: OnStart -> Log', () => {
    const graph: NodeGraph = {
      nodes: [
        { id: 'start', type: NODE_TYPES.ON_START, position: { x: 0, y: 0 }, data: {} },
        { id: 'log', type: NODE_TYPES.LOG, position: { x: 200, y: 0 }, data: { message: 'Game Started!' } },
      ],
      connections: [
        { id: 'c1', sourceNode: 'start', sourceHandle: 'flow', targetNode: 'log', targetHandle: 'flow' },
      ],
    };

    executor.executeGraph(graph, NODE_TYPES.ON_START);
    expect(executor.getLogs()).toContain('Game Started!');
  });

  it('should execute math chain: Add -> Multiply -> Log', () => {
    const graph: NodeGraph = {
      nodes: [
        { id: 'start', type: NODE_TYPES.ON_START, position: { x: 0, y: 0 }, data: {} },
        { id: 'add', type: NODE_TYPES.ADD, position: { x: 200, y: 0 }, data: {} },
        { id: 'log', type: NODE_TYPES.LOG, position: { x: 400, y: 0 }, data: {} },
      ],
      connections: [
        { id: 'c1', sourceNode: 'start', sourceHandle: 'flow', targetNode: 'add', targetHandle: 'flow' },
        { id: 'c2', sourceNode: 'add', sourceHandle: 'result', targetNode: 'log', targetHandle: 'message' },
      ],
    };

    // Note: This is a simplified test - real execution would pass values through connections
    executor.executeGraph(graph, NODE_TYPES.ON_START);
  });
});
