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
    'Add a coin at position (200, 400)',
    'Make the player move faster',
    'Add 3 platforms in a staircase pattern',
    'Add an enemy that patrols left and right',
    'Create a health pickup item',
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
    <div className="fixed bottom-4 right-4 w-[450px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 max-h-[700px]">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AIIcon size={20} />
          <span className="font-semibold">AI Assistant</span>
          {!hasApiKey && (
            <span className="text-xs bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded">
              Demo Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/80 hover:text-white p-1"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">API Settings</h4>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Anthropic API key"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Or set ANTHROPIC_API_KEY environment variable
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <AIIcon size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Ask me to modify your game!</p>
            <p className="text-xs mt-1">I can add entities, change properties, and more.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-gray-100 text-gray-600 italic'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-600 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
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
            <div className="bg-gray-100 px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Changes with Diff Preview */}
      {pendingChanges && gameSpec && (
        <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm text-yellow-800 mb-2 font-medium">Review Changes</p>
          <DiffPreview currentSpec={gameSpec} pendingSpec={pendingChanges} />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyChanges}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
            >
              Apply Changes
            </button>
            <button
              onClick={handleRejectChanges}
              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Example prompts */}
      {messages.length === 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Try these:</p>
          <div className="flex flex-wrap gap-1">
            {examplePrompts.slice(0, 3).map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {example.length > 30 ? example.slice(0, 30) + '...' : example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to change..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
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

  // Default response
  return {
    message: `I understand you want to: *"${prompt}"*

However, I'm running in **demo mode** without an API key. In demo mode, I can handle these requests:

- \`Add a coin at (x, y)\`
- \`Add a platform at (x, y)\`
- \`Add an enemy at (x, y)\`
- \`Make the player faster\`

To enable full AI capabilities, click the settings icon and enter your Anthropic API key.`,
  };
}
