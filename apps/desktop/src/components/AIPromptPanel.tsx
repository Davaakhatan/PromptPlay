import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GameSpec } from '@promptplay/shared-types';
import { AIIcon, SettingsIcon, TrashIcon, ChevronDownIcon } from './Icons';
import DiffPreview from './DiffPreview';
import { simulateAIResponse } from '../services/aiDemoSimulator';
import { chatHistoryService, ChatSession } from '../services/ChatHistoryService';

interface AIPromptPanelProps {
  gameSpec: GameSpec | null;
  onApplyChanges: (updatedSpec: GameSpec) => void;
  isVisible: boolean;
  onClose: () => void;
  projectPath: string | null;
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
    <div className="fixed bottom-4 right-4 w-[450px] bg-panel-solid rounded-xl shadow-2xl border border-subtle flex flex-col z-50 max-h-[700px] animate-scale-in overflow-hidden backdrop-blur-xl">
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
              <div className="absolute right-0 top-full mt-1 w-64 bg-panel-solid rounded-lg shadow-xl border border-subtle z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">Chat Sessions</span>
                  <button
                    onClick={handleNewSession}
                    className="text-[10px] px-2 py-0.5 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                  >
                    + New
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-text-tertiary p-3 text-center">No sessions yet</p>
                  ) : (
                    sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`px-3 py-2 cursor-pointer hover:bg-white/5 flex items-center justify-between group ${
                          currentSessionId === session.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-text-primary truncate">{session.title}</p>
                          <p className="text-[10px] text-text-tertiary">
                            {session.messages.length} messages · {new Date(session.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
