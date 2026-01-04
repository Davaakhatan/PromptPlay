import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { fileSystem } from '../services/FileSystem';
import { ImageIcon, SoundIcon, FolderIcon, RefreshIcon, PlusIcon } from './Icons';

interface AssetBrowserProps {
  projectPath: string | null;
  onAssetSelect?: (assetPath: string, assetType: 'image' | 'sound' | 'script') => void;
}

interface Asset {
  name: string;
  path: string;
  type: 'image' | 'sound' | 'folder' | 'script';
  size?: number;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
const SOUND_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
const SCRIPT_EXTENSIONS = ['.js', '.ts', '.json'];

export default function AssetBrowser({ projectPath, onAssetSelect }: AssetBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'images' | 'sounds' | 'scripts'>('all');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Load assets from directory
  const loadAssets = useCallback(async (dirPath: string) => {
    if (!projectPath) return;

    setLoading(true);
    setError(null);

    try {
      const fullPath = dirPath ? `${projectPath}/${dirPath}` : projectPath;
      const entries = await fileSystem.readDirectory(fullPath);

      const assetList: Asset[] = entries
        .filter(entry => {
          if (entry.isDirectory) return true;
          const ext = entry.extension ? `.${entry.extension}` : '';
          return IMAGE_EXTENSIONS.includes(ext) || SOUND_EXTENSIONS.includes(ext) || SCRIPT_EXTENSIONS.includes(ext);
        })
        .map(entry => {
          const ext = entry.extension ? `.${entry.extension}` : '';
          let type: 'image' | 'sound' | 'folder' | 'script' = 'folder';

          if (!entry.isDirectory) {
            if (IMAGE_EXTENSIONS.includes(ext)) {
              type = 'image';
            } else if (SOUND_EXTENSIONS.includes(ext)) {
              type = 'sound';
            } else if (SCRIPT_EXTENSIONS.includes(ext)) {
              type = 'script';
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

  // Create new script
  const handleCreateScript = async () => {
    if (!projectPath) return;

    // Simple prompt for now
    const name = prompt('Enter script name:', 'NewScript.js');
    if (!name) return;

    const fileName = name.endsWith('.js') || name.endsWith('.ts') ? name : `${name}.js`;
    // Ensure we write to the current directory
    const fullPath = currentPath
      ? `${projectPath}/${currentPath}/${fileName}`
      : `${projectPath}/${fileName}`;

    try {
      setLoading(true);
      const template = `/**
 * ${fileName}
 * Created with PromptPlay
 */

// Define your behavior here
export default function update(entity, dt) {
  // entity.transform.x += 10 * dt;
}
`;
      await fileSystem.writeTextFile(fullPath, template);
      await loadAssets(currentPath);
    } catch (err) {
      setError(`Failed to create script: ${err}`);
      setLoading(false);
    }
  };

  // Import sound files
  const handleImportSounds = async () => {
    if (!projectPath) return;

    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac'] },
        ],
      });

      if (!selected) return;

      const files = Array.isArray(selected) ? selected : [selected];
      setLoading(true);

      for (const srcPath of files) {
        const fileName = srcPath.split(/[/\\]/).pop();
        if (fileName) {
          const destPath = currentPath
            ? `${projectPath}/${currentPath}/${fileName}`
            : `${projectPath}/${fileName}`;
          await fileSystem.copyFile(srcPath, destPath);
        }
      }

      await loadAssets(currentPath);
    } catch (err) {
      setError(`Failed to import sounds: ${err}`);
      setLoading(false);
    }
  };

  // Import image files
  const handleImportImages = async () => {
    if (!projectPath) return;

    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] },
        ],
      });

      if (!selected) return;

      const files = Array.isArray(selected) ? selected : [selected];
      setLoading(true);

      for (const srcPath of files) {
        const fileName = srcPath.split(/[/\\]/).pop();
        if (fileName) {
          const destPath = currentPath
            ? `${projectPath}/${currentPath}/${fileName}`
            : `${projectPath}/${fileName}`;
          await fileSystem.copyFile(srcPath, destPath);
        }
      }

      await loadAssets(currentPath);
    } catch (err) {
      setError(`Failed to import images: ${err}`);
      setLoading(false);
    }
  };

  const handleNavigateToFolder = (folderPath: string) => {
    const relativePath = folderPath.replace(projectPath + '/', '');
    setCurrentPath(relativePath);
    loadAssets(relativePath);
  };

  // Handle Drag & Drop Import
  useEffect(() => {
    if (!projectPath) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string[]>('tauri://file-drop', async (event) => {
          const files = event.payload;
          if (!files || files.length === 0) return;

          setLoading(true);
          try {
            for (const srcPath of files) {
              const fileName = srcPath.split(/[/\\]/).pop();
              if (fileName && !fileName.startsWith('.')) {
                const destPath = currentPath
                  ? `${projectPath}/${currentPath}/${fileName}`
                  : `${projectPath}/${fileName}`;

                await fileSystem.copyFile(srcPath, destPath);
              }
            }
            await loadAssets(currentPath);
          } catch (e) {
            console.error('Import failed', e);
            setError('Failed to import dropped files');
          } finally {
            setLoading(false);
          }
        });
      } catch (e) {
        console.warn('Tauri event API not available, falling back to window event', e);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [projectPath, currentPath, loadAssets]);

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
        return <ImageIcon size={viewMode === 'grid' ? 32 : 16} className="text-blue-400" />;
      case 'sound':
        return <SoundIcon size={viewMode === 'grid' ? 32 : 16} className="text-green-400" />;
      case 'folder':
        return <FolderIcon size={viewMode === 'grid' ? 32 : 16} className="text-yellow-400" />;
    }
  };

  if (!projectPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-tertiary text-sm p-4">
        <ImageIcon size={32} className="text-text-tertiary opacity-50 mb-2" />
        <p>No project loaded</p>
      </div>
    );
  }

  // Handle starting a drag operation
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="px-3 py-2 bg-subtle border-b border-subtle">
        {/* ... header content ... */}
        <div className="flex items-center gap-2">
          {filter === 'all' && (
            <button
              onClick={handleCreateScript}
              className="flex items-center gap-1.5 px-2 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors shadow-sm"
              title="Create new script"
            >
              <PlusIcon size={12} />
              <span>New Script</span>
            </button>
          )}
          {filter === 'images' && (
            <button
              onClick={handleImportImages}
              className="flex items-center gap-1.5 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors shadow-sm"
              title="Import images"
            >
              <PlusIcon size={12} />
              <span>Import Images</span>
            </button>
          )}
          {filter === 'sounds' && (
            <button
              onClick={handleImportSounds}
              className="flex items-center gap-1.5 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors shadow-sm"
              title="Import sounds"
            >
              <PlusIcon size={12} />
              <span>Import Sounds</span>
            </button>
          )}
          <div className="w-px h-4 bg-subtle mx-1" />
          <button
            onClick={() => loadAssets(currentPath)}
            className="p-1 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
            title="Refresh"
          >
            <RefreshIcon size={14} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
          <button
            onClick={() => {
              setCurrentPath('');
              loadAssets('');
            }}
            className="hover:text-primary"
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
                className="hover:text-primary"
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
              className={`px-2 py-1 text-xs rounded transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-canvas text-text-secondary hover:text-text-primary'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('images')}
              className={`px-2 py-1 text-xs rounded transition-colors ${filter === 'images' ? 'bg-primary text-white' : 'bg-canvas text-text-secondary hover:text-text-primary'
                }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilter('sounds')}
              className={`px-2 py-1 text-xs rounded transition-colors ${filter === 'sounds' ? 'bg-primary text-white' : 'bg-canvas text-text-secondary hover:text-text-primary'
                }`}
            >
              Sounds
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'}`}
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
              className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'}`}
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
          <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
            Loading...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
            {error}
          </div>
        )}

        {!loading && !error && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-text-tertiary text-sm">
            <p>No assets found</p>
            <p className="text-xs mt-1">Add images or sounds to your project</p>
          </div>
        )}

        {/* Navigate up button */}
        {currentPath && !loading && (
          <button
            onClick={handleNavigateUp}
            className="flex items-center gap-2 w-full p-2 mb-2 text-left text-sm text-text-secondary hover:bg-white/5 rounded transition-colors"
          >
            <FolderIcon size={16} className="text-text-tertiary" />
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
                draggable={asset.type !== 'folder'}
                onDragStart={(e) => handleDragStart(e, asset)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedAsset === asset.path
                  ? 'border-primary bg-primary/20 shadow-lg shadow-primary/10'
                  : 'border-subtle hover:border-text-tertiary hover:bg-white/5'
                  }`}
              >
                {asset.type === 'image' ? (
                  <div className="w-12 h-12 flex items-center justify-center bg-canvas rounded overflow-hidden mb-1 border border-subtle">
                    <img
                      src={`file://${asset.path}`}
                      alt={asset.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <ImageIcon size={24} className="text-text-tertiary hidden" />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center">
                    {getAssetIcon(asset)}
                  </div>
                )}
                <span className="text-xs text-text-secondary truncate w-full text-center mt-1">
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
                draggable={asset.type !== 'folder'}
                onDragStart={(e) => handleDragStart(e, asset)}
                className={`flex items-center gap-2 w-full p-2 text-left rounded transition-colors ${selectedAsset === asset.path
                  ? 'bg-primary/20 text-white'
                  : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                  }`}
              >
                {getAssetIcon(asset)}
                <span className="text-sm truncate flex-1">
                  {asset.name}
                </span>
                <span className="text-xs text-text-tertiary">
                  {asset.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with selected asset info */}
      {selectedAsset && (
        <div className="px-3 py-2 bg-subtle border-t border-subtle text-xs text-text-secondary truncate">
          {selectedAsset.split('/').pop()}
        </div>
      )}
    </div>
  );
}
