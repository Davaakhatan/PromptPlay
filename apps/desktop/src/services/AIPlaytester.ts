import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

/**
 * Playtest issue severity levels
 */
export type IssueSeverity = 'critical' | 'warning' | 'suggestion';

/**
 * Playtest issue category
 */
export type IssueCategory =
  | 'gameplay'
  | 'physics'
  | 'balance'
  | 'accessibility'
  | 'performance'
  | 'design';

/**
 * A single playtest issue
 */
export interface PlaytestIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  entityName?: string;
  suggestion?: string;
  autoFixable?: boolean;
}

/**
 * Playtest report result
 */
export interface PlaytestReport {
  gameTitle: string;
  timestamp: Date;
  issues: PlaytestIssue[];
  score: number; // 0-100
  summary: string;
  recommendations: string[];
}

/**
 * AI Playtester Service
 * Analyzes game specifications to find potential issues
 */
export class AIPlaytesterService {
  private issueIdCounter = 0;

  /**
   * Generate a unique issue ID
   */
  private generateIssueId(): string {
    return `issue_${++this.issueIdCounter}_${Date.now()}`;
  }

  /**
   * Run a full playtest analysis on a game
   */
  async analyzeGame(gameSpec: GameSpec): Promise<PlaytestReport> {
    const issues: PlaytestIssue[] = [];

    // Run all analysis checks
    issues.push(...this.checkPlayerEntity(gameSpec));
    issues.push(...this.checkPhysicsSetup(gameSpec));
    issues.push(...this.checkCollisionSetup(gameSpec));
    issues.push(...this.checkGameBalance(gameSpec));
    issues.push(...this.checkAccessibility(gameSpec));
    issues.push(...this.checkPerformance(gameSpec));
    issues.push(...this.checkDesignPatterns(gameSpec));

    // Calculate overall score
    const score = this.calculateScore(issues);

    // Generate summary
    const summary = this.generateSummary(gameSpec, issues, score);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      gameTitle: gameSpec.metadata?.title || 'Untitled Game',
      timestamp: new Date(),
      issues,
      score,
      summary,
      recommendations,
    };
  }

  /**
   * Check for player entity issues
   */
  private checkPlayerEntity(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];
    const player = gameSpec.entities.find(
      (e) => e.tags?.includes('player') || e.name === 'player'
    );

    if (!player) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'critical',
        category: 'gameplay',
        title: 'No player entity found',
        description:
          'The game has no entity tagged as "player" or named "player". Players need a controllable character.',
        suggestion: 'Add an entity with the "player" tag and input component.',
        autoFixable: true,
      });
      return issues;
    }

    // Check for input component
    if (!player.components.input) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'critical',
        category: 'gameplay',
        title: 'Player has no input controls',
        description: `The player entity "${player.name}" has no input component configured.`,
        entityName: player.name,
        suggestion: 'Add an input component with moveSpeed and optionally jumpForce.',
        autoFixable: true,
      });
    }

    // Check for collider
    if (!player.components.collider) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'warning',
        category: 'physics',
        title: 'Player has no collider',
        description: `The player "${player.name}" has no collider, so they won't interact with the environment.`,
        entityName: player.name,
        suggestion: 'Add a collider component to enable collision detection.',
        autoFixable: true,
      });
    }

    // Check player starting position
    const transform = player.components.transform;
    if (transform) {
      const worldBounds = gameSpec.config?.worldBounds || { width: 800, height: 600 };

      if (transform.x < 0 || transform.x > worldBounds.width ||
          transform.y < 0 || transform.y > worldBounds.height) {
        issues.push({
          id: this.generateIssueId(),
          severity: 'warning',
          category: 'gameplay',
          title: 'Player starts outside world bounds',
          description: `The player starts at (${transform.x}, ${transform.y}) which is outside the world bounds.`,
          entityName: player.name,
          suggestion: 'Move the player to start within the visible game area.',
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Check physics setup
   */
  private checkPhysicsSetup(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];
    const gravity = gameSpec.config?.gravity;
    const genre = gameSpec.metadata?.genre;

    // Check for appropriate gravity based on genre
    if (genre === 'platformer' && gravity?.y === 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'warning',
        category: 'physics',
        title: 'Platformer has no gravity',
        description: 'Platformer games typically need gravity for jumping mechanics.',
        suggestion: 'Set gravity.y to a positive value (e.g., 1 for normal gravity).',
        autoFixable: true,
      });
    }

    if (genre === 'shooter' && gravity && gravity.y !== 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'physics',
        title: 'Top-down shooter has gravity',
        description: 'Top-down shooters usually work better without gravity.',
        suggestion: 'Consider setting gravity to { x: 0, y: 0 } for top-down view.',
      });
    }

    return issues;
  }

  /**
   * Check collision setup
   */
  private checkCollisionSetup(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];

    // Check for platforms in platformers
    const genre = gameSpec.metadata?.genre;
    if (genre === 'platformer') {
      const platforms = gameSpec.entities.filter(
        (e) => e.tags?.includes('platform') || e.tags?.includes('static')
      );

      if (platforms.length === 0) {
        issues.push({
          id: this.generateIssueId(),
          severity: 'critical',
          category: 'gameplay',
          title: 'No platforms found',
          description: 'Platformer games need platforms for the player to stand on.',
          suggestion: 'Add ground and platform entities with static colliders.',
          autoFixable: true,
        });
      }

      // Check for ground
      const hasGround = gameSpec.entities.some(
        (e) => e.name === 'ground' || e.name.includes('floor')
      );
      if (!hasGround && platforms.length < 2) {
        issues.push({
          id: this.generateIssueId(),
          severity: 'warning',
          category: 'gameplay',
          title: 'Missing ground level',
          description: 'Consider adding a ground or floor entity at the bottom of the level.',
          suggestion: 'Add a wide platform at the bottom of the game area.',
        });
      }
    }

    // Check for overlapping static colliders
    const staticEntities = gameSpec.entities.filter(
      (e) => e.tags?.includes('static') && e.components.collider
    );

    for (let i = 0; i < staticEntities.length; i++) {
      for (let j = i + 1; j < staticEntities.length; j++) {
        if (this.checkOverlap(staticEntities[i], staticEntities[j])) {
          issues.push({
            id: this.generateIssueId(),
            severity: 'suggestion',
            category: 'design',
            title: 'Overlapping static colliders',
            description: `"${staticEntities[i].name}" and "${staticEntities[j].name}" overlap, which may cause physics issues.`,
            suggestion: 'Consider adjusting positions to prevent overlap.',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check game balance
   */
  private checkGameBalance(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];

    const player = gameSpec.entities.find((e) => e.tags?.includes('player'));
    const enemies = gameSpec.entities.filter((e) => e.tags?.includes('enemy'));
    const collectibles = gameSpec.entities.filter((e) => e.tags?.includes('collectible'));

    // Check enemy count
    if (enemies.length > 10) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'balance',
        title: 'High enemy count',
        description: `The game has ${enemies.length} enemies which may be overwhelming.`,
        suggestion: 'Consider reducing enemy count or spacing them out more.',
      });
    }

    // Check player health vs enemy damage potential
    const playerHealth = player?.components.health?.max ?? 100;
    const enemyCount = enemies.length;
    if (enemyCount > 0 && playerHealth < enemyCount * 10) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'balance',
        title: 'Low player health for enemy count',
        description: `Player health (${playerHealth}) may be too low for ${enemyCount} enemies.`,
        suggestion: 'Consider increasing player health or adding health pickups.',
      });
    }

    // Check for reward/risk balance
    if (enemies.length > 0 && collectibles.length === 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'balance',
        title: 'Enemies but no rewards',
        description: 'The game has enemies but no collectibles as rewards.',
        suggestion: 'Add collectibles (coins, gems, power-ups) to reward players.',
      });
    }

    return issues;
  }

  /**
   * Check accessibility concerns
   */
  private checkAccessibility(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];

    // Check color contrast
    const colors = new Set<string>();
    gameSpec.entities.forEach((entity) => {
      if (entity.components.sprite?.tint) {
        colors.add(entity.components.sprite.tint);
      }
    });

    // Simplified color check - just warn if too many similar colors
    if (colors.size > 0 && colors.size < 3) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'accessibility',
        title: 'Limited color variety',
        description: 'The game uses few distinct colors, which may make it harder to distinguish elements.',
        suggestion: 'Consider using more contrasting colors for different entity types.',
      });
    }

    // Check entity sizes
    const smallEntities = gameSpec.entities.filter((entity) => {
      const sprite = entity.components.sprite;
      return sprite && (sprite.width < 16 || sprite.height < 16);
    });

    if (smallEntities.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'accessibility',
        title: 'Very small entities',
        description: `${smallEntities.length} entities are smaller than 16px, which may be hard to see.`,
        suggestion: 'Consider increasing size of small entities or adding visual indicators.',
      });
    }

    return issues;
  }

  /**
   * Check performance concerns
   */
  private checkPerformance(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];

    const entityCount = gameSpec.entities.length;

    if (entityCount > 100) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'warning',
        category: 'performance',
        title: 'High entity count',
        description: `The game has ${entityCount} entities which may impact performance.`,
        suggestion: 'Consider using object pooling or reducing entity count.',
      });
    }

    if (entityCount > 50) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'performance',
        title: 'Moderate entity count',
        description: `The game has ${entityCount} entities. Monitor performance.`,
        suggestion: 'Test on lower-end devices to ensure smooth gameplay.',
      });
    }

    // Check for complex AI
    const aiEntities = gameSpec.entities.filter(
      (e) => e.components.aiBehavior
    );
    if (aiEntities.length > 20) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'warning',
        category: 'performance',
        title: 'Many AI entities',
        description: `${aiEntities.length} entities have AI behavior, which may impact CPU usage.`,
        suggestion: 'Consider simplifying AI or reducing AI entity count.',
      });
    }

    return issues;
  }

  /**
   * Check design patterns and best practices
   */
  private checkDesignPatterns(gameSpec: GameSpec): PlaytestIssue[] {
    const issues: PlaytestIssue[] = [];

    // Check for goal/objective
    const hasGoal = gameSpec.entities.some(
      (e) => e.tags?.includes('goal') || e.tags?.includes('exit') || e.tags?.includes('finish')
    );
    if (!hasGoal) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'design',
        title: 'No clear goal',
        description: 'The game has no entity tagged as a goal or objective.',
        suggestion: 'Add a goal entity to give players a clear objective.',
      });
    }

    // Check for tutorials/instructions
    // (In a full implementation, check for UI text elements)

    // Check entity naming
    const unnamedCount = gameSpec.entities.filter(
      (e) => e.name.startsWith('entity_') || e.name.match(/^Entity\d+$/)
    ).length;
    if (unnamedCount > 5) {
      issues.push({
        id: this.generateIssueId(),
        severity: 'suggestion',
        category: 'design',
        title: 'Generic entity names',
        description: `${unnamedCount} entities have generic names, making organization harder.`,
        suggestion: 'Give entities descriptive names for easier management.',
      });
    }

    return issues;
  }

  /**
   * Check if two entities overlap
   */
  private checkOverlap(a: EntitySpec, b: EntitySpec): boolean {
    const aT = a.components.transform;
    const bT = b.components.transform;
    const aC = a.components.collider;
    const bC = b.components.collider;

    if (!aT || !bT || !aC || !bC) return false;

    const aWidth = aC.width ?? 32;
    const aHeight = aC.height ?? 32;
    const bWidth = bC.width ?? 32;
    const bHeight = bC.height ?? 32;

    return !(
      aT.x + aWidth / 2 < bT.x - bWidth / 2 ||
      aT.x - aWidth / 2 > bT.x + bWidth / 2 ||
      aT.y + aHeight / 2 < bT.y - bHeight / 2 ||
      aT.y - aHeight / 2 > bT.y + bHeight / 2
    );
  }

  /**
   * Calculate overall game score based on issues
   */
  private calculateScore(issues: PlaytestIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'suggestion':
          score -= 3;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(
    gameSpec: GameSpec,
    issues: PlaytestIssue[],
    score: number
  ): string {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const suggestions = issues.filter((i) => i.severity === 'suggestion').length;

    const genre = gameSpec.metadata?.genre || 'game';
    const entityCount = gameSpec.entities.length;

    let summary = `Analyzed ${genre} with ${entityCount} entities. `;

    if (score >= 90) {
      summary += 'Game is in excellent shape! ';
    } else if (score >= 70) {
      summary += 'Game is playable but has room for improvement. ';
    } else if (score >= 50) {
      summary += 'Game has several issues that should be addressed. ';
    } else {
      summary += 'Game needs significant work before it is playable. ';
    }

    summary += `Found ${critical} critical issues, ${warnings} warnings, and ${suggestions} suggestions.`;

    return summary;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: PlaytestIssue[]): string[] {
    const recommendations: string[] = [];

    // Priority: critical issues first
    const critical = issues.filter((i) => i.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push(`Fix ${critical.length} critical issues first to make the game playable.`);
    }

    // Category-based recommendations
    const categories = new Map<IssueCategory, number>();
    issues.forEach((issue) => {
      categories.set(issue.category, (categories.get(issue.category) || 0) + 1);
    });

    const sortedCategories = Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
      const [topCategory, count] = sortedCategories[0];
      if (count >= 3) {
        recommendations.push(`Focus on ${topCategory} issues - ${count} found in this category.`);
      }
    }

    // Auto-fix recommendation
    const autoFixable = issues.filter((i) => i.autoFixable);
    if (autoFixable.length > 0) {
      recommendations.push(`${autoFixable.length} issues can be auto-fixed. Use "Fix All" to resolve them.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Your game looks great! Consider adding more content or polish.');
    }

    return recommendations;
  }

  /**
   * Get suggested auto-fix for an issue
   */
  getAutoFix(issue: PlaytestIssue, gameSpec: GameSpec): GameSpec | null {
    if (!issue.autoFixable) return null;

    const updatedSpec = JSON.parse(JSON.stringify(gameSpec)) as GameSpec;

    switch (issue.title) {
      case 'No player entity found':
        updatedSpec.entities.push({
          name: 'player',
          components: {
            transform: { x: 100, y: 400 },
            sprite: { texture: 'player', width: 32, height: 48, tint: '#3498dbff' },
            collider: { type: 'box', width: 32, height: 48 },
            input: { moveSpeed: 200, jumpForce: 400, canJump: true },
            health: { current: 100, max: 100 },
          },
          tags: ['player'],
        });
        return updatedSpec;

      case 'Player has no input controls':
        const player = updatedSpec.entities.find((e) => e.name === issue.entityName);
        if (player) {
          player.components.input = { moveSpeed: 200, jumpForce: 400, canJump: true };
        }
        return updatedSpec;

      case 'Player has no collider':
        const playerForCollider = updatedSpec.entities.find((e) => e.name === issue.entityName);
        if (playerForCollider) {
          const sprite = playerForCollider.components.sprite;
          playerForCollider.components.collider = {
            type: 'box',
            width: sprite?.width ?? 32,
            height: sprite?.height ?? 48,
          };
        }
        return updatedSpec;

      case 'No platforms found':
        updatedSpec.entities.push({
          name: 'ground',
          components: {
            transform: { x: 400, y: 580 },
            sprite: { texture: 'platform', width: 800, height: 40, tint: '#2c3e50ff' },
            collider: { type: 'box', width: 800, height: 40 },
          },
          tags: ['static', 'platform'],
        });
        return updatedSpec;

      default:
        return null;
    }
  }
}

// Singleton instance
export const aiPlaytester = new AIPlaytesterService();
