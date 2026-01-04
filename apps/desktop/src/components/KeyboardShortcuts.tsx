interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['W'], description: 'Select tool (move entities)' },
      { keys: ['E'], description: 'Scale tool (resize entities)' },
      { keys: ['R'], description: 'Rotate tool' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['G'], description: 'Toggle grid overlay' },
      { keys: ['F3'], description: 'Toggle debug mode (show colliders)' },
      { keys: ['+', '='], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['F'], description: 'Fit all entities in view' },
      { keys: ['0'], description: 'Reset zoom to 100%' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'S'], description: 'Save project' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Quick create entity' },
      { keys: ['F2'], description: 'Rename selected entity' },
      { keys: ['Ctrl', 'C'], description: 'Copy entity' },
      { keys: ['Ctrl', 'V'], description: 'Paste entity' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate entity' },
      { keys: ['Delete'], description: 'Delete selected entity' },
      { keys: ['Escape'], description: 'Deselect / Cancel' },
    ],
  },
  {
    title: 'Playback',
    shortcuts: [
      { keys: ['Space'], description: 'Play / Pause game' },
    ],
  },
  {
    title: 'Scene Tree',
    shortcuts: [
      { keys: ['Double-click'], description: 'Rename entity' },
      { keys: ['Right-click'], description: 'Context menu' },
      { keys: ['Escape'], description: 'Clear search' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show this help' },
    ],
  },
];

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-panel border border-subtle rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-text-secondary">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <kbd className="px-2 py-1 text-xs font-mono bg-subtle border border-white/10 rounded text-text-primary shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-text-tertiary text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-subtle bg-subtle/50">
          <p className="text-xs text-text-tertiary text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-canvas border border-white/10 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
