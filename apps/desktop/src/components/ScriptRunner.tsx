import { useState, useCallback, useEffect } from 'react';
import { compilationService, CompilationError, ScriptModule } from '../services/CompilationService';
import { ChevronDownIcon, ChevronRightIcon, CodeIcon, TrashIcon } from './Icons';

interface ScriptRunnerProps {
  projectPath: string | null;
  onError?: (errors: CompilationError[]) => void;
}

function PlayIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertCircleIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function ScriptRunner({ projectPath: _projectPath, onError }: ScriptRunnerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loadedModules, setLoadedModules] = useState<ScriptModule[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['modules']));
  const [testCode, setTestCode] = useState(`// Example custom system
export function update(world: any, delta: number) {
  // Your custom logic here
  console.log('Custom system running, delta:', delta);
}
`);
  const [compileResult, setCompileResult] = useState<{
    success: boolean;
    errors?: CompilationError[];
    message?: string;
  } | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  // Initialize esbuild on mount
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        await compilationService.initialize();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize compilation service:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleCompileTest = useCallback(async () => {
    setIsCompiling(true);
    setCompileResult(null);

    try {
      const result = await compilationService.validate(testCode, 'test.ts');

      if (result.success) {
        setCompileResult({
          success: true,
          message: 'Compilation successful!',
        });
      } else {
        setCompileResult({
          success: false,
          errors: result.errors,
        });
        if (onError && result.errors) {
          onError(result.errors);
        }
      }
    } catch (err) {
      setCompileResult({
        success: false,
        errors: [{
          file: 'test.ts',
          line: 0,
          column: 0,
          message: err instanceof Error ? err.message : 'Unknown error',
          severity: 'error',
        }],
      });
    } finally {
      setIsCompiling(false);
    }
  }, [testCode, onError]);

  const handleLoadModule = useCallback(async () => {
    setIsCompiling(true);
    setCompileResult(null);

    try {
      const moduleId = `module_${Date.now()}`;
      const result = await compilationService.compileAndLoad(testCode, moduleId, 'CustomModule');

      if (result.success && result.module) {
        setLoadedModules(compilationService.getAllModules());
        setCompileResult({
          success: true,
          message: `Module "${result.module.name}" loaded successfully!`,
        });
      } else {
        setCompileResult({
          success: false,
          errors: result.errors,
        });
        if (onError && result.errors) {
          onError(result.errors);
        }
      }
    } catch (err) {
      setCompileResult({
        success: false,
        errors: [{
          file: 'module.ts',
          line: 0,
          column: 0,
          message: err instanceof Error ? err.message : 'Unknown error',
          severity: 'error',
        }],
      });
    } finally {
      setIsCompiling(false);
    }
  }, [testCode, onError]);

  const handleUnloadModule = useCallback((moduleId: string) => {
    compilationService.unloadModule(moduleId);
    setLoadedModules(compilationService.getAllModules());
  }, []);

  return (
    <div className="h-full flex flex-col bg-panel overflow-y-auto">
      {/* Header */}
      <div className="px-2 py-1.5 bg-subtle border-b border-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            Scripts
          </h3>
          {isInitializing ? (
            <span className="text-[9px] text-yellow-400">Initializing...</span>
          ) : isInitialized ? (
            <span className="text-[9px] text-green-400 flex items-center gap-0.5">
              <CheckCircleIcon size={8} />
              Ready
            </span>
          ) : (
            <span className="text-[9px] text-red-400 flex items-center gap-0.5">
              <AlertCircleIcon size={8} />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Test Compilation Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('test')}
          className="w-full px-2 py-1.5 flex items-center gap-1.5 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('test') ? (
            <ChevronDownIcon size={10} />
          ) : (
            <ChevronRightIcon size={10} />
          )}
          <span className="text-xs font-medium">Test Compilation</span>
        </button>

        {expandedSections.has('test') && (
          <div className="px-2 pb-2 space-y-2">
            <textarea
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="w-full h-24 px-1.5 py-1 text-[11px] font-mono bg-canvas border border-subtle rounded text-text-primary resize-none leading-tight"
              placeholder="Enter TypeScript code..."
              disabled={!isInitialized}
            />

            <div className="flex gap-1.5">
              <button
                onClick={handleCompileTest}
                disabled={!isInitialized || isCompiling}
                className="flex-1 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                <CodeIcon size={10} />
                Validate
              </button>
              <button
                onClick={handleLoadModule}
                disabled={!isInitialized || isCompiling}
                className="flex-1 px-2 py-1 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                <PlayIcon size={10} />
                Load
              </button>
            </div>

            {/* Compilation Result */}
            {compileResult && (
              <div
                className={`p-1.5 rounded border text-[10px] ${
                  compileResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {compileResult.success ? (
                  <div className="flex items-center gap-1">
                    <CheckCircleIcon size={12} />
                    {compileResult.message}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 font-medium">
                      <AlertCircleIcon size={12} />
                      Failed
                    </div>
                    {compileResult.errors?.slice(0, 3).map((error, i) => (
                      <div key={i} className="pl-3 font-mono text-[9px] truncate">
                        {error.line > 0 && `L${error.line}: `}
                        {error.message}
                      </div>
                    ))}
                    {compileResult.errors && compileResult.errors.length > 3 && (
                      <div className="pl-3 text-[9px] text-text-tertiary">
                        +{compileResult.errors.length - 3} more...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loaded Modules Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('modules')}
          className="w-full px-2 py-1.5 flex items-center gap-1.5 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('modules') ? (
            <ChevronDownIcon size={10} />
          ) : (
            <ChevronRightIcon size={10} />
          )}
          <span className="text-xs font-medium">Modules</span>
          <span className="ml-auto text-[9px] text-text-tertiary bg-white/5 px-1 rounded">
            {loadedModules.length}
          </span>
        </button>

        {expandedSections.has('modules') && (
          <div className="px-2 pb-2 space-y-1">
            {loadedModules.length === 0 ? (
              <p className="text-[10px] text-text-tertiary italic py-1">No modules loaded</p>
            ) : (
              loadedModules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-1.5 bg-canvas/50 rounded border border-subtle"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-text-primary truncate">
                      {module.name}
                    </div>
                    <div className="text-[9px] text-text-tertiary">
                      {Object.keys(module.exports).length} exports
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnloadModule(module.id)}
                    className="p-0.5 text-text-tertiary hover:text-red-400 transition-colors flex-shrink-0"
                    title="Unload module"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* System Templates Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('templates')}
          className="w-full px-2 py-1.5 flex items-center gap-1.5 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('templates') ? (
            <ChevronDownIcon size={10} />
          ) : (
            <ChevronRightIcon size={10} />
          )}
          <span className="text-xs font-medium">Templates</span>
        </button>

        {expandedSections.has('templates') && (
          <div className="px-2 pb-2 space-y-1">
            {[
              {
                name: 'Basic System',
                code: `// Basic custom system
export function update(world: any, delta: number) {
  // Called every frame
}`,
              },
              {
                name: 'Movement',
                code: `// Custom movement system
export function update(world: any, delta: number) {
  const entities = world.query(['transform', 'velocity']);
  for (const e of entities) {
    e.transform.x += e.velocity.vx * delta;
    e.transform.y += e.velocity.vy * delta;
  }
}`,
              },
              {
                name: 'Spawner',
                code: `// Entity spawner
let timer = 0;
export function update(world: any, delta: number) {
  timer += delta;
  if (timer >= 2) { timer = 0; /* spawn */ }
}`,
              },
            ].map((template) => (
              <button
                key={template.name}
                onClick={() => setTestCode(template.code)}
                className="w-full px-2 py-1.5 text-left bg-canvas/50 rounded border border-subtle hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="text-[11px] font-medium text-text-primary">
                  {template.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto px-2 py-1.5 text-[8px] uppercase text-text-tertiary/40 text-center tracking-wider border-t border-subtle">
        esbuild
      </div>
    </div>
  );
}
