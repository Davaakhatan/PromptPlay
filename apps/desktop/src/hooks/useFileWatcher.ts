import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface UseFileWatcherOptions {
  projectPath: string | null;
  onFileChanged: (filePath: string) => void;
}

export function useFileWatcher({ projectPath, onFileChanged }: UseFileWatcherOptions) {
  useEffect(() => {
    if (!projectPath) return;

    // Start watching the project directory
    const startWatcher = async () => {
      try {
        await invoke('start_file_watcher', { path: projectPath });
      } catch (err) {
        console.error('Failed to start file watcher:', err);
      }
    };

    // Listen for file change events
    const unlisten = listen<string>('file-changed', (event) => {
      const changedPath = event.payload;
      onFileChanged(changedPath);
    });

    startWatcher();

    return () => {
      // Stop watching when component unmounts or project changes
      invoke('stop_file_watcher').catch(console.error);
      unlisten.then((fn) => fn());
    };
  }, [projectPath, onFileChanged]);
}
