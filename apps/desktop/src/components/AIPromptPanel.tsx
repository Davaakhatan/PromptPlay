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
    'Add 5 coins',
    'Create physics system',
    'Analyze game',
    'Add health to enemy1',
    'Moon gravity',
    'Fix player',
    'help',
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

  // Parse "change gravity" or "set gravity" pattern
  const gravityMatch = lowerPrompt.match(/(?:change|set|make)\s+(?:the\s+)?gravity\s+(?:to\s+)?(\d+(?:\.\d+)?)|(?:gravity)\s+(\d+(?:\.\d+)?)|(?:lower|less|reduce)\s+gravity|(?:higher|more|increase)\s+gravity|(?:zero|no|disable)\s+gravity|(?:moon|low)\s+gravity/i);
  if (gravityMatch || lowerPrompt.includes('gravity')) {
    let newGravity = 800; // default

    if (gravityMatch?.[1]) {
      newGravity = parseFloat(gravityMatch[1]);
    } else if (gravityMatch?.[2]) {
      newGravity = parseFloat(gravityMatch[2]);
    } else if (lowerPrompt.includes('zero') || lowerPrompt.includes('no ') || lowerPrompt.includes('disable')) {
      newGravity = 0;
    } else if (lowerPrompt.includes('moon') || lowerPrompt.includes('low')) {
      newGravity = 200;
    } else if (lowerPrompt.includes('lower') || lowerPrompt.includes('less') || lowerPrompt.includes('reduce')) {
      newGravity = (gameSpec.settings?.physics?.gravity || 800) * 0.5;
    } else if (lowerPrompt.includes('higher') || lowerPrompt.includes('more') || lowerPrompt.includes('increase')) {
      newGravity = (gameSpec.settings?.physics?.gravity || 800) * 1.5;
    }

    const gravityLabel = newGravity === 0 ? 'zero (space mode!)' : newGravity < 300 ? `${newGravity} (moon-like)` : `${newGravity}`;

    return {
      message: `I'll set gravity to **${gravityLabel}**.`,
      updatedSpec: {
        ...gameSpec,
        settings: {
          ...gameSpec.settings,
          physics: {
            ...gameSpec.settings?.physics,
            gravity: newGravity,
          },
        },
      },
    };
  }

  // Parse "add moving platform" pattern
  const movingPlatformMatch = lowerPrompt.match(/add\s+(?:a\s+)?moving\s+platform\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (movingPlatformMatch || (lowerPrompt.includes('moving') && lowerPrompt.includes('platform'))) {
    const x = movingPlatformMatch?.[1] ? parseInt(movingPlatformMatch[1]) : 300;
    const y = movingPlatformMatch?.[2] ? parseInt(movingPlatformMatch[2]) : 350;

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`movingPlatform${counter}`)) counter++;

    const newEntity = {
      name: `movingPlatform${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'platform', width: 120, height: 20, tint: 0x44aaff },
        collider: { type: 'box' as const, width: 120, height: 20 },
        velocity: { vx: 50, vy: 0 },
        aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100, patrolRange: 150 },
      },
      tags: ['platform', 'moving'],
    };

    return {
      message: `I'll add a **moving platform** at (${x}, ${y}). It will patrol horizontally.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "duplicate/clone entity" pattern
  const duplicateMatch = lowerPrompt.match(/(?:duplicate|clone|copy)\s+(?:the\s+)?(?:entity\s+)?["']?(\w+)["']?\s*(?:(?:at|to)\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (duplicateMatch) {
    const entityName = duplicateMatch[1].toLowerCase();
    const entityToCopy = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);

    if (entityToCopy) {
      let counter = 1;
      const baseName = entityToCopy.name.replace(/\d+$/, '');
      const existingNames = new Set(gameSpec.entities.map(e => e.name));
      while (existingNames.has(`${baseName}${counter}`)) counter++;

      const offsetX = duplicateMatch[2] ? parseInt(duplicateMatch[2]) : (entityToCopy.components.transform?.x || 0) + 50;
      const offsetY = duplicateMatch[3] ? parseInt(duplicateMatch[3]) : entityToCopy.components.transform?.y || 0;

      const newEntity = {
        ...JSON.parse(JSON.stringify(entityToCopy)),
        name: `${baseName}${counter}`,
        components: {
          ...JSON.parse(JSON.stringify(entityToCopy.components)),
          transform: {
            ...entityToCopy.components.transform,
            x: offsetX,
            y: offsetY,
          },
        },
      };

      return {
        message: `I'll duplicate **${entityToCopy.name}** as **${newEntity.name}** at (${offsetX}, ${offsetY}).`,
        updatedSpec: {
          ...gameSpec,
          entities: [...gameSpec.entities, newEntity],
        },
      };
    }
    return { message: `I couldn't find an entity named "${entityName}" to duplicate.` };
  }

  // Parse "add X coins/enemies" pattern (multiple entities)
  const multipleMatch = lowerPrompt.match(/add\s+(\d+)\s+(coins?|enemies|platforms?|health\s*pickups?)/i);
  if (multipleMatch && !lowerPrompt.includes('staircase')) {
    const count = Math.min(parseInt(multipleMatch[1]), 10); // limit to 10
    const entityType = multipleMatch[2].toLowerCase().replace(/s$/, '');
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    const newEntities = [];

    for (let i = 0; i < count; i++) {
      let counter = 1;
      const baseName = entityType.replace(/\s+/g, '');
      while (existingNames.has(`${baseName}${counter}`)) counter++;
      existingNames.add(`${baseName}${counter}`);

      const x = 100 + Math.random() * 600;
      const y = 100 + Math.random() * 400;

      let entity;
      if (entityType === 'coin') {
        entity = {
          name: `coin${counter}`,
          components: {
            transform: { x: Math.round(x), y: Math.round(y), rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'coin', width: 24, height: 24, tint: 0xffd700 },
            collider: { type: 'circle' as const, radius: 12 },
          },
          tags: ['collectible', 'coin'],
        };
      } else if (entityType === 'enem' || entityType === 'enemy') {
        entity = {
          name: `enemy${counter}`,
          components: {
            transform: { x: Math.round(x), y: Math.round(y), rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'enemy', width: 32, height: 32, tint: 0xff4444 },
            velocity: { vx: 0, vy: 0 },
            collider: { type: 'box' as const, width: 32, height: 32 },
            aiBehavior: { type: 'patrol' as const, speed: 50, detectionRadius: 100 },
            health: { current: 3, max: 3 },
          },
          tags: ['enemy'],
        };
      } else if (entityType === 'platform') {
        entity = {
          name: `platform${counter}`,
          components: {
            transform: { x: Math.round(x), y: Math.round(y), rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'platform', width: 100, height: 20, tint: 0x8b4513 },
            collider: { type: 'box' as const, width: 100, height: 20 },
          },
          tags: ['platform'],
        };
      } else {
        entity = {
          name: `health${counter}`,
          components: {
            transform: { x: Math.round(x), y: Math.round(y), rotation: 0, scaleX: 1, scaleY: 1 },
            sprite: { texture: 'health', width: 24, height: 24, tint: 0xff4488 },
            collider: { type: 'box' as const, width: 24, height: 24 },
          },
          tags: ['collectible', 'health', 'pickup'],
        };
      }
      if (entity) newEntities.push(entity);
    }

    return {
      message: `I'll add **${count} ${entityType}${count > 1 ? 's' : ''}** at random positions.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, ...newEntities],
      },
    };
  }

  // Parse "list entities" or "show entities" pattern
  if (lowerPrompt.includes('list') && lowerPrompt.includes('entities') || lowerPrompt.includes('show') && lowerPrompt.includes('entities') || lowerPrompt === 'entities') {
    const entityList = gameSpec.entities.map(e => {
      const pos = e.components.transform ? `(${e.components.transform.x}, ${e.components.transform.y})` : '(no position)';
      const tags = e.tags?.join(', ') || 'no tags';
      return `- **${e.name}** at ${pos} [${tags}]`;
    }).join('\n');

    return {
      message: `**Current Entities (${gameSpec.entities.length}):**\n\n${entityList || 'No entities in the game.'}`,
    };
  }

  // Parse "add spawn point" pattern
  const spawnMatch = lowerPrompt.match(/add\s+(?:a\s+)?spawn\s*(?:point)?\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (spawnMatch || lowerPrompt.includes('spawn')) {
    const x = spawnMatch?.[1] ? parseInt(spawnMatch[1]) : 100;
    const y = spawnMatch?.[2] ? parseInt(spawnMatch[2]) : 400;

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`spawn${counter}`)) counter++;

    const newEntity = {
      name: `spawn${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'spawn', width: 32, height: 32, tint: 0x44ff44 },
      },
      tags: ['spawn', 'checkpoint'],
    };

    return {
      message: `I'll add a **spawn point** at (${x}, ${y}). Players will respawn here.`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "add checkpoint" pattern
  const checkpointMatch = lowerPrompt.match(/add\s+(?:a\s+)?checkpoint\s*(?:at\s+)?(?:\()?(\d+)?\s*,?\s*(\d+)?(?:\))?/i);
  if (checkpointMatch || lowerPrompt.includes('checkpoint')) {
    const x = checkpointMatch?.[1] ? parseInt(checkpointMatch[1]) : 400;
    const y = checkpointMatch?.[2] ? parseInt(checkpointMatch[2]) : 350;

    let counter = 1;
    const existingNames = new Set(gameSpec.entities.map(e => e.name));
    while (existingNames.has(`checkpoint${counter}`)) counter++;

    const newEntity = {
      name: `checkpoint${counter}`,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { texture: 'checkpoint', width: 20, height: 48, tint: 0xffff00 },
        collider: { type: 'box' as const, width: 20, height: 48 },
      },
      tags: ['checkpoint', 'flag'],
    };

    return {
      message: `I'll add a **checkpoint flag** at (${x}, ${y}).`,
      updatedSpec: {
        ...gameSpec,
        entities: [...gameSpec.entities, newEntity],
      },
    };
  }

  // Parse "add component to entity" pattern
  const addComponentMatch = lowerPrompt.match(/add\s+(?:a\s+)?(health|velocity|collider|input|aiBehavior|physics)\s+(?:component\s+)?(?:to\s+)?["']?(\w+)["']?/i);
  if (addComponentMatch) {
    const componentType = addComponentMatch[1].toLowerCase();
    const entityName = addComponentMatch[2].toLowerCase();
    const entity = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);

    if (entity) {
      const componentDefaults: Record<string, object> = {
        health: { current: 100, max: 100 },
        velocity: { vx: 0, vy: 0 },
        collider: { type: 'box', width: 32, height: 32 },
        input: { moveSpeed: 200, jumpForce: -400, keys: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' } },
        aibehavior: { type: 'patrol', speed: 50, detectionRadius: 100 },
        physics: { mass: 1, friction: 0.1, restitution: 0.2 },
      };

      const newComponent = componentDefaults[componentType] || {};
      const updatedEntities = gameSpec.entities.map(e => {
        if (e.name.toLowerCase() === entityName) {
          return {
            ...e,
            components: {
              ...e.components,
              [componentType]: newComponent,
            },
          };
        }
        return e;
      });

      return {
        message: `I'll add a **${componentType}** component to **${entity.name}**.`,
        updatedSpec: { ...gameSpec, entities: updatedEntities },
      };
    }
    return { message: `I couldn't find an entity named "${entityName}".` };
  }

  // Parse "add tag to entity" pattern
  const addTagMatch = lowerPrompt.match(/add\s+(?:the\s+)?(?:tag\s+)?["']?(\w+)["']?\s+(?:tag\s+)?(?:to\s+)?["']?(\w+)["']?/i);
  if (addTagMatch && !lowerPrompt.includes('platform') && !lowerPrompt.includes('coin') && !lowerPrompt.includes('enemy')) {
    const tagName = addTagMatch[1].toLowerCase();
    const entityName = addTagMatch[2].toLowerCase();
    const entity = gameSpec.entities.find(e => e.name.toLowerCase() === entityName);

    if (entity) {
      const currentTags = entity.tags || [];
      if (currentTags.includes(tagName)) {
        return { message: `Entity **${entity.name}** already has the tag "${tagName}".` };
      }

      const updatedEntities = gameSpec.entities.map(e => {
        if (e.name.toLowerCase() === entityName) {
          return {
            ...e,
            tags: [...(e.tags || []), tagName],
          };
        }
        return e;
      });

      return {
        message: `I'll add the tag **"${tagName}"** to **${entity.name}**.`,
        updatedSpec: { ...gameSpec, entities: updatedEntities },
      };
    }
  }

  // Parse "create system" pattern
  const createSystemMatch = lowerPrompt.match(/(?:create|add)\s+(?:a\s+)?(?:new\s+)?(\w+)\s+system/i);
  if (createSystemMatch) {
    const systemName = createSystemMatch[1].toLowerCase();
    const existingSystems = gameSpec.systems || [];

    // Check if system already exists
    if (existingSystems.some(s => s.toLowerCase() === systemName.toLowerCase())) {
      return { message: `A system named "${systemName}" already exists.` };
    }

    const systemTemplates: Record<string, { name: string; description: string }> = {
      movement: { name: 'MovementSystem', description: 'Handles entity movement based on velocity' },
      collision: { name: 'CollisionSystem', description: 'Detects and resolves collisions' },
      render: { name: 'RenderSystem', description: 'Renders sprites to canvas' },
      input: { name: 'InputSystem', description: 'Handles player input' },
      physics: { name: 'PhysicsSystem', description: 'Applies physics simulation' },
      ai: { name: 'AISystem', description: 'Runs AI behaviors for entities' },
      animation: { name: 'AnimationSystem', description: 'Updates sprite animations' },
      score: { name: 'ScoreSystem', description: 'Tracks and updates score' },
      health: { name: 'HealthSystem', description: 'Manages entity health' },
    };

    const template = systemTemplates[systemName] || {
      name: `${systemName.charAt(0).toUpperCase() + systemName.slice(1)}System`,
      description: `Custom ${systemName} system`,
    };

    return {
      message: `I'll create a new **${template.name}** system.\n\n*${template.description}*`,
      updatedSpec: {
        ...gameSpec,
        systems: [...existingSystems, template.name],
      },
    };
  }

  // Parse "debug" or "analyze" or "what's wrong" pattern
  if (lowerPrompt.includes('debug') || lowerPrompt.includes('analyze') || lowerPrompt.includes("what's wrong") || lowerPrompt.includes('problem') || lowerPrompt.includes('issue')) {
    const issues: string[] = [];

    // Check for common issues
    const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));
    if (!playerEntity) {
      issues.push('⚠️ No entity tagged as "player" found');
    } else {
      if (!playerEntity.components.input) {
        issues.push('⚠️ Player has no input component (cannot control)');
      }
      if (!playerEntity.components.transform) {
        issues.push('⚠️ Player has no transform component (no position)');
      }
      if (!playerEntity.components.collider) {
        issues.push('⚠️ Player has no collider (cannot interact with world)');
      }
    }

    // Check for ground/platforms
    const platforms = gameSpec.entities.filter(e => e.tags?.includes('platform'));
    if (platforms.length === 0) {
      issues.push('⚠️ No platforms found - player may fall forever');
    }

    // Check for gravity setting
    if (!gameSpec.settings?.physics?.gravity) {
      issues.push('ℹ️ No gravity setting defined (using default)');
    }

    // Check for entities without transforms
    const noTransform = gameSpec.entities.filter(e => !e.components.transform);
    if (noTransform.length > 0) {
      issues.push(`⚠️ ${noTransform.length} entities have no transform: ${noTransform.map(e => e.name).join(', ')}`);
    }

    // Check for overlapping entities
    const positions = gameSpec.entities
      .filter(e => e.components.transform)
      .map(e => ({ name: e.name, x: e.components.transform!.x, y: e.components.transform!.y }));

    const overlapping: string[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) +
          Math.pow(positions[i].y - positions[j].y, 2)
        );
        if (dist < 5) {
          overlapping.push(`${positions[i].name} & ${positions[j].name}`);
        }
      }
    }
    if (overlapping.length > 0) {
      issues.push(`⚠️ Overlapping entities: ${overlapping.join(', ')}`);
    }

    if (issues.length === 0) {
      return {
        message: `✅ **Game Analysis Complete**\n\nNo obvious issues found! Your game has:\n- ${gameSpec.entities.length} entities\n- Player with controls: ${playerEntity ? 'Yes' : 'No'}\n- Platforms: ${platforms.length}\n- Systems: ${gameSpec.systems?.length || 0}`,
      };
    }

    return {
      message: `🔍 **Game Analysis**\n\nFound ${issues.length} potential issue${issues.length > 1 ? 's' : ''}:\n\n${issues.join('\n')}\n\n*Ask me to fix any of these issues!*`,
    };
  }

  // Parse "fix" pattern - common fixes
  if (lowerPrompt.includes('fix') && lowerPrompt.includes('player')) {
    const playerEntity = gameSpec.entities.find(e => e.tags?.includes('player'));

    if (!playerEntity) {
      // Create a player entity
      let counter = 1;
      const existingNames = new Set(gameSpec.entities.map(e => e.name));
      while (existingNames.has(`player${counter}`)) counter++;

      const newPlayer = {
        name: counter === 1 ? 'player' : `player${counter}`,
        components: {
          transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'player', width: 32, height: 48, tint: 0x4488ff },
          velocity: { vx: 0, vy: 0 },
          collider: { type: 'box' as const, width: 32, height: 48 },
          input: { moveSpeed: 200, jumpForce: -400, keys: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' } },
        },
        tags: ['player'],
      };

      return {
        message: `I'll create a new **player** entity with all required components (transform, sprite, velocity, collider, input).`,
        updatedSpec: {
          ...gameSpec,
          entities: [...gameSpec.entities, newPlayer],
        },
      };
    }

    // Fix missing components on existing player
    const fixes: string[] = [];
    let updatedPlayer = { ...playerEntity, components: { ...playerEntity.components } };

    if (!updatedPlayer.components.transform) {
      updatedPlayer.components.transform = { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 };
      fixes.push('transform');
    }
    if (!updatedPlayer.components.input) {
      updatedPlayer.components.input = { moveSpeed: 200, jumpForce: -400, keys: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' } };
      fixes.push('input');
    }
    if (!updatedPlayer.components.velocity) {
      updatedPlayer.components.velocity = { vx: 0, vy: 0 };
      fixes.push('velocity');
    }
    if (!updatedPlayer.components.collider) {
      updatedPlayer.components.collider = { type: 'box' as const, width: 32, height: 48 };
      fixes.push('collider');
    }

    if (fixes.length === 0) {
      return { message: `Player entity looks complete! No fixes needed.` };
    }

    const updatedEntities = gameSpec.entities.map(e =>
      e.name === playerEntity.name ? updatedPlayer : e
    );

    return {
      message: `I'll add missing components to **${playerEntity.name}**: ${fixes.join(', ')}.`,
      updatedSpec: { ...gameSpec, entities: updatedEntities },
    };
  }

  // Parse "rename game" pattern
  const renameMatch = lowerPrompt.match(/(?:rename|change|set)\s+(?:the\s+)?(?:game\s+)?(?:name|title)\s+(?:to\s+)?["']?(.+?)["']?$/i);
  if (renameMatch) {
    const newName = renameMatch[1].trim();
    return {
      message: `I'll rename the game to **"${newName}"**.`,
      updatedSpec: {
        ...gameSpec,
        metadata: {
          ...gameSpec.metadata,
          name: newName,
        },
      },
    };
  }

  // Parse "help" command
  if (lowerPrompt === 'help' || lowerPrompt === '?' || lowerPrompt.includes('what can you do')) {
    return {
      message: `# AI Assistant Commands

## 🎮 Add Entities
- \`Add a coin at (200, 400)\`
- \`Add a platform at (300, 500)\`
- \`Add an enemy at (400, 300)\`
- \`Add moving platform\`
- \`Add 5 coins\` / \`Add 3 enemies\`
- \`Add 3 platforms in staircase\`
- \`Add spawn point\` / \`Add checkpoint\`
- \`Create health pickup\`

## 🎨 Modify Player
- \`Make player faster\` / \`Make player slower\`
- \`Boost the jump\` / \`Jump higher\`
- \`Make player red/blue/green/yellow/purple\`
- \`Make player bigger/smaller/huge/tiny\`

## 🔧 Components & Systems
- \`Add health to enemy1\`
- \`Add velocity to coin1\`
- \`Add input to player\`
- \`Add collider to platform1\`
- \`Create physics system\`
- \`Create score system\`

## ⚙️ Physics & Settings
- \`Moon gravity\` / \`Zero gravity\`
- \`Set gravity to 500\`
- \`Rename game to My Adventure\`

## 🔍 Debug & Utilities
- \`List entities\` - Show all game objects
- \`Analyze game\` - Find potential issues
- \`Fix player\` - Add missing components
- \`Clone player\` / \`Duplicate coin1\`
- \`Delete enemy1\` / \`Remove coin1\`

*Click ⚙️ to add API key for full AI capabilities.*`,
    };
  }

  // Default response
  return {
    message: `I understand you want to: *"${prompt}"*

I'm running in **demo mode**. Here's what I can do:

**Entities:**
- \`Add a coin/platform/enemy at (x, y)\`
- \`Add 5 coins\` / \`Add moving platform\`
- \`Clone player\` / \`Delete coin1\`

**Components & Systems:**
- \`Add health to enemy1\`
- \`Add input to player\`
- \`Create physics system\`

**Player:**
- \`Make player faster/bigger/red\`
- \`Boost the jump\`

**Physics:**
- \`Moon gravity\` / \`Zero gravity\`

**Debug:**
- \`Analyze game\` - Find issues
- \`Fix player\` - Add missing components

Type \`help\` for full command list.`,
  };
}
