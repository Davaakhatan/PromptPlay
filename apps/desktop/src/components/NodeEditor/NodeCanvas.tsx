import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { NodeGraph, NodeInstance, Connection, NodeDefinition, PortType, NodeGroup, NodeComment } from '../../types/NodeEditor';
import { NODE_LIBRARY, getNodesByCategory, getCategories } from '../../services/NodeLibrary';
import { PORT_COLORS, CATEGORY_COLORS } from '../../types/NodeEditor';

// Predefined group colors
const GROUP_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

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
        const canConnect = connectingPort &&
          connectingPort.isOutput &&
          connectingPort.nodeId !== node.id &&
          (connectingPort.portType === port.type || connectingPort.portType === 'any' || port.type === 'any');

        return (
          <g key={`in-${port.id}`}>
            {/* Larger invisible hit area */}
            <circle
              cx={0}
              cy={y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onPortClick(node.id, port.id, false, port.type);
              }}
            />
            {/* Port circle */}
            <circle
              cx={0}
              cy={y}
              r={6}
              fill={isConnecting || canConnect ? portColor : '#1e1e2e'}
              stroke={portColor}
              strokeWidth={2}
              className="pointer-events-none"
              style={{ filter: canConnect ? 'drop-shadow(0 0 4px ' + portColor + ')' : 'none' }}
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
        const canConnect = connectingPort &&
          !connectingPort.isOutput &&
          connectingPort.nodeId !== node.id &&
          (connectingPort.portType === port.type || connectingPort.portType === 'any' || port.type === 'any');

        return (
          <g key={`out-${port.id}`}>
            {/* Larger invisible hit area */}
            <circle
              cx={nodeWidth}
              cy={y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onPortClick(node.id, port.id, true, port.type);
              }}
            />
            {/* Port circle */}
            <circle
              cx={nodeWidth}
              cy={y}
              r={6}
              fill={isConnecting || canConnect ? portColor : '#1e1e2e'}
              stroke={portColor}
              strokeWidth={2}
              className="pointer-events-none"
              style={{ filter: canConnect ? 'drop-shadow(0 0 4px ' + portColor + ')' : 'none' }}
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

// Node Group component - visual container for nodes
function NodeGroupComponent({
  group,
  selected,
  onSelect,
  onDrag,
  onResize,
  onNameChange,
  zoom,
}: {
  group: NodeGroup;
  selected: boolean;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
  onResize: (dw: number, dh: number) => void;
  onNameChange: (name: string) => void;
  zoom: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      dragStart.current = { x: e.clientX, y: e.clientY };

      if (isDragging) {
        onDrag(dx, dy);
      } else if (isResizing) {
        onResize(dx, dy);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, onDrag, onResize, zoom]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <g transform={`translate(${group.position.x}, ${group.position.y})`}>
      {/* Group background */}
      <rect
        x={0}
        y={0}
        width={group.size.width}
        height={group.size.height}
        rx={12}
        fill={group.color + '15'}
        stroke={selected ? '#60a5fa' : group.color + '40'}
        strokeWidth={selected ? 2 : 1}
        strokeDasharray={selected ? 'none' : '4 4'}
        className="cursor-move"
        onMouseDown={handleMouseDown}
      />

      {/* Group header */}
      <rect
        x={0}
        y={0}
        width={group.size.width}
        height={28}
        rx={12}
        fill={group.color + '30'}
        className="cursor-move"
        onMouseDown={handleMouseDown}
      />
      <rect
        x={0}
        y={20}
        width={group.size.width}
        height={8}
        fill={group.color + '30'}
      />

      {/* Group name */}
      {isEditing ? (
        <foreignObject x={8} y={4} width={group.size.width - 16} height={24}>
          <input
            ref={inputRef}
            type="text"
            defaultValue={group.name}
            className="w-full px-1 py-0 bg-black/50 border-none text-white text-sm font-medium focus:outline-none"
            onBlur={(e) => {
              onNameChange(e.target.value);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNameChange((e.target as HTMLInputElement).value);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={12}
          y={18}
          fill="white"
          fontSize={12}
          fontWeight={600}
          className="pointer-events-none select-none"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {group.name}
        </text>
      )}

      {/* Resize handle */}
      <rect
        x={group.size.width - 16}
        y={group.size.height - 16}
        width={16}
        height={16}
        fill="transparent"
        className="cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
      />
      <path
        d={`M ${group.size.width - 12} ${group.size.height - 4} L ${group.size.width - 4} ${group.size.height - 12} M ${group.size.width - 8} ${group.size.height - 4} L ${group.size.width - 4} ${group.size.height - 8}`}
        stroke={group.color + '60'}
        strokeWidth={2}
        strokeLinecap="round"
        className="pointer-events-none"
      />
    </g>
  );
}

// Node Comment component - text notes on the canvas
function NodeCommentComponent({
  comment,
  selected,
  onSelect,
  onDrag,
  onTextChange,
  zoom,
}: {
  comment: NodeComment;
  selected: boolean;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
  onTextChange: (text: string) => void;
  zoom: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    if (!isEditing) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      dragStart.current = { x: e.clientX, y: e.clientY };
      onDrag(dx, dy);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag, zoom]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const bgColor = comment.color || '#fef08a';

  return (
    <g transform={`translate(${comment.position.x}, ${comment.position.y})`}>
      <rect
        x={0}
        y={0}
        width={comment.size.width}
        height={comment.size.height}
        rx={4}
        fill={bgColor}
        stroke={selected ? '#60a5fa' : bgColor}
        strokeWidth={selected ? 2 : 1}
        className="cursor-move"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setIsEditing(true)}
      />

      {isEditing ? (
        <foreignObject x={4} y={4} width={comment.size.width - 8} height={comment.size.height - 8}>
          <textarea
            ref={textareaRef}
            defaultValue={comment.text}
            className="w-full h-full resize-none bg-transparent border-none text-gray-800 text-sm focus:outline-none"
            style={{ fontSize: comment.fontSize || 12 }}
            onBlur={(e) => {
              onTextChange(e.target.value);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
          />
        </foreignObject>
      ) : (
        <foreignObject x={4} y={4} width={comment.size.width - 8} height={comment.size.height - 8}>
          <div
            className="text-gray-800 text-sm whitespace-pre-wrap overflow-hidden pointer-events-none"
            style={{ fontSize: comment.fontSize || 12 }}
          >
            {comment.text}
          </div>
        </foreignObject>
      )}
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 });
  const [boxSelectEnd, setBoxSelectEnd] = useState({ x: 0, y: 0 });

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

  // Check if two port types are compatible
  const areTypesCompatible = (type1: PortType, type2: PortType): boolean => {
    if (type1 === type2) return true;
    if (type1 === 'any' || type2 === 'any') return true;
    return false;
  };

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

      // Check type compatibility
      if (!areTypesCompatible(connectingPort.portType, portType)) {
        console.log(`Cannot connect: ${connectingPort.portType} is not compatible with ${portType}`);
        setConnectingPort(null);
        return;
      }

      // Create connection (always from output to input)
      const fromNodeId = connectingPort.isOutput ? connectingPort.nodeId : nodeId;
      const fromPortId = connectingPort.isOutput ? connectingPort.portId : portId;
      const toNodeId = connectingPort.isOutput ? nodeId : connectingPort.nodeId;
      const toPortId = connectingPort.isOutput ? portId : connectingPort.portId;

      // Remove existing connection to this input (only one connection per input)
      const filteredConnections = graph.connections.filter(
        c => !(c.toNodeId === toNodeId && c.toPortId === toPortId)
      );

      const newConnection: Connection = {
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

  // Create a group from selected nodes
  const createGroupFromSelection = useCallback(() => {
    const nodeIds = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : selectedNodeId ? [selectedNodeId] : [];
    if (nodeIds.length === 0) return;

    const selectedNodes = graph.nodes.filter(n => nodeIds.includes(n.id));
    if (selectedNodes.length === 0) return;

    // Calculate bounding box with padding
    const padding = 40;
    const nodeWidth = 180;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedNodes.forEach(node => {
      const definition = NODE_LIBRARY[node.type];
      const maxPorts = definition ? Math.max(definition.inputs.length, definition.outputs.length) : 1;
      const nodeHeight = 32 + maxPorts * 24 + 12;

      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    const newGroup: NodeGroup = {
      id: `group_${Date.now()}`,
      name: 'New Group',
      color: GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)],
      position: { x: minX - padding, y: minY - padding - 28 },
      size: { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 + 28 },
      nodeIds,
    };

    onGraphChange({
      ...graph,
      groups: [...(graph.groups || []), newGroup],
    });

    setSelectedGroupId(newGroup.id);
    setSelectedNodeIds(new Set());
    onNodeSelect?.(null);
  }, [selectedNodeIds, selectedNodeId, graph, onGraphChange, onNodeSelect]);

  // Add a comment
  const addComment = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const worldX = (palettePosition.x - viewport.x) / viewport.zoom || viewport.x / viewport.zoom + 100;
    const worldY = (palettePosition.y - viewport.y) / viewport.zoom || viewport.y / viewport.zoom + 100;

    const newComment: NodeComment = {
      id: `comment_${Date.now()}`,
      text: 'Double-click to edit',
      position: { x: worldX, y: worldY },
      size: { width: 200, height: 80 },
    };

    onGraphChange({
      ...graph,
      comments: [...(graph.comments || []), newComment],
    });

    setSelectedCommentId(newComment.id);
  }, [graph, onGraphChange, palettePosition, viewport]);

  // Handle group drag (moves all nodes in group)
  const handleGroupDrag = useCallback((groupId: string, dx: number, dy: number) => {
    const group = graph.groups?.find(g => g.id === groupId);
    if (!group) return;

    onGraphChange({
      ...graph,
      groups: graph.groups?.map(g =>
        g.id === groupId
          ? { ...g, position: { x: g.position.x + dx, y: g.position.y + dy } }
          : g
      ),
      nodes: graph.nodes.map(n =>
        group.nodeIds.includes(n.id)
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n
      ),
    });
  }, [graph, onGraphChange]);

  // Handle group resize
  const handleGroupResize = useCallback((groupId: string, dw: number, dh: number) => {
    onGraphChange({
      ...graph,
      groups: graph.groups?.map(g =>
        g.id === groupId
          ? {
              ...g,
              size: {
                width: Math.max(100, g.size.width + dw),
                height: Math.max(60, g.size.height + dh),
              },
            }
          : g
      ),
    });
  }, [graph, onGraphChange]);

  // Handle group name change
  const handleGroupNameChange = useCallback((groupId: string, name: string) => {
    onGraphChange({
      ...graph,
      groups: graph.groups?.map(g =>
        g.id === groupId ? { ...g, name } : g
      ),
    });
  }, [graph, onGraphChange]);

  // Handle comment drag
  const handleCommentDrag = useCallback((commentId: string, dx: number, dy: number) => {
    onGraphChange({
      ...graph,
      comments: graph.comments?.map(c =>
        c.id === commentId
          ? { ...c, position: { x: c.position.x + dx, y: c.position.y + dy } }
          : c
      ),
    });
  }, [graph, onGraphChange]);

  // Handle comment text change
  const handleCommentTextChange = useCallback((commentId: string, text: string) => {
    onGraphChange({
      ...graph,
      comments: graph.comments?.map(c =>
        c.id === commentId ? { ...c, text } : c
      ),
    });
  }, [graph, onGraphChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // ESC to cancel connection
      if (e.key === 'Escape') {
        setConnectingPort(null);
        setShowPalette(false);
        setIsBoxSelecting(false);
      }

      // Ctrl+G to create group
      if (modKey && e.key === 'g') {
        e.preventDefault();
        createGroupFromSelection();
      }

      // Ctrl+M to add comment
      if (modKey && e.key === 'm') {
        e.preventDefault();
        addComment();
      }

      // Delete selected node/group/comment
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGroupId) {
          onGraphChange({
            ...graph,
            groups: graph.groups?.filter(g => g.id !== selectedGroupId),
          });
          setSelectedGroupId(null);
        } else if (selectedCommentId) {
          onGraphChange({
            ...graph,
            comments: graph.comments?.filter(c => c.id !== selectedCommentId),
          });
          setSelectedCommentId(null);
        } else if (selectedNodeId) {
          // Also remove from any groups
          onGraphChange({
            ...graph,
            nodes: graph.nodes.filter(n => n.id !== selectedNodeId),
            connections: graph.connections.filter(
              c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
            ),
            groups: graph.groups?.map(g => ({
              ...g,
              nodeIds: g.nodeIds.filter(id => id !== selectedNodeId),
            })),
          });
          onNodeSelect?.(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedGroupId, selectedCommentId, selectedNodeIds, graph, onGraphChange, onNodeSelect, createGroupFromSelection, addComment]);

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
          {/* Groups (rendered first, behind everything) */}
          {graph.groups?.map(group => (
            <NodeGroupComponent
              key={group.id}
              group={group}
              selected={group.id === selectedGroupId}
              onSelect={() => {
                setSelectedGroupId(group.id);
                setSelectedCommentId(null);
                onNodeSelect?.(null);
              }}
              onDrag={(dx, dy) => handleGroupDrag(group.id, dx, dy)}
              onResize={(dw, dh) => handleGroupResize(group.id, dw, dh)}
              onNameChange={(name) => handleGroupNameChange(group.id, name)}
              zoom={viewport.zoom}
            />
          ))}

          {/* Comments (rendered behind nodes but above groups) */}
          {graph.comments?.map(comment => (
            <NodeCommentComponent
              key={comment.id}
              comment={comment}
              selected={comment.id === selectedCommentId}
              onSelect={() => {
                setSelectedCommentId(comment.id);
                setSelectedGroupId(null);
                onNodeSelect?.(null);
              }}
              onDrag={(dx, dy) => handleCommentDrag(comment.id, dx, dy)}
              onTextChange={(text) => handleCommentTextChange(comment.id, text)}
              zoom={viewport.zoom}
            />
          ))}

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
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 space-y-0.5">
        <div>Right-click to add nodes • Delete/Backspace to remove selected</div>
        <div>Click port → Click another port to connect (matching colors only)</div>
        <div>Alt+drag or middle-click to pan • Scroll to zoom</div>
        <div>Ctrl+G to group selected • Ctrl+M to add comment</div>
      </div>

      {/* Connection hint */}
      {connectingPort && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 rounded-lg text-sm text-white">
          Click a {connectingPort.isOutput ? 'input' : 'output'} port with matching color to connect
          <span className="ml-2 text-gray-400">(ESC to cancel)</span>
        </div>
      )}
    </div>
  );
}
