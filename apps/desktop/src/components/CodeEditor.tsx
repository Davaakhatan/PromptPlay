import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';

interface CodeEditorProps {
  filePath: string | null;
  onSave?: (filePath: string, content: string) => void;
}

export default function CodeEditor({ filePath, onSave }: CodeEditorProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    } else {
      setContent('');
      setError(null);
      setIsDirty(false);
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

    // Add keyboard shortcut for save (Cmd+S / Ctrl+S)
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => {
        saveFile();
      }
    );
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== content) {
      setContent(value);
      setIsDirty(true);
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
      <div className="flex items-center justify-between px-4 py-2 bg-subtle border-b border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate max-w-md" title={filePath}>
            {filePath.split('/').pop()}
          </span>
          {isDirty && (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
              <span className="text-xs text-yellow-500 font-medium">Modified</span>
            </>
          )}
        </div>
        <button
          onClick={saveFile}
          disabled={!isDirty}
          className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
        >
          Save {isDirty && '(Cmd+S)'}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(filePath)}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            rulers: [80, 120],
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  );
}
