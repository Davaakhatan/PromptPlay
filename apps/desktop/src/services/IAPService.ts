/**
 * In-App Purchase Service
 * Handles purchases, subscriptions, and virtual currency
 */

// Product types
export type ProductType = 'consumable' | 'non-consumable' | 'subscription';

// Subscription period
export type SubscriptionPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

// Purchase state
export type PurchaseState = 'pending' | 'purchased' | 'failed' | 'refunded' | 'cancelled';

// Product definition
export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  price: number;
  currency: string;
  priceFormatted: string;
  subscriptionPeriod?: SubscriptionPeriod;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

// Purchase record
export interface Purchase {
  id: string;
  productId: string;
  userId: string;
  state: PurchaseState;
  purchaseDate: number;
  expirationDate?: number;
  transactionId: string;
  receipt?: string;
  platform: 'web' | 'ios' | 'android' | 'steam' | 'desktop';
  quantity: number;
  price: number;
  currency: string;
}

// Virtual currency
export interface VirtualCurrency {
  id: string;
  name: string;
  balance: number;
  icon?: string;
}

// Currency pack
export interface CurrencyPack {
  id: string;
  currencyId: string;
  amount: number;
  bonusAmount: number;
  price: number;
  currency: string;
  priceFormatted: string;
  popular?: boolean;
  bestValue?: boolean;
}

// Subscription status
export interface SubscriptionStatus {
  productId: string;
  active: boolean;
  autoRenew: boolean;
  expirationDate: number;
  trialActive: boolean;
  trialEndDate?: number;
  gracePeriod: boolean;
  cancelledAt?: number;
}

// IAP events
export type IAPEvent =
  | 'products-loaded'
  | 'purchase-started'
  | 'purchase-completed'
  | 'purchase-failed'
  | 'purchase-restored'
  | 'subscription-updated'
  | 'currency-updated'
  | 'receipt-validated';

// Store provider interface
export interface StoreProvider {
  name: string;
  initialize(): Promise<void>;
  getProducts(productIds: string[]): Promise<Product[]>;
  purchase(productId: string): Promise<Purchase>;
  restorePurchases(): Promise<Purchase[]>;
  validateReceipt(receipt: string): Promise<boolean>;
  consumePurchase(purchaseId: string): Promise<boolean>;
}

// Default products for demo
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'remove_ads',
    name: 'Remove Ads',
    description: 'Remove all advertisements from the game',
    type: 'non-consumable',
    price: 2.99,
    currency: 'USD',
    priceFormatted: '$2.99',
  },
  {
    id: 'premium_upgrade',
    name: 'Premium Upgrade',
    description: 'Unlock all premium features and content',
    type: 'non-consumable',
    price: 9.99,
    currency: 'USD',
    priceFormatted: '$9.99',
  },
  {
    id: 'coins_100',
    name: '100 Coins',
    description: 'Get 100 coins to spend in-game',
    type: 'consumable',
    price: 0.99,
    currency: 'USD',
    priceFormatted: '$0.99',
  },
  {
    id: 'coins_500',
    name: '500 Coins + 50 Bonus',
    description: 'Get 550 coins (500 + 50 bonus)',
    type: 'consumable',
    price: 4.99,
    currency: 'USD',
    priceFormatted: '$4.99',
    metadata: { popular: true },
  },
  {
    id: 'coins_1000',
    name: '1000 Coins + 200 Bonus',
    description: 'Get 1200 coins (1000 + 200 bonus)',
    type: 'consumable',
    price: 9.99,
    currency: 'USD',
    priceFormatted: '$9.99',
    metadata: { bestValue: true },
  },
  {
    id: 'vip_monthly',
    name: 'VIP Monthly',
    description: 'VIP membership with exclusive perks',
    type: 'subscription',
    price: 4.99,
    currency: 'USD',
    priceFormatted: '$4.99/month',
    subscriptionPeriod: 'monthly',
    trialDays: 7,
  },
  {
    id: 'vip_yearly',
    name: 'VIP Yearly',
    description: 'VIP membership - save 40%!',
    type: 'subscription',
    price: 35.99,
    currency: 'USD',
    priceFormatted: '$35.99/year',
    subscriptionPeriod: 'yearly',
    metadata: { bestValue: true },
  },
];

// Currency packs
const DEFAULT_CURRENCY_PACKS: CurrencyPack[] = [
  { id: 'pack_100', currencyId: 'coins', amount: 100, bonusAmount: 0, price: 0.99, currency: 'USD', priceFormatted: '$0.99' },
  { id: 'pack_500', currencyId: 'coins', amount: 500, bonusAmount: 50, price: 4.99, currency: 'USD', priceFormatted: '$4.99', popular: true },
  { id: 'pack_1000', currencyId: 'coins', amount: 1000, bonusAmount: 200, price: 9.99, currency: 'USD', priceFormatted: '$9.99', bestValue: true },
  { id: 'pack_2500', currencyId: 'coins', amount: 2500, bonusAmount: 750, price: 19.99, currency: 'USD', priceFormatted: '$19.99' },
  { id: 'pack_5000', currencyId: 'coins', amount: 5000, bonusAmount: 2000, price: 39.99, currency: 'USD', priceFormatted: '$39.99' },
];

class IAPService {
  private products: Map<string, Product> = new Map();
  private purchases: Map<string, Purchase> = new Map();
  private currencies: Map<string, VirtualCurrency> = new Map();
  private currencyPacks: Map<string, CurrencyPack> = new Map();
  private subscriptions: Map<string, SubscriptionStatus> = new Map();
  private eventListeners: Map<IAPEvent, Set<(data: unknown) => void>> = new Map();
  private storeProvider: StoreProvider | null = null;
  private userId: string = '';
  private initialized: boolean = false;

  constructor() {
    this.initializeDefaultCurrencies();
  }

  /**
   * Initialize default currencies
   */
  private initializeDefaultCurrencies(): void {
    this.currencies.set('coins', {
      id: 'coins',
      name: 'Coins',
      balance: 0,
      icon: 'coin',
    });

    this.currencies.set('gems', {
      id: 'gems',
      name: 'Gems',
      balance: 0,
      icon: 'gem',
    });

    // Load currency packs
    DEFAULT_CURRENCY_PACKS.forEach(pack => {
      this.currencyPacks.set(pack.id, pack);
    });
  }

  /**
   * Initialize the IAP service
   */
  async initialize(userId: string, provider?: StoreProvider): Promise<void> {
    this.userId = userId;
    this.storeProvider = provider || null;

    // Load saved purchases and currencies
    await this.loadSavedData();

    // Initialize store provider
    if (this.storeProvider) {
      await this.storeProvider.initialize();
    }

    // Load products
    await this.loadProducts();

    this.initialized = true;
    console.log('[IAP] Service initialized');
  }

  /**
   * Load saved data from storage
   */
  private async loadSavedData(): Promise<void> {
    try {
      const savedPurchases = localStorage.getItem(`iap_purchases_${this.userId}`);
      if (savedPurchases) {
        const purchases = JSON.parse(savedPurchases) as Purchase[];
        purchases.forEach(p => this.purchases.set(p.id, p));
      }

      const savedCurrencies = localStorage.getItem(`iap_currencies_${this.userId}`);
      if (savedCurrencies) {
        const currencies = JSON.parse(savedCurrencies) as VirtualCurrency[];
        currencies.forEach(c => this.currencies.set(c.id, c));
      }

      const savedSubscriptions = localStorage.getItem(`iap_subscriptions_${this.userId}`);
      if (savedSubscriptions) {
        const subs = JSON.parse(savedSubscriptions) as SubscriptionStatus[];
        subs.forEach(s => this.subscriptions.set(s.productId, s));
      }
    } catch (error) {
      console.error('[IAP] Failed to load saved data:', error);
    }
  }

  /**
   * Save data to storage
   */
  private saveData(): void {
    try {
      localStorage.setItem(
        `iap_purchases_${this.userId}`,
        JSON.stringify(Array.from(this.purchases.values()))
      );
      localStorage.setItem(
        `iap_currencies_${this.userId}`,
        JSON.stringify(Array.from(this.currencies.values()))
      );
      localStorage.setItem(
        `iap_subscriptions_${this.userId}`,
        JSON.stringify(Array.from(this.subscriptions.values()))
      );
    } catch (error) {
      console.error('[IAP] Failed to save data:', error);
    }
  }

  /**
   * Load products from store or defaults
   */
  async loadProducts(): Promise<Product[]> {
    // Use store provider if available
    if (this.storeProvider) {
      try {
        const productIds = DEFAULT_PRODUCTS.map(p => p.id);
        const products = await this.storeProvider.getProducts(productIds);
        products.forEach(p => this.products.set(p.id, p));
        this.emit('products-loaded', { products });
        return products;
      } catch (error) {
        console.error('[IAP] Failed to load products from store:', error);
      }
    }

    // Fall back to default products
    DEFAULT_PRODUCTS.forEach(p => this.products.set(p.id, p));
    this.emit('products-loaded', { products: DEFAULT_PRODUCTS });
    return DEFAULT_PRODUCTS;
  }

  /**
   * Get all products
   */
  getProducts(): Product[] {
    return Array.from(this.products.values());
  }

  /**
   * Get products by type
   */
  getProductsByType(type: ProductType): Product[] {
    return Array.from(this.products.values()).filter(p => p.type === type);
  }

  /**
   * Get a specific product
   */
  getProduct(productId: string): Product | null {
    return this.products.get(productId) || null;
  }

  /**
   * Purchase a product
   */
  async purchase(productId: string): Promise<Purchase | null> {
    const product = this.products.get(productId);
    if (!product) {
      console.error('[IAP] Product not found:', productId);
      return null;
    }

    this.emit('purchase-started', { productId, product });

    try {
      let purchase: Purchase;

      if (this.storeProvider) {
        purchase = await this.storeProvider.purchase(productId);
      } else {
        // Simulate purchase for demo
        purchase = await this.simulatePurchase(product);
      }

      // Process purchase
      await this.processPurchase(purchase);

      this.emit('purchase-completed', { purchase, product });
      return purchase;
    } catch (error) {
      console.error('[IAP] Purchase failed:', error);
      this.emit('purchase-failed', { productId, error });
      return null;
    }
  }

  /**
   * Simulate purchase for demo/testing
   */
  private async simulatePurchase(product: Product): Promise<Purchase> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const purchase: Purchase = {
      id: `purchase_${Date.now()}`,
      productId: product.id,
      userId: this.userId,
      state: 'purchased',
      purchaseDate: Date.now(),
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: 'web',
      quantity: 1,
      price: product.price,
      currency: product.currency,
    };

    // Set expiration for subscriptions
    if (product.type === 'subscription' && product.subscriptionPeriod) {
      purchase.expirationDate = this.calculateExpirationDate(product.subscriptionPeriod);
    }

    return purchase;
  }

  /**
   * Calculate subscription expiration date
   */
  private calculateExpirationDate(period: SubscriptionPeriod): number {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    switch (period) {
      case 'weekly':
        return now + 7 * day;
      case 'monthly':
        return now + 30 * day;
      case 'quarterly':
        return now + 90 * day;
      case 'yearly':
        return now + 365 * day;
      case 'lifetime':
        return now + 100 * 365 * day; // 100 years
      default:
        return now + 30 * day;
    }
  }

  /**
   * Process a purchase
   */
  private async processPurchase(purchase: Purchase): Promise<void> {
    const product = this.products.get(purchase.productId);
    if (!product) return;

    // Store purchase
    this.purchases.set(purchase.id, purchase);

    // Handle by product type
    switch (product.type) {
      case 'consumable':
        await this.processConsumable(purchase, product);
        break;
      case 'non-consumable':
        await this.processNonConsumable(purchase, product);
        break;
      case 'subscription':
        await this.processSubscription(purchase, product);
        break;
    }

    this.saveData();
  }

  /**
   * Process consumable purchase
   */
  private async processConsumable(purchase: Purchase, product: Product): Promise<void> {
    // Check if it's a currency pack
    const pack = Array.from(this.currencyPacks.values()).find(
      p => p.id === product.id || product.id.includes(p.currencyId)
    );

    if (pack) {
      const totalAmount = pack.amount + pack.bonusAmount;
      await this.addCurrency(pack.currencyId, totalAmount);
    }

    // Consume the purchase
    if (this.storeProvider) {
      await this.storeProvider.consumePurchase(purchase.id);
    }
  }

  /**
   * Process non-consumable purchase
   */
  private async processNonConsumable(_purchase: Purchase, product: Product): Promise<void> {
    // Unlock features based on product
    switch (product.id) {
      case 'remove_ads':
        localStorage.setItem('ads_removed', 'true');
        break;
      case 'premium_upgrade':
        localStorage.setItem('premium_user', 'true');
        break;
    }
  }

  /**
   * Process subscription purchase
   */
  private async processSubscription(purchase: Purchase, product: Product): Promise<void> {
    const status: SubscriptionStatus = {
      productId: product.id,
      active: true,
      autoRenew: true,
      expirationDate: purchase.expirationDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
      trialActive: false,
      gracePeriod: false,
    };

    // Check for trial
    if (product.trialDays && !this.hasUsedTrial(product.id)) {
      status.trialActive = true;
      status.trialEndDate = Date.now() + product.trialDays * 24 * 60 * 60 * 1000;
      this.markTrialUsed(product.id);
    }

    this.subscriptions.set(product.id, status);
    this.emit('subscription-updated', { status, product });
  }

  /**
   * Check if user has used trial for a product
   */
  private hasUsedTrial(productId: string): boolean {
    return localStorage.getItem(`trial_used_${this.userId}_${productId}`) === 'true';
  }

  /**
   * Mark trial as used
   */
  private markTrialUsed(productId: string): void {
    localStorage.setItem(`trial_used_${this.userId}_${productId}`, 'true');
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<Purchase[]> {
    if (this.storeProvider) {
      try {
        const purchases = await this.storeProvider.restorePurchases();
        for (const purchase of purchases) {
          await this.processPurchase(purchase);
        }
        this.emit('purchase-restored', { purchases });
        return purchases;
      } catch (error) {
        console.error('[IAP] Restore failed:', error);
        return [];
      }
    }

    // Return saved purchases
    const purchases = Array.from(this.purchases.values()).filter(
      p => p.state === 'purchased'
    );
    this.emit('purchase-restored', { purchases });
    return purchases;
  }

  /**
   * Check if user owns a product
   */
  ownsProduct(productId: string): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    if (product.type === 'subscription') {
      return this.hasActiveSubscription(productId);
    }

    return Array.from(this.purchases.values()).some(
      p => p.productId === productId && p.state === 'purchased'
    );
  }

  /**
   * Check if user has active subscription
   */
  hasActiveSubscription(productId: string): boolean {
    const status = this.subscriptions.get(productId);
    if (!status) return false;

    return status.active && status.expirationDate > Date.now();
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(productId: string): SubscriptionStatus | null {
    return this.subscriptions.get(productId) || null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(productId: string): Promise<boolean> {
    const status = this.subscriptions.get(productId);
    if (!status) return false;

    status.autoRenew = false;
    status.cancelledAt = Date.now();

    this.subscriptions.set(productId, status);
    this.saveData();

    this.emit('subscription-updated', { status });
    return true;
  }

  /**
   * Get currency balance
   */
  getCurrencyBalance(currencyId: string): number {
    return this.currencies.get(currencyId)?.balance || 0;
  }

  /**
   * Get all currencies
   */
  getCurrencies(): VirtualCurrency[] {
    return Array.from(this.currencies.values());
  }

  /**
   * Add currency
   */
  async addCurrency(currencyId: string, amount: number): Promise<void> {
    const currency = this.currencies.get(currencyId);
    if (!currency) {
      this.currencies.set(currencyId, {
        id: currencyId,
        name: currencyId,
        balance: amount,
      });
    } else {
      currency.balance += amount;
    }

    this.saveData();
    this.emit('currency-updated', { currencyId, balance: this.getCurrencyBalance(currencyId) });
  }

  /**
   * Spend currency
   */
  async spendCurrency(currencyId: string, amount: number): Promise<boolean> {
    const currency = this.currencies.get(currencyId);
    if (!currency || currency.balance < amount) {
      return false;
    }

    currency.balance -= amount;
    this.saveData();
    this.emit('currency-updated', { currencyId, balance: currency.balance });
    return true;
  }

  /**
   * Get currency packs
   */
  getCurrencyPacks(currencyId?: string): CurrencyPack[] {
    const packs = Array.from(this.currencyPacks.values());
    if (currencyId) {
      return packs.filter(p => p.currencyId === currencyId);
    }
    return packs;
  }

  /**
   * Purchase currency pack
   */
  async purchaseCurrencyPack(packId: string): Promise<boolean> {
    const pack = this.currencyPacks.get(packId);
    if (!pack) return false;

    // Find associated product
    const product = Array.from(this.products.values()).find(
      p => p.metadata?.packId === packId || p.id === packId
    );

    if (product) {
      const purchase = await this.purchase(product.id);
      return purchase !== null;
    }

    // Direct currency grant for testing
    const totalAmount = pack.amount + pack.bonusAmount;
    await this.addCurrency(pack.currencyId, totalAmount);
    return true;
  }

  /**
   * Validate receipt
   */
  async validateReceipt(receipt: string): Promise<boolean> {
    if (this.storeProvider) {
      const valid = await this.storeProvider.validateReceipt(receipt);
      this.emit('receipt-validated', { valid, receipt });
      return valid;
    }
    return true; // Skip validation in demo mode
  }

  /**
   * Check if ads are removed
   */
  hasRemovedAds(): boolean {
    return localStorage.getItem('ads_removed') === 'true' || this.ownsProduct('remove_ads');
  }

  /**
   * Check if user is premium
   */
  isPremium(): boolean {
    return (
      localStorage.getItem('premium_user') === 'true' ||
      this.ownsProduct('premium_upgrade') ||
      this.hasActiveSubscription('vip_monthly') ||
      this.hasActiveSubscription('vip_yearly')
    );
  }

  /**
   * Get purchase history
   */
  getPurchaseHistory(): Purchase[] {
    return Array.from(this.purchases.values()).sort(
      (a, b) => b.purchaseDate - a.purchaseDate
    );
  }

  /**
   * Get total spent
   */
  getTotalSpent(): { amount: number; currency: string } {
    const purchases = Array.from(this.purchases.values()).filter(
      p => p.state === 'purchased'
    );

    const total = purchases.reduce((sum, p) => sum + p.price, 0);
    return { amount: total, currency: 'USD' };
  }

  /**
   * Add event listener
   */
  on(event: IAPEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: IAPEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: IAPEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.purchases.clear();
    this.subscriptions.clear();
    this.currencies.forEach(c => (c.balance = 0));
    localStorage.removeItem(`iap_purchases_${this.userId}`);
    localStorage.removeItem(`iap_currencies_${this.userId}`);
    localStorage.removeItem(`iap_subscriptions_${this.userId}`);
    localStorage.removeItem('ads_removed');
    localStorage.removeItem('premium_user');
    this.saveData();
  }
}

// Singleton instance
export const iapService = new IAPService();
