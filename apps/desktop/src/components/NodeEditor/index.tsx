import { useState, useCallback, useEffect, useRef } from 'react';
import type { NodeGraph, NodeInstance, Connection } from '../../types/NodeEditor';
import { NODE_LIBRARY } from '../../services/NodeLibrary';
import { useNodeGraphHistory } from '../../hooks/useNodeGraphHistory';
import { NodePresetService, BUILT_IN_PRESETS, type NodePreset } from '../../services/NodePresetService';
import NodeCanvas from './NodeCanvas';

interface NodeEditorProps {
  graph?: NodeGraph | null;
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

export default function NodeEditor({ graph: initialGraph, onGraphChange, onClose, onSave }: NodeEditorProps) {
  const [graph, setGraph] = useState<NodeGraph>(initialGraph || createDefaultGraph());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [userPresets, setUserPresets] = useState<NodePreset[]>([]);
  const isInitialized = useRef(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

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
                    <span className="text-lg">{preset.icon}</span>
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
                        <span className="text-lg">{preset.icon || '📦'}</span>
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
      <div className="flex-1 relative">
        <NodeCanvas
          graph={graph}
          onGraphChange={handleGraphChangeWithAction}
          onNodeSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      </div>

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
