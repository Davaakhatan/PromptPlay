import type { GameSpec } from '@promptplay/shared-types';

/**
 * Playtest Result
 */
export interface PlaytestResult {
  score: number; // 0-100 overall quality score
  playability: PlayabilityMetrics;
  issues: PlaytestIssue[];
  suggestions: string[];
  summary: string;
  simulatedActions: SimulatedAction[];
}

/**
 * Playability Metrics
 */
export interface PlayabilityMetrics {
  canComplete: boolean;
  playerCanMove: boolean;
  playerCanJump: boolean;
  hasCollisions: boolean;
  hasGoal: boolean;
  difficultyEstimate: 'easy' | 'medium' | 'hard' | 'impossible';
  estimatedPlaytime: number; // seconds
}

/**
 * Playtest Issue
 */
export interface PlaytestIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  entityName?: string;
  suggestion?: string;
}

/**
 * Simulated Action
 */
export interface SimulatedAction {
  time: number;
  action: string;
  result: string;
  position?: { x: number; y: number };
}

/**
 * AI Playtest Service
 * Simulates gameplay to find issues and provide feedback
 */
export class AIPlaytestService {
  private spec: GameSpec | null = null;
  private actions: SimulatedAction[] = [];
  private issues: PlaytestIssue[] = [];

  /**
   * Run a full playtest simulation
   */
  async runPlaytest(gameSpec: GameSpec): Promise<PlaytestResult> {
    this.spec = gameSpec;
    this.actions = [];
    this.issues = [];

    // Analyze game structure
    const structureAnalysis = this.analyzeStructure();

    // Simulate gameplay
    const simulationResult = await this.simulateGameplay();

    // Calculate metrics
    const playability = this.calculatePlayability(structureAnalysis, simulationResult);

    // Generate suggestions
    const suggestions = this.generateSuggestions(playability);

    // Calculate overall score
    const score = this.calculateScore(playability, this.issues);

    // Generate summary
    const summary = this.generateSummary(score, playability, this.issues);

    return {
      score,
      playability,
      issues: this.issues,
      suggestions,
      summary,
      simulatedActions: this.actions,
    };
  }

  /**
   * Analyze game structure
   */
  private analyzeStructure(): StructureAnalysis {
    if (!this.spec) {
      return {
        hasPlayer: false,
        hasPlatforms: false,
        hasEnemies: false,
        hasCollectibles: false,
        hasGoal: false,
        entityCount: 0,
      };
    }

    const entities = this.spec.entities || [];
    const player = entities.find(
      (e) => e.components.input || e.tags?.includes('player')
    );
    const platforms = entities.filter(
      (e) => e.tags?.includes('platform') || e.tags?.includes('ground') || e.tags?.includes('static')
    );
    const enemies = entities.filter((e) => e.tags?.includes('enemy'));
    const collectibles = entities.filter((e) => e.tags?.includes('collectible'));
    const goal = entities.find((e) => e.tags?.includes('goal') || e.tags?.includes('finish'));

    // Check for critical issues
    if (!player) {
      this.issues.push({
        severity: 'critical',
        type: 'missing_player',
        message: 'No player entity found',
        suggestion: 'Add an entity with the Input component or tag it as "player"',
      });
    }

    if (platforms.length === 0 && this.spec.config?.gravity?.y && this.spec.config.gravity.y > 0) {
      this.issues.push({
        severity: 'warning',
        type: 'no_platforms',
        message: 'No platforms found in a game with gravity',
        suggestion: 'Add platforms or ground for the player to stand on',
      });
    }

    // Check for overlapping entities
    this.checkOverlappingEntities(entities);

    // Check for out-of-bounds entities
    this.checkBoundsIssues(entities);

    return {
      hasPlayer: !!player,
      hasPlatforms: platforms.length > 0,
      hasEnemies: enemies.length > 0,
      hasCollectibles: collectibles.length > 0,
      hasGoal: !!goal,
      entityCount: entities.length,
    };
  }

  /**
   * Check for overlapping entities that might cause issues
   */
  private checkOverlappingEntities(entities: any[]): void {
    const entitiesWithColliders = entities.filter((e) => e.components.collider);

    for (let i = 0; i < entitiesWithColliders.length; i++) {
      for (let j = i + 1; j < entitiesWithColliders.length; j++) {
        const a = entitiesWithColliders[i];
        const b = entitiesWithColliders[j];

        if (this.entitiesOverlap(a, b)) {
          // Only warn if one is static and one is dynamic
          const aStatic = a.tags?.includes('static') || !a.components.velocity;
          const bStatic = b.tags?.includes('static') || !b.components.velocity;

          if (aStatic !== bStatic) {
            this.issues.push({
              severity: 'warning',
              type: 'overlapping_entities',
              message: `"${a.name}" overlaps with "${b.name}"`,
              suggestion: 'Move entities apart to prevent physics issues',
            });
          }
        }
      }
    }
  }

  /**
   * Check if two entities overlap
   */
  private entitiesOverlap(a: any, b: any): boolean {
    const aT = a.components.transform;
    const bT = b.components.transform;
    const aC = a.components.collider || a.components.sprite;
    const bC = b.components.collider || b.components.sprite;

    if (!aT || !bT || !aC || !bC) return false;

    const aW = aC.width || 32;
    const aH = aC.height || 32;
    const bW = bC.width || 32;
    const bH = bC.height || 32;

    return (
      Math.abs(aT.x - bT.x) < (aW + bW) / 2 &&
      Math.abs(aT.y - bT.y) < (aH + bH) / 2
    );
  }

  /**
   * Check for entities outside world bounds
   */
  private checkBoundsIssues(entities: any[]): void {
    const bounds = this.spec?.config?.worldBounds || { width: 800, height: 600 };

    for (const entity of entities) {
      const t = entity.components.transform;
      if (!t) continue;

      if (t.x < 0 || t.x > bounds.width || t.y < 0 || t.y > bounds.height) {
        this.issues.push({
          severity: 'info',
          type: 'out_of_bounds',
          message: `"${entity.name}" is outside world bounds`,
          entityName: entity.name,
          suggestion: 'Move the entity inside the visible play area',
        });
      }
    }
  }

  /**
   * Simulate gameplay
   */
  private async simulateGameplay(): Promise<SimulationResult> {
    if (!this.spec) {
      return { success: false, reachedGoal: false, died: false, stuckCount: 0 };
    }

    const player = this.spec.entities?.find(
      (e) => e.components.input || e.tags?.includes('player')
    );

    if (!player) {
      return { success: false, reachedGoal: false, died: false, stuckCount: 0 };
    }

    // Simple simulation - check if player can theoretically reach goals
    const goal = this.spec.entities?.find(
      (e) => e.tags?.includes('goal') || e.tags?.includes('finish')
    );

    let reachedGoal = false;
    let stuckCount = 0;

    // Simulate basic movement
    const playerTransform = player.components.transform;
    const playerInput = player.components.input;

    if (playerTransform && playerInput) {
      const startPos = { x: playerTransform.x, y: playerTransform.y };
      let currentPos = { ...startPos };

      // Simulate 60 frames of gameplay
      for (let frame = 0; frame < 60; frame++) {
        const time = frame / 60;

        // Simulate moving right
        if (frame < 30) {
          currentPos.x += (playerInput.moveSpeed || 200) / 60;
          this.actions.push({
            time,
            action: 'move_right',
            result: 'moving',
            position: { ...currentPos },
          });
        }

        // Check if reached goal
        if (goal) {
          const goalT = goal.components.transform;
          if (goalT) {
            const dist = Math.sqrt(
              Math.pow(currentPos.x - goalT.x, 2) + Math.pow(currentPos.y - goalT.y, 2)
            );
            if (dist < 50) {
              reachedGoal = true;
              this.actions.push({
                time,
                action: 'reach_goal',
                result: 'success',
                position: { ...currentPos },
              });
              break;
            }
          }
        }

        // Check if stuck (position didn't change significantly)
        if (frame > 10 && Math.abs(currentPos.x - startPos.x) < 10) {
          stuckCount++;
        }
      }
    }

    // Check for jump capability
    if (playerInput?.canJump) {
      this.actions.push({
        time: 0.5,
        action: 'jump',
        result: playerInput.jumpForce ? 'success' : 'no_force',
      });
    }

    return {
      success: true,
      reachedGoal,
      died: false,
      stuckCount,
    };
  }

  /**
   * Calculate playability metrics
   */
  private calculatePlayability(
    structure: StructureAnalysis,
    simulation: SimulationResult
  ): PlayabilityMetrics {
    const player = this.spec?.entities?.find(
      (e) => e.components.input || e.tags?.includes('player')
    );
    const playerInput = player?.components.input;

    return {
      canComplete: simulation.reachedGoal || !structure.hasGoal,
      playerCanMove: !!playerInput?.moveSpeed && playerInput.moveSpeed > 0,
      playerCanJump: !!playerInput?.canJump && !!playerInput?.jumpForce,
      hasCollisions: this.spec?.entities?.some((e) => e.components.collider) || false,
      hasGoal: structure.hasGoal,
      difficultyEstimate: this.estimateDifficulty(structure),
      estimatedPlaytime: this.estimatePlaytime(structure),
    };
  }

  /**
   * Estimate game difficulty
   */
  private estimateDifficulty(structure: StructureAnalysis): 'easy' | 'medium' | 'hard' | 'impossible' {
    if (!structure.hasPlayer) return 'impossible';

    const enemyCount = this.spec?.entities?.filter((e) => e.tags?.includes('enemy')).length || 0;
    const platformCount = this.spec?.entities?.filter(
      (e) => e.tags?.includes('platform') || e.tags?.includes('ground')
    ).length || 0;

    if (enemyCount === 0 && platformCount > 3) return 'easy';
    if (enemyCount <= 2) return 'medium';
    if (enemyCount <= 5) return 'hard';
    return 'hard';
  }

  /**
   * Estimate playtime in seconds
   */
  private estimatePlaytime(structure: StructureAnalysis): number {
    const bounds = this.spec?.config?.worldBounds || { width: 800, height: 600 };
    const baseTime = (bounds.width / 200) * 5; // Roughly 5 seconds per screen width
    const enemyMultiplier = 1 + (structure.hasEnemies ? 0.5 : 0);
    const collectibleMultiplier = 1 + (structure.hasCollectibles ? 0.3 : 0);

    return Math.round(baseTime * enemyMultiplier * collectibleMultiplier);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(playability: PlayabilityMetrics): string[] {
    const suggestions: string[] = [];

    if (!playability.playerCanMove) {
      suggestions.push('Add moveSpeed to the player Input component to enable movement');
    }

    if (!playability.playerCanJump) {
      suggestions.push('Enable canJump and set jumpForce for the player to jump');
    }

    if (!playability.hasGoal) {
      suggestions.push('Add a goal or finish entity to give players an objective');
    }

    if (!playability.hasCollisions) {
      suggestions.push('Add Collider components to enable physics interactions');
    }

    if (playability.difficultyEstimate === 'easy') {
      suggestions.push('Consider adding enemies or obstacles to increase challenge');
    }

    if (playability.estimatedPlaytime < 10) {
      suggestions.push('The game might be too short - consider expanding the level');
    }

    // Game design tips
    if ((this.spec?.entities?.length || 0) < 5) {
      suggestions.push('Add more entities to make the game more interesting');
    }

    return suggestions;
  }

  /**
   * Calculate overall quality score
   */
  private calculateScore(playability: PlayabilityMetrics, issues: PlaytestIssue[]): number {
    let score = 100;

    // Deduct for critical issues
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    score -= criticalCount * 25;
    score -= warningCount * 10;

    // Deduct for missing features
    if (!playability.playerCanMove) score -= 20;
    if (!playability.playerCanJump) score -= 10;
    if (!playability.hasGoal) score -= 10;
    if (!playability.hasCollisions) score -= 10;

    // Bonus for good game design
    if (playability.canComplete && playability.hasGoal) score += 10;
    if (playability.difficultyEstimate === 'medium') score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    score: number,
    playability: PlayabilityMetrics,
    issues: PlaytestIssue[]
  ): string {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    let summary = '';

    if (score >= 90) {
      summary = 'Excellent! The game is well-designed and playable.';
    } else if (score >= 70) {
      summary = 'Good! The game is playable with some minor issues.';
    } else if (score >= 50) {
      summary = 'Needs work. There are several issues affecting gameplay.';
    } else {
      summary = 'Critical issues found. The game may not be playable.';
    }

    if (criticalCount > 0) {
      summary += ` Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}.`;
    }

    if (warningCount > 0) {
      summary += ` Found ${warningCount} warning${warningCount > 1 ? 's' : ''}.`;
    }

    summary += ` Estimated playtime: ${playability.estimatedPlaytime}s.`;
    summary += ` Difficulty: ${playability.difficultyEstimate}.`;

    return summary;
  }
}

/**
 * Structure Analysis Result
 */
interface StructureAnalysis {
  hasPlayer: boolean;
  hasPlatforms: boolean;
  hasEnemies: boolean;
  hasCollectibles: boolean;
  hasGoal: boolean;
  entityCount: number;
}

/**
 * Simulation Result
 */
interface SimulationResult {
  success: boolean;
  reachedGoal: boolean;
  died: boolean;
  stuckCount: number;
}

// Singleton instance
export const aiPlaytestService = new AIPlaytestService();
