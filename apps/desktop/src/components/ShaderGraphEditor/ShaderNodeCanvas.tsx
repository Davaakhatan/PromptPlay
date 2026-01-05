// Shader Node Canvas - Visual canvas for shader graph nodes

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ShaderGraph, ShaderNodeInstance, ShaderConnection, ShaderPortType } from '../../types/ShaderGraph';
import { SHADER_PORT_COLORS, SHADER_CATEGORY_COLORS } from '../../types/ShaderGraph';
import { getShaderNodeDefinition } from '../../services/ShaderNodeLibrary';

interface ShaderNodeCanvasProps {
  graph: ShaderGraph;
  onGraphChange: (graph: ShaderGraph) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

export default function ShaderNodeCanvas({
  graph,
  onGraphChange,
  onNodeSelect,
  selectedNodeId
}: ShaderNodeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(graph.viewport);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingPort, setConnectingPort] = useState<{
    nodeId: string;
    portId: string;
    isOutput: boolean;
    type: ShaderPortType;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update viewport in graph
  useEffect(() => {
    if (viewport !== graph.viewport) {
      onGraphChange({ ...graph, viewport });
    }
  }, [viewport]);

  // Handle canvas pan
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+click to pan
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.target === canvasRef.current) {
      // Click on canvas background - deselect
      onNodeSelect(null);
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
      onGraphChange({
        ...graph,
        nodes: graph.nodes.map(n =>
          n.id === draggedNodeId
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        ),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, draggedNodeId, viewport.zoom, graph, onGraphChange]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setConnectingPort(null);
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

  // Handle port click for connections
  const handlePortClick = useCallback((nodeId: string, portId: string, isOutput: boolean, portType: ShaderPortType) => {
    if (!connectingPort) {
      setConnectingPort({ nodeId, portId, isOutput, type: portType });
    } else {
      // Complete connection
      if (connectingPort.isOutput !== isOutput && connectingPort.nodeId !== nodeId) {
        const fromNodeId = connectingPort.isOutput ? connectingPort.nodeId : nodeId;
        const fromPortId = connectingPort.isOutput ? connectingPort.portId : portId;
        const toNodeId = connectingPort.isOutput ? nodeId : connectingPort.nodeId;
        const toPortId = connectingPort.isOutput ? portId : connectingPort.portId;

        // Remove existing connection to this input
        const filteredConnections = graph.connections.filter(
          c => !(c.toNodeId === toNodeId && c.toPortId === toPortId)
        );

        const newConnection: ShaderConnection = {
          id: `conn_${Date.now()}`,
          fromNodeId,
          fromPortId,
          toNodeId,
          toPortId,
        };

        onGraphChange({
          ...graph,
          connections: [...filteredConnections, newConnection],
        });
      }
      setConnectingPort(null);
    }
  }, [connectingPort, graph, onGraphChange]);

  // Remove connection
  const handleConnectionClick = useCallback((connId: string) => {
    onGraphChange({
      ...graph,
      connections: graph.connections.filter(c => c.id !== connId),
    });
  }, [graph, onGraphChange]);

  // Get port position in canvas coordinates
  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean): { x: number; y: number } | null => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const definition = getShaderNodeDefinition(node.type);
    if (!definition) return null;

    const ports = isOutput ? definition.outputs : definition.inputs;
    const portIndex = ports.findIndex(p => p.id === portId);
    if (portIndex === -1) return null;

    const nodeWidth = 200;
    const portSpacing = 24;
    const headerHeight = 32;
    const portY = headerHeight + portIndex * portSpacing + 12;

    return {
      x: node.position.x + (isOutput ? nodeWidth : 0),
      y: node.position.y + portY,
    };
  };

  // Render connection line
  const renderConnection = (conn: ShaderConnection) => {
    const fromPos = getPortPosition(conn.fromNodeId, conn.fromPortId, true);
    const toPos = getPortPosition(conn.toNodeId, conn.toPortId, false);
    if (!fromPos || !toPos) return null;

    const fromNode = graph.nodes.find(n => n.id === conn.fromNodeId);
    const fromDef = fromNode ? getShaderNodeDefinition(fromNode.type) : null;
    const port = fromDef?.outputs.find(p => p.id === conn.fromPortId);
    const color = port ? SHADER_PORT_COLORS[port.type] : '#888';

    // Bezier curve
    const dx = toPos.x - fromPos.x;
    const cp1x = fromPos.x + Math.max(50, dx * 0.5);
    const cp2x = toPos.x - Math.max(50, dx * 0.5);

    return (
      <g key={conn.id} onClick={() => handleConnectionClick(conn.id)} className="cursor-pointer">
        <path
          d={`M ${fromPos.x} ${fromPos.y} C ${cp1x} ${fromPos.y}, ${cp2x} ${toPos.y}, ${toPos.x} ${toPos.y}`}
          stroke={color}
          strokeWidth={3}
          fill="none"
          className="opacity-70 hover:opacity-100 transition-opacity"
        />
        {/* Invisible wider path for easier clicking */}
        <path
          d={`M ${fromPos.x} ${fromPos.y} C ${cp1x} ${fromPos.y}, ${cp2x} ${toPos.y}, ${toPos.x} ${toPos.y}`}
          stroke="transparent"
          strokeWidth={15}
          fill="none"
        />
      </g>
    );
  };

  // Render connecting line (while dragging)
  const renderConnectingLine = () => {
    if (!connectingPort) return null;

    const portPos = getPortPosition(connectingPort.nodeId, connectingPort.portId, connectingPort.isOutput);
    if (!portPos) return null;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const toX = (mousePos.x - canvasRect.left - viewport.x) / viewport.zoom;
    const toY = (mousePos.y - canvasRect.top - viewport.y) / viewport.zoom;

    const fromX = connectingPort.isOutput ? portPos.x : toX;
    const fromY = connectingPort.isOutput ? portPos.y : toY;
    const endX = connectingPort.isOutput ? toX : portPos.x;
    const endY = connectingPort.isOutput ? toY : portPos.y;

    const dx = endX - fromX;
    const cp1x = fromX + Math.max(50, Math.abs(dx) * 0.5);
    const cp2x = endX - Math.max(50, Math.abs(dx) * 0.5);

    return (
      <path
        d={`M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${endY}, ${endX} ${endY}`}
        stroke={SHADER_PORT_COLORS[connectingPort.type]}
        strokeWidth={3}
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
      style={{ cursor: isDragging ? 'grabbing' : (connectingPort ? 'crosshair' : 'default') }}
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
            linear-gradient(rgba(80, 80, 120, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(80, 80, 120, 0.1) 1px, transparent 1px)
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
            {graph.connections.map(renderConnection)}
            {renderConnectingLine()}
          </g>
        </svg>

        {/* Nodes */}
        {graph.nodes.map(node => (
          <ShaderNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onPortClick={(portId, isOutput, type) => handlePortClick(node.id, portId, isOutput, type)}
            connectingPort={connectingPort}
            graph={graph}
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
        <div>Click ports to connect</div>
      </div>
    </div>
  );
}

// Individual shader node component
function ShaderNode({
  node,
  isSelected,
  onMouseDown,
  onPortClick,
  connectingPort,
  graph
}: {
  node: ShaderNodeInstance;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onPortClick: (portId: string, isOutput: boolean, type: ShaderPortType) => void;
  connectingPort: { nodeId: string; portId: string; isOutput: boolean; type: ShaderPortType } | null;
  graph: ShaderGraph;
}) {
  const definition = getShaderNodeDefinition(node.type);
  if (!definition) return null;

  const isOutputNode = node.type === 'shader_output';

  // Check if a port has a connection
  const hasConnection = (portId: string, isOutput: boolean) => {
    return graph.connections.some(c =>
      isOutput
        ? c.fromNodeId === node.id && c.fromPortId === portId
        : c.toNodeId === node.id && c.toPortId === portId
    );
  };

  return (
    <div
      className={`absolute rounded-lg shadow-xl overflow-hidden ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      } ${isOutputNode ? 'ring-1 ring-purple-400/50' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 200,
        backgroundColor: '#1a1a28',
        border: '1px solid #3f3f5a',
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 cursor-move border-b"
        style={{
          backgroundColor: SHADER_CATEGORY_COLORS[definition.category] || '#2a2a3e',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-sm">{definition.icon}</span>
        <span className="text-sm font-medium text-white truncate">{definition.title}</span>
      </div>

      {/* Ports */}
      <div className="py-2">
        {/* Inputs */}
        {definition.inputs.map((port) => {
          const connected = hasConnection(port.id, false);
          const isCompatible = !connectingPort ||
            (connectingPort.isOutput && connectingPort.nodeId !== node.id);

          return (
            <div key={port.id} className="flex items-center px-3 py-0.5 h-6">
              <button
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  isCompatible && connectingPort ? 'scale-125' : ''
                }`}
                style={{
                  backgroundColor: connected ? SHADER_PORT_COLORS[port.type] : '#1a1a28',
                  borderColor: SHADER_PORT_COLORS[port.type],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPortClick(port.id, false, port.type);
                }}
              />
              <span className="ml-2 text-xs text-gray-400">{port.name}</span>
            </div>
          );
        })}

        {/* Outputs */}
        {definition.outputs.map((port) => {
          const connected = hasConnection(port.id, true);
          const isCompatible = !connectingPort ||
            (!connectingPort.isOutput && connectingPort.nodeId !== node.id);

          return (
            <div key={port.id} className="flex items-center justify-end px-3 py-0.5 h-6">
              <span className="mr-2 text-xs text-gray-400">{port.name}</span>
              <button
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  isCompatible && connectingPort ? 'scale-125' : ''
                }`}
                style={{
                  backgroundColor: connected ? SHADER_PORT_COLORS[port.type] : '#1a1a28',
                  borderColor: SHADER_PORT_COLORS[port.type],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPortClick(port.id, true, port.type);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
