// Behavior Tree Canvas - Visual canvas for behavior tree nodes

import { useRef, useState, useCallback, useEffect } from 'react';
import type { BehaviorTree, BehaviorNodeInstance, BehaviorConnection } from '../../types/BehaviorTree';
import { getBehaviorNodeDefinition } from '../../services/BehaviorTreeLibrary';

interface BehaviorTreeCanvasProps {
  tree: BehaviorTree;
  onTreeChange: (tree: BehaviorTree) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

export default function BehaviorTreeCanvas({
  tree,
  onTreeChange,
  onNodeSelect,
  selectedNodeId
}: BehaviorTreeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(tree.viewport);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update viewport in tree
  useEffect(() => {
    if (viewport !== tree.viewport) {
      onTreeChange({ ...tree, viewport });
    }
  }, [viewport]);

  // Handle canvas pan
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.target === canvasRef.current) {
      onNodeSelect(null);
      setConnectingFromId(null);
    }
  }, [onNodeSelect]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (draggedNodeId) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      onTreeChange({
        ...tree,
        nodes: tree.nodes.map(n =>
          n.id === draggedNodeId
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        ),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, draggedNodeId, viewport.zoom, tree, onTreeChange]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(2, viewport.zoom * zoomFactor));
    setViewport(v => ({ ...v, zoom: newZoom }));
  }, [viewport.zoom]);

  // Handle node drag start
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
    onNodeSelect(nodeId);
  }, [onNodeSelect]);

  // Handle connecting nodes
  const handleConnectStart = useCallback((nodeId: string) => {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const definition = getBehaviorNodeDefinition(node.type);
    if (!definition || definition.maxChildren === 0) return;

    // Check if node can have more children
    const childCount = tree.connections.filter(c => c.parentId === nodeId).length;
    if (definition.maxChildren !== -1 && childCount >= definition.maxChildren) return;

    setConnectingFromId(nodeId);
  }, [tree]);

  const handleConnectEnd = useCallback((nodeId: string) => {
    if (!connectingFromId || connectingFromId === nodeId) {
      setConnectingFromId(null);
      return;
    }

    // Check if target already has a parent
    const hasParent = tree.connections.some(c => c.childId === nodeId);
    if (hasParent) {
      setConnectingFromId(null);
      return;
    }

    // Get the next order index
    const siblingConnections = tree.connections.filter(c => c.parentId === connectingFromId);
    const nextOrder = siblingConnections.length > 0
      ? Math.max(...siblingConnections.map(c => c.order)) + 1
      : 0;

    const newConnection: BehaviorConnection = {
      id: `conn_${Date.now()}`,
      parentId: connectingFromId,
      childId: nodeId,
      order: nextOrder,
    };

    onTreeChange({
      ...tree,
      connections: [...tree.connections, newConnection],
    });
    setConnectingFromId(null);
  }, [connectingFromId, tree, onTreeChange]);

  // Remove connection
  const handleConnectionClick = useCallback((connId: string) => {
    onTreeChange({
      ...tree,
      connections: tree.connections.filter(c => c.id !== connId),
    });
  }, [tree, onTreeChange]);

  // Calculate node position with child connector
  const getNodeBottomCenter = (node: BehaviorNodeInstance): { x: number; y: number } => {
    return {
      x: node.position.x + 80, // Half of node width
      y: node.position.y + 60, // Node height
    };
  };

  const getNodeTopCenter = (node: BehaviorNodeInstance): { x: number; y: number } => {
    return {
      x: node.position.x + 80,
      y: node.position.y,
    };
  };

  // Render connection line
  const renderConnection = (conn: BehaviorConnection) => {
    const parentNode = tree.nodes.find(n => n.id === conn.parentId);
    const childNode = tree.nodes.find(n => n.id === conn.childId);
    if (!parentNode || !childNode) return null;

    const from = getNodeBottomCenter(parentNode);
    const to = getNodeTopCenter(childNode);

    const parentDef = getBehaviorNodeDefinition(parentNode.type);
    const color = parentDef ? parentDef.color : '#888';

    // Vertical tree style connection
    const midY = from.y + (to.y - from.y) / 2;

    return (
      <g key={conn.id} onClick={() => handleConnectionClick(conn.id)} className="cursor-pointer">
        <path
          d={`M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
          className="opacity-60 hover:opacity-100 transition-opacity"
        />
        {/* Arrow */}
        <path
          d={`M ${to.x - 5} ${to.y - 8} L ${to.x} ${to.y} L ${to.x + 5} ${to.y - 8}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        {/* Invisible wider path for easier clicking */}
        <path
          d={`M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`}
          stroke="transparent"
          strokeWidth={15}
          fill="none"
        />
      </g>
    );
  };

  // Render connecting line (while dragging)
  const renderConnectingLine = () => {
    if (!connectingFromId) return null;

    const parentNode = tree.nodes.find(n => n.id === connectingFromId);
    if (!parentNode) return null;

    const from = getNodeBottomCenter(parentNode);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const toX = (mousePos.x - canvasRect.left - viewport.x) / viewport.zoom;
    const toY = (mousePos.y - canvasRect.top - viewport.y) / viewport.zoom;

    const midY = from.y + (toY - from.y) / 2;

    return (
      <path
        d={`M ${from.x} ${from.y} L ${from.x} ${midY} L ${toX} ${midY} L ${toX} ${toY}`}
        stroke="#60a5fa"
        strokeWidth={2}
        strokeDasharray="5,5"
        fill="none"
        className="opacity-50"
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden relative bg-[#0a0a12] cursor-default"
      style={{ cursor: isDragging ? 'grabbing' : (connectingFromId ? 'crosshair' : 'default') }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(60, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(60, 130, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* Transform container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Connections */}
        <svg className="absolute inset-0 w-[10000px] h-[10000px] overflow-visible pointer-events-none" style={{ left: -5000, top: -5000 }}>
          <g transform="translate(5000, 5000)" className="pointer-events-auto">
            {tree.connections.map(renderConnection)}
            {renderConnectingLine()}
          </g>
        </svg>

        {/* Nodes */}
        {tree.nodes.map(node => (
          <BehaviorTreeNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isRoot={tree.rootId === node.id}
            isConnecting={connectingFromId !== null}
            canConnect={connectingFromId !== null && connectingFromId !== node.id && !tree.connections.some(c => c.childId === node.id)}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onConnectStart={() => handleConnectStart(node.id)}
            onConnectEnd={() => handleConnectEnd(node.id)}
            childCount={tree.connections.filter(c => c.parentId === node.id).length}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-[#1a1a28] border border-[#3f3f5a] rounded text-xs text-gray-500">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 px-3 py-2 bg-[#1a1a28]/80 border border-[#3f3f5a] rounded text-xs text-gray-500 space-y-1">
        <div>Alt+drag or Middle-click to pan</div>
        <div>Scroll to zoom</div>
        <div>Click + on node to add child</div>
        <div>Click on node top to connect as child</div>
      </div>
    </div>
  );
}

// Individual behavior tree node component
function BehaviorTreeNode({
  node,
  isSelected,
  isRoot,
  isConnecting,
  canConnect,
  onMouseDown,
  onConnectStart,
  onConnectEnd,
  childCount
}: {
  node: BehaviorNodeInstance;
  isSelected: boolean;
  isRoot: boolean;
  isConnecting: boolean;
  canConnect: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectStart: () => void;
  onConnectEnd: () => void;
  childCount: number;
}) {
  const definition = getBehaviorNodeDefinition(node.type);
  if (!definition) return null;

  const canHaveChildren = definition.maxChildren !== 0;
  const canAddMoreChildren = definition.maxChildren === -1 || childCount < definition.maxChildren;

  return (
    <div
      className={`absolute rounded-lg shadow-xl overflow-visible ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isRoot ? 'ring-2 ring-green-500' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 160,
      }}
    >
      {/* Connect drop zone (top) */}
      {canConnect && (
        <button
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 bg-blue-500 rounded-t-lg opacity-80 hover:opacity-100 flex items-center justify-center z-10"
          onClick={(e) => {
            e.stopPropagation();
            onConnectEnd();
          }}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Root indicator */}
      {isRoot && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-600 rounded text-xs text-white">
          ROOT
        </div>
      )}

      {/* Main node content */}
      <div
        className="rounded-lg cursor-move"
        style={{
          backgroundColor: '#1a1a28',
          border: `2px solid ${definition.color}40`,
        }}
        onMouseDown={onMouseDown}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-2 rounded-t-lg"
          style={{
            backgroundColor: definition.color + '20',
          }}
        >
          <span
            className="w-6 h-6 flex items-center justify-center rounded text-sm"
            style={{ backgroundColor: definition.color + '40' }}
          >
            {definition.icon}
          </span>
          <span className="text-xs font-medium text-white truncate flex-1">{definition.title}</span>
        </div>

        {/* Preview of key settings */}
        {definition.inputs.length > 0 && (
          <div className="px-2 py-1 border-t border-white/5 text-xs text-gray-500 truncate">
            {definition.inputs.slice(0, 2).map(input => {
              const value = node.data[input.id] ?? input.defaultValue;
              return (
                <div key={input.id} className="truncate">
                  {input.name}: {String(value)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add child button (bottom) */}
      {canHaveChildren && canAddMoreChildren && !isConnecting && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#2a2a3e] hover:bg-[#3a3a4e] border border-[#3f3f5a] rounded-full flex items-center justify-center z-10"
          onClick={(e) => {
            e.stopPropagation();
            onConnectStart();
          }}
          title="Add child node"
        >
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Child count indicator */}
      {childCount > 0 && (
        <div className="absolute -bottom-2 right-2 px-1.5 py-0.5 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-xs text-gray-500">
          {childCount}
        </div>
      )}
    </div>
  );
}
