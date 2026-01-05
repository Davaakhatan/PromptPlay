// Shader Graph Compiler - Converts visual shader graphs to GLSL

import type { ShaderGraph, ShaderNodeInstance, ShaderConnection, CompiledShader } from '../types/ShaderGraph';
import { getShaderNodeDefinition } from './ShaderNodeLibrary';

/**
 * Compiles a visual shader graph into GLSL vertex and fragment shaders
 */
export class ShaderGraphCompiler {
  private graph: ShaderGraph;
  private nodeOutputs: Map<string, Record<string, string>> = new Map();
  private generatedCode: string[] = [];
  private variableCounter = 0;

  constructor(graph: ShaderGraph) {
    this.graph = graph;
  }

  /**
   * Generate a unique variable name
   */
  private genVar(prefix = 'v'): string {
    return `${prefix}_${this.variableCounter++}`;
  }

  /**
   * Get the output variable name for a node's port
   */
  private getOutputVar(nodeId: string, portId: string): string | null {
    const outputs = this.nodeOutputs.get(nodeId);
    return outputs?.[portId] || null;
  }

  /**
   * Find the connection that feeds into a node's input port
   */
  private findInputConnection(nodeId: string, portId: string): ShaderConnection | null {
    return this.graph.connections.find(
      c => c.toNodeId === nodeId && c.toPortId === portId
    ) || null;
  }

  /**
   * Get the value for a node's input (either from connection or default)
   */
  private getInputValue(node: ShaderNodeInstance, portId: string): string {
    const conn = this.findInputConnection(node.id, portId);
    if (conn) {
      const outputVar = this.getOutputVar(conn.fromNodeId, conn.fromPortId);
      if (outputVar) return outputVar;
    }

    // Use node's stored data or port default
    const definition = getShaderNodeDefinition(node.type);
    const port = definition?.inputs.find(p => p.id === portId);

    // Check if value is stored in node data
    if (node.data[portId] !== undefined) {
      return this.formatValue(node.data[portId], port?.type);
    }

    // Use port default
    if (port?.defaultValue !== undefined) {
      return this.formatValue(port.defaultValue, port.type);
    }

    return '0.0';
  }

  /**
   * Format a value as GLSL based on type
   */
  private formatValue(value: unknown, _type?: string): string {
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    if (Array.isArray(value)) {
      if (value.length === 2) {
        return `vec2(${value.map(v => (v as number).toFixed(4)).join(', ')})`;
      }
      if (value.length === 3) {
        return `vec3(${value.map(v => (v as number).toFixed(4)).join(', ')})`;
      }
      if (value.length === 4) {
        return `vec4(${value.map(v => (v as number).toFixed(4)).join(', ')})`;
      }
    }
    return String(value);
  }

  /**
   * Topologically sort nodes for proper execution order
   */
  private topologicalSort(): ShaderNodeInstance[] {
    const visited = new Set<string>();
    const sorted: ShaderNodeInstance[] = [];
    const nodeMap = new Map(this.graph.nodes.map(n => [n.id, n]));

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Visit all nodes that this node depends on
      const incomingConnections = this.graph.connections.filter(c => c.toNodeId === nodeId);
      for (const conn of incomingConnections) {
        visit(conn.fromNodeId);
      }

      const node = nodeMap.get(nodeId);
      if (node) sorted.push(node);
    };

    // Start from output nodes and work backwards
    const outputNodes = this.graph.nodes.filter(n => n.type === 'shader_output');
    for (const output of outputNodes) {
      visit(output.id);
    }

    // Also visit any unvisited nodes
    for (const node of this.graph.nodes) {
      visit(node.id);
    }

    return sorted;
  }

  /**
   * Generate code for a single node
   */
  private generateNodeCode(node: ShaderNodeInstance): void {
    const definition = getShaderNodeDefinition(node.type);
    if (!definition) return;

    // Generate output variable names
    const outputs: Record<string, string> = {};
    for (const port of definition.outputs) {
      outputs[port.id] = this.genVar(`${node.type}_${port.id}`);
    }
    this.nodeOutputs.set(node.id, outputs);

    // Get input values
    const inputs: Record<string, string> = {};
    for (const port of definition.inputs) {
      inputs[port.id] = this.getInputValue(node, port.id);
    }

    // Generate GLSL code
    if (definition.glsl) {
      const code = definition.glsl(inputs, outputs);
      this.generatedCode.push(code);
    }
  }

  /**
   * Compile the shader graph to GLSL
   */
  compile(): CompiledShader {
    this.nodeOutputs.clear();
    this.generatedCode = [];
    this.variableCounter = 0;

    // Sort nodes topologically
    const sortedNodes = this.topologicalSort();

    // Generate code for each node
    for (const node of sortedNodes) {
      this.generateNodeCode(node);
    }

    // Build fragment shader
    const fragmentShader = `
precision highp float;

// Uniforms
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uTexture;

// Varyings
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  ${this.generatedCode.join('\n  ')}
}
`;

    // Build vertex shader
    const vertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

// Varyings
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = normalMatrix * normal;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

    return {
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { type: 'f', value: 0 },
        uResolution: { type: 'v2', value: [1920, 1080] },
        uTexture: { type: 't', value: null },
      },
    };
  }
}

/**
 * Create a default shader graph with output node
 */
export function createDefaultShaderGraph(): ShaderGraph {
  return {
    id: `shader_${Date.now()}`,
    name: 'New Shader',
    nodes: [
      {
        id: 'output_1',
        type: 'shader_output',
        position: { x: 400, y: 200 },
        data: {},
      },
      {
        id: 'color_1',
        type: 'shader_color',
        position: { x: 100, y: 200 },
        data: { r: 0.5, g: 0.5, b: 1.0, a: 1.0 },
      },
    ],
    connections: [
      {
        id: 'conn_1',
        fromNodeId: 'color_1',
        fromPortId: 'rgb',
        toNodeId: 'output_1',
        toPortId: 'color',
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * Compile a shader graph and return the result
 */
export function compileShaderGraph(graph: ShaderGraph): CompiledShader {
  const compiler = new ShaderGraphCompiler(graph);
  return compiler.compile();
}

export default ShaderGraphCompiler;
