// State Machine Canvas - Visual canvas for FSM states and transitions

import { useRef, useState, useCallback, useEffect } from 'react';
import type { StateMachine, State, Transition } from '../../types/StateMachine';
import { STATE_COLORS } from '../../types/StateMachine';

interface StateMachineCanvasProps {
  machine: StateMachine;
  onMachineChange: (machine: StateMachine) => void;
  onStateSelect: (stateId: string | null) => void;
  onTransitionSelect: (transitionId: string | null) => void;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
}

export default function StateMachineCanvas({
  machine,
  onMachineChange,
  onStateSelect,
  onTransitionSelect,
  selectedStateId,
  selectedTransitionId
}: StateMachineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(machine.viewport);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedStateId, setDraggedStateId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update viewport in machine
  useEffect(() => {
    if (viewport !== machine.viewport) {
      onMachineChange({ ...machine, viewport });
    }
  }, [viewport]);

  // Handle canvas pan
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.target === canvasRef.current) {
      onStateSelect(null);
      onTransitionSelect(null);
      setConnectingFromId(null);
    }
  }, [onStateSelect, onTransitionSelect]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (draggedStateId) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      onMachineChange({
        ...machine,
        states: machine.states.map(s =>
          s.id === draggedStateId
            ? { ...s, position: { x: s.position.x + dx, y: s.position.y + dy } }
            : s
        ),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, draggedStateId, viewport.zoom, machine, onMachineChange]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedStateId(null);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(2, viewport.zoom * zoomFactor));
    setViewport(v => ({ ...v, zoom: newZoom }));
  }, [viewport.zoom]);

  // Handle state drag start
  const handleStateMouseDown = useCallback((e: React.MouseEvent, stateId: string) => {
    e.stopPropagation();
    setDraggedStateId(stateId);
    setDragStart({ x: e.clientX, y: e.clientY });
    onStateSelect(stateId);
    onTransitionSelect(null);
  }, [onStateSelect, onTransitionSelect]);

  // Handle connecting states
  const handleConnectStart = useCallback((stateId: string) => {
    setConnectingFromId(stateId);
  }, []);

  const handleConnectEnd = useCallback((stateId: string) => {
    if (!connectingFromId || connectingFromId === stateId) {
      setConnectingFromId(null);
      return;
    }

    // Check if transition already exists
    const exists = machine.transitions.some(
      t => t.fromStateId === connectingFromId && t.toStateId === stateId
    );
    if (exists) {
      setConnectingFromId(null);
      return;
    }

    const newTransition: Transition = {
      id: `trans_${Date.now()}`,
      fromStateId: connectingFromId,
      toStateId: stateId,
      conditions: [],
      conditionMode: 'all',
      priority: 0,
    };

    onMachineChange({
      ...machine,
      transitions: [...machine.transitions, newTransition],
    });
    setConnectingFromId(null);
  }, [connectingFromId, machine, onMachineChange]);

  // Handle transition click
  const handleTransitionClick = useCallback((transitionId: string) => {
    onTransitionSelect(transitionId);
    onStateSelect(null);
  }, [onTransitionSelect, onStateSelect]);

  // Delete transition
  const handleTransitionDelete = useCallback((transitionId: string) => {
    onMachineChange({
      ...machine,
      transitions: machine.transitions.filter(t => t.id !== transitionId),
    });
    onTransitionSelect(null);
  }, [machine, onMachineChange, onTransitionSelect]);

  // Get state center position
  const getStateCenter = (state: State): { x: number; y: number } => ({
    x: state.position.x + 70,
    y: state.position.y + 25,
  });

  // Calculate bezier curve for transition
  const getTransitionPath = (from: State, to: State): string => {
    const fromCenter = getStateCenter(from);
    const toCenter = getStateCenter(to);

    // Check for bidirectional transitions
    const hasReverse = machine.transitions.some(
      t => t.fromStateId === to.id && t.toStateId === from.id
    );

    // Offset for bidirectional
    const offsetAmount = hasReverse ? 20 : 0;
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * offsetAmount;
    const ny = dx / len * offsetAmount;

    const adjustedFrom = { x: fromCenter.x + nx, y: fromCenter.y + ny };
    const adjustedTo = { x: toCenter.x + nx, y: toCenter.y + ny };

    // Calculate control points for curved line
    const midX = (adjustedFrom.x + adjustedTo.x) / 2;
    const midY = (adjustedFrom.y + adjustedTo.y) / 2;
    const cpOffset = 30;
    const cpX = midX + nx * 2;
    const cpY = midY + ny * 2;

    // Self-loop
    if (from.id === to.id) {
      return `M ${fromCenter.x - 50} ${fromCenter.y}
              C ${fromCenter.x - 80} ${fromCenter.y - 60},
                ${fromCenter.x + 80} ${fromCenter.y - 60},
                ${fromCenter.x + 50} ${fromCenter.y}`;
    }

    return `M ${adjustedFrom.x} ${adjustedFrom.y} Q ${cpX} ${cpY} ${adjustedTo.x} ${adjustedTo.y}`;
  };

  // Render transition
  const renderTransition = (transition: Transition) => {
    const fromState = machine.states.find(s => s.id === transition.fromStateId);
    const toState = machine.states.find(s => s.id === transition.toStateId);
    if (!fromState || !toState) return null;

    const path = getTransitionPath(fromState, toState);
    const isSelected = selectedTransitionId === transition.id;
    const color = fromState.color || STATE_COLORS.default;

    return (
      <g key={transition.id}>
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth={15}
          fill="none"
          className="cursor-pointer"
          onClick={() => handleTransitionClick(transition.id)}
        />
        {/* Visible path */}
        <path
          d={path}
          stroke={isSelected ? '#22c55e' : color}
          strokeWidth={isSelected ? 3 : 2}
          fill="none"
          markerEnd={`url(#arrow-${isSelected ? 'selected' : 'normal'})`}
          className="cursor-pointer transition-colors"
          onClick={() => handleTransitionClick(transition.id)}
        />
        {/* Condition count badge */}
        {transition.conditions.length > 0 && (
          <g>
            <circle
              cx={(getStateCenter(fromState).x + getStateCenter(toState).x) / 2}
              cy={(getStateCenter(fromState).y + getStateCenter(toState).y) / 2 - 10}
              r={10}
              fill="#2a2a3e"
              stroke={color}
              strokeWidth={1}
            />
            <text
              x={(getStateCenter(fromState).x + getStateCenter(toState).x) / 2}
              y={(getStateCenter(fromState).y + getStateCenter(toState).y) / 2 - 6}
              textAnchor="middle"
              fill="white"
              fontSize={10}
            >
              {transition.conditions.length}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render connecting line (while dragging)
  const renderConnectingLine = () => {
    if (!connectingFromId) return null;

    const fromState = machine.states.find(s => s.id === connectingFromId);
    if (!fromState) return null;

    const from = getStateCenter(fromState);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const toX = (mousePos.x - canvasRect.left - viewport.x) / viewport.zoom;
    const toY = (mousePos.y - canvasRect.top - viewport.y) / viewport.zoom;

    return (
      <path
        d={`M ${from.x} ${from.y} L ${toX} ${toY}`}
        stroke="#22c55e"
        strokeWidth={2}
        strokeDasharray="5,5"
        fill="none"
        className="opacity-50"
        markerEnd="url(#arrow-selected)"
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
            linear-gradient(rgba(34, 197, 94, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.05) 1px, transparent 1px)
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
        {/* SVG for transitions */}
        <svg className="absolute inset-0 w-[10000px] h-[10000px] overflow-visible pointer-events-none" style={{ left: -5000, top: -5000 }}>
          <defs>
            <marker id="arrow-normal" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#888" />
            </marker>
            <marker id="arrow-selected" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
          </defs>
          <g transform="translate(5000, 5000)" className="pointer-events-auto">
            {machine.transitions.map(renderTransition)}
            {renderConnectingLine()}
          </g>
        </svg>

        {/* States */}
        {machine.states.map(state => (
          <StateNode
            key={state.id}
            state={state}
            isSelected={selectedStateId === state.id}
            isConnecting={connectingFromId !== null}
            canConnect={connectingFromId !== null && connectingFromId !== state.id}
            onMouseDown={(e) => handleStateMouseDown(e, state.id)}
            onConnectStart={() => handleConnectStart(state.id)}
            onConnectEnd={() => handleConnectEnd(state.id)}
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
        <div>Drag from circle to connect states</div>
      </div>
    </div>
  );
}

// Individual state node component
function StateNode({
  state,
  isSelected,
  isConnecting,
  canConnect,
  onMouseDown,
  onConnectStart,
  onConnectEnd
}: {
  state: State;
  isSelected: boolean;
  isConnecting: boolean;
  canConnect: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectStart: () => void;
  onConnectEnd: () => void;
}) {
  const color = state.color || STATE_COLORS.default;

  return (
    <div
      className={`absolute rounded-lg shadow-xl overflow-visible ${
        isSelected ? 'ring-2 ring-green-500' : ''
      }`}
      style={{
        left: state.position.x,
        top: state.position.y,
        width: 140,
      }}
    >
      {/* Connect drop zone (top) */}
      {canConnect && (
        <button
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-6 bg-green-500 rounded-t-lg opacity-80 hover:opacity-100 flex items-center justify-center z-10"
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

      {/* Initial state indicator */}
      {state.isInitial && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Main node content */}
      <div
        className="rounded-lg cursor-move"
        style={{
          backgroundColor: '#1a1a28',
          border: `2px solid ${color}`,
        }}
        onMouseDown={onMouseDown}
      >
        {/* Header */}
        <div
          className="px-3 py-2 text-center rounded-lg"
          style={{
            backgroundColor: color + '20',
          }}
        >
          <span className="text-sm font-medium text-white">{state.name}</span>
        </div>
      </div>

      {/* Connect handle (right) */}
      {!isConnecting && (
        <button
          className="absolute top-1/2 -right-4 -translate-y-1/2 w-4 h-4 bg-[#2a2a3e] hover:bg-green-500 border-2 border-[#3f3f5a] hover:border-green-400 rounded-full z-10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onConnectStart();
          }}
          title="Drag to create transition"
        />
      )}
    </div>
  );
}
