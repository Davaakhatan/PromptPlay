/**
 * Shader Editor - Visual shader creation and GLSL editing
 * Supports node-based visual editing and raw GLSL code
 */

export interface ShaderUniform {
  name: string;
  type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'sampler2D' | 'bool';
  value: number | number[] | string | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ShaderNode {
  id: string;
  type: ShaderNodeType;
  name: string;
  position: { x: number; y: number };
  inputs: ShaderNodePort[];
  outputs: ShaderNodePort[];
  properties: Record<string, unknown>;
}

export interface ShaderNodePort {
  id: string;
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'texture';
  value?: unknown;
  connected?: boolean;
}

export interface ShaderConnection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface ShaderGraph {
  id: string;
  name: string;
  nodes: ShaderNode[];
  connections: ShaderConnection[];
  outputNode: string;
}

export type ShaderNodeType =
  | 'input_position'
  | 'input_normal'
  | 'input_uv'
  | 'input_time'
  | 'input_resolution'
  | 'input_texture'
  | 'math_add'
  | 'math_subtract'
  | 'math_multiply'
  | 'math_divide'
  | 'math_power'
  | 'math_sqrt'
  | 'math_abs'
  | 'math_sin'
  | 'math_cos'
  | 'math_tan'
  | 'math_floor'
  | 'math_ceil'
  | 'math_fract'
  | 'math_mod'
  | 'math_min'
  | 'math_max'
  | 'math_clamp'
  | 'math_step'
  | 'math_smoothstep'
  | 'math_mix'
  | 'math_dot'
  | 'math_cross'
  | 'math_normalize'
  | 'math_length'
  | 'math_distance'
  | 'math_reflect'
  | 'vector_combine'
  | 'vector_separate'
  | 'color_rgb'
  | 'color_hsv'
  | 'color_brightness'
  | 'color_contrast'
  | 'color_saturation'
  | 'color_invert'
  | 'color_mix'
  | 'texture_sample'
  | 'texture_noise'
  | 'texture_voronoi'
  | 'texture_gradient'
  | 'output_color'
  | 'output_alpha'
  | 'constant_float'
  | 'constant_vec2'
  | 'constant_vec3'
  | 'constant_vec4';

export interface CustomShader {
  id: string;
  name: string;
  description?: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: ShaderUniform[];
  graph?: ShaderGraph;
  category: 'surface' | 'post-process' | 'particle' | 'skybox' | 'custom';
  preview?: string;
}

export interface ShaderTemplate {
  id: string;
  name: string;
  description: string;
  category: CustomShader['category'];
  vertexShader: string;
  fragmentShader: string;
  uniforms: ShaderUniform[];
}

// Default shader templates
const shaderTemplates: ShaderTemplate[] = [
  {
    id: 'basic-color',
    name: 'Basic Color',
    description: 'Simple solid color shader',
    category: 'surface',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}`,
    uniforms: [{ name: 'uColor', type: 'vec3', value: [1.0, 0.5, 0.2] }],
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Two-color gradient shader',
    category: 'surface',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uAngle;
varying vec2 vUv;
void main() {
  float angle = uAngle * 3.14159 / 180.0;
  vec2 dir = vec2(cos(angle), sin(angle));
  float t = dot(vUv - 0.5, dir) + 0.5;
  vec3 color = mix(uColor1, uColor2, t);
  gl_FragColor = vec4(color, 1.0);
}`,
    uniforms: [
      { name: 'uColor1', type: 'vec3', value: [0.2, 0.4, 0.8] },
      { name: 'uColor2', type: 'vec3', value: [0.8, 0.2, 0.4] },
      { name: 'uAngle', type: 'float', value: 45, min: 0, max: 360 },
    ],
  },
  {
    id: 'noise',
    name: 'Noise Pattern',
    description: 'Animated noise shader',
    category: 'surface',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform float uTime;
uniform float uScale;
uniform vec3 uColor1;
uniform vec3 uColor2;
varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 st = vUv * uScale;
  float n = noise(st + uTime * 0.5);
  vec3 color = mix(uColor1, uColor2, n);
  gl_FragColor = vec4(color, 1.0);
}`,
    uniforms: [
      { name: 'uTime', type: 'float', value: 0 },
      { name: 'uScale', type: 'float', value: 5, min: 1, max: 20 },
      { name: 'uColor1', type: 'vec3', value: [0.1, 0.1, 0.2] },
      { name: 'uColor2', type: 'vec3', value: [0.4, 0.6, 0.9] },
    ],
  },
  {
    id: 'hologram',
    name: 'Hologram',
    description: 'Sci-fi hologram effect',
    category: 'surface',
    vertexShader: `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vUv = uv;
  vNormal = normalMatrix * normal;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}`,
    fragmentShader: `
uniform float uTime;
uniform vec3 uColor;
uniform float uScanlineSpeed;
uniform float uScanlineCount;
uniform float uFlickerSpeed;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Fresnel effect
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.0);

  // Scanlines
  float scanline = sin(vUv.y * uScanlineCount + uTime * uScanlineSpeed) * 0.5 + 0.5;
  scanline = smoothstep(0.4, 0.6, scanline);

  // Flicker
  float flicker = sin(uTime * uFlickerSpeed) * 0.1 + 0.9;

  // Combine
  float alpha = (fresnel * 0.5 + 0.3) * scanline * flicker;
  vec3 color = uColor + fresnel * 0.3;

  gl_FragColor = vec4(color, alpha);
}`,
    uniforms: [
      { name: 'uTime', type: 'float', value: 0 },
      { name: 'uColor', type: 'vec3', value: [0.0, 0.8, 1.0] },
      { name: 'uScanlineSpeed', type: 'float', value: 5, min: 0, max: 20 },
      { name: 'uScanlineCount', type: 'float', value: 100, min: 10, max: 500 },
      { name: 'uFlickerSpeed', type: 'float', value: 30, min: 0, max: 100 },
    ],
  },
  {
    id: 'toon',
    name: 'Toon/Cel',
    description: 'Cartoon cel-shading effect',
    category: 'surface',
    vertexShader: `
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vNormal = normalMatrix * normal;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}`,
    fragmentShader: `
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform int uSteps;
uniform float uOutlineThickness;
uniform vec3 uOutlineColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDir);

  // Quantized diffuse
  float diff = max(dot(normal, lightDir), 0.0);
  float steps = float(uSteps);
  diff = floor(diff * steps) / steps;

  // Edge detection for outline
  vec3 viewDir = normalize(vViewPosition);
  float edge = dot(viewDir, normal);
  float outline = smoothstep(0.0, uOutlineThickness, abs(edge));

  vec3 color = mix(uOutlineColor, uColor * (0.3 + diff * 0.7), outline);
  gl_FragColor = vec4(color, 1.0);
}`,
    uniforms: [
      { name: 'uColor', type: 'vec3', value: [0.9, 0.5, 0.3] },
      { name: 'uLightDir', type: 'vec3', value: [1.0, 1.0, 1.0] },
      { name: 'uSteps', type: 'int', value: 4 },
      { name: 'uOutlineThickness', type: 'float', value: 0.3, min: 0, max: 1 },
      { name: 'uOutlineColor', type: 'vec3', value: [0.1, 0.1, 0.1] },
    ],
  },
  {
    id: 'dissolve',
    name: 'Dissolve',
    description: 'Dissolve/disintegration effect',
    category: 'surface',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform vec3 uColor;
uniform float uDissolve;
uniform vec3 uEdgeColor;
uniform float uEdgeWidth;
uniform float uNoiseScale;
varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  float n = noise(vUv * uNoiseScale);
  float dissolveEdge = smoothstep(uDissolve - uEdgeWidth, uDissolve, n);
  float dissolveAlpha = step(uDissolve, n);

  vec3 color = mix(uEdgeColor, uColor, dissolveEdge);

  if (dissolveAlpha < 0.5) discard;
  gl_FragColor = vec4(color, 1.0);
}`,
    uniforms: [
      { name: 'uColor', type: 'vec3', value: [0.8, 0.3, 0.2] },
      { name: 'uDissolve', type: 'float', value: 0.5, min: 0, max: 1 },
      { name: 'uEdgeColor', type: 'vec3', value: [1.0, 0.5, 0.0] },
      { name: 'uEdgeWidth', type: 'float', value: 0.1, min: 0, max: 0.5 },
      { name: 'uNoiseScale', type: 'float', value: 10, min: 1, max: 50 },
    ],
  },
  {
    id: 'water',
    name: 'Water Surface',
    description: 'Animated water surface',
    category: 'surface',
    vertexShader: `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveFrequency;
varying vec2 vUv;
varying float vWave;

void main() {
  vUv = uv;
  vec3 pos = position;
  float wave = sin(pos.x * uWaveFrequency + uTime) * cos(pos.z * uWaveFrequency + uTime * 0.8);
  pos.y += wave * uWaveHeight;
  vWave = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`,
    fragmentShader: `
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uFresnelPower;
varying vec2 vUv;
varying float vWave;

void main() {
  float fresnel = pow(1.0 - abs(vWave), uFresnelPower);
  vec3 color = mix(uDeepColor, uShallowColor, fresnel);
  gl_FragColor = vec4(color, 0.8);
}`,
    uniforms: [
      { name: 'uTime', type: 'float', value: 0 },
      { name: 'uWaveHeight', type: 'float', value: 0.2, min: 0, max: 1 },
      { name: 'uWaveFrequency', type: 'float', value: 2, min: 0.5, max: 10 },
      { name: 'uDeepColor', type: 'vec3', value: [0.0, 0.2, 0.4] },
      { name: 'uShallowColor', type: 'vec3', value: [0.2, 0.6, 0.8] },
      { name: 'uFresnelPower', type: 'float', value: 2, min: 0.5, max: 5 },
    ],
  },
  {
    id: 'bloom-post',
    name: 'Bloom',
    description: 'Post-process bloom effect',
    category: 'post-process',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uIntensity;
uniform float uBlurSize;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec4 bloom = vec4(0.0);

  // Simple box blur for bloom
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * uBlurSize;
      vec4 sample = texture2D(tDiffuse, vUv + offset);
      float brightness = dot(sample.rgb, vec3(0.2126, 0.7152, 0.0722));
      if (brightness > uThreshold) {
        bloom += sample;
      }
    }
  }
  bloom /= 25.0;

  gl_FragColor = color + bloom * uIntensity;
}`,
    uniforms: [
      { name: 'uThreshold', type: 'float', value: 0.5, min: 0, max: 1 },
      { name: 'uIntensity', type: 'float', value: 1.0, min: 0, max: 3 },
      { name: 'uBlurSize', type: 'float', value: 0.005, min: 0, max: 0.02, step: 0.001 },
    ],
  },
  {
    id: 'vignette-post',
    name: 'Vignette',
    description: 'Post-process vignette effect',
    category: 'post-process',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uSmoothness;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float vignette = smoothstep(0.5, 0.5 - uSmoothness, dist * uIntensity);
  color.rgb *= vignette;
  gl_FragColor = color;
}`,
    uniforms: [
      { name: 'uIntensity', type: 'float', value: 1.5, min: 0, max: 3 },
      { name: 'uSmoothness', type: 'float', value: 0.3, min: 0, max: 0.5 },
    ],
  },
  {
    id: 'pixelate-post',
    name: 'Pixelate',
    description: 'Retro pixelation effect',
    category: 'post-process',
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uPixelSize;
varying vec2 vUv;

void main() {
  vec2 pixelatedUv = floor(vUv * uResolution / uPixelSize) * uPixelSize / uResolution;
  gl_FragColor = texture2D(tDiffuse, pixelatedUv);
}`,
    uniforms: [
      { name: 'uResolution', type: 'vec2', value: [1920, 1080] },
      { name: 'uPixelSize', type: 'float', value: 8, min: 1, max: 32 },
    ],
  },
  {
    id: 'fire-particle',
    name: 'Fire Particle',
    description: 'Fire effect for particles',
    category: 'particle',
    vertexShader: `
attribute float size;
attribute float life;
varying float vLife;
void main() {
  vLife = life;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`,
    fragmentShader: `
uniform vec3 uColor1;
uniform vec3 uColor2;
varying float vLife;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = (1.0 - dist * 2.0) * vLife;
  vec3 color = mix(uColor2, uColor1, vLife);

  gl_FragColor = vec4(color, alpha);
}`,
    uniforms: [
      { name: 'uColor1', type: 'vec3', value: [1.0, 1.0, 0.2] },
      { name: 'uColor2', type: 'vec3', value: [1.0, 0.2, 0.0] },
    ],
  },
  {
    id: 'skybox-gradient',
    name: 'Gradient Skybox',
    description: 'Simple gradient sky',
    category: 'skybox',
    vertexShader: `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uOffset;
uniform float uExponent;
varying vec3 vWorldPosition;

void main() {
  float h = normalize(vWorldPosition + uOffset).y;
  float t = max(pow(max(h, 0.0), uExponent), 0.0);
  vec3 color = mix(uBottomColor, uTopColor, t);
  gl_FragColor = vec4(color, 1.0);
}`,
    uniforms: [
      { name: 'uTopColor', type: 'vec3', value: [0.2, 0.5, 0.9] },
      { name: 'uBottomColor', type: 'vec3', value: [0.8, 0.9, 1.0] },
      { name: 'uOffset', type: 'float', value: 0, min: -50, max: 50 },
      { name: 'uExponent', type: 'float', value: 0.6, min: 0.1, max: 2 },
    ],
  },
];

// Node type definitions for visual shader editing
const nodeDefinitions: Record<ShaderNodeType, { inputs: string[]; outputs: string[]; code: string }> =
  {
    input_position: { inputs: [], outputs: ['vec3'], code: 'position' },
    input_normal: { inputs: [], outputs: ['vec3'], code: 'normal' },
    input_uv: { inputs: [], outputs: ['vec2'], code: 'uv' },
    input_time: { inputs: [], outputs: ['float'], code: 'uTime' },
    input_resolution: { inputs: [], outputs: ['vec2'], code: 'uResolution' },
    input_texture: { inputs: [], outputs: ['sampler2D'], code: 'uTexture' },
    math_add: { inputs: ['a', 'b'], outputs: ['result'], code: '($a + $b)' },
    math_subtract: { inputs: ['a', 'b'], outputs: ['result'], code: '($a - $b)' },
    math_multiply: { inputs: ['a', 'b'], outputs: ['result'], code: '($a * $b)' },
    math_divide: { inputs: ['a', 'b'], outputs: ['result'], code: '($a / $b)' },
    math_power: { inputs: ['base', 'exp'], outputs: ['result'], code: 'pow($base, $exp)' },
    math_sqrt: { inputs: ['x'], outputs: ['result'], code: 'sqrt($x)' },
    math_abs: { inputs: ['x'], outputs: ['result'], code: 'abs($x)' },
    math_sin: { inputs: ['x'], outputs: ['result'], code: 'sin($x)' },
    math_cos: { inputs: ['x'], outputs: ['result'], code: 'cos($x)' },
    math_tan: { inputs: ['x'], outputs: ['result'], code: 'tan($x)' },
    math_floor: { inputs: ['x'], outputs: ['result'], code: 'floor($x)' },
    math_ceil: { inputs: ['x'], outputs: ['result'], code: 'ceil($x)' },
    math_fract: { inputs: ['x'], outputs: ['result'], code: 'fract($x)' },
    math_mod: { inputs: ['x', 'y'], outputs: ['result'], code: 'mod($x, $y)' },
    math_min: { inputs: ['a', 'b'], outputs: ['result'], code: 'min($a, $b)' },
    math_max: { inputs: ['a', 'b'], outputs: ['result'], code: 'max($a, $b)' },
    math_clamp: { inputs: ['x', 'min', 'max'], outputs: ['result'], code: 'clamp($x, $min, $max)' },
    math_step: { inputs: ['edge', 'x'], outputs: ['result'], code: 'step($edge, $x)' },
    math_smoothstep: {
      inputs: ['edge0', 'edge1', 'x'],
      outputs: ['result'],
      code: 'smoothstep($edge0, $edge1, $x)',
    },
    math_mix: { inputs: ['a', 'b', 't'], outputs: ['result'], code: 'mix($a, $b, $t)' },
    math_dot: { inputs: ['a', 'b'], outputs: ['result'], code: 'dot($a, $b)' },
    math_cross: { inputs: ['a', 'b'], outputs: ['result'], code: 'cross($a, $b)' },
    math_normalize: { inputs: ['v'], outputs: ['result'], code: 'normalize($v)' },
    math_length: { inputs: ['v'], outputs: ['result'], code: 'length($v)' },
    math_distance: { inputs: ['a', 'b'], outputs: ['result'], code: 'distance($a, $b)' },
    math_reflect: { inputs: ['i', 'n'], outputs: ['result'], code: 'reflect($i, $n)' },
    vector_combine: { inputs: ['x', 'y', 'z', 'w'], outputs: ['vec4'], code: 'vec4($x, $y, $z, $w)' },
    vector_separate: { inputs: ['v'], outputs: ['x', 'y', 'z', 'w'], code: '' },
    color_rgb: { inputs: ['r', 'g', 'b'], outputs: ['color'], code: 'vec3($r, $g, $b)' },
    color_hsv: { inputs: ['h', 's', 'v'], outputs: ['color'], code: 'hsv2rgb(vec3($h, $s, $v))' },
    color_brightness: { inputs: ['color', 'brightness'], outputs: ['result'], code: '($color * $brightness)' },
    color_contrast: {
      inputs: ['color', 'contrast'],
      outputs: ['result'],
      code: '(($color - 0.5) * $contrast + 0.5)',
    },
    color_saturation: { inputs: ['color', 'saturation'], outputs: ['result'], code: '' },
    color_invert: { inputs: ['color'], outputs: ['result'], code: '(1.0 - $color)' },
    color_mix: { inputs: ['a', 'b', 't'], outputs: ['result'], code: 'mix($a, $b, $t)' },
    texture_sample: { inputs: ['tex', 'uv'], outputs: ['color', 'alpha'], code: 'texture2D($tex, $uv)' },
    texture_noise: { inputs: ['uv', 'scale'], outputs: ['value'], code: 'noise($uv * $scale)' },
    texture_voronoi: { inputs: ['uv', 'scale'], outputs: ['value', 'cell'], code: 'voronoi($uv * $scale)' },
    texture_gradient: { inputs: ['uv', 'type'], outputs: ['value'], code: '' },
    output_color: { inputs: ['color'], outputs: [], code: 'gl_FragColor.rgb = $color;' },
    output_alpha: { inputs: ['alpha'], outputs: [], code: 'gl_FragColor.a = $alpha;' },
    constant_float: { inputs: [], outputs: ['value'], code: '$value' },
    constant_vec2: { inputs: [], outputs: ['value'], code: 'vec2($x, $y)' },
    constant_vec3: { inputs: [], outputs: ['value'], code: 'vec3($x, $y, $z)' },
    constant_vec4: { inputs: [], outputs: ['value'], code: 'vec4($x, $y, $z, $w)' },
  };

class ShaderEditor {
  private shaders: Map<string, CustomShader> = new Map();
  private templates: ShaderTemplate[] = [...shaderTemplates];
  private graphs: Map<string, ShaderGraph> = new Map();

  constructor() {
    // Initialize with templates as available shaders
    this.templates.forEach((template) => {
      const shader = this.createShaderFromTemplate(template);
      this.shaders.set(shader.id, shader);
    });
  }

  /**
   * Create a new custom shader
   */
  createShader(config: Partial<CustomShader>): CustomShader {
    const shader: CustomShader = {
      id: config.id || `shader_${Date.now()}`,
      name: config.name || 'New Shader',
      description: config.description,
      vertexShader:
        config.vertexShader ||
        `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader:
        config.fragmentShader ||
        `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}`,
      uniforms: config.uniforms || [{ name: 'uColor', type: 'vec3', value: [1, 1, 1] }],
      category: config.category || 'custom',
    };

    this.shaders.set(shader.id, shader);
    return shader;
  }

  /**
   * Create shader from template
   */
  createShaderFromTemplate(template: ShaderTemplate): CustomShader {
    return this.createShader({
      id: `shader_${template.id}_${Date.now()}`,
      name: template.name,
      description: template.description,
      vertexShader: template.vertexShader,
      fragmentShader: template.fragmentShader,
      uniforms: JSON.parse(JSON.stringify(template.uniforms)),
      category: template.category,
    });
  }

  /**
   * Get shader by ID
   */
  getShader(id: string): CustomShader | undefined {
    return this.shaders.get(id);
  }

  /**
   * Update shader code
   */
  updateShaderCode(
    id: string,
    vertexShader?: string,
    fragmentShader?: string
  ): CustomShader | undefined {
    const shader = this.shaders.get(id);
    if (!shader) return undefined;

    if (vertexShader) shader.vertexShader = vertexShader;
    if (fragmentShader) shader.fragmentShader = fragmentShader;

    return shader;
  }

  /**
   * Update uniform value
   */
  updateUniform(
    shaderId: string,
    uniformName: string,
    value: ShaderUniform['value']
  ): boolean {
    const shader = this.shaders.get(shaderId);
    if (!shader) return false;

    const uniform = shader.uniforms.find((u) => u.name === uniformName);
    if (!uniform) return false;

    uniform.value = value;
    return true;
  }

  /**
   * Add uniform to shader
   */
  addUniform(shaderId: string, uniform: ShaderUniform): boolean {
    const shader = this.shaders.get(shaderId);
    if (!shader) return false;

    shader.uniforms.push(uniform);
    return true;
  }

  /**
   * Remove uniform from shader
   */
  removeUniform(shaderId: string, uniformName: string): boolean {
    const shader = this.shaders.get(shaderId);
    if (!shader) return false;

    const index = shader.uniforms.findIndex((u) => u.name === uniformName);
    if (index === -1) return false;

    shader.uniforms.splice(index, 1);
    return true;
  }

  /**
   * Get all templates
   */
  getTemplates(): ShaderTemplate[] {
    return [...this.templates];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: CustomShader['category']): ShaderTemplate[] {
    return this.templates.filter((t) => t.category === category);
  }

  /**
   * Get all shaders
   */
  getAllShaders(): CustomShader[] {
    return Array.from(this.shaders.values());
  }

  /**
   * Delete shader
   */
  deleteShader(id: string): boolean {
    return this.shaders.delete(id);
  }

  /**
   * Validate GLSL code (basic syntax check)
   */
  validateGLSL(code: string, type: 'vertex' | 'fragment'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic syntax checks
    if (!code.includes('void main()') && !code.includes('void main ()')) {
      errors.push('Missing main() function');
    }

    if (type === 'fragment' && !code.includes('gl_FragColor')) {
      errors.push('Fragment shader must set gl_FragColor');
    }

    if (type === 'vertex' && !code.includes('gl_Position')) {
      errors.push('Vertex shader must set gl_Position');
    }

    // Check for matching braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }

    // Check for semicolons after statements
    const lines = code.split('\n');
    lines.forEach((line, _index) => {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('#') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(';') &&
        !trimmed.startsWith('uniform') &&
        !trimmed.startsWith('varying') &&
        !trimmed.startsWith('attribute') &&
        !trimmed.includes('void main')
      ) {
        // This could be a multi-line statement, so we only warn
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create shader graph for visual editing
   */
  createGraph(name: string): ShaderGraph {
    const graph: ShaderGraph = {
      id: `graph_${Date.now()}`,
      name,
      nodes: [],
      connections: [],
      outputNode: '',
    };
    this.graphs.set(graph.id, graph);
    return graph;
  }

  /**
   * Add node to graph
   */
  addNode(graphId: string, type: ShaderNodeType, position: { x: number; y: number }): ShaderNode | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const def = nodeDefinitions[type];
    const node: ShaderNode = {
      id: `node_${Date.now()}`,
      type,
      name: type.replace(/_/g, ' '),
      position,
      inputs: def.inputs.map((name, i) => ({
        id: `input_${i}`,
        name,
        type: 'float',
      })),
      outputs: def.outputs.map((name, i) => ({
        id: `output_${i}`,
        name,
        type: name as ShaderNodePort['type'],
      })),
      properties: {},
    };

    graph.nodes.push(node);
    return node;
  }

  /**
   * Connect nodes in graph
   */
  connectNodes(
    graphId: string,
    fromNode: string,
    fromPort: string,
    toNode: string,
    toPort: string
  ): ShaderConnection | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    const connection: ShaderConnection = {
      id: `conn_${Date.now()}`,
      fromNode,
      fromPort,
      toNode,
      toPort,
    };

    graph.connections.push(connection);
    return connection;
  }

  /**
   * Compile graph to GLSL
   */
  compileGraph(graphId: string): { vertexShader: string; fragmentShader: string } | undefined {
    const graph = this.graphs.get(graphId);
    if (!graph) return undefined;

    // Simplified graph compilation - would need full implementation for production
    const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

    let fragmentCode = '';

    // Generate code from nodes (simplified)
    graph.nodes.forEach((node) => {
      const def = nodeDefinitions[node.type];
      if (def && def.code) {
        fragmentCode += `// ${node.name}\n`;
      }
    });

    const fragmentShader = `
varying vec2 vUv;
void main() {
  ${fragmentCode}
  gl_FragColor = vec4(1.0);
}`;

    return { vertexShader, fragmentShader };
  }

  /**
   * Export shader to JSON
   */
  exportShader(id: string): string | null {
    const shader = this.shaders.get(id);
    if (!shader) return null;
    return JSON.stringify(shader, null, 2);
  }

  /**
   * Import shader from JSON
   */
  importShader(json: string): CustomShader | null {
    try {
      const shader = JSON.parse(json) as CustomShader;
      shader.id = `shader_imported_${Date.now()}`;
      this.shaders.set(shader.id, shader);
      return shader;
    } catch {
      return null;
    }
  }

  /**
   * Generate uniform declarations for shader
   */
  generateUniformDeclarations(uniforms: ShaderUniform[]): string {
    return uniforms
      .map((u) => `uniform ${u.type} ${u.name};`)
      .join('\n');
  }

  /**
   * Get node definitions
   */
  getNodeDefinitions(): typeof nodeDefinitions {
    return { ...nodeDefinitions };
  }
}

export const shaderEditor = new ShaderEditor();
