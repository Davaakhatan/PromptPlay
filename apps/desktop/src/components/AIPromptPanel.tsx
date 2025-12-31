import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GameSpec } from '@promptplay/shared-types';
import { AIIcon, SettingsIcon } from './Icons';
import DiffPreview from './DiffPreview';

interface AIPromptPanelProps {
  gameSpec: GameSpec | null;
  onApplyChanges: (updatedSpec: GameSpec) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIResponse {
  content: string;
  success: boolean;
  error: string | null;
}

export default function AIPromptPanel({
  gameSpec,
  onApplyChanges,
  isVisible,
  onClose,
}: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<GameSpec | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await invoke<boolean>('ai_check_api_key');
        setHasApiKey(hasKey);
      } catch (err) {
        console.error('Failed to check API key:', err);
      }
    };
    checkApiKey();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  // Example prompts for quick access
  const examplePrompts = [
    'Add a coin at (200, 400)',
    'Make the player faster',
    'Add 3 platforms in staircase',
    'Add an enemy at (300, 200)',
    'Create a health pickup',
    'Make player red',
    'Make player bigger',
    'Boost the jump',
  ];

  // Parse JSON from AI response
  const parseGameSpecFromResponse = (content: string): GameSpec | null => {
    // Look for JSON code blocks with game.json marker
    const jsonMatch = content.match(/```json:game\.json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e) {
        console.error('Failed to parse JSON from response:', e);
      }
    }

    // Also try generic JSON blocks
    const genericJsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (genericJsonMatch) {
      try {
        const parsed = JSON.parse(genericJsonMatch[1].trim());
        // Check if it looks like a GameSpec
        if (parsed.entities && parsed.metadata) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse generic JSON:', e);
      }
    }

    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !gameSpec || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // Prepare messages for API
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: prompt });

      // Send to Anthropic API via Rust backend
      const response = await invoke<AIResponse>('ai_send_message', {
        messages: apiMessages,
        gameContext: JSON.stringify(gameSpec, null, 2),
      });

      if (!response.success) {
        // If API key not set, fall back to simulated response
        if (response.error?.includes('API key')) {
          const simResponse = await simulateAIResponse(prompt, gameSpec);
          const assistantMessage: Message = {
            role: 'assistant',
            content: simResponse.message,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          if (simResponse.updatedSpec) {
            setPendingChanges(simResponse.updatedSpec);
          }
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Try to parse GameSpec from response
        const parsedSpec = parseGameSpecFromResponse(response.content);
        if (parsedSpec) {
          setPendingChanges(parsedSpec);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, gameSpec, isLoading, messages]);

  const handleApplyChanges = useCallback(() => {
    if (pendingChanges) {
      onApplyChanges(pendingChanges);
      setPendingChanges(null);

      const systemMessage: Message = {
        role: 'system',
        content: 'Changes applied successfully!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, systemMessage]);
    }
  }, [pendingChanges, onApplyChanges]);

  const handleRejectChanges = useCallback(() => {
    setPendingChanges(null);

    const systemMessage: Message = {
      role: 'system',
      content: 'Changes rejected.',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  const handleSaveApiKey = useCallback(async () => {
    try {
      await invoke('ai_set_api_key', { apiKey });
      setHasApiKey(true);
      setShowSettings(false);
      setApiKey('');

      const systemMessage: Message = {
        role: 'system',
        content: 'API key configured successfully!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (err) {
      console.error('Failed to set API key:', err);
    }
  }, [apiKey]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setPendingChanges(null);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[450px] bg-panel-solid rounded-xl shadow-2xl border border-subtle flex flex-col z-50 max-h-[700px] animate-scale-in overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <AIIcon size={20} />
          <span className="font-semibold tracking-wide">AI Assistant</span>
          {!hasApiKey && (
            <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-subtle border-b border-subtle">
          <h4 className="text-sm font-medium text-text-primary mb-2">API Settings</h4>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Anthropic API key"
              className="flex-1 px-3 py-1.5 bg-black/20 border border-subtle rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-tertiary"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            Or set ANTHROPIC_API_KEY environment variable
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[400px] bg-canvas/50">
        {messages.length === 0 && (
          <div className="text-center text-text-tertiary py-8">
            <AIIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-text-secondary">Ask me to modify your game!</p>
            <p className="text-xs mt-1">I can add entities, change properties, and more.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-3 py-2 rounded-lg text-sm shadow-sm ${msg.role === 'user'
                  ? 'bg-primary text-white'
                  : msg.role === 'system'
                    ? 'bg-white/5 text-text-secondary italic border border-subtle'
                    : 'bg-panel-solid border border-subtle text-text-primary'
                }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-invert prose-pre:bg-black/50 prose-pre:border prose-pre:border-subtle prose-code:text-primary-light prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-panel-solid px-3 py-2 rounded-lg border border-subtle">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Changes with Diff Preview */}
      {pendingChanges && gameSpec && (
        <div className="px-4 py-3 bg-primary/10 border-t border-primary/20 backdrop-blur-sm">
          <p className="text-sm text-primary-light mb-2 font-medium">Review Changes</p>
          <div className="bg-black/40 rounded border border-subtle overflow-hidden">
            <DiffPreview currentSpec={gameSpec} pendingSpec={pendingChanges} />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyChanges}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 shadow-lg shadow-green-900/20 transition-colors"
            >
              Apply Changes
            </button>
            <button
              onClick={handleRejectChanges}
              className="flex-1 px-3 py-1.5 bg-white/10 text-white rounded text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Example prompts */}
      {messages.length === 0 && (
        <div className="px-4 py-2 border-t border-subtle bg-subtle/50">
          <p className="text-xs text-text-tertiary mb-2">Try these:</p>
          <div className="flex flex-wrap gap-1">
            {examplePrompts.slice(0, 3).map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-xs px-2 py-1 bg-white/5 text-text-secondary rounded border border-subtle hover:bg-white/10 hover:text-text-primary transition-colors"
              >
                {example.length > 30 ? example.slice(0, 30) + '...' : example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-subtle bg-panel-solid">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to change..."
            className="flex-1 px-3 py-2 bg-black/20 border border-subtle rounded-lg text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-tertiary"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-colors"
            >
              Send
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simulated AI response function (fallback when no API key)
async function simulateAIResponse(
  prompt: string,
  gameSpec: GameSpec
): Promise<{ message: string; updatedSpec?: GameSpec }> {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  const lowerPrompt = prompt.toLowerCase();

  // Parse "add a coin at (x, y)" pattern
  const addCoinMatch = lowerPrompt.match(/add\s+(?:a\s+)?coin\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (addCoinMatch) {
    const x = parseInt(addCoinMatch[1]);
    const y = parseInt(addCoinMatch[2]);

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`coin${counter}`)) counter++;

    const newEntity = {
      name: `coin${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'coin', width: 24, height: 24, tint: 0xffd700 },
        collider: { type: 'circle' as const, radius: 12 },
      },
      tags: ['collectible', 'coin'],
    };

    return {
      message: `I'll add a **coin** at position (${x}, ${y}).\n\nThe coin is collectible and will disappear when the player touches it.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "make player faster" pattern
  if (lowerPrompt.includes('player') && (lowerPrompt.includes('faster') || lowerPrompt.includes('speed'))) {
    const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));
    if (playerEntity && playerEntity.components.input) {
      const speedIncrease = lowerPrompt.includes('much') ? 1.5 : 1.25;
      const currentSpeed = playerEntity.components.input.moveSpeed || 200;
      const newSpeed = Math.round(currentSpeed * speedIncrease);

      const updatedEntities = gameSpec.entities.map(e => {
        if (e.name === playerEntity.name && e.components.input) {
          return {
            ...e,
            components: {
              ...e.components,
              input: {
                ...e.components.input,
                moveSpeed: newSpeed,
              },
            },
          };
        }
        return e;
      });

      return {
        message: `I'll increase the player's movement speed from **${currentSpeed}** to **${newSpeed}**.`,
        updatedSpec: { ...gameSpec, entities: updatedEntities },
      };
    }
    return { message: "I couldn't find a player entity with input controls to modify." };
  }

  // Parse "add platform" pattern
  const platformMatch = lowerPrompt.match(/add\s+(?:a\s+)?platform\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (platformMatch) {
    const x = parseInt(platformMatch[1]);
    const y = parseInt(platformMatch[2]);

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`platform${counter}`)) counter++;

    const newEntity = {
      name: `platform${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 },
        collider: { type: 'box' as const, width: 100, height: 20 },
      },
      tags: ['platform'],
    };

    return {
      message: `I'll add a **platform** at (${x}, ${y}).`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "add enemy" pattern
  const enemyMatch = lowerPrompt.match(/add\s+(?:an?\s+)?enemy\s+(?:at\s+)?(?:\()?(\d+)\s*,?\s*(\d+)(?:\))?/);
  if (enemyMatch) {
    const x = parseInt(enemyMatch[1]);
    const y = parseInt(enemyMatch[2]);

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`enemy${counter}`)) counter++;

    const newEntity = {
      name: `enemy${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'enemy', width: 32, height: 32, tint: 0xff4444 },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box' as const, width: 32, height: 32 },
        aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100 },
        health: { current: 3, max: 3 },
      },
      tags: ['enemy'],
    };

    return {
      message: `I'll add an **enemy** at (${x}, ${y}) with patrol behavior.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "add platforms in staircase pattern" or "add X platforms"
  const staircaseMatch = lowerPrompt.match(/add\s+(\d+)\s+platforms?\s+(?:in\s+)?(?:a\s+)?staircase/i);
  if (staircaseMatch) {
    const count = parseInt(staircaseMatch[1]);
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    const newEntities = [];
    let counter = 1;

    for (let i = 0; i < count; i++) {
      while (existingNames.has(`platform${counter}`)) counter++;
      existingNames.add(`platform${counter}`);

      newEntities.push({
        name: `platform${counter}`,
        components: {
          transform: { x: 150 + i * 120, y: 450 - i * 60, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 },
          collider: { type: 'box' as const, width: 100, height: 20 },
        },
        tags: ['platform'],
      });
      counter++;
    }

    return {
      message: `I'll add **${count} platforms** in a staircase pattern, starting from the bottom-left and going up to the right.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, ...newEntities],
      },
    };
  }

  // Parse "add health pickup" or "create health pickup"
  const healthMatch = lowerPrompt.match(/(?:add|create)\s+(?:a\s+)?health\s+(?:pickup|item|pack)\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (healthMatch || (lowerPrompt.includes('health') && lowerPrompt.includes('pickup'))) {
    const x = healthMatch?.[1] ? parseInt(healthMatch[1]) : 300;
    const y = healthMatch?.[2] ? parseInt(healthMatch[2]) : 400;

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`health${counter}`)) counter++;

    const newEntity = {
      name: `health${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'health', width: 24, height: 24, tint: 0xff4488 },
        collider: { type: 'box' as const, width: 24, height: 24 },
      },
      tags: ['collectible', 'health', 'pickup'],
    };

    return {
      message: `I'll add a **health pickup** at (${x}, ${y}). When collected, it will restore player health.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "change player color" or "make player blue/red/green"
  const colorMatch = lowerPrompt.match(/(?:change|make|set)\s+(?:the\s+)?player(?:'s)?\s+(?:color\s+)?(?:to\s+)?(red|blue|green|yellow|purple|orange|pink|white)/i);
  if (colorMatch) {
    const colorName = colorMatch[1].toLowerCase();
    const colorMap: Record<string, number> = {
      red: 0xff4444,
      blue: 0x4488ff,
      green: 0x44ff44,
      yellow: 0xffff44,
      purple: 0x9944ff,
      orange: 0xff8844,
      pink: 0xff44ff,
      white: 0xffffff,
    };
    const tint = colorMap[colorName] || 0x4488ff;

    const updatedEntities = gameSpec.entities.map(e => {
      if (e.tags?.includes('player') && e.components.sprite) {
        return {
          ...e,
          components: {
            ...e.components,
            sprite: { ...e.components.sprite, tint },
          },
        };
      }
      return e;
    });

    return {
      message: `I'll change the player's color to **${colorName}**.`,
      updatedSpec: { ...gameSpec, entities: updatedEntities },
    };
  }

  // Parse "make player bigger/smaller"
  const sizeMatch = lowerPrompt.match(/make\s+(?:the\s+)?player\s+(bigger|larger|smaller|tiny|huge)/i);
  if (sizeMatch) {
    const sizeWord = sizeMatch[1].toLowerCase();
    const scaleMap: Record<string, number> = {
      bigger: 1.5,
      larger: 1.5,
      smaller: 0.7,
      tiny: 0.5,
      huge: 2.0,
    };
    const scale = scaleMap[sizeWord] || 1;

    const updatedEntities = gameSpec.entities.map(e => {
      if (e.tags?.includes('player') && e.components.transform) {
        return {
          ...e,
          components: {
            ...e.components,
            transform: { ...e.components.transform, scaleX: scale, scaleY: scale },
          },
        };
      }
      return e;
    });

    return {
      message: `I'll make the player **${sizeWord}** (scale: ${scale}x).`,
      updatedSpec: { ...gameSpec, entities: updatedEntities },
    };
  }

  // Parse "delete entity" or "remove entity"
  const deleteMatch = lowerPrompt.match(/(?:delete|remove)\s+(?:the\s+)?(?:entity\s+)?["']?(\w+)["']?/i);
  if (deleteMatch) {
    const entityName = deleteMatch[1].toLowerCase();
    const entityToDelete = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);

    if (entityToDelete) {
      const updatedEntities = gameSpec.entities.filter(e => e.name.toLowerCase() !== entityName);
      return {
        message: `I'll remove the entity **${entityToDelete.name}** from the game.`,
        updatedSpec: { ...gameSpec, entities: updatedEntities },
      };
    }
    return { message: `I couldn't find an entity named "${entityName}" to delete.` };
  }

  // Parse "increase/boost jump" pattern
  if (lowerPrompt.includes('jump') && (lowerPrompt.includes('higher') || lowerPrompt.includes('boost') || lowerPrompt.includes('increase'))) {
    const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));
    if (playerEntity && playerEntity.components.input) {
      const currentJump = Math.abs(playerEntity.components.input.jumpForce || 400);
      const newJump = Math.round(currentJump * 1.3);

      const updatedEntities = gameSpec.entities.map(e => {
        if (e.name === playerEntity.name && e.components.input) {
          return {
            ...e,
            components: {
              ...e.components,
              input: { ...e.components.input, jumpForce: -newJump },
            },
          };
        }
        return e;
      });

      return {
        message: `I'll increase the player's jump force from **${currentJump}** to **${newJump}**.`,
        updatedSpec: { ...gameSpec, entities: updatedEntities },
      };
    }
  }

  // Default response
  return {
    message: `I understand you want to: *"${prompt}"*

I'm running in **demo mode** without an API key. In demo mode, I can handle these requests:

**Add Entities:**
- \`Add a coin at (x, y)\`
- \`Add a platform at (x, y)\`
- \`Add an enemy at (x, y)\`
- \`Add 3 platforms in staircase\`
- \`Create a health pickup\`

**Modify Player:**
- \`Make player faster\`
- \`Boost the jump\`
- \`Make player red/blue/green/yellow\`
- \`Make player bigger/smaller/huge/tiny\`

**Delete Entities:**
- \`Delete coin1\` or \`Remove enemy1\`

To enable full AI capabilities, click ⚙️ and enter your Anthropic API key.`,
  };
}
