/**
 * useAssetPreloader Hook
 * Preloads game assets using the AssetPipeline service
 */

import { useState, useCallback } from 'react';
import { assetPipeline, AssetEntry, AssetType } from '../services/AssetPipeline';
import type { GameSpec } from '@promptplay/shared-types';

interface AssetPreloaderState {
  loading: boolean;
  progress: number;
  loadedCount: number;
  totalCount: number;
  error: string | null;
}

interface UseAssetPreloaderResult extends AssetPreloaderState {
  preloadFromSpec: (spec: GameSpec) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => { count: number; size: number; limit: number };
}

/**
 * Extract asset entries from a GameSpec
 */
function extractAssetsFromSpec(spec: GameSpec): AssetEntry[] {
  const assets: AssetEntry[] = [];
  const seenPaths = new Set<string>();

  // Helper to add asset if not already seen
  const addAsset = (path: string | undefined, type: AssetType, id?: string) => {
    if (!path || seenPaths.has(path)) return;
    seenPaths.add(path);
    assets.push({
      id: id || path,
      type,
      path,
    });
  };

  // Extract sprite images from entities
  spec.entities?.forEach(entity => {
    const sprite = entity.components?.sprite;
    if (sprite && typeof sprite === 'object' && 'src' in sprite) {
      addAsset((sprite as { src?: string }).src, 'image', `sprite-${entity.name}`);
    }
  });

  // Extract tilemap assets
  if (spec.tilemap) {
    // Add tileset image if present
    if (spec.tilemap.tilesetImage) {
      addAsset(spec.tilemap.tilesetImage, 'tileset', 'tileset-main');
    }
  }

  // Extract audio from config (if present in extended config)
  const config = spec.config as unknown as Record<string, unknown> | undefined;
  const audio = config?.audio;
  if (audio && typeof audio === 'object') {
    const audioConfig = audio as Record<string, unknown>;
    if (audioConfig.backgroundMusic) {
      addAsset(audioConfig.backgroundMusic as string, 'audio', 'bgm');
    }
    if (audioConfig.soundEffects && typeof audioConfig.soundEffects === 'object') {
      const sfx = audioConfig.soundEffects as Record<string, string>;
      Object.entries(sfx).forEach(([name, path]) => {
        addAsset(path, 'audio', `sfx-${name}`);
      });
    }
  }

  return assets;
}

/**
 * Hook for preloading game assets
 */
export function useAssetPreloader(): UseAssetPreloaderResult {
  const [state, setState] = useState<AssetPreloaderState>({
    loading: false,
    progress: 0,
    loadedCount: 0,
    totalCount: 0,
    error: null,
  });

  const preloadFromSpec = useCallback(async (spec: GameSpec) => {
    const assets = extractAssetsFromSpec(spec);

    if (assets.length === 0) {
      setState({
        loading: false,
        progress: 100,
        loadedCount: 0,
        totalCount: 0,
        error: null,
      });
      return;
    }

    setState({
      loading: true,
      progress: 0,
      loadedCount: 0,
      totalCount: assets.length,
      error: null,
    });

    try {
      await assetPipeline.loadAll(assets, (loaded, total, _currentAsset) => {
        setState(prev => ({
          ...prev,
          loadedCount: loaded,
          totalCount: total,
          progress: Math.round((loaded / total) * 100),
        }));
      });

      setState(prev => ({
        ...prev,
        loading: false,
        progress: 100,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to preload assets',
      }));
    }
  }, []);

  const clearCache = useCallback(() => {
    assetPipeline.clearCache();
  }, []);

  const getCacheStats = useCallback(() => {
    return assetPipeline.getCacheStats();
  }, []);

  return {
    ...state,
    preloadFromSpec,
    clearCache,
    getCacheStats,
  };
}

/**
 * Get a preloaded asset
 */
export function getPreloadedAsset<T>(id: string): T | undefined {
  const asset = assetPipeline.get<T>(id);
  return asset?.data;
}

/**
 * Check if an asset is already loaded
 */
export function isAssetLoaded(id: string): boolean {
  return assetPipeline.isLoaded(id);
}

export default useAssetPreloader;
