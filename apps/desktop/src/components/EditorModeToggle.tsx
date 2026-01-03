interface EditorModeToggleProps {
  mode: '2d' | '3d';
  onModeChange: (mode: '2d' | '3d') => void;
  disabled?: boolean;
}

export function EditorModeToggle({ mode, onModeChange, disabled }: EditorModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-panel rounded-lg p-0.5">
      <button
        onClick={() => onModeChange('2d')}
        disabled={disabled}
        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
          mode === '2d'
            ? 'bg-primary text-white'
            : 'text-text-secondary hover:text-white hover:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        2D
      </button>
      <button
        onClick={() => onModeChange('3d')}
        disabled={disabled}
        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
          mode === '3d'
            ? 'bg-primary text-white'
            : 'text-text-secondary hover:text-white hover:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        3D
      </button>
    </div>
  );
}

export default EditorModeToggle;
