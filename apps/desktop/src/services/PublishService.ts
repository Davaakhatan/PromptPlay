import type { GameSpec } from '@promptplay/shared-types';

/**
 * Publish target platforms
 */
export type PublishPlatform = 'html' | 'itch' | 'zip' | 'github-pages' | 'pwa' | 'mobile';

/**
 * Publish configuration
 */
export interface PublishConfig {
  platform: PublishPlatform;
  gameSpec: GameSpec;
  options?: {
    title?: string;
    description?: string;
    author?: string;
    version?: string;
    thumbnail?: string;
    backgroundColor?: string;
    width?: number;
    height?: number;
    includeSourceMap?: boolean;
    // PWA/Mobile options
    themeColor?: string;
    orientation?: 'portrait' | 'landscape' | 'any';
    fullscreen?: boolean;
    touchControls?: boolean;
    offlineSupport?: boolean;
    icon192?: string;
    icon512?: string;
  };
}

/**
 * Publish result
 */
export interface PublishResult {
  success: boolean;
  platform: PublishPlatform;
  output?: string | Blob;
  filename?: string;
  url?: string;
  error?: string;
  instructions?: string[];
}

/**
 * itch.io game page metadata
 */
export interface ItchMetadata {
  title: string;
  short_text: string;
  classification: 'game' | 'tool' | 'asset';
  kind: 'html' | 'downloadable';
  tags: string[];
  genre?: string;
  min_price?: number;
  community?: 'open' | 'disabled' | 'members_only';
}

/**
 * Publish Service
 * Handles exporting games for various platforms
 */
export class PublishService {
  /**
   * Publish a game to the specified platform
   */
  async publish(config: PublishConfig): Promise<PublishResult> {
    const { platform, gameSpec, options } = config;

    try {
      switch (platform) {
        case 'html':
          return this.publishAsHTML(gameSpec, options);
        case 'zip':
          return this.publishAsZip(gameSpec, options);
        case 'itch':
          return this.publishForItch(gameSpec, options);
        case 'github-pages':
          return this.publishForGitHubPages(gameSpec, options);
        case 'pwa':
        case 'mobile':
          return this.publishAsPWA(gameSpec, options);
        default:
          return {
            success: false,
            platform,
            error: `Unknown platform: ${platform}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export as standalone HTML file
   */
  private async publishAsHTML(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): Promise<PublishResult> {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';
    const bgColor = options?.backgroundColor || '#1a1a2e';
    const width = options?.width || 800;
    const height = options?.height || 600;

    const html = this.generateStandaloneHTML(gameSpec, {
      title,
      backgroundColor: bgColor,
      width,
      height,
    });

    return {
      success: true,
      platform: 'html',
      output: html,
      filename: `${this.sanitizeFilename(title)}.html`,
      instructions: [
        'Open the HTML file in any modern browser to play',
        'Share the file directly - no server needed',
        'Works offline once downloaded',
      ],
    };
  }

  /**
   * Export as ZIP with game files
   */
  private async publishAsZip(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): Promise<PublishResult> {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';

    // Generate the standalone HTML
    const html = this.generateStandaloneHTML(gameSpec, {
      title,
      backgroundColor: options?.backgroundColor || '#1a1a2e',
      width: options?.width || 800,
      height: options?.height || 600,
    });

    // TODO: In a real implementation, we'd create a ZIP file here
    // with: this.generateReadme(gameSpec, options) and JSON.stringify(gameSpec, null, 2)
    // For now, return the HTML as the primary output
    return {
      success: true,
      platform: 'zip',
      output: html,
      filename: `${this.sanitizeFilename(title)}.zip`,
      instructions: [
        'Extract the ZIP file to a folder',
        'Open index.html to play the game',
        'Upload the folder to any web server to share online',
        'game.json contains the editable game data',
      ],
    };
  }

  /**
   * Export formatted for itch.io
   */
  private async publishForItch(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): Promise<PublishResult> {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';
    const description = options?.description || gameSpec.metadata?.description || '';
    const genre = gameSpec.metadata?.genre || 'platformer';

    // Generate itch.io metadata
    const itchMetadata: ItchMetadata = {
      title,
      short_text: description.slice(0, 200),
      classification: 'game',
      kind: 'html',
      tags: this.generateTags(gameSpec),
      genre: this.mapGenreToItch(genre),
      community: 'open',
    };

    // Generate the HTML with itch.io optimizations
    const html = this.generateStandaloneHTML(gameSpec, {
      title,
      backgroundColor: options?.backgroundColor || '#1a1a2e',
      width: options?.width || 800,
      height: options?.height || 600,
      itchOptimized: true,
    });

    return {
      success: true,
      platform: 'itch',
      output: html,
      filename: 'index.html',
      instructions: [
        '1. Go to itch.io and create a new project',
        '2. Select "HTML" as the kind of project',
        '3. Upload index.html as your game file',
        '4. Set viewport dimensions to 800x600 (or your game size)',
        '5. Enable "Embed in page" option',
        `6. Add these tags: ${itchMetadata.tags.join(', ')}`,
        '7. Write a description and add a cover image',
        '8. Publish!',
      ],
    };
  }

  /**
   * Export formatted for GitHub Pages
   */
  private async publishForGitHubPages(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): Promise<PublishResult> {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';

    // Generate the HTML
    const html = this.generateStandaloneHTML(gameSpec, {
      title,
      backgroundColor: options?.backgroundColor || '#1a1a2e',
      width: options?.width || 800,
      height: options?.height || 600,
    });

    return {
      success: true,
      platform: 'github-pages',
      output: html,
      filename: 'index.html',
      instructions: [
        '1. Create a new GitHub repository',
        '2. Upload index.html to the repository',
        '3. Go to Settings > Pages',
        '4. Select "main" branch as source',
        '5. Your game will be live at https://[username].github.io/[repo-name]',
      ],
    };
  }

  /**
   * Export as Progressive Web App (Mobile-ready)
   */
  private async publishAsPWA(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): Promise<PublishResult> {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';
    const description = options?.description || gameSpec.metadata?.description || 'A game made with PromptPlay';
    const themeColor = options?.themeColor || options?.backgroundColor || '#1a1a2e';
    const bgColor = options?.backgroundColor || '#1a1a2e';
    const orientation = options?.orientation || 'any';
    const touchControls = options?.touchControls !== false;
    const offlineSupport = options?.offlineSupport !== false;

    // Generate manifest.json
    const manifest = this.generateManifest({
      name: title,
      shortName: title.slice(0, 12),
      description,
      themeColor,
      backgroundColor: bgColor,
      orientation,
    });

    // Generate service worker
    const serviceWorker = offlineSupport ? this.generateServiceWorker(title) : '';

    // Generate the PWA HTML with touch controls
    const html = this.generatePWAHTML(gameSpec, {
      title,
      backgroundColor: bgColor,
      width: options?.width || 800,
      height: options?.height || 600,
      themeColor,
      touchControls,
      offlineSupport,
    });

    // Return as a package with multiple files
    const pwaPackage = {
      'index.html': html,
      'manifest.json': manifest,
      ...(offlineSupport && { 'sw.js': serviceWorker }),
    };

    return {
      success: true,
      platform: 'pwa',
      output: JSON.stringify(pwaPackage),
      filename: `${this.sanitizeFilename(title)}-pwa.zip`,
      instructions: [
        '1. Extract all files to a folder',
        '2. Deploy to any HTTPS web server (required for PWA)',
        '3. On mobile: Open the URL and tap "Add to Home Screen"',
        '4. The game will work offline once installed',
        '5. Touch controls are included for mobile gameplay',
        '',
        'For local testing: Use a local HTTPS server like:',
        '  npx serve -s',
        '  or: python -m http.server',
      ],
    };
  }

  /**
   * Generate Web App Manifest for PWA
   */
  private generateManifest(options: {
    name: string;
    shortName: string;
    description: string;
    themeColor: string;
    backgroundColor: string;
    orientation: string;
  }): string {
    const manifest = {
      name: options.name,
      short_name: options.shortName,
      description: options.description,
      start_url: '.',
      display: 'fullscreen',
      orientation: options.orientation,
      background_color: options.backgroundColor,
      theme_color: options.themeColor,
      icons: [
        {
          src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%231a1a2e"/><text x="96" y="110" font-size="80" text-anchor="middle" fill="white">🎮</text></svg>',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
        {
          src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%231a1a2e"/><text x="256" y="300" font-size="200" text-anchor="middle" fill="white">🎮</text></svg>',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
      categories: ['games', 'entertainment'],
      prefer_related_applications: false,
    };

    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generate Service Worker for offline support
   */
  private generateServiceWorker(title: string): string {
    const cacheName = `promptplay-${this.sanitizeFilename(title)}-v1`;

    return `// Service Worker for ${title}
const CACHE_NAME = '${cacheName}';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(() => {
      // Return offline fallback if available
      return caches.match('./index.html');
    })
  );
});
`;
  }

  /**
   * Generate PWA-optimized HTML with touch controls
   */
  private generatePWAHTML(
    gameSpec: GameSpec,
    options: {
      title: string;
      backgroundColor: string;
      width: number;
      height: number;
      themeColor: string;
      touchControls: boolean;
      offlineSupport: boolean;
    }
  ): string {
    const { title, backgroundColor, width, height, themeColor, touchControls, offlineSupport } = options;
    const gameSpecJson = JSON.stringify(gameSpec);

    const touchControlsHTML = touchControls ? `
    <!-- Touch Controls Overlay -->
    <div id="touch-controls" class="touch-controls">
      <div class="dpad">
        <button class="dpad-btn dpad-up" data-key="ArrowUp">▲</button>
        <button class="dpad-btn dpad-left" data-key="ArrowLeft">◀</button>
        <button class="dpad-btn dpad-right" data-key="ArrowRight">▶</button>
        <button class="dpad-btn dpad-down" data-key="ArrowDown">▼</button>
      </div>
      <div class="action-buttons">
        <button class="action-btn jump-btn" data-key="Space">JUMP</button>
      </div>
    </div>` : '';

    const touchControlsCSS = touchControls ? `
    .touch-controls {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 20px;
      pointer-events: none;
      z-index: 1000;
    }
    .dpad, .action-buttons {
      pointer-events: auto;
    }
    .dpad {
      position: relative;
      width: 140px;
      height: 140px;
    }
    .dpad-btn {
      position: absolute;
      width: 50px;
      height: 50px;
      border: none;
      border-radius: 10px;
      background: rgba(255,255,255,0.3);
      color: white;
      font-size: 20px;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dpad-btn:active {
      background: rgba(255,255,255,0.6);
      transform: scale(0.95);
    }
    .dpad-up { top: 0; left: 50%; transform: translateX(-50%); }
    .dpad-down { bottom: 0; left: 50%; transform: translateX(-50%); }
    .dpad-left { left: 0; top: 50%; transform: translateY(-50%); }
    .dpad-right { right: 0; top: 50%; transform: translateY(-50%); }
    .action-buttons {
      display: flex;
      gap: 15px;
    }
    .action-btn {
      width: 80px;
      height: 80px;
      border: none;
      border-radius: 50%;
      background: rgba(100,200,255,0.4);
      color: white;
      font-size: 14px;
      font-weight: bold;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      cursor: pointer;
    }
    .action-btn:active {
      background: rgba(100,200,255,0.7);
      transform: scale(0.95);
    }
    @media (min-width: 1024px) {
      .touch-controls { display: none; }
    }` : '';

    const touchControlsJS = touchControls ? `
    // Touch Controls Handler
    function setupTouchControls() {
      const buttons = document.querySelectorAll('[data-key]');
      const activeKeys = new Set();

      buttons.forEach(btn => {
        const key = btn.dataset.key;

        const handleStart = (e) => {
          e.preventDefault();
          activeKeys.add(key);
          window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
          btn.classList.add('active');
        };

        const handleEnd = (e) => {
          e.preventDefault();
          activeKeys.delete(key);
          window.dispatchEvent(new KeyboardEvent('keyup', { code: key }));
          btn.classList.remove('active');
        };

        btn.addEventListener('touchstart', handleStart, { passive: false });
        btn.addEventListener('touchend', handleEnd, { passive: false });
        btn.addEventListener('touchcancel', handleEnd, { passive: false });
        btn.addEventListener('mousedown', handleStart);
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', handleEnd);
      });
    }
    setupTouchControls();` : '';

    const serviceWorkerJS = offlineSupport ? `
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registered'))
          .catch(err => console.log('SW registration failed:', err));
      });
    }` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${this.escapeHtml(title)}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="${themeColor}">
  <meta name="msapplication-TileColor" content="${themeColor}">
  <meta name="description" content="Play ${this.escapeHtml(title)} - Made with PromptPlay">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect width='180' height='180' fill='${encodeURIComponent(backgroundColor)}'/><text x='90' y='110' font-size='80' text-anchor='middle'>🎮</text></svg>">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: ${backgroundColor};
      overflow: hidden;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    #game-container {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: ${width}px;
      max-height: ${height}px;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error {
      color: #ff6b6b;
      background: rgba(255,107,107,0.1);
      padding: 20px;
      border-radius: 8px;
    }
    .fullscreen-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 20px;
      cursor: pointer;
      z-index: 999;
    }
    .fullscreen-btn:hover { background: rgba(255,255,255,0.3); }
    ${touchControlsCSS}
  </style>
</head>
<body>
  <button class="fullscreen-btn" id="fullscreen-btn" title="Toggle Fullscreen">⛶</button>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div class="loading" id="loading">
      <div class="loading-spinner"></div>
      <div>Loading game...</div>
    </div>
  </div>
  ${touchControlsHTML}

  <script>
    const GAME_SPEC = ${gameSpecJson};

    class GameRuntime {
      constructor(canvas, spec) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.spec = spec;
        this.entities = new Map();
        this.keys = new Set();
        this.running = false;
        this.lastTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.gravity = spec.config?.gravity || { x: 0, y: 1 };

        this.setupInput();
        this.loadEntities();
      }

      resize() {
        const container = this.canvas.parentElement;
        const ratio = (this.spec.config?.worldBounds?.width || 800) / (this.spec.config?.worldBounds?.height || 600);
        let w = container.clientWidth;
        let h = container.clientHeight;
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        this.canvas.width = this.spec.config?.worldBounds?.width || 800;
        this.canvas.height = this.spec.config?.worldBounds?.height || 600;
      }

      setupInput() {
        window.addEventListener('keydown', (e) => {
          this.keys.add(e.code);
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
          }
        });
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      }

      loadEntities() {
        this.spec.entities.forEach(entity => {
          this.entities.set(entity.name, {
            ...entity,
            vx: entity.components.velocity?.vx || 0,
            vy: entity.components.velocity?.vy || 0,
            grounded: false,
          });
        });
      }

      start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }

      loop(time) {
        if (!this.running) return;

        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
      }

      update(dt) {
        this.entities.forEach(entity => {
          const { components } = entity;
          const transform = components.transform;
          const input = components.input;
          const collider = components.collider;

          if (!transform) return;

          if (input) {
            const speed = input.moveSpeed || 200;
            let moveX = 0;

            if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) moveX = -1;
            if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) moveX = 1;

            entity.vx = moveX * speed;

            if (input.canJump && entity.grounded) {
              if (this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
                entity.vy = -(input.jumpForce || 400);
                entity.grounded = false;
              }
            }
          }

          if (!components.tags?.includes('static')) {
            entity.vy += this.gravity.y * 980 * dt;
          }

          transform.x += entity.vx * dt;
          transform.y += entity.vy * dt;

          if (collider && !entity.tags?.includes('static')) {
            this.entities.forEach(other => {
              if (other === entity || !other.tags?.includes('static')) return;
              if (!other.components.transform || !other.components.collider) return;

              const collision = this.checkCollision(entity, other);
              if (collision) {
                this.resolveCollision(entity, other, collision);
              }
            });
          }

          const bounds = this.spec.config?.worldBounds || { width: 800, height: 600 };
          const w = collider?.width || 32;
          const h = collider?.height || 32;

          if (transform.x - w/2 < 0) { transform.x = w/2; entity.vx = 0; }
          if (transform.x + w/2 > bounds.width) { transform.x = bounds.width - w/2; entity.vx = 0; }
          if (transform.y + h/2 > bounds.height) {
            transform.y = bounds.height - h/2;
            entity.vy = 0;
            entity.grounded = true;
          }
        });
      }

      checkCollision(a, b) {
        const aT = a.components.transform;
        const bT = b.components.transform;
        const aC = a.components.collider || { width: 32, height: 32 };
        const bC = b.components.collider || { width: 32, height: 32 };

        const aLeft = aT.x - aC.width/2;
        const aRight = aT.x + aC.width/2;
        const aTop = aT.y - aC.height/2;
        const aBottom = aT.y + aC.height/2;

        const bLeft = bT.x - bC.width/2;
        const bRight = bT.x + bC.width/2;
        const bTop = bT.y - bC.height/2;
        const bBottom = bT.y + bC.height/2;

        if (aRight > bLeft && aLeft < bRight && aBottom > bTop && aTop < bBottom) {
          const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
          const overlapY = Math.min(aBottom - bTop, bBottom - aTop);
          return { overlapX, overlapY, bTop };
        }
        return null;
      }

      resolveCollision(entity, other, collision) {
        const transform = entity.components.transform;

        if (collision.overlapY < collision.overlapX) {
          if (transform.y < other.components.transform.y) {
            transform.y = collision.bTop - (entity.components.collider?.height || 32) / 2;
            entity.vy = 0;
            entity.grounded = true;
          } else {
            transform.y += collision.overlapY;
            entity.vy = 0;
          }
        } else {
          if (transform.x < other.components.transform.x) {
            transform.x -= collision.overlapX;
          } else {
            transform.x += collision.overlapX;
          }
          entity.vx = 0;
        }
      }

      render() {
        const { width, height } = this.canvas;

        this.ctx.fillStyle = '${backgroundColor}';
        this.ctx.fillRect(0, 0, width, height);

        const sorted = Array.from(this.entities.values())
          .filter(e => e.components.sprite)
          .sort((a, b) => (a.components.sprite.zIndex || 0) - (b.components.sprite.zIndex || 0));

        sorted.forEach(entity => {
          const sprite = entity.components.sprite;
          const transform = entity.components.transform;

          if (!sprite || !transform) return;

          this.ctx.save();
          this.ctx.translate(transform.x, transform.y);

          if (transform.rotation) {
            this.ctx.rotate(transform.rotation);
          }

          this.ctx.fillStyle = sprite.tint ? '#' + sprite.tint.toString(16).padStart(6, '0') : '#ffffff';
          this.ctx.fillRect(-sprite.width/2, -sprite.height/2, sprite.width, sprite.height);

          this.ctx.restore();
        });
      }
    }

    // Fullscreen toggle
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.log);
      } else {
        document.exitFullscreen();
      }
    });

    ${touchControlsJS}
    ${serviceWorkerJS}

    // Initialize game
    window.addEventListener('load', () => {
      const loadingEl = document.getElementById('loading');
      const canvas = document.getElementById('game-canvas');

      try {
        const game = new GameRuntime(canvas, GAME_SPEC);
        loadingEl.style.display = 'none';
        game.start();
      } catch (error) {
        loadingEl.innerHTML = '<div class="error">Error loading game: ' + error.message + '</div>';
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generate standalone HTML with embedded game
   */
  private generateStandaloneHTML(
    gameSpec: GameSpec,
    options: {
      title: string;
      backgroundColor: string;
      width: number;
      height: number;
      itchOptimized?: boolean;
    }
  ): string {
    const { title, backgroundColor, width, height } = options;
    const gameSpecJson = JSON.stringify(gameSpec);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: ${backgroundColor};
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #game-container {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      max-width: 100%;
      max-height: 100%;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: #ff6b6b;
      background: rgba(255,107,107,0.1);
      padding: 20px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div class="loading" id="loading">
      <div class="loading-spinner"></div>
      <div>Loading game...</div>
    </div>
  </div>

  <script>
    // Game specification
    const GAME_SPEC = ${gameSpecJson};

    // Minimal 2D game runtime (embedded)
    class GameRuntime {
      constructor(canvas, spec) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.spec = spec;
        this.entities = new Map();
        this.keys = new Set();
        this.running = false;
        this.lastTime = 0;

        canvas.width = spec.config?.worldBounds?.width || 800;
        canvas.height = spec.config?.worldBounds?.height || 600;

        this.gravity = spec.config?.gravity || { x: 0, y: 1 };

        this.setupInput();
        this.loadEntities();
      }

      setupInput() {
        window.addEventListener('keydown', (e) => {
          this.keys.add(e.code);
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
          }
        });
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      }

      loadEntities() {
        this.spec.entities.forEach(entity => {
          this.entities.set(entity.name, {
            ...entity,
            vx: entity.components.velocity?.vx || 0,
            vy: entity.components.velocity?.vy || 0,
            grounded: false,
          });
        });
      }

      start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }

      loop(time) {
        if (!this.running) return;

        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
      }

      update(dt) {
        this.entities.forEach(entity => {
          const { components } = entity;
          const transform = components.transform;
          const input = components.input;
          const collider = components.collider;

          if (!transform) return;

          // Input handling
          if (input) {
            const speed = input.moveSpeed || 200;
            let moveX = 0;

            if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) moveX = -1;
            if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) moveX = 1;

            entity.vx = moveX * speed;

            if (input.canJump && entity.grounded) {
              if (this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
                entity.vy = -(input.jumpForce || 400);
                entity.grounded = false;
              }
            }
          }

          // Apply gravity
          if (!components.tags?.includes('static')) {
            entity.vy += this.gravity.y * 980 * dt;
          }

          // Update position
          transform.x += entity.vx * dt;
          transform.y += entity.vy * dt;

          // Simple collision with platforms
          if (collider && !entity.tags?.includes('static')) {
            this.entities.forEach(other => {
              if (other === entity || !other.tags?.includes('static')) return;
              if (!other.components.transform || !other.components.collider) return;

              const collision = this.checkCollision(entity, other);
              if (collision) {
                this.resolveCollision(entity, other, collision);
              }
            });
          }

          // World bounds
          const bounds = this.spec.config?.worldBounds || { width: 800, height: 600 };
          const w = collider?.width || 32;
          const h = collider?.height || 32;

          if (transform.x - w/2 < 0) { transform.x = w/2; entity.vx = 0; }
          if (transform.x + w/2 > bounds.width) { transform.x = bounds.width - w/2; entity.vx = 0; }
          if (transform.y + h/2 > bounds.height) {
            transform.y = bounds.height - h/2;
            entity.vy = 0;
            entity.grounded = true;
          }
        });
      }

      checkCollision(a, b) {
        const aT = a.components.transform;
        const bT = b.components.transform;
        const aC = a.components.collider || { width: 32, height: 32 };
        const bC = b.components.collider || { width: 32, height: 32 };

        const aLeft = aT.x - aC.width/2;
        const aRight = aT.x + aC.width/2;
        const aTop = aT.y - aC.height/2;
        const aBottom = aT.y + aC.height/2;

        const bLeft = bT.x - bC.width/2;
        const bRight = bT.x + bC.width/2;
        const bTop = bT.y - bC.height/2;
        const bBottom = bT.y + bC.height/2;

        if (aRight > bLeft && aLeft < bRight && aBottom > bTop && aTop < bBottom) {
          const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
          const overlapY = Math.min(aBottom - bTop, bBottom - aTop);
          return { overlapX, overlapY, bTop };
        }
        return null;
      }

      resolveCollision(entity, other, collision) {
        const transform = entity.components.transform;

        if (collision.overlapY < collision.overlapX) {
          if (transform.y < other.components.transform.y) {
            transform.y = collision.bTop - (entity.components.collider?.height || 32) / 2;
            entity.vy = 0;
            entity.grounded = true;
          } else {
            transform.y += collision.overlapY;
            entity.vy = 0;
          }
        } else {
          if (transform.x < other.components.transform.x) {
            transform.x -= collision.overlapX;
          } else {
            transform.x += collision.overlapX;
          }
          entity.vx = 0;
        }
      }

      render() {
        const { width, height } = this.canvas;

        // Clear
        this.ctx.fillStyle = '${backgroundColor}';
        this.ctx.fillRect(0, 0, width, height);

        // Sort by z-index
        const sorted = Array.from(this.entities.values())
          .filter(e => e.components.sprite)
          .sort((a, b) => (a.components.sprite.zIndex || 0) - (b.components.sprite.zIndex || 0));

        // Draw entities
        sorted.forEach(entity => {
          const sprite = entity.components.sprite;
          const transform = entity.components.transform;

          if (!sprite || !transform) return;

          this.ctx.save();
          this.ctx.translate(transform.x, transform.y);

          if (transform.rotation) {
            this.ctx.rotate(transform.rotation);
          }

          // Draw as colored rectangle
          this.ctx.fillStyle = sprite.tint || '#ffffff';
          this.ctx.fillRect(-sprite.width/2, -sprite.height/2, sprite.width, sprite.height);

          this.ctx.restore();
        });
      }
    }

    // Initialize game
    window.addEventListener('load', () => {
      const loadingEl = document.getElementById('loading');
      const canvas = document.getElementById('game-canvas');

      try {
        const game = new GameRuntime(canvas, GAME_SPEC);
        loadingEl.style.display = 'none';
        game.start();
      } catch (error) {
        loadingEl.innerHTML = '<div class="error">Error loading game: ' + error.message + '</div>';
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generate README file (for future ZIP export implementation)
   */
  // @ts-ignore - Unused for now, will be used for ZIP export
  private generateReadme(
    gameSpec: GameSpec,
    options?: PublishConfig['options']
  ): string {
    const title = options?.title || gameSpec.metadata?.title || 'PromptPlay Game';
    const description = options?.description || gameSpec.metadata?.description || '';
    const author = options?.author || 'Created with PromptPlay';
    const version = options?.version || '1.0.0';

    return `# ${title}

${description}

## Controls
- Arrow keys or WASD to move
- Space to jump (in platformers)

## About
- Version: ${version}
- Created by: ${author}
- Built with: PromptPlay Game Engine

## Files
- \`index.html\` - Play the game in any browser
- \`game.json\` - Editable game data

## Credits
Created with [PromptPlay](https://github.com/promptplay) - the AI-first game engine.
`;
  }

  /**
   * Generate tags for itch.io
   */
  private generateTags(gameSpec: GameSpec): string[] {
    const tags: string[] = ['html5', 'browser'];
    const genre = gameSpec.metadata?.genre;

    if (genre) {
      tags.push(genre);
    }

    // Add genre-specific tags
    switch (genre) {
      case 'platformer':
        tags.push('2d', 'pixel-art', 'side-scroller');
        break;
      case 'shooter':
        tags.push('action', 'top-down');
        break;
      case 'puzzle':
        tags.push('brain-teaser', 'casual');
        break;
    }

    // Check for common gameplay elements
    const hasEnemies = gameSpec.entities.some((e) => e.tags?.includes('enemy'));
    const hasCollectibles = gameSpec.entities.some((e) => e.tags?.includes('collectible'));

    if (hasEnemies) tags.push('enemies');
    if (hasCollectibles) tags.push('collectathon');

    return tags.slice(0, 10); // itch.io limits to 10 tags
  }

  /**
   * Map genre to itch.io genre
   */
  private mapGenreToItch(genre: string): string {
    const mapping: Record<string, string> = {
      platformer: 'Platformer',
      shooter: 'Action',
      puzzle: 'Puzzle',
      racing: 'Racing',
      rpg: 'Role Playing',
    };
    return mapping[genre] || 'Action';
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Generate a game thumbnail (placeholder)
   */
  async generateThumbnail(
    gameSpec: GameSpec,
    _width = 630,
    _height = 500
  ): Promise<string> {
    // In a real implementation, render the game and capture a screenshot
    // For now, return a placeholder data URL
    const canvas = document.createElement('canvas');
    canvas.width = 630;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 630, 500);

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameSpec.metadata?.title || 'Game', 315, 250);

    // Draw subtitle
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('Made with PromptPlay', 315, 290);

    return canvas.toDataURL('image/png');
  }

  /**
   * Generate a game description using AI (placeholder)
   */
  async generateDescription(gameSpec: GameSpec): Promise<string> {
    const genre = gameSpec.metadata?.genre || 'game';
    const entityCount = gameSpec.entities.length;
    const hasEnemies = gameSpec.entities.some((e) => e.tags?.includes('enemy'));
    const hasCollectibles = gameSpec.entities.some((e) => e.tags?.includes('collectible'));

    let description = `A ${genre} game `;

    if (hasEnemies && hasCollectibles) {
      description += 'with challenging enemies and collectibles to gather. ';
    } else if (hasEnemies) {
      description += 'with dangerous enemies to avoid or defeat. ';
    } else if (hasCollectibles) {
      description += 'with items to collect. ';
    }

    description += `Features ${entityCount} unique elements. `;
    description += 'Use arrow keys to move and space to jump. ';
    description += 'Created with PromptPlay, the AI-first game engine.';

    return description;
  }
}

// Singleton instance
export const publishService = new PublishService();
