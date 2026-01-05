import { useState, useCallback, useEffect, useRef } from 'react';
import type { NodeGraph } from '../../types/NodeEditor';
import { NODE_LIBRARY } from '../../services/NodeLibrary';
import { useNodeGraphHistory } from '../../hooks/useNodeGraphHistory';
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
  const [notification, setNotification] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const {
    canUndo,
    canRedo,
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
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded ${canUndo ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded ${canRedo ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 cursor-not-allowed'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
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
