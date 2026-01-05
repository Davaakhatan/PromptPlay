import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GridIcon, TrashIcon } from './Icons';

export interface TileDefinition {
  id: number;
  name: string;
  color: string;
  collision: boolean;
  properties?: Record<string, unknown>;
}

export interface Tilemap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: TilemapLayer[];
  tileset: TileDefinition[];
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  data: number[][]; // 2D array of tile IDs (0 = empty)
}

interface TilemapEditorProps {
  tilemap: Tilemap | null;
  onTilemapChange: (tilemap: Tilemap) => void;
  onCreateTilemap?: () => void;
}

// Default color palette for tiles
const DEFAULT_COLORS = [
  '#4a9eff', '#4ade80', '#f472b6', '#facc15',
  '#a78bfa', '#fb923c', '#22d3ee', '#f87171',
  '#94a3b8', '#34d399', '#c084fc', '#fbbf24',
];

// Tool types
type Tool = 'brush' | 'eraser' | 'fill' | 'picker' | 'select';

// Max history entries
const MAX_HISTORY = 50;

export function TilemapEditor({
  tilemap,
  onTilemapChange,
  onCreateTilemap,
}: TilemapEditorProps) {
  const [selectedTile, setSelectedTile] = useState<number>(1);
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [tool, setTool] = useState<Tool>('brush');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // History for undo/redo
  const historyRef = useRef<Tilemap[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Push to history
  const pushHistory = useCallback((newTilemap: Tilemap) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Remove future history if we're in the middle
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Add new entry (deep clone)
    historyRef.current.push(JSON.parse(JSON.stringify(newTilemap)));

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    onTilemapChange(JSON.parse(JSON.stringify(entry)));

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [onTilemapChange]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    onTilemapChange(JSON.parse(JSON.stringify(entry)));

    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [onTilemapChange]);

  // Initialize history when tilemap is created
  useEffect(() => {
    if (tilemap && historyRef.current.length === 0) {
      historyRef.current = [JSON.parse(JSON.stringify(tilemap))];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [tilemap]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tilemap) return;

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tilemap, handleUndo, handleRedo]);

  // Wrapper to update tilemap with history
  const updateTilemap = useCallback((newTilemap: Tilemap) => {
    pushHistory(newTilemap);
    onTilemapChange(newTilemap);
  }, [pushHistory, onTilemapChange]);

  // Initialize selected layer
  useEffect(() => {
    if (tilemap && tilemap.layers.length > 0 && !selectedLayer) {
      setSelectedLayer(tilemap.layers[0].id);
    }
  }, [tilemap, selectedLayer]);

  // Get current layer
  const currentLayer = useMemo(() => {
    if (!tilemap) return null;
    return tilemap.layers.find(l => l.id === selectedLayer) || null;
  }, [tilemap, selectedLayer]);

  // Draw tilemap
  useEffect(() => {
    if (!tilemap || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = tilemap.width * tilemap.tileSize * zoom;
    const height = tilemap.height * tilemap.tileSize * zoom;

    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw layers (bottom to top)
    tilemap.layers.forEach(layer => {
      if (!layer.visible) return;

      ctx.globalAlpha = layer.opacity;

      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const tileId = layer.data[y]?.[x] || 0;
          if (tileId === 0) continue;

          const tile = tilemap.tileset.find(t => t.id === tileId);
          if (!tile) continue;

          ctx.fillStyle = tile.color;
          ctx.fillRect(
            x * tilemap.tileSize * zoom,
            y * tilemap.tileSize * zoom,
            tilemap.tileSize * zoom,
            tilemap.tileSize * zoom
          );
        }
      }

      ctx.globalAlpha = 1;
    });

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= tilemap.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tilemap.tileSize * zoom, 0);
        ctx.lineTo(x * tilemap.tileSize * zoom, height);
        ctx.stroke();
      }

      for (let y = 0; y <= tilemap.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tilemap.tileSize * zoom);
        ctx.lineTo(width, y * tilemap.tileSize * zoom);
        ctx.stroke();
      }
    }
  }, [tilemap, zoom, showGrid]);

  // Get tile position from mouse event
  const getTilePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilemap || !canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (tilemap.tileSize * zoom));
    const y = Math.floor((e.clientY - rect.top) / (tilemap.tileSize * zoom));

    if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) return null;

    return { x, y };
  }, [tilemap, zoom]);

  // Set tile at position
  const setTileAt = useCallback((x: number, y: number, tileId: number) => {
    if (!tilemap || !currentLayer || currentLayer.locked) return;

    const newData = currentLayer.data.map((row, ry) =>
      row.map((cell, cx) => (ry === y && cx === x ? tileId : cell))
    );

    const newLayers = tilemap.layers.map(layer =>
      layer.id === currentLayer.id ? { ...layer, data: newData } : layer
    );

    updateTilemap({ ...tilemap, layers: newLayers });
  }, [tilemap, currentLayer, updateTilemap]);

  // Flood fill algorithm
  const floodFill = useCallback((startX: number, startY: number, targetTile: number, replaceTile: number) => {
    if (!tilemap || !currentLayer || currentLayer.locked) return;
    if (targetTile === replaceTile) return;

    const newData = currentLayer.data.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) continue;
      if (newData[y][x] !== targetTile) continue;

      visited.add(key);
      newData[y][x] = replaceTile;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    const newLayers = tilemap.layers.map(layer =>
      layer.id === currentLayer.id ? { ...layer, data: newData } : layer
    );

    updateTilemap({ ...tilemap, layers: newLayers });
  }, [tilemap, currentLayer, updateTilemap]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getTilePos(e);
    if (!pos || !currentLayer) return;

    setIsDrawing(true);

    switch (tool) {
      case 'brush':
        setTileAt(pos.x, pos.y, selectedTile);
        break;
      case 'eraser':
        setTileAt(pos.x, pos.y, 0);
        break;
      case 'fill':
        const targetTile = currentLayer.data[pos.y]?.[pos.x] || 0;
        floodFill(pos.x, pos.y, targetTile, selectedTile);
        break;
      case 'picker':
        const pickedTile = currentLayer.data[pos.y]?.[pos.x] || 0;
        if (pickedTile > 0) {
          setSelectedTile(pickedTile);
          setTool('brush');
        }
        break;
    }
  }, [getTilePos, currentLayer, tool, selectedTile, setTileAt, floodFill]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getTilePos(e);
    if (!pos) return;

    switch (tool) {
      case 'brush':
        setTileAt(pos.x, pos.y, selectedTile);
        break;
      case 'eraser':
        setTileAt(pos.x, pos.y, 0);
        break;
    }
  }, [isDrawing, getTilePos, tool, selectedTile, setTileAt]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Add new tile to tileset
  const handleAddTile = useCallback(() => {
    if (!tilemap) return;

    const newId = Math.max(0, ...tilemap.tileset.map(t => t.id)) + 1;
    const colorIndex = (newId - 1) % DEFAULT_COLORS.length;

    const newTile: TileDefinition = {
      id: newId,
      name: `Tile ${newId}`,
      color: DEFAULT_COLORS[colorIndex],
      collision: false,
    };

    updateTilemap({
      ...tilemap,
      tileset: [...tilemap.tileset, newTile],
    });

    setSelectedTile(newId);
  }, [tilemap, updateTilemap]);

  // Update tile definition
  const handleUpdateTile = useCallback((tileId: number, updates: Partial<TileDefinition>) => {
    if (!tilemap) return;

    updateTilemap({
      ...tilemap,
      tileset: tilemap.tileset.map(t =>
        t.id === tileId ? { ...t, ...updates } : t
      ),
    });
  }, [tilemap, updateTilemap]);

  // Delete tile
  const handleDeleteTile = useCallback((tileId: number) => {
    if (!tilemap) return;

    // Remove from tileset
    const newTileset = tilemap.tileset.filter(t => t.id !== tileId);

    // Clear tile from all layers
    const newLayers = tilemap.layers.map(layer => ({
      ...layer,
      data: layer.data.map(row =>
        row.map(cell => cell === tileId ? 0 : cell)
      ),
    }));

    updateTilemap({
      ...tilemap,
      tileset: newTileset,
      layers: newLayers,
    });

    if (selectedTile === tileId) {
      setSelectedTile(newTileset[0]?.id || 1);
    }
  }, [tilemap, selectedTile, updateTilemap]);

  // Add new layer
  const handleAddLayer = useCallback(() => {
    if (!tilemap) return;

    const newLayer: TilemapLayer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${tilemap.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      data: Array(tilemap.height).fill(null).map(() => Array(tilemap.width).fill(0)),
    };

    updateTilemap({
      ...tilemap,
      layers: [...tilemap.layers, newLayer],
    });

    setSelectedLayer(newLayer.id);
  }, [tilemap, updateTilemap]);

  // Delete layer
  const handleDeleteLayer = useCallback((layerId: string) => {
    if (!tilemap || tilemap.layers.length <= 1) return;

    const newLayers = tilemap.layers.filter(l => l.id !== layerId);
    updateTilemap({ ...tilemap, layers: newLayers });

    if (selectedLayer === layerId) {
      setSelectedLayer(newLayers[0].id);
    }
  }, [tilemap, selectedLayer, updateTilemap]);

  // Create new tilemap
  const handleCreateTilemap = useCallback(() => {
    const newTilemap: Tilemap = {
      id: `tilemap_${Date.now()}`,
      name: 'New Tilemap',
      width: 20,
      height: 15,
      tileSize: 32,
      layers: [
        {
          id: 'layer_1',
          name: 'Background',
          visible: true,
          locked: false,
          opacity: 1,
          data: Array(15).fill(null).map(() => Array(20).fill(0)),
        },
      ],
      tileset: [
        { id: 1, name: 'Ground', color: '#4a9eff', collision: true },
        { id: 2, name: 'Grass', color: '#4ade80', collision: false },
        { id: 3, name: 'Water', color: '#22d3ee', collision: true },
      ],
    };

    // Initialize history with the new tilemap
    historyRef.current = [JSON.parse(JSON.stringify(newTilemap))];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);

    onTilemapChange(newTilemap);
    setSelectedLayer(newTilemap.layers[0].id);
    setSelectedTile(1);
  }, [onTilemapChange]);

  if (!tilemap) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <GridIcon size={32} className="text-text-tertiary mb-3 opacity-50" />
        <p className="text-sm text-text-secondary">No tilemap</p>
        <button
          onClick={onCreateTilemap || handleCreateTilemap}
          className="mt-3 px-3 py-1.5 text-xs bg-violet-500/20 text-violet-400 rounded hover:bg-violet-500/30 transition-colors"
        >
          Create Tilemap
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-subtle bg-panel">
        {/* Tools */}
        <div className="flex gap-0.5 bg-subtle/50 p-0.5 rounded">
          {[
            { id: 'brush', title: 'Brush (B)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> },
            { id: 'eraser', title: 'Eraser (E)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
            { id: 'fill', title: 'Fill (G)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
            { id: 'picker', title: 'Picker (I)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              className={`p-1.5 rounded transition-colors ${
                tool === t.id
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title={t.title}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-subtle" />

        {/* Undo/Redo */}
        <div className="flex gap-0.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                : 'text-text-tertiary/30 cursor-not-allowed'
            }`}
            title="Undo (Cmd+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                : 'text-text-tertiary/30 cursor-not-allowed'
            }`}
            title="Redo (Cmd+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>
        </div>

        <div className="w-px h-5 bg-subtle" />

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-colors ${
            showGrid ? 'bg-white/10 text-text-primary' : 'text-text-tertiary'
          }`}
          title="Toggle Grid"
        >
          <GridIcon size={14} />
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="p-1 text-text-tertiary hover:text-text-primary"
          >
            -
          </button>
          <span className="text-xs text-text-secondary w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1 text-text-tertiary hover:text-text-primary"
          >
            +
          </button>
        </div>

        <div className="flex-1" />

        {/* Tilemap settings */}
        <span className="text-xs text-text-tertiary">
          {tilemap.width}×{tilemap.height} • {tilemap.tileSize}px
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-canvas p-4"
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Right Panel - Tiles & Layers */}
        <div className="w-48 border-l border-subtle bg-panel flex flex-col">
          {/* Layers */}
          <div className="border-b border-subtle">
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium text-text-secondary">Layers</span>
              <button
                onClick={handleAddLayer}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto">
              {[...tilemap.layers].reverse().map(layer => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 px-2 py-1 cursor-pointer ${
                    selectedLayer === layer.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedLayer(layer.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTilemap({
                        ...tilemap,
                        layers: tilemap.layers.map(l =>
                          l.id === layer.id ? { ...l, visible: !l.visible } : l
                        ),
                      });
                    }}
                    className={`${layer.visible ? 'text-text-primary' : 'text-text-tertiary'}`}
                  >
                    {layer.visible ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                  </button>
                  <span className="flex-1 text-xs text-text-primary truncate">{layer.name}</span>
                  {tilemap.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      className="p-0.5 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tileset */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-2 border-b border-subtle">
              <span className="text-xs font-medium text-text-secondary">Tiles</span>
              <button
                onClick={handleAddTile}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {tilemap.tileset.map(tile => (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedTile(tile.id)}
                    className={`aspect-square rounded border-2 transition-all ${
                      selectedTile === tile.id
                        ? 'border-white scale-110'
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: tile.color }}
                    title={`${tile.name}${tile.collision ? ' (collision)' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Selected Tile Editor */}
            {(() => {
              const tile = tilemap.tileset.find(t => t.id === selectedTile);
              if (!tile) return null;

              return (
                <div className="p-2 border-t border-subtle space-y-2">
                  <input
                    type="text"
                    value={tile.name}
                    onChange={(e) => handleUpdateTile(tile.id, { name: e.target.value })}
                    className="w-full text-xs bg-subtle border border-subtle rounded px-2 py-1 text-text-primary"
                    placeholder="Tile name"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tile.color}
                      onChange={(e) => handleUpdateTile(tile.id, { color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <label className="flex items-center gap-1 text-xs text-text-tertiary">
                      <input
                        type="checkbox"
                        checked={tile.collision}
                        onChange={(e) => handleUpdateTile(tile.id, { collision: e.target.checked })}
                        className="w-3 h-3"
                      />
                      Collision
                    </label>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteTile(tile.id)}
                      className="p-1 text-text-tertiary hover:text-red-400"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TilemapEditor;
