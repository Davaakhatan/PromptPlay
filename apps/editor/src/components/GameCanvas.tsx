'use client';

import { useEffect, useRef, useState } from 'react';
import { Runtime2D } from '@promptplay/runtime-2d';
import { GameSpec } from '@promptplay/shared-types';
import styles from './GameCanvas.module.css';

interface GameCanvasProps {
  spec: GameSpec | null;
  isPlaying: boolean;
}

export default function GameCanvas({ spec, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime2D | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Initialize runtime
      runtimeRef.current = new Runtime2D(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: 0x0a0e27,
      });
    } catch (err) {
      console.error('Failed to initialize runtime:', err);
      setError('Failed to initialize game engine');
    }

    return () => {
      if (runtimeRef.current) {
        runtimeRef.current.destroy();
        runtimeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!spec || !runtimeRef.current) return;

    const loadGame = async () => {
      try {
        setError(null);
        await runtimeRef.current!.loadGameSpec(spec);
        if (isPlaying) {
          runtimeRef.current!.start();
        }
      } catch (err) {
        console.error('Failed to load game spec:', err);
        setError('Failed to load game. Check console for details.');
      }
    };

    loadGame();
  }, [spec]);

  useEffect(() => {
    if (!runtimeRef.current) return;

    if (isPlaying) {
      runtimeRef.current.start();
    } else {
      runtimeRef.current.pause();
    }
  }, [isPlaying]);

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🎮</div>
        <h3 className={styles.emptyTitle}>No Game Loaded</h3>
        <p className={styles.emptyText}>
          Create a game using the prompt input or load a saved game to get started
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Genre:</span>
          <span className={`badge badge-${spec.metadata.genre}`}>{spec.metadata.genre}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Title:</span>
          <span className={styles.infoValue}>{spec.metadata.title}</span>
        </div>
        <div className={styles.controls}>
          <span className={styles.controlsTitle}>Controls:</span>
          <span className={styles.controlsText}>
            WASD/Arrow Keys: Move • Space: Jump • Mouse: Aim/Shoot
          </span>
        </div>
      </div>
    </div>
  );
}
