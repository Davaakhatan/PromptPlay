/**
 * Logger Service
 * Environment-aware logging with log levels
 * Suppresses debug/info logs in production builds
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? true;
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      enabled: this.enabled,
    });
  }

  /**
   * Debug level - only shows in development
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.enabled || !this.isDev) return;
    const prefix = this.prefix ? `[${this.prefix}]` : '[DEBUG]';
    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * Info level - only shows in development
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.enabled || !this.isDev) return;
    const prefix = this.prefix ? `[${this.prefix}]` : '[INFO]';
    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * Warn level - always shows
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    const prefix = this.prefix ? `[${this.prefix}]` : '[WARN]';
    console.warn(`${prefix} ${message}`, ...args);
  }

  /**
   * Error level - always shows
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    const prefix = this.prefix ? `[${this.prefix}]` : '[ERROR]';
    console.error(`${prefix} ${message}`, ...args);
  }

  /**
   * Log with timing - useful for performance debugging
   */
  time(label: string): () => void {
    if (!this.enabled || !this.isDev) return () => {};
    const start = performance.now();
    const prefix = this.prefix ? `[${this.prefix}]` : '[TIMER]';
    return () => {
      const duration = performance.now() - start;
      console.log(`${prefix} ${label}: ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Group logs together
   */
  group(label: string, fn: () => void): void {
    if (!this.enabled || !this.isDev) {
      fn();
      return;
    }
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    console.group(`${prefix} ${label}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Log a table (useful for arrays/objects)
   */
  table(data: unknown): void {
    if (!this.enabled || !this.isDev) return;
    console.table(data);
  }
}

// Default logger instance
export const logger = new Logger();

// Pre-configured loggers for common services
export const networkLogger = new Logger({ prefix: 'Network' });
export const ecsLogger = new Logger({ prefix: 'ECS' });
export const renderLogger = new Logger({ prefix: 'Render' });
export const audioLogger = new Logger({ prefix: 'Audio' });
export const fileLogger = new Logger({ prefix: 'File' });
export const aiLogger = new Logger({ prefix: 'AI' });

export default logger;
