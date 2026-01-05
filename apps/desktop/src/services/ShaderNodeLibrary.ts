// Shader Node Library - Visual shader nodes for material creation

import type { ShaderNodeDefinition } from '../types/ShaderGraph';

// ===== INPUT NODES =====

const uvNode: ShaderNodeDefinition = {
  type: 'shader_uv',
  category: 'input',
  title: 'UV Coordinates',
  description: 'Texture UV coordinates',
  icon: '📐',
  inputs: [],
  outputs: [
    { id: 'uv', name: 'UV', type: 'vec2' },
  ],
  glsl: (_, outputs) => `vec2 ${outputs.uv} = vUv;`,
};

const timeNode: ShaderNodeDefinition = {
  type: 'shader_time',
  category: 'input',
  title: 'Time',
  description: 'Elapsed time in seconds',
  icon: '⏱',
  inputs: [],
  outputs: [
    { id: 'time', name: 'Time', type: 'float' },
    { id: 'sin_time', name: 'Sin Time', type: 'float' },
    { id: 'cos_time', name: 'Cos Time', type: 'float' },
  ],
  glsl: (_, outputs) => `
float ${outputs.time} = uTime;
float ${outputs.sin_time} = sin(uTime);
float ${outputs.cos_time} = cos(uTime);`,
};

const positionNode: ShaderNodeDefinition = {
  type: 'shader_position',
  category: 'input',
  title: 'Position',
  description: 'Vertex/fragment position',
  icon: '📍',
  inputs: [],
  outputs: [
    { id: 'world', name: 'World', type: 'vec3' },
    { id: 'local', name: 'Local', type: 'vec3' },
    { id: 'screen', name: 'Screen', type: 'vec2' },
  ],
  glsl: (_, outputs) => `
vec3 ${outputs.world} = vWorldPosition;
vec3 ${outputs.local} = vPosition;
vec2 ${outputs.screen} = gl_FragCoord.xy / uResolution;`,
};

const normalNode: ShaderNodeDefinition = {
  type: 'shader_normal',
  category: 'input',
  title: 'Normal',
  description: 'Surface normal vector',
  icon: '↗',
  inputs: [],
  outputs: [
    { id: 'normal', name: 'Normal', type: 'vec3' },
  ],
  glsl: (_, outputs) => `vec3 ${outputs.normal} = normalize(vNormal);`,
};

const floatConstNode: ShaderNodeDefinition = {
  type: 'shader_float',
  category: 'input',
  title: 'Float',
  description: 'Constant float value',
  icon: '1',
  inputs: [
    { id: 'value', name: 'Value', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'out', name: 'Out', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.out} = ${inputs.value || '0.0'};`,
};

const colorConstNode: ShaderNodeDefinition = {
  type: 'shader_color',
  category: 'input',
  title: 'Color',
  description: 'Constant color value',
  icon: '🎨',
  inputs: [
    { id: 'r', name: 'R', type: 'float', defaultValue: 1 },
    { id: 'g', name: 'G', type: 'float', defaultValue: 1 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
    { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'rgb', name: 'RGB', type: 'vec3' },
    { id: 'rgba', name: 'RGBA', type: 'vec4' },
  ],
  glsl: (inputs, outputs) => `
vec3 ${outputs.rgb} = vec3(${inputs.r || '1.0'}, ${inputs.g || '1.0'}, ${inputs.b || '1.0'});
vec4 ${outputs.rgba} = vec4(${outputs.rgb}, ${inputs.a || '1.0'});`,
};

// ===== OUTPUT NODES =====

const surfaceOutputNode: ShaderNodeDefinition = {
  type: 'shader_output',
  category: 'output',
  title: 'Surface Output',
  description: 'Final material output',
  icon: '🎯',
  inputs: [
    { id: 'color', name: 'Color', type: 'vec3', defaultValue: [1, 1, 1] },
    { id: 'alpha', name: 'Alpha', type: 'float', defaultValue: 1 },
    { id: 'emission', name: 'Emission', type: 'vec3', defaultValue: [0, 0, 0] },
    { id: 'metallic', name: 'Metallic', type: 'float', defaultValue: 0 },
    { id: 'roughness', name: 'Roughness', type: 'float', defaultValue: 0.5 },
    { id: 'normal', name: 'Normal', type: 'vec3' },
  ],
  outputs: [],
  glsl: (inputs) => `
// Surface output
vec3 finalColor = ${inputs.color || 'vec3(1.0)'};
float finalAlpha = ${inputs.alpha || '1.0'};
vec3 finalEmission = ${inputs.emission || 'vec3(0.0)'};
float finalMetallic = ${inputs.metallic || '0.0'};
float finalRoughness = ${inputs.roughness || '0.5'};
gl_FragColor = vec4(finalColor + finalEmission, finalAlpha);`,
};

// ===== MATH NODES =====

const addNode: ShaderNodeDefinition = {
  type: 'shader_add',
  category: 'math',
  title: 'Add',
  description: 'Add two values',
  icon: '+',
  inputs: [
    { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = ${inputs.a || '0.0'} + ${inputs.b || '0.0'};`,
};

const subtractNode: ShaderNodeDefinition = {
  type: 'shader_subtract',
  category: 'math',
  title: 'Subtract',
  description: 'Subtract B from A',
  icon: '-',
  inputs: [
    { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = ${inputs.a || '0.0'} - ${inputs.b || '0.0'};`,
};

const multiplyNode: ShaderNodeDefinition = {
  type: 'shader_multiply',
  category: 'math',
  title: 'Multiply',
  description: 'Multiply two values',
  icon: '×',
  inputs: [
    { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = ${inputs.a || '1.0'} * ${inputs.b || '1.0'};`,
};

const divideNode: ShaderNodeDefinition = {
  type: 'shader_divide',
  category: 'math',
  title: 'Divide',
  description: 'Divide A by B',
  icon: '÷',
  inputs: [
    { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = ${inputs.a || '1.0'} / max(${inputs.b || '1.0'}, 0.0001);`,
};

const sinNode: ShaderNodeDefinition = {
  type: 'shader_sin',
  category: 'math',
  title: 'Sin',
  description: 'Sine function',
  icon: '〜',
  inputs: [
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = sin(${inputs.x || '0.0'});`,
};

const cosNode: ShaderNodeDefinition = {
  type: 'shader_cos',
  category: 'math',
  title: 'Cos',
  description: 'Cosine function',
  icon: '〜',
  inputs: [
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = cos(${inputs.x || '0.0'});`,
};

const clampNode: ShaderNodeDefinition = {
  type: 'shader_clamp',
  category: 'math',
  title: 'Clamp',
  description: 'Clamp value between min and max',
  icon: '⊏',
  inputs: [
    { id: 'value', name: 'Value', type: 'float', defaultValue: 0 },
    { id: 'min', name: 'Min', type: 'float', defaultValue: 0 },
    { id: 'max', name: 'Max', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = clamp(${inputs.value || '0.0'}, ${inputs.min || '0.0'}, ${inputs.max || '1.0'});`,
};

const lerpNode: ShaderNodeDefinition = {
  type: 'shader_lerp',
  category: 'math',
  title: 'Lerp',
  description: 'Linear interpolation',
  icon: '↔',
  inputs: [
    { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
    { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
    { id: 't', name: 'T', type: 'float', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = mix(${inputs.a || '0.0'}, ${inputs.b || '1.0'}, ${inputs.t || '0.5'});`,
};

const stepNode: ShaderNodeDefinition = {
  type: 'shader_step',
  category: 'math',
  title: 'Step',
  description: 'Step function (0 if x < edge, else 1)',
  icon: '⌐',
  inputs: [
    { id: 'edge', name: 'Edge', type: 'float', defaultValue: 0.5 },
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = step(${inputs.edge || '0.5'}, ${inputs.x || '0.0'});`,
};

const smoothstepNode: ShaderNodeDefinition = {
  type: 'shader_smoothstep',
  category: 'math',
  title: 'Smoothstep',
  description: 'Smooth step function',
  icon: '⌒',
  inputs: [
    { id: 'edge0', name: 'Edge 0', type: 'float', defaultValue: 0 },
    { id: 'edge1', name: 'Edge 1', type: 'float', defaultValue: 1 },
    { id: 'x', name: 'X', type: 'float', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = smoothstep(${inputs.edge0 || '0.0'}, ${inputs.edge1 || '1.0'}, ${inputs.x || '0.5'});`,
};

const powerNode: ShaderNodeDefinition = {
  type: 'shader_power',
  category: 'math',
  title: 'Power',
  description: 'Raise to power (x^y)',
  icon: '^',
  inputs: [
    { id: 'base', name: 'Base', type: 'float', defaultValue: 2 },
    { id: 'exp', name: 'Exp', type: 'float', defaultValue: 2 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = pow(${inputs.base || '2.0'}, ${inputs.exp || '2.0'});`,
};

const absNode: ShaderNodeDefinition = {
  type: 'shader_abs',
  category: 'math',
  title: 'Abs',
  description: 'Absolute value',
  icon: '|x|',
  inputs: [
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = abs(${inputs.x || '0.0'});`,
};

const fractNode: ShaderNodeDefinition = {
  type: 'shader_fract',
  category: 'math',
  title: 'Fract',
  description: 'Fractional part',
  icon: '.',
  inputs: [
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = fract(${inputs.x || '0.0'});`,
};

// ===== COLOR NODES =====

const mixColorNode: ShaderNodeDefinition = {
  type: 'shader_mix_color',
  category: 'color',
  title: 'Mix Color',
  description: 'Blend two colors',
  icon: '🎨',
  inputs: [
    { id: 'a', name: 'Color A', type: 'vec3', defaultValue: [1, 0, 0] },
    { id: 'b', name: 'Color B', type: 'vec3', defaultValue: [0, 0, 1] },
    { id: 'factor', name: 'Factor', type: 'float', defaultValue: 0.5 },
  ],
  outputs: [
    { id: 'color', name: 'Color', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `vec3 ${outputs.color} = mix(${inputs.a || 'vec3(1.0, 0.0, 0.0)'}, ${inputs.b || 'vec3(0.0, 0.0, 1.0)'}, ${inputs.factor || '0.5'});`,
};

const hsvToRgbNode: ShaderNodeDefinition = {
  type: 'shader_hsv_to_rgb',
  category: 'color',
  title: 'HSV to RGB',
  description: 'Convert HSV to RGB color',
  icon: '🌈',
  inputs: [
    { id: 'h', name: 'Hue', type: 'float', defaultValue: 0 },
    { id: 's', name: 'Saturation', type: 'float', defaultValue: 1 },
    { id: 'v', name: 'Value', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'rgb', name: 'RGB', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `
vec3 ${outputs.rgb} = vec3(${inputs.v || '1.0'}) * mix(vec3(1.0), clamp(abs(mod(${inputs.h || '0.0'} * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0), ${inputs.s || '1.0'});`,
};

const brightnessContrastNode: ShaderNodeDefinition = {
  type: 'shader_brightness_contrast',
  category: 'color',
  title: 'Brightness/Contrast',
  description: 'Adjust brightness and contrast',
  icon: '☀',
  inputs: [
    { id: 'color', name: 'Color', type: 'vec3', defaultValue: [1, 1, 1] },
    { id: 'brightness', name: 'Brightness', type: 'float', defaultValue: 0 },
    { id: 'contrast', name: 'Contrast', type: 'float', defaultValue: 1 },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `vec3 ${outputs.result} = (${inputs.color || 'vec3(1.0)'} - 0.5) * ${inputs.contrast || '1.0'} + 0.5 + ${inputs.brightness || '0.0'};`,
};

// ===== TEXTURE NODES =====

const sampleTextureNode: ShaderNodeDefinition = {
  type: 'shader_sample_texture',
  category: 'texture',
  title: 'Sample Texture',
  description: 'Sample color from texture',
  icon: '🖼',
  inputs: [
    { id: 'texture', name: 'Texture', type: 'sampler2D' },
    { id: 'uv', name: 'UV', type: 'vec2' },
  ],
  outputs: [
    { id: 'color', name: 'Color', type: 'vec4' },
    { id: 'rgb', name: 'RGB', type: 'vec3' },
    { id: 'r', name: 'R', type: 'float' },
    { id: 'g', name: 'G', type: 'float' },
    { id: 'b', name: 'B', type: 'float' },
    { id: 'a', name: 'A', type: 'float' },
  ],
  glsl: (inputs, outputs) => `
vec4 ${outputs.color} = texture2D(${inputs.texture || 'uTexture'}, ${inputs.uv || 'vUv'});
vec3 ${outputs.rgb} = ${outputs.color}.rgb;
float ${outputs.r} = ${outputs.color}.r;
float ${outputs.g} = ${outputs.color}.g;
float ${outputs.b} = ${outputs.color}.b;
float ${outputs.a} = ${outputs.color}.a;`,
};

const tilingOffsetNode: ShaderNodeDefinition = {
  type: 'shader_tiling_offset',
  category: 'texture',
  title: 'Tiling & Offset',
  description: 'Tile and offset UV coordinates',
  icon: '🔲',
  inputs: [
    { id: 'uv', name: 'UV', type: 'vec2' },
    { id: 'tile_x', name: 'Tile X', type: 'float', defaultValue: 1 },
    { id: 'tile_y', name: 'Tile Y', type: 'float', defaultValue: 1 },
    { id: 'offset_x', name: 'Offset X', type: 'float', defaultValue: 0 },
    { id: 'offset_y', name: 'Offset Y', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'uv', name: 'UV', type: 'vec2' },
  ],
  glsl: (inputs, outputs) => `vec2 ${outputs.uv} = ${inputs.uv || 'vUv'} * vec2(${inputs.tile_x || '1.0'}, ${inputs.tile_y || '1.0'}) + vec2(${inputs.offset_x || '0.0'}, ${inputs.offset_y || '0.0'});`,
};

// ===== VECTOR NODES =====

const makeVec3Node: ShaderNodeDefinition = {
  type: 'shader_make_vec3',
  category: 'vector',
  title: 'Make Vec3',
  description: 'Create vec3 from components',
  icon: '📦',
  inputs: [
    { id: 'x', name: 'X', type: 'float', defaultValue: 0 },
    { id: 'y', name: 'Y', type: 'float', defaultValue: 0 },
    { id: 'z', name: 'Z', type: 'float', defaultValue: 0 },
  ],
  outputs: [
    { id: 'vec', name: 'Vec3', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `vec3 ${outputs.vec} = vec3(${inputs.x || '0.0'}, ${inputs.y || '0.0'}, ${inputs.z || '0.0'});`,
};

const breakVec3Node: ShaderNodeDefinition = {
  type: 'shader_break_vec3',
  category: 'vector',
  title: 'Break Vec3',
  description: 'Split vec3 into components',
  icon: '📤',
  inputs: [
    { id: 'vec', name: 'Vec3', type: 'vec3' },
  ],
  outputs: [
    { id: 'x', name: 'X', type: 'float' },
    { id: 'y', name: 'Y', type: 'float' },
    { id: 'z', name: 'Z', type: 'float' },
  ],
  glsl: (inputs, outputs) => `
float ${outputs.x} = ${inputs.vec || 'vec3(0.0)'}.x;
float ${outputs.y} = ${inputs.vec || 'vec3(0.0)'}.y;
float ${outputs.z} = ${inputs.vec || 'vec3(0.0)'}.z;`,
};

const normalizeNode: ShaderNodeDefinition = {
  type: 'shader_normalize',
  category: 'vector',
  title: 'Normalize',
  description: 'Normalize vector to unit length',
  icon: '→',
  inputs: [
    { id: 'vec', name: 'Vector', type: 'vec3' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `vec3 ${outputs.result} = normalize(${inputs.vec || 'vec3(0.0, 1.0, 0.0)'});`,
};

const dotProductNode: ShaderNodeDefinition = {
  type: 'shader_dot',
  category: 'vector',
  title: 'Dot Product',
  description: 'Dot product of two vectors',
  icon: '•',
  inputs: [
    { id: 'a', name: 'A', type: 'vec3' },
    { id: 'b', name: 'B', type: 'vec3' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `float ${outputs.result} = dot(${inputs.a || 'vec3(0.0)'}, ${inputs.b || 'vec3(0.0)'});`,
};

const crossProductNode: ShaderNodeDefinition = {
  type: 'shader_cross',
  category: 'vector',
  title: 'Cross Product',
  description: 'Cross product of two vectors',
  icon: '×',
  inputs: [
    { id: 'a', name: 'A', type: 'vec3' },
    { id: 'b', name: 'B', type: 'vec3' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'vec3' },
  ],
  glsl: (inputs, outputs) => `vec3 ${outputs.result} = cross(${inputs.a || 'vec3(0.0)'}, ${inputs.b || 'vec3(0.0)'});`,
};

// ===== UTILITY NODES =====

const fresnelNode: ShaderNodeDefinition = {
  type: 'shader_fresnel',
  category: 'utility',
  title: 'Fresnel',
  description: 'Fresnel effect based on view angle',
  icon: '◐',
  inputs: [
    { id: 'power', name: 'Power', type: 'float', defaultValue: 2 },
    { id: 'normal', name: 'Normal', type: 'vec3' },
  ],
  outputs: [
    { id: 'result', name: 'Result', type: 'float' },
  ],
  glsl: (inputs, outputs) => `
vec3 viewDir = normalize(cameraPosition - vWorldPosition);
float ${outputs.result} = pow(1.0 - max(dot(${inputs.normal || 'normalize(vNormal)'}, viewDir), 0.0), ${inputs.power || '2.0'});`,
};

const noiseNode: ShaderNodeDefinition = {
  type: 'shader_noise',
  category: 'utility',
  title: 'Simple Noise',
  description: 'Pseudo-random noise',
  icon: '📊',
  inputs: [
    { id: 'uv', name: 'UV', type: 'vec2' },
    { id: 'scale', name: 'Scale', type: 'float', defaultValue: 10 },
  ],
  outputs: [
    { id: 'noise', name: 'Noise', type: 'float' },
  ],
  glsl: (inputs, outputs) => `
float ${outputs.noise} = fract(sin(dot(${inputs.uv || 'vUv'} * ${inputs.scale || '10.0'}, vec2(12.9898, 78.233))) * 43758.5453);`,
};

// ===== SHADER NODE LIBRARY =====

export const SHADER_NODE_LIBRARY: Record<string, ShaderNodeDefinition> = {
  // Input
  shader_uv: uvNode,
  shader_time: timeNode,
  shader_position: positionNode,
  shader_normal: normalNode,
  shader_float: floatConstNode,
  shader_color: colorConstNode,
  // Output
  shader_output: surfaceOutputNode,
  // Math
  shader_add: addNode,
  shader_subtract: subtractNode,
  shader_multiply: multiplyNode,
  shader_divide: divideNode,
  shader_sin: sinNode,
  shader_cos: cosNode,
  shader_clamp: clampNode,
  shader_lerp: lerpNode,
  shader_step: stepNode,
  shader_smoothstep: smoothstepNode,
  shader_power: powerNode,
  shader_abs: absNode,
  shader_fract: fractNode,
  // Color
  shader_mix_color: mixColorNode,
  shader_hsv_to_rgb: hsvToRgbNode,
  shader_brightness_contrast: brightnessContrastNode,
  // Texture
  shader_sample_texture: sampleTextureNode,
  shader_tiling_offset: tilingOffsetNode,
  // Vector
  shader_make_vec3: makeVec3Node,
  shader_break_vec3: breakVec3Node,
  shader_normalize: normalizeNode,
  shader_dot: dotProductNode,
  shader_cross: crossProductNode,
  // Utility
  shader_fresnel: fresnelNode,
  shader_noise: noiseNode,
};

// Get nodes by category
export function getShaderNodesByCategory(category: ShaderNodeDefinition['category']): ShaderNodeDefinition[] {
  return Object.values(SHADER_NODE_LIBRARY).filter(node => node.category === category);
}

// Get all shader categories
export function getShaderCategories(): ShaderNodeDefinition['category'][] {
  return ['input', 'output', 'math', 'color', 'texture', 'vector', 'utility'];
}

// Get a shader node definition by type
export function getShaderNodeDefinition(type: string): ShaderNodeDefinition | undefined {
  return SHADER_NODE_LIBRARY[type];
}

// Get all shader node definitions
export function getAllShaderNodes(): ShaderNodeDefinition[] {
  return Object.values(SHADER_NODE_LIBRARY);
}

export default SHADER_NODE_LIBRARY;
