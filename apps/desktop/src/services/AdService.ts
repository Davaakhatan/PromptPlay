/**
 * Ad Service
 * Handles rewarded, interstitial, and banner advertisements
 */

import { iapService } from './IAPService';

// Ad types
export type AdType = 'banner' | 'interstitial' | 'rewarded' | 'native';

// Ad position (for banners)
export type AdPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Ad size (for banners)
export type AdSize = 'banner' | 'large-banner' | 'medium-rectangle' | 'leaderboard' | 'smart';

// Ad state
export type AdState = 'loading' | 'loaded' | 'showing' | 'closed' | 'failed' | 'clicked';

// Ad network
export type AdNetwork = 'admob' | 'unity' | 'applovin' | 'ironsource' | 'facebook' | 'custom';

// Ad unit configuration
export interface AdUnitConfig {
  id: string;
  type: AdType;
  network: AdNetwork;
  unitId: string;
  testMode?: boolean;
  position?: AdPosition;
  size?: AdSize;
  refreshInterval?: number;
}

// Ad instance
export interface AdInstance {
  id: string;
  config: AdUnitConfig;
  state: AdState;
  loadedAt?: number;
  impressions: number;
  clicks: number;
  revenue: number;
}

// Reward configuration
export interface RewardConfig {
  type: string;
  amount: number;
  currencyId?: string;
}

// Ad event
export type AdEvent =
  | 'ad-loaded'
  | 'ad-failed'
  | 'ad-opened'
  | 'ad-closed'
  | 'ad-clicked'
  | 'ad-impression'
  | 'ad-rewarded'
  | 'ad-revenue';

// Ad stats
export interface AdStats {
  impressions: number;
  clicks: number;
  revenue: number;
  ctr: number;
  ecpm: number;
  fillRate: number;
  requestCount: number;
  errorCount: number;
}

// Default ad units for demo
const DEFAULT_AD_UNITS: AdUnitConfig[] = [
  {
    id: 'banner_bottom',
    type: 'banner',
    network: 'custom',
    unitId: 'demo_banner',
    position: 'bottom',
    size: 'smart',
    refreshInterval: 30000,
  },
  {
    id: 'interstitial_main',
    type: 'interstitial',
    network: 'custom',
    unitId: 'demo_interstitial',
    testMode: true,
  },
  {
    id: 'rewarded_coins',
    type: 'rewarded',
    network: 'custom',
    unitId: 'demo_rewarded',
    testMode: true,
  },
  {
    id: 'rewarded_lives',
    type: 'rewarded',
    network: 'custom',
    unitId: 'demo_rewarded_lives',
    testMode: true,
  },
];

// Default rewards
const DEFAULT_REWARDS: Record<string, RewardConfig> = {
  rewarded_coins: { type: 'currency', amount: 50, currencyId: 'coins' },
  rewarded_lives: { type: 'lives', amount: 1 },
  rewarded_double: { type: 'multiplier', amount: 2 },
  rewarded_skip: { type: 'skip', amount: 1 },
};

class AdService {
  private adUnits: Map<string, AdUnitConfig> = new Map();
  private adInstances: Map<string, AdInstance> = new Map();
  private rewards: Map<string, RewardConfig> = new Map();
  private eventListeners: Map<AdEvent, Set<(data: unknown) => void>> = new Map();
  private stats: AdStats = {
    impressions: 0,
    clicks: 0,
    revenue: 0,
    ctr: 0,
    ecpm: 0,
    fillRate: 0,
    requestCount: 0,
    errorCount: 0,
  };
  private initialized: boolean = false;
  private adsEnabled: boolean = true;
  private bannerContainer: HTMLElement | null = null;
  private currentBanner: string | null = null;
  private bannerRefreshTimer: number | null = null;
  private lastInterstitialTime: number = 0;
  private interstitialCooldown: number = 60000; // 1 minute between interstitials
  private rewardedWatchCount: Map<string, number> = new Map();
  private dailyRewardedLimit: number = 10;

  constructor() {
    this.loadDefaultConfig();
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): void {
    DEFAULT_AD_UNITS.forEach(unit => {
      this.adUnits.set(unit.id, unit);
    });

    Object.entries(DEFAULT_REWARDS).forEach(([id, reward]) => {
      this.rewards.set(id, reward);
    });
  }

  /**
   * Initialize the ad service
   */
  async initialize(): Promise<void> {
    // Check if ads should be disabled
    if (iapService.hasRemovedAds()) {
      this.adsEnabled = false;
      console.log('[Ads] Ads disabled - user has remove_ads purchase');
    }

    // Load saved stats
    this.loadStats();

    // Reset daily limits if needed
    this.checkDailyReset();

    // Create banner container
    this.createBannerContainer();

    this.initialized = true;
    console.log('[Ads] Service initialized');
  }

  /**
   * Create banner container element
   */
  private createBannerContainer(): void {
    if (typeof document === 'undefined') return;

    this.bannerContainer = document.createElement('div');
    this.bannerContainer.id = 'ad-banner-container';
    this.bannerContainer.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      z-index: 9999;
      display: none;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    `;
    document.body.appendChild(this.bannerContainer);
  }

  /**
   * Load ad unit
   */
  async loadAd(adUnitId: string): Promise<boolean> {
    if (!this.adsEnabled) return false;

    const config = this.adUnits.get(adUnitId);
    if (!config) {
      console.error('[Ads] Ad unit not found:', adUnitId);
      return false;
    }

    this.stats.requestCount++;

    try {
      // Simulate loading (in production, call actual ad SDK)
      await this.simulateAdLoad(config);

      const instance: AdInstance = {
        id: adUnitId,
        config,
        state: 'loaded',
        loadedAt: Date.now(),
        impressions: 0,
        clicks: 0,
        revenue: 0,
      };

      this.adInstances.set(adUnitId, instance);
      this.emit('ad-loaded', { adUnitId, type: config.type });

      return true;
    } catch (error) {
      this.stats.errorCount++;
      this.emit('ad-failed', { adUnitId, error });
      return false;
    }
  }

  /**
   * Simulate ad loading
   */
  private async simulateAdLoad(config: AdUnitConfig): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Simulate occasional failures (10% fail rate in demo)
    if (Math.random() < 0.1) {
      throw new Error('No fill');
    }

    console.log(`[Ads] Loaded ${config.type} ad: ${config.id}`);
  }

  /**
   * Check if ad is loaded
   */
  isAdLoaded(adUnitId: string): boolean {
    const instance = this.adInstances.get(adUnitId);
    return instance?.state === 'loaded';
  }

  /**
   * Show banner ad
   */
  async showBanner(adUnitId: string = 'banner_bottom'): Promise<boolean> {
    if (!this.adsEnabled || !this.bannerContainer) return false;

    const config = this.adUnits.get(adUnitId);
    if (!config || config.type !== 'banner') {
      console.error('[Ads] Invalid banner ad unit:', adUnitId);
      return false;
    }

    // Load if not loaded
    if (!this.isAdLoaded(adUnitId)) {
      const loaded = await this.loadAd(adUnitId);
      if (!loaded) return false;
    }

    // Hide current banner
    this.hideBanner();

    // Position container
    if (config.position?.includes('top')) {
      this.bannerContainer.style.top = '0';
      this.bannerContainer.style.bottom = 'auto';
    } else {
      this.bannerContainer.style.top = 'auto';
      this.bannerContainer.style.bottom = '0';
    }

    // Create banner element
    const bannerEl = this.createBannerElement(config);
    this.bannerContainer.innerHTML = '';
    this.bannerContainer.appendChild(bannerEl);
    this.bannerContainer.style.display = 'flex';

    this.currentBanner = adUnitId;
    this.recordImpression(adUnitId);

    // Set up refresh timer
    if (config.refreshInterval) {
      this.bannerRefreshTimer = window.setTimeout(() => {
        this.refreshBanner(adUnitId);
      }, config.refreshInterval);
    }

    this.emit('ad-opened', { adUnitId, type: 'banner' });
    return true;
  }

  /**
   * Create banner element
   */
  private createBannerElement(config: AdUnitConfig): HTMLElement {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    banner.innerHTML = `
      <span style="font-weight: bold;">AD</span>
      <span>Demo Banner - ${config.id}</span>
      <button style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
      ">✕</button>
    `;

    // Click handler
    banner.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') {
        this.hideBanner();
      } else {
        this.recordClick(config.id);
      }
    });

    return banner;
  }

  /**
   * Hide banner ad
   */
  hideBanner(): void {
    if (this.bannerRefreshTimer) {
      clearTimeout(this.bannerRefreshTimer);
      this.bannerRefreshTimer = null;
    }

    if (this.bannerContainer) {
      this.bannerContainer.style.display = 'none';
      this.bannerContainer.innerHTML = '';
    }

    if (this.currentBanner) {
      this.emit('ad-closed', { adUnitId: this.currentBanner, type: 'banner' });
      this.currentBanner = null;
    }
  }

  /**
   * Refresh banner ad
   */
  private async refreshBanner(adUnitId: string): Promise<void> {
    // Reload and show
    await this.loadAd(adUnitId);
    await this.showBanner(adUnitId);
  }

  /**
   * Show interstitial ad
   */
  async showInterstitial(adUnitId: string = 'interstitial_main'): Promise<boolean> {
    if (!this.adsEnabled) return false;

    // Check cooldown
    if (Date.now() - this.lastInterstitialTime < this.interstitialCooldown) {
      console.log('[Ads] Interstitial on cooldown');
      return false;
    }

    const config = this.adUnits.get(adUnitId);
    if (!config || config.type !== 'interstitial') {
      console.error('[Ads] Invalid interstitial ad unit:', adUnitId);
      return false;
    }

    // Load if not loaded
    if (!this.isAdLoaded(adUnitId)) {
      const loaded = await this.loadAd(adUnitId);
      if (!loaded) return false;
    }

    // Show interstitial overlay
    return this.showInterstitialOverlay(config);
  }

  /**
   * Show interstitial overlay
   */
  private showInterstitialOverlay(config: AdUnitConfig): Promise<boolean> {
    return new Promise(resolve => {
      if (typeof document === 'undefined') {
        resolve(false);
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'ad-interstitial-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: system-ui, sans-serif;
        color: white;
      `;

      const closeTime = 5; // seconds
      let countdown = closeTime;

      overlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          max-width: 400px;
        ">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">ADVERTISEMENT</div>
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Demo Interstitial</div>
          <div style="font-size: 14px; margin-bottom: 24px;">
            This is a demo interstitial ad. In production, this would show actual ads from your ad network.
          </div>
          <div id="ad-countdown" style="
            font-size: 14px;
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            display: inline-block;
          ">
            Close in ${countdown}s
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.emit('ad-opened', { adUnitId: config.id, type: 'interstitial' });
      this.recordImpression(config.id);

      // Countdown timer
      const countdownEl = overlay.querySelector('#ad-countdown')!;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          countdownEl.innerHTML = '<button id="ad-close-btn" style="background: white; color: #667eea; border: none; padding: 8px 24px; border-radius: 20px; cursor: pointer; font-weight: bold;">Close</button>';
          const closeBtn = overlay.querySelector('#ad-close-btn')!;
          closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.lastInterstitialTime = Date.now();
            this.emit('ad-closed', { adUnitId: config.id, type: 'interstitial' });
            resolve(true);
          });
        } else {
          countdownEl.textContent = `Close in ${countdown}s`;
        }
      }, 1000);

      // Click handler for ad content
      overlay.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id !== 'ad-close-btn') {
          this.recordClick(config.id);
        }
      });
    });
  }

  /**
   * Show rewarded ad
   */
  async showRewarded(adUnitId: string, rewardId?: string): Promise<RewardConfig | null> {
    if (!this.adsEnabled) return null;

    // Check daily limit
    const watchCount = this.rewardedWatchCount.get(adUnitId) || 0;
    if (watchCount >= this.dailyRewardedLimit) {
      console.log('[Ads] Daily rewarded limit reached');
      return null;
    }

    const config = this.adUnits.get(adUnitId);
    if (!config || config.type !== 'rewarded') {
      console.error('[Ads] Invalid rewarded ad unit:', adUnitId);
      return null;
    }

    // Load if not loaded
    if (!this.isAdLoaded(adUnitId)) {
      const loaded = await this.loadAd(adUnitId);
      if (!loaded) return null;
    }

    // Get reward config
    const reward = this.rewards.get(rewardId || adUnitId) || DEFAULT_REWARDS.rewarded_coins;

    // Show rewarded overlay
    const completed = await this.showRewardedOverlay(config, reward);

    if (completed) {
      // Grant reward
      await this.grantReward(reward);

      // Update watch count
      this.rewardedWatchCount.set(adUnitId, watchCount + 1);
      this.saveStats();

      return reward;
    }

    return null;
  }

  /**
   * Show rewarded overlay
   */
  private showRewardedOverlay(config: AdUnitConfig, reward: RewardConfig): Promise<boolean> {
    return new Promise(resolve => {
      if (typeof document === 'undefined') {
        resolve(false);
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'ad-rewarded-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: system-ui, sans-serif;
        color: white;
      `;

      const watchTime = 15; // seconds
      let progress = 0;

      overlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          max-width: 400px;
        ">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">REWARDED VIDEO</div>
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Watch to Earn!</div>
          <div style="font-size: 16px; margin-bottom: 8px;">
            Reward: <strong>${reward.amount} ${reward.type}</strong>
          </div>
          <div style="font-size: 14px; margin-bottom: 24px; opacity: 0.8;">
            Watch the complete video to receive your reward
          </div>
          <div style="
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 16px;
          ">
            <div id="ad-progress" style="
              width: 0%;
              height: 100%;
              background: white;
              transition: width 0.1s linear;
            "></div>
          </div>
          <div id="ad-status" style="font-size: 14px;">
            Watching... ${watchTime}s remaining
          </div>
          <button id="ad-skip" style="
            margin-top: 16px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Skip (No Reward)</button>
        </div>
      `;

      document.body.appendChild(overlay);
      this.emit('ad-opened', { adUnitId: config.id, type: 'rewarded' });
      this.recordImpression(config.id);

      const progressBar = overlay.querySelector('#ad-progress') as HTMLElement;
      const statusEl = overlay.querySelector('#ad-status') as HTMLElement;
      const skipBtn = overlay.querySelector('#ad-skip') as HTMLElement;

      let completed = false;

      // Progress timer
      const timer = setInterval(() => {
        progress += (100 / watchTime / 10);
        progressBar.style.width = `${Math.min(progress, 100)}%`;

        const remaining = Math.ceil(watchTime - (progress / 100 * watchTime));
        statusEl.textContent = `Watching... ${remaining}s remaining`;

        if (progress >= 100) {
          clearInterval(timer);
          completed = true;
          statusEl.innerHTML = '<span style="color: #90EE90;">✓ Complete! Reward earned!</span>';
          skipBtn.textContent = 'Claim Reward';
          skipBtn.style.background = 'white';
          skipBtn.style.color = '#11998e';
        }
      }, 100);

      // Skip/claim button
      skipBtn.addEventListener('click', () => {
        clearInterval(timer);
        document.body.removeChild(overlay);

        if (completed) {
          this.emit('ad-rewarded', { adUnitId: config.id, reward });
        }
        this.emit('ad-closed', { adUnitId: config.id, type: 'rewarded', completed });
        resolve(completed);
      });

      // Record click on overlay
      overlay.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id !== 'ad-skip') {
          this.recordClick(config.id);
        }
      });
    });
  }

  /**
   * Grant reward to user
   */
  private async grantReward(reward: RewardConfig): Promise<void> {
    if (reward.type === 'currency' && reward.currencyId) {
      await iapService.addCurrency(reward.currencyId, reward.amount);
    }
    // Other reward types would be handled by game-specific logic
  }

  /**
   * Record impression
   */
  private recordImpression(adUnitId: string): void {
    const instance = this.adInstances.get(adUnitId);
    if (instance) {
      instance.impressions++;
      instance.revenue += 0.001 + Math.random() * 0.003; // Simulated eCPM
    }

    this.stats.impressions++;
    this.updateStats();
    this.emit('ad-impression', { adUnitId });
  }

  /**
   * Record click
   */
  private recordClick(adUnitId: string): void {
    const instance = this.adInstances.get(adUnitId);
    if (instance) {
      instance.clicks++;
      instance.revenue += 0.01 + Math.random() * 0.05; // CPC revenue
    }

    this.stats.clicks++;
    this.updateStats();
    this.emit('ad-clicked', { adUnitId });
  }

  /**
   * Update stats
   */
  private updateStats(): void {
    if (this.stats.impressions > 0) {
      this.stats.ctr = (this.stats.clicks / this.stats.impressions) * 100;
    }

    if (this.stats.requestCount > 0) {
      this.stats.fillRate = ((this.stats.requestCount - this.stats.errorCount) / this.stats.requestCount) * 100;
    }

    // Calculate revenue from instances
    this.stats.revenue = Array.from(this.adInstances.values()).reduce(
      (sum, inst) => sum + inst.revenue,
      0
    );

    if (this.stats.impressions > 0) {
      this.stats.ecpm = (this.stats.revenue / this.stats.impressions) * 1000;
    }

    this.saveStats();
    this.emit('ad-revenue', { stats: this.stats });
  }

  /**
   * Load stats from storage
   */
  private loadStats(): void {
    try {
      const saved = localStorage.getItem('ad_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.stats = { ...this.stats, ...parsed };
      }

      const watchCounts = localStorage.getItem('ad_rewarded_counts');
      if (watchCounts) {
        const parsed = JSON.parse(watchCounts);
        this.rewardedWatchCount = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('[Ads] Failed to load stats:', error);
    }
  }

  /**
   * Save stats to storage
   */
  private saveStats(): void {
    try {
      localStorage.setItem('ad_stats', JSON.stringify(this.stats));
      localStorage.setItem(
        'ad_rewarded_counts',
        JSON.stringify(Object.fromEntries(this.rewardedWatchCount))
      );
      localStorage.setItem('ad_last_reset', new Date().toDateString());
    } catch (error) {
      console.error('[Ads] Failed to save stats:', error);
    }
  }

  /**
   * Check and perform daily reset
   */
  private checkDailyReset(): void {
    const lastReset = localStorage.getItem('ad_last_reset');
    const today = new Date().toDateString();

    if (lastReset !== today) {
      this.rewardedWatchCount.clear();
      this.saveStats();
    }
  }

  /**
   * Get remaining rewarded watches
   */
  getRemainingRewardedWatches(adUnitId: string): number {
    const watched = this.rewardedWatchCount.get(adUnitId) || 0;
    return Math.max(0, this.dailyRewardedLimit - watched);
  }

  /**
   * Get stats
   */
  getStats(): AdStats {
    return { ...this.stats };
  }

  /**
   * Set interstitial cooldown
   */
  setInterstitialCooldown(ms: number): void {
    this.interstitialCooldown = ms;
  }

  /**
   * Set daily rewarded limit
   */
  setDailyRewardedLimit(limit: number): void {
    this.dailyRewardedLimit = limit;
  }

  /**
   * Enable/disable ads
   */
  setAdsEnabled(enabled: boolean): void {
    this.adsEnabled = enabled;
    if (!enabled) {
      this.hideBanner();
    }
  }

  /**
   * Check if ads are enabled
   */
  areAdsEnabled(): boolean {
    return this.adsEnabled && !iapService.hasRemovedAds();
  }

  /**
   * Add event listener
   */
  on(event: AdEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: AdEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: AdEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
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
    this.hideBanner();
    if (this.bannerContainer && this.bannerContainer.parentNode) {
      this.bannerContainer.parentNode.removeChild(this.bannerContainer);
    }
  }
}

// Singleton instance
export const adService = new AdService();
