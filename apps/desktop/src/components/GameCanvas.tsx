import { useEffect, useRef, useState, useCallback } from 'react';
import { Runtime2D } from '@promptplay/runtime-2d';
import type { GameSpec } from '@promptplay/shared-types';

interface GameCanvasProps {
  gameSpec: GameSpec | null;
  isPlaying: boolean;
  selectedEntity: string | null;
  onEntitySelect?: (entityName: string | null) => void;
  onReset?: () => void;
}

export default function GameCanvas({
  gameSpec,
  isPlaying,
  selectedEntity,
  onEntitySelect,
  onReset,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Handle canvas click to select entities - using runtime's ECS state
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !runtimeRef.current || !onEntitySelect) return;

      const rect = canvasRef.current.getBoundingClientRect();
      // Scale click coordinates to match internal canvas resolution
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Use runtime's method to find entity at point (uses same ECS state as renderer)
      const entityName = runtimeRef.current.getEntityAtPoint(x, y);
      onEntitySelect(entityName);
    },
    [onEntitySelect]
  );

  // Get selected entity bounds from runtime's ECS state (same source as renderer)
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
  }, [selectedEntity, gameSpec]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-gray-900"
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 z-10">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Error Loading Game
            </h3>
            <p className="text-sm text-gray-700">{error}</p>
            {onReset && (
              <button
                onClick={onReset}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {!gameSpec && !error && (
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">No game loaded</p>
          <p className="text-sm">Open a game project to begin</p>
        </div>
      )}

      <div className="relative" style={{ width: 800, height: 600 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="rounded-lg shadow-xl cursor-crosshair absolute top-0 left-0"
          style={{ display: gameSpec && !error ? 'block' : 'none' }}
          onClick={handleCanvasClick}
        />

        {/* Selection highlight overlay */}
        {selectedBounds && gameSpec && !error && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500 bg-opacity-10 rounded-sm"
            style={{
              left: `${selectedBounds.x}px`,
              top: `${selectedBounds.y}px`,
              width: `${selectedBounds.width}px`,
              height: `${selectedBounds.height}px`,
            }}
          >
            {/* Entity name label */}
            <div className="absolute -top-5 left-0 text-xs text-blue-400 font-medium whitespace-nowrap bg-gray-900 bg-opacity-75 px-1 rounded">
              {selectedBounds.entityName}
            </div>
            {/* Corner handles */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-sm" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-sm" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-sm" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
