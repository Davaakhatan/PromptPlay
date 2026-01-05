/**
 * Crash Reporter Service
 * Error tracking, reporting, and crash analysis
 */

import { analyticsService } from './AnalyticsService';

// Error severity
export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Error category
export type ErrorCategory =
  | 'javascript'
  | 'promise'
  | 'network'
  | 'resource'
  | 'render'
  | 'performance'
  | 'custom';

// Crash report
export interface CrashReport {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  breadcrumbs: Breadcrumb[];
  context: ErrorContext;
  tags: Record<string, string>;
  extras: Record<string, unknown>;
  fingerprint?: string;
  handled: boolean;
  resolved: boolean;
}

// Breadcrumb (action leading to error)
export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'click' | 'xhr' | 'console' | 'error' | 'custom';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level: 'debug' | 'info' | 'warning' | 'error';
}

// Error context
export interface ErrorContext {
  component?: string;
  action?: string;
  screen?: string;
  gameState?: Record<string, unknown>;
  performanceMetrics?: PerformanceMetrics;
  memoryInfo?: MemoryInfo;
}

// Performance metrics
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  loadTime: number;
  memory?: number;
}

// Memory info
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Error stats
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{ message: string; count: number; lastSeen: number }>;
  errorRate: number;
  crashFreeRate: number;
  affectedUsers: number;
}

// Reporter configuration
export interface ReporterConfig {
  enabled: boolean;
  maxBreadcrumbs: number;
  maxReports: number;
  sampleRate: number;
  ignoreErrors: RegExp[];
  beforeSend?: (report: CrashReport) => CrashReport | null;
  endpoint?: string;
}

// Crash reporter event
export type CrashEvent =
  | 'error-captured'
  | 'report-sent'
  | 'report-failed'
  | 'breadcrumb-added';

// Default config
const DEFAULT_CONFIG: ReporterConfig = {
  enabled: true,
  maxBreadcrumbs: 50,
  maxReports: 100,
  sampleRate: 1.0,
  ignoreErrors: [
    /^Script error\.?$/,
    /^ResizeObserver loop/,
    /Loading chunk \d+ failed/,
  ],
};

class CrashReporter {
  private config: ReporterConfig = { ...DEFAULT_CONFIG };
  private reports: CrashReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private eventListeners: Map<CrashEvent, Set<(data: unknown) => void>> = new Map();
  private userId: string = '';
  private sessionId: string = '';
  private context: ErrorContext = {};
  private tags: Record<string, string> = {};
  private initialized: boolean = false;
  private errorCounts: Map<string, number> = new Map();
  private originalConsoleError: typeof console.error | null = null;
  private originalOnError: OnErrorEventHandler | null = null;
  private originalOnUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;

  /**
   * Initialize crash reporter
   */
  initialize(config: Partial<ReporterConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Generate session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Load user ID from analytics if available
    const userProps = analyticsService.getUserProperties();
    if (userProps) {
      this.userId = userProps.userId;
    }

    // Load saved reports
    this.loadReports();

    // Setup global error handlers
    this.setupErrorHandlers();

    // Setup console interceptor
    this.setupConsoleInterceptor();

    // Add initial breadcrumb
    this.addBreadcrumb({
      type: 'custom',
      category: 'app',
      message: 'Crash reporter initialized',
      level: 'info',
    });

    this.initialized = true;
    console.log('[CrashReporter] Service initialized');
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Save original handlers
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureError(error || new Error(String(message)), {
        file: source,
        line: lineno,
        column: colno,
        handled: false,
      });

      // Call original handler
      if (this.originalOnError) {
        return this.originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Unhandled promise rejection handler
    window.onunhandledrejection = (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      this.captureError(error, {
        category: 'promise',
        handled: false,
      });

      // Call original handler
      if (this.originalOnUnhandledRejection) {
        this.originalOnUnhandledRejection(event);
      }
    };
  }

  /**
   * Setup console interceptor
   */
  private setupConsoleInterceptor(): void {
    this.originalConsoleError = console.error;

    console.error = (...args) => {
      // Add breadcrumb
      this.addBreadcrumb({
        type: 'console',
        category: 'console',
        message: args.map(a => String(a)).join(' '),
        level: 'error',
      });

      // Call original
      if (this.originalConsoleError) {
        this.originalConsoleError.apply(console, args);
      }
    };
  }

  /**
   * Capture an error
   */
  captureError(
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      file?: string;
      line?: number;
      column?: number;
      handled?: boolean;
      tags?: Record<string, string>;
      extras?: Record<string, unknown>;
    } = {}
  ): string | null {
    if (!this.config.enabled) return null;

    // Sample rate check
    if (Math.random() > this.config.sampleRate) return null;

    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Check ignore patterns
    if (this.shouldIgnoreError(errorObj.message)) {
      return null;
    }

    // Create fingerprint
    const fingerprint = this.generateFingerprint(errorObj);

    // Track error count
    const count = (this.errorCounts.get(fingerprint) || 0) + 1;
    this.errorCounts.set(fingerprint, count);

    // Create report
    const report: CrashReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity: options.severity || 'error',
      category: options.category || 'javascript',
      message: errorObj.message,
      stack: errorObj.stack,
      file: options.file,
      line: options.line,
      column: options.column,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId: this.userId,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      context: { ...this.context, ...this.collectContextData() },
      tags: { ...this.tags, ...options.tags },
      extras: options.extras || {},
      fingerprint,
      handled: options.handled !== false,
      resolved: false,
    };

    // Apply beforeSend hook
    const processedReport = this.config.beforeSend
      ? this.config.beforeSend(report)
      : report;

    if (!processedReport) return null;

    // Store report
    this.reports.push(processedReport);
    if (this.reports.length > this.config.maxReports) {
      this.reports.shift();
    }
    this.saveReports();

    // Add breadcrumb for the error
    this.addBreadcrumb({
      type: 'error',
      category: 'error',
      message: errorObj.message,
      level: 'error',
      data: { stack: errorObj.stack?.substring(0, 500) },
    });

    // Track in analytics
    analyticsService.trackError(errorObj, {
      severity: report.severity,
      category: report.category,
      fingerprint,
      count,
    });

    // Emit event
    this.emit('error-captured', { report: processedReport });

    // Send to endpoint if configured
    if (this.config.endpoint) {
      this.sendReport(processedReport);
    }

    return processedReport.id;
  }

  /**
   * Capture a message
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    extras: Record<string, unknown> = {}
  ): string | null {
    return this.captureError(message, {
      severity,
      category: 'custom',
      handled: true,
      extras,
    });
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(message: string): boolean {
    return this.config.ignoreErrors.some(pattern => pattern.test(message));
  }

  /**
   * Generate error fingerprint
   */
  private generateFingerprint(error: Error): string {
    const parts = [
      error.name,
      error.message,
      error.stack?.split('\n')[1]?.trim() || '',
    ];
    return this.hashString(parts.join('|'));
  }

  /**
   * Hash string
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Collect context data
   */
  private collectContextData(): Partial<ErrorContext> {
    const context: Partial<ErrorContext> = {};

    // Performance metrics
    if (typeof performance !== 'undefined') {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      context.performanceMetrics = {
        fps: 60, // Would need frame timing
        frameTime: 16.67,
        loadTime: navTiming?.loadEventEnd - navTiming?.startTime || 0,
      };
    }

    // Memory info
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as { memory: MemoryInfo }).memory;
      context.memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return context;
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    this.emit('breadcrumb-added', { breadcrumb: fullBreadcrumb });
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string): void {
    this.addBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: `${from} -> ${to}`,
      level: 'info',
      data: { from, to },
    });
  }

  /**
   * Track click
   */
  trackClick(element: string, target?: string): void {
    this.addBreadcrumb({
      type: 'click',
      category: 'ui',
      message: `Click on ${element}`,
      level: 'info',
      data: { element, target },
    });
  }

  /**
   * Track XHR/Fetch
   */
  trackRequest(method: string, url: string, status?: number): void {
    this.addBreadcrumb({
      type: 'xhr',
      category: 'network',
      message: `${method} ${url}`,
      level: status && status >= 400 ? 'error' : 'info',
      data: { method, url, status },
    });
  }

  /**
   * Set context
   */
  setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Set user
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Send report to endpoint
   */
  private async sendReport(report: CrashReport): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (response.ok) {
        this.emit('report-sent', { reportId: report.id });
      } else {
        this.emit('report-failed', { reportId: report.id, status: response.status });
      }
    } catch (error) {
      this.emit('report-failed', { reportId: report.id, error });
    }
  }

  /**
   * Load reports from storage
   */
  private loadReports(): void {
    try {
      const saved = localStorage.getItem('crash_reports');
      if (saved) {
        this.reports = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[CrashReporter] Failed to load reports:', error);
    }
  }

  /**
   * Save reports to storage
   */
  private saveReports(): void {
    try {
      localStorage.setItem('crash_reports', JSON.stringify(this.reports));
    } catch (error) {
      console.error('[CrashReporter] Failed to save reports:', error);
    }
  }

  /**
   * Get all reports
   */
  getReports(): CrashReport[] {
    return [...this.reports];
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): CrashReport | null {
    return this.reports.find(r => r.id === reportId) || null;
  }

  /**
   * Mark report as resolved
   */
  resolveReport(reportId: string): boolean {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.resolved = true;
      this.saveReports();
      return true;
    }
    return false;
  }

  /**
   * Get error stats
   */
  getStats(): ErrorStats {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recentReports = this.reports.filter(r => r.timestamp > now - dayMs);

    const byCategory: Record<ErrorCategory, number> = {
      javascript: 0,
      promise: 0,
      network: 0,
      resource: 0,
      render: 0,
      performance: 0,
      custom: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      debug: 0,
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    const messageCounts = new Map<string, { count: number; lastSeen: number }>();
    const affectedUsers = new Set<string>();

    recentReports.forEach(report => {
      byCategory[report.category]++;
      bySeverity[report.severity]++;

      if (report.userId) {
        affectedUsers.add(report.userId);
      }

      const existing = messageCounts.get(report.message);
      if (existing) {
        existing.count++;
        existing.lastSeen = Math.max(existing.lastSeen, report.timestamp);
      } else {
        messageCounts.set(report.message, { count: 1, lastSeen: report.timestamp });
      }
    });

    const topErrors = Array.from(messageCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate rates
    const totalSessions = analyticsService.getUserProperties()?.sessionCount || 1;
    const sessionsWithErrors = this.reports.length > 0 ? 1 : 0;
    const crashFreeRate = ((totalSessions - sessionsWithErrors) / totalSessions) * 100;
    const errorRate = (recentReports.length / Math.max(totalSessions, 1)) * 100;

    return {
      total: recentReports.length,
      byCategory,
      bySeverity,
      topErrors,
      errorRate,
      crashFreeRate,
      affectedUsers: affectedUsers.size,
    };
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports = [];
    this.saveReports();
  }

  /**
   * Add event listener
   */
  on(event: CrashEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: CrashEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: CrashEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.onerror = this.originalOnError;
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }

    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
  }
}

// Singleton instance
export const crashReporter = new CrashReporter();
