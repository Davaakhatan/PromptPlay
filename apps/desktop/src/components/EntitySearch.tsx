import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EntitySpec } from '@promptplay/shared-types';
import { SearchIcon, CloseIcon } from './Icons';

interface EntitySearchProps {
  entities: EntitySpec[];
  onSelect: (entityName: string) => void;
  selectedEntity: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  entity: EntitySpec;
  matchType: 'name' | 'tag' | 'component';
  matchedField: string;
}

export function EntitySearch({
  entities,
  onSelect,
  selectedEntity,
  isOpen,
  onClose,
}: EntitySearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search logic
  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      // Show all entities when no query
      return entities.map(entity => ({
        entity,
        matchType: 'name' as const,
        matchedField: entity.name,
      }));
    }

    const lowerQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    for (const entity of entities) {
      // Match by name
      if (entity.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          entity,
          matchType: 'name',
          matchedField: entity.name,
        });
        continue;
      }

      // Match by tags
      if (entity.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        const matchedTag = entity.tags.find(tag =>
          tag.toLowerCase().includes(lowerQuery)
        );
        searchResults.push({
          entity,
          matchType: 'tag',
          matchedField: matchedTag || '',
        });
        continue;
      }

      // Match by component type
      const componentNames = Object.keys(entity.components || {});
      const matchedComponent = componentNames.find(name =>
        name.toLowerCase().includes(lowerQuery)
      );
      if (matchedComponent) {
        searchResults.push({
          entity,
          matchType: 'component',
          matchedField: matchedComponent,
        });
      }
    }

    return searchResults;
  }, [entities, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-search-item]');
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex].entity.name);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onSelect, onClose]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-violet-500/30 text-violet-300">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-xl bg-panel border border-subtle rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
          <SearchIcon size={18} className="text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entities by name, tag, or component..."
            className="flex-1 bg-transparent text-text-primary placeholder-gray-500 focus:outline-none text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <CloseIcon size={14} />
            </button>
          )}
          <span className="text-xs text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500">No entities found</p>
              <p className="text-xs text-gray-600 mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.entity.name}
                data-search-item
                onClick={() => {
                  onSelect(result.entity.name);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-violet-500/20 text-white'
                    : 'text-text-secondary hover:bg-white/5'
                } ${
                  result.entity.name === selectedEntity
                    ? 'border-l-2 border-violet-500'
                    : ''
                }`}
              >
                {/* Entity Icon/Color */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: getEntityColor(result.entity) + '30',
                    color: getEntityColor(result.entity),
                  }}
                >
                  {getEntityIcon(result.entity)}
                </div>

                {/* Entity Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {highlightMatch(result.entity.name, query)}
                    </span>
                    {result.matchType !== 'name' && (
                      <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-gray-400">
                        {result.matchType}: {highlightMatch(result.matchedField, query)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    {/* Component pills */}
                    {Object.keys(result.entity.components || {}).slice(0, 3).map(comp => (
                      <span key={comp} className="px-1.5 py-0.5 bg-white/5 rounded">
                        {comp}
                      </span>
                    ))}
                    {Object.keys(result.entity.components || {}).length > 3 && (
                      <span className="text-gray-600">
                        +{Object.keys(result.entity.components || {}).length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-4 py-2 border-t border-subtle flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper to get entity color based on type
function getEntityColor(entity: EntitySpec): string {
  if (entity.components?.input || entity.components?.input3d) {
    return '#22c55e'; // Green for player
  }
  if (entity.components?.rigidbody || entity.components?.rigidbody3d) {
    if (entity.components?.rigidbody?.type === 'static' ||
        entity.components?.rigidbody3d?.type === 'static') {
      return '#6b7280'; // Gray for static
    }
    return '#3b82f6'; // Blue for dynamic
  }
  if (entity.components?.light) {
    return '#fbbf24'; // Yellow for lights
  }
  if (entity.components?.particleEmitter) {
    return '#f97316'; // Orange for particles
  }
  if (entity.components?.sprite || entity.components?.mesh) {
    return '#8b5cf6'; // Purple for visuals
  }
  return '#6b7280'; // Default gray
}

// Helper to get entity icon based on type
function getEntityIcon(entity: EntitySpec): string {
  if (entity.components?.input || entity.components?.input3d) {
    return '🎮';
  }
  if (entity.components?.light) {
    return '💡';
  }
  if (entity.components?.particleEmitter) {
    return '✨';
  }
  if (entity.components?.camera || entity.components?.camera3d) {
    return '📷';
  }
  if (entity.components?.model3d) {
    return '🎲';
  }
  if (entity.components?.rigidbody || entity.components?.rigidbody3d) {
    return '⚪';
  }
  return '📦';
}

// Hook for keyboard shortcut to open search
export function useEntitySearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K or Cmd/Ctrl + P to open search
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        // Don't trigger if in input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
