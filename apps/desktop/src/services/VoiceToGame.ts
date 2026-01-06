import type { EntitySpec } from '@promptplay/shared-types';
import { aiLevelDesigner } from './AILevelDesigner';
import { proceduralGenerator } from './ProceduralContentGenerator';

/**
 * Voice-to-Game Service
 * Converts voice commands into game modifications using speech recognition and AI
 */

export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: number;
  intent?: CommandIntent;
  parameters?: Record<string, unknown>;
}

export interface CommandIntent {
  action: VoiceAction;
  target?: string;
  value?: unknown;
  context?: string;
}

export type VoiceAction =
  | 'create_entity'
  | 'delete_entity'
  | 'modify_entity'
  | 'move_entity'
  | 'resize_entity'
  | 'change_color'
  | 'add_component'
  | 'remove_component'
  | 'generate_level'
  | 'generate_terrain'
  | 'add_enemies'
  | 'add_collectibles'
  | 'change_physics'
  | 'set_property'
  | 'undo'
  | 'redo'
  | 'save'
  | 'play'
  | 'stop'
  | 'unknown';

export interface VoiceSessionState {
  isListening: boolean;
  isProcessing: boolean;
  lastCommand?: VoiceCommand;
  commandHistory: VoiceCommand[];
  errorCount: number;
}

export interface GameModification {
  type: 'add' | 'update' | 'delete';
  entityName?: string;
  entity?: EntitySpec;
  changes?: Partial<EntitySpec>;
  property?: string;
  value?: unknown;
}

// Use any for SpeechRecognition to avoid conflicts with other declarations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// Voice command patterns
const COMMAND_PATTERNS: {
  pattern: RegExp;
  action: VoiceAction;
  extractor: (match: RegExpMatchArray) => Record<string, unknown>;
}[] = [
  // Entity creation
  {
    pattern: /^(?:create|add|make|spawn)\s+(?:a\s+)?(\w+)(?:\s+(?:at|in|on)\s+(.+))?$/i,
    action: 'create_entity',
    extractor: (match) => ({
      entityType: match[1],
      location: match[2],
    }),
  },
  // Entity deletion
  {
    pattern: /^(?:delete|remove|destroy)\s+(?:the\s+)?(\w+)$/i,
    action: 'delete_entity',
    extractor: (match) => ({
      target: match[1],
    }),
  },
  // Moving entities
  {
    pattern: /^(?:move|put|place)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(?:(?:the\s+)?(\w+)|(?:(\d+)\s*,?\s*(\d+)))$/i,
    action: 'move_entity',
    extractor: (match) => ({
      target: match[1],
      destination: match[2],
      x: match[3] ? parseInt(match[3]) : undefined,
      y: match[4] ? parseInt(match[4]) : undefined,
    }),
  },
  // Resizing
  {
    pattern: /^(?:make|resize|set)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(\w+)(?:\s+size)?$/i,
    action: 'resize_entity',
    extractor: (match) => ({
      target: match[1],
      size: match[2],
    }),
  },
  // Color changes
  {
    pattern: /^(?:change|set|make)\s+(?:the\s+)?(\w+)(?:'s)?\s+color\s+(?:to\s+)?(\w+)$/i,
    action: 'change_color',
    extractor: (match) => ({
      target: match[1],
      color: match[2],
    }),
  },
  // Adding components
  {
    pattern: /^(?:add|give)\s+(?:a\s+)?(\w+)\s+(?:component\s+)?(?:to\s+)?(?:the\s+)?(\w+)$/i,
    action: 'add_component',
    extractor: (match) => ({
      component: match[1],
      target: match[2],
    }),
  },
  // Level generation
  {
    pattern: /^(?:generate|create|make)\s+(?:a\s+)?(?:new\s+)?(\w+)?\s*level$/i,
    action: 'generate_level',
    extractor: (match) => ({
      style: match[1] || 'default',
    }),
  },
  // Terrain generation
  {
    pattern: /^(?:generate|create|add)\s+(\w+)\s+terrain$/i,
    action: 'generate_terrain',
    extractor: (match) => ({
      biome: match[1],
    }),
  },
  // Adding enemies
  {
    pattern: /^(?:add|spawn)\s+(\d+)?\s*enemies?(?:\s+(?:here|everywhere))?$/i,
    action: 'add_enemies',
    extractor: (match) => ({
      count: match[1] ? parseInt(match[1]) : 5,
    }),
  },
  // Adding collectibles
  {
    pattern: /^(?:add|spawn)\s+(\d+)?\s*(?:coins?|collectibles?)$/i,
    action: 'add_collectibles',
    extractor: (match) => ({
      count: match[1] ? parseInt(match[1]) : 10,
    }),
  },
  // Physics changes
  {
    pattern: /^(?:make|set)\s+(?:the\s+)?(\w+)\s+(static|dynamic|kinematic)$/i,
    action: 'change_physics',
    extractor: (match) => ({
      target: match[1],
      physicsType: match[2],
    }),
  },
  // Property setting
  {
    pattern: /^(?:set|change)\s+(?:the\s+)?(\w+)(?:'s)?\s+(\w+)\s+(?:to\s+)?(.+)$/i,
    action: 'set_property',
    extractor: (match) => ({
      target: match[1],
      property: match[2],
      value: match[3],
    }),
  },
  // Undo/Redo
  {
    pattern: /^undo$/i,
    action: 'undo',
    extractor: () => ({}),
  },
  {
    pattern: /^redo$/i,
    action: 'redo',
    extractor: () => ({}),
  },
  // Save
  {
    pattern: /^save(?:\s+(?:the\s+)?(?:game|project))?$/i,
    action: 'save',
    extractor: () => ({}),
  },
  // Play/Stop
  {
    pattern: /^(?:play|start|run)(?:\s+(?:the\s+)?game)?$/i,
    action: 'play',
    extractor: () => ({}),
  },
  {
    pattern: /^(?:stop|pause|end)(?:\s+(?:the\s+)?game)?$/i,
    action: 'stop',
    extractor: () => ({}),
  },
];

// Size name to value mapping
const SIZE_MAP: Record<string, { width: number; height: number }> = {
  tiny: { width: 16, height: 16 },
  small: { width: 32, height: 32 },
  medium: { width: 64, height: 64 },
  large: { width: 128, height: 128 },
  huge: { width: 256, height: 256 },
  giant: { width: 512, height: 512 },
};

class VoiceToGameService {
  private recognition: SpeechRecognitionInstance = null;
  private state: VoiceSessionState = {
    isListening: false,
    isProcessing: false,
    commandHistory: [],
    errorCount: 0,
  };
  private listeners: Set<(state: VoiceSessionState) => void> = new Set();
  private commandListeners: Set<(command: VoiceCommand, modifications: GameModification[]) => void> = new Set();

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;

        this.processVoiceInput(transcript, confidence);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.state.errorCount++;
      this.notifyListeners();
    };

    this.recognition.onend = () => {
      if (this.state.isListening) {
        // Restart if we should still be listening
        this.recognition?.start();
      }
    };
  }

  /**
   * Check if voice input is supported
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Start listening for voice commands
   */
  startListening(): void {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return;
    }

    this.state.isListening = true;
    this.state.errorCount = 0;
    this.recognition.start();
    this.notifyListeners();
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (!this.recognition) return;

    this.state.isListening = false;
    this.recognition.stop();
    this.notifyListeners();
  }

  /**
   * Toggle listening state
   */
  toggleListening(): void {
    if (this.state.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Get current state
   */
  getState(): VoiceSessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: VoiceSessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to processed commands
   */
  onCommand(listener: (command: VoiceCommand, modifications: GameModification[]) => void): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  /**
   * Process voice input
   */
  private async processVoiceInput(transcript: string, confidence: number): Promise<void> {
    this.state.isProcessing = true;
    this.notifyListeners();

    const command: VoiceCommand = {
      id: `cmd_${Date.now()}`,
      transcript,
      confidence,
      timestamp: Date.now(),
    };

    // Parse the command
    const intent = this.parseCommand(transcript);
    command.intent = intent;

    // Generate modifications based on intent
    const modifications = await this.generateModifications(intent);

    // Store in history
    this.state.commandHistory.push(command);
    this.state.lastCommand = command;
    this.state.isProcessing = false;

    // Notify listeners
    this.notifyListeners();
    this.notifyCommandListeners(command, modifications);
  }

  /**
   * Parse voice command to extract intent
   */
  private parseCommand(transcript: string): CommandIntent {
    const normalizedTranscript = transcript.toLowerCase().trim();

    for (const { pattern, action, extractor } of COMMAND_PATTERNS) {
      const match = normalizedTranscript.match(pattern);
      if (match) {
        const params = extractor(match);
        return {
          action,
          target: params.target as string | undefined,
          value: params,
          context: transcript,
        };
      }
    }

    // Try AI-based intent recognition for complex commands
    return this.parseWithAI(transcript);
  }

  /**
   * Use AI to parse complex commands
   */
  private parseWithAI(transcript: string): CommandIntent {
    // Fallback parsing for commands not matching patterns
    const words = transcript.toLowerCase().split(/\s+/);

    // Check for entity type mentions
    const entityTypes = ['player', 'enemy', 'platform', 'coin', 'wall', 'door', 'npc', 'boss'];
    const foundEntity = words.find(w => entityTypes.includes(w));

    // Check for action verbs
    const createVerbs = ['create', 'add', 'make', 'spawn', 'place'];
    const deleteVerbs = ['delete', 'remove', 'destroy', 'kill'];
    const modifyVerbs = ['change', 'modify', 'update', 'set', 'make'];

    if (words.some(w => createVerbs.includes(w)) && foundEntity) {
      return {
        action: 'create_entity',
        target: foundEntity,
        context: transcript,
      };
    }

    if (words.some(w => deleteVerbs.includes(w)) && foundEntity) {
      return {
        action: 'delete_entity',
        target: foundEntity,
        context: transcript,
      };
    }

    if (words.some(w => modifyVerbs.includes(w)) && foundEntity) {
      return {
        action: 'modify_entity',
        target: foundEntity,
        context: transcript,
      };
    }

    return {
      action: 'unknown',
      context: transcript,
    };
  }

  /**
   * Generate game modifications from command intent
   */
  private async generateModifications(intent: CommandIntent): Promise<GameModification[]> {
    const modifications: GameModification[] = [];

    switch (intent.action) {
      case 'create_entity':
        modifications.push(this.createEntityModification(intent));
        break;

      case 'delete_entity':
        modifications.push({
          type: 'delete',
          entityName: intent.target,
        });
        break;

      case 'move_entity':
        modifications.push(this.createMoveModification(intent));
        break;

      case 'resize_entity':
        modifications.push(this.createResizeModification(intent));
        break;

      case 'change_color':
        modifications.push(this.createColorModification(intent));
        break;

      case 'add_component':
        modifications.push(this.createComponentModification(intent));
        break;

      case 'generate_level':
        const levelModifications = await this.generateLevelModifications(intent);
        modifications.push(...levelModifications);
        break;

      case 'generate_terrain':
        const terrainModifications = await this.generateTerrainModifications(intent);
        modifications.push(...terrainModifications);
        break;

      case 'add_enemies':
        const enemyModifications = this.generateEnemyModifications(intent);
        modifications.push(...enemyModifications);
        break;

      case 'add_collectibles':
        const collectibleModifications = this.generateCollectibleModifications(intent);
        modifications.push(...collectibleModifications);
        break;

      case 'change_physics':
        modifications.push(this.createPhysicsModification(intent));
        break;

      case 'set_property':
        modifications.push(this.createPropertyModification(intent));
        break;
    }

    return modifications;
  }

  private createEntityModification(intent: CommandIntent): GameModification {
    const entityType = (intent.value as Record<string, unknown>)?.entityType as string || intent.target || 'entity';
    const location = (intent.value as Record<string, unknown>)?.location as string;

    // Parse location to coordinates
    let x = 400, y = 300;
    if (location) {
      const locationMap: Record<string, { x: number; y: number }> = {
        center: { x: 400, y: 300 },
        'top left': { x: 100, y: 100 },
        'top right': { x: 700, y: 100 },
        'bottom left': { x: 100, y: 500 },
        'bottom right': { x: 700, y: 500 },
        top: { x: 400, y: 100 },
        bottom: { x: 400, y: 500 },
        left: { x: 100, y: 300 },
        right: { x: 700, y: 300 },
      };
      const pos = locationMap[location.toLowerCase()];
      if (pos) {
        x = pos.x;
        y = pos.y;
      }
    }

    const entity = this.createEntityFromType(entityType, x, y);

    return {
      type: 'add',
      entityName: entity.name,
      entity,
    };
  }

  private createEntityFromType(type: string, x: number, y: number): EntitySpec {
    const templates: Record<string, Partial<EntitySpec>> = {
      player: {
        components: {
          sprite: { width: 32, height: 48, texture: 'player' },
          collider: { type: 'box', width: 32, height: 48 },
          velocity: { vx: 0, vy: 0 },
          input: { moveSpeed: 150, jumpForce: 280 },
        },
        tags: ['player'],
      },
      enemy: {
        components: {
          sprite: { width: 32, height: 32, texture: 'enemy' },
          collider: { type: 'box', width: 32, height: 32 },
          velocity: { vx: 0, vy: 0 },
          ai: { type: 'patrol', speed: 50 },
          health: { current: 3, max: 3 },
        },
        tags: ['enemy'],
      },
      platform: {
        components: {
          sprite: { width: 100, height: 20, texture: 'platform' },
          collider: { type: 'box', width: 100, height: 20, isStatic: true },
        },
        tags: ['platform', 'ground'],
      },
      coin: {
        components: {
          sprite: { width: 20, height: 20, texture: 'coin' },
          collider: { type: 'circle', radius: 10, isSensor: true },
        },
        tags: ['collectible', 'coin'],
      },
      wall: {
        components: {
          sprite: { width: 32, height: 100, texture: 'wall' },
          collider: { type: 'box', width: 32, height: 100, isStatic: true },
        },
        tags: ['wall', 'obstacle'],
      },
      door: {
        components: {
          sprite: { width: 40, height: 60, texture: 'door' },
          collider: { type: 'box', width: 40, height: 60, isSensor: true },
          trigger: { type: 'door' },
        },
        tags: ['door', 'interactive'],
      },
      npc: {
        components: {
          sprite: { width: 32, height: 48, texture: 'npc' },
          collider: { type: 'box', width: 32, height: 48, isStatic: true },
          npc: { personality: 'friendly', hasDialogue: true },
        },
        tags: ['npc', 'interactive'],
      },
      boss: {
        components: {
          sprite: { width: 64, height: 64, texture: 'boss' },
          collider: { type: 'box', width: 64, height: 64 },
          velocity: { vx: 0, vy: 0 },
          ai: { type: 'boss', speed: 30 },
          health: { current: 100, max: 100 },
        },
        tags: ['enemy', 'boss'],
      },
    };

    const template = templates[type.toLowerCase()] || templates.platform;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`;

    return {
      name,
      components: {
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        ...template.components,
      },
      tags: template.tags || [type],
    };
  }

  private createMoveModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const x = value.x as number;
    const y = value.y as number;

    return {
      type: 'update',
      entityName: intent.target,
      changes: {
        components: {
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        },
      },
    };
  }

  private createResizeModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const sizeName = (value.size as string || 'medium').toLowerCase();
    const size = SIZE_MAP[sizeName] || SIZE_MAP.medium;

    return {
      type: 'update',
      entityName: intent.target,
      changes: {
        components: {
          sprite: { width: size.width, height: size.height, texture: 'default' },
        },
      },
    };
  }

  private createColorModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const colorName = (value.color as string || 'white').toLowerCase();
    // Map color to texture name (in a real implementation, you'd have colored textures)
    const textureMap: Record<string, string> = {
      red: 'red_sprite',
      green: 'green_sprite',
      blue: 'blue_sprite',
      yellow: 'yellow_sprite',
      white: 'white_sprite',
      black: 'black_sprite',
    };
    const texture = textureMap[colorName] || colorName;

    return {
      type: 'update',
      entityName: intent.target,
      changes: {
        components: {
          sprite: { width: 32, height: 32, texture },
        },
      },
    };
  }

  private createComponentModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const component = value.component as string;

    const componentDefaults: Record<string, object> = {
      physics: { mass: 1, friction: 0.1, restitution: 0.5 },
      velocity: { vx: 0, vy: 0 },
      health: { current: 100, max: 100 },
      ai: { type: 'patrol', speed: 50 },
      input: { type: 'keyboard' },
      trigger: { type: 'sensor' },
    };

    return {
      type: 'update',
      entityName: intent.target,
      changes: {
        components: {
          [component]: componentDefaults[component.toLowerCase()] || {},
        },
      },
    };
  }

  private createPhysicsModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const physicsType = value.physicsType as string;

    return {
      type: 'update',
      entityName: intent.target,
      changes: {
        components: {
          collider: {
            type: 'box',
            width: 32,
            height: 32,
            isStatic: physicsType === 'static',
            isSensor: physicsType === 'kinematic', // kinematic treated as sensor
          },
        },
      },
    };
  }

  private createPropertyModification(intent: CommandIntent): GameModification {
    const value = intent.value as Record<string, unknown>;
    const property = value.property as string;
    const propValue = value.value;

    return {
      type: 'update',
      entityName: intent.target,
      property,
      value: propValue,
    };
  }

  private async generateLevelModifications(intent: CommandIntent): Promise<GameModification[]> {
    const value = intent.value as Record<string, unknown>;
    const style = (value.style as string || 'linear') as 'linear' | 'vertical' | 'maze' | 'open-world' | 'hub';

    // Create a minimal GameSpec for level generation
    const dummyGameSpec = {
      version: '3.0.0',
      metadata: { title: 'Generated', genre: 'platformer' as const, description: '' },
      entities: [] as EntitySpec[],
      systems: [],
      config: {
        gravity: { x: 0, y: 9.8 },
        worldBounds: { width: 1600, height: 600 },
      },
    };

    const level = await aiLevelDesigner.generateLevel(dummyGameSpec, {
      name: 'Voice Generated Level',
      difficulty: 'medium',
      style,
      theme: 'default',
      width: 1600,
      height: 600,
    });

    return level.entities.map(entity => ({
      type: 'add' as const,
      entityName: entity.name,
      entity,
    }));
  }

  private async generateTerrainModifications(intent: CommandIntent): Promise<GameModification[]> {
    const value = intent.value as Record<string, unknown>;
    const biome = (value.biome as string || 'forest') as 'forest' | 'desert' | 'snow' | 'volcanic' | 'ocean' | 'plains';

    const terrain = proceduralGenerator.generateTerrain({
      width: 50,
      height: 50,
      type: 'hills',
      biome,
      features: ['trees', 'rocks'],
    });

    return terrain.entities.map(entity => ({
      type: 'add' as const,
      entityName: entity.name,
      entity,
    }));
  }

  private generateEnemyModifications(intent: CommandIntent): GameModification[] {
    const value = intent.value as Record<string, unknown>;
    const count = (value.count as number) || 5;
    const modifications: GameModification[] = [];

    for (let i = 0; i < count; i++) {
      const x = 100 + Math.random() * 600;
      const y = 100 + Math.random() * 400;
      const entity = this.createEntityFromType('enemy', x, y);
      entity.name = `Enemy_Voice_${Date.now()}_${i}`;

      modifications.push({
        type: 'add',
        entityName: entity.name,
        entity,
      });
    }

    return modifications;
  }

  private generateCollectibleModifications(intent: CommandIntent): GameModification[] {
    const value = intent.value as Record<string, unknown>;
    const count = (value.count as number) || 10;
    const modifications: GameModification[] = [];

    for (let i = 0; i < count; i++) {
      const x = 50 + Math.random() * 700;
      const y = 50 + Math.random() * 500;
      const entity = this.createEntityFromType('coin', x, y);
      entity.name = `Coin_Voice_${Date.now()}_${i}`;

      modifications.push({
        type: 'add',
        entityName: entity.name,
        entity,
      });
    }

    return modifications;
  }

  /**
   * Process a text command (for testing or text input fallback)
   */
  async processTextCommand(text: string): Promise<{ command: VoiceCommand; modifications: GameModification[] }> {
    const command: VoiceCommand = {
      id: `cmd_${Date.now()}`,
      transcript: text,
      confidence: 1.0,
      timestamp: Date.now(),
    };

    const intent = this.parseCommand(text);
    command.intent = intent;

    const modifications = await this.generateModifications(intent);

    this.state.commandHistory.push(command);
    this.state.lastCommand = command;
    this.notifyListeners();

    return { command, modifications };
  }

  /**
   * Get command suggestions based on partial input
   */
  getSuggestions(partial: string): string[] {
    const suggestions = [
      'create a player at center',
      'add enemy',
      'spawn 5 coins',
      'delete player',
      'move player to top left',
      'make player large',
      'change player color to blue',
      'add physics to player',
      'generate linear level',
      'generate forest terrain',
      'add 10 enemies',
      'play',
      'save',
      'undo',
    ];

    const lower = partial.toLowerCase();
    return suggestions.filter(s => s.includes(lower));
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private notifyCommandListeners(command: VoiceCommand, modifications: GameModification[]): void {
    this.commandListeners.forEach(listener => listener(command, modifications));
  }
}

// Singleton instance
export const voiceToGame = new VoiceToGameService();
