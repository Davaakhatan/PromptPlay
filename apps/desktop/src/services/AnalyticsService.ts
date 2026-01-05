/**
 * Analytics Service
 * Player behavior tracking and metrics collection
 */

// Event types
export type EventCategory =
  | 'session'
  | 'gameplay'
  | 'progression'
  | 'economy'
  | 'social'
  | 'ui'
  | 'error'
  | 'performance'
  | 'custom';

// Event priority
export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

// Analytics event
export interface AnalyticsEvent {
  id: string;
  name: string;
  category: EventCategory;
  priority: EventPriority;
  timestamp: number;
  sessionId: string;
  userId?: string;
  properties: Record<string, unknown>;
  duration?: number;
  value?: number;
}

// User properties
export interface UserProperties {
  userId: string;
  firstSeen: number;
  lastSeen: number;
  sessionCount: number;
  totalPlayTime: number;
  level?: number;
  isPremium: boolean;
  platform: string;
  appVersion: string;
  deviceInfo: DeviceInfo;
  customProperties: Record<string, unknown>;
}

// Device info
export interface DeviceInfo {
  os: string;
  osVersion: string;
  browser?: string;
  browserVersion?: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  language: string;
  timezone: string;
}

// Session data
export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  events: number;
  screens: string[];
  deepLink?: string;
  referrer?: string;
  attribution?: AttributionData;
}

// Attribution data
export interface AttributionData {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
}

// Funnel definition
export interface FunnelDefinition {
  id: string;
  name: string;
  steps: FunnelStep[];
}

// Funnel step
export interface FunnelStep {
  name: string;
  eventName: string;
  filters?: Record<string, unknown>;
}

// Funnel result
export interface FunnelResult {
  funnelId: string;
  steps: Array<{
    name: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  overallConversion: number;
}

// Retention data
export interface RetentionData {
  day: number;
  cohortSize: number;
  retained: number;
  retentionRate: number;
}

// Analytics dashboard data
export interface DashboardData {
  overview: {
    dau: number;
    wau: number;
    mau: number;
    newUsers: number;
    sessionsPerDay: number;
    avgSessionDuration: number;
    revenue: number;
  };
  retention: RetentionData[];
  topEvents: Array<{ name: string; count: number }>;
  userFlow: Array<{ from: string; to: string; count: number }>;
  errorRate: number;
  performance: {
    avgLoadTime: number;
    avgFps: number;
    crashRate: number;
  };
}

// Analytics provider interface
export interface AnalyticsProvider {
  name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  track(event: AnalyticsEvent): Promise<void>;
  identify(userId: string, properties: Record<string, unknown>): Promise<void>;
  setUserProperty(key: string, value: unknown): Promise<void>;
  flush(): Promise<void>;
}

// Default funnels
const DEFAULT_FUNNELS: FunnelDefinition[] = [
  {
    id: 'onboarding',
    name: 'Onboarding Flow',
    steps: [
      { name: 'App Open', eventName: 'session_start' },
      { name: 'Tutorial Start', eventName: 'tutorial_start' },
      { name: 'Tutorial Complete', eventName: 'tutorial_complete' },
      { name: 'First Game', eventName: 'game_start' },
      { name: 'First Purchase', eventName: 'purchase_complete' },
    ],
  },
  {
    id: 'purchase',
    name: 'Purchase Flow',
    steps: [
      { name: 'View Store', eventName: 'store_view' },
      { name: 'View Product', eventName: 'product_view' },
      { name: 'Add to Cart', eventName: 'add_to_cart' },
      { name: 'Checkout', eventName: 'checkout_start' },
      { name: 'Purchase', eventName: 'purchase_complete' },
    ],
  },
];

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private eventQueue: AnalyticsEvent[] = [];
  private userId: string = '';
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private userProperties: UserProperties | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private providers: AnalyticsProvider[] = [];
  private funnels: Map<string, FunnelDefinition> = new Map();
  private funnelProgress: Map<string, Set<string>> = new Map();
  private screenHistory: string[] = [];
  private currentScreen: string = '';
  private flushInterval: number | null = null;
  private initialized: boolean = false;
  private batchSize: number = 50;
  private flushIntervalMs: number = 30000;
  private debugMode: boolean = false;

  constructor() {
    this.initializeFunnels();
  }

  /**
   * Initialize default funnels
   */
  private initializeFunnels(): void {
    DEFAULT_FUNNELS.forEach(funnel => {
      this.funnels.set(funnel.id, funnel);
    });
  }

  /**
   * Initialize analytics
   */
  async initialize(userId?: string, config?: { debug?: boolean }): Promise<void> {
    this.debugMode = config?.debug || false;

    // Generate or load user ID
    this.userId = userId || this.loadOrGenerateUserId();

    // Generate session ID
    this.sessionId = this.generateId();
    this.sessionStartTime = Date.now();

    // Collect device info
    this.deviceInfo = this.collectDeviceInfo();

    // Load or create user properties
    this.userProperties = this.loadOrCreateUserProperties();

    // Update session count
    this.userProperties.sessionCount++;
    this.userProperties.lastSeen = Date.now();
    this.saveUserProperties();

    // Start flush interval
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);

    // Track session start
    this.track('session_start', 'session', {
      sessionNumber: this.userProperties.sessionCount,
    });

    // Setup page visibility handler
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.track('session_background', 'session');
          this.flush();
        } else {
          this.track('session_foreground', 'session');
        }
      });

      window.addEventListener('beforeunload', () => {
        this.track('session_end', 'session', {
          duration: Date.now() - this.sessionStartTime,
        });
        this.flush();
      });
    }

    this.initialized = true;
    this.log('Analytics initialized', { userId: this.userId, sessionId: this.sessionId });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load or generate user ID
   */
  private loadOrGenerateUserId(): string {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = `user_${this.generateId()}`;
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  /**
   * Collect device info
   */
  private collectDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        os: 'unknown',
        osVersion: 'unknown',
        screenWidth: 0,
        screenHeight: 0,
        devicePixelRatio: 1,
        language: 'en',
        timezone: 'UTC',
      };
    }

    const ua = navigator.userAgent;
    let os = 'unknown';
    let osVersion = 'unknown';
    let browser = 'unknown';
    let browserVersion = 'unknown';

    // Detect OS
    if (ua.includes('Windows')) {
      os = 'Windows';
      const match = ua.match(/Windows NT (\d+\.\d+)/);
      osVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('Mac')) {
      os = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : 'unknown';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
      const match = ua.match(/Android (\d+\.\d+)/);
      osVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
      const match = ua.match(/OS (\d+_\d+)/);
      osVersion = match ? match[1].replace('_', '.') : 'unknown';
    }

    // Detect browser
    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }

    return {
      os,
      osVersion,
      browser,
      browserVersion,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      language: navigator.language || 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  }

  /**
   * Load or create user properties
   */
  private loadOrCreateUserProperties(): UserProperties {
    const saved = localStorage.getItem(`analytics_user_${this.userId}`);
    if (saved) {
      return JSON.parse(saved);
    }

    return {
      userId: this.userId,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      sessionCount: 0,
      totalPlayTime: 0,
      isPremium: false,
      platform: this.deviceInfo?.os || 'unknown',
      appVersion: '3.0.0',
      deviceInfo: this.deviceInfo!,
      customProperties: {},
    };
  }

  /**
   * Save user properties
   */
  private saveUserProperties(): void {
    if (this.userProperties) {
      localStorage.setItem(
        `analytics_user_${this.userId}`,
        JSON.stringify(this.userProperties)
      );
    }
  }

  /**
   * Track an event
   */
  track(
    name: string,
    category: EventCategory = 'custom',
    properties: Record<string, unknown> = {},
    options: { priority?: EventPriority; value?: number } = {}
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      name,
      category,
      priority: options.priority || 'normal',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      properties: {
        ...properties,
        screen: this.currentScreen,
      },
      value: options.value,
    };

    // Store locally
    this.events.push(event);
    this.eventQueue.push(event);

    // Check funnel progress
    this.checkFunnelProgress(name);

    // Log in debug mode
    this.log('Event tracked', event);

    // Send to providers immediately for high priority
    if (event.priority === 'high' || event.priority === 'critical') {
      this.sendToProviders([event]);
    }

    // Auto-flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track screen view
   */
  trackScreen(screenName: string, properties: Record<string, unknown> = {}): void {
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;
    this.screenHistory.push(screenName);

    this.track('screen_view', 'ui', {
      screenName,
      previousScreen,
      ...properties,
    });
  }

  /**
   * Track timing
   */
  trackTiming(
    name: string,
    duration: number,
    category: EventCategory = 'performance',
    properties: Record<string, unknown> = {}
  ): void {
    this.track(name, category, {
      ...properties,
      duration,
    });
  }

  /**
   * Start timing
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.trackTiming(name, duration);
    };
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    properties: Record<string, unknown> = {}
  ): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { message: error };

    this.track('error', 'error', {
      ...errorData,
      ...properties,
    }, { priority: 'high' });
  }

  /**
   * Track purchase
   */
  trackPurchase(
    productId: string,
    price: number,
    currency: string,
    properties: Record<string, unknown> = {}
  ): void {
    this.track('purchase_complete', 'economy', {
      productId,
      price,
      currency,
      ...properties,
    }, { priority: 'high', value: price });

    // Update user properties
    if (this.userProperties) {
      this.userProperties.isPremium = true;
      this.saveUserProperties();
    }
  }

  /**
   * Track level/progression
   */
  trackProgression(
    progressionType: 'start' | 'complete' | 'fail',
    level: number | string,
    properties: Record<string, unknown> = {}
  ): void {
    this.track(`level_${progressionType}`, 'progression', {
      level,
      ...properties,
    });

    if (progressionType === 'complete' && this.userProperties) {
      this.userProperties.level = typeof level === 'number' ? level : parseInt(level, 10);
      this.saveUserProperties();
    }
  }

  /**
   * Track virtual currency
   */
  trackCurrency(
    action: 'earn' | 'spend',
    currencyId: string,
    amount: number,
    source: string,
    properties: Record<string, unknown> = {}
  ): void {
    this.track(`currency_${action}`, 'economy', {
      currencyId,
      amount,
      source,
      ...properties,
    }, { value: amount });
  }

  /**
   * Set user property
   */
  setUserProperty(key: string, value: unknown): void {
    if (this.userProperties) {
      this.userProperties.customProperties[key] = value;
      this.saveUserProperties();
    }

    // Send to providers
    this.providers.forEach(p => p.setUserProperty(key, value));
  }

  /**
   * Identify user
   */
  identify(userId: string, properties: Record<string, unknown> = {}): void {
    this.userId = userId;
    localStorage.setItem('analytics_user_id', userId);

    if (this.userProperties) {
      this.userProperties.userId = userId;
      this.userProperties.customProperties = {
        ...this.userProperties.customProperties,
        ...properties,
      };
      this.saveUserProperties();
    }

    // Send to providers
    this.providers.forEach(p => p.identify(userId, properties));
  }

  /**
   * Check funnel progress
   */
  private checkFunnelProgress(eventName: string): void {
    this.funnels.forEach((funnel, funnelId) => {
      const progress = this.funnelProgress.get(funnelId) || new Set();

      funnel.steps.forEach((step, index) => {
        if (step.eventName === eventName) {
          // Check if previous steps are completed
          const previousStepsComplete = funnel.steps
            .slice(0, index)
            .every(s => progress.has(s.eventName));

          if (index === 0 || previousStepsComplete) {
            progress.add(eventName);
            this.funnelProgress.set(funnelId, progress);

            // Track funnel step
            this.track('funnel_step', 'progression', {
              funnelId,
              funnelName: funnel.name,
              stepIndex: index,
              stepName: step.name,
              isComplete: progress.size === funnel.steps.length,
            });
          }
        }
      });
    });
  }

  /**
   * Get funnel results
   */
  getFunnelResults(funnelId: string): FunnelResult | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    const progress = this.funnelProgress.get(funnelId) || new Set();
    const steps = funnel.steps.map((step, index) => {
      const count = progress.has(step.eventName) ? 1 : 0;
      const prevCount = index === 0 ? 1 : (progress.has(funnel.steps[index - 1].eventName) ? 1 : 0);

      return {
        name: step.name,
        count,
        conversionRate: prevCount > 0 ? (count / prevCount) * 100 : 0,
        dropoffRate: prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0,
      };
    });

    const firstStep = steps[0]?.count || 0;
    const lastStep = steps[steps.length - 1]?.count || 0;

    return {
      funnelId,
      steps,
      overallConversion: firstStep > 0 ? (lastStep / firstStep) * 100 : 0,
    };
  }

  /**
   * Register analytics provider
   */
  async registerProvider(provider: AnalyticsProvider, config: Record<string, unknown> = {}): Promise<void> {
    await provider.initialize(config);
    this.providers.push(provider);
    this.log('Provider registered', { name: provider.name });
  }

  /**
   * Send events to providers
   */
  private async sendToProviders(events: AnalyticsEvent[]): Promise<void> {
    for (const provider of this.providers) {
      try {
        for (const event of events) {
          await provider.track(event);
        }
      } catch (error) {
        console.error(`[Analytics] Failed to send to ${provider.name}:`, error);
      }
    }
  }

  /**
   * Flush event queue
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    await this.sendToProviders(eventsToSend);

    // Also flush providers
    for (const provider of this.providers) {
      await provider.flush();
    }

    this.log('Flushed events', { count: eventsToSend.length });
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): DashboardData {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Calculate metrics from local events
    const todayEvents = this.events.filter(e => e.timestamp > now - dayMs);
    const weekEvents = this.events.filter(e => e.timestamp > now - 7 * dayMs);

    return {
      overview: {
        dau: 1, // Single user demo
        wau: 1,
        mau: 1,
        newUsers: this.userProperties?.sessionCount === 1 ? 1 : 0,
        sessionsPerDay: Math.round(todayEvents.filter(e => e.name === 'session_start').length),
        avgSessionDuration: Math.round((now - this.sessionStartTime) / 1000),
        revenue: 0,
      },
      retention: [
        { day: 0, cohortSize: 1, retained: 1, retentionRate: 100 },
        { day: 1, cohortSize: 1, retained: this.userProperties?.sessionCount || 0 > 1 ? 1 : 0, retentionRate: this.userProperties?.sessionCount || 0 > 1 ? 100 : 0 },
        { day: 7, cohortSize: 1, retained: this.userProperties?.sessionCount || 0 > 7 ? 1 : 0, retentionRate: this.userProperties?.sessionCount || 0 > 7 ? 100 : 0 },
      ],
      topEvents: this.getTopEvents(weekEvents),
      userFlow: this.getUserFlow(),
      errorRate: this.getErrorRate(todayEvents),
      performance: {
        avgLoadTime: 0,
        avgFps: 60,
        crashRate: 0,
      },
    };
  }

  /**
   * Get top events
   */
  private getTopEvents(events: AnalyticsEvent[]): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    events.forEach(e => {
      counts.set(e.name, (counts.get(e.name) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get user flow
   */
  private getUserFlow(): Array<{ from: string; to: string; count: number }> {
    const flows = new Map<string, number>();

    for (let i = 1; i < this.screenHistory.length; i++) {
      const key = `${this.screenHistory[i - 1]} -> ${this.screenHistory[i]}`;
      flows.set(key, (flows.get(key) || 0) + 1);
    }

    return Array.from(flows.entries())
      .map(([key, count]) => {
        const [from, to] = key.split(' -> ');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get error rate
   */
  private getErrorRate(events: AnalyticsEvent[]): number {
    const errorCount = events.filter(e => e.category === 'error').length;
    return events.length > 0 ? (errorCount / events.length) * 100 : 0;
  }

  /**
   * Export events
   */
  exportEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Log (debug mode)
   */
  private log(message: string, data?: unknown): void {
    if (this.debugMode) {
      console.log(`[Analytics] ${message}`, data || '');
    }
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Get user properties
   */
  getUserProperties(): UserProperties | null {
    return this.userProperties;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
