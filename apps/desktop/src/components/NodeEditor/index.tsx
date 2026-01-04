import { useState, useCallback } from 'react';
import type { NodeGraph } from '../../types/NodeEditor';
import { NODE_LIBRARY } from '../../services/NodeLibrary';
import NodeCanvas from './NodeCanvas';

interface NodeEditorProps {
  graph?: NodeGraph | null;
  onGraphChange?: (graph: NodeGraph) => void;
  onClose?: () => void;
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

export default function NodeEditor({ graph: initialGraph, onGraphChange, onClose }: NodeEditorProps) {
  const [graph, setGraph] = useState<NodeGraph>(initialGraph || createDefaultGraph());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleGraphChange = useCallback((newGraph: NodeGraph) => {
    setGraph(newGraph);
    onGraphChange?.(newGraph);
  }, [onGraphChange]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] border-b border-[#3f3f5a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">Visual Script Editor</span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#3f3f5a] rounded">
            {graph.nodes.length} nodes • {graph.connections.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Graph name input */}
          <input
            type="text"
            value={graph.name}
            onChange={(e) => handleGraphChange({ ...graph, name: e.target.value })}
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
          onGraphChange={handleGraphChange}
          onNodeSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* Node inspector sidebar */}
      {selectedNodeId && (
        <NodeInspector
          graph={graph}
          nodeId={selectedNodeId}
          onGraphChange={handleGraphChange}
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
