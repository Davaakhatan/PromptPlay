import type { GameSpec } from '@promptplay/shared-types';

/**
 * Publish target platforms
 */
export type PublishPlatform = 'html' | 'itch' | 'zip' | 'github-pages';

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

    // Generate README
    const readme = this.generateReadme(gameSpec, options);

    // Generate game.json
    const gameJson = JSON.stringify(gameSpec, null, 2);

    // In a real implementation, we'd create a ZIP file here
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
   * Generate README file
   */
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
