import { hasComponent, addComponent } from 'bitecs';
import { ISystem, GameWorld, GameState, GAME_STATE } from '@promptplay/ecs-core';

export interface GameStateConfig {
  initialLives?: number;
  timeLimit?: number; // in seconds, 0 = no limit
  winCondition?: 'score' | 'collectAll' | 'survive' | 'custom';
  targetScore?: number;
}

export interface GameStateSnapshot {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  level: number;
  state: number;
  timeRemaining: number;
  timeElapsed: number;
  combo: number;
  multiplier: number;
}

export class GameStateSystem implements ISystem {
  private world: GameWorld | null = null;
  private gameManagerEid: number = -1;
  private config: GameStateConfig;
  private onScoreChange?: (score: number, delta: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onGameStateChange?: (state: number, prevState: number) => void;
  private collectibleCount: number = 0;
  private collectedCount: number = 0;

  constructor(config: GameStateConfig = {}) {
    this.config = {
      initialLives: config.initialLives ?? 3,
      timeLimit: config.timeLimit ?? 0,
      winCondition: config.winCondition ?? 'collectAll',
      targetScore: config.targetScore ?? 0,
    };
  }

  init(world: GameWorld): void {
    this.world = world;

    // Create a game manager entity
    const w = world.getWorld();
    this.gameManagerEid = world.createEntity('_gameManager');
    addComponent(w, GameState, this.gameManagerEid);

    // Initialize state
    GameState.score[this.gameManagerEid] = 0;
    GameState.highScore[this.gameManagerEid] = 0;
    GameState.lives[this.gameManagerEid] = this.config.initialLives!;
    GameState.maxLives[this.gameManagerEid] = this.config.initialLives!;
    GameState.level[this.gameManagerEid] = 1;
    GameState.state[this.gameManagerEid] = GAME_STATE.PLAYING;
    GameState.timeRemaining[this.gameManagerEid] = this.config.timeLimit! * 1000;
    GameState.timeElapsed[this.gameManagerEid] = 0;
    GameState.combo[this.gameManagerEid] = 0;
    GameState.multiplier[this.gameManagerEid] = 1;

    // Count collectibles for win condition
    this.countCollectibles();
  }

  private countCollectibles(): void {
    if (!this.world) return;

    const entities = this.world.getEntities();
    this.collectibleCount = 0;

    for (const eid of entities) {
      const tags = this.world.getTags(eid);
      if (tags.includes('collectible') || tags.includes('coin')) {
        this.collectibleCount++;
      }
    }
  }

  // Add points to score
  addScore(points: number): void {
    if (this.gameManagerEid < 0) return;

    const multiplier = GameState.multiplier[this.gameManagerEid];
    const actualPoints = Math.floor(points * multiplier);
    const oldScore = GameState.score[this.gameManagerEid];
    GameState.score[this.gameManagerEid] = oldScore + actualPoints;

    // Update high score
    if (GameState.score[this.gameManagerEid] > GameState.highScore[this.gameManagerEid]) {
      GameState.highScore[this.gameManagerEid] = GameState.score[this.gameManagerEid];
    }

    // Increment combo
    GameState.combo[this.gameManagerEid]++;

    this.onScoreChange?.(GameState.score[this.gameManagerEid], actualPoints);

    // Check win condition
    this.checkWinCondition();
  }

  // Record a collected item
  recordCollected(): void {
    this.collectedCount++;
    this.checkWinCondition();
  }

  // Lose a life
  loseLife(): void {
    if (this.gameManagerEid < 0) return;

    const currentLives = GameState.lives[this.gameManagerEid];
    if (currentLives > 0) {
      GameState.lives[this.gameManagerEid] = currentLives - 1;
      this.onLivesChange?.(GameState.lives[this.gameManagerEid]);

      // Reset combo on damage
      GameState.combo[this.gameManagerEid] = 0;
      GameState.multiplier[this.gameManagerEid] = 1;

      if (GameState.lives[this.gameManagerEid] <= 0) {
        this.setGameState(GAME_STATE.GAME_OVER);
      }
    }
  }

  // Add a life
  addLife(): void {
    if (this.gameManagerEid < 0) return;

    const currentLives = GameState.lives[this.gameManagerEid];
    const maxLives = GameState.maxLives[this.gameManagerEid];
    if (currentLives < maxLives) {
      GameState.lives[this.gameManagerEid] = currentLives + 1;
      this.onLivesChange?.(GameState.lives[this.gameManagerEid]);
    }
  }

  // Set game state
  setGameState(state: number): void {
    if (this.gameManagerEid < 0) return;

    const prevState = GameState.state[this.gameManagerEid];
    if (prevState !== state) {
      GameState.state[this.gameManagerEid] = state;
      this.onGameStateChange?.(state, prevState);
    }
  }

  // Check win condition
  private checkWinCondition(): void {
    if (this.gameManagerEid < 0) return;
    if (GameState.state[this.gameManagerEid] !== GAME_STATE.PLAYING) return;

    switch (this.config.winCondition) {
      case 'score':
        if (this.config.targetScore && GameState.score[this.gameManagerEid] >= this.config.targetScore) {
          this.setGameState(GAME_STATE.WON);
        }
        break;
      case 'collectAll':
        if (this.collectibleCount > 0 && this.collectedCount >= this.collectibleCount) {
          this.setGameState(GAME_STATE.WON);
        }
        break;
      case 'survive':
        // Win by surviving until time runs out (handled in update)
        break;
    }
  }

  // Get current state snapshot
  getState(): GameStateSnapshot | null {
    if (this.gameManagerEid < 0) return null;

    return {
      score: GameState.score[this.gameManagerEid],
      highScore: GameState.highScore[this.gameManagerEid],
      lives: GameState.lives[this.gameManagerEid],
      maxLives: GameState.maxLives[this.gameManagerEid],
      level: GameState.level[this.gameManagerEid],
      state: GameState.state[this.gameManagerEid],
      timeRemaining: GameState.timeRemaining[this.gameManagerEid],
      timeElapsed: GameState.timeElapsed[this.gameManagerEid],
      combo: GameState.combo[this.gameManagerEid],
      multiplier: GameState.multiplier[this.gameManagerEid],
    };
  }

  // Event handlers
  onScore(callback: (score: number, delta: number) => void): void {
    this.onScoreChange = callback;
  }

  onLives(callback: (lives: number) => void): void {
    this.onLivesChange = callback;
  }

  onStateChange(callback: (state: number, prevState: number) => void): void {
    this.onGameStateChange = callback;
  }

  update(_world: GameWorld, deltaTime: number): void {
    if (this.gameManagerEid < 0) return;

    const state = GameState.state[this.gameManagerEid];
    if (state !== GAME_STATE.PLAYING) return;

    // Update elapsed time
    GameState.timeElapsed[this.gameManagerEid] += deltaTime * 1000;

    // Update remaining time if there's a time limit
    if (this.config.timeLimit && this.config.timeLimit > 0) {
      const remaining = GameState.timeRemaining[this.gameManagerEid];
      GameState.timeRemaining[this.gameManagerEid] = Math.max(0, remaining - deltaTime * 1000);

      if (GameState.timeRemaining[this.gameManagerEid] <= 0) {
        if (this.config.winCondition === 'survive') {
          this.setGameState(GAME_STATE.WON);
        } else {
          this.setGameState(GAME_STATE.GAME_OVER);
        }
      }
    }

    // Decay combo over time (reset after 2 seconds of no collection)
    // This encourages fast collection
  }

  // Reset game state for restart
  reset(): void {
    if (this.gameManagerEid < 0) return;

    GameState.score[this.gameManagerEid] = 0;
    GameState.lives[this.gameManagerEid] = this.config.initialLives!;
    GameState.level[this.gameManagerEid] = 1;
    GameState.state[this.gameManagerEid] = GAME_STATE.PLAYING;
    GameState.timeRemaining[this.gameManagerEid] = this.config.timeLimit! * 1000;
    GameState.timeElapsed[this.gameManagerEid] = 0;
    GameState.combo[this.gameManagerEid] = 0;
    GameState.multiplier[this.gameManagerEid] = 1;
    this.collectedCount = 0;
    this.countCollectibles();
  }

  cleanup(): void {
    this.world = null;
    this.gameManagerEid = -1;
    this.onScoreChange = undefined;
    this.onLivesChange = undefined;
    this.onGameStateChange = undefined;
  }
}
