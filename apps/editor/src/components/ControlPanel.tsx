'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
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
          <button 
            onClick={onPause} 
            disabled={disabled} 
            className="btn btn-secondary"
            title="Pause Game"
          >
            <Pause className="icon-md" />
            <span>Pause</span>
          </button>
        ) : (
          <button 
            onClick={onPlay} 
            disabled={disabled} 
            className="btn btn-success"
            title="Play Game"
          >
            <Play className="icon-md" />
            <span>Play</span>
          </button>
        )}

        <button 
          onClick={onReset} 
          disabled={disabled} 
          className="btn btn-secondary"
          title="Reset Game"
        >
          <RotateCcw className="icon-md" />
          <span>Reset</span>
        </button>
      </div>

      {disabled && (
        <p className={styles.hint}>Create or load a game to use controls</p>
      )}
    </div>
  );
}
