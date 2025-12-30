'use client';

import { useState } from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import styles from './PromptInput.module.css';

interface PromptInputProps {
  onSubmit: (prompt: string, genre?: string) => void;
  isLoading: boolean;
}

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt, genre || undefined);
    }
  };

  const examplePrompts = [
    { text: 'Platformer where a blue fox jumps to collect golden coins', genre: 'platformer' },
    { text: 'Top-down shooter with 5 alien enemies chasing the player', genre: 'shooter' },
    { text: 'Puzzle game with 4 boxes to push onto green targets', genre: 'puzzle' },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Create Your Game</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="genre" className={styles.label}>
            Genre
          </label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="select"
          >
            <option value="">Auto-detect</option>
            <option value="platformer">Platformer</option>
            <option value="shooter">Shooter</option>
            <option value="puzzle">Puzzle</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="prompt" className={styles.label}>
            Describe your game
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A platformer where a ninja collects stars while avoiding enemies..."
            className="textarea"
            rows={4}
          />
        </div>

        <button type="submit" disabled={isLoading || !prompt.trim()} className="btn btn-primary">
          {isLoading ? (
            <>
              <div className="loading icon-md">
                <Sparkles className="icon-md" />
              </div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Wand2 className="icon-md" />
              <span>Generate Game</span>
            </>
          )}
        </button>
      </form>

      <div className={styles.examples}>
        <p className={styles.examplesTitle}>Quick examples:</p>
        {examplePrompts.map((example, index) => (
          <button
            key={index}
            onClick={() => {
              setPrompt(example.text);
              setGenre(example.genre);
            }}
            className={styles.exampleButton}
            disabled={isLoading}
          >
            <span className={`badge badge-${example.genre}`}>{example.genre}</span>
            <span className={styles.exampleText}>{example.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
