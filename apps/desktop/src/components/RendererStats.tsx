/**
 * RendererStats Component - Display and compare WebGPU/WebGL performance
 */

import { useState, useEffect } from 'react';
import { webGPURenderer, type RenderStats, type WebGPUCapabilities } from '../services/WebGPURenderer';

interface RendererStatsProps {
  rendererType: 'webgpu' | 'webgl' | 'detecting';
  isVisible?: boolean;
  showCapabilities?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  onClose?: () => void;
}

interface PerformanceHistory {
  fps: number[];
  frameTime: number[];
  maxSamples: number;
}

export function RendererStats({
  rendererType,
  isVisible = true,
  showCapabilities = false,
  position = 'bottom-right',
  className = '',
  onClose,
}: RendererStatsProps) {
  const [stats, setStats] = useState<RenderStats>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    textureMemory: 0,
    bufferMemory: 0,
    pipelineCount: 0,
  });

  const [capabilities, setCapabilities] = useState<WebGPUCapabilities | null>(null);
  const [history, setHistory] = useState<PerformanceHistory>({
    fps: [],
    frameTime: [],
    maxSamples: 60,
  });

  const [expanded, setExpanded] = useState(false);

  // Update stats periodically
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      if (rendererType === 'webgpu') {
        const currentStats = webGPURenderer.getStats();
        setStats(currentStats);

        // Update history
        setHistory(prev => ({
          ...prev,
          fps: [...prev.fps.slice(-(prev.maxSamples - 1)), currentStats.fps],
          frameTime: [...prev.frameTime.slice(-(prev.maxSamples - 1)), currentStats.frameTime],
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [rendererType, isVisible]);

  // Fetch capabilities once
  useEffect(() => {
    if (showCapabilities && rendererType === 'webgpu') {
      webGPURenderer.getCapabilities().then(setCapabilities);
    }
  }, [showCapabilities, rendererType]);

  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  const avgFps = history.fps.length > 0
    ? Math.round(history.fps.reduce((a, b) => a + b, 0) / history.fps.length)
    : 0;

  const avgFrameTime = history.frameTime.length > 0
    ? (history.frameTime.reduce((a, b) => a + b, 0) / history.frameTime.length).toFixed(2)
    : '0.00';

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getRendererBadgeColor = () => {
    switch (rendererType) {
      case 'webgpu': return 'bg-green-500';
      case 'webgl': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} z-50 font-mono text-xs ${className}`}
    >
      <div
        className="bg-panel/90 backdrop-blur-sm rounded-lg border border-subtle shadow-lg overflow-hidden"
        style={{ minWidth: expanded ? '280px' : '140px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-subtle/50 cursor-pointer hover:bg-subtle/80 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getRendererBadgeColor()}`} />
            <span className="text-text-secondary uppercase tracking-wide">
              {rendererType === 'detecting' ? 'Detecting...' : rendererType.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <svg
              className={`w-3 h-3 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="ml-1 p-0.5 text-text-tertiary hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Close (View > Renderer Stats to reopen)"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Basic Stats */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-tertiary">FPS</span>
            <span className={`font-bold ${stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
              {stats.fps} <span className="text-text-tertiary font-normal">({avgFps} avg)</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Frame</span>
            <span className="text-text-primary">{stats.frameTime.toFixed(2)}ms <span className="text-text-tertiary">({avgFrameTime}ms avg)</span></span>
          </div>
        </div>

        {/* Expanded Stats */}
        {expanded && (
          <>
            <div className="border-t border-subtle" />
            <div className="px-3 py-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Draw Calls</span>
                <span className="text-text-primary">{stats.drawCalls}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Triangles</span>
                <span className="text-text-primary">{stats.triangles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Pipelines</span>
                <span className="text-text-primary">{stats.pipelineCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Textures</span>
                <span className="text-text-primary">{formatMemory(stats.textureMemory)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Buffers</span>
                <span className="text-text-primary">{formatMemory(stats.bufferMemory)}</span>
              </div>
            </div>

            {/* FPS Graph */}
            <div className="border-t border-subtle px-3 py-2">
              <div className="text-text-tertiary mb-1">FPS History</div>
              <div className="h-8 flex items-end gap-px">
                {history.fps.map((fps, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${fps >= 55 ? 'bg-green-500' : fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ height: `${Math.min(100, (fps / 60) * 100)}%`, opacity: 0.3 + (i / history.fps.length) * 0.7 }}
                  />
                ))}
              </div>
            </div>

            {/* Capabilities (WebGPU only) */}
            {showCapabilities && capabilities && rendererType === 'webgpu' && (
              <>
                <div className="border-t border-subtle" />
                <div className="px-3 py-2 space-y-1">
                  <div className="text-text-tertiary mb-1">Capabilities</div>
                  <div className="text-text-primary text-[10px] break-all">
                    {capabilities.adapter}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Format</span>
                    <span className="text-text-primary">{capabilities.preferredFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Features</span>
                    <span className="text-text-primary">{capabilities.features.length}</span>
                  </div>
                  {capabilities.limits.maxTextureDimension2D && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Max Texture</span>
                      <span className="text-text-primary">{capabilities.limits.maxTextureDimension2D}px</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Fallback Info (WebGL) */}
            {rendererType === 'webgl' && (
              <>
                <div className="border-t border-subtle" />
                <div className="px-3 py-2">
                  <div className="text-yellow-400 text-[10px]">
                    WebGPU not available. Using WebGL fallback.
                  </div>
                  <div className="text-text-tertiary text-[10px] mt-1">
                    For WebGPU support, use Chrome 113+ or Firefox 121+
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Performance comparison panel for benchmarking
export function PerformanceComparisonPanel({
  webgpuStats,
  webglStats,
  className = '',
}: {
  webgpuStats?: RenderStats;
  webglStats?: RenderStats;
  className?: string;
}) {
  const formatValue = (value: number | undefined, suffix = '') => {
    if (value === undefined) return '-';
    return `${value.toFixed(2)}${suffix}`;
  };

  const getSpeedupColor = (speedup: number) => {
    if (speedup > 1.5) return 'text-green-400';
    if (speedup > 1.1) return 'text-green-300';
    if (speedup > 0.9) return 'text-text-primary';
    return 'text-red-400';
  };

  const calculateSpeedup = (webgpu?: number, webgl?: number) => {
    if (!webgpu || !webgl || webgl === 0) return null;
    return webgl / webgpu; // Lower frame time = faster
  };

  const frameTimeSpeedup = calculateSpeedup(webgpuStats?.frameTime, webglStats?.frameTime);

  return (
    <div className={`bg-panel rounded-lg border border-subtle p-4 ${className}`}>
      <h3 className="text-text-primary font-medium mb-3">Performance Comparison</h3>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-text-tertiary">Metric</div>
        <div className="text-center text-green-400">WebGPU</div>
        <div className="text-center text-yellow-400">WebGL</div>

        <div className="text-text-tertiary">FPS</div>
        <div className="text-center text-text-primary">{webgpuStats?.fps ?? '-'}</div>
        <div className="text-center text-text-primary">{webglStats?.fps ?? '-'}</div>

        <div className="text-text-tertiary">Frame Time</div>
        <div className="text-center text-text-primary">{formatValue(webgpuStats?.frameTime, 'ms')}</div>
        <div className="text-center text-text-primary">{formatValue(webglStats?.frameTime, 'ms')}</div>

        <div className="text-text-tertiary">Draw Calls</div>
        <div className="text-center text-text-primary">{webgpuStats?.drawCalls ?? '-'}</div>
        <div className="text-center text-text-primary">{webglStats?.drawCalls ?? '-'}</div>

        <div className="text-text-tertiary">Triangles</div>
        <div className="text-center text-text-primary">{webgpuStats?.triangles?.toLocaleString() ?? '-'}</div>
        <div className="text-center text-text-primary">{webglStats?.triangles?.toLocaleString() ?? '-'}</div>
      </div>

      {frameTimeSpeedup !== null && (
        <div className="mt-3 pt-3 border-t border-subtle">
          <div className="flex justify-between items-center">
            <span className="text-text-tertiary text-xs">WebGPU Speedup</span>
            <span className={`font-bold ${getSpeedupColor(frameTimeSpeedup)}`}>
              {frameTimeSpeedup.toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RendererStats;
