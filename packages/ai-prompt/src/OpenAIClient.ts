import OpenAI from 'openai';
import { GameSpec } from '@promptplay/shared-types';
import { SYSTEM_PROMPT } from './templates/base';
import { PLATFORMER_PROMPT } from './templates/platformer';
import { SHOOTER_PROMPT } from './templates/shooter';
import { PUZZLE_PROMPT } from './templates/puzzle';
import { validateGameSpec } from './validators/SpecValidator';

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateGameSpec(
    userPrompt: string,
    genre?: 'platformer' | 'shooter' | 'puzzle'
  ): Promise<GameSpec> {
    const genrePrompt = genre ? this.getGenrePrompt(genre) : '';
    const fullSystemPrompt = SYSTEM_PROMPT + genrePrompt;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: fullSystemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // Extract JSON from response
    let jsonString = content;

    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                      content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    const spec = JSON.parse(jsonString) as GameSpec;

    // Validate spec
    const validatedSpec = validateGameSpec(spec);

    return validatedSpec;
  }

  async generateWithRetry(
    prompt: string,
    genre?: 'platformer' | 'shooter' | 'puzzle',
    maxRetries = 3
  ): Promise<GameSpec> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const spec = await this.generateGameSpec(prompt, genre);
        return spec;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        console.warn(`Attempt ${i + 1} failed, retrying...`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private getGenrePrompt(genre: string): string {
    switch (genre) {
      case 'platformer':
        return PLATFORMER_PROMPT;
      case 'shooter':
        return SHOOTER_PROMPT;
      case 'puzzle':
        return PUZZLE_PROMPT;
      default:
        return '';
    }
  }
}
