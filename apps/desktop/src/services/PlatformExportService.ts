/**
 * Platform Export Service - v6.0
 * Export games to Console, VR/AR, Steam, and Mobile App Stores
 *
 * ## SIMULATION MODE
 *
 * This service currently runs in **Simulation Mode**. Export operations
 * demonstrate the workflow but do not produce actual platform builds.
 *
 * ### To Enable Real Exports:
 *
 * **Console Platforms (Nintendo Switch, PlayStation, Xbox):**
 * - Requires official developer program membership
 * - Requires platform-specific SDK and DevKit hardware
 * - Contact: Nintendo Developer Portal, PlayStation Partners, Xbox Developer Program
 *
 * **Steam/SteamVR:**
 * - Requires Steamworks account ($100 app fee)
 * - Download Steam SDK from partner.steamgames.com
 * - Configure STEAM_SDK_PATH environment variable
 *
 * **iOS App Store:**
 * - Requires Apple Developer Account ($99/year)
 * - Requires macOS with Xcode installed
 * - Configure signing certificates in Xcode
 *
 * **Google Play:**
 * - Requires Google Play Console account ($25 one-time)
 * - Configure Android SDK and signing keystore
 * - Set ANDROID_HOME environment variable
 *
 * **VR Platforms (Meta Quest, PICO, Apple Vision):**
 * - Requires respective developer accounts
 * - Platform-specific SDK integration needed
 *
 * **WebXR:**
 * - No special requirements - exports work in simulation
 * - Real export produces deployable web build
 */

export type Platform =
  | 'nintendo-switch'
  | 'playstation'
  | 'xbox'
  | 'steam'
  | 'ios-appstore'
  | 'google-play'
  | 'meta-quest'
  | 'steamvr'
  | 'webxr'
  | 'pico'
  | 'apple-vision';

export interface PlatformConfig {
  platform: Platform;
  name: string;
  icon: string;
  category: 'console' | 'vr-ar' | 'pc' | 'mobile';
  requirements: string[];
  supported: boolean;
  sdkVersion?: string;
  features: string[];
}

export interface ExportConfig {
  platform: Platform;
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: number;
  icon?: string;
  splashScreen?: string;
  orientation?: 'portrait' | 'landscape' | 'both';
  minSdkVersion?: number;
  targetSdkVersion?: number;
  permissions?: string[];
  entitlements?: string[];
  signingConfig?: {
    keystore?: string;
    keyAlias?: string;
    certificateId?: string;
  };
  buildConfig?: {
    debug?: boolean;
    optimization?: 'none' | 'size' | 'speed';
    sourceMaps?: boolean;
  };
  platformSpecific?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  platform: Platform;
  outputPath?: string;
  buildSize?: number;
  buildTime?: number;
  errors?: string[];
  warnings?: string[];
  artifacts?: string[];
  isSimulationMode: boolean; // True when SDK/tools not configured for real export
}

export interface SteamConfig {
  appId: string;
  depotId: string;
  branch: string;
  achievements: Achievement[];
  workshop: boolean;
  cloud: boolean;
  leaderboards: Leaderboard[];
  dlc: DLC[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
}

export interface Leaderboard {
  id: string;
  name: string;
  sortMethod: 'ascending' | 'descending';
  displayType: 'numeric' | 'time' | 'money';
}

export interface DLC {
  id: string;
  name: string;
  price: number;
}

export interface VRConfig {
  handTracking: boolean;
  roomScale: boolean;
  seated: boolean;
  standing: boolean;
  controllerType: 'touch' | 'index' | 'vive' | 'generic';
  refreshRate: 72 | 90 | 120;
  resolution: 'low' | 'medium' | 'high' | 'native';
  foveatedRendering: boolean;
  passthrough: boolean;
}

export interface ConsoleConfig {
  ageRating: string;
  onlineFeatures: boolean;
  trophies?: Achievement[];
  saveDataCloud: boolean;
  hdr: boolean;
  resolution: '720p' | '1080p' | '1440p' | '4k';
  frameRate: 30 | 60 | 120;
}

type EventCallback = (data: unknown) => void;
type ExportEventType = 'export-started' | 'export-progress' | 'export-completed' | 'export-failed';

class PlatformExportService {
  private listeners: Map<ExportEventType, EventCallback[]> = new Map();

  readonly platforms: PlatformConfig[] = [
    // Consoles
    {
      platform: 'nintendo-switch',
      name: 'Nintendo Switch',
      icon: 'switch',
      category: 'console',
      requirements: ['Nintendo Developer Account', 'Switch SDK', 'DevKit Hardware'],
      supported: true,
      sdkVersion: '17.0.0',
      features: ['Joy-Con Support', 'HD Rumble', 'Touch Screen', 'Gyro Controls', 'Local Multiplayer'],
    },
    {
      platform: 'playstation',
      name: 'PlayStation 5',
      icon: 'playstation',
      category: 'console',
      requirements: ['PlayStation Partners', 'PS5 SDK', 'DevKit Hardware'],
      supported: true,
      sdkVersion: '8.0',
      features: ['DualSense Haptics', 'Adaptive Triggers', 'Activity Cards', 'Trophies', '3D Audio'],
    },
    {
      platform: 'xbox',
      name: 'Xbox Series X|S',
      icon: 'xbox',
      category: 'console',
      requirements: ['Xbox Developer Program', 'GDK', 'DevKit or Retail Mode'],
      supported: true,
      sdkVersion: '2024.06',
      features: ['Smart Delivery', 'Quick Resume', 'Achievements', 'Xbox Live', 'Game Pass Ready'],
    },
    // VR/AR
    {
      platform: 'meta-quest',
      name: 'Meta Quest 3',
      icon: 'quest',
      category: 'vr-ar',
      requirements: ['Meta Developer Account', 'Quest SDK', 'Quest Device'],
      supported: true,
      sdkVersion: '62.0',
      features: ['Hand Tracking', 'Passthrough MR', 'Eye Tracking', 'Spatial Audio', 'Room Scale'],
    },
    {
      platform: 'steamvr',
      name: 'SteamVR',
      icon: 'steamvr',
      category: 'vr-ar',
      requirements: ['Steam Developer Account', 'OpenVR SDK', 'VR Headset'],
      supported: true,
      sdkVersion: '2.5.1',
      features: ['Index Controllers', 'Lighthouse Tracking', 'Vive Trackers', 'Room Scale'],
    },
    {
      platform: 'webxr',
      name: 'WebXR',
      icon: 'webxr',
      category: 'vr-ar',
      requirements: ['WebXR-compatible Browser', 'HTTPS Hosting'],
      supported: true,
      sdkVersion: '1.0',
      features: ['Cross-Platform', 'No Installation', 'AR Mode', 'VR Mode', 'Hand Tracking'],
    },
    {
      platform: 'apple-vision',
      name: 'Apple Vision Pro',
      icon: 'vision',
      category: 'vr-ar',
      requirements: ['Apple Developer Account', 'visionOS SDK', 'Vision Pro Device'],
      supported: true,
      sdkVersion: '2.0',
      features: ['Eye Tracking', 'Hand Gestures', 'Spatial Computing', 'SharePlay', 'Personas'],
    },
    {
      platform: 'pico',
      name: 'PICO 4',
      icon: 'pico',
      category: 'vr-ar',
      requirements: ['PICO Developer Account', 'PICO SDK'],
      supported: true,
      sdkVersion: '2.3.0',
      features: ['Inside-Out Tracking', 'Eye Tracking', 'Hand Tracking', 'Pancake Lenses'],
    },
    // PC
    {
      platform: 'steam',
      name: 'Steam',
      icon: 'steam',
      category: 'pc',
      requirements: ['Steamworks Account', 'Steam SDK', '$100 App Fee'],
      supported: true,
      sdkVersion: '1.57',
      features: ['Achievements', 'Cloud Saves', 'Workshop', 'Leaderboards', 'Trading Cards', 'Remote Play'],
    },
    // Mobile
    {
      platform: 'ios-appstore',
      name: 'iOS App Store',
      icon: 'apple',
      category: 'mobile',
      requirements: ['Apple Developer Account ($99/year)', 'Xcode', 'macOS'],
      supported: true,
      sdkVersion: 'iOS 17',
      features: ['Game Center', 'In-App Purchases', 'Push Notifications', 'iCloud', 'SharePlay'],
    },
    {
      platform: 'google-play',
      name: 'Google Play Store',
      icon: 'android',
      category: 'mobile',
      requirements: ['Google Play Console ($25)', 'Android SDK', 'Signing Key'],
      supported: true,
      sdkVersion: 'Android 14',
      features: ['Play Games Services', 'In-App Billing', 'Play Asset Delivery', 'Play Integrity'],
    },
  ];

  // Event handling
  on(event: ExportEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: ExportEventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: ExportEventType, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Check if service is running in simulation mode
   * Currently always true - real exports require platform SDK setup
   */
  isSimulationMode(): boolean {
    // TODO: Check for actual SDK presence (STEAM_SDK_PATH, ANDROID_HOME, Xcode, etc.)
    return true;
  }

  /**
   * Get simulation mode status message for UI display
   */
  getSimulationModeMessage(): string {
    return 'Platform Export is in Simulation Mode. Configure platform SDKs and developer accounts to enable real exports.';
  }

  /**
   * Get setup requirements for a specific platform
   */
  getSetupGuide(platform: Platform): string[] {
    const guides: Record<Platform, string[]> = {
      'nintendo-switch': [
        '1. Apply for Nintendo Developer Program at developer.nintendo.com',
        '2. Wait for approval (can take several weeks)',
        '3. Download Nintendo SDK and DevKit tools',
        '4. Obtain DevKit hardware for testing',
        '5. Configure SDK path in environment variables',
      ],
      'playstation': [
        '1. Apply at partners.playstation.com',
        '2. Complete company verification process',
        '3. Download PS5 SDK after approval',
        '4. Obtain DevKit or TestKit hardware',
        '5. Set up PlayStation Development Environment',
      ],
      'xbox': [
        '1. Join Xbox Developer Program (free tier available)',
        '2. Download GDK from developer.microsoft.com',
        '3. Enable Developer Mode on retail Xbox (optional)',
        '4. Configure Visual Studio with GDK extensions',
        '5. Set up Partner Center account for publishing',
      ],
      'steam': [
        '1. Create Steamworks account at partner.steamgames.com',
        '2. Pay $100 app credit fee per game',
        '3. Download Steamworks SDK',
        '4. Set STEAM_SDK_PATH environment variable',
        '5. Configure app in Steamworks dashboard',
      ],
      'ios-appstore': [
        '1. Enroll in Apple Developer Program ($99/year)',
        '2. Install Xcode on macOS',
        '3. Create signing certificates and provisioning profiles',
        '4. Configure App Store Connect listing',
        '5. Set up TestFlight for beta testing',
      ],
      'google-play': [
        '1. Create Google Play Console account ($25 one-time)',
        '2. Install Android Studio and SDK',
        '3. Generate release signing keystore',
        '4. Set ANDROID_HOME environment variable',
        '5. Configure Play Console listing',
      ],
      'meta-quest': [
        '1. Create Meta Developer account',
        '2. Download Meta Quest SDK',
        '3. Enable Developer Mode on Quest device',
        '4. Configure adb for device connection',
        '5. Submit to App Lab or Quest Store',
      ],
      'steamvr': [
        '1. Complete Steam setup (see Steam guide)',
        '2. Download OpenVR SDK',
        '3. Configure VR manifest file',
        '4. Test with SteamVR runtime',
        '5. Add VR-specific Steamworks settings',
      ],
      'webxr': [
        '1. No special SDK required',
        '2. Ensure HTTPS hosting for production',
        '3. Test with WebXR-compatible browser',
        '4. Configure XR session options',
        '5. Deploy to web server',
      ],
      'pico': [
        '1. Register at developer.pico-interactive.com',
        '2. Download PICO SDK',
        '3. Enable Developer Mode on device',
        '4. Configure Android SDK for PICO',
        '5. Submit to PICO Store',
      ],
      'apple-vision': [
        '1. Enroll in Apple Developer Program',
        '2. Install Xcode with visionOS SDK',
        '3. Use Reality Composer Pro for 3D content',
        '4. Test with visionOS Simulator or device',
        '5. Submit to visionOS App Store',
      ],
    };
    return guides[platform] || ['No setup guide available for this platform'];
  }

  // Get platforms by category
  getPlatformsByCategory(category: PlatformConfig['category']): PlatformConfig[] {
    return this.platforms.filter(p => p.category === category);
  }

  // Get platform config
  getPlatform(platform: Platform): PlatformConfig | undefined {
    return this.platforms.find(p => p.platform === platform);
  }

  // Validate export config
  validateConfig(config: ExportConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.appName || config.appName.length < 2) {
      errors.push('App name must be at least 2 characters');
    }

    if (!config.bundleId || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(config.bundleId)) {
      errors.push('Bundle ID must be in reverse domain format (e.g., com.company.game)');
    }

    if (!config.version || !/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('Version must be in semver format (e.g., 1.0.0)');
    }

    if (config.buildNumber < 1) {
      errors.push('Build number must be a positive integer');
    }

    return { valid: errors.length === 0, errors };
  }

  // Export to platform (mock implementation)
  async exportToPlatform(config: ExportConfig): Promise<ExportResult> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        platform: config.platform,
        errors: validation.errors,
        isSimulationMode: true,
      };
    }

    this.emit('export-started', { platform: config.platform, config });

    // Simulate export process
    const steps = [
      'Preparing assets...',
      'Compiling scripts...',
      'Bundling resources...',
      'Optimizing build...',
      'Generating platform package...',
      'Signing build...',
      'Finalizing...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.emit('export-progress', {
        platform: config.platform,
        step: steps[i],
        progress: ((i + 1) / steps.length) * 100,
      });
    }

    const result: ExportResult = {
      success: true,
      platform: config.platform,
      outputPath: `/exports/${config.platform}/${config.appName}-${config.version}`,
      buildSize: Math.floor(Math.random() * 500 + 100) * 1024 * 1024, // 100-600 MB
      buildTime: Math.floor(Math.random() * 120 + 30) * 1000, // 30-150 seconds
      warnings: ['Export ran in Simulation Mode - no actual build produced'],
      artifacts: [
        `${config.appName}-${config.version}.${this.getExtension(config.platform)}`,
      ],
      isSimulationMode: true, // Currently always simulation - real exports require SDK setup
    };

    this.emit('export-completed', result);
    return result;
  }

  private getExtension(platform: Platform): string {
    const extensions: Record<Platform, string> = {
      'nintendo-switch': 'nsp',
      'playstation': 'pkg',
      'xbox': 'msixvc',
      'steam': 'zip',
      'ios-appstore': 'ipa',
      'google-play': 'aab',
      'meta-quest': 'apk',
      'steamvr': 'zip',
      'webxr': 'zip',
      'pico': 'apk',
      'apple-vision': 'app',
    };
    return extensions[platform] || 'zip';
  }

  // Get default Steam config
  getDefaultSteamConfig(): SteamConfig {
    return {
      appId: '',
      depotId: '',
      branch: 'default',
      achievements: [
        { id: 'first_play', name: 'First Steps', description: 'Start the game', icon: 'trophy_bronze', hidden: false },
        { id: 'complete_level', name: 'Level Complete', description: 'Complete your first level', icon: 'trophy_silver', hidden: false },
        { id: 'master', name: 'Master', description: 'Complete all levels', icon: 'trophy_gold', hidden: false },
      ],
      workshop: true,
      cloud: true,
      leaderboards: [
        { id: 'high_score', name: 'High Score', sortMethod: 'descending', displayType: 'numeric' },
        { id: 'fastest_time', name: 'Fastest Time', sortMethod: 'ascending', displayType: 'time' },
      ],
      dlc: [],
    };
  }

  // Get default VR config
  getDefaultVRConfig(): VRConfig {
    return {
      handTracking: true,
      roomScale: true,
      seated: true,
      standing: true,
      controllerType: 'generic',
      refreshRate: 90,
      resolution: 'high',
      foveatedRendering: true,
      passthrough: false,
    };
  }

  // Get default console config
  getDefaultConsoleConfig(): ConsoleConfig {
    return {
      ageRating: 'E',
      onlineFeatures: false,
      saveDataCloud: true,
      hdr: true,
      resolution: '1080p',
      frameRate: 60,
      trophies: [
        { id: 'platinum', name: 'Platinum Trophy', description: 'Unlock all trophies', icon: 'platinum', hidden: false },
        { id: 'bronze_1', name: 'Getting Started', description: 'Complete the tutorial', icon: 'bronze', hidden: false },
      ],
    };
  }

  // Generate platform-specific project
  async generateProject(platform: Platform, outputDir: string): Promise<{ success: boolean; files: string[] }> {
    // Mock implementation - would generate actual project files
    const files: string[] = [];

    switch (platform) {
      case 'ios-appstore':
        files.push('project.xcodeproj', 'Info.plist', 'Assets.xcassets', 'LaunchScreen.storyboard');
        break;
      case 'google-play':
        files.push('build.gradle', 'AndroidManifest.xml', 'res/', 'src/');
        break;
      case 'steam':
        files.push('steam_appid.txt', 'steam_api64.dll', 'app_build.vdf');
        break;
      case 'meta-quest':
        files.push('AndroidManifest.xml', 'build.gradle', 'OVRPlatform.cs');
        break;
      default:
        files.push('project.json', 'build.config', 'assets/');
    }

    return { success: true, files: files.map(f => `${outputDir}/${f}`) };
  }

  // Get submission checklist
  getSubmissionChecklist(platform: Platform): string[] {
    const commonChecklist = [
      'Test on target device/platform',
      'Verify all assets load correctly',
      'Check performance metrics',
      'Review content rating requirements',
      'Prepare store listing assets',
      'Write store description',
    ];

    const platformChecklist: Record<Platform, string[]> = {
      'nintendo-switch': [
        'Submit to Nintendo Lot Check',
        'Prepare NCL documentation',
        'Test Joy-Con detached mode',
        'Verify sleep/resume behavior',
      ],
      'playstation': [
        'Submit to Sony TRC',
        'Test trophy sync',
        'Verify suspend/resume',
        'Check activity card integration',
      ],
      'xbox': [
        'Submit to Xbox Certification',
        'Test Quick Resume',
        'Verify achievement unlocks',
        'Check Smart Delivery setup',
      ],
      'steam': [
        'Configure Steamworks settings',
        'Set up achievements and trading cards',
        'Prepare Steam store assets',
        'Configure regional pricing',
      ],
      'ios-appstore': [
        'Prepare App Store Connect listing',
        'Submit for App Review',
        'Configure In-App Purchases',
        'Set up TestFlight beta',
      ],
      'google-play': [
        'Complete Play Console listing',
        'Set up closed/open testing',
        'Configure Play Billing',
        'Submit for review',
      ],
      'meta-quest': [
        'Submit to Meta App Lab or Store',
        'Test hand tracking',
        'Verify passthrough (if used)',
        'Check comfort settings',
      ],
      'steamvr': [
        'Configure VR settings in Steamworks',
        'Test with multiple headsets',
        'Verify controller bindings',
        'Check room-scale bounds',
      ],
      'webxr': [
        'Test in multiple browsers',
        'Verify HTTPS deployment',
        'Check fallback for non-VR',
        'Test AR mode (if supported)',
      ],
      'pico': [
        'Submit to PICO Store',
        'Test eye tracking features',
        'Verify controller mapping',
        'Check battery optimization',
      ],
      'apple-vision': [
        'Submit to visionOS App Store',
        'Test eye/hand input',
        'Verify SharePlay (if used)',
        'Check spatial audio',
      ],
    };

    return [...commonChecklist, ...(platformChecklist[platform] || [])];
  }
}

export const platformExportService = new PlatformExportService();
export default platformExportService;
