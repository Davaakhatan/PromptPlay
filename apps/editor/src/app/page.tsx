'use client';

import { useState } from 'react';
import { GameSpec } from '@promptplay/shared-types';
import { Gamepad2, FileCode, Sparkles } from 'lucide-react';
import PromptInput from '@/components/PromptInput';
import GameCanvas from '@/components/GameCanvas';
import ControlPanel from '@/components/ControlPanel';
import SpecEditor from '@/components/SpecEditor';
import SaveLoadPanel from '@/components/SaveLoadPanel';
import styles from './page.module.css';

export default function Home() {
  const [gameSpec, setGameSpec] = useState<GameSpec | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'spec'>('canvas');

  const handlePromptSubmit = async (prompt: string, genre?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate game');
      }

      const spec = await response.json();
      setGameSpec(spec);
      setIsPlaying(true);
      setActiveTab('canvas');
    } catch (error) {
      console.error('Error generating game:', error);
      alert('Failed to generate game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecEdit = (newSpec: GameSpec) => {
    setGameSpec(newSpec);
  };

  const handleLoad = (spec: GameSpec) => {
    setGameSpec(spec);
    setIsPlaying(false);
    setActiveTab('canvas');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className="flex-center" style={{ width: 40, height: 40, background: 'var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <Sparkles className="icon-lg" />
          </div>
          <div>
            <h1>PromptPlay</h1>
            <span className={styles.subtitle}>AI Game Engine</span>
          </div>
        </div>
        <SaveLoadPanel gameSpec={gameSpec} onLoad={handleLoad} />
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Left Panel - Controls */}
        <aside className={styles.leftPanel}>
          <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
          <ControlPanel
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onReset={() => setGameSpec(gameSpec)}
            disabled={!gameSpec}
          />
        </aside>

        {/* Center Panel - Game View */}
        <section className={styles.centerPanel}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'canvas' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              <Gamepad2 className="icon-sm" />
              <span>Game</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'spec' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('spec')}
            >
              <FileCode className="icon-sm" />
              <span>Spec</span>
            </button>
          </div>

          <div className={styles.viewContainer}>
            {activeTab === 'canvas' ? (
              <GameCanvas spec={gameSpec} isPlaying={isPlaying} />
            ) : (
              <SpecEditor spec={gameSpec} onEdit={handleSpecEdit} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
