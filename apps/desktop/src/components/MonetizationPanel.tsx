/**
 * Monetization Panel
 * UI for IAP, Ads, Analytics, A/B Testing, and Crash Reporting
 */

import { useState, useEffect, useCallback } from 'react';
import { iapService, type Product, type VirtualCurrency, type Purchase } from '../services/IAPService';
import { adService, type AdStats } from '../services/AdService';
import { analyticsService, type DashboardData } from '../services/AnalyticsService';
import { abTestingService, type Experiment, type FeatureFlag } from '../services/ABTestingService';
import { crashReporter, type CrashReport, type ErrorStats } from '../services/CrashReporter';

interface MonetizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (message: string) => void;
}

type TabType = 'iap' | 'ads' | 'analytics' | 'experiments' | 'crashes';

export function MonetizationPanel({ isOpen, onClose, onNotification }: MonetizationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('iap');
  const [products, setProducts] = useState<Product[]>([]);
  const [currencies, setCurrencies] = useState<VirtualCurrency[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [adStats, setAdStats] = useState<AdStats | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [crashReports, setCrashReports] = useState<CrashReport[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize services
  useEffect(() => {
    if (isOpen) {
      initializeServices();
    }
  }, [isOpen]);

  const initializeServices = async () => {
    setLoading(true);
    try {
      // Initialize IAP
      if (!iapService.isInitialized()) {
        await iapService.initialize('demo_user');
      }
      setProducts(iapService.getProducts());
      setCurrencies(iapService.getCurrencies());
      setPurchases(iapService.getPurchaseHistory());

      // Initialize Ads
      if (!adService.isInitialized()) {
        await adService.initialize();
      }
      setAdStats(adService.getStats());

      // Initialize Analytics
      if (!analyticsService.isInitialized()) {
        await analyticsService.initialize('demo_user', { debug: true });
      }
      setDashboardData(analyticsService.getDashboardData());

      // Initialize A/B Testing
      if (!abTestingService.isInitialized()) {
        await abTestingService.initialize('demo_user');
      }
      setExperiments(abTestingService.getExperiments());
      setFlags(abTestingService.getFlags());

      // Initialize Crash Reporter
      if (!crashReporter.isInitialized()) {
        crashReporter.initialize();
      }
      setCrashReports(crashReporter.getReports());
      setErrorStats(crashReporter.getStats());
    } catch (error) {
      console.error('Failed to initialize services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase
  const handlePurchase = useCallback(async (productId: string) => {
    setLoading(true);
    const purchase = await iapService.purchase(productId);
    if (purchase) {
      onNotification('Purchase successful!');
      setPurchases(iapService.getPurchaseHistory());
      setCurrencies(iapService.getCurrencies());
    } else {
      onNotification('Purchase failed');
    }
    setLoading(false);
  }, [onNotification]);

  // Handle ad display
  const handleShowAd = useCallback(async (type: 'banner' | 'interstitial' | 'rewarded') => {
    setLoading(true);
    try {
      switch (type) {
        case 'banner':
          await adService.showBanner();
          onNotification('Banner shown');
          break;
        case 'interstitial':
          const shown = await adService.showInterstitial();
          if (!shown) {
            onNotification('Interstitial on cooldown');
          }
          break;
        case 'rewarded':
          const reward = await adService.showRewarded('rewarded_coins');
          if (reward) {
            onNotification(`Earned ${reward.amount} ${reward.type}!`);
            setCurrencies(iapService.getCurrencies());
          }
          break;
      }
      setAdStats(adService.getStats());
    } catch (error) {
      onNotification('Ad failed to show');
    }
    setLoading(false);
  }, [onNotification]);

  // Track analytics event
  const handleTrackEvent = useCallback((eventName: string) => {
    analyticsService.track(eventName, 'custom', { source: 'monetization_panel' });
    onNotification(`Tracked: ${eventName}`);
    setDashboardData(analyticsService.getDashboardData());
  }, [onNotification]);

  // Toggle feature flag
  const handleToggleFlag = useCallback((flagId: string) => {
    const flag = flags.find(f => f.id === flagId);
    if (flag) {
      abTestingService.updateFlag(flagId, { enabled: !flag.enabled });
      setFlags(abTestingService.getFlags());
      onNotification(`${flag.name} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    }
  }, [flags, onNotification]);

  // Test crash
  const handleTestCrash = useCallback(() => {
    crashReporter.captureMessage('Test error from Monetization Panel', 'error');
    setCrashReports(crashReporter.getReports());
    setErrorStats(crashReporter.getStats());
    onNotification('Test error captured');
  }, [onNotification]);

  if (!isOpen) return null;

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'iap', label: 'Purchases' },
    { id: 'ads', label: 'Ads' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'experiments', label: 'A/B Tests' },
    { id: 'crashes', label: 'Crashes' },
  ];

  const getTabIcon = (id: TabType) => {
    switch (id) {
      case 'iap': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'ads': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'analytics': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'experiments': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
      case 'crashes': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-white">Monetization & Analytics</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-accent'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {getTabIcon(tab.id)}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          )}

          {!loading && activeTab === 'iap' && (
            <IAPTab
              products={products}
              currencies={currencies}
              purchases={purchases}
              onPurchase={handlePurchase}
            />
          )}

          {!loading && activeTab === 'ads' && (
            <AdsTab
              stats={adStats}
              onShowAd={handleShowAd}
              onHideBanner={() => adService.hideBanner()}
            />
          )}

          {!loading && activeTab === 'analytics' && (
            <AnalyticsTab
              data={dashboardData}
              onTrackEvent={handleTrackEvent}
            />
          )}

          {!loading && activeTab === 'experiments' && (
            <ExperimentsTab
              experiments={experiments}
              flags={flags}
              onToggleFlag={handleToggleFlag}
            />
          )}

          {!loading && activeTab === 'crashes' && (
            <CrashesTab
              reports={crashReports}
              stats={errorStats}
              onTestCrash={handleTestCrash}
              onClearReports={() => {
                crashReporter.clearReports();
                setCrashReports([]);
                setErrorStats(crashReporter.getStats());
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// IAP Tab Component
function IAPTab({
  products,
  currencies,
  purchases,
  onPurchase,
}: {
  products: Product[];
  currencies: VirtualCurrency[];
  purchases: Purchase[];
  onPurchase: (productId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Currencies */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Virtual Currencies</h3>
        <div className="flex gap-4">
          {currencies.map(currency => (
            <div key={currency.id} className="bg-black/30 rounded-lg p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${currency.id === 'coins' ? 'bg-yellow-500/20' : 'bg-cyan-500/20'} rounded-full flex items-center justify-center`}>
                {currency.id === 'coins' ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 6v12M8 9h8M8 15h8"/></svg>
                ) : (
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3L2 12l10 9 10-9-10-9zM12 8v8" /></svg>
                )}
              </div>
              <div>
                <div className="text-xs text-text-secondary">{currency.name}</div>
                <div className="text-lg font-bold text-white">{currency.balance.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Available Products</h3>
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-black/30 rounded-lg p-4 border border-subtle hover:border-accent/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-white">{product.name}</h4>
                  <p className="text-xs text-text-secondary mt-1">{product.description}</p>
                </div>
                {Boolean(product.metadata?.bestValue) && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Best Value</span>
                )}
                {Boolean(product.metadata?.popular) && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Popular</span>
                )}
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-accent font-bold">{product.priceFormatted}</span>
                <button
                  onClick={() => onPurchase(product.id)}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Purchase History</h3>
        {purchases.length === 0 ? (
          <p className="text-text-secondary text-sm">No purchases yet</p>
        ) : (
          <div className="space-y-2">
            {purchases.slice(0, 5).map(purchase => (
              <div key={purchase.id} className="bg-black/30 rounded p-3 flex justify-between items-center">
                <div>
                  <div className="text-sm text-white">{purchase.productId}</div>
                  <div className="text-xs text-text-secondary">
                    {new Date(purchase.purchaseDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-accent">${purchase.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Ads Tab Component
function AdsTab({
  stats,
  onShowAd,
  onHideBanner,
}: {
  stats: AdStats | null;
  onShowAd: (type: 'banner' | 'interstitial' | 'rewarded') => void;
  onHideBanner: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Ad Controls */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Test Ads</h3>
        <div className="flex gap-3">
          <button
            onClick={() => onShowAd('banner')}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors"
          >
            Show Banner
          </button>
          <button
            onClick={onHideBanner}
            className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors"
          >
            Hide Banner
          </button>
          <button
            onClick={() => onShowAd('interstitial')}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors"
          >
            Show Interstitial
          </button>
          <button
            onClick={() => onShowAd('rewarded')}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
          >
            Show Rewarded
          </button>
        </div>
      </div>

      {/* Ad Stats */}
      {stats && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Ad Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Impressions" value={stats.impressions} />
            <StatCard label="Clicks" value={stats.clicks} />
            <StatCard label="CTR" value={`${stats.ctr.toFixed(2)}%`} />
            <StatCard label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
            <StatCard label="eCPM" value={`$${stats.ecpm.toFixed(2)}`} />
            <StatCard label="Fill Rate" value={`${stats.fillRate.toFixed(1)}%`} />
            <StatCard label="Requests" value={stats.requestCount} />
            <StatCard label="Errors" value={stats.errorCount} />
          </div>
        </div>
      )}
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({
  data,
  onTrackEvent,
}: {
  data: DashboardData | null;
  onTrackEvent: (event: string) => void;
}) {
  if (!data) return <p className="text-text-secondary">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Track Events</h3>
        <div className="flex gap-2 flex-wrap">
          {['button_click', 'page_view', 'purchase_start', 'level_complete', 'share'].map(event => (
            <button
              key={event}
              onClick={() => onTrackEvent(event)}
              className="px-3 py-1.5 bg-black/30 hover:bg-black/50 text-text-secondary hover:text-white text-sm rounded transition-colors"
            >
              {event}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Overview</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="DAU" value={data.overview.dau} />
          <StatCard label="Sessions/Day" value={data.overview.sessionsPerDay} />
          <StatCard label="Avg Session" value={`${data.overview.avgSessionDuration}s`} />
          <StatCard label="New Users" value={data.overview.newUsers} />
        </div>
      </div>

      {/* Top Events */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Top Events (7 days)</h3>
        <div className="bg-black/30 rounded-lg p-4">
          {data.topEvents.length === 0 ? (
            <p className="text-text-secondary text-sm">No events tracked yet</p>
          ) : (
            <div className="space-y-2">
              {data.topEvents.slice(0, 8).map((event, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-white">{event.name}</span>
                  <span className="text-sm text-text-secondary">{event.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Retention */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Retention</h3>
        <div className="grid grid-cols-3 gap-4">
          {data.retention.map(r => (
            <div key={r.day} className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-xs text-text-secondary">Day {r.day}</div>
              <div className="text-2xl font-bold text-accent">{r.retentionRate}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Experiments Tab Component
function ExperimentsTab({
  experiments,
  flags,
  onToggleFlag,
}: {
  experiments: Experiment[];
  flags: FeatureFlag[];
  onToggleFlag: (flagId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Feature Flags</h3>
        <div className="space-y-2">
          {flags.map(flag => (
            <div key={flag.id} className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-white">{flag.name}</div>
                <div className="text-xs text-text-secondary">{flag.id}</div>
              </div>
              <button
                onClick={() => onToggleFlag(flag.id)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  flag.enabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    flag.enabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Experiments */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">A/B Tests</h3>
        <div className="space-y-3">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-black/30 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-white">{exp.name}</h4>
                  <p className="text-xs text-text-secondary mt-1">{exp.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  exp.status === 'running' ? 'bg-green-500/20 text-green-400' :
                  exp.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {exp.status}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {exp.variants.map(variant => (
                  <div key={variant.id} className="text-xs bg-black/30 rounded px-2 py-1">
                    <span className="text-text-secondary">{variant.name}:</span>
                    <span className="text-white ml-1">{variant.weight}%</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-text-secondary mt-2">
                Traffic: {exp.trafficAllocation}% • Started: {exp.startDate ? new Date(exp.startDate).toLocaleDateString() : 'Not started'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Crashes Tab Component
function CrashesTab({
  reports,
  stats,
  onTestCrash,
  onClearReports,
}: {
  reports: CrashReport[];
  stats: ErrorStats | null;
  onTestCrash: () => void;
  onClearReports: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onTestCrash}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
        >
          Test Error
        </button>
        <button
          onClick={onClearReports}
          className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors"
        >
          Clear Reports
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Error Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Errors" value={stats.total} />
            <StatCard label="Error Rate" value={`${stats.errorRate.toFixed(2)}%`} />
            <StatCard label="Crash-Free" value={`${stats.crashFreeRate.toFixed(1)}%`} />
            <StatCard label="Affected Users" value={stats.affectedUsers} />
          </div>
        </div>
      )}

      {/* By Severity */}
      {stats && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">By Severity</h3>
          <div className="flex gap-2">
            {Object.entries(stats.bySeverity).map(([severity, count]) => (
              <div key={severity} className={`px-3 py-2 rounded text-sm ${
                severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                severity === 'error' ? 'bg-orange-500/20 text-orange-400' :
                severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {severity}: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Recent Reports</h3>
        {reports.length === 0 ? (
          <p className="text-text-secondary text-sm">No error reports</p>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 10).map(report => (
              <div key={report.id} className="bg-black/30 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-white font-mono truncate">{report.message}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {report.category} • {new Date(report.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ml-2 ${
                    report.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    report.severity === 'error' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {report.severity}
                  </span>
                </div>
                {report.stack && (
                  <pre className="text-xs text-text-tertiary mt-2 overflow-x-auto max-h-20 bg-black/30 p-2 rounded">
                    {report.stack.substring(0, 200)}...
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black/30 rounded-lg p-4">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}
