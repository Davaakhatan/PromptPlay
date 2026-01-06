/**
 * TerrainEditor - Professional 3D terrain editing component
 * Supports heightmap generation, brush sculpting, texture painting, and LOD
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  terrainEditor3D,
  TerrainInstance,
  TerrainPreset,
  BrushSettings,
  TerrainLayer,
  ErosionSettings,
} from '../services/TerrainEditor3D';

// Brush types with icons
const BRUSH_TYPES: Array<{
  id: BrushSettings['type'];
  label: string;
  icon: string;
  description: string;
}> = [
  { id: 'raise', label: 'Raise', icon: '↑', description: 'Raise terrain height' },
  { id: 'lower', label: 'Lower', icon: '↓', description: 'Lower terrain height' },
  { id: 'smooth', label: 'Smooth', icon: '◎', description: 'Smooth terrain variations' },
  { id: 'flatten', label: 'Flatten', icon: '▬', description: 'Flatten to target height' },
  { id: 'noise', label: 'Noise', icon: '◊', description: 'Add noise variation' },
  { id: 'paint', label: 'Paint', icon: '◐', description: 'Paint texture layers' },
  { id: 'erode', label: 'Erode', icon: '≈', description: 'Apply erosion effect' },
];

// Falloff types
const FALLOFF_TYPES: Array<{ id: BrushSettings['falloff']; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'sphere', label: 'Sphere' },
  { id: 'tip', label: 'Tip' },
];

// LOD levels configuration
interface LODLevel {
  distance: number;
  resolution: number;
  label: string;
}

const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { distance: 0, resolution: 1, label: 'Full Detail' },
  { distance: 100, resolution: 2, label: 'High' },
  { distance: 200, resolution: 4, label: 'Medium' },
  { distance: 400, resolution: 8, label: 'Low' },
  { distance: 800, resolution: 16, label: 'Very Low' },
];

interface TerrainEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onTerrainChange?: (terrain: TerrainInstance) => void;
  initialTerrain?: TerrainInstance;
}

export default function TerrainEditor({
  isOpen,
  onClose,
  onTerrainChange,
  initialTerrain,
}: TerrainEditorProps) {
  // Terrain state
  const [terrain, setTerrain] = useState<TerrainInstance | null>(initialTerrain || null);
  const [presets, setPresets] = useState<TerrainPreset[]>([]);

  // Brush state
  const [brush, setBrush] = useState<BrushSettings>({
    type: 'raise',
    size: 20,
    strength: 0.5,
    falloff: 'smooth',
    rotation: 0,
    spacing: 0.25,
    jitter: 0,
    targetHeight: 50,
    paintLayerIndex: 0,
    noiseScale: 0.1,
    noiseOctaves: 4,
  });

  // Erosion settings
  const [erosionSettings, setErosionSettings] = useState<ErosionSettings>({
    iterations: 50000,
    erosionStrength: 0.3,
    depositionStrength: 0.3,
    sedimentCapacity: 4,
    evaporationRate: 0.02,
    minSlope: 0.01,
    gravity: 4,
    rainAmount: 1,
    thermalErosion: true,
    thermalStrength: 0.5,
    thermalAngle: 30,
  });

  // LOD state
  const [lodLevels, setLodLevels] = useState<LODLevel[]>(DEFAULT_LOD_LEVELS);
  const [lodEnabled, setLodEnabled] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<'sculpt' | 'paint' | 'generate' | 'lod'>('sculpt');
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [showErosionPanel, setShowErosionPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'heightmap' | 'textured' | 'wireframe'>('heightmap');

  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Load presets on mount
  useEffect(() => {
    setPresets(terrainEditor3D.getPresets());
  }, []);

  // Create new terrain
  const handleCreateTerrain = useCallback((width = 256, depth = 256, resolution = 257) => {
    const newTerrain = terrainEditor3D.createTerrain({
      name: `Terrain ${Date.now()}`,
      width,
      depth,
      height: 100,
      resolution,
    });
    setTerrain(newTerrain);
    onTerrainChange?.(newTerrain);
  }, [onTerrainChange]);

  // Generate from preset
  const handleGenerateFromPreset = useCallback(async (preset: TerrainPreset) => {
    setIsGenerating(true);
    try {
      const newTerrain = terrainEditor3D.generateFromPreset(preset.id, {
        name: preset.name,
        width: 256,
        depth: 256,
        height: 100,
        resolution: 257,
      });
      if (newTerrain) {
        setTerrain(newTerrain);
        onTerrainChange?.(newTerrain);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [onTerrainChange]);

  // Apply brush stroke
  const handleBrushStroke = useCallback((x: number, z: number) => {
    if (!terrain) return;

    if (brush.type === 'paint') {
      terrainEditor3D.paintLayer(terrain.id, x, z, brush.paintLayerIndex || 0, brush);
    } else if (brush.type !== 'erode') {
      terrainEditor3D.applyBrush(terrain.id, x, z, brush);
    }

    setTerrain({ ...terrain });
  }, [terrain, brush]);

  // Apply erosion
  const handleApplyErosion = useCallback(() => {
    if (!terrain) return;

    setIsGenerating(true);
    try {
      terrainEditor3D.applyHydraulicErosion(terrain.id, erosionSettings);
      setTerrain({ ...terrain });
      onTerrainChange?.(terrain);
    } finally {
      setIsGenerating(false);
    }
  }, [terrain, erosionSettings, onTerrainChange]);

  // Add texture layer
  const handleAddLayer = useCallback(() => {
    if (!terrain) return;

    const newLayer: TerrainLayer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${terrain.layers.length + 1}`,
      texture: 'default',
      tiling: [10, 10],
      metallic: 0,
      smoothness: 0.3,
      blend: 'height',
      heightBlend: { min: 0, max: 100, falloff: 10 },
    };

    terrainEditor3D.addLayer(terrain.id, newLayer);
    setTerrain({ ...terrain });
  }, [terrain]);

  // Auto-generate splat maps
  const handleAutoSplatMaps = useCallback(() => {
    if (!terrain) return;

    terrainEditor3D.autoGenerateSplatMaps(terrain.id);
    setTerrain({ ...terrain });
    onTerrainChange?.(terrain);
  }, [terrain, onTerrainChange]);

  // Export heightmap as image
  const handleExportHeightmap = useCallback(() => {
    if (!terrain) return;

    const dataUrl = terrainEditor3D.exportHeightmapAsImage(terrain.id);
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${terrain.config.name}_heightmap.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [terrain]);

  // Import heightmap from image
  const handleImportHeightmap = useCallback(async (file: File) => {
    if (!terrain) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await terrainEditor3D.importHeightmapFromImage(terrain.id, dataUrl);
        setTerrain({ ...terrain });
        onTerrainChange?.(terrain);
      }
    };
    reader.readAsDataURL(file);
  }, [terrain, onTerrainChange]);

  // Draw heightmap preview
  const drawHeightmapPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !terrain) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, data, minHeight, maxHeight } = terrain.heightmap;
    const range = maxHeight - minHeight || 1;

    // Resize canvas to match heightmap
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < data.length; i++) {
      const normalized = ((data[i] - minHeight) / range) * 255;
      const idx = i * 4;

      if (previewMode === 'heightmap') {
        // Grayscale heightmap
        imageData.data[idx] = normalized;
        imageData.data[idx + 1] = normalized;
        imageData.data[idx + 2] = normalized;
      } else if (previewMode === 'textured') {
        // Color-coded by height
        const h = normalized / 255;
        if (h < 0.3) {
          // Water/sand
          imageData.data[idx] = 194;
          imageData.data[idx + 1] = 178;
          imageData.data[idx + 2] = 128;
        } else if (h < 0.6) {
          // Grass
          imageData.data[idx] = 34 + h * 50;
          imageData.data[idx + 1] = 139 + h * 30;
          imageData.data[idx + 2] = 34;
        } else if (h < 0.85) {
          // Rock
          imageData.data[idx] = 105 + h * 20;
          imageData.data[idx + 1] = 105 + h * 20;
          imageData.data[idx + 2] = 105 + h * 20;
        } else {
          // Snow
          imageData.data[idx] = 240;
          imageData.data[idx + 1] = 248;
          imageData.data[idx + 2] = 255;
        }
      }
      imageData.data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw wireframe overlay if enabled
    if (previewMode === 'wireframe') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.5;
      const step = Math.max(1, Math.floor(width / 32));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          if (x + step < width) ctx.lineTo(x + step, y);
          if (y + step < height) ctx.lineTo(x, y + step);
          ctx.stroke();
        }
      }
    }
  }, [terrain, previewMode]);

  // Redraw preview when terrain changes
  useEffect(() => {
    drawHeightmapPreview();
  }, [terrain, previewMode, drawHeightmapPreview]);

  // Mouse handlers for canvas painting
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!terrain) return;

    isDrawingRef.current = true;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to world coordinates
    const worldX = (x / canvas.width - 0.5) * terrain.config.width;
    const worldZ = (y / canvas.height - 0.5) * terrain.config.depth;

    lastPosRef.current = { x: worldX, y: worldZ };
    handleBrushStroke(worldX, worldZ);
  }, [terrain, handleBrushStroke]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !terrain) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const worldX = (x / canvas.width - 0.5) * terrain.config.width;
    const worldZ = (y / canvas.height - 0.5) * terrain.config.depth;

    // Apply spacing
    if (lastPosRef.current) {
      const dx = worldX - lastPosRef.current.x;
      const dy = worldZ - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = brush.size * brush.spacing;

      if (dist >= minDist) {
        handleBrushStroke(worldX, worldZ);
        lastPosRef.current = { x: worldX, y: worldZ };
      }
    }
  }, [terrain, brush, handleBrushStroke]);

  const handleCanvasMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    if (terrain) {
      onTerrainChange?.(terrain);
    }
  }, [terrain, onTerrainChange]);

  // LOD preview calculation
  const lodPreview = useMemo(() => {
    if (!terrain || !lodEnabled) return null;

    const { width, height } = terrain.heightmap;
    return lodLevels.map((level) => ({
      ...level,
      vertexCount: Math.ceil(width / level.resolution) * Math.ceil(height / level.resolution),
      triangleCount: Math.ceil(width / level.resolution - 1) * Math.ceil(height / level.resolution - 1) * 2,
    }));
  }, [terrain, lodLevels, lodEnabled]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-[1200px] h-[800px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Terrain Editor</h2>
            {terrain && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                {terrain.config.name}
              </span>
            )}
            {isGenerating && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded animate-pulse">
                Generating...
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Tools */}
          <div className="w-72 border-r border-subtle flex flex-col bg-black/20">
            {/* Tabs */}
            <div className="flex border-b border-subtle">
              {(['sculpt', 'paint', 'generate', 'lod'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-accent/20 text-accent border-b-2 border-accent'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Sculpt Tab */}
              {activeTab === 'sculpt' && (
                <>
                  {/* Brush Type */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-2">Brush Type</label>
                    <div className="grid grid-cols-4 gap-1">
                      {BRUSH_TYPES.filter(b => b.id !== 'paint').map((brushType) => (
                        <button
                          key={brushType.id}
                          onClick={() => setBrush({ ...brush, type: brushType.id })}
                          className={`p-2 rounded text-sm transition-colors ${
                            brush.type === brushType.id
                              ? 'bg-accent text-white'
                              : 'bg-subtle text-text-secondary hover:bg-subtle/80'
                          }`}
                          title={brushType.description}
                        >
                          {brushType.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brush Size */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">
                      Size: {brush.size}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={brush.size}
                      onChange={(e) => setBrush({ ...brush, size: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>

                  {/* Brush Strength */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">
                      Strength: {(brush.strength * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={brush.strength * 100}
                      onChange={(e) => setBrush({ ...brush, strength: Number(e.target.value) / 100 })}
                      className="w-full accent-accent"
                    />
                  </div>

                  {/* Falloff */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-2">Falloff</label>
                    <div className="grid grid-cols-4 gap-1">
                      {FALLOFF_TYPES.map((falloff) => (
                        <button
                          key={falloff.id}
                          onClick={() => setBrush({ ...brush, falloff: falloff.id })}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            brush.falloff === falloff.id
                              ? 'bg-accent text-white'
                              : 'bg-subtle text-text-secondary hover:bg-subtle/80'
                          }`}
                        >
                          {falloff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flatten Target Height */}
                  {brush.type === 'flatten' && (
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">
                        Target Height: {brush.targetHeight}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={brush.targetHeight || 50}
                        onChange={(e) => setBrush({ ...brush, targetHeight: Number(e.target.value) })}
                        className="w-full accent-accent"
                      />
                    </div>
                  )}

                  {/* Noise Settings */}
                  {brush.type === 'noise' && (
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">
                        Noise Scale: {brush.noiseScale?.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={(brush.noiseScale || 0.1) * 100}
                        onChange={(e) => setBrush({ ...brush, noiseScale: Number(e.target.value) / 100 })}
                        className="w-full accent-accent"
                      />
                    </div>
                  )}

                  {/* Erosion Panel Toggle */}
                  <button
                    onClick={() => setShowErosionPanel(!showErosionPanel)}
                    className="w-full px-3 py-2 text-xs bg-subtle rounded hover:bg-subtle/80 transition-colors text-text-primary"
                  >
                    {showErosionPanel ? '▼' : '▶'} Erosion Settings
                  </button>

                  {/* Erosion Settings Panel */}
                  {showErosionPanel && (
                    <div className="space-y-3 p-3 bg-canvas rounded">
                      <div>
                        <label className="text-xs text-text-secondary block mb-1">
                          Iterations: {erosionSettings.iterations}
                        </label>
                        <input
                          type="range"
                          min="1000"
                          max="100000"
                          step="1000"
                          value={erosionSettings.iterations}
                          onChange={(e) => setErosionSettings({ ...erosionSettings, iterations: Number(e.target.value) })}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary block mb-1">
                          Erosion: {(erosionSettings.erosionStrength * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={erosionSettings.erosionStrength * 100}
                          onChange={(e) => setErosionSettings({ ...erosionSettings, erosionStrength: Number(e.target.value) / 100 })}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={erosionSettings.thermalErosion}
                          onChange={(e) => setErosionSettings({ ...erosionSettings, thermalErosion: e.target.checked })}
                          className="accent-accent"
                        />
                        <label className="text-xs text-text-secondary">Thermal Erosion</label>
                      </div>
                      <button
                        onClick={handleApplyErosion}
                        disabled={!terrain || isGenerating}
                        className="w-full px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        Apply Erosion
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Paint Tab */}
              {activeTab === 'paint' && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">Texture Layers</label>
                    <button
                      onClick={handleAddLayer}
                      disabled={!terrain}
                      className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Layer List */}
                  <div className="space-y-2">
                    {terrain?.layers.map((layer, index) => (
                      <div
                        key={layer.id}
                        onClick={() => {
                          setSelectedLayer(index);
                          setBrush({ ...brush, type: 'paint', paintLayerIndex: index });
                        }}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          selectedLayer === index
                            ? 'bg-accent/20 border border-accent'
                            : 'bg-subtle hover:bg-subtle/80 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-primary">{layer.name}</span>
                          <span className="text-[10px] text-text-tertiary">{layer.blend}</span>
                        </div>
                        <div className="text-[10px] text-text-tertiary mt-1">
                          Tiling: {layer.tiling[0]}x{layer.tiling[1]}
                        </div>
                      </div>
                    ))}

                    {(!terrain || terrain.layers.length === 0) && (
                      <div className="text-xs text-text-tertiary text-center py-4">
                        No layers. Add a layer to start painting.
                      </div>
                    )}
                  </div>

                  {/* Paint Brush Settings */}
                  {brush.type === 'paint' && (
                    <div className="space-y-3 pt-3 border-t border-subtle">
                      <div>
                        <label className="text-xs text-text-secondary block mb-1">
                          Brush Size: {brush.size}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={brush.size}
                          onChange={(e) => setBrush({ ...brush, size: Number(e.target.value) })}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary block mb-1">
                          Opacity: {(brush.strength * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={brush.strength * 100}
                          onChange={(e) => setBrush({ ...brush, strength: Number(e.target.value) / 100 })}
                          className="w-full accent-accent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Auto-generate Button */}
                  <button
                    onClick={handleAutoSplatMaps}
                    disabled={!terrain || terrain.layers.length === 0}
                    className="w-full px-3 py-2 text-xs bg-subtle text-text-primary rounded hover:bg-subtle/80 disabled:opacity-50 transition-colors"
                  >
                    Auto-Generate from Height/Slope
                  </button>
                </>
              )}

              {/* Generate Tab */}
              {activeTab === 'generate' && (
                <>
                  {/* Create New Terrain */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-2">Create New</label>
                    <button
                      onClick={() => handleCreateTerrain()}
                      className="w-full px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                    >
                      + New Terrain (256x256)
                    </button>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-2">Presets</label>
                    <div className="space-y-2">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleGenerateFromPreset(preset)}
                          disabled={isGenerating}
                          className="w-full p-3 text-left bg-subtle rounded hover:bg-subtle/80 disabled:opacity-50 transition-colors"
                        >
                          <div className="text-xs text-text-primary font-medium">{preset.name}</div>
                          <div className="text-[10px] text-text-tertiary mt-1">
                            {preset.description}
                          </div>
                          <div className="text-[10px] text-accent mt-1">
                            Generator: {preset.generator}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Import/Export */}
                  <div className="pt-3 border-t border-subtle space-y-2">
                    <label className="text-xs text-text-secondary block">Import/Export</label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportHeightmap}
                        disabled={!terrain}
                        className="flex-1 px-3 py-2 text-xs bg-subtle text-text-primary rounded hover:bg-subtle/80 disabled:opacity-50"
                      >
                        Export PNG
                      </button>
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImportHeightmap(file);
                          }}
                          className="hidden"
                        />
                        <span className="block px-3 py-2 text-xs bg-subtle text-text-primary rounded hover:bg-subtle/80 cursor-pointer text-center">
                          Import PNG
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* LOD Tab */}
              {activeTab === 'lod' && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">Level of Detail</label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={lodEnabled}
                        onChange={(e) => setLodEnabled(e.target.checked)}
                        className="accent-accent"
                      />
                      <span className="text-xs text-text-primary">Enabled</span>
                    </label>
                  </div>

                  {/* LOD Levels */}
                  <div className="space-y-3">
                    {lodLevels.map((level, index) => (
                      <div key={index} className="p-3 bg-canvas rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-text-primary font-medium">{level.label}</span>
                          <span className="text-[10px] text-text-tertiary">
                            1/{level.resolution} resolution
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] text-text-tertiary block mb-1">
                            Distance: {level.distance}m
                          </label>
                          <input
                            type="range"
                            min={index === 0 ? 0 : lodLevels[index - 1].distance + 10}
                            max="1000"
                            value={level.distance}
                            onChange={(e) => {
                              const newLevels = [...lodLevels];
                              newLevels[index] = { ...level, distance: Number(e.target.value) };
                              setLodLevels(newLevels);
                            }}
                            disabled={index === 0}
                            className="w-full accent-accent"
                          />
                        </div>
                        {lodPreview && lodPreview[index] && (
                          <div className="text-[10px] text-text-tertiary mt-2">
                            Vertices: {lodPreview[index].vertexCount.toLocaleString()} |
                            Triangles: {lodPreview[index].triangleCount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add/Remove LOD Level */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const lastLevel = lodLevels[lodLevels.length - 1];
                        setLodLevels([
                          ...lodLevels,
                          {
                            distance: lastLevel.distance + 200,
                            resolution: lastLevel.resolution * 2,
                            label: `LOD ${lodLevels.length}`,
                          },
                        ]);
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent-hover"
                    >
                      + Add Level
                    </button>
                    <button
                      onClick={() => {
                        if (lodLevels.length > 1) {
                          setLodLevels(lodLevels.slice(0, -1));
                        }
                      }}
                      disabled={lodLevels.length <= 1}
                      className="flex-1 px-3 py-2 text-xs bg-subtle text-text-primary rounded hover:bg-subtle/80 disabled:opacity-50"
                    >
                      Remove Last
                    </button>
                  </div>

                  {/* LOD Info */}
                  <div className="p-3 bg-canvas rounded text-[10px] text-text-tertiary">
                    <p className="mb-2">
                      LOD automatically reduces terrain detail based on camera distance,
                      improving performance while maintaining visual quality.
                    </p>
                    <p>
                      Total LOD levels: {lodLevels.length}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center - Preview Canvas */}
          <div className="flex-1 flex flex-col bg-black/30">
            {/* Preview Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                {(['heightmap', 'textured', 'wireframe'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      previewMode === mode
                        ? 'bg-accent text-white'
                        : 'bg-subtle text-text-secondary hover:text-white'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              {terrain && (
                <div className="text-xs text-text-tertiary">
                  {terrain.config.width} x {terrain.config.depth} |
                  Resolution: {terrain.heightmap.width}
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              {terrain ? (
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-full border border-subtle rounded cursor-crosshair"
                  style={{ imageRendering: 'pixelated' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              ) : (
                <div className="text-center text-text-tertiary">
                  <div className="text-4xl mb-4 opacity-50">⛰️</div>
                  <p className="text-sm">No terrain created</p>
                  <p className="text-xs mt-1">Go to Generate tab to create a terrain</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Info */}
          <div className="w-56 border-l border-subtle bg-black/20 p-3 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-text-secondary mb-2">Terrain Info</h3>
              {terrain ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Size</span>
                    <span className="text-text-primary">
                      {terrain.config.width} x {terrain.config.depth}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Height Range</span>
                    <span className="text-text-primary">
                      {terrain.heightmap.minHeight.toFixed(1)} - {terrain.heightmap.maxHeight.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Resolution</span>
                    <span className="text-text-primary">{terrain.heightmap.width}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Layers</span>
                    <span className="text-text-primary">{terrain.layers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Trees</span>
                    <span className="text-text-primary">{terrain.treeInstances.length}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-text-tertiary">No terrain</div>
              )}
            </div>

            {/* Brush Preview */}
            <div>
              <h3 className="text-xs font-medium text-text-secondary mb-2">Current Brush</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Type</span>
                  <span className="text-accent">{brush.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Size</span>
                  <span className="text-text-primary">{brush.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Strength</span>
                  <span className="text-text-primary">{(brush.strength * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Falloff</span>
                  <span className="text-text-primary">{brush.falloff}</span>
                </div>
              </div>
            </div>

            {/* LOD Preview */}
            {lodEnabled && lodPreview && (
              <div>
                <h3 className="text-xs font-medium text-text-secondary mb-2">LOD Levels</h3>
                <div className="space-y-1 text-[10px]">
                  {lodPreview.slice(0, 3).map((level, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-text-tertiary">{level.label}</span>
                      <span className="text-text-primary">{level.triangleCount.toLocaleString()} tris</span>
                    </div>
                  ))}
                  {lodPreview.length > 3 && (
                    <div className="text-text-tertiary">+{lodPreview.length - 3} more levels</div>
                  )}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            <div>
              <h3 className="text-xs font-medium text-text-secondary mb-2">Shortcuts</h3>
              <div className="space-y-1 text-[10px] text-text-tertiary">
                <div>Click + Drag to paint</div>
                <div>[ ] = Brush size</div>
                <div>Shift + Click = Smooth</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {terrain ? `${terrain.layers.length} layers • LOD: ${lodEnabled ? 'On' : 'Off'}` : 'No terrain'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (terrain) {
                  onTerrainChange?.(terrain);
                }
                onClose();
              }}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Export LOD configuration types
export type { LODLevel };
export { DEFAULT_LOD_LEVELS };
