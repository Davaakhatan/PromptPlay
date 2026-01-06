import { useState, useCallback, useEffect, useRef } from 'react';
import type { NodeGraph, NodeInstance, Connection, NodeContext } from '../../types/NodeEditor';
import { NODE_LIBRARY } from '../../services/NodeLibrary';
import { useNodeGraphHistory } from '../../hooks/useNodeGraphHistory';
import { NodePresetService, BUILT_IN_PRESETS, type NodePreset } from '../../services/NodePresetService';
import { NodeExecutor } from '../../services/NodeExecutor';
import NodeCanvas from './NodeCanvas';

// Helper function to render preset icon as SVG
function PresetIcon({ icon, className = "w-5 h-5" }: { icon?: string; className?: string }) {
  const iconMap: Record<string, JSX.Element> = {
    gamepad: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.659-.663 47.703 47.703 0 00-.31-4.82 47.677 47.677 0 00-4.095.302.64.64 0 01-.657-.643v0z" />
      </svg>
    ),
    heart: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    bounce: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
        <circle cx="12" cy="19.5" r="2" strokeWidth={1.5} />
      </svg>
    ),
    target: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    spring: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    package: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  };

  return iconMap[icon || 'package'] || iconMap['package'];
}

// Execution log entry
interface ExecutionLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'event';
  message: string;
  nodeId?: string;
  nodeType?: string;
}

interface NodeEditorProps {
  graph?: NodeGraph | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameSpec?: any;
  onGraphChange?: (graph: NodeGraph) => void;
  onClose?: () => void;
  onSave?: () => void;
}

// Create a default empty graph
function createDefaultGraph(): NodeGraph {
  return {
    id: `graph_${Date.now()}`,
    name: 'New Script',
    nodes: [],
    connections: [],
    viewport: { x: 100, y: 100, zoom: 1 },
  };
}

export default function NodeEditor({ graph: initialGraph, gameSpec, onGraphChange, onClose, onSave }: NodeEditorProps) {
  const [graph, setGraph] = useState<NodeGraph>(initialGraph || createDefaultGraph());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [userPresets, setUserPresets] = useState<NodePreset[]>([]);
  const [showExecutionConsole, setShowExecutionConsole] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const isInitialized = useRef(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load user presets
  useEffect(() => {
    setUserPresets(NodePresetService.getAllPresets());
    const unsubscribe = NodePresetService.subscribe(() => {
      setUserPresets(NodePresetService.getAllPresets());
    });
    return unsubscribe;
  }, []);

  // Close preset menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    pushHistory,
    undo,
    redo,
    initializeHistory,
    getActionDescription,
  } = useNodeGraphHistory();

  // Initialize history when graph is first loaded
  useEffect(() => {
    if (!isInitialized.current) {
      initializeHistory(graph);
      isInitialized.current = true;
    }
  }, [graph, initializeHistory]);

  // Update graph when initialGraph changes
  useEffect(() => {
    if (initialGraph && initialGraph !== graph) {
      setGraph(initialGraph);
      initializeHistory(initialGraph);
    }
  }, [initialGraph]);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  // Auto-scroll execution console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  // Add log entry
  const addLog = useCallback((type: ExecutionLog['type'], message: string, nodeId?: string, nodeType?: string) => {
    setExecutionLogs(prev => [...prev, {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      nodeId,
      nodeType,
    }]);
  }, []);

  // Test execution handler
  const handleTestExecution = useCallback((simulateKey?: string) => {
    if (graph.nodes.length === 0) {
      showNotification('Add some nodes first');
      return;
    }

    // Check for event nodes
    const eventNodes = graph.nodes.filter(n => {
      const def = NODE_LIBRARY[n.type];
      return def?.category === 'events';
    });

    if (eventNodes.length === 0) {
      showNotification('Add an event node (On Start, On Update, etc.) to begin execution');
      return;
    }

    setShowExecutionConsole(true);
    if (!simulateKey) {
      setExecutionLogs([]);
    }
    setIsExecuting(true);

    if (!simulateKey) {
      addLog('info', 'Starting test execution...');
      addLog('info', `Graph: "${graph.name}" with ${graph.nodes.length} nodes`);
    }

    // Create entities from gameSpec or use defaults
    const mockEntities = new Map<string, Record<string, unknown>>();

    if (gameSpec?.entities && gameSpec.entities.length > 0) {
      // Use actual entities from game spec
      gameSpec.entities.forEach((entity: { name: string; x?: number; y?: number }) => {
        mockEntities.set(entity.name, {
          ...entity,
          x: entity.x ?? 0,
          y: entity.y ?? 0,
          velocityX: 0,
          velocityY: 0,
        });
      });
      if (!simulateKey) {
        addLog('info', `Loaded ${gameSpec.entities.length} entities from game spec`);
      }
    } else {
      // Use default mock entities
      mockEntities.set('Player', { name: 'Player', x: 100, y: 100, velocityX: 0, velocityY: 0 });
      mockEntities.set('Enemy', { name: 'Enemy', x: 300, y: 200, velocityX: 0, velocityY: 0 });
      if (!simulateKey) {
        addLog('warning', 'No game spec - using default Player/Enemy entities');
      }
    }

    // Create pressed keys set for input simulation
    const pressedKeys = new Set<string>();
    if (simulateKey) {
      pressedKeys.add(simulateKey);
    }

    const context: NodeContext = {
      deltaTime: 0.016,
      gameSpec: gameSpec || { entities: Array.from(mockEntities.values()) },
      entities: mockEntities,
      pressedKeys,
      getEntity: (name: string) => {
        const entity = mockEntities.get(name);
        if (entity) {
          addLog('info', `[GET] Entity "${name}"`, undefined, 'get_entity');
        } else {
          addLog('warning', `[GET] Entity not found: "${name}"`, undefined, 'get_entity');
        }
        return entity || null;
      },
      updateEntity: (name: string, data: unknown) => {
        mockEntities.set(name, data as Record<string, unknown>);
        addLog('success', `[SET] Entity "${name}" updated`, undefined, 'update_entity');
      },
      emit: (event: string, data?: unknown) => {
        addLog('event', `[EMIT] "${event}"${data ? `: ${JSON.stringify(data)}` : ''}`, undefined, 'emit');
      },
    };

    try {
      // Create executor with logging callback
      const executor = new NodeExecutor(graph, context, (type, message, nodeId, nodeType) => {
        const logType = type === 'node' ? 'info' : type === 'flow' ? 'event' : 'success';
        addLog(logType, message, nodeId, nodeType);
      });

      if (simulateKey) {
        // Simulate key press by running update with key in pressedKeys
        addLog('event', `[KEY] Simulating key press: ${simulateKey}`);
        addLog('info', '[UPDATE] Running 1 update frame with key pressed...');
        executor.triggerEvent('update', { deltaTime: 0.016 });
      } else {
        // Normal execution
        addLog('event', '[EVENT] Triggering "start"...');
        executor.triggerEvent('start');

        // Simulate a few update frames
        addLog('info', '[UPDATE] Running 3 update frames...');
        for (let i = 0; i < 3; i++) {
          executor.triggerEvent('update', { deltaTime: 0.016 });
        }

        addLog('success', 'Execution completed!');

        // Show final entity states
        addLog('info', 'Final states:');
        mockEntities.forEach((entity, name) => {
          const { x, y, velocityX, velocityY } = entity as { x: number; y: number; velocityX: number; velocityY: number };
          addLog('info', `  ${name}: pos(${x?.toFixed?.(1) ?? x}, ${y?.toFixed?.(1) ?? y}) vel(${velocityX?.toFixed?.(1) ?? velocityX}, ${velocityY?.toFixed?.(1) ?? velocityY})`);
        });
      }

    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    setIsExecuting(false);
  }, [graph, gameSpec, showNotification, addLog]);

  // Clear execution logs
  const handleClearLogs = useCallback(() => {
    setExecutionLogs([]);
  }, []);

  const handleGraphChange = useCallback((newGraph: NodeGraph, actionDescription?: string) => {
    setGraph(newGraph);
    onGraphChange?.(newGraph);

    // Push to history with action description
    if (actionDescription) {
      pushHistory(newGraph, actionDescription);
    }
  }, [onGraphChange, pushHistory]);

  // Wrapper that detects what changed
  const handleGraphChangeWithAction = useCallback((newGraph: NodeGraph) => {
    let action = 'Edit graph';

    // Detect what changed
    if (newGraph.nodes.length > graph.nodes.length) {
      const newNode = newGraph.nodes.find(n => !graph.nodes.some(gn => gn.id === n.id));
      action = `Add ${NODE_LIBRARY[newNode?.type || '']?.title || 'node'}`;
    } else if (newGraph.nodes.length < graph.nodes.length) {
      action = 'Delete node';
    } else if (newGraph.connections.length > graph.connections.length) {
      action = 'Add connection';
    } else if (newGraph.connections.length < graph.connections.length) {
      action = 'Remove connection';
    } else if (newGraph.name !== graph.name) {
      action = 'Rename graph';
    } else {
      // Check if node position changed
      const movedNode = newGraph.nodes.find((n, i) => {
        const oldNode = graph.nodes[i];
        return oldNode && (n.position.x !== oldNode.position.x || n.position.y !== oldNode.position.y);
      });
      if (movedNode) {
        action = 'Move node';
      } else {
        // Check if node data changed
        const editedNode = newGraph.nodes.find((n, i) => {
          const oldNode = graph.nodes[i];
          return oldNode && JSON.stringify(n.data) !== JSON.stringify(oldNode.data);
        });
        if (editedNode) {
          action = 'Edit node properties';
        }
      }
    }

    handleGraphChange(newGraph, action);
  }, [graph, handleGraphChange]);

  const handleUndo = useCallback(() => {
    const previousGraph = undo();
    if (previousGraph) {
      setGraph(previousGraph);
      onGraphChange?.(previousGraph);
      showNotification(`Undo: ${getActionDescription()}`);
    }
  }, [undo, onGraphChange, showNotification, getActionDescription]);

  const handleRedo = useCallback(() => {
    const nextGraph = redo();
    if (nextGraph) {
      setGraph(nextGraph);
      onGraphChange?.(nextGraph);
      showNotification(`Redo: ${getActionDescription()}`);
    }
  }, [redo, onGraphChange, showNotification, getActionDescription]);

  const handleSave = useCallback(() => {
    onSave?.();
    showNotification('Saved');
  }, [onSave, showNotification]);

  // Insert a preset into the graph
  const handleInsertPreset = useCallback((preset: NodePreset) => {
    const { nodes, connections } = NodePresetService.instantiatePreset(preset.id, {
      position: { x: graph.viewport.x + 300, y: graph.viewport.y + 200 },
    });

    const newGraph: NodeGraph = {
      ...graph,
      nodes: [...graph.nodes, ...nodes],
      connections: [...graph.connections, ...connections],
    };

    handleGraphChange(newGraph, `Insert preset: ${preset.name}`);
    setShowPresetMenu(false);
    showNotification(`Inserted: ${preset.name}`);
  }, [graph, handleGraphChange, showNotification]);

  // Insert a built-in preset
  const handleInsertBuiltInPreset = useCallback((preset: NodePreset) => {
    const idPrefix = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const idMap = new Map<string, string>();

    // Create new nodes with unique IDs
    const nodes: NodeInstance[] = preset.nodes.map(node => {
      const newId = `${idPrefix}_${node.id}`;
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + graph.viewport.x + 300,
          y: node.position.y + graph.viewport.y + 200,
        },
        data: { ...node.data },
      };
    });

    // Create new connections with updated node IDs
    const connections: Connection[] = preset.connections.map(conn => ({
      id: `${idPrefix}_${conn.id}`,
      fromNodeId: idMap.get(conn.fromNodeId) || conn.fromNodeId,
      fromPortId: conn.fromPortId,
      toNodeId: idMap.get(conn.toNodeId) || conn.toNodeId,
      toPortId: conn.toPortId,
    }));

    const newGraph: NodeGraph = {
      ...graph,
      nodes: [...graph.nodes, ...nodes],
      connections: [...graph.connections, ...connections],
    };

    handleGraphChange(newGraph, `Insert preset: ${preset.name}`);
    setShowPresetMenu(false);
    showNotification(`Inserted: ${preset.name}`);
  }, [graph, handleGraphChange, showNotification]);

  // Save selected nodes as a preset
  const handleSaveAsPreset = useCallback(() => {
    if (selectedNodeIds.size === 0 && !selectedNodeId) {
      showNotification('Select nodes to save as preset');
      return;
    }

    const nodeIdsToSave = selectedNodeIds.size > 0
      ? Array.from(selectedNodeIds)
      : selectedNodeId ? [selectedNodeId] : [];

    const nodesToSave = graph.nodes.filter(n => nodeIdsToSave.includes(n.id));
    const connectionsToSave = graph.connections.filter(
      c => nodeIdsToSave.includes(c.fromNodeId) && nodeIdsToSave.includes(c.toNodeId)
    );

    if (nodesToSave.length === 0) {
      showNotification('No nodes selected');
      return;
    }

    try {
      const preset = NodePresetService.createPreset(
        presetName || 'My Preset',
        nodesToSave,
        connectionsToSave,
        { description: presetDescription }
      );
      showNotification(`Saved preset: ${preset.name}`);
      setShowSavePresetModal(false);
      setPresetName('');
      setPresetDescription('');
    } catch (e) {
      showNotification('Failed to save preset');
    }
  }, [selectedNodeIds, selectedNodeId, graph, presetName, presetDescription, showNotification]);

  // Delete a user preset
  const handleDeletePreset = useCallback((presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    NodePresetService.deletePreset(presetId);
    showNotification('Preset deleted');
  }, [showNotification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z = Undo
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      else if ((modKey && e.shiftKey && e.key === 'z') || (modKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S = Save
      else if (modKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Key simulation when console is open (W, A, S, D, Space)
      else if (showExecutionConsole && !modKey && !e.shiftKey && !e.altKey) {
        const key = e.key.toUpperCase();
        if (['W', 'A', 'S', 'D'].includes(key)) {
          e.preventDefault();
          handleTestExecution(key);
        } else if (e.code === 'Space') {
          e.preventDefault();
          handleTestExecution('Space');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, showExecutionConsole, handleTestExecution]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2a2a3e] border border-[#3f3f5a] rounded-lg shadow-lg text-sm text-white animate-fade-in">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] border-b border-[#3f3f5a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">Visual Script Editor</span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#3f3f5a] rounded">
            {graph.nodes.length} nodes • {graph.connections.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Test Execution Button */}
          <button
            onClick={() => handleTestExecution()}
            disabled={isExecuting}
            className={`px-3 py-1 text-sm rounded flex items-center gap-1.5 transition-all ${
              isExecuting
                ? 'bg-green-500/30 text-green-300 cursor-wait'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
            title="Test Execution (Run Script)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {isExecuting ? 'Running...' : 'Test'}
          </button>

          {/* Console Toggle Button */}
          <button
            onClick={() => setShowExecutionConsole(!showExecutionConsole)}
            className={`px-2 py-1 text-sm rounded flex items-center gap-1 transition-all ${
              showExecutionConsole
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Console"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded flex items-center gap-1.5"
            title="Save (Ctrl+S)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Presets Dropdown */}
          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded flex items-center gap-1.5"
              title="Node Presets"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Presets
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Preset dropdown menu */}
            {showPresetMenu && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#1e1e2e] border border-[#3f3f5a] rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Save as Preset */}
                <button
                  onClick={() => {
                    setShowPresetMenu(false);
                    setShowSavePresetModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 border-b border-[#3f3f5a]"
                >
                  <span className="text-lg">+</span>
                  Save Selection as Preset...
                </button>

                {/* Built-in Presets */}
                <div className="px-3 py-1.5 text-xs text-gray-500 bg-[#0f0f1a]">Templates</div>
                {BUILT_IN_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleInsertBuiltInPreset(preset)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <PresetIcon icon={preset.icon} className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{preset.name}</div>
                      <div className="text-xs text-gray-500 truncate">{preset.description}</div>
                    </div>
                  </button>
                ))}

                {/* User Presets */}
                {userPresets.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs text-gray-500 bg-[#0f0f1a]">My Presets</div>
                    {userPresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handleInsertPreset(preset)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 group"
                      >
                        <PresetIcon icon={preset.icon} className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{preset.name}</div>
                          {preset.description && (
                            <div className="text-xs text-gray-500 truncate">{preset.description}</div>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400"
                          title="Delete preset"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Graph name input */}
          <input
            type="text"
            value={graph.name}
            onChange={(e) => handleGraphChangeWithAction({ ...graph, name: e.target.value })}
            className="px-3 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <NodeCanvas
          graph={graph}
          onGraphChange={handleGraphChangeWithAction}
          onNodeSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* Execution Console Panel */}
      {showExecutionConsole && (
        <div className="h-[200px] flex-shrink-0 bg-[#0a0a12] border-t border-[#3f3f5a] flex flex-col">
          {/* Console Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e2e] border-b border-[#3f3f5a]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-white">Execution Console</span>
              <span className="text-xs text-gray-500">({executionLogs.length} entries)</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Input simulation buttons */}
              <div className="flex items-center gap-0.5 mr-2 px-2 py-0.5 bg-[#2a2a3e] rounded">
                <span className="text-[10px] text-gray-500 mr-1">Keys:</span>
                {['W', 'A', 'S', 'D', 'Space'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleTestExecution(key)}
                    className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-white hover:bg-white/20 rounded font-mono"
                    title={`Simulate ${key} key`}
                  >
                    {key === 'Space' ? 'SPC' : key}
                  </button>
                ))}
              </div>
              <button
                onClick={handleClearLogs}
                className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded"
                title="Clear Console"
              >
                Clear
              </button>
              <button
                onClick={() => setShowExecutionConsole(false)}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                title="Close Console"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Console Content */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
            {executionLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                Click "Test" to run your visual script
              </div>
            ) : (
              executionLogs.map((log) => (
                <div
                  key={log.id}
                  className={`px-2 py-0.5 rounded ${
                    log.type === 'error' ? 'bg-red-500/10 text-red-400' :
                    log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    log.type === 'success' ? 'bg-green-500/10 text-green-400' :
                    log.type === 'event' ? 'bg-purple-500/10 text-purple-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-600 mr-2">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                  </span>
                  {log.message}
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {/* Node inspector sidebar */}
      {selectedNodeId && (
        <NodeInspector
          graph={graph}
          nodeId={selectedNodeId}
          onGraphChange={handleGraphChangeWithAction}
        />
      )}

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e2e] border border-[#3f3f5a] rounded-lg shadow-xl w-96 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Save as Preset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="My Preset"
                  className="w-full px-3 py-2 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="What does this preset do?"
                  rows={2}
                  className="w-full px-3 py-2 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="text-xs text-gray-500">
                {selectedNodeIds.size > 0
                  ? `${selectedNodeIds.size} nodes selected`
                  : selectedNodeId
                    ? '1 node selected'
                    : 'No nodes selected'}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsPreset}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Node inspector for editing node properties
function NodeInspector({
  graph,
  nodeId,
  onGraphChange
}: {
  graph: NodeGraph;
  nodeId: string;
  onGraphChange: (graph: NodeGraph) => void;
}) {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const definition = NODE_LIBRARY[node.type];
  if (!definition) return null;

  const updateNodeData = (key: string, value: unknown) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n
      ),
    });
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-64 bg-[#1e1e2e] border-l border-[#3f3f5a] overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-1">{definition.title}</h3>
        <p className="text-xs text-gray-500 mb-4">{definition.description}</p>

        {/* Editable inputs with default values */}
        {definition.inputs
          .filter((input: { defaultValue?: unknown }) => input.defaultValue !== undefined)
          .map((input: { id: string; name: string; type: string; defaultValue?: unknown }) => (
            <div key={input.id} className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">{input.name}</label>
              {input.type === 'number' ? (
                <input
                  type="number"
                  value={node.data[input.id] as number ?? input.defaultValue}
                  onChange={(e) => updateNodeData(input.id, parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-blue-500"
                />
              ) : input.type === 'string' ? (
                <input
                  type="text"
                  value={node.data[input.id] as string ?? input.defaultValue}
                  onChange={(e) => updateNodeData(input.id, e.target.value)}
                  className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-blue-500"
                />
              ) : input.type === 'boolean' ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={node.data[input.id] as boolean ?? input.defaultValue}
                    onChange={(e) => updateNodeData(input.id, e.target.checked)}
                    className="w-4 h-4 rounded bg-[#2a2a3e] border-[#3f3f5a] text-blue-500"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>
              ) : null}
            </div>
          ))}

        {/* Node ID */}
        <div className="mt-6 pt-4 border-t border-[#3f3f5a]">
          <span className="text-xs text-gray-600">ID: {node.id}</span>
        </div>
      </div>
    </div>
  );
}

export { createDefaultGraph };
export type { NodeEditorProps };
