/**
 * A/B Testing Service
 * Feature experimentation and variant management
 */

import { analyticsService } from './AnalyticsService';

// Experiment status
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

// Variant type
export type VariantType = 'control' | 'treatment';

// Allocation method
export type AllocationMethod = 'random' | 'deterministic' | 'sticky';

// Experiment definition
export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  startDate?: number;
  endDate?: number;
  targetAudience?: AudienceFilter;
  variants: Variant[];
  metrics: MetricDefinition[];
  allocationMethod: AllocationMethod;
  trafficAllocation: number; // 0-100%
  createdAt: number;
  updatedAt: number;
}

// Variant definition
export interface Variant {
  id: string;
  name: string;
  type: VariantType;
  weight: number; // 0-100%
  config: Record<string, unknown>;
  description?: string;
}

// Audience filter
export interface AudienceFilter {
  rules: AudienceRule[];
  operator: 'and' | 'or';
}

// Audience rule
export interface AudienceRule {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

// Metric definition
export interface MetricDefinition {
  id: string;
  name: string;
  eventName: string;
  type: 'conversion' | 'count' | 'sum' | 'average';
  goal: 'increase' | 'decrease';
  minimumSampleSize?: number;
  filters?: Record<string, unknown>;
}

// Experiment result
export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  metrics: MetricResult[];
  sampleSize: number;
  confidence: number;
  isSignificant: boolean;
  winner?: string;
}

// Metric result
export interface MetricResult {
  metricId: string;
  control: {
    value: number;
    sampleSize: number;
  };
  treatment: {
    value: number;
    sampleSize: number;
    lift: number;
    confidence: number;
  };
}

// User assignment
export interface UserAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: number;
  exposed: boolean;
  converted: boolean;
}

// Feature flag
export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  conditions?: AudienceFilter;
  defaultValue: unknown;
  variants?: Array<{
    value: unknown;
    weight: number;
    conditions?: AudienceFilter;
  }>;
}

// A/B Testing event
export type ABTestEvent =
  | 'experiment-started'
  | 'experiment-stopped'
  | 'variant-assigned'
  | 'exposure-logged'
  | 'conversion-logged'
  | 'flag-evaluated';

// Default experiments for demo
const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp_onboarding_flow',
    name: 'Onboarding Flow Test',
    description: 'Test simplified vs detailed onboarding',
    status: 'running',
    startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    variants: [
      { id: 'control', name: 'Original Flow', type: 'control', weight: 50, config: { flowType: 'detailed' } },
      { id: 'treatment_a', name: 'Simplified Flow', type: 'treatment', weight: 50, config: { flowType: 'simple' } },
    ],
    metrics: [
      { id: 'completion_rate', name: 'Onboarding Completion', eventName: 'tutorial_complete', type: 'conversion', goal: 'increase' },
      { id: 'time_to_complete', name: 'Time to Complete', eventName: 'tutorial_complete', type: 'average', goal: 'decrease' },
    ],
    allocationMethod: 'sticky',
    trafficAllocation: 100,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    id: 'exp_pricing_page',
    name: 'Pricing Page Layout',
    description: 'Test different pricing page designs',
    status: 'running',
    startDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
    variants: [
      { id: 'control', name: 'Current Design', type: 'control', weight: 33, config: { layout: 'cards' } },
      { id: 'treatment_a', name: 'Table Layout', type: 'treatment', weight: 33, config: { layout: 'table' } },
      { id: 'treatment_b', name: 'Slider Layout', type: 'treatment', weight: 34, config: { layout: 'slider' } },
    ],
    metrics: [
      { id: 'purchase_rate', name: 'Purchase Rate', eventName: 'purchase_complete', type: 'conversion', goal: 'increase' },
      { id: 'revenue', name: 'Revenue per User', eventName: 'purchase_complete', type: 'sum', goal: 'increase' },
    ],
    allocationMethod: 'sticky',
    trafficAllocation: 50,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
];

// Default feature flags
const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: 'flag_dark_mode',
    name: 'Dark Mode',
    enabled: true,
    defaultValue: true,
  },
  {
    id: 'flag_new_editor',
    name: 'New Editor',
    enabled: false,
    defaultValue: false,
    conditions: {
      rules: [{ property: 'isPremium', operator: 'equals', value: true }],
      operator: 'and',
    },
  },
  {
    id: 'flag_multiplayer',
    name: 'Multiplayer Features',
    enabled: true,
    defaultValue: true,
  },
  {
    id: 'flag_ai_assistant',
    name: 'AI Assistant',
    enabled: true,
    defaultValue: true,
  },
];

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private flags: Map<string, FeatureFlag> = new Map();
  private assignments: Map<string, UserAssignment> = new Map();
  private exposures: Map<string, Set<string>> = new Map();
  private conversions: Map<string, Map<string, number>> = new Map();
  private eventListeners: Map<ABTestEvent, Set<(data: unknown) => void>> = new Map();
  private userId: string = '';
  private userProperties: Record<string, unknown> = {};
  private initialized: boolean = false;

  constructor() {
    this.loadDefaults();
  }

  /**
   * Load default experiments and flags
   */
  private loadDefaults(): void {
    DEFAULT_EXPERIMENTS.forEach(exp => {
      this.experiments.set(exp.id, exp);
    });

    DEFAULT_FLAGS.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  /**
   * Initialize A/B testing service
   */
  async initialize(userId: string, userProperties: Record<string, unknown> = {}): Promise<void> {
    this.userId = userId;
    this.userProperties = userProperties;

    // Load saved assignments
    this.loadAssignments();

    // Assign user to experiments
    this.experiments.forEach((exp, expId) => {
      if (exp.status === 'running') {
        this.getVariant(expId);
      }
    });

    this.initialized = true;
    console.log('[ABTesting] Service initialized');
  }

  /**
   * Load saved assignments from storage
   */
  private loadAssignments(): void {
    try {
      const saved = localStorage.getItem(`ab_assignments_${this.userId}`);
      if (saved) {
        const assignments = JSON.parse(saved) as Record<string, UserAssignment>;
        Object.entries(assignments).forEach(([key, value]) => {
          this.assignments.set(key, value);
        });
      }
    } catch (error) {
      console.error('[ABTesting] Failed to load assignments:', error);
    }
  }

  /**
   * Save assignments to storage
   */
  private saveAssignments(): void {
    try {
      const assignments: Record<string, UserAssignment> = {};
      this.assignments.forEach((value, key) => {
        assignments[key] = value;
      });
      localStorage.setItem(`ab_assignments_${this.userId}`, JSON.stringify(assignments));
    } catch (error) {
      console.error('[ABTesting] Failed to save assignments:', error);
    }
  }

  /**
   * Get variant for an experiment
   */
  getVariant(experimentId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    // Check traffic allocation
    if (!this.isInTrafficAllocation(experimentId, experiment.trafficAllocation)) {
      return null;
    }

    // Check audience targeting
    if (experiment.targetAudience && !this.matchesAudience(experiment.targetAudience)) {
      return null;
    }

    // Check existing assignment
    const existingAssignment = this.assignments.get(experimentId);
    if (existingAssignment && experiment.allocationMethod === 'sticky') {
      const variant = experiment.variants.find(v => v.id === existingAssignment.variantId);
      if (variant) {
        return variant;
      }
    }

    // Assign variant
    const variant = this.assignVariant(experiment);
    if (variant) {
      const assignment: UserAssignment = {
        experimentId,
        variantId: variant.id,
        assignedAt: Date.now(),
        exposed: false,
        converted: false,
      };
      this.assignments.set(experimentId, assignment);
      this.saveAssignments();

      this.emit('variant-assigned', { experimentId, variantId: variant.id, variant });
    }

    return variant;
  }

  /**
   * Check if user is in traffic allocation
   */
  private isInTrafficAllocation(experimentId: string, allocation: number): boolean {
    const hash = this.hashString(`${this.userId}_${experimentId}_traffic`);
    return (hash % 100) < allocation;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Check if user matches audience filter
   */
  private matchesAudience(filter: AudienceFilter): boolean {
    const results = filter.rules.map(rule => this.evaluateRule(rule));

    if (filter.operator === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate audience rule
   */
  private evaluateRule(rule: AudienceRule): boolean {
    const value = this.userProperties[rule.property];

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'contains':
        return String(value).includes(String(rule.value));
      case 'gt':
        return Number(value) > Number(rule.value);
      case 'lt':
        return Number(value) < Number(rule.value);
      case 'gte':
        return Number(value) >= Number(rule.value);
      case 'lte':
        return Number(value) <= Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Assign variant based on weights
   */
  private assignVariant(experiment: Experiment): Variant | null {
    const hash = this.hashString(`${this.userId}_${experiment.id}`);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    return experiment.variants[0] || null;
  }

  /**
   * Log exposure (when user sees the variant)
   */
  logExposure(experimentId: string): void {
    const assignment = this.assignments.get(experimentId);
    if (!assignment) return;

    // Track unique exposures
    let exposures = this.exposures.get(experimentId);
    if (!exposures) {
      exposures = new Set();
      this.exposures.set(experimentId, exposures);
    }
    exposures.add(this.userId);

    // Mark as exposed
    assignment.exposed = true;
    this.saveAssignments();

    // Track in analytics
    analyticsService.track('experiment_exposure', 'custom', {
      experimentId,
      variantId: assignment.variantId,
    });

    this.emit('exposure-logged', { experimentId, variantId: assignment.variantId });
  }

  /**
   * Log conversion
   */
  logConversion(experimentId: string, metricId: string, value: number = 1): void {
    const assignment = this.assignments.get(experimentId);
    if (!assignment || !assignment.exposed) return;

    // Track conversion
    let metricConversions = this.conversions.get(experimentId);
    if (!metricConversions) {
      metricConversions = new Map();
      this.conversions.set(experimentId, metricConversions);
    }

    const currentValue = metricConversions.get(metricId) || 0;
    metricConversions.set(metricId, currentValue + value);

    // Mark as converted
    assignment.converted = true;
    this.saveAssignments();

    // Track in analytics
    analyticsService.track('experiment_conversion', 'custom', {
      experimentId,
      variantId: assignment.variantId,
      metricId,
      value,
    });

    this.emit('conversion-logged', {
      experimentId,
      variantId: assignment.variantId,
      metricId,
      value,
    });
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const exposures = this.exposures.get(experimentId)?.size || 0;
    const assignment = this.assignments.get(experimentId);

    // In a real implementation, this would aggregate data from all users
    // For demo, we return mock results
    const controlVariant = experiment.variants.find(v => v.type === 'control');
    const treatmentVariant = experiment.variants.find(v => v.type === 'treatment');

    const metrics: MetricResult[] = experiment.metrics.map(metric => ({
      metricId: metric.id,
      control: {
        value: Math.random() * 100,
        sampleSize: Math.floor(exposures * 0.5),
      },
      treatment: {
        value: Math.random() * 100,
        sampleSize: Math.floor(exposures * 0.5),
        lift: (Math.random() - 0.5) * 40, // -20% to +20%
        confidence: 75 + Math.random() * 20, // 75-95%
      },
    }));

    return {
      experimentId,
      variantId: assignment?.variantId || controlVariant?.id || '',
      metrics,
      sampleSize: exposures,
      confidence: metrics[0]?.treatment.confidence || 0,
      isSignificant: metrics[0]?.treatment.confidence > 95,
      winner: metrics[0]?.treatment.lift > 0 ? treatmentVariant?.id : controlVariant?.id,
    };
  }

  /**
   * Get feature flag value
   */
  getFlag<T = unknown>(flagId: string): T | null {
    const flag = this.flags.get(flagId);
    if (!flag) return null;

    // Check if flag is enabled
    if (!flag.enabled) {
      return flag.defaultValue as T;
    }

    // Check conditions
    if (flag.conditions && !this.matchesAudience(flag.conditions)) {
      return flag.defaultValue as T;
    }

    // Check variant conditions
    if (flag.variants) {
      for (const variant of flag.variants) {
        if (!variant.conditions || this.matchesAudience(variant.conditions)) {
          // Check weight
          const hash = this.hashString(`${this.userId}_${flagId}`);
          if ((hash % 100) < variant.weight) {
            this.emit('flag-evaluated', { flagId, value: variant.value });
            return variant.value as T;
          }
        }
      }
    }

    this.emit('flag-evaluated', { flagId, value: flag.defaultValue });
    return flag.defaultValue as T;
  }

  /**
   * Check if feature flag is enabled
   */
  isFlagEnabled(flagId: string): boolean {
    return this.getFlag<boolean>(flagId) === true;
  }

  /**
   * Create experiment
   */
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Experiment {
    const newExperiment: Experiment = {
      ...experiment,
      id: `exp_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.experiments.set(newExperiment.id, newExperiment);
    return newExperiment;
  }

  /**
   * Start experiment
   */
  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'running';
    experiment.startDate = Date.now();
    experiment.updatedAt = Date.now();

    this.emit('experiment-started', { experimentId });
    return true;
  }

  /**
   * Stop experiment
   */
  stopExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'completed';
    experiment.endDate = Date.now();
    experiment.updatedAt = Date.now();

    this.emit('experiment-stopped', { experimentId });
    return true;
  }

  /**
   * Create feature flag
   */
  createFlag(flag: Omit<FeatureFlag, 'id'>): FeatureFlag {
    const newFlag: FeatureFlag = {
      ...flag,
      id: `flag_${Date.now()}`,
    };

    this.flags.set(newFlag.id, newFlag);
    return newFlag;
  }

  /**
   * Update feature flag
   */
  updateFlag(flagId: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    Object.assign(flag, updates);
    return true;
  }

  /**
   * Get all experiments
   */
  getExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * Get all feature flags
   */
  getFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get user's current assignments
   */
  getAssignments(): UserAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Update user properties
   */
  setUserProperties(properties: Record<string, unknown>): void {
    this.userProperties = { ...this.userProperties, ...properties };
  }

  /**
   * Add event listener
   */
  on(event: ABTestEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: ABTestEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: ABTestEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset assignments (for testing)
   */
  resetAssignments(): void {
    this.assignments.clear();
    this.exposures.clear();
    this.conversions.clear();
    localStorage.removeItem(`ab_assignments_${this.userId}`);
  }
}

// Singleton instance
export const abTestingService = new ABTestingService();
