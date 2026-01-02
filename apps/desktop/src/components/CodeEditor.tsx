import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { compilationService, CompilationError } from '../services/CompilationService';

interface CodeEditorProps {
  filePath: string | null;
  onSave?: (filePath: string, content: string) => void;
  onCompilationErrors?: (errors: CompilationError[]) => void;
}

export default function CodeEditor({ filePath, onSave, onCompilationErrors }: CodeEditorProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const validationTimeoutRef = useRef<number | null>(null);

  // Check if file is TypeScript
  const isTypeScriptFile = useCallback((path: string): boolean => {
    return path.endsWith('.ts') || path.endsWith('.tsx');
  }, []);

  // Validate TypeScript code
  const validateTypeScript = useCallback(async (code: string, path: string) => {
    if (!isTypeScriptFile(path)) return;

    setIsValidating(true);
    try {
      await compilationService.initialize();
      const result = await compilationService.compileTypeScript(code, path.split('/').pop() || 'script.ts');

      const errors = result.errors || [];
      setCompilationErrors(errors);
      onCompilationErrors?.(errors);

      // Update Monaco markers
      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const markers = errors.map((err: CompilationError) => ({
            severity: err.severity === 'error'
              ? monacoRef.current.MarkerSeverity.Error
              : monacoRef.current.MarkerSeverity.Warning,
            startLineNumber: err.line || 1,
            startColumn: err.column || 1,
            endLineNumber: err.line || 1,
            endColumn: (err.column || 1) + 10,
            message: err.message,
            source: 'TypeScript',
          }));
          monacoRef.current.editor.setModelMarkers(model, 'typescript', markers);
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [isTypeScriptFile, onCompilationErrors]);

  // Debounced validation
  const scheduleValidation = useCallback((code: string, path: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = window.setTimeout(() => {
      validateTypeScript(code, path);
    }, 500);
  }, [validateTypeScript]);

  // Cleanup validation timeout
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
      setCompilationErrors([]);
    } else {
      setContent('');
      setError(null);
      setIsDirty(false);
      setCompilationErrors([]);
    }
  }, [filePath]);

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const fileContent = await invoke<string>('read_file', { path });
      setContent(fileContent);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!filePath || !isDirty) return;

    try {
      await invoke('write_file', { path: filePath, content });
      setIsDirty(false);
      if (onSave) {
        onSave(filePath, content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Add keyboard shortcut for save (Cmd+S / Ctrl+S)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => {
        saveFile();
      }
    );

    // Initial validation for TypeScript files
    if (filePath && isTypeScriptFile(filePath)) {
      validateTypeScript(content, filePath);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== content) {
      setContent(value);
      setIsDirty(true);

      // Schedule TypeScript validation
      if (filePath && isTypeScriptFile(filePath)) {
        scheduleValidation(value, filePath);
      }
    }
  };

  const getLanguage = (path: string): string => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full bg-panel">
        <div className="text-center">
          <p className="text-text-secondary text-sm">No file selected</p>
          <p className="text-text-tertiary text-xs mt-2">
            Select a file from the file tree to start editing
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-panel">
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-panel">
        <div className="text-center max-w-md p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 font-medium mb-2">Error loading file</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-subtle border-b border-subtle">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-text-primary truncate" title={filePath}>
            {filePath.split('/').pop()}
          </span>
          {isDirty && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-yellow-500 font-medium">Modified</span>
            </span>
          )}
          {isValidating && (
            <span className="text-xs text-text-tertiary flex-shrink-0">Validating...</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {compilationErrors.length > 0 && (
            <span className="text-xs text-red-400">
              {compilationErrors.length} error{compilationErrors.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={saveFile}
            disabled={!isDirty}
            className="px-2.5 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={getLanguage(filePath)}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            rulers: [],
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 8 },
          }}
        />
      </div>

      {/* Compilation Errors Panel */}
      {compilationErrors.length > 0 && (
        <div className="border-t border-subtle bg-panel max-h-32 overflow-auto">
          <div className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border-b border-subtle">
            Problems ({compilationErrors.length})
          </div>
          <div className="divide-y divide-subtle">
            {compilationErrors.map((err, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 text-xs hover:bg-subtle cursor-pointer"
                onClick={() => {
                  if (editorRef.current && err.line) {
                    editorRef.current.revealLineInCenter(err.line);
                    editorRef.current.setPosition({ lineNumber: err.line, column: err.column || 1 });
                    editorRef.current.focus();
                  }
                }}
              >
                <span className="text-red-400">[{err.line}:{err.column}]</span>
                <span className="text-text-secondary ml-2">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
