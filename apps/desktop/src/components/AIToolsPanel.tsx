import { useState, useCallback, useEffect } from 'react';
import type { GameSpec, EntitySpec } from '@promptplay/shared-types';
import { aiLevelDesigner, type LevelConfig, type GeneratedLevel } from '../services/AILevelDesigner';
import { npcDialogueSystem, type NPCPersonality } from '../services/NPCDialogueSystem';
import { proceduralGenerator, type TerrainConfig, type ItemConfig, type QuestConfig, type GeneratedItem, type GeneratedQuest } from '../services/ProceduralContentGenerator';
import { aiArtGenerator, type ArtStyle, type ImageSize } from '../services/AIArtGenerator';
import { voiceToGame, type VoiceSessionState } from '../services/VoiceToGame';

interface AIToolsPanelProps {
  gameSpec: GameSpec | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (entities: EntitySpec[]) => void;
  onNotification: (msg: string) => void;
}

type AIToolTab = 'level' | 'npc' | 'procedural' | 'art' | 'voice';

export function AIToolsPanel({ gameSpec, isOpen, onClose, onApplyChanges, onNotification }: AIToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<AIToolTab>('level');
  const [isGenerating, setIsGenerating] = useState(false);

  // Level Designer state
  const [levelConfig, setLevelConfig] = useState<LevelConfig>({
    name: 'Generated Level',
    difficulty: 'medium',
    style: 'linear',
    theme: 'default',
    width: 1600,
    height: 600,
  });
  const [generatedLevel, setGeneratedLevel] = useState<GeneratedLevel | null>(null);

  // NPC Dialogue state
  const [npcPersonality, setNpcPersonality] = useState<Partial<NPCPersonality>>({
    name: 'New NPC',
    role: 'Villager',
    speechStyle: 'casual',
    traits: [],
    topics: ['greetings', 'local news'],
    background: 'A friendly local resident.',
  });
  const [presetNPCs] = useState(() => {
    npcDialogueSystem.createPresetNPCs();
    return npcDialogueSystem.getAllNPCs();
  });

  // Procedural state
  const [terrainConfig, setTerrainConfig] = useState<TerrainConfig>({
    width: 50,
    height: 50,
    type: 'hills',
    biome: 'forest',
    features: ['trees', 'rocks'],
  });
  const [itemConfig, setItemConfig] = useState<ItemConfig>({
    rarity: 'common',
    type: 'weapon',
    level: 1,
  });
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [generatedQuests, setGeneratedQuests] = useState<GeneratedQuest[]>([]);

  // Art Generator state
  const [artPrompt, setArtPrompt] = useState('');
  const [artStyle, setArtStyle] = useState<ArtStyle>('pixel-art');
  const [artSize, setArtSize] = useState<ImageSize>('64x64');
  const [generatedArt, setGeneratedArt] = useState<string[]>([]);

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceSessionState>({
    isListening: false,
    isProcessing: false,
    commandHistory: [],
    errorCount: 0,
  });
  const [voiceTextInput, setVoiceTextInput] = useState('');

  // Subscribe to voice state changes
  useEffect(() => {
    const unsubscribe = voiceToGame.subscribe(setVoiceState);
    return unsubscribe;
  }, []);

  // Subscribe to voice commands
  useEffect(() => {
    const unsubscribe = voiceToGame.onCommand((_command, modifications) => {
      const newEntities = modifications
        .filter(m => m.type === 'add' && m.entity)
        .map(m => m.entity as EntitySpec);

      if (newEntities.length > 0) {
        onApplyChanges(newEntities);
        onNotification(`Voice: Added ${newEntities.length} entities`);
      }
    });
    return unsubscribe;
  }, [onApplyChanges, onNotification]);

  // Level generation
  const handleGenerateLevel = useCallback(async () => {
    if (!gameSpec) return;
    setIsGenerating(true);
    try {
      const level = await aiLevelDesigner.generateLevel(gameSpec, levelConfig);
      setGeneratedLevel(level);
      onNotification(`Generated level "${level.name}" with ${level.entities.length} entities`);
    } catch (err) {
      onNotification(`Error generating level: ${err}`);
    }
    setIsGenerating(false);
  }, [gameSpec, levelConfig, onNotification]);

  const handleApplyLevel = useCallback(() => {
    if (generatedLevel) {
      onApplyChanges(generatedLevel.entities);
      onNotification(`Applied ${generatedLevel.entities.length} entities from "${generatedLevel.name}"`);
      setGeneratedLevel(null);
    }
  }, [generatedLevel, onApplyChanges, onNotification]);

  // NPC creation
  const handleCreateNPC = useCallback(() => {
    if (!npcPersonality.name) return;

    const personality: NPCPersonality = {
      name: npcPersonality.name,
      role: npcPersonality.role || 'NPC',
      traits: npcPersonality.traits || [],
      background: npcPersonality.background || '',
      speechStyle: npcPersonality.speechStyle || 'casual',
      topics: npcPersonality.topics || [],
    };

    npcDialogueSystem.createNPC(personality.name.toLowerCase().replace(/\s+/g, '_'), personality);
    const entity = npcDialogueSystem.generateNPCEntity(personality);
    onApplyChanges([entity]);
    onNotification(`Created NPC: ${personality.name}`);
  }, [npcPersonality, onApplyChanges, onNotification]);

  const handleUsePresetNPC = useCallback((preset: NPCPersonality) => {
    const entity = npcDialogueSystem.generateNPCEntity(preset);
    onApplyChanges([entity]);
    onNotification(`Added preset NPC: ${preset.name}`);
  }, [onApplyChanges, onNotification]);

  // Procedural generation
  const handleGenerateTerrain = useCallback(async () => {
    setIsGenerating(true);
    try {
      const terrain = proceduralGenerator.generateTerrain(terrainConfig);
      onApplyChanges(terrain.entities);
      onNotification(`Generated terrain with ${terrain.entities.length} entities`);
    } catch (err) {
      onNotification(`Error generating terrain: ${err}`);
    }
    setIsGenerating(false);
  }, [terrainConfig, onApplyChanges, onNotification]);

  const handleGenerateItems = useCallback(() => {
    const items: GeneratedItem[] = [];
    for (let i = 0; i < 5; i++) {
      items.push(proceduralGenerator.generateItem(itemConfig));
    }
    setGeneratedItems(items);
    onNotification(`Generated ${items.length} items`);
  }, [itemConfig, onNotification]);

  const handleGenerateQuests = useCallback(() => {
    const quests: GeneratedQuest[] = [];
    const difficulties: QuestConfig['difficulty'][] = ['easy', 'medium', 'hard'];
    const types: QuestConfig['type'][] = ['fetch', 'kill', 'explore'];

    for (let i = 0; i < 3; i++) {
      quests.push(proceduralGenerator.generateQuest({
        difficulty: difficulties[i],
        type: types[i],
      }));
    }
    setGeneratedQuests(quests);
    onNotification(`Generated ${quests.length} quests`);
  }, [onNotification]);

  // Art generation
  const handleGenerateArt = useCallback(async () => {
    if (!artPrompt) return;
    setIsGenerating(true);
    try {
      const result = await aiArtGenerator.generateImage({
        prompt: artPrompt,
        style: artStyle,
        size: artSize,
      });
      setGeneratedArt(prev => [result.url || result.base64 || '', ...prev].slice(0, 12));
      onNotification('Generated art asset');
    } catch (err) {
      onNotification(`Art generation unavailable - configure API key in settings`);
      // Add placeholder
      setGeneratedArt(prev => ['placeholder', ...prev].slice(0, 12));
    }
    setIsGenerating(false);
  }, [artPrompt, artStyle, artSize, onNotification]);

  // Voice commands
  const handleToggleVoice = useCallback(() => {
    voiceToGame.toggleListening();
  }, []);

  const handleTextCommand = useCallback(async () => {
    if (!voiceTextInput.trim()) return;
    const { modifications } = await voiceToGame.processTextCommand(voiceTextInput);
    const newEntities = modifications
      .filter(m => m.type === 'add' && m.entity)
      .map(m => m.entity as EntitySpec);

    if (newEntities.length > 0) {
      onApplyChanges(newEntities);
      onNotification(`Command: Added ${newEntities.length} entities`);
    }
    setVoiceTextInput('');
  }, [voiceTextInput, onApplyChanges, onNotification]);

  if (!isOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'level':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">AI Level Designer</h3>

            <div className="space-y-2">
              <label className="block text-xs text-text-secondary">Level Name</label>
              <input
                type="text"
                value={levelConfig.name}
                onChange={(e) => setLevelConfig(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Difficulty</label>
                <select
                  value={levelConfig.difficulty}
                  onChange={(e) => setLevelConfig(prev => ({ ...prev, difficulty: e.target.value as LevelConfig['difficulty'] }))}
                  className="w-full bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="easy" className="bg-[#1a1a2e]">Easy</option>
                  <option value="medium" className="bg-[#1a1a2e]">Medium</option>
                  <option value="hard" className="bg-[#1a1a2e]">Hard</option>
                  <option value="expert" className="bg-[#1a1a2e]">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Style</label>
                <select
                  value={levelConfig.style}
                  onChange={(e) => setLevelConfig(prev => ({ ...prev, style: e.target.value as LevelConfig['style'] }))}
                  className="w-full bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="linear" className="bg-[#1a1a2e]">Linear</option>
                  <option value="vertical" className="bg-[#1a1a2e]">Vertical</option>
                  <option value="maze" className="bg-[#1a1a2e]">Maze</option>
                  <option value="open-world" className="bg-[#1a1a2e]">Open World</option>
                  <option value="hub" className="bg-[#1a1a2e]">Hub</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Width</label>
                <input
                  type="number"
                  value={levelConfig.width}
                  onChange={(e) => setLevelConfig(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                  className="w-full bg-surface border border-subtle rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Height</label>
                <input
                  type="number"
                  value={levelConfig.height}
                  onChange={(e) => setLevelConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                  className="w-full bg-surface border border-subtle rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateLevel}
              disabled={isGenerating}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Level'}
            </button>

            {generatedLevel && (
              <div className="bg-surface rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">{generatedLevel.name}</span>
                  <span className="text-xs text-text-tertiary">{generatedLevel.entities.length} entities</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {generatedLevel.metadata.estimatedTime} | {generatedLevel.objectives.length} objectives
                </div>
                <button
                  onClick={handleApplyLevel}
                  className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                >
                  Apply to Scene
                </button>
              </div>
            )}
          </div>
        );

      case 'npc':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">NPC Dialogue System</h3>

            {/* Preset NPCs */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">Quick Add Preset</label>
              <div className="flex flex-wrap gap-1">
                {presetNPCs.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleUsePresetNPC(preset)}
                    className="px-2 py-1 bg-surface hover:bg-white/10 text-xs text-white rounded transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-subtle pt-3">
              <label className="block text-xs text-text-secondary mb-2">Create Custom NPC</label>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="NPC Name"
                  value={npcPersonality.name || ''}
                  onChange={(e) => setNpcPersonality(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm text-white"
                />

                <input
                  type="text"
                  placeholder="Role (e.g., Merchant, Guard)"
                  value={npcPersonality.role || ''}
                  onChange={(e) => setNpcPersonality(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm text-white"
                />

                <select
                  value={npcPersonality.speechStyle || 'casual'}
                  onChange={(e) => setNpcPersonality(prev => ({ ...prev, speechStyle: e.target.value as NPCPersonality['speechStyle'] }))}
                  className="w-full bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="casual" className="bg-[#1a1a2e]">Casual</option>
                  <option value="formal" className="bg-[#1a1a2e]">Formal</option>
                  <option value="mysterious" className="bg-[#1a1a2e]">Mysterious</option>
                  <option value="aggressive" className="bg-[#1a1a2e]">Aggressive</option>
                  <option value="friendly" className="bg-[#1a1a2e]">Friendly</option>
                  <option value="scholarly" className="bg-[#1a1a2e]">Scholarly</option>
                </select>

                <textarea
                  placeholder="Background story..."
                  value={npcPersonality.background || ''}
                  onChange={(e) => setNpcPersonality(prev => ({ ...prev, background: e.target.value }))}
                  className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm text-white h-20 resize-none"
                />

                <button
                  onClick={handleCreateNPC}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create NPC
                </button>
              </div>
            </div>
          </div>
        );

      case 'procedural':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Procedural Generator</h3>

            {/* Terrain */}
            <div className="space-y-2">
              <label className="block text-xs text-text-secondary">Terrain Generation</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={terrainConfig.type}
                  onChange={(e) => setTerrainConfig(prev => ({ ...prev, type: e.target.value as TerrainConfig['type'] }))}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="flat" className="bg-[#1a1a2e]">Flat</option>
                  <option value="hills" className="bg-[#1a1a2e]">Hills</option>
                  <option value="mountains" className="bg-[#1a1a2e]">Mountains</option>
                  <option value="islands" className="bg-[#1a1a2e]">Islands</option>
                  <option value="caves" className="bg-[#1a1a2e]">Caves</option>
                </select>
                <select
                  value={terrainConfig.biome}
                  onChange={(e) => setTerrainConfig(prev => ({ ...prev, biome: e.target.value as TerrainConfig['biome'] }))}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="forest" className="bg-[#1a1a2e]">Forest</option>
                  <option value="desert" className="bg-[#1a1a2e]">Desert</option>
                  <option value="snow" className="bg-[#1a1a2e]">Snow</option>
                  <option value="volcanic" className="bg-[#1a1a2e]">Volcanic</option>
                  <option value="ocean" className="bg-[#1a1a2e]">Ocean</option>
                  <option value="plains" className="bg-[#1a1a2e]">Plains</option>
                </select>
              </div>
              <button
                onClick={handleGenerateTerrain}
                disabled={isGenerating}
                className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-sm rounded transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate Terrain'}
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2 border-t border-subtle pt-3">
              <label className="block text-xs text-text-secondary">Item Generation</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={itemConfig.type}
                  onChange={(e) => setItemConfig(prev => ({ ...prev, type: e.target.value as ItemConfig['type'] }))}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="weapon" className="bg-[#1a1a2e]">Weapon</option>
                  <option value="armor" className="bg-[#1a1a2e]">Armor</option>
                  <option value="consumable" className="bg-[#1a1a2e]">Consumable</option>
                  <option value="accessory" className="bg-[#1a1a2e]">Accessory</option>
                </select>
                <select
                  value={itemConfig.rarity}
                  onChange={(e) => setItemConfig(prev => ({ ...prev, rarity: e.target.value as ItemConfig['rarity'] }))}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="common" className="bg-[#1a1a2e]">Common</option>
                  <option value="uncommon" className="bg-[#1a1a2e]">Uncommon</option>
                  <option value="rare" className="bg-[#1a1a2e]">Rare</option>
                  <option value="epic" className="bg-[#1a1a2e]">Epic</option>
                  <option value="legendary" className="bg-[#1a1a2e]">Legendary</option>
                </select>
              </div>
              <button
                onClick={handleGenerateItems}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded transition-colors"
              >
                Generate Items
              </button>
              {generatedItems.length > 0 && (
                <div className="bg-surface rounded p-2 max-h-32 overflow-y-auto space-y-1">
                  {generatedItems.map((item, i) => (
                    <div key={i} className="text-xs text-white flex justify-between">
                      <span className={`${item.rarity === 'legendary' ? 'text-yellow-400' : item.rarity === 'epic' ? 'text-purple-400' : item.rarity === 'rare' ? 'text-blue-400' : 'text-gray-300'}`}>
                        {item.name}
                      </span>
                      <span className="text-text-tertiary">{item.value}g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quests */}
            <div className="space-y-2 border-t border-subtle pt-3">
              <label className="block text-xs text-text-secondary">Quest Generation</label>
              <button
                onClick={handleGenerateQuests}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
              >
                Generate Quests
              </button>
              {generatedQuests.length > 0 && (
                <div className="bg-surface rounded p-2 max-h-40 overflow-y-auto space-y-2">
                  {generatedQuests.map((quest, i) => (
                    <div key={i} className="text-xs border-b border-subtle pb-2 last:border-0">
                      <div className="text-white font-medium">{quest.name}</div>
                      <div className="text-text-tertiary">{quest.description}</div>
                      <div className="text-text-secondary mt-1">
                        {quest.objectives.length} objectives | {quest.estimatedTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'art':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">AI Art Generator</h3>

            {!aiArtGenerator.isAvailable() && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg p-2 text-xs">
                Configure Stability AI, Replicate, or OpenAI API key to enable AI art generation.
              </div>
            )}

            <div className="space-y-2">
              <textarea
                placeholder="Describe the art you want to generate..."
                value={artPrompt}
                onChange={(e) => setArtPrompt(e.target.value)}
                className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm text-white h-20 resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value as ArtStyle)}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="pixel-art" className="bg-[#1a1a2e]">Pixel Art</option>
                  <option value="hand-drawn" className="bg-[#1a1a2e]">Hand Drawn</option>
                  <option value="vector" className="bg-[#1a1a2e]">Vector</option>
                  <option value="anime" className="bg-[#1a1a2e]">Anime</option>
                  <option value="cartoon" className="bg-[#1a1a2e]">Cartoon</option>
                  <option value="low-poly" className="bg-[#1a1a2e]">Low Poly</option>
                  <option value="retro" className="bg-[#1a1a2e]">Retro</option>
                </select>
                <select
                  value={artSize}
                  onChange={(e) => setArtSize(e.target.value as ImageSize)}
                  className="bg-[#1a1a2e] border border-subtle rounded px-2 py-1.5 text-sm text-white"
                >
                  <option value="32x32" className="bg-[#1a1a2e]">32x32</option>
                  <option value="64x64" className="bg-[#1a1a2e]">64x64</option>
                  <option value="128x128" className="bg-[#1a1a2e]">128x128</option>
                  <option value="256x256" className="bg-[#1a1a2e]">256x256</option>
                  <option value="512x512" className="bg-[#1a1a2e]">512x512</option>
                </select>
              </div>

              <button
                onClick={handleGenerateArt}
                disabled={isGenerating || !artPrompt}
                className="w-full py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate Art'}
              </button>
            </div>

            {generatedArt.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {generatedArt.map((art, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-surface rounded overflow-hidden border border-subtle"
                  >
                    {art !== 'placeholder' ? (
                      <img
                        src={art.startsWith('data:') ? art : `data:image/png;base64,${art}`}
                        alt={`Generated ${i}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
                        Demo
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Voice-to-Game</h3>

            {!voiceToGame.isSupported() ? (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg p-2 text-xs">
                Speech recognition is not supported in this browser.
              </div>
            ) : (
              <>
                <button
                  onClick={handleToggleVoice}
                  className={`w-full py-3 ${voiceState.isListening ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
                >
                  {voiceState.isListening ? (
                    <>
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      Listening... (Click to stop)
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      Start Voice Commands
                    </>
                  )}
                </button>

                {voiceState.isProcessing && (
                  <div className="text-center text-text-secondary text-sm">
                    Processing command...
                  </div>
                )}
              </>
            )}

            {/* Text input fallback */}
            <div className="border-t border-subtle pt-3">
              <label className="block text-xs text-text-secondary mb-2">Or type a command</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceTextInput}
                  onChange={(e) => setVoiceTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextCommand()}
                  placeholder="create a player at center"
                  className="flex-1 bg-surface border border-subtle rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={handleTextCommand}
                  className="px-4 py-2 bg-surface hover:bg-white/10 text-white text-sm rounded transition-colors"
                >
                  Run
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">Example commands</label>
              <div className="flex flex-wrap gap-1">
                {['create player', 'add 5 enemies', 'generate level', 'spawn coins'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setVoiceTextInput(cmd)}
                    className="px-2 py-1 bg-surface hover:bg-white/10 text-xs text-text-secondary rounded transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Command history */}
            {voiceState.commandHistory.length > 0 && (
              <div className="border-t border-subtle pt-3">
                <label className="block text-xs text-text-secondary mb-2">Recent commands</label>
                <div className="bg-surface rounded p-2 max-h-32 overflow-y-auto space-y-1">
                  {voiceState.commandHistory.slice(-5).reverse().map((cmd, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-white">"{cmd.transcript}"</span>
                      <span className="text-text-tertiary ml-2">
                        {cmd.intent?.action || 'unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed right-4 top-16 w-80 bg-panel border border-subtle rounded-xl shadow-2xl z-50 overflow-hidden max-h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-subtle bg-surface/50">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Tools
        </h2>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle bg-surface/30">
        {[
          { id: 'level', label: 'Level', icon: '🏗️' },
          { id: 'npc', label: 'NPC', icon: '👤' },
          { id: 'procedural', label: 'Proc', icon: '🎲' },
          { id: 'art', label: 'Art', icon: '🎨' },
          { id: 'voice', label: 'Voice', icon: '🎤' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AIToolTab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AIToolsPanel;
