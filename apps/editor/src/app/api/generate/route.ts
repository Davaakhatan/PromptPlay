import { NextRequest, NextResponse } from 'next/server';
import { OpenAIClient } from '@promptplay/ai-prompt';

export async function POST(request: NextRequest) {
  try {
    const { prompt, genre } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new OpenAIClient(apiKey);
    const spec = await client.generateWithRetry(prompt, genre);

    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error generating spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate game spec. Please try again.' },
      { status: 500 }
    );
  }
}
