// Shader Graph Editor - Visual shader creation tool with real-time preview

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ShaderGraph, ShaderNodeInstance, ShaderConnection, CompiledShader } from '../../types/ShaderGraph';
import { SHADER_NODE_LIBRARY, SHADER_CATEGORIES, getShaderNodeDefinition } from '../../services/ShaderNodeLibrary';
import { ShaderGraphCompiler, createDefaultShaderGraph } from '../../services/ShaderGraphCompiler';
import ShaderNodeCanvas from './ShaderNodeCanvas';
import ShaderPreview from './ShaderPreview';

interface ShaderGraphEditorProps {
  graph?: ShaderGraph | null;
  onGraphChange?: (graph: ShaderGraph) => void;
  onClose?: () => void;
  onSave?: () => void;
}

export default function ShaderGraphEditor({
  graph: initialGraph,
  onGraphChange,
  onClose,
  onSave
}: ShaderGraphEditorProps) {
  const [graph, setGraph] = useState<ShaderGraph>(initialGraph || createDefaultShaderGraph());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [compiledShader, setCompiledShader] = useState<CompiledShader | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Compile shader when graph changes
  useEffect(() => {
    try {
      const compiler = new ShaderGraphCompiler(graph);
      const result = compiler.compile();
      setCompiledShader(result);
      setCompileError(null);
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : 'Compilation failed');
      setCompiledShader(null);
    }
  }, [graph]);

  // Close palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowNodePalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleGraphChange = useCallback((newGraph: ShaderGraph) => {
    setGraph(newGraph);
    onGraphChange?.(newGraph);
  }, [onGraphChange]);

  const handleSave = useCallback(() => {
    onSave?.();
    showNotification('Shader saved');
  }, [onSave, showNotification]);

  // Add a node at the center of the viewport
  const addNode = useCallback((type: string) => {
    const definition = getShaderNodeDefinition(type);
    if (!definition) return;

    const newNode: ShaderNodeInstance = {
      id: `${type}_${Date.now()}`,
      type,
      position: {
        x: graph.viewport.x + 300,
        y: graph.viewport.y + 200,
      },
      data: {},
    };

    // Set default values from definition
    for (const input of definition.inputs) {
      if (input.defaultValue !== undefined) {
        newNode.data[input.id] = input.defaultValue;
      }
    }

    handleGraphChange({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });
    setShowNodePalette(false);
    showNotification(`Added ${definition.title}`);
  }, [graph, handleGraphChange, showNotification]);

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!paletteSearch) return SHADER_NODE_LIBRARY;
    const search = paletteSearch.toLowerCase();
    return SHADER_NODE_LIBRARY.filter(
      node => node.title.toLowerCase().includes(search) ||
              node.type.toLowerCase().includes(search) ||
              node.category.toLowerCase().includes(search)
    );
  }, [paletteSearch]);

  // Group filtered nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, typeof SHADER_NODE_LIBRARY> = {};
    for (const node of filteredNodes) {
      if (!groups[node.category]) {
        groups[node.category] = [];
      }
      groups[node.category].push(node);
    }
    return groups;
  }, [filteredNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + S = Save
      if (modKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Space = Toggle node palette
      else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setShowNodePalette(!showNodePalette);
      }
      // P = Toggle preview
      else if (e.key === 'p' && e.target === document.body) {
        e.preventDefault();
        setShowPreview(!showPreview);
      }
      // Delete = Delete selected node
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && e.target === document.body) {
        e.preventDefault();
        // Don't delete output node
        const node = graph.nodes.find(n => n.id === selectedNodeId);
        if (node && node.type !== 'shader_output') {
          handleGraphChange({
            ...graph,
            nodes: graph.nodes.filter(n => n.id !== selectedNodeId),
            connections: graph.connections.filter(
              c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
            ),
          });
          setSelectedNodeId(null);
          showNotification('Node deleted');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, showNodePalette, showPreview, selectedNodeId, graph, handleGraphChange, showNotification]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2a2a3e] border border-[#3f3f5a] rounded-lg shadow-lg text-sm text-white animate-fade-in">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a28] border-b border-[#3f3f5a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Shader Graph Editor
          </span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#3f3f5a] rounded">
            {graph.nodes.length} nodes
          </span>
          {compileError && (
            <span className="text-xs text-red-400 px-2 py-0.5 bg-red-500/20 rounded">
              Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node Button */}
          <div className="relative" ref={paletteRef}>
            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Node
            </button>

            {/* Node Palette Dropdown */}
            {showNodePalette && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-[#1a1a28] border border-[#3f3f5a] rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-[#3f3f5a]">
                  <input
                    type="text"
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full px-3 py-1.5 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {Object.entries(groupedNodes).map(([category, nodes]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-xs text-gray-500 bg-[#0f0f1a] uppercase tracking-wide flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SHADER_CATEGORIES[category as keyof typeof SHADER_CATEGORIES]?.color || '#888' }}
                        />
                        {SHADER_CATEGORIES[category as keyof typeof SHADER_CATEGORIES]?.name || category}
                      </div>
                      {nodes.map(node => (
                        <button
                          key={node.type}
                          onClick={() => addNode(node.type)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3"
                        >
                          <span className="text-lg">{node.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{node.title}</div>
                            <div className="text-xs text-gray-500 truncate">{node.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Toggle Preview */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 text-sm rounded flex items-center gap-1.5 ${
              showPreview
                ? 'bg-purple-600/20 text-purple-300 border border-purple-600/50'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Preview (P)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
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

          {/* Shader name input */}
          <input
            type="text"
            value={graph.name}
            onChange={(e) => handleGraphChange({ ...graph, name: e.target.value })}
            className="px-3 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-purple-500 w-40"
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className={`flex-1 relative ${showPreview ? 'border-r border-[#3f3f5a]' : ''}`}>
          <ShaderNodeCanvas
            graph={graph}
            onGraphChange={handleGraphChange}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-80 flex flex-col bg-[#0f0f1a]">
            <ShaderPreview
              shader={compiledShader}
              error={compileError}
            />
          </div>
        )}
      </div>

      {/* Node Inspector */}
      {selectedNodeId && (
        <ShaderNodeInspector
          graph={graph}
          nodeId={selectedNodeId}
          onGraphChange={handleGraphChange}
        />
      )}
    </div>
  );
}

// Node inspector for editing shader node properties
function ShaderNodeInspector({
  graph,
  nodeId,
  onGraphChange
}: {
  graph: ShaderGraph;
  nodeId: string;
  onGraphChange: (graph: ShaderGraph) => void;
}) {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const definition = getShaderNodeDefinition(node.type);
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
    <div className="absolute right-0 top-12 bottom-0 w-64 bg-[#1a1a28] border-l border-[#3f3f5a] overflow-y-auto z-20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{definition.icon}</span>
          <h3 className="text-sm font-semibold text-white">{definition.title}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">{definition.description}</p>

        {/* Editable inputs */}
        {definition.inputs
          .filter(input => input.defaultValue !== undefined)
          .map(input => (
            <div key={input.id} className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">{input.name}</label>
              {input.type === 'float' ? (
                <input
                  type="number"
                  step="0.01"
                  value={node.data[input.id] as number ?? input.defaultValue}
                  onChange={(e) => updateNodeData(input.id, parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-purple-500"
                />
              ) : input.type === 'vec2' || input.type === 'vec3' || input.type === 'vec4' ? (
                <div className="flex gap-1">
                  {(node.data[input.id] as number[] ?? input.defaultValue as number[]).map((val: number, i: number) => (
                    <input
                      key={i}
                      type="number"
                      step="0.01"
                      value={val}
                      onChange={(e) => {
                        const arr = [...(node.data[input.id] as number[] ?? input.defaultValue as number[])];
                        arr[i] = parseFloat(e.target.value) || 0;
                        updateNodeData(input.id, arr);
                      }}
                      className="flex-1 px-1 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-xs text-white focus:outline-none focus:border-purple-500 w-12"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}

        {/* Color picker for color nodes */}
        {node.type === 'shader_color' && (
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={rgbToHex(
                  (node.data.r as number ?? 0.5) * 255,
                  (node.data.g as number ?? 0.5) * 255,
                  (node.data.b as number ?? 1.0) * 255
                )}
                onChange={(e) => {
                  const rgb = hexToRgb(e.target.value);
                  if (rgb) {
                    updateNodeData('r', rgb.r / 255);
                    updateNodeData('g', rgb.g / 255);
                    updateNodeData('b', rgb.b / 255);
                  }
                }}
                className="w-10 h-8 rounded cursor-pointer"
              />
              <div className="flex-1 text-xs text-gray-500">
                R: {((node.data.r as number ?? 0.5) * 255).toFixed(0)},
                G: {((node.data.g as number ?? 0.5) * 255).toFixed(0)},
                B: {((node.data.b as number ?? 1.0) * 255).toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* Node ID */}
        <div className="mt-6 pt-4 border-t border-[#3f3f5a]">
          <span className="text-xs text-gray-600">ID: {node.id}</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export { createDefaultShaderGraph };
export type { ShaderGraphEditorProps };
