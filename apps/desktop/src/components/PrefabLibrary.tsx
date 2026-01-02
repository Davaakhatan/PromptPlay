import { useState, useCallback, useMemo } from 'react';
import type { Prefab, PrefabCategory, EntitySpec } from '@promptplay/shared-types';
import { prefabService } from '../services/PrefabService';
import {
  PlayerIcon,
  EnemyIcon,
  PlatformIcon,
  CoinIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from './Icons';

interface PrefabLibraryProps {
  onInstantiate: (entity: EntitySpec) => void;
  onSaveAsPrefab?: (entity: EntitySpec) => void;
  selectedEntity?: EntitySpec | null;
}

// Icon mapping for prefab categories
const getCategoryIcon = (category: PrefabCategory, size: number = 16) => {
  switch (category) {
    case 'player':
      return <PlayerIcon size={size} className="text-blue-400" />;
    case 'enemy':
      return <EnemyIcon size={size} className="text-red-400" />;
    case 'platform':
      return <PlatformIcon size={size} className="text-amber-500" />;
    case 'collectible':
      return <CoinIcon size={size} className="text-yellow-400" />;
    case 'projectile':
      return <span className="text-orange-400">*</span>;
    case 'effect':
      return <span className="text-purple-400">~</span>;
    case 'ui':
      return <span className="text-cyan-400">#</span>;
    default:
      return <span className="text-gray-400">+</span>;
  }
};

// Get prefab icon based on icon field or category
const getPrefabIcon = (prefab: Prefab, size: number = 14) => {
  switch (prefab.icon) {
    case 'player':
      return <PlayerIcon size={size} className="text-blue-400" />;
    case 'enemy':
      return <EnemyIcon size={size} className="text-red-400" />;
    case 'platform':
      return <PlatformIcon size={size} className="text-amber-500" />;
    case 'ground':
      return <PlatformIcon size={size} className="text-amber-700" />;
    case 'coin':
      return <CoinIcon size={size} className="text-yellow-400" />;
    case 'star':
      return <span className="text-green-400 text-sm">*</span>;
    case 'projectile':
      return <span className="text-orange-400 text-sm">-</span>;
    case 'particles':
      return <span className="text-purple-400 text-sm">~</span>;
    default:
      return getCategoryIcon(prefab.category, size);
  }
};

export default function PrefabLibrary({
  onInstantiate,
  onSaveAsPrefab,
  selectedEntity,
}: PrefabLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<PrefabCategory>>(
    new Set(['player', 'enemy', 'platform', 'collectible'])
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPrefabName, setNewPrefabName] = useState('');
  const [newPrefabCategory, setNewPrefabCategory] = useState<PrefabCategory>('custom');

  const allPrefabs = useMemo(() => prefabService.getAll(), []);
  const categories = useMemo(() => prefabService.getCategories(), []);

  // Filter prefabs based on search
  const filteredPrefabs = useMemo(() => {
    if (!searchQuery.trim()) return allPrefabs;

    const query = searchQuery.toLowerCase();
    return allPrefabs.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [allPrefabs, searchQuery]);

  // Group prefabs by category
  const prefabsByCategory = useMemo(() => {
    const grouped: Record<PrefabCategory, Prefab[]> = {
      player: [],
      enemy: [],
      platform: [],
      collectible: [],
      projectile: [],
      effect: [],
      ui: [],
      custom: [],
    };

    filteredPrefabs.forEach(p => {
      grouped[p.category].push(p);
    });

    return grouped;
  }, [filteredPrefabs]);

  const toggleCategory = useCallback((category: PrefabCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleInstantiate = useCallback(
    (prefab: Prefab) => {
      // Generate unique name
      const baseName = prefab.name.toLowerCase().replace(/\s+/g, '_');
      const entity = prefabService.instantiate(prefab, baseName, { x: 400, y: 300 });
      onInstantiate(entity);
    },
    [onInstantiate]
  );

  const handleSaveAsPrefab = useCallback(() => {
    if (!selectedEntity || !newPrefabName.trim()) return;

    prefabService.createFromEntity(
      selectedEntity,
      newPrefabName.trim(),
      newPrefabCategory
    );

    setNewPrefabName('');
    setShowSaveDialog(false);
  }, [selectedEntity, newPrefabName, newPrefabCategory]);

  const handleDeletePrefab = useCallback((prefab: Prefab) => {
    if (prefab.isBuiltIn) return;
    prefabService.deletePrefab(prefab.id);
  }, []);

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="px-3 py-2 bg-subtle border-b border-subtle flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Prefabs
        </h3>
        {selectedEntity && onSaveAsPrefab && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
            title="Save as Prefab"
          >
            <PlusIcon size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-subtle">
        <div className="relative">
          <SearchIcon
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prefabs..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-canvas border border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Prefab list by category */}
      <div className="flex-1 overflow-y-auto py-2">
        {categories.map(category => {
          const prefabs = prefabsByCategory[category.id];
          if (prefabs.length === 0) return null;

          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon size={12} />
                ) : (
                  <ChevronRightIcon size={12} />
                )}
                {getCategoryIcon(category.id, 14)}
                <span className="text-xs font-medium">{category.name}</span>
                <span className="ml-auto text-[10px] text-text-tertiary">
                  {prefabs.length}
                </span>
              </button>

              {/* Prefabs grid */}
              {isExpanded && (
                <div className="px-2 py-1 grid grid-cols-2 gap-1">
                  {prefabs.map(prefab => (
                    <button
                      key={prefab.id}
                      onClick={() => handleInstantiate(prefab)}
                      className="group relative p-2 bg-white/5 hover:bg-white/10 border border-subtle hover:border-primary/30 rounded-lg transition-all text-left"
                      title={prefab.description || prefab.name}
                    >
                      <div className="flex items-center gap-2">
                        {getPrefabIcon(prefab)}
                        <span className="text-xs text-text-primary truncate flex-1">
                          {prefab.name}
                        </span>
                      </div>

                      {/* Delete button for custom prefabs */}
                      {!prefab.isBuiltIn && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeletePrefab(prefab);
                          }}
                          className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-all"
                          title="Delete prefab"
                        >
                          <TrashIcon size={10} />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredPrefabs.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <SearchIcon size={24} className="mb-2 opacity-50" />
            <p className="text-sm">No prefabs found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-[10px] uppercase font-bold text-text-tertiary/50 text-center tracking-widest border-t border-subtle">
        {allPrefabs.length} Prefabs
      </div>

      {/* Save as Prefab Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-panel-solid border border-subtle rounded-xl shadow-2xl p-5 w-80 animate-scale-in">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Save as Prefab
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newPrefabName}
                  onChange={e => setNewPrefabName(e.target.value)}
                  placeholder="My Prefab"
                  className="w-full px-3 py-2 bg-canvas border border-subtle rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={newPrefabCategory}
                  onChange={e => setNewPrefabCategory(e.target.value as PrefabCategory)}
                  className="w-full px-3 py-2 bg-canvas border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPrefabName('');
                }}
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsPrefab}
                disabled={!newPrefabName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
