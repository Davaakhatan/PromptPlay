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
  const c = entity.components as Record<string, unknown>;
  if (c?.input || c?.input3d) {
    return '#22c55e'; // Green for player
  }
  if (c?.rigidbody || c?.rigidbody3d) {
    const rb = c.rigidbody as { type?: string } | undefined;
    const rb3d = c.rigidbody3d as { type?: string } | undefined;
    if (rb?.type === 'static' || rb3d?.type === 'static') {
      return '#6b7280'; // Gray for static
    }
    return '#3b82f6'; // Blue for dynamic
  }
  if (c?.light) {
    return '#fbbf24'; // Yellow for lights
  }
  if (c?.particleEmitter) {
    return '#f97316'; // Orange for particles
  }
  if (c?.sprite || c?.mesh) {
    return '#8b5cf6'; // Purple for visuals
  }
  return '#6b7280'; // Default gray
}

// Helper to get entity icon based on type
function getEntityIcon(entity: EntitySpec) {
  const c = entity.components as Record<string, unknown>;
  const iconClass = "w-4 h-4";
  if (c?.input || c?.input3d) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
  if (c?.light) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
  }
  if (c?.particleEmitter) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
  }
  if (c?.camera || c?.camera3d) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
  }
  if (c?.model3d) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
  }
  if (c?.rigidbody || c?.rigidbody3d) {
    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
  }
  return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
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
