import { useEffect, useRef, useState, useCallback } from 'react';
import { Runtime2D } from '@promptplay/runtime-2d';
import type { GameSpec, TilemapSpec } from '@promptplay/shared-types';
import { GridIcon, DebugIcon, MoveIcon, RotateIcon, ScaleIcon, ZoomInIcon, ZoomOutIcon, FitAllIcon } from './Icons';
import type { TilemapTool } from './TilemapEditor';

interface GameCanvasProps {
  gameSpec: GameSpec | null;
  isPlaying: boolean;
  selectedEntities: Set<string>;
  onEntitySelect?: (entityName: string | null, options?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onReset?: () => void;
  onUpdateEntity?: (entityName: string, updates: any) => void;
  gridEnabled?: boolean;
  onGridToggle?: () => void;
  debugEnabled?: boolean;
  onDebugToggle?: () => void;
  gridSize?: number;
  // Tilemap editing props
  tilemapMode?: boolean;
  onTilemapModeToggle?: () => void;
  selectedTileId?: number;
  selectedLayerId?: string;
  tilemapTool?: TilemapTool;
  onTilemapToolChange?: (tool: TilemapTool) => void;
  onTilemapChange?: (tilemap: TilemapSpec) => void;
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
  selectedEntities,
  onEntitySelect,
  onReset,
  onUpdateEntity,
  gridEnabled = false,
  onGridToggle,
  debugEnabled = false,
  onDebugToggle,
  gridSize = 16,
  // Tilemap editing
  tilemapMode = false,
  onTilemapModeToggle,
  selectedTileId = 1,
  selectedLayerId,
  tilemapTool = 'brush',
  onTilemapToolChange,
  onTilemapChange,
}: GameCanvasProps) {
  // Get primary selected entity (first in set, for transform operations)
  const selectedEntity = selectedEntities.size > 0 ? Array.from(selectedEntities)[0] : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('move');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Responsive canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Track container size for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      // Leave some padding for the UI elements
      const padding = 32;
      const newWidth = Math.max(800, Math.floor(rect.width - padding));
      const newHeight = Math.max(600, Math.floor(rect.height - padding));
      setCanvasSize({ width: newWidth, height: newHeight });
    };

    // Initial size
    updateSize();

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Use controlled props for grid and debug, with local state fallback
  const showGrid = gridEnabled;
  const showDebug = debugEnabled;

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

  // Tilemap painting state
  const [isTilemapDrawing, setIsTilemapDrawing] = useState(false);
  const lastTilePosRef = useRef<{ x: number; y: number } | null>(null);

  // Mouse hover position for brush preview
  const [hoverTilePos, setHoverTilePos] = useState<{ x: number; y: number } | null>(null);

  // Get tile position from canvas coordinates
  const getTilePos = useCallback((canvasX: number, canvasY: number) => {
    const tilemap = gameSpec?.tilemap;
    if (!tilemap) return null;
    const tileX = Math.floor(canvasX / tilemap.tileSize);
    const tileY = Math.floor(canvasY / tilemap.tileSize);
    if (tileX < 0 || tileX >= tilemap.width || tileY < 0 || tileY >= tilemap.height) {
      return null;
    }
    return { x: tileX, y: tileY };
  }, [gameSpec?.tilemap]);

  // Paint tile at position
  const paintTile = useCallback((tileX: number, tileY: number) => {
    const tilemap = gameSpec?.tilemap;
    if (!tilemap || !onTilemapChange) return;

    const layerId = selectedLayerId || tilemap.layers[0]?.id;
    const layerIndex = tilemap.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = tilemap.layers[layerIndex];
    if (layer.locked) return;

    // Check if already the same tile
    const currentTile = layer.data[tileY]?.[tileX] ?? 0;
    const newTileId = tilemapTool === 'eraser' ? 0 : selectedTileId;
    if (currentTile === newTileId) return;

    // Clone the tilemap data
    const newLayers = tilemap.layers.map((l, idx) => {
      if (idx !== layerIndex) return l;
      const newData = l.data.map(row => [...row]);
      if (!newData[tileY]) newData[tileY] = [];
      newData[tileY][tileX] = newTileId;
      return { ...l, data: newData };
    });

    onTilemapChange({ ...tilemap, layers: newLayers });
  }, [gameSpec?.tilemap, selectedLayerId, selectedTileId, tilemapTool, onTilemapChange]);

  // Flood fill
  const floodFill = useCallback((startX: number, startY: number) => {
    const tilemap = gameSpec?.tilemap;
    if (!tilemap || !onTilemapChange) return;

    const layerId = selectedLayerId || tilemap.layers[0]?.id;
    const layerIndex = tilemap.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = tilemap.layers[layerIndex];
    if (layer.locked) return;

    const targetTile = layer.data[startY]?.[startX] ?? 0;
    const fillTile = selectedTileId;
    if (targetTile === fillTile) return;

    // Clone data
    const newData = layer.data.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) continue;
      if ((newData[y]?.[x] ?? 0) !== targetTile) continue;

      visited.add(key);
      if (!newData[y]) newData[y] = [];
      newData[y][x] = fillTile;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    const newLayers = tilemap.layers.map((l, idx) =>
      idx === layerIndex ? { ...l, data: newData } : l
    );
    onTilemapChange({ ...tilemap, layers: newLayers });
  }, [gameSpec?.tilemap, selectedLayerId, selectedTileId, onTilemapChange]);

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

      // Debug and grid toggles only when NOT playing (to avoid conflict with WASD)
      if (!isPlaying) {
        // Toggle debug with F3 (was D, but conflicts with WASD movement)
        if (e.key === 'F3') {
          if (runtimeRef.current) {
            runtimeRef.current.toggleDebug();
          }
          onDebugToggle?.();
        }
        // Toggle grid with G key
        if (e.key === 'g' || e.key === 'G') {
          onGridToggle?.();
        }
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
  }, [isPlaying, handleZoomIn, handleZoomOut, handleFitAll, onGridToggle, onDebugToggle]);

  // Initialize runtime when gameSpec or canvas size changes
  useEffect(() => {
    if (!canvasRef.current || !gameSpec) return;

    let isMounted = true;

    const initRuntime = async () => {
      try {
        // Destroy previous runtime
        if (runtimeRef.current) {
          runtimeRef.current.destroy();
        }

        // Create new runtime with responsive canvas size
        const runtime = new Runtime2D(canvasRef.current!, {
          width: canvasSize.width,
          height: canvasSize.height,
        });
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
  }, [gameSpec, canvasSize.width, canvasSize.height]);

  // Handle play/pause
  useEffect(() => {
    if (!runtimeRef.current) return;

    if (isPlaying) {
      runtimeRef.current.start();
      // Focus canvas to receive keyboard input
      canvasRef.current?.focus();
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

  // Handle mouse down - start drag if on entity and paused, or paint tiles in tilemap mode
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const coords = getCanvasCoords(e);

      // Tilemap painting mode
      if (tilemapMode && !isPlaying && gameSpec?.tilemap) {
        const tilePos = getTilePos(coords.x, coords.y);
        if (tilePos) {
          if (tilemapTool === 'fill') {
            floodFill(tilePos.x, tilePos.y);
          } else {
            paintTile(tilePos.x, tilePos.y);
            setIsTilemapDrawing(true);
            lastTilePosRef.current = tilePos;
          }
        }
        return;
      }

      if (!runtimeRef.current) return;

      // Only allow dragging when paused
      if (isPlaying) return;

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
    [isPlaying, getCanvasCoords, onEntitySelect, selectedEntity, getHandleAtPoint, gameSpec, tilemapMode, tilemapTool, getTilePos, paintTile, floodFill]
  );

  // Handle mouse move - update drag position/rotation/scale
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);

      // Tilemap mode - track hover position for brush preview
      if (tilemapMode && gameSpec?.tilemap) {
        const tilePos = getTilePos(coords.x, coords.y);
        setHoverTilePos(tilePos);

        // Tilemap painting - continuous stroke
        if (isTilemapDrawing) {
          if (tilePos && lastTilePosRef.current) {
            if (tilePos.x !== lastTilePosRef.current.x || tilePos.y !== lastTilePosRef.current.y) {
              paintTile(tilePos.x, tilePos.y);
              lastTilePosRef.current = tilePos;
            }
          }
          return;
        }
      } else {
        setHoverTilePos(null);
      }

      if (!dragState.isDragging || !dragState.entityName) return;

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
    [dragState, getCanvasCoords, snapToGrid, showGrid, isTilemapDrawing, tilemapMode, gameSpec?.tilemap, getTilePos, paintTile]
  );

  // Handle mouse up - finish drag and persist changes
  const handleMouseUp = useCallback(() => {
    // Stop tilemap drawing
    if (isTilemapDrawing) {
      setIsTilemapDrawing(false);
      lastTilePosRef.current = null;
    }

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
  }, [dragState, dragPosition, dragRotation, dragScale, onUpdateEntity, gameSpec, isTilemapDrawing]);

  // Handle canvas click to select entities
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Don't select if we were dragging
      if (dragState.isDragging) return;

      if (!canvasRef.current || !runtimeRef.current || !onEntitySelect) return;

      const coords = getCanvasCoords(e);
      const entityName = runtimeRef.current.getEntityAtPoint(coords.x, coords.y);
      onEntitySelect(entityName, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
    },
    [onEntitySelect, getCanvasCoords, dragState.isDragging]
  );

  // Get selected entities bounds from runtime's ECS state
  const [allSelectedBounds, setAllSelectedBounds] = useState<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    entityName: string;
    isPrimary: boolean;
  }>>([]);

  useEffect(() => {
    if (selectedEntities.size === 0 || !runtimeRef.current) {
      setAllSelectedBounds([]);
      return;
    }

    const boundsArray: typeof allSelectedBounds = [];
    const primaryEntity = selectedEntity;

    selectedEntities.forEach(entityName => {
      // If dragging the primary entity, use drag position
      if (dragState.isDragging && dragState.entityName === entityName && dragPosition) {
        const bounds = runtimeRef.current!.getEntityBounds(entityName);
        if (bounds) {
          boundsArray.push({
            x: dragPosition.x - bounds.width / 2,
            y: dragPosition.y - bounds.height / 2,
            width: bounds.width,
            height: bounds.height,
            entityName,
            isPrimary: entityName === primaryEntity,
          });
        }
      } else {
        const bounds = runtimeRef.current!.getEntityBounds(entityName);
        if (bounds) {
          boundsArray.push({
            x: bounds.x - bounds.width / 2,
            y: bounds.y - bounds.height / 2,
            width: bounds.width,
            height: bounds.height,
            entityName,
            isPrimary: entityName === primaryEntity,
          });
        }
      }
    });

    setAllSelectedBounds(boundsArray);
  }, [selectedEntities, selectedEntity, gameSpec, dragState, dragPosition]);

  // Note: Primary bounds are identified within allSelectedBounds via isPrimary flag

  // Draw tilemap grid overlay when in tilemap mode
  const renderTilemapGrid = () => {
    if (!tilemapMode || !gameSpec?.tilemap) return null;

    const tilemap = gameSpec.tilemap;
    const tileSize = tilemap.tileSize;
    const width = tilemap.width * tileSize;
    const height = tilemap.height * tileSize;

    const lines = [];

    // Vertical lines
    for (let x = 0; x <= tilemap.width; x++) {
      lines.push(
        <line
          key={`tv-${x}`}
          x1={x * tileSize}
          y1={0}
          x2={x * tileSize}
          y2={height}
          stroke="rgba(0,255,150,0.3)"
          strokeWidth="1"
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= tilemap.height; y++) {
      lines.push(
        <line
          key={`th-${y}`}
          x1={0}
          y1={y * tileSize}
          x2={width}
          y2={y * tileSize}
          stroke="rgba(0,255,150,0.3)"
          strokeWidth="1"
        />
      );
    }

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none z-20"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      >
        {lines}
        {/* Tilemap boundary */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke="rgba(0,255,150,0.6)"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
      </svg>
    );
  };

  // Render brush cursor preview (ghost tile at mouse position)
  const renderBrushPreview = () => {
    if (!tilemapMode || !gameSpec?.tilemap || !hoverTilePos || isPlaying) return null;

    const tilemap = gameSpec.tilemap;
    const tileSize = tilemap.tileSize;
    const x = hoverTilePos.x * tileSize;
    const y = hoverTilePos.y * tileSize;

    // Get the selected tile definition for color/image
    const selectedTile = tilemap.tileset.find(t => t.id === selectedTileId);
    const isEraser = tilemapTool === 'eraser';

    // Preview style based on tool
    let previewColor = 'rgba(100, 100, 100, 0.5)';
    let borderColor = 'rgba(255, 255, 255, 0.8)';
    let icon = null;

    if (isEraser) {
      previewColor = 'rgba(255, 50, 50, 0.3)';
      borderColor = 'rgba(255, 100, 100, 0.8)';
      icon = (
        <text
          x={x + tileSize / 2}
          y={y + tileSize / 2 + 4}
          textAnchor="middle"
          fill="rgba(255, 100, 100, 0.9)"
          fontSize="14"
          fontWeight="bold"
        >
          ✕
        </text>
      );
    } else if (tilemapTool === 'fill') {
      previewColor = selectedTile ? selectedTile.color : 'rgba(100, 200, 100, 0.5)';
      borderColor = 'rgba(100, 255, 100, 0.8)';
      icon = (
        <text
          x={x + tileSize / 2}
          y={y + tileSize / 2 + 4}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.9)"
          fontSize="12"
          fontWeight="bold"
        >
          ⬛
        </text>
      );
    } else if (selectedTile) {
      previewColor = selectedTile.color;
      borderColor = 'rgba(255, 255, 255, 0.9)';
    }

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none z-30"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      >
        {/* Ghost tile preview */}
        <rect
          x={x}
          y={y}
          width={tileSize}
          height={tileSize}
          fill={isEraser ? 'transparent' : previewColor}
          stroke={borderColor}
          strokeWidth="2"
          opacity={0.7}
        />
        {/* Crosshair pattern for eraser */}
        {isEraser && (
          <>
            <line
              x1={x + 4}
              y1={y + 4}
              x2={x + tileSize - 4}
              y2={y + tileSize - 4}
              stroke="rgba(255, 100, 100, 0.8)"
              strokeWidth="2"
            />
            <line
              x1={x + tileSize - 4}
              y1={y + 4}
              x2={x + 4}
              y2={y + tileSize - 4}
              stroke="rgba(255, 100, 100, 0.8)"
              strokeWidth="2"
            />
          </>
        )}
        {icon}
      </svg>
    );
  };

  // Render floating tilemap toolbar
  const renderTilemapToolbar = () => {
    if (!tilemapMode || !gameSpec?.tilemap || isPlaying) return null;

    const tilemap = gameSpec.tilemap;
    const selectedTile = tilemap.tileset.find(t => t.id === selectedTileId);

    const tools: { id: TilemapTool; icon: string; label: string }[] = [
      { id: 'brush', icon: '🖌️', label: 'Brush' },
      { id: 'eraser', icon: '🧹', label: 'Eraser' },
      { id: 'fill', icon: '🪣', label: 'Fill' },
    ];

    return (
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 bg-panel/95 backdrop-blur-md border border-subtle rounded-xl px-3 py-2 shadow-2xl">
          {/* Selected tile preview */}
          <div className="flex items-center gap-2 pr-3 border-r border-subtle">
            <div
              className="w-8 h-8 rounded border-2 border-white/30"
              style={{ backgroundColor: selectedTile?.color || '#666' }}
              title={selectedTile?.name || 'No tile selected'}
            />
            <div className="text-xs text-text-secondary">
              <div className="font-medium text-text-primary">{selectedTile?.name || 'None'}</div>
              <div>Tile {selectedTileId}</div>
            </div>
          </div>

          {/* Tool buttons */}
          <div className="flex items-center gap-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onTilemapToolChange?.(tool.id)}
                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  tilemapTool === tool.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                }`}
                title={tool.label}
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Current layer indicator */}
          <div className="pl-3 border-l border-subtle text-xs text-text-tertiary">
            Layer: {tilemap.layers.find(l => l.id === (selectedLayerId || tilemap.layers[0]?.id))?.name || 'None'}
          </div>
        </div>

        {/* Hint text */}
        <div className="text-center text-xs text-text-tertiary mt-2">
          Click to paint • Hold to draw • Select tiles in left panel
        </div>
      </div>
    );
  };

  // Draw grid overlay
  const renderGrid = () => {
    if (!showGrid || !gameSpec) return null;

    const lines = [];
    const width = canvasSize.width;
    const height = canvasSize.height;

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

    // Draw physics debug overlay (colliders, velocity vectors, sensors)
    const renderPhysicsDebug = () => {
      if (!showDebug || !gameSpec?.entities) return null;

      return gameSpec.entities.map(entity => {
        const collider = entity.components?.collider;
        const sprite = entity.components?.sprite;
        const transform = entity.components?.transform;
        const velocity = entity.components?.velocity;
        const input = entity.components?.input;

        if (!transform) return null;

        const x = transform.x;
        const y = transform.y;
        const rotation = transform.rotation || 0;

        // Collider properties
        const isCircle = collider?.type === 'circle';
        const isSensor = collider?.isSensor;
        const width = collider?.width || sprite?.width || 32;
        const height = collider?.height || sprite?.height || 32;
        const radius = collider?.radius || (Math.min(width, height) / 2);

        // Colors based on type
        const colliderColor = isSensor ? '#ffaa00' : (isCircle ? '#00ffff' : '#00ff00');
        const colliderFill = isSensor ? 'rgba(255, 170, 0, 0.1)' : (isCircle ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 255, 0, 0.1)');

        // Velocity vector scale
        const vx = velocity?.vx || 0;
        const vy = velocity?.vy || 0;
        const velocityScale = 0.1;
        const hasVelocity = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;

        return (
          <g key={`debug-${entity.name}`}>
            {/* Entity group with transform */}
            <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
              {/* Collider shape */}
              {collider && (
                isCircle ? (
                  <circle
                    r={radius}
                    fill={colliderFill}
                    stroke={colliderColor}
                    strokeWidth="1.5"
                    strokeDasharray={isSensor ? '4,2' : 'none'}
                    className="pointer-events-none"
                  />
                ) : (
                  <rect
                    x={-width / 2}
                    y={-height / 2}
                    width={width}
                    height={height}
                    fill={colliderFill}
                    stroke={colliderColor}
                    strokeWidth="1.5"
                    strokeDasharray={isSensor ? '4,2' : 'none'}
                    className="pointer-events-none"
                  />
                )
              )}

              {/* Center crosshair */}
              <line x1="-4" y1="0" x2="4" y2="0" stroke={colliderColor} strokeWidth="1" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke={colliderColor} strokeWidth="1" />

              {/* Rotation indicator */}
              <line x1="0" y1="0" x2="0" y2={-(isCircle ? radius : height/2) - 8} stroke="#ff00ff" strokeWidth="1" />
              <circle cx="0" cy={-(isCircle ? radius : height/2) - 8} r="3" fill="#ff00ff" />
            </g>

            {/* Velocity vector (in world space, not rotated) */}
            {hasVelocity && (
              <g transform={`translate(${x}, ${y})`}>
                <line
                  x1="0"
                  y1="0"
                  x2={vx * velocityScale}
                  y2={vy * velocityScale}
                  stroke="#ff4444"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )}

            {/* Entity label */}
            <text
              x={x}
              y={y - (isCircle ? radius : height/2) - 14}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontFamily="monospace"
              className="pointer-events-none"
            >
              {entity.name}
              {input && ' [P]'}
              {isSensor && ' [S]'}
            </text>

            {/* Velocity label */}
            {hasVelocity && (
              <text
                x={x}
                y={y + (isCircle ? radius : height/2) + 16}
                textAnchor="middle"
                fill="#ff4444"
                fontSize="9"
                fontFamily="monospace"
                className="pointer-events-none"
              >
                v({Math.round(vx)}, {Math.round(vy)})
              </text>
            )}
          </g>
        );
      });
    };

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none z-10"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: gameSpec && !error ? 'block' : 'none' }}
      >
        {/* Arrow marker for velocity vectors */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#ff4444" />
          </marker>
        </defs>
        {lines}
        {renderPhysicsDebug()}
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

      <div ref={canvasContainerRef} className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`rounded-lg shadow-2xl absolute top-0 left-0 border border-subtle outline-none ${isPlaying ? 'cursor-crosshair' : 'cursor-move'
            }`}
          style={{ display: gameSpec && !error ? 'block' : 'none', backgroundColor: '#000' }}
          onClick={handleCanvasClick}
          onMouseDown={(e) => {
            canvasRef.current?.focus();
            handleMouseDown(e);
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setHoverTilePos(null);
          }}
        />

        {/* Grid overlay */}
        {renderGrid()}

        {/* Tilemap grid overlay */}
        {renderTilemapGrid()}

        {/* Brush cursor preview */}
        {renderBrushPreview()}

        {/* Floating tilemap toolbar */}
        {renderTilemapToolbar()}

        {/* Editor toolbar */}
        {gameSpec && !error && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {/* Tilemap mode toggle - only show when tilemap exists */}
            {!isPlaying && gameSpec.tilemap && (
              <>
                <button
                  onClick={() => onTilemapModeToggle?.()}
                  className={`p-2 rounded backdrop-blur-md transition-all ${tilemapMode
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                    }`}
                  title={tilemapMode ? 'Exit Tilemap Mode (T)' : 'Edit Tilemap (T)'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
              </>
            )}
            {/* Transform mode buttons - only show when not playing and not in tilemap mode */}
            {!isPlaying && !tilemapMode && (
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
              onClick={() => onGridToggle?.()}
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
                }
                onDebugToggle?.();
              }}
              className={`p-2 rounded backdrop-blur-md transition-all ${showDebug
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-panel/80 text-text-secondary hover:text-white hover:bg-panel'
                }`}
              title="Toggle Debug (F3)"
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
            ) : tilemapMode ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Tilemap Mode
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
        {gameSpec && !error && !tilemapMode && (
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
            <span className="mr-3">F3: Debug</span>
            <span className="mr-3">+/-: Zoom</span>
            <span>F: Fit All</span>
          </div>
        )}

        {/* Selection highlight overlay for all selected entities */}
        {allSelectedBounds.map((bounds) => (
          <div
            key={bounds.entityName}
            className={`absolute pointer-events-none border-2 rounded-sm ${
              bounds.isPrimary
                ? dragState.isDragging
                  ? 'border-green-500 bg-green-500 bg-opacity-10'
                  : 'border-blue-500 bg-blue-500 bg-opacity-10'
                : 'border-cyan-400 bg-cyan-400 bg-opacity-5'
            }`}
            style={{
              left: `${bounds.x}px`,
              top: `${bounds.y}px`,
              width: `${bounds.width}px`,
              height: `${bounds.height}px`,
              transform: bounds.isPrimary && dragRotation !== null && dragState.handleType === 'rotate'
                ? `rotate(${dragRotation}deg)`
                : undefined,
              transformOrigin: 'center center',
            }}
          >
            {/* Entity name label */}
            <div className={`absolute -top-6 left-0 text-xs font-medium whitespace-nowrap bg-gray-900 bg-opacity-75 px-1 rounded ${
              bounds.isPrimary
                ? dragState.isDragging ? 'text-green-400' : 'text-blue-400'
                : 'text-cyan-400'
            }`}>
              {bounds.entityName}
              {bounds.isPrimary && dragPosition && dragState.handleType === 'move' && (
                <span className="ml-2 text-gray-400">
                  ({Math.round(dragPosition.x)}, {Math.round(dragPosition.y)})
                </span>
              )}
              {bounds.isPrimary && dragRotation !== null && dragState.handleType === 'rotate' && (
                <span className="ml-2 text-gray-400">
                  {Math.round(dragRotation)}°
                </span>
              )}
              {bounds.isPrimary && dragScale && (dragState.handleType !== 'move' && dragState.handleType !== 'rotate') && (
                <span className="ml-2 text-gray-400">
                  {dragScale.scaleX.toFixed(1)}x{dragScale.scaleY.toFixed(1)}
                </span>
              )}
            </div>

            {/* Gizmo handles - only show for primary selection when not playing */}
            {bounds.isPrimary && !isPlaying && (
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
        ))}

        {/* Multi-selection count indicator */}
        {allSelectedBounds.length > 1 && gameSpec && !error && (
          <div className="absolute bottom-2 right-2 bg-cyan-600/80 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
            {allSelectedBounds.length} selected
          </div>
        )}
      </div>
    </div>
  );
}
