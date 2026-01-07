/**
 * Keyboard Shortcuts Panel
 * Displays and allows customization of keyboard shortcuts
 */

import { useState, useEffect } from 'react';

interface Shortcut {
  id: string;
  category: string;
  action: string;
  keys: string[];
  description: string;
  customizable: boolean;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  // File operations
  { id: 'new-project', category: 'File', action: 'New Project', keys: ['Ctrl', 'N'], description: 'Create a new project', customizable: true },
  { id: 'open-project', category: 'File', action: 'Open Project', keys: ['Ctrl', 'O'], description: 'Open an existing project', customizable: true },
  { id: 'save', category: 'File', action: 'Save', keys: ['Ctrl', 'S'], description: 'Save current project', customizable: true },
  { id: 'save-as', category: 'File', action: 'Save As', keys: ['Ctrl', 'Shift', 'S'], description: 'Save project with new name', customizable: true },
  { id: 'export', category: 'File', action: 'Export', keys: ['Ctrl', 'E'], description: 'Export game', customizable: true },

  // Edit operations
  { id: 'undo', category: 'Edit', action: 'Undo', keys: ['Ctrl', 'Z'], description: 'Undo last action', customizable: false },
  { id: 'redo', category: 'Edit', action: 'Redo', keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo last undone action', customizable: false },
  { id: 'copy', category: 'Edit', action: 'Copy', keys: ['Ctrl', 'C'], description: 'Copy selected entity', customizable: true },
  { id: 'paste', category: 'Edit', action: 'Paste', keys: ['Ctrl', 'V'], description: 'Paste copied entity', customizable: true },
  { id: 'duplicate', category: 'Edit', action: 'Duplicate', keys: ['Ctrl', 'D'], description: 'Duplicate selected entity', customizable: true },
  { id: 'delete', category: 'Edit', action: 'Delete', keys: ['Delete'], description: 'Delete selected entity', customizable: true },
  { id: 'select-all', category: 'Edit', action: 'Select All', keys: ['Ctrl', 'A'], description: 'Select all entities', customizable: true },

  // View operations
  { id: 'toggle-grid', category: 'View', action: 'Toggle Grid', keys: ['G'], description: 'Show/hide grid overlay', customizable: true },
  { id: 'toggle-debug', category: 'View', action: 'Toggle Debug', keys: ['F3'], description: 'Show/hide debug info', customizable: true },
  { id: 'zoom-in', category: 'View', action: 'Zoom In', keys: ['Ctrl', '+'], description: 'Zoom in canvas', customizable: true },
  { id: 'zoom-out', category: 'View', action: 'Zoom Out', keys: ['Ctrl', '-'], description: 'Zoom out canvas', customizable: true },
  { id: 'reset-zoom', category: 'View', action: 'Reset Zoom', keys: ['Ctrl', '0'], description: 'Reset canvas zoom', customizable: true },

  // Playback
  { id: 'play-stop', category: 'Playback', action: 'Play/Stop', keys: ['F5'], description: 'Start or stop game preview', customizable: true },
  { id: 'pause', category: 'Playback', action: 'Pause', keys: ['F6'], description: 'Pause game preview', customizable: true },
  { id: 'step', category: 'Playback', action: 'Step Frame', keys: ['F7'], description: 'Advance one frame', customizable: true },

  // Navigation
  { id: 'search', category: 'Navigation', action: 'Entity Search', keys: ['Ctrl', 'K'], description: 'Open entity search', customizable: true },
  { id: 'focus-entity', category: 'Navigation', action: 'Focus Entity', keys: ['F'], description: 'Focus on selected entity', customizable: true },
  { id: 'goto-definition', category: 'Navigation', action: 'Go to Definition', keys: ['F12'], description: 'Jump to code definition', customizable: true },

  // Tools
  { id: 'select-tool', category: 'Tools', action: 'Select Tool', keys: ['V'], description: 'Activate select tool', customizable: true },
  { id: 'move-tool', category: 'Tools', action: 'Move Tool', keys: ['W'], description: 'Activate move tool', customizable: true },
  { id: 'scale-tool', category: 'Tools', action: 'Scale Tool', keys: ['E'], description: 'Activate scale tool', customizable: true },
  { id: 'rotate-tool', category: 'Tools', action: 'Rotate Tool', keys: ['R'], description: 'Activate rotate tool', customizable: true },
];

interface KeyboardShortcutsPanelProps {
  onClose: () => void;
}

export function KeyboardShortcutsPanel({ onClose }: KeyboardShortcutsPanelProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load custom shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('promptplay_shortcuts');
    if (saved) {
      try {
        const customShortcuts = JSON.parse(saved);
        setShortcuts(prev => prev.map(s => ({
          ...s,
          keys: customShortcuts[s.id] || s.keys,
        })));
      } catch (e) {
        console.error('Failed to load shortcuts:', e);
      }
    }
  }, []);

  // Key recording
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');

      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        keys.push(key);
      }

      if (keys.length > 0) {
        setRecordedKeys(keys);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId]);

  const saveShortcut = (id: string) => {
    if (recordedKeys.length === 0) return;

    setShortcuts(prev => prev.map(s =>
      s.id === id ? { ...s, keys: recordedKeys } : s
    ));

    // Save to localStorage
    const customShortcuts: Record<string, string[]> = {};
    shortcuts.forEach(s => {
      if (s.id === id) {
        customShortcuts[s.id] = recordedKeys;
      } else {
        customShortcuts[s.id] = s.keys;
      }
    });
    localStorage.setItem('promptplay_shortcuts', JSON.stringify(customShortcuts));

    setEditingId(null);
    setRecordedKeys([]);
  };

  const resetShortcut = (id: string) => {
    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id);
    if (defaultShortcut) {
      setShortcuts(prev => prev.map(s =>
        s.id === id ? { ...s, keys: defaultShortcut.keys } : s
      ));
    }
  };

  const resetAllShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem('promptplay_shortcuts');
  };

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  const filteredShortcuts = shortcuts.filter(s => {
    const matchesFilter = filter === '' ||
      s.action.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = !activeCategory || s.category === activeCategory;
    return matchesFilter && matchesCategory;
  });

  const groupedShortcuts = categories.reduce((acc, cat) => {
    acc[cat] = filteredShortcuts.filter(s => s.category === cat);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded text-sm ${!activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded text-sm ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-auto p-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            categoryShortcuts.length > 0 && (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map(shortcut => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded hover:bg-gray-700"
                    >
                      <div className="flex-1">
                        <div className="text-white font-medium">{shortcut.action}</div>
                        <div className="text-gray-400 text-sm">{shortcut.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingId === shortcut.id ? (
                          <>
                            <div className="px-3 py-1 bg-blue-600/30 border border-blue-500 rounded text-blue-300 text-sm min-w-[100px] text-center">
                              {recordedKeys.length > 0 ? recordedKeys.join(' + ') : 'Press keys...'}
                            </div>
                            <button
                              onClick={() => saveShortcut(shortcut.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setRecordedKeys([]); }}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex gap-1">
                              {shortcut.keys.map((key, idx) => (
                                <span key={idx}>
                                  <kbd className="px-2 py-1 bg-gray-600 rounded text-gray-200 text-sm font-mono">
                                    {key}
                                  </kbd>
                                  {idx < shortcut.keys.length - 1 && (
                                    <span className="text-gray-500 mx-1">+</span>
                                  )}
                                </span>
                              ))}
                            </div>
                            {shortcut.customizable && (
                              <button
                                onClick={() => setEditingId(shortcut.id)}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-gray-300"
                              >
                                Edit
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={resetAllShortcuts}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
          >
            Reset All to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsPanel;
