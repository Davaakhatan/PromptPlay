'use client';

import { useState, useEffect } from 'react';
import { GameSpec } from '@promptplay/shared-types';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import styles from './SaveLoadPanel.module.css';

interface SaveLoadPanelProps {
  gameSpec: GameSpec | null;
  onLoad: (spec: GameSpec) => void;
}

export default function SaveLoadPanel({ gameSpec, onLoad }: SaveLoadPanelProps) {
  const [savedGames, setSavedGames] = useState<string[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  useEffect(() => {
    loadSavedGamesList();
  }, []);

  const loadSavedGamesList = () => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('game_'));
    setSavedGames(keys.map((key) => key.replace('game_', '')));
  };

  const handleSave = () => {
    if (!gameSpec || !saveName.trim()) return;

    const key = `game_${saveName.trim()}`;
    localStorage.setItem(key, JSON.stringify(gameSpec));
    loadSavedGamesList();
    setShowSaveDialog(false);
    setSaveName('');
  };

  const handleLoad = (name: string) => {
    const key = `game_${name}`;
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const spec = JSON.parse(data);
        onLoad(spec);
        setShowLoadDialog(false);
      } catch (err) {
        console.error('Failed to load game:', err);
        alert('Failed to load game');
      }
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      localStorage.removeItem(`game_${name}`);
      loadSavedGamesList();
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={() => setShowSaveDialog(true)}
        disabled={!gameSpec}
        className="btn btn-secondary"
        title="Save Game"
      >
        <Save className="icon-sm" />
        <span>Save</span>
      </button>
      <button
        onClick={() => setShowLoadDialog(true)}
        className="btn btn-secondary"
        title="Load Game"
      >
        <FolderOpen className="icon-sm" />
        <span>Load</span>
      </button>

      {showSaveDialog && (
        <div className={styles.modal} onClick={() => setShowSaveDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 className={styles.dialogTitle}>Save Game</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X className="icon-md" />
              </button>
            </div>

            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter save name..."
              className="input"
              autoFocus
              style={{ marginBottom: '1.5rem' }}
            />
            <div className={styles.dialogButtons}>
              <button onClick={() => setShowSaveDialog(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn btn-success">
                <Save className="icon-sm" />
                <span>Save Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div className={styles.modal} onClick={() => setShowLoadDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 className={styles.dialogTitle}>Load Game</h3>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X className="icon-md" />
              </button>
            </div>

            {savedGames.length === 0 ? (
              <p className={styles.emptyText}>No saved games found</p>
            ) : (
              <div className={styles.gamesList}>
                {savedGames.map((name) => (
                  <div key={name} className={styles.gameItem}>
                    <span className={styles.gameName}>{name}</span>
                    <div className={styles.gameActions}>
                      <button
                        onClick={() => handleLoad(name)}
                        className="btn btn-success"
                        title="Load this game"
                      >
                        <FolderOpen className="icon-sm" />
                        <span>Load</span>
                      </button>
                      <button
                        onClick={() => handleDelete(name)}
                        className="btn btn-danger"
                        title="Delete this game"
                      >
                        <Trash2 className="icon-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.dialogButtons} style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setShowLoadDialog(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
