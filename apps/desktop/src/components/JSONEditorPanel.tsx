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
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-4">
        <CodeIcon size={32} className="text-gray-300 mb-2" />
        <p>No game loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CodeIcon size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-200">
            {showEntityOnly && selectedEntity ? `${selectedEntity}.json` : 'game.json'}
          </span>
          {hasChanges && (
            <span className="px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedEntity && (
            <button
              onClick={() => setShowEntityOnly(!showEntityOnly)}
              className={`px-2 py-1 text-xs rounded ${
                showEntityOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showEntityOnly ? 'Full Spec' : 'Entity Only'}
            </button>
          )}
          <button
            onClick={handleFormat}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Format
          </button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="px-3 py-2 bg-red-900/50 border-b border-red-800 text-red-200 text-xs">
          <span className="font-medium">Error (Line {validationError.line}):</span>{' '}
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
      <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {showEntityOnly ? 'Editing entity' : `${gameSpec.entities?.length || 0} entities`}
          {' • Cmd+Enter to apply'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanges || !!validationError}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
