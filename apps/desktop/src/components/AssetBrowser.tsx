import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ImageIcon, SoundIcon, FolderIcon, RefreshIcon } from './Icons';

interface AssetBrowserProps {
  projectPath: string | null;
  onAssetSelect?: (assetPath: string, assetType: 'image' | 'sound') => void;
}

interface Asset {
  name: string;
  path: string;
  type: 'image' | 'sound' | 'folder';
  size?: number;
}

interface FileEntry {
  name: string;
  is_dir: boolean;
  path: string;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
const SOUND_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

export default function AssetBrowser({ projectPath, onAssetSelect }: AssetBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'images' | 'sounds'>('all');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Load assets from directory
  const loadAssets = useCallback(async (dirPath: string) => {
    if (!projectPath) return;

    setLoading(true);
    setError(null);

    try {
      const fullPath = dirPath ? `${projectPath}/${dirPath}` : projectPath;
      const entries = await invoke<FileEntry[]>('list_directory', { path: fullPath });

      const assetList: Asset[] = entries
        .filter(entry => {
          if (entry.is_dir) return true;
          const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
          return IMAGE_EXTENSIONS.includes(ext) || SOUND_EXTENSIONS.includes(ext);
        })
        .map(entry => {
          const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
          let type: 'image' | 'sound' | 'folder' = 'folder';

          if (!entry.is_dir) {
            if (IMAGE_EXTENSIONS.includes(ext)) {
              type = 'image';
            } else if (SOUND_EXTENSIONS.includes(ext)) {
              type = 'sound';
            }
          }

          return {
            name: entry.name,
            path: entry.path,
            type,
          };
        })
        .sort((a, b) => {
          // Folders first, then alphabetically
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (a.type !== 'folder' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });

      setAssets(assetList);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Load assets when project path changes
  useEffect(() => {
    if (projectPath) {
      setCurrentPath('');
      loadAssets('');
    } else {
      setAssets([]);
    }
  }, [projectPath, loadAssets]);

  const handleNavigateToFolder = (folderPath: string) => {
    const relativePath = folderPath.replace(projectPath + '/', '');
    setCurrentPath(relativePath);
    loadAssets(relativePath);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parentPath);
    loadAssets(parentPath);
  };

  const handleAssetClick = (asset: Asset) => {
    if (asset.type === 'folder') {
      handleNavigateToFolder(asset.path);
    } else {
      setSelectedAsset(asset.path);
      onAssetSelect?.(asset.path, asset.type);
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true;
    if (filter === 'images') return asset.type === 'image' || asset.type === 'folder';
    if (filter === 'sounds') return asset.type === 'sound' || asset.type === 'folder';
    return true;
  });

  const getAssetIcon = (asset: Asset) => {
    switch (asset.type) {
      case 'image':
        return <ImageIcon size={viewMode === 'grid' ? 32 : 16} className="text-blue-500" />;
      case 'sound':
        return <SoundIcon size={viewMode === 'grid' ? 32 : 16} className="text-green-500" />;
      case 'folder':
        return <FolderIcon size={viewMode === 'grid' ? 32 : 16} className="text-yellow-500" />;
    }
  };

  if (!projectPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-4">
        <ImageIcon size={32} className="text-gray-300 mb-2" />
        <p>No project loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Assets</h3>
          <button
            onClick={() => loadAssets(currentPath)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Refresh"
          >
            <RefreshIcon size={14} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <button
            onClick={() => {
              setCurrentPath('');
              loadAssets('');
            }}
            className="hover:text-blue-600"
          >
            /
          </button>
          {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <span>/</span>
              <button
                onClick={() => {
                  const newPath = arr.slice(0, i + 1).join('/');
                  setCurrentPath(newPath);
                  loadAssets(newPath);
                }}
                className="hover:text-blue-600"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Filter and view controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('images')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'images' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilter('sounds')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'sounds' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              Sounds
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-gray-300' : 'bg-gray-100'}`}
              title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-gray-300' : 'bg-gray-100'}`}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="3" />
                <rect x="3" y="10" width="18" height="3" />
                <rect x="3" y="16" width="18" height="3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Loading...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded">
            {error}
          </div>
        )}

        {!loading && !error && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <p>No assets found</p>
            <p className="text-xs mt-1">Add images or sounds to your project</p>
          </div>
        )}

        {/* Navigate up button */}
        {currentPath && !loading && (
          <button
            onClick={handleNavigateUp}
            className="flex items-center gap-2 w-full p-2 mb-2 text-left text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            <FolderIcon size={16} className="text-gray-400" />
            <span>..</span>
          </button>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && !loading && (
          <div className="grid grid-cols-3 gap-2">
            {filteredAssets.map((asset) => (
              <button
                key={asset.path}
                onClick={() => handleAssetClick(asset)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                  selectedAsset === asset.path
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {asset.type === 'image' ? (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded overflow-hidden mb-1">
                    <img
                      src={`file://${asset.path}`}
                      alt={asset.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <ImageIcon size={24} className="text-gray-400 hidden" />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center">
                    {getAssetIcon(asset)}
                  </div>
                )}
                <span className="text-xs text-gray-700 truncate w-full text-center mt-1">
                  {asset.name.length > 12 ? asset.name.slice(0, 10) + '...' : asset.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && !loading && (
          <div className="space-y-1">
            {filteredAssets.map((asset) => (
              <button
                key={asset.path}
                onClick={() => handleAssetClick(asset)}
                className={`flex items-center gap-2 w-full p-2 text-left rounded transition-colors ${
                  selectedAsset === asset.path
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
              >
                {getAssetIcon(asset)}
                <span className="text-sm text-gray-700 truncate flex-1">
                  {asset.name}
                </span>
                <span className="text-xs text-gray-400">
                  {asset.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with selected asset info */}
      {selectedAsset && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 truncate">
          {selectedAsset.split('/').pop()}
        </div>
      )}
    </div>
  );
}
