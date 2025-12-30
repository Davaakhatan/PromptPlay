'use client';

import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function ControlPanel({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  disabled,
}: ControlPanelProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Game Controls</h3>

      <div className={styles.buttons}>
        {isPlaying ? (
          <button onClick={onPause} disabled={disabled} className="btn btn-secondary">
            <span>⏸️</span> Pause
          </button>
        ) : (
          <button onClick={onPlay} disabled={disabled} className="btn btn-success">
            <span>▶️</span> Play
          </button>
        )}

        <button onClick={onReset} disabled={disabled} className="btn btn-secondary">
          <span>🔄</span> Reset
        </button>
      </div>

      {disabled && (
        <p className={styles.hint}>Create or load a game to use controls</p>
      )}
    </div>
  );
}
