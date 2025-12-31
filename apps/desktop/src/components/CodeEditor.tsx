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
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No file selected</p>
          <p className="text-gray-400 text-xs mt-2">
            Select a file from the file tree to start editing
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center max-w-md p-4">
          <p className="text-red-600 font-medium mb-2">Error loading file</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 truncate max-w-md" title={filePath}>
            {filePath.split('/').pop()}
          </span>
          {isDirty && (
            <span className="text-xs text-orange-600 font-medium">● Modified</span>
          )}
        </div>
        <button
          onClick={saveFile}
          disabled={!isDirty}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
