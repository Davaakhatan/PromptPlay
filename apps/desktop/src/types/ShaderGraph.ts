// Shader Graph Types for Visual Shader Creation

export type ShaderPortType =
  | 'float'      // Single number
  | 'vec2'       // 2D vector (UV coords, etc.)
  | 'vec3'       // 3D vector (color RGB, position, normal)
  | 'vec4'       // 4D vector (color RGBA)
  | 'sampler2D'  // Texture
  | 'mat3'       // 3x3 matrix
  | 'mat4';      // 4x4 matrix

export interface ShaderPort {
  id: string;
  name: string;
  type: ShaderPortType;
  defaultValue?: number | number[];
}

export interface ShaderNodeDefinition {
  type: string;
  category: 'input' | 'output' | 'math' | 'color' | 'texture' | 'vector' | 'utility';
  title: string;
  description: string;
  icon?: string;
  inputs: ShaderPort[];
  outputs: ShaderPort[];
  // GLSL code generator - returns GLSL code for this node
  glsl?: (inputs: Record<string, string>, outputs: Record<string, string>) => string;
}

export interface ShaderNodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface ShaderConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface ShaderGraph {
  id: string;
  name: string;
  description?: string;
  nodes: ShaderNodeInstance[];
  connections: ShaderConnection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Port type colors for visual distinction
export const SHADER_PORT_COLORS: Record<ShaderPortType, string> = {
  float: '#4ade80',     // green
  vec2: '#60a5fa',      // blue
  vec3: '#a78bfa',      // violet
  vec4: '#f472b6',      // pink
  sampler2D: '#fb923c', // orange
  mat3: '#14b8a6',      // teal
  mat4: '#06b6d4',      // cyan
};

// Shader node category colors
export const SHADER_CATEGORY_COLORS: Record<ShaderNodeDefinition['category'], string> = {
  input: '#22c55e',   // green
  output: '#ef4444',  // red
  math: '#3b82f6',    // blue
  color: '#f472b6',   // pink
  texture: '#fb923c', // orange
  vector: '#a78bfa',  // violet
  utility: '#6b7280', // gray
};

// Compiled shader result
export interface CompiledShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { type: string; value: unknown }>;
}
