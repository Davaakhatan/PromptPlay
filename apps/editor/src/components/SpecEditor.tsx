'use client';

import { useState, useEffect } from 'react';
import { GameSpec } from '@promptplay/shared-types';
import styles from './SpecEditor.module.css';

interface SpecEditorProps {
  spec: GameSpec | null;
  onEdit: (spec: GameSpec) => void;
}

export default function SpecEditor({ spec, onEdit }: SpecEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (spec) {
      setJsonText(JSON.stringify(spec, null, 2));
      setError(null);
    }
  }, [spec]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setError(null);
      onEdit(parsed);
    } catch (err) {
      setError('Invalid JSON');
    }
  };

  if (!spec) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📝</div>
        <h3 className={styles.emptyTitle}>No Spec to Edit</h3>
        <p className={styles.emptyText}>
          Generate a game first to view and edit its JSON specification
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Game Specification</h3>
        {error && <span className={styles.error}>{error}</span>}
      </div>

      <textarea
        value={jsonText}
        onChange={handleChange}
        className={styles.editor}
        spellCheck={false}
      />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Entities:</span>
          <span className={styles.statValue}>{spec.entities.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Systems:</span>
          <span className={styles.statValue}>{spec.systems.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Size:</span>
          <span className={styles.statValue}>{jsonText.length} chars</span>
        </div>
      </div>
    </div>
  );
}
