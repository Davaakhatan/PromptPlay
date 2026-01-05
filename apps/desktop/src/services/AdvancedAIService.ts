import Anthropic from '@anthropic-ai/sdk';
import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

// Template types for advanced generation
export type GameTemplate =
  | 'platformer'
  | 'shooter'
  | 'puzzle'
  | 'rpg'
  | 'racing'
  | 'endless-runner'
  | 'tower-defense'
  | 'match-3';

export interface GenerationOptions {
  template?: GameTemplate;
  style?: 'pixel' | 'minimalist' | 'modern' | 'retro';
  complexity?: 'simple' | 'medium' | 'complex';
  features?: string[];
  worldSize?: { width: number; height: number };
}

export interface AIGenerationResult {
  success: boolean;
  gameSpec?: GameSpec;
  explanation?: string;
  error?: string;
}

export interface AIEntitySuggestion {
  name: string;
  description: string;
  components: Record<string, unknown>;
  tags: string[];
}

export interface AILevelIdea {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  entities: AIEntitySuggestion[];
  layout: string;
}

/**
 * Advanced AI Service
 * Provides sophisticated AI-powered game generation capabilities
 */
export class AdvancedAIService {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Try to get API key from environment
    this.apiKey = (import.meta.env?.VITE_ANTHROPIC_API_KEY as string) || null;
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey, dangerouslyAllowBrowser: true });
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Set API key dynamically
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  /**
   * Generate a complete game from a description
   */
  async generateGame(
    description: string,
    options: GenerationOptions = {}
  ): Promise<AIGenerationResult> {
    if (!this.client) {
      return this.generateFallbackGame(description, options);
    }

    try {
      const systemPrompt = this.buildGameGenerationPrompt(options);

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate a game based on this description: "${description}"

Return a JSON object with the game specification. The response should ONLY contain valid JSON, no markdown or explanation.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const gameSpec = JSON.parse(jsonMatch[0]) as GameSpec;

      return {
        success: true,
        gameSpec,
        explanation: 'Game generated successfully using AI',
      };
    } catch (err) {
      console.error('AI generation error:', err);
      return this.generateFallbackGame(description, options);
    }
  }

  /**
   * Generate entity suggestions for a game
   */
  async suggestEntities(
    gameSpec: GameSpec,
    context: string
  ): Promise<AIEntitySuggestion[]> {
    if (!this.client) {
      return this.getFallbackEntitySuggestions(context);
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are a game design assistant. Suggest entities that would improve the game.
Return a JSON array of entity suggestions with name, description, components, and tags.`,
        messages: [
          {
            role: 'user',
            content: `Current game has ${gameSpec.entities.length} entities: ${gameSpec.entities.map(e => e.name).join(', ')}.

User request: "${context}"

Suggest 3-5 new entities that would complement this game. Return ONLY a JSON array.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return this.getFallbackEntitySuggestions(context);
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.getFallbackEntitySuggestions(context);
      }

      return JSON.parse(jsonMatch[0]) as AIEntitySuggestion[];
    } catch (err) {
      console.error('AI suggestion error:', err);
      return this.getFallbackEntitySuggestions(context);
    }
  }

  /**
   * Generate level ideas
   */
  async generateLevelIdeas(
    gameSpec: GameSpec,
    count: number = 3
  ): Promise<AILevelIdea[]> {
    if (!this.client) {
      return this.getFallbackLevelIdeas(gameSpec);
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `You are a level design assistant. Generate creative level ideas for games.
Each level should have a name, description, difficulty, entity layout, and list of entities.`,
        messages: [
          {
            role: 'user',
            content: `Generate ${count} level ideas for this ${gameSpec.metadata?.genre || 'platformer'} game.
Current entities: ${gameSpec.entities.map(e => e.name).join(', ')}.

Return a JSON array with level ideas.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return this.getFallbackLevelIdeas(gameSpec);
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.getFallbackLevelIdeas(gameSpec);
      }

      return JSON.parse(jsonMatch[0]) as AILevelIdea[];
    } catch (err) {
      console.error('AI level generation error:', err);
      return this.getFallbackLevelIdeas(gameSpec);
    }
  }

  /**
   * Analyze and improve a game
   */
  async analyzeAndImprove(gameSpec: GameSpec): Promise<{
    analysis: string;
    suggestions: string[];
    improvedSpec?: GameSpec;
  }> {
    if (!this.client) {
      return {
        analysis: 'AI analysis requires an API key. Please configure your Anthropic API key.',
        suggestions: [
          'Add more variety to entity types',
          'Consider adding collectibles for score',
          'Add sound effects for actions',
          'Create multiple difficulty levels',
        ],
      };
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are a game design expert. Analyze games and provide actionable improvements.`,
        messages: [
          {
            role: 'user',
            content: `Analyze this game specification and suggest improvements:

${JSON.stringify(gameSpec, null, 2)}

Provide:
1. Brief analysis of current game state
2. List of 5 specific improvements
3. Any gameplay balance concerns`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse the analysis
      const lines = content.text.split('\n');
      const suggestions: string[] = [];
      let analysis = '';

      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          suggestions.push(line.replace(/^\d+\.\s*/, ''));
        } else {
          analysis += line + '\n';
        }
      }

      return {
        analysis: analysis.trim(),
        suggestions,
      };
    } catch (err) {
      console.error('AI analysis error:', err);
      return {
        analysis: 'Error analyzing game. Please try again.',
        suggestions: [],
      };
    }
  }

  /**
   * Generate code for a custom system
   */
  async generateSystem(
    description: string,
    gameSpec: GameSpec
  ): Promise<{ code: string; explanation: string }> {
    if (!this.client) {
      return this.getFallbackSystemCode(description);
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are a game systems programmer. Write TypeScript code for ECS game systems.
The code should:
- Export an update function that receives (world, delta)
- Use world.query() to get entities
- Modify component values directly
- Be clean and well-commented`,
        messages: [
          {
            role: 'user',
            content: `Create a system for: "${description}"

Available entities: ${gameSpec.entities.map(e => `${e.name} (${Object.keys(e.components).join(', ')})`).join('; ')}

Return the TypeScript code in a code block, followed by a brief explanation.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return this.getFallbackSystemCode(description);
      }

      // Extract code block
      const codeMatch = content.text.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : '';
      const explanation = content.text.replace(/```[\s\S]*?```/g, '').trim();

      return { code, explanation };
    } catch (err) {
      console.error('AI code generation error:', err);
      return this.getFallbackSystemCode(description);
    }
  }

  // ========== Private Helper Methods ==========

  private buildGameGenerationPrompt(options: GenerationOptions): string {
    return `You are a game design AI that generates game specifications in JSON format.

Create games that are fun, balanced, and playable. Follow these guidelines:
- Template: ${options.template || 'platformer'}
- Style: ${options.style || 'minimalist'}
- Complexity: ${options.complexity || 'medium'}
- World size: ${options.worldSize?.width || 800}x${options.worldSize?.height || 600}

The game spec should include:
- metadata: name, description, version, genre
- config: worldBounds, gravity, background
- entities: array of game objects with components

Each entity needs:
- name: unique identifier
- components: transform, sprite, and optionally: collider, velocity, input, health, ai
- tags: array of descriptive tags

Make the game immediately playable with proper physics and controls.`;
  }

  private generateFallbackGame(
    description: string,
    options: GenerationOptions
  ): AIGenerationResult {
    const width = options.worldSize?.width || 800;
    const height = options.worldSize?.height || 600;
    const template = options.template || 'platformer';

    // Build game spec with type assertion for extended properties
    const gameSpec = {
      version: '1.0.0',
      metadata: {
        title: this.extractGameName(description),
        name: this.extractGameName(description),
        description: description,
        genre: template === 'shooter' ? 'shooter' : 'platformer',
      },
      config: {
        worldBounds: { width, height },
        gravity: { x: 0, y: template === 'shooter' ? 0 : 500 },
      },
      entities: this.generateFallbackEntities(template, width, height),
      systems: ['physics', 'input', 'render'],
    } as GameSpec;

    return {
      success: true,
      gameSpec,
      explanation: 'Generated using built-in templates (AI requires API key)',
    };
  }

  private extractGameName(description: string): string {
    const words = description.split(' ').slice(0, 3);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Game';
  }

  private generateFallbackEntities(template: string, width: number, height: number): EntitySpec[] {
    // Build entities with extended properties, then cast
    const entities: unknown[] = [];

    // Player
    entities.push({
      name: 'Player',
      components: {
        transform: { x: 100, y: height - 100 },
        sprite: { width: 32, height: 48 },
        collider: { type: 'box', width: 32, height: 48 },
        velocity: { vx: 0, vy: 0 },
        input: {
          moveSpeed: 200,
          jumpForce: template === 'platformer' ? 400 : 0,
          canJump: template === 'platformer',
        },
      },
      tags: ['player'],
    });

    // Ground
    entities.push({
      name: 'Ground',
      components: {
        transform: { x: width / 2, y: height - 20 },
        sprite: { width: width, height: 40 },
        collider: { type: 'box', width: width, height: 40, isStatic: true },
      },
      tags: ['ground', 'static'],
    });

    // Template-specific entities
    if (template === 'platformer') {
      // Platforms
      for (let i = 0; i < 3; i++) {
        entities.push({
          name: `Platform${i + 1}`,
          components: {
            transform: { x: 150 + i * 200, y: height - 150 - i * 80 },
            sprite: { width: 120, height: 20 },
            collider: { type: 'box', width: 120, height: 20, isStatic: true },
          },
          tags: ['platform', 'static'],
        });
      }

      // Collectibles
      for (let i = 0; i < 5; i++) {
        entities.push({
          name: `Coin${i + 1}`,
          components: {
            transform: { x: 100 + i * 150, y: height - 200 - i * 50 },
            sprite: { width: 20, height: 20 },
            collider: { type: 'circle', radius: 10, isSensor: true },
          },
          tags: ['collectible', 'coin'],
        });
      }
    }

    if (template === 'shooter') {
      // Enemies
      for (let i = 0; i < 3; i++) {
        entities.push({
          name: `Enemy${i + 1}`,
          components: {
            transform: { x: width - 100 - i * 100, y: 100 + i * 150 },
            sprite: { width: 30, height: 30 },
            collider: { type: 'box', width: 30, height: 30 },
            health: { current: 3, max: 3 },
            ai: { type: 'patrol', speed: 50, detectionRange: 200 },
          },
          tags: ['enemy'],
        });
      }
    }

    return entities as EntitySpec[];
  }

  private getFallbackEntitySuggestions(_context: string): AIEntitySuggestion[] {
    return [
      {
        name: 'Collectible',
        description: 'A pickup item that gives points',
        components: {
          transform: { x: 400, y: 300 },
          sprite: { width: 20, height: 20, color: '#fbbf24' },
          collider: { type: 'circle', radius: 10, isSensor: true },
        },
        tags: ['collectible'],
      },
      {
        name: 'MovingPlatform',
        description: 'A platform that moves between two points',
        components: {
          transform: { x: 300, y: 400 },
          sprite: { width: 100, height: 20, color: '#6366f1' },
          collider: { type: 'rectangle', width: 100, height: 20, isStatic: true },
        },
        tags: ['platform', 'moving'],
      },
      {
        name: 'Hazard',
        description: 'A dangerous obstacle',
        components: {
          transform: { x: 500, y: 550 },
          sprite: { width: 40, height: 20, color: '#dc2626' },
          collider: { type: 'rectangle', width: 40, height: 20, isSensor: true },
        },
        tags: ['hazard', 'danger'],
      },
    ];
  }

  private getFallbackLevelIdeas(_gameSpec: GameSpec): AILevelIdea[] {
    return [
      {
        name: 'Tutorial Forest',
        description: 'A gentle introduction with basic jumps and few enemies',
        difficulty: 'easy',
        layout: 'Linear progression with teaching moments',
        entities: [
          { name: 'SignPost', description: 'Shows controls', components: {}, tags: ['tutorial'] },
        ],
      },
      {
        name: 'Cave Challenge',
        description: 'Underground level with falling platforms and tight spaces',
        difficulty: 'medium',
        layout: 'Vertical with branching paths',
        entities: [
          { name: 'FallingPlatform', description: 'Falls when stepped on', components: {}, tags: ['platform', 'hazard'] },
        ],
      },
      {
        name: 'Sky Temple',
        description: 'High altitude with wind mechanics and moving platforms',
        difficulty: 'hard',
        layout: 'Open vertical space with floating islands',
        entities: [
          { name: 'WindZone', description: 'Pushes player', components: {}, tags: ['effect'] },
        ],
      },
    ];
  }

  private getFallbackSystemCode(description: string): { code: string; explanation: string } {
    return {
      code: `// ${description}
let timer = 0;

export function update(world: any, delta: number) {
  timer += delta;

  // Query entities with specific components
  const entities = world.query(['transform', 'velocity']);

  for (const entity of entities) {
    // Example: apply oscillation
    entity.transform.y += Math.sin(timer * 2) * 0.5;
  }
}`,
      explanation: `This is a template system for "${description}". Customize the update function to implement your specific behavior. The system receives the world object and delta time (seconds since last frame).`,
    };
  }
}

// Singleton instance
export const advancedAI = new AdvancedAIService();
