import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GameSpec } from '@promptplay/shared-types';
import { AIIcon, SettingsIcon, TrashIcon, ChevronDownIcon, MicrophoneIcon, MicrophoneOffIcon } from './Icons';
import DiffPreview from './DiffPreview';
import { simulateAIResponse } from '../services/aiDemoSimulator';
import { chatHistoryService, ChatSession } from '../services/ChatHistoryService';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { logError } from '../utils/errorUtils';

interface SceneContext {
  selectedEntityId?: string | null;
  cameraPosition?: { x: number; y: number; z?: number };
  isPlaying?: boolean;
  editorMode?: '2d' | '3d';
  activeScene?: string;
}

interface AIPromptPanelProps {
  gameSpec: GameSpec | null;
  onApplyChanges: (updatedSpec: GameSpec) => void;
  isVisible: boolean;
  onClose: () => void;
  projectPath: string | null;
  sceneContext?: SceneContext;
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
  projectPath,
  sceneContext,
}: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<GameSpec | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showEntitySuggestions, setShowEntitySuggestions] = useState(false);
  const [entitySuggestions, setEntitySuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice input hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    interimTranscript,
    toggleListening,
    error: voiceError,
  } = useVoiceInput({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setPrompt(prev => prev + text);
      }
    },
    onError: (error) => {
      logError('Voice input error', error);
    },
  });

  // Check if API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await invoke<boolean>('ai_check_api_key');
        setHasApiKey(hasKey);
      } catch (err) {
        logError('Failed to check API key', err);
      }
    };
    checkApiKey();
  }, []);

  // Load chat history when project changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!projectPath) return;

      const loadedSessions = await chatHistoryService.loadSessionsForProject(projectPath);
      setSessions(loadedSessions);

      // Create new session if none exists
      if (loadedSessions.length === 0) {
        const newSession = chatHistoryService.createSession(projectPath);
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } else {
        // Use most recent session
        const current = chatHistoryService.setCurrentSession(loadedSessions[0].id);
        if (current) {
          setCurrentSessionId(current.id);
          setMessages(current.messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })));
        }
      }
    };

    loadHistory();
  }, [projectPath]);

  // Save history when messages change
  useEffect(() => {
    if (projectPath && messages.length > 0) {
      chatHistoryService.saveSessionsForProject(projectPath);
    }
  }, [messages, projectPath]);

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

  // Get entity names from game spec for autocomplete
  const entityNames = gameSpec?.entities?.map(e => e.name) || [];

  // Generate formatted entity hierarchy for AI context
  const generateEntityHierarchy = useCallback((): string => {
    if (!gameSpec?.entities) return 'No entities in scene.';

    const lines: string[] = ['Entity Hierarchy:'];
    gameSpec.entities.forEach((entity, index) => {
      const isSelected = sceneContext?.selectedEntityId === entity.name;
      const marker = isSelected ? '→ ' : '  ';
      const components = Object.keys(entity.components || {}).join(', ');
      const tags = entity.tags?.join(', ') || 'none';

      lines.push(`${marker}${index + 1}. ${entity.name}`);
      lines.push(`      Components: [${components}]`);
      lines.push(`      Tags: [${tags}]`);

      // Add position info if available
      const transform = entity.components?.transform;
      if (transform) {
        lines.push(`      Position: (${transform.x}, ${transform.y})`);
      }
    });

    return lines.join('\n');
  }, [gameSpec, sceneContext?.selectedEntityId]);

  // Generate enhanced context for AI including scene state
  const generateEnhancedContext = useCallback((): string => {
    const contextParts: string[] = [];

    // Add scene context
    if (sceneContext) {
      contextParts.push('=== Current Scene State ===');
      if (sceneContext.editorMode) {
        contextParts.push(`Editor Mode: ${sceneContext.editorMode.toUpperCase()}`);
      }
      if (sceneContext.isPlaying !== undefined) {
        contextParts.push(`Game State: ${sceneContext.isPlaying ? 'Playing' : 'Paused/Editing'}`);
      }
      if (sceneContext.selectedEntityId) {
        const selected = gameSpec?.entities?.find(e => e.name === sceneContext.selectedEntityId);
        if (selected) {
          contextParts.push(`Selected Entity: "${selected.name}"`);
        }
      }
      if (sceneContext.cameraPosition) {
        const cam = sceneContext.cameraPosition;
        contextParts.push(`Camera Position: (${cam.x.toFixed(0)}, ${cam.y.toFixed(0)}${cam.z !== undefined ? `, ${cam.z.toFixed(0)}` : ''})`);
      }
      if (sceneContext.activeScene) {
        contextParts.push(`Active Scene: ${sceneContext.activeScene}`);
      }
      contextParts.push('');
    }

    // Add entity hierarchy
    contextParts.push(generateEntityHierarchy());
    contextParts.push('');

    // Add game metadata
    if (gameSpec?.metadata) {
      contextParts.push('=== Game Metadata ===');
      contextParts.push(`Name: ${gameSpec.metadata.name}`);
      contextParts.push(`Genre: ${gameSpec.metadata.genre || 'Not specified'}`);
      contextParts.push(`Description: ${gameSpec.metadata.description || 'None'}`);
      contextParts.push('');
    }

    // Add physics settings if available
    if (gameSpec?.settings?.physics) {
      contextParts.push('=== Physics Settings ===');
      const physics = gameSpec.settings.physics;
      contextParts.push(`Gravity: ${physics.gravity ?? 0}`);
      if (physics.friction !== undefined) {
        contextParts.push(`Friction: ${physics.friction}`);
      }
      contextParts.push('');
    }

    // Add full game spec JSON at the end
    contextParts.push('=== Full Game Spec (JSON) ===');
    contextParts.push(JSON.stringify(gameSpec, null, 2));

    return contextParts.join('\n');
  }, [gameSpec, sceneContext, generateEntityHierarchy]);

  // Handle entity reference autocomplete
  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);

    // Check for @ mentions to trigger entity suggestions
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const filtered = entityNames.filter(name =>
        name.toLowerCase().includes(query)
      );
      setEntitySuggestions(filtered);
      setShowEntitySuggestions(filtered.length > 0);
      setSuggestionIndex(0);
    } else {
      setShowEntitySuggestions(false);
    }
  }, [entityNames]);

  // Insert entity reference
  const insertEntityReference = useCallback((entityName: string) => {
    const atMatch = prompt.match(/@\w*$/);
    if (atMatch) {
      const newPrompt = prompt.slice(0, -atMatch[0].length) + `@${entityName} `;
      setPrompt(newPrompt);
    }
    setShowEntitySuggestions(false);
    inputRef.current?.focus();
  }, [prompt]);

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
    chatHistoryService.addMessage('user', prompt);
    setPrompt('');
    setIsLoading(true);

    try {
      // Prepare messages for API
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: prompt });

      // Send to Anthropic API via Rust backend with enhanced context
      const response = await invoke<AIResponse>('ai_send_message', {
        messages: apiMessages,
        gameContext: generateEnhancedContext(),
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
          chatHistoryService.addMessage('assistant', simResponse.message, {
            appliedChanges: !!simResponse.updatedSpec,
          });
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
        chatHistoryService.addMessage('assistant', response.content, {
          appliedChanges: !!parsedSpec,
          codeGenerated: response.content.includes('```'),
        });
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
      chatHistoryService.addMessage('system', errorMessage.content);
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
      logError('Failed to set API key', err);
    }
  }, [apiKey]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle entity suggestion navigation
    if (showEntitySuggestions && entitySuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % entitySuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + entitySuggestions.length) % entitySuggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && entitySuggestions[suggestionIndex])) {
        e.preventDefault();
        insertEntityReference(entitySuggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowEntitySuggestions(false);
        return;
      }
    }

    // Default behavior
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose, showEntitySuggestions, entitySuggestions, suggestionIndex, insertEntityReference]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setPendingChanges(null);
    chatHistoryService.clearCurrentSession();
  }, []);

  const handleNewSession = useCallback(() => {
    if (!projectPath) return;

    const newSession = chatHistoryService.createSession(projectPath);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setPendingChanges(null);
    setShowHistory(false);
  }, [projectPath]);

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = chatHistoryService.setCurrentSession(sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      })));
      setPendingChanges(null);
      setShowHistory(false);
    }
  }, []);

  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chatHistoryService.deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    if (currentSessionId === sessionId && projectPath) {
      const newSession = chatHistoryService.createSession(projectPath);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    }
  }, [currentSessionId, projectPath]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[450px] bg-[#1a1a2e] rounded-xl shadow-2xl border border-white/10 flex flex-col z-50 max-h-[700px] animate-scale-in overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <AIIcon size={18} />
          <span className="font-semibold text-sm">AI Assistant</span>
          {!hasApiKey && (
            <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold uppercase">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* History dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
              title="Chat History"
            >
              <ChevronDownIcon size={12} />
              <span className="hidden sm:inline">History</span>
            </button>
            {showHistory && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1e1e3a] rounded-lg shadow-xl border border-white/10 z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">Chat Sessions</span>
                  <button
                    onClick={handleNewSession}
                    className="text-[10px] px-2 py-0.5 bg-violet-600 text-white rounded hover:bg-violet-500 transition-colors"
                  >
                    + New
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-gray-500 p-3 text-center">No sessions yet</p>
                  ) : (
                    sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`px-3 py-2 cursor-pointer hover:bg-white/5 flex items-center justify-between group ${
                          currentSessionId === session.id ? 'bg-violet-500/10 border-l-2 border-violet-500' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-200 truncate">{session.title}</p>
                          <p className="text-[10px] text-gray-500">
                            {session.messages.length} messages · {new Date(session.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete session"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <SettingsIcon size={14} />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-[#252542] border-b border-white/10">
          <h4 className="text-sm font-medium text-white mb-2">API Settings</h4>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Anthropic API key"
              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="px-3 py-1.5 bg-violet-600 text-white rounded text-sm hover:bg-violet-500 disabled:opacity-50 transition-colors"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[400px] bg-gradient-to-b from-[#1a1a2e] to-[#16162a]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/30">
              <AIIcon size={28} className="text-violet-400" />
            </div>
            <p className="text-base font-semibold text-white">Ask me to modify your game!</p>
            <p className="text-sm mt-2 text-gray-400">I can add entities, change properties, and more.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-3 py-2 rounded-lg text-sm shadow-sm ${msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                  : msg.role === 'system'
                    ? 'bg-white/5 text-gray-400 italic border border-white/10'
                    : 'bg-[#252542] border border-white/10 text-gray-200'
                }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-invert prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-code:text-violet-400 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
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
            <div className="bg-[#252542] px-3 py-2 rounded-lg border border-white/10">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Changes with Diff Preview */}
      {pendingChanges && gameSpec && (
        <div className="px-4 py-3 bg-violet-500/10 border-t border-violet-500/20">
          <p className="text-sm text-violet-300 mb-2 font-medium">Review Changes</p>
          <div className="bg-black/30 rounded border border-white/10 overflow-hidden">
            <DiffPreview currentSpec={gameSpec} pendingSpec={pendingChanges} />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyChanges}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-500 shadow-lg shadow-green-900/20 transition-colors"
            >
              Apply Changes
            </button>
            <button
              onClick={handleRejectChanges}
              className="flex-1 px-3 py-1.5 bg-white/10 text-gray-300 rounded text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Example prompts */}
      {messages.length === 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-[#1e1e3a]">
          <p className="text-xs font-medium text-gray-300 mb-2">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.slice(0, 4).map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1.5 bg-white/10 text-gray-200 rounded-full border border-white/20 hover:bg-violet-500/30 hover:border-violet-400/50 hover:text-white transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-[#1a1a2e]">
        {/* Voice error message */}
        {voiceError && (
          <div className="mb-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            {voiceError}
          </div>
        )}
        {/* Interim transcript preview */}
        {isListening && interimTranscript && (
          <div className="mb-2 px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded text-xs text-violet-300 italic">
            {interimTranscript}...
          </div>
        )}
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Describe what you want to change... (use @ to reference entities)"}
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder-gray-500 ${
                isListening ? 'border-violet-500 bg-violet-500/10' : 'border-white/20'
              }`}
              rows={2}
              disabled={isLoading}
            />
            {/* Entity suggestions dropdown */}
            {showEntitySuggestions && entitySuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#252542] border border-white/20 rounded-lg shadow-xl overflow-hidden z-50 max-h-32 overflow-y-auto">
                {entitySuggestions.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => insertEntityReference(name)}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-violet-500/30 flex items-center gap-2 ${
                      idx === suggestionIndex ? 'bg-violet-500/20 text-white' : 'text-gray-300'
                    }`}
                  >
                    <span className="text-violet-400">@</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {/* Voice input button */}
              {isVoiceSupported && (
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-400 animate-pulse'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <MicrophoneOffIcon size={16} /> : <MicrophoneIcon size={16} />}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 transition-all"
              >
                Send
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
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
