import type { EntitySpec } from '@promptplay/shared-types';
import { advancedAI } from './AdvancedAIService';

// Dialogue types
export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'confused';
  responses?: DialogueResponse[];
  nextNode?: string;
  condition?: DialogueCondition;
  actions?: DialogueAction[];
}

export interface DialogueResponse {
  id: string;
  text: string;
  nextNode: string;
  condition?: DialogueCondition;
  effects?: DialogueEffect[];
}

export interface DialogueCondition {
  type: 'variable' | 'item' | 'quest' | 'reputation' | 'custom';
  key: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

export interface DialogueAction {
  type: 'set_variable' | 'give_item' | 'take_item' | 'start_quest' | 'complete_quest' | 'change_reputation' | 'trigger_event';
  params: Record<string, unknown>;
}

export interface DialogueEffect {
  type: 'reputation' | 'quest' | 'item' | 'variable';
  change: number | string | boolean;
  target: string;
}

export interface DialogueTree {
  id: string;
  name: string;
  npcId: string;
  startNode: string;
  nodes: Map<string, DialogueNode>;
  variables: Map<string, unknown>;
}

export interface NPCPersonality {
  name: string;
  role: string;
  traits: string[];
  background: string;
  speechStyle: 'formal' | 'casual' | 'mysterious' | 'aggressive' | 'friendly' | 'scholarly';
  topics: string[];
  secrets?: string[];
}

export interface ConversationState {
  dialogueTreeId: string;
  currentNodeId: string;
  variables: Map<string, unknown>;
  history: string[];
  relationshipLevel: number;
}

/**
 * NPC Dialogue System Service
 * Creates dynamic, branching conversations with NPCs
 */
class NPCDialogueSystemService {
  private dialogueTrees: Map<string, DialogueTree> = new Map();
  private npcPersonalities: Map<string, NPCPersonality> = new Map();
  private conversationStates: Map<string, ConversationState> = new Map();
  private globalVariables: Map<string, unknown> = new Map();

  /**
   * Create a new NPC with personality
   */
  createNPC(npcId: string, personality: NPCPersonality): void {
    this.npcPersonalities.set(npcId, personality);
  }

  /**
   * Generate dialogue tree for an NPC
   */
  async generateDialogueTree(
    npcId: string,
    context: {
      questContext?: string;
      playerLevel?: number;
      previousInteractions?: number;
    } = {}
  ): Promise<DialogueTree> {
    const personality = this.npcPersonalities.get(npcId);
    if (!personality) {
      throw new Error(`NPC ${npcId} not found`);
    }

    const treeId = `dialogue_${npcId}_${Date.now()}`;
    const nodes = new Map<string, DialogueNode>();

    // Generate greeting based on personality and context
    const greetingNode = this.generateGreeting(personality, context);
    nodes.set('greeting', greetingNode);

    // Generate topic nodes
    for (const topic of personality.topics) {
      const topicNodes = this.generateTopicNodes(personality, topic, context);
      topicNodes.forEach((node, id) => nodes.set(id, node));
    }

    // Generate farewell
    const farewellNode = this.generateFarewell(personality);
    nodes.set('farewell', farewellNode);

    const tree: DialogueTree = {
      id: treeId,
      name: `${personality.name}'s Dialogue`,
      npcId,
      startNode: 'greeting',
      nodes,
      variables: new Map(),
    };

    this.dialogueTrees.set(treeId, tree);
    return tree;
  }

  /**
   * Generate dialogue using AI
   */
  async generateDialogueWithAI(
    npcId: string,
    playerMessage: string,
    conversationHistory: string[] = []
  ): Promise<{ response: string; emotion: DialogueNode['emotion']; actions?: DialogueAction[] }> {
    const personality = this.npcPersonalities.get(npcId);
    if (!personality) {
      return { response: "...", emotion: 'neutral' };
    }

    // Try AI generation if available
    if (advancedAI.isAvailable()) {
      try {
        const prompt = this.buildAIPrompt(personality, playerMessage, conversationHistory);
        // Use the AI service for dialogue generation
        const response = await this.generateAIResponse(prompt, personality);
        return response;
      } catch (err) {
        console.error('AI dialogue generation failed:', err);
      }
    }

    // Fallback to template-based response
    return this.generateTemplateResponse(personality, playerMessage);
  }

  private buildAIPrompt(
    personality: NPCPersonality,
    playerMessage: string,
    history: string[]
  ): string {
    return `You are ${personality.name}, a ${personality.role}.
Traits: ${personality.traits.join(', ')}
Background: ${personality.background}
Speech style: ${personality.speechStyle}

Previous conversation:
${history.slice(-5).join('\n')}

Player says: "${playerMessage}"

Respond in character. Keep response under 100 words.`;
  }

  private async generateAIResponse(
    _prompt: string,
    personality: NPCPersonality
  ): Promise<{ response: string; emotion: DialogueNode['emotion']; actions?: DialogueAction[] }> {
    // Simulated AI response - in production would call actual AI service
    const responses = this.getPersonalityResponses(personality);
    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      response,
      emotion: this.inferEmotion(response),
    };
  }

  private generateTemplateResponse(
    personality: NPCPersonality,
    playerMessage: string
  ): { response: string; emotion: DialogueNode['emotion'] } {
    const lowerMessage = playerMessage.toLowerCase();

    // Check for keyword matches
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        response: this.getGreetingResponse(personality),
        emotion: 'happy',
      };
    }

    if (lowerMessage.includes('quest') || lowerMessage.includes('help')) {
      return {
        response: this.getQuestResponse(personality),
        emotion: 'neutral',
      };
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return {
        response: this.getFarewellResponse(personality),
        emotion: 'neutral',
      };
    }

    // Default response based on personality
    const responses = this.getPersonalityResponses(personality);
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      emotion: 'neutral',
    };
  }

  private getPersonalityResponses(personality: NPCPersonality): string[] {
    const styleResponses: Record<string, string[]> = {
      formal: [
        "I appreciate your inquiry. Allow me to elaborate.",
        "Indeed, that is a matter of some importance.",
        "Your question merits careful consideration.",
      ],
      casual: [
        "Yeah, sure thing! Let me tell you about that.",
        "Oh, that? It's actually pretty interesting!",
        "Haha, glad you asked!",
      ],
      mysterious: [
        "Some things are better left unsaid... but perhaps...",
        "The shadows hold many secrets...",
        "You seek answers that few dare to ask...",
      ],
      aggressive: [
        "What do you want? Make it quick!",
        "Hmph. I suppose I can spare a moment.",
        "You've got some nerve asking me that.",
      ],
      friendly: [
        "Oh, I'm so glad you asked! Let me help you.",
        "Of course! That's what friends are for!",
        "Wonderful! I love talking about this!",
      ],
      scholarly: [
        "Ah, a fascinating topic! According to my research...",
        "The historical records indicate...",
        "From an academic perspective...",
      ],
    };

    return styleResponses[personality.speechStyle] || styleResponses.casual;
  }

  private getGreetingResponse(personality: NPCPersonality): string {
    const greetings: Record<string, string> = {
      formal: `Good day. I am ${personality.name}, ${personality.role}. How may I assist you?`,
      casual: `Hey there! I'm ${personality.name}. What's up?`,
      mysterious: `You've found me... I am ${personality.name}. What do you seek?`,
      aggressive: `What? Oh, you're talking to me? I'm ${personality.name}. What do you want?`,
      friendly: `Hi there! Great to meet you! I'm ${personality.name}!`,
      scholarly: `Greetings, traveler. I am ${personality.name}, ${personality.role}. Do you seek knowledge?`,
    };

    return greetings[personality.speechStyle] || greetings.casual;
  }

  private getQuestResponse(personality: NPCPersonality): string {
    const questResponses: Record<string, string> = {
      formal: "I may have a task that requires your particular skills. Are you interested?",
      casual: "Oh! Actually, there is something you could help me with!",
      mysterious: "There is a task... dangerous, yes... but the rewards are great...",
      aggressive: "Fine! Since you're offering, there IS something I need done.",
      friendly: "You want to help? That's so kind! There is something...",
      scholarly: "Interesting that you should offer. I do have a research matter...",
    };

    return questResponses[personality.speechStyle] || questResponses.casual;
  }

  private getFarewellResponse(personality: NPCPersonality): string {
    const farewells: Record<string, string> = {
      formal: "Farewell. May your journey be prosperous.",
      casual: "See ya! Take care out there!",
      mysterious: "Until we meet again... in the shadows...",
      aggressive: "Finally. Don't let the door hit you on the way out.",
      friendly: "Bye bye! Come back and visit anytime!",
      scholarly: "Safe travels. May knowledge guide your path.",
    };

    return farewells[personality.speechStyle] || farewells.casual;
  }

  private inferEmotion(text: string): DialogueNode['emotion'] {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('!') && (lowerText.includes('great') || lowerText.includes('wonderful'))) {
      return 'happy';
    }
    if (lowerText.includes('unfortunately') || lowerText.includes('sad')) {
      return 'sad';
    }
    if (lowerText.includes('!') && (lowerText.includes('what') || lowerText.includes('how dare'))) {
      return 'angry';
    }
    if (lowerText.includes('?!') || lowerText.includes('impossible')) {
      return 'surprised';
    }
    if (lowerText.includes('hmm') || lowerText.includes('strange')) {
      return 'confused';
    }

    return 'neutral';
  }

  private generateGreeting(
    personality: NPCPersonality,
    context: { previousInteractions?: number }
  ): DialogueNode {
    const isReturning = (context.previousInteractions || 0) > 0;

    const greetings: Record<string, { first: string; returning: string }> = {
      formal: {
        first: `Greetings, traveler. I am ${personality.name}, ${personality.role}. How may I be of service?`,
        returning: `Ah, we meet again. I trust you have fared well since our last encounter?`,
      },
      casual: {
        first: `Hey! Name's ${personality.name}. Haven't seen you around before!`,
        returning: `Oh hey, you're back! Good to see ya again!`,
      },
      mysterious: {
        first: `So... another soul wanders into my domain. I am called ${personality.name}...`,
        returning: `The fates bring you back to me... I wondered if they would...`,
      },
      aggressive: {
        first: `What? Who are you? I'm ${personality.name}, and I don't have time for this.`,
        returning: `You again? What do you want this time?`,
      },
      friendly: {
        first: `Oh, hello there! Welcome, welcome! I'm ${personality.name}! So nice to meet you!`,
        returning: `Yay, you came back! I was hoping I'd see you again!`,
      },
      scholarly: {
        first: `Ah, a new face. I am ${personality.name}, ${personality.role}. Do you seek knowledge?`,
        returning: `Welcome back. Have you given thought to our previous discussion?`,
      },
    };

    const styleGreetings = greetings[personality.speechStyle] || greetings.casual;
    const text = isReturning ? styleGreetings.returning : styleGreetings.first;

    return {
      id: 'greeting',
      speaker: personality.name,
      text,
      emotion: personality.speechStyle === 'friendly' ? 'happy' : 'neutral',
      responses: [
        ...personality.topics.map((topic, i) => ({
          id: `topic_${i}`,
          text: `Tell me about ${topic}`,
          nextNode: `topic_${topic.replace(/\s+/g, '_').toLowerCase()}`,
        })),
        {
          id: 'farewell',
          text: 'Goodbye.',
          nextNode: 'farewell',
        },
      ],
    };
  }

  private generateTopicNodes(
    personality: NPCPersonality,
    topic: string,
    _context: object
  ): Map<string, DialogueNode> {
    const nodes = new Map<string, DialogueNode>();
    const topicId = `topic_${topic.replace(/\s+/g, '_').toLowerCase()}`;

    const topicResponses: Record<string, (t: string) => string> = {
      formal: (t) => `Regarding ${t}, I shall explain. It is a matter of considerable importance in these lands.`,
      casual: (t) => `Oh, ${t}? Yeah, it's pretty cool actually! Let me tell you about it.`,
      mysterious: (t) => `${t}... a topic shrouded in darkness and intrigue. Few dare to ask...`,
      aggressive: (t) => `${t}? Hmph. Fine, I'll tell you, but pay attention because I'm only saying this once.`,
      friendly: (t) => `Ooh, ${t}! That's one of my favorite things to talk about! So basically...`,
      scholarly: (t) => `Ah, ${t}. A subject I've studied extensively. The historical context is fascinating...`,
    };

    const getResponse = topicResponses[personality.speechStyle] || topicResponses.casual;

    nodes.set(topicId, {
      id: topicId,
      speaker: personality.name,
      text: getResponse(topic),
      emotion: 'neutral',
      responses: [
        {
          id: 'more',
          text: 'Tell me more.',
          nextNode: `${topicId}_detail`,
        },
        {
          id: 'back',
          text: 'Let\'s talk about something else.',
          nextNode: 'greeting',
        },
        {
          id: 'bye',
          text: 'I should go.',
          nextNode: 'farewell',
        },
      ],
    });

    // Detail node
    nodes.set(`${topicId}_detail`, {
      id: `${topicId}_detail`,
      speaker: personality.name,
      text: this.generateDetailText(personality, topic),
      emotion: 'neutral',
      responses: [
        {
          id: 'back',
          text: 'Interesting. What else can you tell me?',
          nextNode: 'greeting',
        },
        {
          id: 'bye',
          text: 'Thanks for the information.',
          nextNode: 'farewell',
        },
      ],
    });

    return nodes;
  }

  private generateDetailText(personality: NPCPersonality, topic: string): string {
    const details: Record<string, (t: string) => string> = {
      formal: (t) => `The deeper aspects of ${t} are not commonly known. Allow me to enlighten you with the finer details.`,
      casual: (t) => `So the really cool thing about ${t} is... well, there's actually a lot more to it than people think!`,
      mysterious: (t) => `The true nature of ${t}... few have glimpsed it. But I sense you are ready to know more...`,
      aggressive: (t) => `Look, if you really want to know about ${t}, here's what most people are too stupid to understand.`,
      friendly: (t) => `Oh, I love this part! So ${t} has all these amazing details that most people don't know about!`,
      scholarly: (t) => `The academic literature on ${t} is extensive. The key findings suggest...`,
    };

    const getDetail = details[personality.speechStyle] || details.casual;
    return getDetail(topic);
  }

  private generateFarewell(personality: NPCPersonality): DialogueNode {
    const farewells: Record<string, string> = {
      formal: "Farewell, traveler. May fortune favor your endeavors.",
      casual: "See ya later! Take care out there!",
      mysterious: "Until fate brings us together again... the shadows will be watching...",
      aggressive: "Finally! Now get out of here before I change my mind.",
      friendly: "Bye-bye! It was so wonderful talking to you! Come back soon!",
      scholarly: "Safe travels. May knowledge light your path through the darkness.",
    };

    return {
      id: 'farewell',
      speaker: personality.name,
      text: farewells[personality.speechStyle] || farewells.casual,
      emotion: personality.speechStyle === 'friendly' ? 'happy' : 'neutral',
    };
  }

  /**
   * Start a conversation with an NPC
   */
  startConversation(npcId: string, dialogueTreeId: string): ConversationState {
    const tree = this.dialogueTrees.get(dialogueTreeId);
    if (!tree) {
      throw new Error(`Dialogue tree ${dialogueTreeId} not found`);
    }

    const state: ConversationState = {
      dialogueTreeId,
      currentNodeId: tree.startNode,
      variables: new Map(tree.variables),
      history: [],
      relationshipLevel: 0,
    };

    this.conversationStates.set(`${npcId}_${dialogueTreeId}`, state);
    return state;
  }

  /**
   * Get current dialogue node
   */
  getCurrentNode(npcId: string, dialogueTreeId: string): DialogueNode | null {
    const state = this.conversationStates.get(`${npcId}_${dialogueTreeId}`);
    if (!state) return null;

    const tree = this.dialogueTrees.get(dialogueTreeId);
    if (!tree) return null;

    return tree.nodes.get(state.currentNodeId) || null;
  }

  /**
   * Select a response and advance dialogue
   */
  selectResponse(
    npcId: string,
    dialogueTreeId: string,
    responseId: string
  ): DialogueNode | null {
    const state = this.conversationStates.get(`${npcId}_${dialogueTreeId}`);
    if (!state) return null;

    const tree = this.dialogueTrees.get(dialogueTreeId);
    if (!tree) return null;

    const currentNode = tree.nodes.get(state.currentNodeId);
    if (!currentNode || !currentNode.responses) return null;

    const response = currentNode.responses.find(r => r.id === responseId);
    if (!response) return null;

    // Apply effects
    if (response.effects) {
      this.applyEffects(response.effects, state);
    }

    // Record in history
    state.history.push(`[${currentNode.speaker}]: ${currentNode.text}`);
    state.history.push(`[Player]: ${response.text}`);

    // Move to next node
    state.currentNodeId = response.nextNode;

    return tree.nodes.get(response.nextNode) || null;
  }

  private applyEffects(effects: DialogueEffect[], state: ConversationState): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'reputation':
          state.relationshipLevel += effect.change as number;
          break;
        case 'variable':
          state.variables.set(effect.target, effect.change);
          break;
        case 'quest':
          this.globalVariables.set(`quest_${effect.target}`, effect.change);
          break;
        case 'item':
          // Emit item event
          break;
      }
    }
  }

  /**
   * Check if a condition is met
   */
  checkCondition(condition: DialogueCondition, state: ConversationState): boolean {
    let value: unknown;

    switch (condition.type) {
      case 'variable':
        value = state.variables.get(condition.key);
        break;
      case 'quest':
        value = this.globalVariables.get(`quest_${condition.key}`);
        break;
      case 'reputation':
        value = state.relationshipLevel;
        break;
      default:
        value = this.globalVariables.get(condition.key);
    }

    switch (condition.operator) {
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      case '>': return (value as number) > (condition.value as number);
      case '<': return (value as number) < (condition.value as number);
      case '>=': return (value as number) >= (condition.value as number);
      case '<=': return (value as number) <= (condition.value as number);
      default: return false;
    }
  }

  /**
   * Generate NPC entities with dialogue components
   */
  generateNPCEntity(personality: NPCPersonality): EntitySpec {
    return {
      name: personality.name,
      components: {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        sprite: { width: 32, height: 48, texture: 'npc' },
        collider: { type: 'box', width: 32, height: 48, isStatic: true },
        npc: {
          personality: personality.name,
          role: personality.role,
          interactionRange: 50,
          hasDialogue: true,
        },
      },
      tags: ['npc', 'interactive', personality.role.toLowerCase()],
    };
  }

  /**
   * Get all NPCs
   */
  getAllNPCs(): NPCPersonality[] {
    return Array.from(this.npcPersonalities.values());
  }

  /**
   * Create preset NPCs
   */
  createPresetNPCs(): void {
    this.createNPC('merchant', {
      name: 'Marcus the Merchant',
      role: 'Shopkeeper',
      traits: ['greedy', 'knowledgeable', 'pragmatic'],
      background: 'A seasoned trader who has traveled many lands',
      speechStyle: 'casual',
      topics: ['wares', 'prices', 'rumors', 'travel'],
    });

    this.createNPC('sage', {
      name: 'Elder Thorne',
      role: 'Village Elder',
      traits: ['wise', 'patient', 'secretive'],
      background: 'The oldest and wisest member of the village',
      speechStyle: 'scholarly',
      topics: ['history', 'magic', 'prophecy', 'village'],
      secrets: ['Knows the location of the ancient artifact'],
    });

    this.createNPC('guard', {
      name: 'Captain Vex',
      role: 'Guard Captain',
      traits: ['dutiful', 'suspicious', 'honorable'],
      background: 'A veteran soldier who protects the town',
      speechStyle: 'formal',
      topics: ['safety', 'threats', 'laws', 'bounties'],
    });

    this.createNPC('mysterious', {
      name: 'The Stranger',
      role: 'Unknown',
      traits: ['enigmatic', 'knowing', 'otherworldly'],
      background: 'No one knows where they came from',
      speechStyle: 'mysterious',
      topics: ['fate', 'darkness', 'power', 'truth'],
      secrets: ['Is actually a deity in disguise'],
    });
  }
}

// Singleton instance
export const npcDialogueSystem = new NPCDialogueSystemService();
