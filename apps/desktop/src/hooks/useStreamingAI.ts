import { useState, useCallback, useRef } from 'react';
import { chatHistoryService } from '../services/ChatHistoryService';

interface UseStreamingAIOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  currentResponse: string;
  error: string | null;
}

export function useStreamingAI(options: UseStreamingAIOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    currentResponse: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const responseBufferRef = useRef<string>('');

  const simulateStreaming = useCallback(async (
    response: string,
    delay: number = 20
  ): Promise<void> => {
    responseBufferRef.current = '';

    for (let i = 0; i < response.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      const char = response[i];
      responseBufferRef.current += char;

      setState(prev => ({
        ...prev,
        currentResponse: responseBufferRef.current,
      }));

      options.onToken?.(char);

      // Variable delay for more natural feel
      const charDelay = char === '\n' ? delay * 3 :
                       char === '.' ? delay * 2 :
                       delay;
      await new Promise(resolve => setTimeout(resolve, charDelay));
    }
  }, [options]);

  const sendMessage = useCallback(async (
    message: string,
    context?: {
      gameSpec?: unknown;
      selectedEntity?: string;
      runtimeErrors?: string[];
    }
  ): Promise<string> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    responseBufferRef.current = '';

    setState({
      isStreaming: true,
      currentResponse: '',
      error: null,
    });

    // Add user message to history
    chatHistoryService.addMessage('user', message);

    try {
      // In demo mode, simulate AI response
      // In production, this would make actual API calls
      const demoResponse = generateDemoResponse(message, context);

      await simulateStreaming(demoResponse);

      // Add assistant message to history
      chatHistoryService.addMessage('assistant', demoResponse, {
        appliedChanges: demoResponse.includes('"entities"'),
        codeGenerated: demoResponse.includes('```'),
      });

      setState(prev => ({
        ...prev,
        isStreaming: false,
      }));

      options.onComplete?.(demoResponse);
      return demoResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage !== 'Aborted') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: errorMessage,
        }));
        options.onError?.(errorMessage);
      }

      throw err;
    }
  }, [simulateStreaming, options]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      isStreaming: false,
      currentResponse: '',
      error: null,
    });
  }, [cancel]);

  return {
    ...state,
    sendMessage,
    cancel,
    reset,
  };
}

// Demo response generator (simulates AI)
function generateDemoResponse(
  message: string,
  context?: {
    gameSpec?: unknown;
    selectedEntity?: string;
    runtimeErrors?: string[];
  }
): string {
  const lowerMessage = message.toLowerCase();

  // Handle runtime error context
  if (context?.runtimeErrors && context.runtimeErrors.length > 0) {
    return `I see you're encountering some runtime errors. Let me analyze them:

${context.runtimeErrors.map((err, i) => `**Error ${i + 1}:** ${err}`).join('\n')}

Here are some suggestions to fix these issues:

1. **Check entity references** - Make sure all entity names in your game spec match exactly
2. **Verify component data** - Ensure all required component fields are present
3. **Review collision setup** - Check that collider dimensions are positive numbers

Would you like me to help fix any specific error?`;
  }

  // Add player
  if (lowerMessage.includes('add') && lowerMessage.includes('player')) {
    return `I'll add a player entity with movement controls. Here's what I'm creating:

- **Player** entity at position (400, 300)
- Input component for keyboard controls (WASD/Arrow keys)
- Collider for physics interactions
- Blue color to distinguish from other entities

The player will be able to move left/right and jump when you press Space or Up arrow.`;
  }

  // Add enemy
  if (lowerMessage.includes('add') && lowerMessage.includes('enemy')) {
    return `Adding an enemy entity to your game:

- **Enemy** entity that patrols back and forth
- AI behavior with patrol mode
- Red color for easy identification
- Collider for player interaction

The enemy will automatically patrol between two points. You can adjust the patrol distance in the Inspector.`;
  }

  // Physics question
  if (lowerMessage.includes('physics') || lowerMessage.includes('gravity')) {
    return `The physics system uses **Matter.js** for 2D physics simulation.

**Current Settings:**
- Gravity: (0, 9.8) - standard Earth gravity
- Collision detection: Continuous
- Physics step: 60 FPS

You can adjust these in the **Physics** panel on the right side. Some presets available:
- **Platformer**: Standard gravity, good for jump mechanics
- **Space**: Zero gravity, objects float
- **Underwater**: Reduced gravity with drag`;
  }

  // Code generation
  if (lowerMessage.includes('script') || lowerMessage.includes('code') || lowerMessage.includes('custom')) {
    return `Here's a custom system you can use:

\`\`\`typescript
// Custom patrol system
let direction = 1;
let distance = 0;
const MAX_DISTANCE = 100;

export function update(world: any, delta: number) {
  const enemies = world.query(['transform', 'ai']);

  for (const enemy of enemies) {
    enemy.transform.x += direction * 50 * delta;
    distance += Math.abs(50 * delta);

    if (distance >= MAX_DISTANCE) {
      direction *= -1;
      distance = 0;
    }
  }
}
\`\`\`

You can paste this in the **Code** panel and click "Load" to activate it.`;
  }

  // Help
  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return `Here's how to use the editor:

**Creating Entities:**
- Right-click in Scene Tree → Add Entity
- Or use the + button in the toolbar

**Editing Properties:**
- Select entity in Scene Tree or Canvas
- Modify values in the Props panel

**Running Your Game:**
- Click the Play button (▶) to test
- Use Pause to stop simulation

**Keyboard Shortcuts:**
- Cmd/Ctrl+S: Save
- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z: Redo
- Delete: Remove selected entity

What would you like to know more about?`;
  }

  // Default response
  return `I understand you want to: "${message}"

I'm currently in demo mode with limited capabilities. In the full version, I can:

- **Modify your game** by editing entities and components
- **Generate code** for custom game systems
- **Debug issues** by analyzing runtime errors
- **Suggest improvements** based on game design patterns

Try asking me to:
- "Add a player with controls"
- "Create an enemy that patrols"
- "Help me understand physics"
- "Write a custom movement script"`;
}
