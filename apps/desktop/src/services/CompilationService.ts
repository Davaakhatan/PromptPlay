import * as esbuild from 'esbuild-wasm';
import { logError } from '../utils/errorUtils';

export interface CompilationResult {
  success: boolean;
  code?: string;
  errors?: CompilationError[];
  warnings?: CompilationWarning[];
}

export interface CompilationError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface CompilationWarning {
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface ScriptModule {
  id: string;
  name: string;
  code: string;
  exports: Record<string, unknown>;
}

class CompilationService {
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private compiledModules: Map<string, ScriptModule> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        await esbuild.initialize({
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.24.0/esbuild.wasm',
        });
        this.initialized = true;
        console.log('[CompilationService] esbuild initialized');
      } catch (err) {
        logError('[CompilationService] Failed to initialize esbuild', err);
        throw err;
      }
    })();

    return this.initializing;
  }

  async compileTypeScript(
    source: string,
    filename: string = 'script.ts'
  ): Promise<CompilationResult> {
    await this.initialize();

    try {
      const result = await esbuild.transform(source, {
        loader: 'ts',
        target: 'es2020',
        format: 'esm',
        sourcemap: 'inline',
        sourcefile: filename,
      });

      const warnings: CompilationWarning[] = [];

      // Process warnings
      for (const warning of result.warnings) {
        warnings.push({
          file: warning.location?.file || filename,
          line: warning.location?.line || 0,
          column: warning.location?.column || 0,
          message: warning.text,
        });
      }

      return {
        success: true,
        code: result.code,
        warnings,
      };
    } catch (err) {
      const errors: CompilationError[] = [];

      if (err instanceof Error) {
        // Parse esbuild error format
        const errorMessage = err.message;
        const lineMatch = errorMessage.match(/:(\d+):(\d+):/);

        errors.push({
          file: filename,
          line: lineMatch ? parseInt(lineMatch[1]) : 0,
          column: lineMatch ? parseInt(lineMatch[2]) : 0,
          message: errorMessage,
          severity: 'error',
        });
      }

      return {
        success: false,
        errors,
      };
    }
  }

  async compileAndLoad(
    source: string,
    moduleId: string,
    moduleName: string
  ): Promise<{ success: boolean; module?: ScriptModule; errors?: CompilationError[] }> {
    const result = await this.compileTypeScript(source, `${moduleName}.ts`);

    if (!result.success || !result.code) {
      return { success: false, errors: result.errors };
    }

    try {
      // Execute the compiled code in a sandboxed context
      const scriptModule = await this.executeInSandbox(result.code, moduleId, moduleName);

      this.compiledModules.set(moduleId, scriptModule);

      return { success: true, module: scriptModule };
    } catch (err) {
      return {
        success: false,
        errors: [{
          file: `${moduleName}.ts`,
          line: 0,
          column: 0,
          message: err instanceof Error ? err.message : 'Runtime error',
          severity: 'error',
        }],
      };
    }
  }

  private async executeInSandbox(
    code: string,
    moduleId: string,
    moduleName: string
  ): Promise<ScriptModule> {
    // Create a blob URL for the module
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    try {
      // Dynamically import the module
      const moduleExports = await import(/* @vite-ignore */ url);

      return {
        id: moduleId,
        name: moduleName,
        code,
        exports: moduleExports,
      };
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(url);
    }
  }

  getModule(moduleId: string): ScriptModule | undefined {
    return this.compiledModules.get(moduleId);
  }

  getAllModules(): ScriptModule[] {
    return Array.from(this.compiledModules.values());
  }

  unloadModule(moduleId: string): boolean {
    return this.compiledModules.delete(moduleId);
  }

  clearAllModules(): void {
    this.compiledModules.clear();
  }

  // Create a custom system from user code
  async createCustomSystem(
    source: string,
    systemName: string
  ): Promise<{ success: boolean; system?: (world: unknown, delta: number) => void; errors?: CompilationError[] }> {
    const moduleId = `system_${systemName}_${Date.now()}`;
    const result = await this.compileAndLoad(source, moduleId, systemName);

    if (!result.success || !result.module) {
      return { success: false, errors: result.errors };
    }

    // Look for a default export or a function named after the system
    const exports = result.module.exports;
    const systemFn = (exports.default || exports[systemName] || exports.update) as
      | ((world: unknown, delta: number) => void)
      | undefined;

    if (typeof systemFn !== 'function') {
      return {
        success: false,
        errors: [{
          file: `${systemName}.ts`,
          line: 0,
          column: 0,
          message: `No valid system function found. Export a default function or a function named "${systemName}" or "update".`,
          severity: 'error',
        }],
      };
    }

    return { success: true, system: systemFn };
  }

  // Validate TypeScript without executing
  async validate(source: string, filename: string = 'script.ts'): Promise<CompilationResult> {
    const result = await this.compileTypeScript(source, filename);
    // Don't return the compiled code for validation-only
    return {
      success: result.success,
      errors: result.errors,
      warnings: result.warnings,
    };
  }
}

export const compilationService = new CompilationService();
