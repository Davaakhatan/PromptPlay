import { useState, useEffect, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { CloseIcon, ImageIcon } from './Icons';

interface SpriteSheetImporterProps {
  projectPath: string;
  onImport: (config: SpriteSheetConfig) => void;
  onClose: () => void;
}

export interface SpriteSheetConfig {
  path: string; // Relative path from project assets folder
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
}

export default function SpriteSheetImporter({
  projectPath,
  onImport,
  onClose,
}: SpriteSheetImporterProps) {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [frameWidth, setFrameWidth] = useState(32);
  const [frameHeight, setFrameHeight] = useState(32);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(4);
  const [autoDetect, setAutoDetect] = useState(true);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frameCount = columns * rows;

  // Load image when path changes
  useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      setImageDimensions(null);
      return;
    }

    const url = `file://${imagePath}`;
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });

      // Auto-detect frame dimensions if enabled
      if (autoDetect) {
        // Try to detect grid based on common frame sizes
        const possibleSizes = [8, 16, 24, 32, 48, 64, 128];

        for (const size of possibleSizes) {
          if (img.width % size === 0 && img.height % size === 0) {
            const cols = img.width / size;
            const rws = img.height / size;
            if (cols <= 16 && rws <= 16) {
              setFrameWidth(size);
              setFrameHeight(size);
              setColumns(cols);
              setRows(rws);
              break;
            }
          }
        }
      }
    };
    img.onerror = () => {
      setError('Failed to load image');
    };
    img.src = url;
  }, [imagePath, autoDetect]);

  // Update columns/rows when frame dimensions change
  useEffect(() => {
    if (imageDimensions && frameWidth > 0 && frameHeight > 0) {
      const newCols = Math.floor(imageDimensions.width / frameWidth);
      const newRows = Math.floor(imageDimensions.height / frameHeight);
      if (newCols > 0 && newRows > 0) {
        setColumns(newCols);
        setRows(newRows);
      }
    }
  }, [imageDimensions, frameWidth, frameHeight]);

  // Draw preview
  useEffect(() => {
    if (!canvasRef.current || !imageUrl || !imageDimensions) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scale to fit
      const scale = Math.min(
        canvas.width / imageDimensions.width,
        canvas.height / imageDimensions.height,
        2
      );

      const scaledWidth = imageDimensions.width * scale;
      const scaledHeight = imageDimensions.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;

      // Draw image
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Draw grid
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let i = 0; i <= columns; i++) {
          const x = offsetX + (i * frameWidth * scale);
          ctx.beginPath();
          ctx.moveTo(x, offsetY);
          ctx.lineTo(x, offsetY + scaledHeight);
          ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i <= rows; i++) {
          const y = offsetY + (i * frameHeight * scale);
          ctx.beginPath();
          ctx.moveTo(offsetX, y);
          ctx.lineTo(offsetX + scaledWidth, y);
          ctx.stroke();
        }

        // Highlight current preview frame
        const frameCol = previewFrame % columns;
        const frameRow = Math.floor(previewFrame / columns);
        ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          offsetX + frameCol * frameWidth * scale,
          offsetY + frameRow * frameHeight * scale,
          frameWidth * scale,
          frameHeight * scale
        );
      }
    };
    img.src = imageUrl;
  }, [imageUrl, imageDimensions, frameWidth, frameHeight, columns, rows, showGrid, previewFrame]);

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        }],
        defaultPath: `${projectPath}/assets`,
      });

      if (typeof selected === 'string') {
        setImagePath(selected);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
      setError('Failed to select file');
    }
  }, [projectPath]);

  const handleImport = useCallback(() => {
    if (!imagePath) return;

    // Get relative path from project assets folder
    const assetsPath = `${projectPath}/assets/`;
    let relativePath = imagePath;
    if (imagePath.startsWith(assetsPath)) {
      relativePath = imagePath.slice(assetsPath.length);
    } else {
      // File is outside assets folder, use filename only
      relativePath = imagePath.split('/').pop() || imagePath;
    }

    onImport({
      path: relativePath,
      frameWidth,
      frameHeight,
      frameCount,
      columns,
      rows,
    });
  }, [imagePath, projectPath, frameWidth, frameHeight, frameCount, columns, rows, onImport]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-panel-solid border border-subtle rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-subtle border-b border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Import Sprite Sheet</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* File selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Sprite Sheet Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imagePath || ''}
                readOnly
                placeholder="Select an image file..."
                className="flex-1 px-3 py-2 bg-canvas border border-subtle rounded-lg text-sm text-text-primary placeholder-text-tertiary"
              />
              <button
                onClick={handleSelectFile}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                Browse
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">Preview</label>
              <label className="flex items-center gap-2 text-xs text-text-tertiary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-subtle"
                />
                Show Grid
              </label>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg border border-subtle p-4">
              {imageUrl ? (
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="mx-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <p className="text-sm">Select an image to preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Frame configuration */}
          {imageDimensions && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoDetect"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  className="rounded border-subtle"
                />
                <label htmlFor="autoDetect" className="text-sm text-text-secondary cursor-pointer">
                  Auto-detect frame dimensions
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">Frame Width</label>
                  <input
                    type="number"
                    value={frameWidth}
                    onChange={(e) => setFrameWidth(parseInt(e.target.value) || 32)}
                    min={1}
                    max={imageDimensions.width}
                    className="w-full px-3 py-2 bg-canvas border border-subtle rounded-lg text-sm text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">Frame Height</label>
                  <input
                    type="number"
                    value={frameHeight}
                    onChange={(e) => setFrameHeight(parseInt(e.target.value) || 32)}
                    min={1}
                    max={imageDimensions.height}
                    className="w-full px-3 py-2 bg-canvas border border-subtle rounded-lg text-sm text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-text-tertiary">Columns</label>
                  <div className="px-3 py-2 bg-canvas/50 border border-subtle/50 rounded-lg text-sm text-text-secondary">
                    {columns}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-text-tertiary">Rows</label>
                  <div className="px-3 py-2 bg-canvas/50 border border-subtle/50 rounded-lg text-sm text-text-secondary">
                    {rows}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-text-tertiary">Total Frames</label>
                  <div className="px-3 py-2 bg-canvas/50 border border-subtle/50 rounded-lg text-sm text-text-secondary">
                    {frameCount}
                  </div>
                </div>
              </div>

              {/* Frame preview slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">
                  Preview Frame: {previewFrame}
                </label>
                <input
                  type="range"
                  min={0}
                  max={frameCount - 1}
                  value={previewFrame}
                  onChange={(e) => setPreviewFrame(parseInt(e.target.value))}
                  className="w-full h-2 bg-subtle rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Image info */}
              <div className="px-3 py-2 bg-canvas/50 rounded-lg border border-subtle/50">
                <p className="text-xs text-text-tertiary">
                  Image: {imageDimensions.width} x {imageDimensions.height}px |
                  Frame: {frameWidth} x {frameHeight}px |
                  Grid: {columns} x {rows} = {frameCount} frames
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-subtle border-t border-subtle flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!imagePath}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
