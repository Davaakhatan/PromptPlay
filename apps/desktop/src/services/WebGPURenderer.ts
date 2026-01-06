/**
 * WebGPU Renderer Service - v6.0
 * Next-generation graphics rendering using WebGPU API
 */

export interface WebGPUConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio?: number;
  antialias?: boolean;
  powerPreference?: 'low-power' | 'high-performance';
}

export interface WebGPUCapabilities {
  supported: boolean;
  adapter: string;
  features: string[];
  limits: Record<string, number>;
  preferredFormat: string;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textureMemory: number;
  bufferMemory: number;
  pipelineCount: number;
}

export interface ShaderModule {
  id: string;
  type: 'vertex' | 'fragment' | 'compute';
  code: string;
  compiled: boolean;
}

export interface RenderPipeline {
  id: string;
  name: string;
  vertexShader: string;
  fragmentShader: string;
  topology: 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
  cullMode: 'none' | 'front' | 'back';
  frontFace: 'ccw' | 'cw';
  depthTest: boolean;
  depthWrite: boolean;
  blending: boolean;
}

export interface GPUBuffer {
  id: string;
  type: 'vertex' | 'index' | 'uniform' | 'storage';
  size: number;
  usage: number;
}

export interface GPUTexture {
  id: string;
  width: number;
  height: number;
  format: string;
  mipLevels: number;
  samples: number;
}

export interface ComputeShader {
  id: string;
  code: string;
  workgroupSize: [number, number, number];
  bindings: Array<{ binding: number; type: 'buffer' | 'texture' | 'sampler' }>;
}

type EventCallback = (data: unknown) => void;
type RendererEventType = 'initialized' | 'frame' | 'resize' | 'error' | 'lost' | 'restored';

// Actual GPU device and context (when WebGPU is available)
interface WebGPUContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

class WebGPURenderer {
  private listeners: Map<RendererEventType, EventCallback[]> = new Map();
  private _initialized = false;
  private _supported = false;
  private _gpuContext: WebGPUContext | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private stats: RenderStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    textureMemory: 0,
    bufferMemory: 0,
    pipelineCount: 0,
  };
  private shaders: Map<string, ShaderModule> = new Map();
  private pipelines: Map<string, RenderPipeline> = new Map();
  private buffers: Map<string, GPUBuffer> = new Map();
  private textures: Map<string, GPUTexture> = new Map();
  private computeShaders: Map<string, ComputeShader> = new Map();
  private _gpuPipelines: Map<string, GPURenderPipeline> = new Map();
  private _gpuBuffers: Map<string, globalThis.GPUBuffer> = new Map();
  private _gpuTextures: Map<string, globalThis.GPUTexture> = new Map();
  private _gpuComputePipelines: Map<string, GPUComputePipeline> = new Map();
  private frameCount = 0;
  private lastTime = 0;

  constructor() {
    this.checkSupport();
  }

  get gpuContext(): WebGPUContext | null {
    return this._gpuContext;
  }

  get device(): GPUDevice | null {
    return this._gpuContext?.device ?? null;
  }

  // Check WebGPU support
  async checkSupport(): Promise<boolean> {
    if (!navigator.gpu) {
      this._supported = false;
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      this._supported = adapter !== null;
      return this._supported;
    } catch {
      this._supported = false;
      return false;
    }
  }

  get supported(): boolean {
    return this._supported;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  // Get WebGPU capabilities
  async getCapabilities(): Promise<WebGPUCapabilities> {
    if (!navigator.gpu) {
      return {
        supported: false,
        adapter: 'none',
        features: [],
        limits: {},
        preferredFormat: 'bgra8unorm',
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          adapter: 'unavailable',
          features: [],
          limits: {},
          preferredFormat: 'bgra8unorm',
        };
      }

      const features = Array.from(adapter.features);
      const limits: Record<string, number> = {};

      // Get important limits
      const limitNames = [
        'maxTextureDimension1D',
        'maxTextureDimension2D',
        'maxTextureDimension3D',
        'maxTextureArrayLayers',
        'maxBindGroups',
        'maxBindingsPerBindGroup',
        'maxDynamicUniformBuffersPerPipelineLayout',
        'maxDynamicStorageBuffersPerPipelineLayout',
        'maxSampledTexturesPerShaderStage',
        'maxSamplersPerShaderStage',
        'maxStorageBuffersPerShaderStage',
        'maxStorageTexturesPerShaderStage',
        'maxUniformBuffersPerShaderStage',
        'maxUniformBufferBindingSize',
        'maxStorageBufferBindingSize',
        'maxVertexBuffers',
        'maxVertexAttributes',
        'maxVertexBufferArrayStride',
        'maxComputeWorkgroupStorageSize',
        'maxComputeInvocationsPerWorkgroup',
        'maxComputeWorkgroupSizeX',
        'maxComputeWorkgroupSizeY',
        'maxComputeWorkgroupSizeZ',
      ];

      for (const name of limitNames) {
        const value = (adapter.limits as unknown as Record<string, number>)[name];
        if (value !== undefined) {
          limits[name] = value;
        }
      }

      // Get adapter info - may not be available in all implementations
      let info = { vendor: 'unknown', architecture: 'unknown' };
      try {
        const adapterInfo = await (adapter as unknown as { requestAdapterInfo?: () => Promise<{ vendor: string; architecture: string }> }).requestAdapterInfo?.();
        if (adapterInfo) {
          info = adapterInfo;
        }
      } catch {
        // Ignore - use default info
      }

      return {
        supported: true,
        adapter: `${info.vendor} - ${info.architecture}`,
        features,
        limits,
        preferredFormat: navigator.gpu.getPreferredCanvasFormat(),
      };
    } catch (error) {
      return {
        supported: false,
        adapter: 'error',
        features: [],
        limits: {},
        preferredFormat: 'bgra8unorm',
      };
    }
  }

  // Event handling
  on(event: RendererEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: RendererEventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: RendererEventType, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Initialize renderer with actual WebGPU context
  async initialize(config: WebGPUConfig): Promise<boolean> {
    if (!navigator.gpu) {
      this._supported = false;
      this.emit('error', { message: 'WebGPU not supported in this browser' });
      return false;
    }

    try {
      // 1. Request adapter
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: config.powerPreference ?? 'high-performance',
      });

      if (!adapter) {
        this._supported = false;
        this.emit('error', { message: 'Failed to get WebGPU adapter' });
        return false;
      }

      // 2. Request device
      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {},
      });

      // Handle device loss
      device.lost.then((info) => {
        console.error('WebGPU device lost:', info.message);
        this._initialized = false;
        this._gpuContext = null;
        this.emit('lost', { reason: info.reason, message: info.message });
      });

      // 3. Configure canvas context
      const context = config.canvas.getContext('webgpu');
      if (!context) {
        this.emit('error', { message: 'Failed to get WebGPU canvas context' });
        return false;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
      });

      // Store context
      this._gpuContext = { adapter, device, context, format };
      this._canvas = config.canvas;
      this._supported = true;
      this._initialized = true;

      // Create default pipelines
      await this.createDefaultPipelines();

      this.emit('initialized', { config, format });
      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      this._supported = false;
      this.emit('error', { message: 'Failed to initialize WebGPU', error });
      return false;
    }
  }

  // Create default render pipelines
  private async createDefaultPipelines(): Promise<void> {
    if (!this._gpuContext) return;

    const { device, format } = this._gpuContext;

    // Basic shader module
    const basicShaderCode = `
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
      };

      @vertex
      fn vs_main(@location(0) position: vec3<f32>, @location(1) color: vec4<f32>) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4<f32>(position, 1.0);
        output.color = color;
        return output;
      }

      @fragment
      fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        return input.color;
      }
    `;

    const shaderModule = device.createShaderModule({
      code: basicShaderCode,
    });

    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 28, // 3 floats position + 4 floats color
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x4' },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this._gpuPipelines.set('basic', pipeline);
    this.stats.pipelineCount = this._gpuPipelines.size;
  }

  // Create shader module
  createShader(id: string, type: ShaderModule['type'], code: string): ShaderModule {
    const shader: ShaderModule = {
      id,
      type,
      code,
      compiled: true, // Mock - would actually compile
    };
    this.shaders.set(id, shader);
    return shader;
  }

  // Get built-in shaders
  getBuiltInShaders(): Record<string, { vertex: string; fragment: string }> {
    return {
      basic: {
        vertex: `
@vertex
fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(position, 1.0);
}`,
        fragment: `
@fragment
fn main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}`,
      },
      textured: {
        vertex: `
@group(0) @binding(0) var<uniform> mvp: mat4x4<f32>;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = mvp * vec4<f32>(input.position, 1.0);
    output.uv = input.uv;
    return output;
}`,
        fragment: `
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(tex, texSampler, uv);
}`,
      },
      pbr: {
        vertex: `
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct Uniforms {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
    cameraPosition: vec3<f32>,
};

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec3<f32>,
    @location(4) bitangent: vec3<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let worldPos = (uniforms.model * vec4<f32>(input.position, 1.0)).xyz;
    output.position = uniforms.projection * uniforms.view * vec4<f32>(worldPos, 1.0);
    output.worldPos = worldPos;
    output.normal = (uniforms.model * vec4<f32>(input.normal, 0.0)).xyz;
    output.uv = input.uv;
    output.tangent = (uniforms.model * vec4<f32>(input.tangent.xyz, 0.0)).xyz;
    output.bitangent = cross(output.normal, output.tangent) * input.tangent.w;
    return output;
}`,
        fragment: `
@group(0) @binding(1) var<uniform> material: Material;
@group(0) @binding(2) var texSampler: sampler;
@group(0) @binding(3) var albedoMap: texture_2d<f32>;
@group(0) @binding(4) var normalMap: texture_2d<f32>;
@group(0) @binding(5) var metallicRoughnessMap: texture_2d<f32>;

struct Material {
    baseColor: vec4<f32>,
    metallic: f32,
    roughness: f32,
    ao: f32,
    emissive: vec3<f32>,
};

const PI: f32 = 3.14159265359;

fn distributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let NdotH = max(dot(N, H), 0.0);
    let NdotH2 = NdotH * NdotH;
    let denom = (NdotH2 * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom);
}

@fragment
fn main(
    @location(0) worldPos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec3<f32>,
    @location(4) bitangent: vec3<f32>,
) -> @location(0) vec4<f32> {
    let albedo = textureSample(albedoMap, texSampler, uv).rgb * material.baseColor.rgb;
    let N = normalize(normal);

    // Simple lighting for demo
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let diff = max(dot(N, lightDir), 0.0);
    let color = albedo * (0.3 + diff * 0.7);

    return vec4<f32>(color, 1.0);
}`,
      },
    };
  }

  // Create render pipeline
  createPipeline(config: RenderPipeline): RenderPipeline {
    this.pipelines.set(config.id, config);
    this.stats.pipelineCount = this.pipelines.size;
    return config;
  }

  // Create buffer
  createBuffer(id: string, type: GPUBuffer['type'], size: number): GPUBuffer {
    const buffer: GPUBuffer = {
      id,
      type,
      size,
      usage: this.getBufferUsage(type),
    };
    this.buffers.set(id, buffer);
    this.stats.bufferMemory += size;
    return buffer;
  }

  private getBufferUsage(type: GPUBuffer['type']): number {
    // Mock usage flags - in real WebGPU these would be GPUBufferUsage flags
    switch (type) {
      case 'vertex': return 0x0020; // VERTEX
      case 'index': return 0x0010; // INDEX
      case 'uniform': return 0x0040; // UNIFORM
      case 'storage': return 0x0080; // STORAGE
      default: return 0;
    }
  }

  // Create texture
  createTexture(id: string, width: number, height: number, format = 'rgba8unorm'): GPUTexture {
    const mipLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
    const texture: GPUTexture = {
      id,
      width,
      height,
      format,
      mipLevels,
      samples: 1,
    };
    this.textures.set(id, texture);
    this.stats.textureMemory += width * height * 4; // Approximate RGBA size
    return texture;
  }

  // Create compute shader with actual GPU pipeline
  createComputeShader(config: ComputeShader): ComputeShader {
    this.computeShaders.set(config.id, config);

    // Create actual GPU compute pipeline if initialized
    if (this._gpuContext) {
      const { device } = this._gpuContext;

      const shaderModule = device.createShaderModule({
        code: config.code,
      });

      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      this._gpuComputePipelines.set(config.id, computePipeline);
    }

    return config;
  }

  // Execute compute shader
  async executeComputeShader(
    shaderId: string,
    bindGroups: { binding: number; resource: GPUBindingResource }[],
    dispatchX: number,
    dispatchY = 1,
    dispatchZ = 1
  ): Promise<void> {
    if (!this._gpuContext) {
      throw new Error('WebGPU not initialized');
    }

    const pipeline = this._gpuComputePipelines.get(shaderId);
    if (!pipeline) {
      throw new Error(`Compute shader not found: ${shaderId}`);
    }

    const { device } = this._gpuContext;

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: bindGroups.map(({ binding, resource }) => ({
        binding,
        resource,
      })),
    });

    // Create command encoder
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();

    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(dispatchX, dispatchY, dispatchZ);
    passEncoder.end();

    // Submit
    device.queue.submit([commandEncoder.finish()]);
  }

  // Create GPU buffer
  createGPUBuffer(
    id: string,
    size: number,
    usage: GPUBufferUsageFlags,
    mappedAtCreation = false
  ): globalThis.GPUBuffer | null {
    if (!this._gpuContext) return null;

    const buffer = this._gpuContext.device.createBuffer({
      size,
      usage,
      mappedAtCreation,
    });

    this._gpuBuffers.set(id, buffer);
    this.stats.bufferMemory += size;

    return buffer;
  }

  // Get GPU buffer by ID
  getGPUBuffer(id: string): globalThis.GPUBuffer | undefined {
    return this._gpuBuffers.get(id);
  }

  // Create GPU texture
  createGPUTexture(
    id: string,
    width: number,
    height: number,
    format: GPUTextureFormat = 'rgba8unorm',
    usage: GPUTextureUsageFlags = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
  ): globalThis.GPUTexture | null {
    if (!this._gpuContext) return null;

    const texture = this._gpuContext.device.createTexture({
      size: { width, height },
      format,
      usage,
    });

    this._gpuTextures.set(id, texture);
    this.stats.textureMemory += width * height * 4;

    return texture;
  }

  // Get GPU texture by ID
  getGPUTexture(id: string): globalThis.GPUTexture | undefined {
    return this._gpuTextures.get(id);
  }

  // Write data to GPU buffer
  writeBuffer(bufferId: string, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    if (!this._gpuContext) return;

    const buffer = this._gpuBuffers.get(bufferId);
    if (!buffer) return;

    this._gpuContext.device.queue.writeBuffer(buffer, offset, data);
  }

  // Read data from GPU buffer (async)
  async readBuffer(bufferId: string, size: number): Promise<ArrayBuffer | null> {
    if (!this._gpuContext) return null;

    const srcBuffer = this._gpuBuffers.get(bufferId);
    if (!srcBuffer) return null;

    const { device } = this._gpuContext;

    // Create staging buffer for readback
    const stagingBuffer = device.createBuffer({
      size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Copy from source to staging
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(srcBuffer, 0, stagingBuffer, 0, size);
    device.queue.submit([commandEncoder.finish()]);

    // Map and read
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = stagingBuffer.getMappedRange().slice(0);
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    return data;
  }

  // Get example compute shaders
  getExampleComputeShaders(): Record<string, string> {
    return {
      particleUpdate: `
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;

struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>,
    life: f32,
    size: f32,
};

struct Params {
    deltaTime: f32,
    gravity: vec3<f32>,
    emitterPos: vec3<f32>,
};

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&particles)) { return; }

    var p = particles[idx];

    // Update position
    p.velocity = p.velocity + params.gravity * params.deltaTime;
    p.position = p.position + p.velocity * params.deltaTime;
    p.life = p.life - params.deltaTime;

    // Respawn if dead
    if (p.life <= 0.0) {
        p.position = params.emitterPos;
        p.life = 1.0;
    }

    particles[idx] = p;
}`,
      imageProcess: `
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(inputTex);
    if (id.x >= dims.x || id.y >= dims.y) { return; }

    let color = textureLoad(inputTex, vec2<i32>(id.xy), 0);

    // Apply grayscale
    let gray = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let output = vec4<f32>(gray, gray, gray, color.a);

    textureStore(outputTex, vec2<i32>(id.xy), output);
}`,
      physicsSimulation: `
@group(0) @binding(0) var<storage, read> positions: array<vec3<f32>>;
@group(0) @binding(1) var<storage, read> velocities: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> forces: array<vec3<f32>>;
@group(0) @binding(3) var<uniform> params: PhysicsParams;

struct PhysicsParams {
    gravity: vec3<f32>,
    damping: f32,
    springK: f32,
    restLength: f32,
};

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    let count = arrayLength(&positions);
    if (idx >= count) { return; }

    var force = params.gravity;
    let pos = positions[idx];

    // Simple n-body interaction
    for (var i = 0u; i < count; i = i + 1u) {
        if (i == idx) { continue; }
        let delta = positions[i] - pos;
        let dist = length(delta);
        if (dist > 0.01) {
            force = force + normalize(delta) * params.springK / (dist * dist);
        }
    }

    // Apply damping
    force = force - velocities[idx] * params.damping;

    forces[idx] = force;
}`,
    };
  }

  // Get render stats
  getStats(): RenderStats {
    return { ...this.stats };
  }

  // Update stats (called each frame)
  updateStats(drawCalls: number, triangles: number): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.frameCount++;

    this.stats.frameTime = delta;
    this.stats.fps = Math.round(1000 / delta);
    this.stats.drawCalls = drawCalls;
    this.stats.triangles = triangles;

    this.emit('frame', this.stats);
  }

  // Resize
  resize(width: number, height: number): void {
    this.emit('resize', { width, height });
  }

  // Cleanup
  dispose(): void {
    // Destroy GPU buffers
    this._gpuBuffers.forEach((buffer) => buffer.destroy());
    this._gpuBuffers.clear();

    // Destroy GPU textures
    this._gpuTextures.forEach((texture) => texture.destroy());
    this._gpuTextures.clear();

    // Clear pipelines (they don't need explicit destruction)
    this._gpuPipelines.clear();
    this._gpuComputePipelines.clear();

    // Clear metadata
    this.shaders.clear();
    this.pipelines.clear();
    this.buffers.clear();
    this.textures.clear();
    this.computeShaders.clear();

    // Reset context
    this._gpuContext = null;
    this._canvas = null;
    this._initialized = false;

    this.stats = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      textureMemory: 0,
      bufferMemory: 0,
      pipelineCount: 0,
    };
  }

  // Feature detection helpers
  static async isSupported(): Promise<boolean> {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  // Fallback info
  getFallbackInfo(): { renderer: string; reason: string; alternatives: string[] } {
    return {
      renderer: 'WebGL2',
      reason: this._supported ? 'User preference' : 'WebGPU not available in this browser',
      alternatives: [
        'WebGL2 (current fallback)',
        'Software rendering (slow)',
        'Update browser to Chrome 113+ or Firefox 121+',
        'Enable WebGPU flag in browser settings',
      ],
    };
  }
}

export const webGPURenderer = new WebGPURenderer();
export default webGPURenderer;
