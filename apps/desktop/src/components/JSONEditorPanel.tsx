import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { GameSpec } from '@promptplay/shared-types';
import { CodeIcon } from './Icons';

interface JSONEditorPanelProps {
  gameSpec: GameSpec | null;
  onApplyChanges: (updatedSpec: GameSpec) => void;
  selectedEntity?: string | null;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
}

export default function JSONEditorPanel({
  gameSpec,
  onApplyChanges,
  selectedEntity,
}: JSONEditorPanelProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [showEntityOnly, setShowEntityOnly] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Update JSON content when gameSpec changes externally
  useEffect(() => {
    if (gameSpec) {
      const content = showEntityOnly && selectedEntity
        ? getEntityJson(gameSpec, selectedEntity)
        : JSON.stringify(gameSpec, null, 2);
      setJsonContent(content);
      setHasChanges(false);
      setValidationError(null);
    } else {
      setJsonContent('');
    }
  }, [gameSpec, selectedEntity, showEntityOnly]);

  // Get JSON for a single entity
  const getEntityJson = (spec: GameSpec, entityName: string): string => {
    const entity = spec.entities?.find(e => e.name === entityName);
    if (entity) {
      return JSON.stringify(entity, null, 2);
    }
    return '{}';
  };

  // Parse JSON and get line/column for error
  const parseWithLocation = (json: string): { parsed?: any; error?: ValidationError } => {
    try {
      const parsed = JSON.parse(json);
      return { parsed };
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Try to extract line/column from error message
        const match = err.message.match(/at position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const lines = json.substring(0, position).split('\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          return {
            error: {
              line,
              column,
              message: err.message,
            },
          };
        }
        return {
          error: {
            line: 1,
            column: 1,
            message: err.message,
          },
        };
      }
      return {
        error: {
          line: 1,
          column: 1,
          message: String(err),
        },
      };
    }
  };

  // Validate JSON structure for GameSpec
  const validateGameSpec = (parsed: any): string | null => {
    if (showEntityOnly) {
      // Validate entity structure
      if (!parsed.name) return 'Entity must have a "name" property';
      if (!parsed.components) return 'Entity must have a "components" property';
      return null;
    }

    // Validate full GameSpec
    if (!parsed.version) return 'GameSpec must have a "version" property';
    if (!parsed.metadata) return 'GameSpec must have a "metadata" property';
    if (!parsed.config) return 'GameSpec must have a "config" property';
    if (!Array.isArray(parsed.entities)) return 'GameSpec must have an "entities" array';
    if (!Array.isArray(parsed.systems)) return 'GameSpec must have a "systems" array';

    // Validate metadata
    if (!parsed.metadata.title) return 'metadata.title is required';
    if (!parsed.metadata.genre) return 'metadata.genre is required';

    // Validate config
    if (!parsed.config.gravity) return 'config.gravity is required';
    if (!parsed.config.worldBounds) return 'config.worldBounds is required';

    // Validate entities
    for (let i = 0; i < parsed.entities.length; i++) {
      const entity = parsed.entities[i];
      if (!entity.name) return `Entity at index ${i} must have a "name" property`;
      if (!entity.components) return `Entity "${entity.name}" must have a "components" property`;
    }

    return null;
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;

    setJsonContent(value);
    setHasChanges(true);

    // Validate JSON
    const { parsed, error } = parseWithLocation(value);
    if (error) {
      setValidationError(error);
      // Set error markers in Monaco
      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelMarkers(model, 'json', [
            {
              startLineNumber: error.line,
              startColumn: error.column,
              endLineNumber: error.line,
              endColumn: error.column + 1,
              message: error.message,
              severity: monacoRef.current.MarkerSeverity.Error,
            },
          ]);
        }
      }
    } else {
      // Check schema validation
      const schemaError = validateGameSpec(parsed);
      if (schemaError) {
        setValidationError({ line: 1, column: 1, message: schemaError });
      } else {
        setValidationError(null);
        // Clear markers
        if (monacoRef.current && editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            monacoRef.current.editor.setModelMarkers(model, 'json', []);
          }
        }
      }
    }
  }, [showEntityOnly]);

  const handleApply = useCallback(() => {
    if (!gameSpec) return;

    const { parsed, error } = parseWithLocation(jsonContent);
    if (error) {
      return;
    }

    const schemaError = validateGameSpec(parsed);
    if (schemaError) {
      setValidationError({ line: 1, column: 1, message: schemaError });
      return;
    }

    if (showEntityOnly && selectedEntity) {
      // Merge updated entity back into gameSpec
      const updatedEntities = gameSpec.entities.map(e =>
        e.name === selectedEntity ? { ...parsed, name: selectedEntity } : e
      );
      onApplyChanges({
        ...gameSpec,
        entities: updatedEntities,
      });
    } else {
      onApplyChanges(parsed);
    }

    setHasChanges(false);
  }, [jsonContent, gameSpec, selectedEntity, showEntityOnly, onApplyChanges]);

  const handleReset = useCallback(() => {
    if (gameSpec) {
      const content = showEntityOnly && selectedEntity
        ? getEntityJson(gameSpec, selectedEntity)
        : JSON.stringify(gameSpec, null, 2);
      setJsonContent(content);
      setHasChanges(false);
      setValidationError(null);

      // Clear markers
      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelMarkers(model, 'json', []);
        }
      }
    }
  }, [gameSpec, selectedEntity, showEntityOnly]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure JSON schema
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleApply();
    });
  };

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  if (!gameSpec) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-tertiary text-sm p-4 bg-panel">
        <CodeIcon size={32} className="text-text-tertiary opacity-50 mb-2" />
        <p>No game loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      {/* Header */}
      <div className="px-3 py-2 bg-subtle border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CodeIcon size={16} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            {showEntityOnly && selectedEntity ? `${selectedEntity}.json` : 'game.json'}
          </span>
          {hasChanges && (
            <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/20">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedEntity && (
            <button
              onClick={() => setShowEntityOnly(!showEntityOnly)}
              className={`px-2 py-1 text-xs rounded transition-colors ${showEntityOnly
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
            >
              {showEntityOnly ? 'Full Spec' : 'Entity Only'}
            </button>
          )}
          <button
            onClick={handleFormat}
            className="px-2 py-1 text-xs bg-white/5 text-text-secondary rounded hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            Format
          </button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-500/20 text-red-300 text-xs backdrop-blur-sm">
          <span className="font-medium text-red-200">Error (Line {validationError.line}):</span>{' '}
          {validationError.message}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="json"
          value={jsonContent}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'always',
            bracketPairColorization: { enabled: true },
            renderLineHighlight: 'line',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-subtle border-t border-subtle flex items-center justify-between">
        <div className="text-xs text-text-tertiary">
          {showEntityOnly ? 'Editing entity' : `${gameSpec.entities?.length || 0} entities`}
          {' • Cmd+Enter to apply'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-3 py-1.5 text-xs bg-white/5 text-text-secondary rounded hover:text-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanges || !!validationError}
            className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
