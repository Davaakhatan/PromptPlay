/**
 * AI Art Generator Service
 * Integrates with AI image generation APIs to create game assets
 */

export interface ArtGenerationConfig {
  prompt: string;
  style: ArtStyle;
  size: ImageSize;
  count?: number;
  negativePrompt?: string;
  seed?: number;
}

export type ArtStyle =
  | 'pixel-art'
  | 'hand-drawn'
  | 'vector'
  | 'realistic'
  | 'anime'
  | 'cartoon'
  | 'low-poly'
  | 'retro'
  | 'watercolor'
  | 'sketch';

export type ImageSize =
  | '32x32'
  | '64x64'
  | '128x128'
  | '256x256'
  | '512x512'
  | '1024x1024';

export interface GeneratedArt {
  id: string;
  url: string;
  base64?: string;
  prompt: string;
  style: ArtStyle;
  size: ImageSize;
  timestamp: number;
  metadata: {
    model: string;
    seed?: number;
    inferenceTime?: number;
  };
}

export interface SpriteSheetConfig {
  prompt: string;
  style: ArtStyle;
  frameCount: number;
  animationType: 'idle' | 'walk' | 'run' | 'attack' | 'jump' | 'death' | 'custom';
  direction: 'side' | 'front' | 'back' | 'isometric';
  characterType?: string;
}

export interface GeneratedSpriteSheet {
  id: string;
  frames: string[];
  spriteSheetUrl: string;
  config: SpriteSheetConfig;
  frameWidth: number;
  frameHeight: number;
}

export interface TilesetConfig {
  prompt: string;
  style: ArtStyle;
  tileSize: 16 | 32 | 64;
  tileTypes: TileType[];
  biome?: string;
}

export type TileType =
  | 'ground'
  | 'wall'
  | 'water'
  | 'grass'
  | 'path'
  | 'decoration'
  | 'obstacle'
  | 'corner'
  | 'edge';

export interface GeneratedTileset {
  id: string;
  tiles: Map<TileType, string[]>;
  tilesetUrl: string;
  config: TilesetConfig;
}

export interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isAvailable: boolean;
}

// Style prompts that enhance generation quality
const STYLE_PROMPTS: Record<ArtStyle, string> = {
  'pixel-art': 'pixel art style, 8-bit, retro game graphics, sharp pixels, no anti-aliasing',
  'hand-drawn': 'hand drawn illustration, pencil sketch, artistic strokes, traditional art',
  'vector': 'vector art, flat design, clean lines, minimal shadows, SVG-like',
  'realistic': 'photorealistic, detailed textures, realistic lighting, high quality',
  'anime': 'anime style, manga art, cel shaded, vibrant colors, Japanese animation',
  'cartoon': 'cartoon style, bold outlines, exaggerated features, bright colors',
  'low-poly': 'low polygon 3D style, geometric shapes, flat shading, minimal details',
  'retro': 'retro game style, 16-bit era, SNES graphics, classic game art',
  'watercolor': 'watercolor painting, soft edges, color blending, artistic wash',
  'sketch': 'pencil sketch, line drawing, rough strokes, concept art style',
};

// Animation frame descriptions
const ANIMATION_FRAMES: Record<string, string[]> = {
  idle: ['standing still', 'slight breathing motion', 'blinking', 'subtle movement'],
  walk: ['left foot forward', 'mid step', 'right foot forward', 'mid step return'],
  run: ['running leap', 'mid stride', 'landing', 'push off'],
  attack: ['wind up', 'swing', 'impact', 'follow through'],
  jump: ['crouch', 'leap up', 'peak height', 'landing'],
  death: ['hit reaction', 'falling', 'on ground', 'fade out'],
};

class AIArtGeneratorService {
  private providers: Map<string, AIProvider> = new Map();
  private generationHistory: GeneratedArt[] = [];
  private activeProvider: string | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Check for available API keys in environment
    const stabilityKey = import.meta.env?.VITE_STABILITY_API_KEY;
    const replicateKey = import.meta.env?.VITE_REPLICATE_API_KEY;
    const openaiKey = import.meta.env?.VITE_OPENAI_API_KEY;

    if (stabilityKey) {
      this.providers.set('stability', {
        name: 'Stability AI',
        apiKey: stabilityKey,
        baseUrl: 'https://api.stability.ai/v1',
        model: 'stable-diffusion-xl-1024-v1-0',
        isAvailable: true,
      });
      this.activeProvider = 'stability';
    }

    if (replicateKey) {
      this.providers.set('replicate', {
        name: 'Replicate',
        apiKey: replicateKey,
        baseUrl: 'https://api.replicate.com/v1',
        model: 'sdxl',
        isAvailable: true,
      });
      if (!this.activeProvider) this.activeProvider = 'replicate';
    }

    if (openaiKey) {
      this.providers.set('openai', {
        name: 'OpenAI DALL-E',
        apiKey: openaiKey,
        baseUrl: 'https://api.openai.com/v1',
        model: 'dall-e-3',
        isAvailable: true,
      });
      if (!this.activeProvider) this.activeProvider = 'openai';
    }
  }

  /**
   * Check if any AI art provider is available
   */
  isAvailable(): boolean {
    return this.providers.size > 0 && this.activeProvider !== null;
  }

  /**
   * Get list of available providers
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Set active provider
   */
  setActiveProvider(providerName: string): boolean {
    if (this.providers.has(providerName)) {
      this.activeProvider = providerName;
      return true;
    }
    return false;
  }

  /**
   * Configure a provider with API key
   */
  configureProvider(
    providerName: string,
    apiKey: string,
    baseUrl?: string
  ): void {
    const existing = this.providers.get(providerName);
    if (existing) {
      existing.apiKey = apiKey;
      existing.isAvailable = true;
      if (baseUrl) existing.baseUrl = baseUrl;
    } else {
      this.providers.set(providerName, {
        name: providerName,
        apiKey,
        baseUrl: baseUrl || '',
        model: 'default',
        isAvailable: true,
      });
    }

    if (!this.activeProvider) {
      this.activeProvider = providerName;
    }
  }

  /**
   * Generate a single image
   */
  async generateImage(config: ArtGenerationConfig): Promise<GeneratedArt> {
    if (!this.isAvailable()) {
      throw new Error('No AI art provider configured. Please add an API key.');
    }

    const provider = this.providers.get(this.activeProvider!)!;
    const enhancedPrompt = this.enhancePrompt(config.prompt, config.style);

    const startTime = Date.now();

    try {
      // Attempt to call the actual API
      const result = await this.callProvider(provider, {
        ...config,
        prompt: enhancedPrompt,
      });

      const generatedArt: GeneratedArt = {
        id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: result.url || '',
        base64: result.base64,
        prompt: config.prompt,
        style: config.style,
        size: config.size,
        timestamp: Date.now(),
        metadata: {
          model: provider.model,
          seed: config.seed,
          inferenceTime: Date.now() - startTime,
        },
      };

      this.generationHistory.push(generatedArt);
      return generatedArt;
    } catch (error) {
      console.error('AI art generation failed:', error);
      // Return a placeholder for demo/development
      return this.generatePlaceholder(config);
    }
  }

  /**
   * Generate multiple images
   */
  async generateImages(config: ArtGenerationConfig): Promise<GeneratedArt[]> {
    const count = config.count || 4;
    const results: GeneratedArt[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.generateImage({
        ...config,
        seed: config.seed ? config.seed + i : undefined,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Generate a sprite sheet with animation frames
   */
  async generateSpriteSheet(config: SpriteSheetConfig): Promise<GeneratedSpriteSheet> {
    const frames: string[] = [];
    const frameDescriptions = ANIMATION_FRAMES[config.animationType] ||
      Array(config.frameCount).fill('animation frame');

    const basePrompt = `${config.characterType || 'character'}, ${config.direction} view`;

    for (let i = 0; i < config.frameCount; i++) {
      const framePrompt = `${basePrompt}, ${frameDescriptions[i % frameDescriptions.length]}, game sprite, transparent background`;

      try {
        const result = await this.generateImage({
          prompt: framePrompt,
          style: config.style,
          size: '128x128',
        });
        frames.push(result.url || result.base64 || '');
      } catch {
        frames.push(this.generatePlaceholderDataUrl('128x128'));
      }
    }

    // Combine frames into a sprite sheet (in a real implementation)
    const spriteSheetUrl = await this.combineFrames(frames, config.frameCount);

    return {
      id: `spritesheet_${Date.now()}`,
      frames,
      spriteSheetUrl,
      config,
      frameWidth: 128,
      frameHeight: 128,
    };
  }

  /**
   * Generate a tileset
   */
  async generateTileset(config: TilesetConfig): Promise<GeneratedTileset> {
    const tiles = new Map<TileType, string[]>();

    for (const tileType of config.tileTypes) {
      const tilePrompt = `${config.biome || ''} ${tileType} tile, ${config.tileSize}x${config.tileSize} pixels, tileable, seamless, game asset`;

      const tileImages: string[] = [];

      // Generate 4 variations of each tile type
      for (let i = 0; i < 4; i++) {
        try {
          const result = await this.generateImage({
            prompt: tilePrompt,
            style: config.style,
            size: `${config.tileSize}x${config.tileSize}` as ImageSize,
          });
          tileImages.push(result.url || result.base64 || '');
        } catch {
          tileImages.push(this.generatePlaceholderDataUrl(`${config.tileSize}x${config.tileSize}`));
        }
      }

      tiles.set(tileType, tileImages);
    }

    // Combine into tileset image
    const tilesetUrl = await this.combineTiles(tiles, config);

    return {
      id: `tileset_${Date.now()}`,
      tiles,
      tilesetUrl,
      config,
    };
  }

  /**
   * Generate a game background
   */
  async generateBackground(
    description: string,
    style: ArtStyle,
    layers: number = 3
  ): Promise<{ layers: GeneratedArt[]; parallaxConfig: { speed: number }[] }> {
    const layerDescriptions = [
      'far background, sky, distant mountains',
      'mid background, trees, buildings',
      'near background, foreground elements',
    ];

    const layerPromises = Array(layers).fill(null).map((_, i) =>
      this.generateImage({
        prompt: `${description}, ${layerDescriptions[i] || 'background layer'}, game background, horizontal scrolling`,
        style,
        size: '1024x1024',
      })
    );

    const layerResults = await Promise.all(layerPromises);

    return {
      layers: layerResults,
      parallaxConfig: layerResults.map((_, i) => ({
        speed: 0.2 + (i * 0.3), // Increasing speed for closer layers
      })),
    };
  }

  /**
   * Generate UI elements
   */
  async generateUIElements(
    theme: string,
    style: ArtStyle,
    elements: ('button' | 'panel' | 'icon' | 'frame' | 'progress-bar')[]
  ): Promise<Map<string, GeneratedArt>> {
    const results = new Map<string, GeneratedArt>();

    for (const element of elements) {
      const elementPrompt = `${theme} themed ${element}, UI element, game interface, clean design`;

      const result = await this.generateImage({
        prompt: elementPrompt,
        style,
        size: element === 'icon' ? '64x64' : '256x256',
      });

      results.set(element, result);
    }

    return results;
  }

  /**
   * Generate character portrait
   */
  async generatePortrait(
    characterDescription: string,
    emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised',
    style: ArtStyle
  ): Promise<GeneratedArt> {
    const prompt = `portrait of ${characterDescription}, ${emotion} expression, character portrait, game art, bust shot`;

    return this.generateImage({
      prompt,
      style,
      size: '256x256',
    });
  }

  /**
   * Enhance a prompt with style-specific keywords
   */
  private enhancePrompt(prompt: string, style: ArtStyle): string {
    const styleEnhancement = STYLE_PROMPTS[style] || '';
    return `${prompt}, ${styleEnhancement}, game asset, high quality`;
  }

  /**
   * Call the active AI provider
   */
  private async callProvider(
    provider: AIProvider,
    config: ArtGenerationConfig
  ): Promise<{ url?: string; base64?: string }> {
    const [width, height] = config.size.split('x').map(Number);

    switch (provider.name) {
      case 'Stability AI':
        return this.callStabilityAI(provider, config, width, height);
      case 'Replicate':
        return this.callReplicate(provider, config, width, height);
      case 'OpenAI DALL-E':
        return this.callOpenAI(provider, config);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  private async callStabilityAI(
    provider: AIProvider,
    config: ArtGenerationConfig,
    width: number,
    height: number
  ): Promise<{ url?: string; base64?: string }> {
    const response = await fetch(`${provider.baseUrl}/generation/${provider.model}/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          { text: config.prompt, weight: 1 },
          ...(config.negativePrompt ? [{ text: config.negativePrompt, weight: -1 }] : []),
        ],
        cfg_scale: 7,
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        steps: 30,
        samples: 1,
        seed: config.seed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stability AI error: ${response.statusText}`);
    }

    const data = await response.json();
    return { base64: data.artifacts[0].base64 };
  }

  private async callReplicate(
    provider: AIProvider,
    config: ArtGenerationConfig,
    width: number,
    height: number
  ): Promise<{ url?: string; base64?: string }> {
    const response = await fetch(`${provider.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${provider.apiKey}`,
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:latest',
        input: {
          prompt: config.prompt,
          negative_prompt: config.negativePrompt,
          width: Math.min(width, 1024),
          height: Math.min(height, 1024),
          seed: config.seed,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate error: ${response.statusText}`);
    }

    const data = await response.json();

    // Poll for completion
    let prediction = data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`${provider.baseUrl}/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${provider.apiKey}` },
      });
      prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
      throw new Error('Replicate prediction failed');
    }

    return { url: prediction.output[0] };
  }

  private async callOpenAI(
    provider: AIProvider,
    config: ArtGenerationConfig
  ): Promise<{ url?: string; base64?: string }> {
    const response = await fetch(`${provider.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: config.prompt,
        n: 1,
        size: config.size === '1024x1024' ? '1024x1024' : '1024x1024',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.data[0].url };
  }

  /**
   * Generate a placeholder image for development/demo
   */
  private generatePlaceholder(config: ArtGenerationConfig): GeneratedArt {
    return {
      id: `placeholder_${Date.now()}`,
      url: this.generatePlaceholderDataUrl(config.size),
      prompt: config.prompt,
      style: config.style,
      size: config.size,
      timestamp: Date.now(),
      metadata: {
        model: 'placeholder',
      },
    };
  }

  private generatePlaceholderDataUrl(size: string): string {
    const [width, height] = size.split('x').map(Number);

    // Create a simple colored placeholder
    const canvas = typeof document !== 'undefined'
      ? document.createElement('canvas')
      : null;

    if (!canvas) {
      // Return a data URL for a 1x1 pixel
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    const gridSize = Math.min(width, height) / 8;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Add text
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.min(width, height) / 8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${width}x${height}`, width / 2, height / 2);

    return canvas.toDataURL('image/png');
  }

  /**
   * Combine frames into a sprite sheet
   */
  private async combineFrames(frames: string[], frameCount: number): Promise<string> {
    const canvas = typeof document !== 'undefined'
      ? document.createElement('canvas')
      : null;

    if (!canvas) return '';

    const frameSize = 128;
    canvas.width = frameSize * frameCount;
    canvas.height = frameSize;
    const ctx = canvas.getContext('2d')!;

    // Load and draw each frame
    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      img.src = frames[i];
      await new Promise(resolve => { img.onload = resolve; });
      ctx.drawImage(img, i * frameSize, 0, frameSize, frameSize);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Combine tiles into a tileset image
   */
  private async combineTiles(
    tiles: Map<TileType, string[]>,
    config: TilesetConfig
  ): Promise<string> {
    const canvas = typeof document !== 'undefined'
      ? document.createElement('canvas')
      : null;

    if (!canvas) return '';

    const tilesPerRow = 4;
    const rows = config.tileTypes.length;
    canvas.width = config.tileSize * tilesPerRow;
    canvas.height = config.tileSize * rows;
    const ctx = canvas.getContext('2d')!;

    let row = 0;
    for (const [, tileImages] of tiles) {
      for (let col = 0; col < tileImages.length && col < tilesPerRow; col++) {
        const img = new Image();
        img.src = tileImages[col];
        await new Promise(resolve => { img.onload = resolve; });
        ctx.drawImage(
          img,
          col * config.tileSize,
          row * config.tileSize,
          config.tileSize,
          config.tileSize
        );
      }
      row++;
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Get generation history
   */
  getHistory(): GeneratedArt[] {
    return [...this.generationHistory];
  }

  /**
   * Clear generation history
   */
  clearHistory(): void {
    this.generationHistory = [];
  }

  /**
   * Download generated art
   */
  downloadArt(art: GeneratedArt, filename?: string): void {
    const link = document.createElement('a');
    link.href = art.url || `data:image/png;base64,${art.base64}`;
    link.download = filename || `${art.id}.png`;
    link.click();
  }
}

// Singleton instance
export const aiArtGenerator = new AIArtGeneratorService();
