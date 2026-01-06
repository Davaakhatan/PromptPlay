/**
 * useWebGPU Hook - React hook for WebGPU integration with automatic fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { webGPURenderer, type WebGPUCapabilities, type RenderStats } from '../services/WebGPURenderer';

export type RendererType = 'webgpu' | 'webgl' | 'detecting';

export interface WebGPUState {
  rendererType: RendererType;
  isSupported: boolean;
  isInitialized: boolean;
  capabilities: WebGPUCapabilities | null;
  stats: RenderStats;
  error: string | null;
}

export interface UseWebGPUOptions {
  canvas?: HTMLCanvasElement | null;
  preferWebGPU?: boolean;
  powerPreference?: 'low-power' | 'high-performance';
  onInitialized?: (type: RendererType) => void;
  onError?: (error: string) => void;
}

export interface UseWebGPUResult extends WebGPUState {
  initialize: (canvas: HTMLCanvasElement) => Promise<RendererType>;
  dispose: () => void;
  getCapabilities: () => Promise<WebGPUCapabilities>;
  refreshStats: () => void;
}

export function useWebGPU(options: UseWebGPUOptions = {}): UseWebGPUResult {
  const {
    canvas: initialCanvas,
    preferWebGPU = true,
    powerPreference = 'high-performance',
    onInitialized,
    onError,
  } = options;

  const [state, setState] = useState<WebGPUState>({
    rendererType: 'detecting',
    isSupported: false,
    isInitialized: false,
    capabilities: null,
    stats: {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      textureMemory: 0,
      bufferMemory: 0,
      pipelineCount: 0,
    },
    error: null,
  });

  const initializedRef = useRef(false);

  // Initialize WebGPU or fallback to WebGL
  const initialize = useCallback(async (canvas: HTMLCanvasElement): Promise<RendererType> => {
    if (initializedRef.current) {
      return state.rendererType === 'detecting' ? 'webgl' : state.rendererType;
    }

    setState(prev => ({ ...prev, rendererType: 'detecting', error: null }));

    // Check if WebGPU is available and preferred
    if (preferWebGPU) {
      const supported = await webGPURenderer.checkSupport();

      if (supported) {
        try {
          const width = canvas.clientWidth || 800;
          const height = canvas.clientHeight || 600;

          const success = await webGPURenderer.initialize({
            canvas,
            width,
            height,
            pixelRatio: window.devicePixelRatio || 1,
            powerPreference,
          });

          if (success) {
            const capabilities = await webGPURenderer.getCapabilities();

            setState({
              rendererType: 'webgpu',
              isSupported: true,
              isInitialized: true,
              capabilities,
              stats: webGPURenderer.getStats(),
              error: null,
            });

            initializedRef.current = true;
            onInitialized?.('webgpu');
            return 'webgpu';
          }
        } catch (error) {
          console.warn('WebGPU initialization failed:', error);
          const errorMsg = error instanceof Error ? error.message : 'WebGPU initialization failed';
          onError?.(errorMsg);
        }
      }
    }

    // Fallback to WebGL
    setState({
      rendererType: 'webgl',
      isSupported: false,
      isInitialized: true,
      capabilities: null,
      stats: {
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        triangles: 0,
        textureMemory: 0,
        bufferMemory: 0,
        pipelineCount: 0,
      },
      error: preferWebGPU ? 'WebGPU not available, using WebGL fallback' : null,
    });

    initializedRef.current = true;
    onInitialized?.('webgl');
    return 'webgl';
  }, [preferWebGPU, powerPreference, onInitialized, onError, state.rendererType]);

  // Dispose resources
  const dispose = useCallback(() => {
    if (state.rendererType === 'webgpu') {
      webGPURenderer.dispose();
    }
    initializedRef.current = false;
    setState({
      rendererType: 'detecting',
      isSupported: false,
      isInitialized: false,
      capabilities: null,
      stats: {
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        triangles: 0,
        textureMemory: 0,
        bufferMemory: 0,
        pipelineCount: 0,
      },
      error: null,
    });
  }, [state.rendererType]);

  // Get capabilities
  const getCapabilities = useCallback(async (): Promise<WebGPUCapabilities> => {
    return webGPURenderer.getCapabilities();
  }, []);

  // Refresh stats
  const refreshStats = useCallback(() => {
    if (state.rendererType === 'webgpu') {
      setState(prev => ({
        ...prev,
        stats: webGPURenderer.getStats(),
      }));
    }
  }, [state.rendererType]);

  // Auto-initialize if canvas is provided
  useEffect(() => {
    if (initialCanvas && !initializedRef.current) {
      initialize(initialCanvas);
    }
  }, [initialCanvas, initialize]);

  // Listen for WebGPU events
  useEffect(() => {
    const handleError = (data: unknown) => {
      const errorData = data as { message?: string };
      setState(prev => ({
        ...prev,
        error: errorData.message || 'Unknown WebGPU error',
      }));
      onError?.(errorData.message || 'Unknown WebGPU error');
    };

    const handleLost = () => {
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: 'WebGPU device lost',
      }));
    };

    const handleFrame = (data: unknown) => {
      const stats = data as RenderStats;
      setState(prev => ({
        ...prev,
        stats,
      }));
    };

    webGPURenderer.on('error', handleError);
    webGPURenderer.on('lost', handleLost);
    webGPURenderer.on('frame', handleFrame);

    return () => {
      webGPURenderer.off('error', handleError);
      webGPURenderer.off('lost', handleLost);
      webGPURenderer.off('frame', handleFrame);
    };
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initializedRef.current && state.rendererType === 'webgpu') {
        webGPURenderer.dispose();
      }
    };
  }, [state.rendererType]);

  return {
    ...state,
    initialize,
    dispose,
    getCapabilities,
    refreshStats,
  };
}

export default useWebGPU;
