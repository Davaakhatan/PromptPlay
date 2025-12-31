import { useEffect, useRef, useState, useCallback } from 'react';
import { Runtime2D } from '@promptplay/runtime-2d';
import type { GameSpec } from '@promptplay/shared-types';
import { GridIcon, DebugIcon, MoveIcon, RotateIcon, ScaleIcon, ZoomInIcon, ZoomOutIcon, FitAllIcon } from './Icons';

interface GameCanvasProps {
  gameSpec: GameSpec | null;
  isPlaying: boolean;
  selectedEntity: string | null;
  onEntitySelect?: (entityName: string | null) => void;
  onReset?: () => void;
  onUpdateEntity?: (entityName: string, updates: any) => void;
  gridEnabled?: boolean;
  gridSize?: number;
}

type TransformMode = 'move' | 'rotate' | 'scale';
type HandleType = 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'rotate' | 'move';

interface DragState {
  isDragging: boolean;
  entityName: string | null;
  startX: number;
  startY: number;
  entityStartX: number;
  entityStartY: number;
  entityStartWidth: number;
  entityStartHeight: number;
  entityStartRotation: number;
  entityStartScaleX: number;
  entityStartScaleY: number;
  handleType: HandleType;
}

export default function GameCanvas({
  gameSpec,
  isPlaying,
  selectedEntity,
  onEntitySelect,
  onReset,
  onUpdateEntity,
  gridEnabled = false,
  gridSize = 16,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(gridEnabled);
  const [transformMode, setTransformMode] = useState<TransformMode>('move');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Drag state for repositioning/rotating/scaling entities
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    entityName: null,
    startX: 0,
    startY: 0,
    entityStartX: 0,
    entityStartY: 0,
    entityStartWidth: 0,
    entityStartHeight: 0,
    entityStartRotation: 0,
    entityStartScaleX: 1,
    entityStartScaleY: 1,
    handleType: 'none',
  });

  // Track current drag values for visual feedback
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragRotation, setDragRotation] = useState<number | null>(null);
  const [dragScale, setDragScale] = useState<{ scaleX: number; scaleY: number } | null>(null);

  // Helper to get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Snap to grid if enabled
  const snapToGrid = useCallback((value: number) => {
    if (!showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [showGrid, gridSize]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    if (runtimeRef.current) {
      try {
        const cameraSystem = runtimeRef.current.getCameraSystem?.();
        if (cameraSystem) {
          const currentZoom = cameraSystem.getCameraState().zoom;
          const newZoom = Math.min(currentZoom + 0.25, 3);
          runtimeRef.current.setZoom(newZoom);
          setZoomLevel(newZoom);
        }
      } catch {
        // Camera system not available, use fallback
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (runtimeRef.current) {
      try {
        const cameraSystem = runtimeRef.current.getCameraSystem?.();
        if (cameraSystem) {
          const currentZoom = cameraSystem.getCameraState().zoom;
          const newZoom = Math.max(currentZoom - 0.25, 0.25);
          runtimeRef.current.setZoom(newZoom);
          setZoomLevel(newZoom);
        }
      } catch {
        // Camera system not available, use fallback
        setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
      }
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (runtimeRef.current) {
      try {
        runtimeRef.current.setZoom?.(1);
        setZoomLevel(1);
      } catch {
        setZoomLevel(1);
      }
    }
  }, []);

  const handleFitAll = useCallback(() => {
    if (runtimeRef.current) {
      try {
        const result = runtimeRef.current.fitCameraToEntities?.();
        if (result) {
          setZoomLevel(result.zoom);
        }
      } catch (e) {
        console.warn('Failed to fit camera:', e);
      }
    }
  }, []);

  // Keyboard handler for debug toggle and other shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Transform mode shortcuts (only when not playing)
      if (!isPlaying) {
        if (e.key === 'w' || e.key === 'W') {
          setTransformMode('move');
        }
        if (e.key === 'e' || e.key === 'E') {
          setTransformMode('rotate');
        }
        if (e.key === 'r' || e.key === 'R') {
          setTransformMode('scale');
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (runtimeRef.current) {
          runtimeRef.current.toggleDebug();
          setDebugEnabled(prev => !prev);
        }
      }
      // Toggle grid with G key
      if (e.key === 'g' || e.key === 'G') {
        setShowGrid(prev => !prev);
      }
      // Zoom controls
      if (e.key === '=' || e.key === '+') {
        handleZoomIn();
      }
      if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
      // Fit all entities
      if (e.key === 'f' || e.key === 'F') {
        handleFitAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleZoomIn, handleZoomOut, handleFitAll]);

  // Initialize runtime when gameSpec changes
  useEffect(() => {
    if (!canvasRef.current || !gameSpec) return;

    let isMounted = true;

    const initRuntime = async () => {
      try {
        // Destroy previous runtime
        if (runtimeRef.current) {
          runtimeRef.current.destroy();
        }

        // Create new runtime
        const runtime = new Runtime2D(canvasRef.current!);
        await runtime.loadGameSpec(gameSpec);

        if (!isMounted) {
          runtime.destroy();
          return;
        }

        runtimeRef.current = runtime;
        setError(null);

        // Start if playing
        if (isPlaying) {
          runtime.start();
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
          console.error('Game loading error:', err);
        }
      }
    };

    initRuntime();

    return () => {
      isMounted = false;
      if (runtimeRef.current) {
        runtimeRef.current.destroy();
        runtimeRef.current = null;
      }
    };
  }, [gameSpec]);

  // Handle play/pause
  useEffect(() => {
    if (!runtimeRef.current) return;

    if (isPlaying) {
      runtimeRef.current.start();
    } else {
      runtimeRef.current.pause();
    }
  }, [isPlaying]);

  // Check if mouse is on a gizmo handle
  const getHandleAtPoint = useCallback((x: number, y: number, bounds: { x: number; y: number; width: number; height: number }): HandleType => {
    const handleSize = 8;
    const rotateHandleOffset = 25;

    const left = bounds.x - bounds.width / 2;
    const right = bounds.x + bounds.width / 2;
    const top = bounds.y - bounds.height / 2;
    const bottom = bounds.y + bounds.height / 2;
    const centerX = bounds.x;
    const centerY = bounds.y;

    // Check rotation handle (above the selection)
    if (transformMode === 'rotate') {
      const rotateHandleY = top - rotateHandleOffset;
      if (Math.abs(x - centerX) < handleSize && Math.abs(y - rotateHandleY) < handleSize) {
        return 'rotate';
      }
    }

    // Check corner handles (for scale)
    if (transformMode === 'scale') {
      if (Math.abs(x - left) < handleSize && Math.abs(y - top) < handleSize) return 'nw';
      if (Math.abs(x - right) < handleSize && Math.abs(y - top) < handleSize) return 'ne';
      if (Math.abs(x - left) < handleSize && Math.abs(y - bottom) < handleSize) return 'sw';
      if (Math.abs(x - right) < handleSize && Math.abs(y - bottom) < handleSize) return 'se';
      // Edge handles
      if (Math.abs(x - centerX) < handleSize && Math.abs(y - top) < handleSize) return 'n';
      if (Math.abs(x - centerX) < handleSize && Math.abs(y - bottom) < handleSize) return 's';
      if (Math.abs(x - left) < handleSize && Math.abs(y - centerY) < handleSize) return 'w';
      if (Math.abs(x - right) < handleSize && Math.abs(y - centerY) < handleSize) return 'e';
    }

    // Check if inside bounds (for move)
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return 'move';
    }

    return 'none';
  }, [transformMode]);

  // Handle mouse down - start drag if on entity and paused
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !runtimeRef.current) return;

      // Only allow dragging when paused
      if (isPlaying) return;

      const coords = getCanvasCoords(e);

      // Check if clicking on a gizmo handle for the selected entity
      if (selectedEntity) {
        const bounds = runtimeRef.current.getEntityBounds(selectedEntity);
        if (bounds) {
          const entity = gameSpec?.entities?.find(ent => ent.name === selectedEntity);
          const handleType = getHandleAtPoint(coords.x, coords.y, bounds);

          if (handleType !== 'none') {
            const transform = entity?.components?.transform;
            setDragState({
              isDragging: true,
              entityName: selectedEntity,
              startX: coords.x,
              startY: coords.y,
              entityStartX: bounds.x,
              entityStartY: bounds.y,
              entityStartWidth: bounds.width,
              entityStartHeight: bounds.height,
              entityStartRotation: transform?.rotation || 0,
              entityStartScaleX: transform?.scaleX || 1,
              entityStartScaleY: transform?.scaleY || 1,
              handleType,
            });
            setDragPosition({ x: bounds.x, y: bounds.y });
            setDragRotation(transform?.rotation || 0);
            setDragScale({ scaleX: transform?.scaleX || 1, scaleY: transform?.scaleY || 1 });
            return;
          }
        }
      }

      // Otherwise, check if clicking on any entity
      const entityName = runtimeRef.current.getEntityAtPoint(coords.x, coords.y);

      if (entityName) {
        const bounds = runtimeRef.current.getEntityBounds(entityName);
        const entity = gameSpec?.entities?.find(ent => ent.name === entityName);
        if (bounds) {
          const transform = entity?.components?.transform;
          setDragState({
            isDragging: true,
            entityName,
            startX: coords.x,
            startY: coords.y,
            entityStartX: bounds.x,
            entityStartY: bounds.y,
            entityStartWidth: bounds.width,
            entityStartHeight: bounds.height,
            entityStartRotation: transform?.rotation || 0,
            entityStartScaleX: transform?.scaleX || 1,
            entityStartScaleY: transform?.scaleY || 1,
            handleType: 'move',
          });
          setDragPosition({ x: bounds.x, y: bounds.y });
          setDragRotation(transform?.rotation || 0);
          setDragScale({ scaleX: transform?.scaleX || 1, scaleY: transform?.scaleY || 1 });
          onEntitySelect?.(entityName);
        }
      }
    },
    [isPlaying, getCanvasCoords, onEntitySelect, selectedEntity, getHandleAtPoint, gameSpec]
  );

  // Handle mouse move - update drag position/rotation/scale
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState.isDragging || !dragState.entityName) return;

      const coords = getCanvasCoords(e);
      const deltaX = coords.x - dragState.startX;
      const deltaY = coords.y - dragState.startY;

      if (dragState.handleType === 'move') {
        // Move operation
        const newX = snapToGrid(dragState.entityStartX + deltaX);
        const newY = snapToGrid(dragState.entityStartY + deltaY);
        setDragPosition({ x: newX, y: newY });
      } else if (dragState.handleType === 'rotate') {
        // Rotation operation
        const centerX = dragState.entityStartX;
        const centerY = dragState.entityStartY;

        // Calculate angle from center to current mouse position
        const startAngle = Math.atan2(
          dragState.startY - centerY,
          dragState.startX - centerX
        );
        const currentAngle = Math.atan2(
          coords.y - centerY,
          coords.x - centerX
        );

        // Calculate rotation delta in degrees
        let rotationDelta = ((currentAngle - startAngle) * 180) / Math.PI;

        // Snap to 15 degree increments if grid is enabled
        if (showGrid) {
          rotationDelta = Math.round(rotationDelta / 15) * 15;
        }

        const newRotation = dragState.entityStartRotation + rotationDelta;
        setDragRotation(newRotation);
      } else {
        // Scale operation
        let newScaleX = dragState.entityStartScaleX;
        let newScaleY = dragState.entityStartScaleY;

        // Calculate scale based on which handle is being dragged
        const scaleFactorX = dragState.entityStartWidth > 0
          ? (dragState.entityStartWidth + deltaX * 2) / dragState.entityStartWidth
          : 1;
        const scaleFactorY = dragState.entityStartHeight > 0
          ? (dragState.entityStartHeight + deltaY * 2) / dragState.entityStartHeight
          : 1;

        switch (dragState.handleType) {
          case 'se':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * scaleFactorX);
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * scaleFactorY);
            break;
          case 'nw':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * (2 - scaleFactorX));
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * (2 - scaleFactorY));
            break;
          case 'ne':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * scaleFactorX);
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * (2 - scaleFactorY));
            break;
          case 'sw':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * (2 - scaleFactorX));
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * scaleFactorY);
            break;
          case 'n':
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * (2 - scaleFactorY));
            break;
          case 's':
            newScaleY = Math.max(0.1, dragState.entityStartScaleY * scaleFactorY);
            break;
          case 'w':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * (2 - scaleFactorX));
            break;
          case 'e':
            newScaleX = Math.max(0.1, dragState.entityStartScaleX * scaleFactorX);
            break;
        }

        // Snap scale to 0.1 increments if grid enabled
        if (showGrid) {
          newScaleX = Math.round(newScaleX * 10) / 10;
          newScaleY = Math.round(newScaleY * 10) / 10;
        }

        setDragScale({ scaleX: newScaleX, scaleY: newScaleY });
      }
    },
    [dragState, getCanvasCoords, snapToGrid, showGrid]
  );

  // Handle mouse up - finish drag and persist changes
  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.entityName) {
      setDragState({
        isDragging: false,
        entityName: null,
        startX: 0,
        startY: 0,
        entityStartX: 0,
        entityStartY: 0,
        entityStartWidth: 0,
        entityStartHeight: 0,
        entityStartRotation: 0,
        entityStartScaleX: 1,
        entityStartScaleY: 1,
        handleType: 'none',
      });
      setDragPosition(null);
      setDragRotation(null);
      setDragScale(null);
      return;
    }

    // Find the entity in gameSpec and update it
    if (onUpdateEntity && gameSpec) {
      const entity = gameSpec.entities?.find(e => e.name === dragState.entityName);
      if (entity?.components?.transform) {
        const updatedTransform = { ...entity.components.transform };

        // Apply changes based on handle type
        if (dragState.handleType === 'move' && dragPosition) {
          updatedTransform.x = dragPosition.x;
          updatedTransform.y = dragPosition.y;
        } else if (dragState.handleType === 'rotate' && dragRotation !== null) {
          updatedTransform.rotation = dragRotation;
        } else if (dragScale) {
          updatedTransform.scaleX = dragScale.scaleX;
          updatedTransform.scaleY = dragScale.scaleY;
        }

        const updatedComponents = {
          ...entity.components,
          transform: updatedTransform,
        };
        onUpdateEntity(dragState.entityName, { components: updatedComponents });
      }
    }

    setDragState({
      isDragging: false,
      entityName: null,
      startX: 0,
      startY: 0,
      entityStartX: 0,
      entityStartY: 0,
      entityStartWidth: 0,
      entityStartHeight: 0,
      entityStartRotation: 0,
      entityStartScaleX: 1,
      entityStartScaleY: 1,
      handleType: 'none',
    });
    setDragPosition(null);
    setDragRotation(null);
    setDragScale(null);
  }, [dragState, dragPosition, dragRotation, dragScale, onUpdateEntity, gameSpec]);

  // Handle canvas click to select entities
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Don't select if we were dragging
      if (dragState.isDragging) return;

      if (!canvasRef.current || !runtimeRef.current || !onEntitySelect) return;

      const coords = getCanvasCoords(e);
      const entityName = runtimeRef.current.getEntityAtPoint(coords.x, coords.y);
      onEntitySelect(entityName);
    },
    [onEntitySelect, getCanvasCoords, dragState.isDragging]
  );

  // Get selected entity bounds from runtime's ECS state
  const [selectedBounds, setSelectedBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    entityName: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedEntity || !runtimeRef.current) {
      setSelectedBounds(null);
      return;
    }

    // If dragging, use drag position
    if (dragState.isDragging && dragState.entityName === selectedEntity && dragPosition) {
      const bounds = runtimeRef.current.getEntityBounds(selectedEntity);
      if (bounds) {
        setSelectedBounds({
          x: dragPosition.x - bounds.width / 2,
          y: dragPosition.y - bounds.height / 2,
          width: bounds.width,
          height: bounds.height,
          entityName: selectedEntity,
        });
      }
      return;
    }

    const bounds = runtimeRef.current.getEntityBounds(selectedEntity);
    if (bounds) {
      setSelectedBounds({
        x: bounds.x - bounds.width / 2,
        y: bounds.y - bounds.height / 2,
        width: bounds.width,
        height: bounds.height,
        entityName: selectedEntity,
      });
    } else {
      setSelectedBounds(null);
    }
  }, [selectedEntity, gameSpec, dragState, dragPosition]);

  // Draw grid overlay
  const renderGrid = () => {
    if (!showGrid || !gameSpec) return null;

    const lines = [];
    const width = 800;
    const height = 600;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      );
    }

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={800}
        height={600}
        style={{ display: gameSpec && !error ? 'block' : 'none' }}
      >
        {lines}
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black/40"
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/10 backdrop-blur-sm z-10">
          <div className="bg-panel border border-red-500/20 rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              Error Loading Game
            </h3>
            <p className="text-sm text-text-secondary">{error}</p>
            {onReset && (
              <button
                onClick={onReset}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {!gameSpec && !error && (
        <div className="text-center text-text-tertiary">
          <p className="text-lg mb-2">No game loaded</p>
          <p className="text-sm">Open a game project to begin</p>
        </div>
      )}

      <div className="relative" style={{ width: 800, height: 600 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={`rounded-lg shadow-2xl absolute top-0 left-0 border border-subtle ${isPlaying ? 'cursor-crosshair' : 'cursor-move'
            }`}
          style={{ display: gameSpec && !error ? 'block' : 'none', backgroundColor: '#000' }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Grid overlay */}
        {renderGrid()}

        {/* Editor toolbar */}
        {gameSpec && !error && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {/* Transform mode buttons - only show when not playing */}
            {!isPlaying && (
              <>
                <button
                  onClick={() => setTransformMode('move')}
                  className={`p-2 rounded backdrop-blur-md transition-all ${transformMode === 'move'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                    }`}
                  title="Move Tool (W)"
                >
                  <MoveIcon size={16} />
                </button>
                <button
                  onClick={() => setTransformMode('rotate')}
                  className={`p-2 rounded backdrop-blur-md transition-all ${transformMode === 'rotate'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                    }`}
                  title="Rotate Tool (E)"
                >
                  <RotateIcon size={16} />
                </button>
                <button
                  onClick={() => setTransformMode('scale')}
                  className={`p-2 rounded backdrop-blur-md transition-all ${transformMode === 'scale'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                    }`}
                  title="Scale Tool (R)"
                >
                  <ScaleIcon size={16} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
              </>
            )}
            <button
              onClick={() => setShowGrid(prev => !prev)}
              className={`p-2 rounded backdrop-blur-md transition-all ${showGrid
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                }`}
              title="Toggle Grid (G)"
            >
              <GridIcon size={16} />
            </button>
            <button
              onClick={() => {
                if (runtimeRef.current) {
                  runtimeRef.current.toggleDebug();
                  setDebugEnabled(prev => !prev);
                }
              }}
              className={`p-2 rounded backdrop-blur-md transition-all ${debugEnabled
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                }`}
              title="Toggle Debug (D)"
            >
              <DebugIcon size={16} />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 rounded backdrop-blur-md bg-panel/80 text-text-secondary hover:text-white hover:bg-panel transition-all"
              title="Zoom Out"
            >
              <ZoomOutIcon size={16} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 rounded backdrop-blur-md bg-panel/80 text-text-secondary hover:text-white hover:bg-panel text-xs font-mono min-w-[50px] transition-all"
              title="Reset Zoom (Click to reset)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded backdrop-blur-md bg-panel/80 text-text-secondary hover:text-white hover:bg-panel transition-all"
              title="Zoom In"
            >
              <ZoomInIcon size={16} />
            </button>
            <button
              onClick={handleFitAll}
              className="p-2 rounded backdrop-blur-md bg-panel/80 text-text-secondary hover:text-white hover:bg-panel transition-all"
              title="Fit All Entities (F)"
            >
              <FitAllIcon size={16} />
            </button>
          </div>
        )}

        {/* Mode indicator */}
        {gameSpec && !error && (
          <div className="absolute top-2 left-2 bg-panel/90 backdrop-blur-md border border-subtle text-text-primary px-3 py-1 rounded-lg text-sm shadow-lg">
            {isPlaying ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Playing
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Editing
              </span>
            )}
          </div>
        )}

        {/* Controls hint */}
        {gameSpec && !error && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-gray-300 px-2 py-1 rounded text-xs">
            {isPlaying ? (
              <>
                <span className="mr-3">WASD/Arrows: Move</span>
                <span className="mr-3">Space: Jump</span>
              </>
            ) : (
              <>
                <span className="mr-3">W/E/R: Tools</span>
                <span className="mr-3">G: Grid</span>
                <span className="mr-3">
                  {transformMode === 'move' && 'Drag: Move'}
                  {transformMode === 'rotate' && 'Drag handle: Rotate'}
                  {transformMode === 'scale' && 'Drag corners: Scale'}
                </span>
              </>
            )}
            <span className="mr-3">D: Debug</span>
            <span className="mr-3">+/-: Zoom</span>
            <span>F: Fit All</span>
          </div>
        )}

        {/* Selection highlight overlay with gizmo handles */}
        {selectedBounds && gameSpec && !error && (
          <div
            className={`absolute pointer-events-none border-2 rounded-sm ${dragState.isDragging
                ? 'border-green-500 bg-green-500 bg-opacity-10'
                : 'border-blue-500 bg-blue-500 bg-opacity-10'
              }`}
            style={{
              left: `${selectedBounds.x}px`,
              top: `${selectedBounds.y}px`,
              width: `${selectedBounds.width}px`,
              height: `${selectedBounds.height}px`,
              transform: dragRotation !== null && dragState.handleType === 'rotate'
                ? `rotate(${dragRotation}deg)`
                : undefined,
              transformOrigin: 'center center',
            }}
          >
            {/* Entity name label */}
            <div className={`absolute -top-6 left-0 text-xs font-medium whitespace-nowrap bg-gray-900 bg-opacity-75 px-1 rounded ${dragState.isDragging ? 'text-green-400' : 'text-blue-400'
              }`}>
              {selectedBounds.entityName}
              {dragPosition && dragState.handleType === 'move' && (
                <span className="ml-2 text-gray-400">
                  ({Math.round(dragPosition.x)}, {Math.round(dragPosition.y)})
                </span>
              )}
              {dragRotation !== null && dragState.handleType === 'rotate' && (
                <span className="ml-2 text-gray-400">
                  {Math.round(dragRotation)}°
                </span>
              )}
              {dragScale && (dragState.handleType !== 'move' && dragState.handleType !== 'rotate') && (
                <span className="ml-2 text-gray-400">
                  {dragScale.scaleX.toFixed(1)}x{dragScale.scaleY.toFixed(1)}
                </span>
              )}
            </div>

            {/* Gizmo handles - only show when not playing */}
            {!isPlaying && (
              <>
                {/* Move mode - center crosshair */}
                {transformMode === 'move' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-blue-500" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500" />
                  </>
                )}

                {/* Rotate mode - rotation handle above selection */}
                {transformMode === 'rotate' && (
                  <>
                    {/* Line from top center to rotation handle */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-purple-500"
                      style={{ top: '-20px', height: '20px' }}
                    />
                    {/* Rotation handle circle */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 pointer-events-auto cursor-grab ${dragState.handleType === 'rotate' ? 'bg-purple-500 border-purple-300' : 'bg-purple-600 border-purple-400'
                        }`}
                      style={{ top: '-28px' }}
                    />
                  </>
                )}

                {/* Scale mode - corner and edge handles */}
                {transformMode === 'scale' && (
                  <>
                    {/* Corner handles */}
                    <div className={`absolute -top-1.5 -left-1.5 w-3 h-3 rounded-sm pointer-events-auto cursor-nw-resize ${dragState.handleType === 'nw' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-sm pointer-events-auto cursor-ne-resize ${dragState.handleType === 'ne' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-sm pointer-events-auto cursor-sw-resize ${dragState.handleType === 'sw' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm pointer-events-auto cursor-se-resize ${dragState.handleType === 'se' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    {/* Edge handles */}
                    <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm pointer-events-auto cursor-n-resize ${dragState.handleType === 'n' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm pointer-events-auto cursor-s-resize ${dragState.handleType === 's' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-sm pointer-events-auto cursor-w-resize ${dragState.handleType === 'w' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                    <div className={`absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-sm pointer-events-auto cursor-e-resize ${dragState.handleType === 'e' ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
