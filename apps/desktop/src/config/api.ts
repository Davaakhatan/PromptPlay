/**
 * API Configuration
 * Configure backend connection for services
 */

import { gameSharing } from '../services/GameSharingService';
import { marketplace } from '../services/MarketplaceService';
import { collaborationService } from '../services/CollaborationService';

/**
 * API configuration options
 */
export interface ApiConfig {
  /** Backend API URL (e.g., 'http://localhost:3001/api') */
  apiUrl: string;
  /** WebSocket URL for collaboration (e.g., 'ws://localhost:3001/ws') */
  wsUrl: string;
  /** Enable demo mode (use mock data instead of real API) */
  demoMode?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Default configuration - uses environment variables or defaults
 */
const DEFAULT_CONFIG: ApiConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  timeout: 30000,
};

let currentConfig: ApiConfig = { ...DEFAULT_CONFIG };
let isInitialized = false;

/**
 * Initialize all services with API configuration
 */
export function initializeApi(config?: Partial<ApiConfig>): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };

  // Configure Game Sharing Service
  gameSharing.configure({
    apiUrl: currentConfig.apiUrl,
    demoMode: currentConfig.demoMode,
    timeout: currentConfig.timeout,
  });

  // Configure Marketplace Service
  marketplace.configure({
    apiUrl: currentConfig.apiUrl,
    demoMode: currentConfig.demoMode,
    timeout: currentConfig.timeout,
  });

  // Configure Collaboration Service
  collaborationService.configure({
    serverUrl: currentConfig.wsUrl,
  });

  isInitialized = true;
  console.log('[API] Services initialized:', {
    apiUrl: currentConfig.apiUrl,
    wsUrl: currentConfig.wsUrl,
    demoMode: currentConfig.demoMode,
  });
}

/**
 * Get current API configuration
 */
export function getApiConfig(): ApiConfig {
  return { ...currentConfig };
}

/**
 * Check if API is initialized
 */
export function isApiInitialized(): boolean {
  return isInitialized;
}

/**
 * Set authentication token for all services
 */
export function setAuthToken(token: string): void {
  gameSharing.setAuthToken(token);
  marketplace.setAuthToken(token);
}

/**
 * Clear authentication from all services
 */
export function clearAuth(): void {
  marketplace.clearAuthToken();
}

/**
 * Check if running in demo mode
 */
export function isDemoMode(): boolean {
  return currentConfig.demoMode === true;
}

// Auto-initialize with defaults on import
// Services will start in demo mode if no backend is available
if (!isInitialized) {
  initializeApi();
}
