/**
 * Revenue Tracking Service - v5.1
 * Comprehensive revenue tracking, reporting, and forecasting
 */

export interface RevenueEvent {
  id: string;
  type: 'iap' | 'ad' | 'subscription' | 'refund';
  amount: number;
  currency: string;
  productId?: string;
  adUnitId?: string;
  subscriptionId?: string;
  userId?: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  country?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RevenueSummary {
  totalRevenue: number;
  iapRevenue: number;
  adRevenue: number;
  subscriptionRevenue: number;
  refunds: number;
  netRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  transactions: number;
  breakdown: {
    iap: number;
    ads: number;
    subscriptions: number;
  };
}

export interface RevenueForecast {
  period: string;
  predicted: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface RevenueMetrics {
  arpu: number; // Average Revenue Per User
  arppu: number; // Average Revenue Per Paying User
  ltv: number; // Lifetime Value
  conversionRate: number;
  churnRate: number;
  payingUsers: number;
  totalUsers: number;
}

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
  retentionRate: number;
  averageSubscriptionLength: number;
}

type RevenueEventType = 'revenue-recorded' | 'milestone-reached' | 'forecast-updated';
type EventCallback = (data: unknown) => void;

class RevenueService {
  private events: RevenueEvent[] = [];
  private listeners: Map<RevenueEventType, EventCallback[]> = new Map();
  private milestones: number[] = [100, 500, 1000, 5000, 10000, 50000, 100000];
  private reachedMilestones: Set<number> = new Set();

  constructor() {
    this.generateMockData();
  }

  private generateMockData(): void {
    const now = Date.now();
    const platforms: Array<'ios' | 'android' | 'web' | 'desktop'> = ['ios', 'android', 'web', 'desktop'];
    const countries = ['US', 'UK', 'DE', 'JP', 'BR', 'IN', 'CA', 'AU'];

    // Generate 30 days of mock revenue data
    for (let day = 30; day >= 0; day--) {
      const dayTimestamp = now - (day * 24 * 60 * 60 * 1000);
      const transactionsPerDay = Math.floor(Math.random() * 20) + 5;

      for (let i = 0; i < transactionsPerDay; i++) {
        const type = this.randomRevenueType();
        const event: RevenueEvent = {
          id: `rev_${dayTimestamp}_${i}`,
          type,
          amount: this.getRandomAmount(type),
          currency: 'USD',
          platform: platforms[Math.floor(Math.random() * platforms.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          timestamp: dayTimestamp + Math.floor(Math.random() * 24 * 60 * 60 * 1000),
          productId: type === 'iap' ? `product_${Math.floor(Math.random() * 5) + 1}` : undefined,
          adUnitId: type === 'ad' ? `ad_${Math.floor(Math.random() * 3) + 1}` : undefined,
          subscriptionId: type === 'subscription' ? `sub_${Math.floor(Math.random() * 2) + 1}` : undefined,
        };
        this.events.push(event);
      }
    }
  }

  private randomRevenueType(): 'iap' | 'ad' | 'subscription' | 'refund' {
    const rand = Math.random();
    if (rand < 0.5) return 'iap';
    if (rand < 0.8) return 'ad';
    if (rand < 0.95) return 'subscription';
    return 'refund';
  }

  private getRandomAmount(type: RevenueEvent['type']): number {
    switch (type) {
      case 'iap':
        return [0.99, 1.99, 4.99, 9.99, 19.99][Math.floor(Math.random() * 5)];
      case 'ad':
        return Number((Math.random() * 0.05 + 0.01).toFixed(3));
      case 'subscription':
        return [4.99, 9.99, 14.99][Math.floor(Math.random() * 3)];
      case 'refund':
        return -[0.99, 1.99, 4.99, 9.99][Math.floor(Math.random() * 4)];
    }
  }

  // Event handling
  on(event: RevenueEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: RevenueEventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: RevenueEventType, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Record revenue
  recordRevenue(event: Omit<RevenueEvent, 'id' | 'timestamp'>): RevenueEvent {
    const revenueEvent: RevenueEvent = {
      ...event,
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.events.push(revenueEvent);
    this.emit('revenue-recorded', revenueEvent);
    this.checkMilestones();

    return revenueEvent;
  }

  private checkMilestones(): void {
    const totalRevenue = this.getTotalRevenue();

    for (const milestone of this.milestones) {
      if (totalRevenue >= milestone && !this.reachedMilestones.has(milestone)) {
        this.reachedMilestones.add(milestone);
        this.emit('milestone-reached', { milestone, totalRevenue });
      }
    }
  }

  // Get total revenue
  getTotalRevenue(): number {
    return this.events.reduce((sum, e) => sum + e.amount, 0);
  }

  // Get revenue summary
  getSummary(startDate?: number, endDate?: number): RevenueSummary {
    const filteredEvents = this.filterByDate(startDate, endDate);

    const iapRevenue = filteredEvents
      .filter(e => e.type === 'iap')
      .reduce((sum, e) => sum + e.amount, 0);

    const adRevenue = filteredEvents
      .filter(e => e.type === 'ad')
      .reduce((sum, e) => sum + e.amount, 0);

    const subscriptionRevenue = filteredEvents
      .filter(e => e.type === 'subscription')
      .reduce((sum, e) => sum + e.amount, 0);

    const refunds = Math.abs(filteredEvents
      .filter(e => e.type === 'refund')
      .reduce((sum, e) => sum + e.amount, 0));

    const totalRevenue = iapRevenue + adRevenue + subscriptionRevenue;
    const netRevenue = totalRevenue - refunds;
    const transactionCount = filteredEvents.filter(e => e.type !== 'refund').length;

    return {
      totalRevenue,
      iapRevenue,
      adRevenue,
      subscriptionRevenue,
      refunds,
      netRevenue,
      transactionCount,
      averageTransactionValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
      currency: 'USD',
    };
  }

  // Get revenue by period (daily/weekly/monthly)
  getRevenueByPeriod(
    period: 'daily' | 'weekly' | 'monthly',
    count: number = 7
  ): RevenueByPeriod[] {
    const result: RevenueByPeriod[] = [];
    const now = Date.now();

    const periodMs = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    for (let i = count - 1; i >= 0; i--) {
      const endTime = now - (i * periodMs[period]);
      const startTime = endTime - periodMs[period];

      const periodEvents = this.filterByDate(startTime, endTime);

      const iap = periodEvents.filter(e => e.type === 'iap').reduce((s, e) => s + e.amount, 0);
      const ads = periodEvents.filter(e => e.type === 'ad').reduce((s, e) => s + e.amount, 0);
      const subs = periodEvents.filter(e => e.type === 'subscription').reduce((s, e) => s + e.amount, 0);

      result.push({
        period: new Date(endTime).toLocaleDateString(),
        revenue: iap + ads + subs,
        transactions: periodEvents.filter(e => e.type !== 'refund').length,
        breakdown: { iap, ads, subscriptions: subs },
      });
    }

    return result;
  }

  // Get revenue by platform
  getRevenueByPlatform(): Record<string, number> {
    const byPlatform: Record<string, number> = {};

    for (const event of this.events) {
      if (event.type !== 'refund') {
        byPlatform[event.platform] = (byPlatform[event.platform] || 0) + event.amount;
      }
    }

    return byPlatform;
  }

  // Get revenue by country
  getRevenueByCountry(): Record<string, number> {
    const byCountry: Record<string, number> = {};

    for (const event of this.events) {
      if (event.type !== 'refund' && event.country) {
        byCountry[event.country] = (byCountry[event.country] || 0) + event.amount;
      }
    }

    return byCountry;
  }

  // Get revenue metrics
  getMetrics(): RevenueMetrics {
    const totalUsers = 1000 + Math.floor(Math.random() * 500); // Mock
    const payingUsers = Math.floor(totalUsers * 0.05); // 5% conversion
    const totalRevenue = this.getTotalRevenue();

    return {
      arpu: totalRevenue / totalUsers,
      arppu: payingUsers > 0 ? totalRevenue / payingUsers : 0,
      ltv: (totalRevenue / payingUsers) * 3, // Estimated 3x ARPPU
      conversionRate: (payingUsers / totalUsers) * 100,
      churnRate: 5 + Math.random() * 3, // 5-8% mock churn
      payingUsers,
      totalUsers,
    };
  }

  // Get subscription metrics
  getSubscriptionMetrics(): SubscriptionMetrics {
    const subscriptionEvents = this.events.filter(e => e.type === 'subscription');
    const uniqueSubscriptions = new Set(subscriptionEvents.map(e => e.subscriptionId)).size;
    const monthlyRevenue = subscriptionEvents
      .filter(e => e.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      activeSubscriptions: uniqueSubscriptions,
      mrr: monthlyRevenue,
      arr: monthlyRevenue * 12,
      churnRate: 3 + Math.random() * 2, // 3-5% mock churn
      retentionRate: 95 + Math.random() * 3, // 95-98% retention
      averageSubscriptionLength: 6 + Math.floor(Math.random() * 6), // 6-12 months
    };
  }

  // Revenue forecasting
  getForecast(periods: number = 7): RevenueForecast[] {
    const historicalData = this.getRevenueByPeriod('daily', 30);
    const avgRevenue = historicalData.reduce((s, d) => s + d.revenue, 0) / historicalData.length;
    const variance = historicalData.reduce((s, d) => s + Math.pow(d.revenue - avgRevenue, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);

    const forecast: RevenueForecast[] = [];
    const now = Date.now();

    for (let i = 1; i <= periods; i++) {
      const date = new Date(now + i * 24 * 60 * 60 * 1000);
      const trend = 1 + (i * 0.01); // Slight upward trend
      const predicted = avgRevenue * trend;

      forecast.push({
        period: date.toLocaleDateString(),
        predicted: Number(predicted.toFixed(2)),
        confidence: Math.max(0.5, 0.95 - (i * 0.05)),
        lowerBound: Number((predicted - stdDev * 1.96).toFixed(2)),
        upperBound: Number((predicted + stdDev * 1.96).toFixed(2)),
      });
    }

    this.emit('forecast-updated', forecast);
    return forecast;
  }

  // Get top products by revenue
  getTopProducts(limit: number = 5): Array<{ productId: string; revenue: number; transactions: number }> {
    const productRevenue: Map<string, { revenue: number; transactions: number }> = new Map();

    for (const event of this.events) {
      if (event.type === 'iap' && event.productId) {
        const current = productRevenue.get(event.productId) || { revenue: 0, transactions: 0 };
        productRevenue.set(event.productId, {
          revenue: current.revenue + event.amount,
          transactions: current.transactions + 1,
        });
      }
    }

    return Array.from(productRevenue.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // Get recent transactions
  getRecentTransactions(limit: number = 20): RevenueEvent[] {
    return [...this.events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Export revenue data
  exportData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify({
        summary: this.getSummary(),
        events: this.events,
        metrics: this.getMetrics(),
        subscriptionMetrics: this.getSubscriptionMetrics(),
      }, null, 2);
    }

    // CSV export
    const headers = ['id', 'type', 'amount', 'currency', 'platform', 'country', 'timestamp', 'productId', 'adUnitId', 'subscriptionId'];
    const rows = this.events.map(e =>
      headers.map(h => String(e[h as keyof RevenueEvent] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // Helper methods
  private filterByDate(startDate?: number, endDate?: number): RevenueEvent[] {
    return this.events.filter(e => {
      if (startDate && e.timestamp < startDate) return false;
      if (endDate && e.timestamp > endDate) return false;
      return true;
    });
  }

  // Clear all data
  clear(): void {
    this.events = [];
    this.reachedMilestones.clear();
  }
}

export const revenueService = new RevenueService();
export default revenueService;
