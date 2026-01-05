/**
 * Code-to-Visual Script Service (WP13)
 * Analyzes code patterns and generates visual script representations
 */

import type { NodeGraph, ShaderGraph, BehaviorTree, StateMachine } from '../components/VisualEditorTypes';

// Pattern detection types
export type DetectedPattern =
  | { type: 'state_machine'; states: string[]; transitions: StateTransition[] }
  | { type: 'behavior_tree'; nodes: BehaviorNode[] }
  | { type: 'node_graph'; nodes: FlowNode[]; connections: Connection[] }
  | { type: 'shader'; operations: ShaderOperation[] };

interface StateTransition {
  from: string;
  to: string;
  condition: string;
}

interface BehaviorNode {
  type: 'selector' | 'sequence' | 'condition' | 'action';
  name: string;
  children?: BehaviorNode[];
  code?: string;
}

interface FlowNode {
  id: string;
  type: string;
  label: string;
  inputs?: string[];
  outputs?: string[];
  code?: string;
}

interface Connection {
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}

interface ShaderOperation {
  type: 'math' | 'color' | 'texture' | 'time' | 'uv';
  operation: string;
  inputs: string[];
  output: string;
}

// AST-like representation for simple parsing
interface CodeBlock {
  type: 'function' | 'if' | 'switch' | 'loop' | 'assignment' | 'call';
  name?: string;
  condition?: string;
  cases?: { value: string; body: CodeBlock[] }[];
  body?: CodeBlock[];
  code: string;
}

/**
 * Code-to-Visual Script Service
 * Detects patterns in code and generates visual representations
 */
export class CodeToVisualService {
  private static instance: CodeToVisualService;

  private constructor() {}

  static getInstance(): CodeToVisualService {
    if (!CodeToVisualService.instance) {
      CodeToVisualService.instance = new CodeToVisualService();
    }
    return CodeToVisualService.instance;
  }

  /**
   * Analyze code and detect which visual editor would be best
   */
  analyzeCode(code: string): {
    patterns: DetectedPattern[];
    recommendedEditor: 'node_graph' | 'state_machine' | 'behavior_tree' | 'shader_graph' | null;
    confidence: number;
  } {
    const patterns: DetectedPattern[] = [];
    let confidence = 0;

    // Detect state machine patterns
    const stateMachinePattern = this.detectStateMachine(code);
    if (stateMachinePattern) {
      patterns.push(stateMachinePattern);
      confidence = Math.max(confidence, 0.8);
    }

    // Detect behavior tree patterns
    const behaviorTreePattern = this.detectBehaviorTree(code);
    if (behaviorTreePattern) {
      patterns.push(behaviorTreePattern);
      confidence = Math.max(confidence, 0.7);
    }

    // Detect node graph patterns
    const nodeGraphPattern = this.detectNodeGraph(code);
    if (nodeGraphPattern) {
      patterns.push(nodeGraphPattern);
      confidence = Math.max(confidence, 0.6);
    }

    // Detect shader patterns
    const shaderPattern = this.detectShaderPattern(code);
    if (shaderPattern) {
      patterns.push(shaderPattern);
      confidence = Math.max(confidence, 0.75);
    }

    // Determine recommended editor
    let recommendedEditor: 'node_graph' | 'state_machine' | 'behavior_tree' | 'shader_graph' | null = null;
    if (patterns.length > 0) {
      const primary = patterns[0];
      switch (primary.type) {
        case 'state_machine':
          recommendedEditor = 'state_machine';
          break;
        case 'behavior_tree':
          recommendedEditor = 'behavior_tree';
          break;
        case 'shader':
          recommendedEditor = 'shader_graph';
          break;
        default:
          recommendedEditor = 'node_graph';
      }
    }

    return { patterns, recommendedEditor, confidence };
  }

  /**
   * Generate Node Graph from code
   */
  generateNodeGraph(code: string): NodeGraph {
    const blocks = this.parseCodeBlocks(code);
    const nodes: NodeGraph['nodes'] = [];
    const connections: NodeGraph['connections'] = [];
    let nodeId = 0;
    let y = 100;

    // Start node
    nodes.push({
      id: `node_${nodeId++}`,
      type: 'event',
      position: { x: 100, y: 100 },
      data: { label: 'OnUpdate', eventType: 'update' },
    });

    // Process each code block
    for (const block of blocks) {
      const node = this.codeBlockToNode(block, nodeId++, 300, y);
      nodes.push(node);
      y += 120;

      // Connect to previous node
      if (nodes.length > 1) {
        connections.push({
          id: `conn_${connections.length}`,
          sourceId: nodes[nodes.length - 2].id,
          sourcePort: 'output',
          targetId: node.id,
          targetPort: 'input',
        });
      }
    }

    return {
      id: 'generated_graph',
      name: 'Generated from Code',
      nodes,
      connections,
      variables: this.extractVariables(code),
    };
  }

  /**
   * Generate State Machine from code
   */
  generateStateMachine(code: string): StateMachine {
    const pattern = this.detectStateMachine(code);
    const states: StateMachine['states'] = [];
    const transitions: StateMachine['transitions'] = [];

    if (pattern && pattern.type === 'state_machine') {
      let x = 100;
      let y = 100;

      // Create state nodes
      for (let i = 0; i < pattern.states.length; i++) {
        const stateName = pattern.states[i];
        states.push({
          id: `state_${i}`,
          name: stateName,
          position: { x, y: y + i * 150 },
          isInitial: i === 0,
          onEnter: [],
          onUpdate: [],
          onExit: [],
        });
      }

      // Create transitions
      for (const trans of pattern.transitions) {
        const fromState = states.find(s => s.name === trans.from);
        const toState = states.find(s => s.name === trans.to);
        if (fromState && toState) {
          transitions.push({
            id: `trans_${transitions.length}`,
            from: fromState.id,
            to: toState.id,
            condition: trans.condition,
            priority: 0,
          });
        }
      }
    } else {
      // Default states if no pattern detected
      states.push({
        id: 'state_idle',
        name: 'Idle',
        position: { x: 100, y: 100 },
        isInitial: true,
        onEnter: [],
        onUpdate: [],
        onExit: [],
      });
    }

    return {
      id: 'generated_sm',
      name: 'Generated State Machine',
      states,
      transitions,
      currentState: states[0]?.id || '',
    };
  }

  /**
   * Generate Behavior Tree from code
   */
  generateBehaviorTree(code: string): BehaviorTree {
    const pattern = this.detectBehaviorTree(code);
    const nodes: BehaviorTree['nodes'] = [];

    // Root selector
    nodes.push({
      id: 'root',
      type: 'selector',
      name: 'Root',
      position: { x: 400, y: 50 },
      children: [],
    });

    if (pattern && pattern.type === 'behavior_tree') {
      let y = 150;
      for (const detected of pattern.nodes) {
        const node = this.behaviorNodeToTreeNode(detected, nodes.length, 400, y);
        nodes.push(node);
        nodes[0].children?.push(node.id);
        y += 100;
      }
    } else {
      // Default nodes
      nodes.push({
        id: 'check',
        type: 'condition',
        name: 'Check Condition',
        position: { x: 250, y: 150 },
        condition: 'entity.health > 0',
      });
      nodes.push({
        id: 'action',
        type: 'action',
        name: 'Take Action',
        position: { x: 550, y: 150 },
        action: 'move',
      });
      nodes[0].children = ['check', 'action'];
    }

    return {
      id: 'generated_bt',
      name: 'Generated Behavior Tree',
      nodes,
      rootId: 'root',
    };
  }

  /**
   * Generate Shader Graph from code
   */
  generateShaderGraph(code: string): ShaderGraph {
    const pattern = this.detectShaderPattern(code);
    const nodes: ShaderGraph['nodes'] = [];
    const connections: ShaderGraph['connections'] = [];

    // Output node
    nodes.push({
      id: 'output',
      type: 'output',
      position: { x: 600, y: 200 },
      data: { label: 'Material Output' },
    });

    if (pattern && pattern.type === 'shader') {
      let x = 100;
      for (const op of pattern.operations) {
        const node = this.shaderOpToNode(op, nodes.length, x, 200);
        nodes.push(node);
        x += 150;
      }

      // Connect last node to output
      if (nodes.length > 1) {
        connections.push({
          id: 'conn_out',
          sourceId: nodes[nodes.length - 1].id,
          sourcePort: 'output',
          targetId: 'output',
          targetPort: 'color',
        });
      }
    } else {
      // Default nodes
      nodes.push({
        id: 'color',
        type: 'color',
        position: { x: 100, y: 200 },
        data: { color: '#3b82f6' },
      });
      connections.push({
        id: 'conn_1',
        sourceId: 'color',
        sourcePort: 'output',
        targetId: 'output',
        targetPort: 'color',
      });
    }

    return {
      id: 'generated_shader',
      name: 'Generated Shader',
      nodes,
      connections,
    };
  }

  // ========== Pattern Detection Methods ==========

  private detectStateMachine(code: string): DetectedPattern | null {
    const states: string[] = [];
    const transitions: StateTransition[] = [];

    // Look for state variable patterns
    const stateVarMatch = code.match(/(?:let|const|var)\s+(?:state|currentState|_state)\s*[=:]\s*['"](\w+)['"]/);
    if (stateVarMatch) {
      states.push(stateVarMatch[1]);
    }

    // Look for switch statements on state
    const switchMatch = code.match(/switch\s*\(\s*(?:this\.)?(?:state|currentState|_state)\s*\)\s*\{([\s\S]*?)\}/);
    if (switchMatch) {
      const casesContent = switchMatch[1];
      const caseMatches = casesContent.matchAll(/case\s+['"](\w+)['"]\s*:/g);
      for (const match of caseMatches) {
        if (!states.includes(match[1])) {
          states.push(match[1]);
        }
      }
    }

    // Look for if statements that change state
    const transitionMatches = code.matchAll(/if\s*\((.*?)\)\s*\{[^}]*(?:state|currentState|_state)\s*=\s*['"](\w+)['"]/g);
    for (const match of transitionMatches) {
      // Find the current state context (simplified)
      transitions.push({
        from: states[0] || 'unknown',
        to: match[2],
        condition: match[1].trim(),
      });
    }

    if (states.length >= 2) {
      return { type: 'state_machine', states, transitions };
    }

    return null;
  }

  private detectBehaviorTree(code: string): DetectedPattern | null {
    const nodes: BehaviorNode[] = [];

    // Look for if-else chains (selector pattern)
    const ifElseMatches = code.matchAll(/if\s*\((.*?)\)\s*\{([\s\S]*?)\}(?:\s*else\s*if\s*\((.*?)\)\s*\{([\s\S]*?)\})*/g);

    for (const match of ifElseMatches) {
      nodes.push({
        type: 'condition',
        name: `Check: ${match[1].slice(0, 30)}...`,
        code: match[0],
      });
    }

    // Look for sequential operations (sequence pattern)
    const sequenceMatches = code.matchAll(/\/\/\s*(?:step|then|next|do):\s*(.+)/gi);
    for (const match of sequenceMatches) {
      nodes.push({
        type: 'action',
        name: match[1].trim(),
      });
    }

    if (nodes.length >= 2) {
      return { type: 'behavior_tree', nodes };
    }

    return null;
  }

  private detectNodeGraph(code: string): DetectedPattern | null {
    const nodes: FlowNode[] = [];
    const connections: Connection[] = [];
    let nodeId = 0;

    // Detect event handlers
    const eventMatches = code.matchAll(/(?:on|handle)(\w+)\s*(?:=|:)\s*(?:function|\()/g);
    for (const match of eventMatches) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'event',
        label: match[1],
        outputs: ['flow'],
      });
    }

    // Detect function calls
    const callMatches = code.matchAll(/(\w+)\s*\((.*?)\)/g);
    for (const match of callMatches) {
      if (!['if', 'while', 'for', 'switch'].includes(match[1])) {
        nodes.push({
          id: `node_${nodeId++}`,
          type: 'call',
          label: match[1],
          inputs: ['flow'],
          outputs: ['flow'],
        });
      }
    }

    if (nodes.length >= 3) {
      return { type: 'node_graph', nodes, connections };
    }

    return null;
  }

  private detectShaderPattern(code: string): DetectedPattern | null {
    const operations: ShaderOperation[] = [];

    // Detect color operations
    const colorMatches = code.matchAll(/(?:color|rgb|hsl)\s*[\(=]\s*(.*)/gi);
    for (const match of colorMatches) {
      operations.push({
        type: 'color',
        operation: 'set',
        inputs: [match[1].trim()],
        output: 'color',
      });
    }

    // Detect math operations
    const mathMatches = code.matchAll(/Math\.(sin|cos|tan|abs|pow|sqrt|lerp|clamp)\s*\((.*?)\)/g);
    for (const match of mathMatches) {
      operations.push({
        type: 'math',
        operation: match[1],
        inputs: match[2].split(',').map(s => s.trim()),
        output: 'value',
      });
    }

    // Detect time usage
    if (code.includes('time') || code.includes('Date.now') || code.includes('performance.now')) {
      operations.push({
        type: 'time',
        operation: 'elapsed',
        inputs: [],
        output: 'time',
      });
    }

    if (operations.length >= 2) {
      return { type: 'shader', operations };
    }

    return null;
  }

  // ========== Conversion Helpers ==========

  private parseCodeBlocks(code: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      if (trimmed.startsWith('if')) {
        blocks.push({ type: 'if', code: trimmed });
      } else if (trimmed.includes('=')) {
        blocks.push({ type: 'assignment', code: trimmed });
      } else if (trimmed.includes('(')) {
        blocks.push({ type: 'call', code: trimmed });
      }
    }

    return blocks;
  }

  private codeBlockToNode(block: CodeBlock, id: number, x: number, y: number): NodeGraph['nodes'][0] {
    switch (block.type) {
      case 'if':
        return {
          id: `node_${id}`,
          type: 'branch',
          position: { x, y },
          data: { label: 'Branch', condition: block.code },
        };
      case 'assignment':
        return {
          id: `node_${id}`,
          type: 'variable_set',
          position: { x, y },
          data: { label: 'Set Variable', code: block.code },
        };
      case 'call':
        return {
          id: `node_${id}`,
          type: 'function',
          position: { x, y },
          data: { label: 'Function Call', code: block.code },
        };
      default:
        return {
          id: `node_${id}`,
          type: 'custom',
          position: { x, y },
          data: { label: 'Code', code: block.code },
        };
    }
  }

  private behaviorNodeToTreeNode(
    node: BehaviorNode,
    id: number,
    x: number,
    y: number
  ): BehaviorTree['nodes'][0] {
    return {
      id: `bt_${id}`,
      type: node.type,
      name: node.name,
      position: { x, y },
      ...(node.type === 'condition' && { condition: node.code }),
      ...(node.type === 'action' && { action: node.name }),
    };
  }

  private shaderOpToNode(
    op: ShaderOperation,
    id: number,
    x: number,
    y: number
  ): ShaderGraph['nodes'][0] {
    return {
      id: `shader_${id}`,
      type: op.type === 'math' ? 'math' : op.type === 'color' ? 'color' : 'value',
      position: { x, y },
      data: {
        label: op.operation,
        ...(op.type === 'math' && { operation: op.operation }),
        ...(op.type === 'color' && { color: op.inputs[0] }),
      },
    };
  }

  private extractVariables(code: string): NodeGraph['variables'] {
    const variables: NodeGraph['variables'] = [];
    const varMatches = code.matchAll(/(?:let|const|var)\s+(\w+)\s*(?::\s*(\w+))?\s*=\s*(.+)/g);

    for (const match of varMatches) {
      const name = match[1];
      const typeHint = match[2];
      const value = match[3].trim();

      let type: 'number' | 'string' | 'boolean' | 'vector2' | 'object' = 'object';
      if (typeHint === 'number' || !isNaN(Number(value))) type = 'number';
      else if (typeHint === 'string' || value.startsWith('"') || value.startsWith("'")) type = 'string';
      else if (typeHint === 'boolean' || value === 'true' || value === 'false') type = 'boolean';

      variables.push({ name, type, defaultValue: value });
    }

    return variables;
  }
}

// Singleton instance
export const codeToVisual = CodeToVisualService.getInstance();
