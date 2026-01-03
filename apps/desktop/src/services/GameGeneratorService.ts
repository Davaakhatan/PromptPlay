import type { GameSpec } from '@promptplay/shared-types';
import { SYSTEM_PROMPT } from '@promptplay/ai-prompt';

/**
 * Game generation options
 */
export interface GameGenerationOptions {
  genre?: 'platformer' | 'shooter' | 'puzzle' | 'auto';
  complexity?: 'simple' | 'medium' | 'complex';
  style?: string;
  includeEnemies?: boolean;
  includeCollectibles?: boolean;
}

/**
 * Game generation result
 */
export interface GameGenerationResult {
  success: boolean;
  gameSpec?: GameSpec;
  error?: string;
  suggestions?: string[];
}

/**
 * Prompt templates for different game types
 */
const GENRE_PROMPTS = {
  platformer: `Create a platformer game with:
- A player character with movement and jumping
- Ground platforms at various heights
- At least 3 platforms to jump between
- Proper physics for jumping and falling`,

  shooter: `Create a top-down shooter game with:
- A player character that can move in all directions
- No gravity (top-down view)
- Player should have health
- Open arena-style layout`,

  puzzle: `Create a puzzle game with:
- Interactive objects the player can push
- A goal or target area
- Simple mechanics for solving puzzles
- Clear visual distinction between elements`,
};

/**
 * Service for generating games from natural language descriptions
 */
export class GameGeneratorService {
  private apiKey: string | null = null;
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';

  /**
   * Set API key for AI generation
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Generate a game from a natural language description
   */
  async generateGame(
    description: string,
    options: GameGenerationOptions = {}
  ): Promise<GameGenerationResult> {
    // Build the prompt
    const prompt = this.buildPrompt(description, options);

    // Try to call the AI API
    if (this.apiKey) {
      return this.generateWithAPI(prompt);
    }

    // Fallback to demo mode
    return this.generateDemo(description, options);
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(description: string, options: GameGenerationOptions): string {
    let prompt = `User request: ${description}\n\n`;

    // Add genre-specific guidance
    if (options.genre && options.genre !== 'auto') {
      prompt += `Genre guidance:\n${GENRE_PROMPTS[options.genre]}\n\n`;
    }

    // Add complexity guidance
    if (options.complexity) {
      switch (options.complexity) {
        case 'simple':
          prompt += 'Keep the game simple with 3-5 entities total.\n';
          break;
        case 'medium':
          prompt += 'Create a moderately complex game with 5-10 entities.\n';
          break;
        case 'complex':
          prompt += 'Create a rich game with 10-15 entities and varied mechanics.\n';
          break;
      }
    }

    // Add optional features
    if (options.includeEnemies) {
      prompt += 'Include at least one enemy with AI behavior.\n';
    }
    if (options.includeCollectibles) {
      prompt += 'Include collectible items (coins, gems, etc.).\n';
    }

    prompt += '\nGenerate a complete GameSpec JSON for this game.';

    return prompt;
  }

  /**
   * Generate using the AI API
   */
  private async generateWithAPI(prompt: string): Promise<GameGenerationResult> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No content in response');
      }

      // Parse the JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const gameSpec = JSON.parse(jsonMatch[0]) as GameSpec;

      return {
        success: true,
        gameSpec,
        suggestions: this.extractSuggestions(content),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a demo game (no API required)
   */
  private generateDemo(
    description: string,
    options: GameGenerationOptions
  ): GameGenerationResult {
    const lowerDesc = description.toLowerCase();

    // Detect genre from description
    let genre = options.genre || 'platformer';
    if (genre === 'auto') {
      if (lowerDesc.includes('shoot') || lowerDesc.includes('space') || lowerDesc.includes('bullet')) {
        genre = 'shooter';
      } else if (lowerDesc.includes('puzzle') || lowerDesc.includes('push') || lowerDesc.includes('solve')) {
        genre = 'puzzle';
      } else {
        genre = 'platformer';
      }
    }

    // Detect color preferences
    let playerColor = '#3498dbff';
    if (lowerDesc.includes('red')) playerColor = '#e74c3cff';
    if (lowerDesc.includes('green')) playerColor = '#2ecc71ff';
    if (lowerDesc.includes('blue')) playerColor = '#3498dbff';
    if (lowerDesc.includes('purple')) playerColor = '#9b59b6ff';
    if (lowerDesc.includes('orange')) playerColor = '#e67e22ff';
    if (lowerDesc.includes('yellow')) playerColor = '#f1c40fff';

    // Build the game spec based on genre
    const gameSpec = this.buildGameSpec(genre, playerColor, options);

    return {
      success: true,
      gameSpec,
      suggestions: [
        'Try modifying the player speed in the Inspector',
        'Add more platforms by duplicating existing ones',
        'Use the AI chat to add enemies or collectibles',
      ],
    };
  }

  /**
   * Build a game spec for a specific genre
   */
  private buildGameSpec(
    genre: string,
    playerColor: string,
    options: GameGenerationOptions
  ): GameSpec {
    const baseSpec: GameSpec = {
      version: '1.0',
      metadata: {
        title: 'Generated Game',
        genre: genre as 'platformer' | 'shooter' | 'puzzle',
        description: 'A game generated by AI',
      },
      config: {
        gravity: genre === 'shooter' ? { x: 0, y: 0 } : { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
      entities: [],
      systems: ['physics', 'input', 'collision', 'render'],
    };

    // Add player
    baseSpec.entities.push({
      name: 'player',
      components: {
        transform: { x: 100, y: genre === 'shooter' ? 300 : 400 },
        sprite: { texture: 'player', width: 32, height: genre === 'shooter' ? 32 : 48, tint: playerColor },
        collider: { type: 'box', width: 32, height: genre === 'shooter' ? 32 : 48 },
        input: {
          moveSpeed: genre === 'shooter' ? 250 : 200,
          jumpForce: genre === 'shooter' ? 0 : 400,
          canJump: genre !== 'shooter',
        },
        health: { current: 100, max: 100 },
      },
      tags: ['player'],
    });

    // Add genre-specific elements
    if (genre === 'platformer') {
      // Ground
      baseSpec.entities.push({
        name: 'ground',
        components: {
          transform: { x: 400, y: 580 },
          sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
          collider: { type: 'box', width: 800, height: 40 },
        },
        tags: ['static', 'platform'],
      });

      // Platforms
      const platforms = [
        { x: 200, y: 480, width: 150 },
        { x: 500, y: 400, width: 200 },
        { x: 300, y: 320, width: 150 },
        { x: 600, y: 250, width: 180 },
      ];

      platforms.forEach((p, i) => {
        baseSpec.entities.push({
          name: `platform_${i + 1}`,
          components: {
            transform: { x: p.x, y: p.y },
            sprite: { texture: 'platform', width: p.width, height: 20, tint: '#34495eff' },
            collider: { type: 'box', width: p.width, height: 20 },
          },
          tags: ['static', 'platform'],
        });
      });
    } else if (genre === 'shooter') {
      // Walls for arena
      const walls = [
        { name: 'wall_top', x: 400, y: 10, w: 800, h: 20 },
        { name: 'wall_bottom', x: 400, y: 590, w: 800, h: 20 },
        { name: 'wall_left', x: 10, y: 300, w: 20, h: 600 },
        { name: 'wall_right', x: 790, y: 300, w: 20, h: 600 },
      ];

      walls.forEach((wall) => {
        baseSpec.entities.push({
          name: wall.name,
          components: {
            transform: { x: wall.x, y: wall.y },
            sprite: { texture: 'wall', width: wall.w, height: wall.h, tint: '#2c3e50ff' },
            collider: { type: 'box', width: wall.w, height: wall.h },
          },
          tags: ['static', 'wall'],
        });
      });
    } else if (genre === 'puzzle') {
      // Ground
      baseSpec.entities.push({
        name: 'ground',
        components: {
          transform: { x: 400, y: 580 },
          sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
          collider: { type: 'box', width: 800, height: 40 },
        },
        tags: ['static', 'platform'],
      });

      // Pushable boxes
      for (let i = 0; i < 3; i++) {
        baseSpec.entities.push({
          name: `box_${i + 1}`,
          components: {
            transform: { x: 200 + i * 150, y: 520 },
            sprite: { texture: 'box', width: 40, height: 40, tint: '#e67e22ff' },
            collider: { type: 'box', width: 40, height: 40 },
          },
          tags: ['pushable'],
        });
      }

      // Goal area
      baseSpec.entities.push({
        name: 'goal',
        components: {
          transform: { x: 700, y: 540 },
          sprite: { texture: 'goal', width: 60, height: 60, tint: '#27ae60ff', zIndex: -1 },
          collider: { type: 'box', width: 60, height: 60, isSensor: true },
        },
        tags: ['goal', 'trigger'],
      });
    }

    // Add enemies if requested
    if (options.includeEnemies) {
      baseSpec.entities.push({
        name: 'enemy_1',
        components: {
          transform: { x: 600, y: genre === 'shooter' ? 200 : 400 },
          sprite: { texture: 'enemy', width: 32, height: 32, tint: '#e74c3cff' },
          collider: { type: 'box', width: 32, height: 32 },
          aiBehavior: { type: 'patrol', speed: 80, detectionRadius: 150, patrolRange: 100 },
          health: { current: 50, max: 50 },
        },
        tags: ['enemy'],
      });
      baseSpec.systems.push('ai');
    }

    // Add collectibles if requested
    if (options.includeCollectibles) {
      const collectiblePositions = [
        { x: 250, y: 440 },
        { x: 450, y: 360 },
        { x: 550, y: 210 },
      ];

      collectiblePositions.forEach((pos, i) => {
        baseSpec.entities.push({
          name: `coin_${i + 1}`,
          components: {
            transform: { x: pos.x, y: pos.y },
            sprite: { texture: 'coin', width: 24, height: 24, tint: '#f1c40fff' },
            collider: { type: 'circle', radius: 12, isSensor: true },
          },
          tags: ['collectible'],
        });
      });
    }

    return baseSpec;
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];

    // Look for suggestion patterns in the response
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('suggest') || line.includes('could') || line.includes('try')) {
        const cleaned = line.replace(/^[-*•]\s*/, '').trim();
        if (cleaned.length > 10 && cleaned.length < 200) {
          suggestions.push(cleaned);
        }
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Refine an existing game based on feedback
   */
  async refineGame(
    currentSpec: GameSpec,
    feedback: string
  ): Promise<GameGenerationResult> {
    const prompt = `Current game spec:
\`\`\`json
${JSON.stringify(currentSpec, null, 2)}
\`\`\`

User feedback: ${feedback}

Please modify the game spec to address this feedback. Return the complete updated GameSpec JSON.`;

    if (this.apiKey) {
      return this.generateWithAPI(prompt);
    }

    // Demo mode refinement
    return {
      success: true,
      gameSpec: currentSpec,
      suggestions: ['Use the Inspector to manually make changes', 'Try being more specific about what to change'],
    };
  }
}

// Singleton instance
export const gameGenerator = new GameGeneratorService();
