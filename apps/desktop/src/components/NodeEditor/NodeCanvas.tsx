import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { NodeGraph, NodeInstance, Connection, NodeDefinition, PortType } from '../../types/NodeEditor';
import { NODE_LIBRARY, getNodesByCategory, getCategories } from '../../services/NodeLibrary';
import { PORT_COLORS, CATEGORY_COLORS } from '../../types/NodeEditor';

interface NodeCanvasProps {
  graph: NodeGraph;
  onGraphChange: (graph: NodeGraph) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
}

// Connection rendering component
function ConnectionWire({
  fromX, fromY, toX, toY, portType, selected
}: {
  fromX: number; fromY: number; toX: number; toY: number; portType: PortType; selected?: boolean;
}) {
  const color = PORT_COLORS[portType] || PORT_COLORS.any;

  // Bezier curve control points
  const midX = (fromX + toX) / 2;
  const cpOffset = Math.min(Math.abs(toX - fromX) * 0.5, 100);

  const path = `M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY}, ${toX - cpOffset} ${toY}, ${toX} ${toY}`;

  return (
    <g>
      {/* Shadow/glow */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 4 : 2}
        strokeOpacity={0.3}
        filter="blur(4px)"
      />
      {/* Main wire */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
      />
    </g>
  );
}

// Individual Node component
function NodeComponent({
  node,
  definition,
  selected,
  onSelect,
  onDrag,
  onPortClick,
  connectingPort,
  zoom,
}: {
  node: NodeInstance;
  definition: NodeDefinition;
  selected: boolean;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
  onPortClick: (nodeId: string, portId: string, isOutput: boolean, portType: PortType) => void;
  connectingPort: { nodeId: string; portId: string; isOutput: boolean; portType: PortType } | null;
  zoom: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const categoryColor = CATEGORY_COLORS[definition.category];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      dragStart.current = { x: e.clientX, y: e.clientY };
      onDrag(dx, dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag, zoom]);

  const nodeWidth = 180;
  const headerHeight = 32;
  const portHeight = 24;
  const maxPorts = Math.max(definition.inputs.length, definition.outputs.length);
  const nodeHeight = headerHeight + maxPorts * portHeight + 12;

  return (
    <g transform={`translate(${node.position.x}, ${node.position.y})`}>
      {/* Node background */}
      <rect
        x={0}
        y={0}
        width={nodeWidth}
        height={nodeHeight}
        rx={8}
        fill="#1e1e2e"
        stroke={selected ? '#60a5fa' : '#3f3f5a'}
        strokeWidth={selected ? 2 : 1}
        className="cursor-move"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <rect
        x={0}
        y={0}
        width={nodeWidth}
        height={headerHeight}
        rx={8}
        fill={categoryColor}
        className="cursor-move"
        onMouseDown={handleMouseDown}
      />
      <rect
        x={0}
        y={headerHeight - 8}
        width={nodeWidth}
        height={8}
        fill={categoryColor}
      />

      {/* Title */}
      <text
        x={12}
        y={21}
        fill="white"
        fontSize={12}
        fontWeight={600}
        className="pointer-events-none select-none"
      >
        {definition.icon && <tspan>{definition.icon} </tspan>}
        {definition.title}
      </text>

      {/* Input ports */}
      {definition.inputs.map((port, i) => {
        const y = headerHeight + 12 + i * portHeight;
        const portColor = PORT_COLORS[port.type];
        const isConnecting = connectingPort &&
          !connectingPort.isOutput &&
          connectingPort.nodeId === node.id &&
          connectingPort.portId === port.id;

        return (
          <g key={`in-${port.id}`}>
            {/* Port circle */}
            <circle
              cx={0}
              cy={y}
              r={6}
              fill={isConnecting ? portColor : '#1e1e2e'}
              stroke={portColor}
              strokeWidth={2}
              className="cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onPortClick(node.id, port.id, false, port.type);
              }}
            />
            {/* Port label */}
            <text
              x={14}
              y={y + 4}
              fill="#a1a1aa"
              fontSize={11}
              className="pointer-events-none select-none"
            >
              {port.name}
            </text>
          </g>
        );
      })}

      {/* Output ports */}
      {definition.outputs.map((port, i) => {
        const y = headerHeight + 12 + i * portHeight;
        const portColor = PORT_COLORS[port.type];
        const isConnecting = connectingPort &&
          connectingPort.isOutput &&
          connectingPort.nodeId === node.id &&
          connectingPort.portId === port.id;

        return (
          <g key={`out-${port.id}`}>
            {/* Port circle */}
            <circle
              cx={nodeWidth}
              cy={y}
              r={6}
              fill={isConnecting ? portColor : '#1e1e2e'}
              stroke={portColor}
              strokeWidth={2}
              className="cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onPortClick(node.id, port.id, true, port.type);
              }}
            />
            {/* Port label */}
            <text
              x={nodeWidth - 14}
              y={y + 4}
              fill="#a1a1aa"
              fontSize={11}
              textAnchor="end"
              className="pointer-events-none select-none"
            >
              {port.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Node palette for adding new nodes
function NodePalette({
  onAddNode,
  position,
  onClose
}: {
  onAddNode: (type: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('events');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return null;
    const lower = search.toLowerCase();
    return Object.values(NODE_LIBRARY).filter(
      node => node.title.toLowerCase().includes(lower) ||
              node.description.toLowerCase().includes(lower)
    );
  }, [search]);

  return (
    <div
      className="absolute bg-[#1e1e2e] border border-[#3f3f5a] rounded-lg shadow-2xl w-64 overflow-hidden z-50"
      style={{ left: position.x, top: position.y }}
    >
      {/* Search */}
      <div className="p-2 border-b border-[#3f3f5a]">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
      </div>

      {/* Node list */}
      <div className="max-h-80 overflow-y-auto">
        {filteredNodes ? (
          // Search results
          <div className="p-1">
            {filteredNodes.map(node => (
              <button
                key={node.type}
                onClick={() => {
                  onAddNode(node.type);
                  onClose();
                }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[node.category] }}
                />
                <span>{node.icon} {node.title}</span>
              </button>
            ))}
            {filteredNodes.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No nodes found
              </div>
            )}
          </div>
        ) : (
          // Category view
          <div>
            {getCategories().map(category => (
              <div key={category}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  <span className="capitalize">{category}</span>
                  <span className="ml-auto text-gray-500">
                    {expandedCategory === category ? '−' : '+'}
                  </span>
                </button>
                {expandedCategory === category && (
                  <div className="pb-1">
                    {getNodesByCategory(category).map(node => (
                      <button
                        key={node.type}
                        onClick={() => {
                          onAddNode(node.type);
                          onClose();
                        }}
                        className="w-full px-6 py-1.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                      >
                        {node.icon} {node.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NodeCanvas({ graph, onGraphChange, onNodeSelect, selectedNodeId }: NodeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState(graph.viewport);
  const [showPalette, setShowPalette] = useState(false);
  const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
  const [connectingPort, setConnectingPort] = useState<{
    nodeId: string;
    portId: string;
    isOutput: boolean;
    portType: PortType;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      // Deselect on background click
      onNodeSelect?.(null);
      setConnectingPort(null);
    }
  }, [onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanStart({ x: e.clientX, y: e.clientY });
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(viewport.zoom * delta, 0.25), 2);

    // Zoom toward mouse position
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = (mx - viewport.x) / viewport.zoom;
      const wy = (my - viewport.y) / viewport.zoom;

      setViewport({
        x: mx - wx * newZoom,
        y: my - wy * newZoom,
        zoom: newZoom,
      });
    }
  }, [viewport]);

  // Context menu for adding nodes
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setPalettePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowPalette(true);
    }
  }, []);

  // Add a new node
  const handleAddNode = useCallback((type: string) => {
    const definition = NODE_LIBRARY[type];
    if (!definition) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert palette position to world coordinates
    const worldX = (palettePosition.x - viewport.x) / viewport.zoom;
    const worldY = (palettePosition.y - viewport.y) / viewport.zoom;

    const newNode: NodeInstance = {
      id: `node_${Date.now()}`,
      type,
      position: { x: worldX, y: worldY },
      data: {},
    };

    onGraphChange({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });

    onNodeSelect?.(newNode.id);
  }, [graph, onGraphChange, onNodeSelect, palettePosition, viewport]);

  // Handle node drag
  const handleNodeDrag = useCallback((nodeId: string, dx: number, dy: number) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map(n =>
        n.id === nodeId
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n
      ),
    });
  }, [graph, onGraphChange]);

  // Handle port click for connections
  const handlePortClick = useCallback((nodeId: string, portId: string, isOutput: boolean, portType: PortType) => {
    if (!connectingPort) {
      // Start connection
      setConnectingPort({ nodeId, portId, isOutput, portType });
    } else {
      // Complete connection
      if (connectingPort.nodeId === nodeId) {
        // Can't connect to same node
        setConnectingPort(null);
        return;
      }

      if (connectingPort.isOutput === isOutput) {
        // Can't connect output to output or input to input
        setConnectingPort(null);
        return;
      }

      // Create connection (always from output to input)
      const fromNodeId = connectingPort.isOutput ? connectingPort.nodeId : nodeId;
      const fromPortId = connectingPort.isOutput ? connectingPort.portId : portId;
      const toNodeId = connectingPort.isOutput ? nodeId : connectingPort.nodeId;
      const toPortId = connectingPort.isOutput ? portId : connectingPort.portId;

      const newConnection: Connection = {
        id: `conn_${Date.now()}`,
        fromNodeId,
        fromPortId,
        toNodeId,
        toPortId,
      };

      onGraphChange({
        ...graph,
        connections: [...graph.connections, newConnection],
      });

      setConnectingPort(null);
    }
  }, [connectingPort, graph, onGraphChange]);

  // Get port position for connection rendering
  const getPortPosition = useCallback((nodeId: string, portId: string, isOutput: boolean) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const definition = NODE_LIBRARY[node.type];
    if (!definition) return null;

    const ports = isOutput ? definition.outputs : definition.inputs;
    const portIndex = ports.findIndex(p => p.id === portId);
    if (portIndex === -1) return null;

    const nodeWidth = 180;
    const headerHeight = 32;
    const portHeight = 24;
    const y = headerHeight + 12 + portIndex * portHeight;

    return {
      x: node.position.x + (isOutput ? nodeWidth : 0),
      y: node.position.y + y,
    };
  }, [graph.nodes]);

  // Delete selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        onGraphChange({
          ...graph,
          nodes: graph.nodes.filter(n => n.id !== selectedNodeId),
          connections: graph.connections.filter(
            c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
          ),
        });
        onNodeSelect?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, graph, onGraphChange, onNodeSelect]);

  // Sync viewport changes back to graph
  useEffect(() => {
    onGraphChange({ ...graph, viewport });
  }, [viewport]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0f0f1a]">
      {/* Grid background */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <defs>
          <pattern
            id="grid"
            width={20 * viewport.zoom}
            height={20 * viewport.zoom}
            patternUnits="userSpaceOnUse"
            x={viewport.x % (20 * viewport.zoom)}
            y={viewport.y % (20 * viewport.zoom)}
          >
            <circle cx={1} cy={1} r={1} fill="#2a2a3e" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Transform group for pan/zoom */}
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {/* Connections */}
          {graph.connections.map(conn => {
            const fromPos = getPortPosition(conn.fromNodeId, conn.fromPortId, true);
            const toPos = getPortPosition(conn.toNodeId, conn.toPortId, false);
            if (!fromPos || !toPos) return null;

            const fromNode = graph.nodes.find(n => n.id === conn.fromNodeId);
            const definition = fromNode ? NODE_LIBRARY[fromNode.type] : null;
            const port = definition?.outputs.find(p => p.id === conn.fromPortId);

            return (
              <ConnectionWire
                key={conn.id}
                fromX={fromPos.x}
                fromY={fromPos.y}
                toX={toPos.x}
                toY={toPos.y}
                portType={port?.type || 'any'}
              />
            );
          })}

          {/* Pending connection */}
          {connectingPort && (
            <ConnectionWire
              fromX={(() => {
                const pos = getPortPosition(connectingPort.nodeId, connectingPort.portId, connectingPort.isOutput);
                return pos?.x || 0;
              })()}
              fromY={(() => {
                const pos = getPortPosition(connectingPort.nodeId, connectingPort.portId, connectingPort.isOutput);
                return pos?.y || 0;
              })()}
              toX={(mousePos.x - viewport.x) / viewport.zoom}
              toY={(mousePos.y - viewport.y) / viewport.zoom}
              portType={connectingPort.portType}
            />
          )}

          {/* Nodes */}
          {graph.nodes.map(node => {
            const definition = NODE_LIBRARY[node.type];
            if (!definition) return null;

            return (
              <NodeComponent
                key={node.id}
                node={node}
                definition={definition}
                selected={node.id === selectedNodeId}
                onSelect={() => onNodeSelect?.(node.id)}
                onDrag={(dx, dy) => handleNodeDrag(node.id, dx, dy)}
                onPortClick={handlePortClick}
                connectingPort={connectingPort}
                zoom={viewport.zoom}
              />
            );
          })}
        </g>
      </svg>

      {/* Node palette */}
      {showPalette && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPalette(false)}
          />
          <NodePalette
            position={palettePosition}
            onAddNode={handleAddNode}
            onClose={() => setShowPalette(false)}
          />
        </>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 rounded text-xs text-gray-400">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500">
        Right-click to add nodes • Alt+drag or middle-click to pan • Scroll to zoom
      </div>
    </div>
  );
}
