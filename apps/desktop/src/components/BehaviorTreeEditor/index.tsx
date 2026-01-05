// Behavior Tree Editor - Visual editor for AI decision trees

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { BehaviorTree, BehaviorNodeInstance, BehaviorConnection, BehaviorNodeType, BehaviorNodeCategory } from '../../types/BehaviorTree';
import { BEHAVIOR_NODE_DEFINITIONS, BEHAVIOR_CATEGORIES, getBehaviorNodeDefinition, createDefaultBehaviorTree } from '../../services/BehaviorTreeLibrary';
import BehaviorTreeCanvas from './BehaviorTreeCanvas';

interface BehaviorTreeEditorProps {
  tree?: BehaviorTree | null;
  onTreeChange?: (tree: BehaviorTree) => void;
  onClose?: () => void;
  onSave?: () => void;
}

export default function BehaviorTreeEditor({
  tree: initialTree,
  onTreeChange,
  onClose,
  onSave
}: BehaviorTreeEditorProps) {
  const [tree, setTree] = useState<BehaviorTree>(initialTree || createDefaultBehaviorTree());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BehaviorNodeCategory | 'all'>('all');
  const paletteRef = useRef<HTMLDivElement>(null);

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

  const handleTreeChange = useCallback((newTree: BehaviorTree) => {
    setTree(newTree);
    onTreeChange?.(newTree);
  }, [onTreeChange]);

  const handleSave = useCallback(() => {
    onSave?.();
    showNotification('Behavior tree saved');
  }, [onSave, showNotification]);

  // Add a node at the center of the viewport
  const addNode = useCallback((type: BehaviorNodeType) => {
    const definition = getBehaviorNodeDefinition(type);
    if (!definition) return;

    const newNode: BehaviorNodeInstance = {
      id: `${type}_${Date.now()}`,
      type,
      position: {
        x: tree.viewport.x + 300,
        y: tree.viewport.y + 200,
      },
      data: {},
    };

    // Set default values from definition
    for (const input of definition.inputs) {
      if (input.defaultValue !== undefined) {
        newNode.data[input.id] = input.defaultValue;
      }
    }

    // If no root, make this the root
    const newTree: BehaviorTree = {
      ...tree,
      nodes: [...tree.nodes, newNode],
      rootId: tree.rootId || newNode.id,
    };

    handleTreeChange(newTree);
    setShowNodePalette(false);
    showNotification(`Added ${definition.title}`);
  }, [tree, handleTreeChange, showNotification]);

  // Filter nodes by search and category
  const filteredNodes = useMemo(() => {
    let nodes = BEHAVIOR_NODE_DEFINITIONS;

    if (selectedCategory !== 'all') {
      nodes = nodes.filter(node => node.category === selectedCategory);
    }

    if (paletteSearch) {
      const search = paletteSearch.toLowerCase();
      nodes = nodes.filter(
        node => node.title.toLowerCase().includes(search) ||
                node.type.toLowerCase().includes(search) ||
                node.description.toLowerCase().includes(search)
      );
    }

    return nodes;
  }, [paletteSearch, selectedCategory]);

  // Group filtered nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, typeof BEHAVIOR_NODE_DEFINITIONS> = {};
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
      // Delete = Delete selected node
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && e.target === document.body) {
        e.preventDefault();
        handleTreeChange({
          ...tree,
          nodes: tree.nodes.filter(n => n.id !== selectedNodeId),
          connections: tree.connections.filter(
            c => c.parentId !== selectedNodeId && c.childId !== selectedNodeId
          ),
          rootId: tree.rootId === selectedNodeId ? null : tree.rootId,
        });
        setSelectedNodeId(null);
        showNotification('Node deleted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, showNodePalette, selectedNodeId, tree, handleTreeChange, showNotification]);

  const categoryTabs: { key: BehaviorNodeCategory | 'all'; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'composite', label: 'Composite', color: '#3b82f6' },
    { key: 'decorator', label: 'Decorator', color: '#8b5cf6' },
    { key: 'action', label: 'Action', color: '#22c55e' },
    { key: 'condition', label: 'Condition', color: '#f59e0b' },
  ];

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
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Behavior Tree Editor
          </span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#3f3f5a] rounded">
            {tree.nodes.length} nodes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node Button */}
          <div className="relative" ref={paletteRef}>
            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Node
            </button>

            {/* Node Palette Dropdown */}
            {showNodePalette && (
              <div className="absolute right-0 top-full mt-1 w-96 bg-[#1a1a28] border border-[#3f3f5a] rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden flex flex-col">
                {/* Search */}
                <div className="p-2 border-b border-[#3f3f5a]">
                  <input
                    type="text"
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full px-3 py-1.5 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Category tabs */}
                <div className="flex gap-1 p-2 border-b border-[#3f3f5a] overflow-x-auto">
                  {categoryTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedCategory(tab.key)}
                      className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        selectedCategory === tab.key
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={selectedCategory === tab.key && tab.color ? { borderLeft: `2px solid ${tab.color}` } : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Node list */}
                <div className="overflow-y-auto flex-1">
                  {Object.entries(groupedNodes).map(([category, nodes]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-xs text-gray-500 bg-[#0f0f1a] uppercase tracking-wide flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: BEHAVIOR_CATEGORIES[category as BehaviorNodeCategory]?.color || '#888' }}
                        />
                        {BEHAVIOR_CATEGORIES[category as BehaviorNodeCategory]?.name || category}
                      </div>
                      {nodes.map(node => (
                        <button
                          key={node.type}
                          onClick={() => addNode(node.type)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3"
                        >
                          <span
                            className="w-8 h-8 flex items-center justify-center rounded text-lg"
                            style={{ backgroundColor: node.color + '30' }}
                          >
                            {node.icon}
                          </span>
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

          {/* Tree name input */}
          <input
            type="text"
            value={tree.name}
            onChange={(e) => handleTreeChange({ ...tree, name: e.target.value })}
            className="px-3 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-blue-500 w-40"
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
        <div className="flex-1 relative">
          <BehaviorTreeCanvas
            tree={tree}
            onTreeChange={handleTreeChange}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>

        {/* Node Inspector */}
        {selectedNodeId && (
          <BehaviorNodeInspector
            tree={tree}
            nodeId={selectedNodeId}
            onTreeChange={handleTreeChange}
          />
        )}
      </div>
    </div>
  );
}

// Node inspector for editing behavior node properties
function BehaviorNodeInspector({
  tree,
  nodeId,
  onTreeChange
}: {
  tree: BehaviorTree;
  nodeId: string;
  onTreeChange: (tree: BehaviorTree) => void;
}) {
  const node = tree.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const definition = getBehaviorNodeDefinition(node.type);
  if (!definition) return null;

  const updateNodeData = (key: string, value: unknown) => {
    onTreeChange({
      ...tree,
      nodes: tree.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n
      ),
    });
  };

  const setAsRoot = () => {
    onTreeChange({ ...tree, rootId: nodeId });
  };

  const isRoot = tree.rootId === nodeId;

  return (
    <div className="w-64 bg-[#1a1a28] border-l border-[#3f3f5a] overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-8 h-8 flex items-center justify-center rounded text-lg"
            style={{ backgroundColor: definition.color + '30' }}
          >
            {definition.icon}
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">{definition.title}</h3>
            {isRoot && (
              <span className="text-xs text-green-400">Root Node</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">{definition.description}</p>

        {/* Set as Root button */}
        {!isRoot && (
          <button
            onClick={setAsRoot}
            className="w-full mb-4 px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 rounded"
          >
            Set as Root Node
          </button>
        )}

        {/* Editable inputs */}
        {definition.inputs.map(input => (
          <div key={input.id} className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">{input.name}</label>
            {input.type === 'number' ? (
              <input
                type="number"
                step="0.1"
                value={node.data[input.id] as number ?? input.defaultValue}
                onChange={(e) => updateNodeData(input.id, parseFloat(e.target.value) || 0)}
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
            ) : (
              <input
                type="text"
                value={String(node.data[input.id] ?? input.defaultValue ?? '')}
                onChange={(e) => updateNodeData(input.id, e.target.value)}
                className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-blue-500"
              />
            )}
          </div>
        ))}

        {/* Node info */}
        <div className="mt-6 pt-4 border-t border-[#3f3f5a] space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Category</span>
            <span className="text-gray-400">{definition.category}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Children</span>
            <span className="text-gray-400">
              {definition.maxChildren === 0 ? 'None' :
               definition.maxChildren === -1 ? 'Unlimited' :
               `Max ${definition.maxChildren}`}
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-2">ID: {node.id}</div>
        </div>
      </div>
    </div>
  );
}

export { createDefaultBehaviorTree };
export type { BehaviorTreeEditorProps };
