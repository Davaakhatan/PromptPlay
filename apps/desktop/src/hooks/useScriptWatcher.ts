import { useEffect, useCallback, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { compilationService, CompilationError, ScriptModule } from '../services/CompilationService';
import { logError } from '../utils/errorUtils';

interface UseScriptWatcherOptions {
  projectPath: string | null;
  enabled?: boolean;
  onCompileSuccess?: (module: ScriptModule) => void;
  onCompileError?: (errors: CompilationError[]) => void;
  onFileChange?: (filePath: string) => void;
}

interface ScriptFile {
  path: string;
  name: string;
  lastModified: number;
  module?: ScriptModule;
  errors?: CompilationError[];
}

export function useScriptWatcher({
  projectPath,
  enabled = true,
  onCompileSuccess,
  onCompileError,
  onFileChange,
}: UseScriptWatcherOptions) {
  const [scriptFiles, setScriptFiles] = useState<Map<string, ScriptFile>>(new Map());
  const [isWatching, setIsWatching] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const watchIntervalRef = useRef<number | null>(null);
  const lastModifiedRef = useRef<Map<string, number>>(new Map());

  // Scan for TypeScript files in the project
  const scanForScripts = useCallback(async () => {
    if (!projectPath) return [];

    try {
      const scriptsPath = `${projectPath}/scripts`;

      // Try to list files in scripts directory
      interface FileInfo {
        name: string;
        path: string;
        is_directory: boolean;
      }
      const files = await invoke<FileInfo[]>('list_directory', { path: scriptsPath }).catch(() => []);

      const tsFiles = files
        .filter((f) => !f.is_directory && f.name.endsWith('.ts') && !f.name.endsWith('.d.ts'))
        .map((f) => ({
          path: f.path,
          name: f.name.replace('.ts', ''),
        }));

      return tsFiles;
    } catch (err) {
      logError('Failed to scan for scripts', err);
      return [];
    }
  }, [projectPath]);

  // Compile a single script file
  const compileScript = useCallback(async (filePath: string, fileName: string): Promise<ScriptFile> => {
    try {
      // Read the file content
      const content = await invoke<string>('read_file', { path: filePath });

      // Compile it
      const moduleId = `script_${fileName}_${Date.now()}`;
      const result = await compilationService.compileAndLoad(content, moduleId, fileName);

      if (result.success && result.module) {
        onCompileSuccess?.(result.module);
        return {
          path: filePath,
          name: fileName,
          lastModified: Date.now(),
          module: result.module,
        };
      } else {
        onCompileError?.(result.errors || []);
        return {
          path: filePath,
          name: fileName,
          lastModified: Date.now(),
          errors: result.errors,
        };
      }
    } catch (err) {
      const error: CompilationError = {
        file: filePath,
        line: 0,
        column: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
        severity: 'error',
      };
      onCompileError?.([error]);
      return {
        path: filePath,
        name: fileName,
        lastModified: Date.now(),
        errors: [error],
      };
    }
  }, [onCompileSuccess, onCompileError]);

  // Check for file changes and recompile
  const checkForChanges = useCallback(async () => {
    if (!projectPath || !enabled) return;

    const files = await scanForScripts();

    for (const file of files) {
      try {
        // Get file metadata to check last modified time
        const metadata = await invoke<{ modified: number }>('get_file_info', { path: file.path }).catch(() => null);

        if (!metadata) continue;

        const lastKnown = lastModifiedRef.current.get(file.path);

        if (!lastKnown || metadata.modified > lastKnown) {
          lastModifiedRef.current.set(file.path, metadata.modified);

          // File has changed, recompile
          onFileChange?.(file.path);
          setIsCompiling(true);

          const compiled = await compileScript(file.path, file.name);

          setScriptFiles(prev => {
            const next = new Map(prev);
            next.set(file.path, compiled);
            return next;
          });

          setIsCompiling(false);
        }
      } catch (err) {
        logError(`Error checking file: ${file.path}`, err);
      }
    }
  }, [projectPath, enabled, scanForScripts, compileScript, onFileChange]);

  // Initial compilation of all scripts
  const compileAll = useCallback(async () => {
    if (!projectPath) return;

    setIsCompiling(true);
    const files = await scanForScripts();

    const compiled = new Map<string, ScriptFile>();

    for (const file of files) {
      const result = await compileScript(file.path, file.name);
      compiled.set(file.path, result);
      lastModifiedRef.current.set(file.path, result.lastModified);
    }

    setScriptFiles(compiled);
    setIsCompiling(false);
  }, [projectPath, scanForScripts, compileScript]);

  // Start/stop watching
  useEffect(() => {
    if (!enabled || !projectPath) {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
        setIsWatching(false);
      }
      return;
    }

    // Initial compilation
    compileAll();

    // Start watching for changes (check every 2 seconds)
    watchIntervalRef.current = window.setInterval(checkForChanges, 2000);
    setIsWatching(true);

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
      setIsWatching(false);
    };
  }, [enabled, projectPath, compileAll, checkForChanges]);

  // Manual recompile function
  const recompileAll = useCallback(async () => {
    lastModifiedRef.current.clear();
    await compileAll();
  }, [compileAll]);

  // Recompile a specific file
  const recompileFile = useCallback(async (filePath: string) => {
    const existing = scriptFiles.get(filePath);
    if (!existing) return;

    setIsCompiling(true);
    const result = await compileScript(filePath, existing.name);

    setScriptFiles(prev => {
      const next = new Map(prev);
      next.set(filePath, result);
      return next;
    });

    setIsCompiling(false);
  }, [scriptFiles, compileScript]);

  return {
    scriptFiles: Array.from(scriptFiles.values()),
    isWatching,
    isCompiling,
    recompileAll,
    recompileFile,
  };
}
