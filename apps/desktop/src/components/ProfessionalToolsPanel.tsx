/**
 * Professional Tools Panel - UI for v4.0 features
 * Materials, Shaders, Particles, Terrain, Weather, Day/Night
 */

import React, { useState, useCallback, useEffect } from 'react';
import { pbrMaterialSystem, PBRMaterialConfig, MaterialPreset } from '../services/PBRMaterialSystem';
import { shaderEditor, CustomShader, ShaderTemplate } from '../services/ShaderEditor';
import { advancedParticleEditor, AdvancedParticleSystem, ParticlePreset } from '../services/AdvancedParticleEditor';
import { terrainEditor3D, TerrainInstance, TerrainPreset as TerrainPresetType } from '../services/TerrainEditor3D';
import { weatherSystem, WeatherState, WeatherPreset } from '../services/WeatherSystem';
import { dayNightCycle, LightingState, TimeOfDay, DayNightPreset } from '../services/DayNightCycle';

interface ProfessionalToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (message: string) => void;
}

type TabType = 'materials' | 'shaders' | 'particles' | 'terrain' | 'weather' | 'daynight';

export const ProfessionalToolsPanel: React.FC<ProfessionalToolsPanelProps> = ({
  isOpen,
  onClose,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('materials');

  // Materials state
  const [, setMaterials] = useState<PBRMaterialConfig[]>([]);
  const [materialPresets, setMaterialPresets] = useState<MaterialPreset[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<PBRMaterialConfig | null>(null);
  const [materialCategory, setMaterialCategory] = useState<string>('all');

  // Shaders state
  const [, setShaders] = useState<CustomShader[]>([]);
  const [shaderTemplates, setShaderTemplates] = useState<ShaderTemplate[]>([]);
  const [selectedShader, setSelectedShader] = useState<CustomShader | null>(null);
  const [shaderCategory, setShaderCategory] = useState<string>('all');

  // Particles state
  const [, setParticleSystems] = useState<AdvancedParticleSystem[]>([]);
  const [particlePresets, setParticlePresets] = useState<ParticlePreset[]>([]);
  const [selectedParticle, setSelectedParticle] = useState<AdvancedParticleSystem | null>(null);
  const [particleCategory, setParticleCategory] = useState<string>('all');

  // Terrain state
  const [, setTerrains] = useState<TerrainInstance[]>([]);
  const [terrainPresets, setTerrainPresets] = useState<TerrainPresetType[]>([]);
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainInstance | null>(null);

  // Weather state
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [weatherPresets, setWeatherPresets] = useState<WeatherPreset[]>([]);
  const [weatherCategory, setWeatherCategory] = useState<string>('all');

  // Day/Night state
  const [lightingState, setLightingState] = useState<LightingState | null>(null);
  const [currentTime, setCurrentTime] = useState<TimeOfDay>({ hours: 12, minutes: 0 });
  const [dayNightPresets, setDayNightPresets] = useState<DayNightPreset[]>([]);
  const [timeScale, setTimeScale] = useState(1);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      // Materials
      setMaterials(pbrMaterialSystem.getAllMaterials());
      setMaterialPresets(pbrMaterialSystem.getPresets());

      // Shaders
      setShaders(shaderEditor.getAllShaders());
      setShaderTemplates(shaderEditor.getTemplates());

      // Particles
      setParticleSystems(advancedParticleEditor.getAllSystems());
      setParticlePresets(advancedParticleEditor.getPresets());

      // Terrain
      setTerrains(terrainEditor3D.getAllTerrains());
      setTerrainPresets(terrainEditor3D.getPresets());

      // Weather
      setWeatherState(weatherSystem.getCurrentState());
      setWeatherPresets(weatherSystem.getPresets());

      // Day/Night
      setLightingState(dayNightCycle.getCurrentState());
      setCurrentTime(dayNightCycle.getCurrentTime());
      setDayNightPresets(dayNightCycle.getPresets());
      setTimeScale(dayNightCycle.getTimeScale());
    }
  }, [isOpen]);

  // Subscribe to weather and day/night updates
  useEffect(() => {
    const unsubWeather = weatherSystem.subscribe((state) => {
      setWeatherState(state);
    });

    const unsubDayNight = dayNightCycle.subscribe((state, time) => {
      setLightingState(state);
      setCurrentTime(time);
    });

    return () => {
      unsubWeather();
      unsubDayNight();
    };
  }, []);

  // Materials handlers
  const handleCreateMaterial = useCallback(() => {
    const material = pbrMaterialSystem.createMaterial({ name: `Material ${Date.now()}` });
    setMaterials(pbrMaterialSystem.getAllMaterials());
    setSelectedMaterial(material);
    onNotification('Created new material');
  }, [onNotification]);

  const handleApplyMaterialPreset = useCallback((preset: MaterialPreset) => {
    const material = pbrMaterialSystem.createMaterialFromPreset(preset);
    setMaterials(pbrMaterialSystem.getAllMaterials());
    setSelectedMaterial(material);
    onNotification(`Applied preset: ${preset.name}`);
  }, [onNotification]);

  const handleUpdateMaterial = useCallback((name: string, updates: Partial<PBRMaterialConfig>) => {
    pbrMaterialSystem.updateMaterial(name, updates);
    setMaterials(pbrMaterialSystem.getAllMaterials());
    if (selectedMaterial?.name === name) {
      setSelectedMaterial(pbrMaterialSystem.getMaterial(name) || null);
    }
  }, [selectedMaterial]);

  // Shaders handlers
  const handleCreateShader = useCallback(() => {
    const shader = shaderEditor.createShader({ name: `Shader ${Date.now()}` });
    setShaders(shaderEditor.getAllShaders());
    setSelectedShader(shader);
    onNotification('Created new shader');
  }, [onNotification]);

  const handleApplyShaderTemplate = useCallback((template: ShaderTemplate) => {
    const shader = shaderEditor.createShaderFromTemplate(template);
    setShaders(shaderEditor.getAllShaders());
    setSelectedShader(shader);
    onNotification(`Applied template: ${template.name}`);
  }, [onNotification]);

  // Particles handlers
  const handleCreateParticleSystem = useCallback(() => {
    const system = advancedParticleEditor.createDefaultSystem(`Particles ${Date.now()}`);
    setParticleSystems(advancedParticleEditor.getAllSystems());
    setSelectedParticle(system);
    onNotification('Created new particle system');
  }, [onNotification]);

  const handleApplyParticlePreset = useCallback((preset: ParticlePreset) => {
    const system = advancedParticleEditor.createSystemFromPreset(preset);
    setParticleSystems(advancedParticleEditor.getAllSystems());
    setSelectedParticle(system);
    onNotification(`Applied preset: ${preset.name}`);
  }, [onNotification]);

  // Terrain handlers
  const handleCreateTerrain = useCallback(() => {
    const terrain = terrainEditor3D.createTerrain({ name: `Terrain ${Date.now()}` });
    setTerrains(terrainEditor3D.getAllTerrains());
    setSelectedTerrain(terrain);
    onNotification('Created new terrain');
  }, [onNotification]);

  const handleGenerateTerrainFromPreset = useCallback((preset: TerrainPresetType) => {
    const terrain = terrainEditor3D.generateFromPreset(preset.id);
    if (terrain) {
      setTerrains(terrainEditor3D.getAllTerrains());
      setSelectedTerrain(terrain);
      onNotification(`Generated terrain: ${preset.name}`);
    }
  }, [onNotification]);

  // Weather handlers
  const handleApplyWeatherPreset = useCallback((preset: WeatherPreset) => {
    weatherSystem.applyPreset(preset.id, true);
    onNotification(`Transitioning to: ${preset.name}`);
  }, [onNotification]);

  // Day/Night handlers
  const handleSetTime = useCallback((hours: number) => {
    dayNightCycle.setTimeFromHours(hours);
    setCurrentTime(dayNightCycle.getCurrentTime());
    setLightingState(dayNightCycle.getCurrentState());
  }, []);

  const handleSetTimeScale = useCallback((scale: number) => {
    dayNightCycle.setTimeScale(scale);
    setTimeScale(scale);
  }, []);

  const handleApplyDayNightPreset = useCallback((preset: DayNightPreset) => {
    dayNightCycle.applyPreset(preset.id);
    onNotification(`Applied preset: ${preset.name}`);
  }, [onNotification]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'materials', label: 'Materials', icon: '🎨' },
    { id: 'shaders', label: 'Shaders', icon: '✨' },
    { id: 'particles', label: 'Particles', icon: '💫' },
    { id: 'terrain', label: 'Terrain', icon: '⛰️' },
    { id: 'weather', label: 'Weather', icon: '🌦️' },
    { id: 'daynight', label: 'Day/Night', icon: '🌅' },
  ];

  const materialCategories = ['all', 'metal', 'wood', 'stone', 'fabric', 'plastic', 'organic', 'glass'];
  const shaderCategories = ['all', 'surface', 'post-process', 'particle', 'skybox', 'custom'];
  const particleCategories = ['all', 'fire', 'water', 'smoke', 'magic', 'weather', 'explosion', 'nature', 'sci-fi'];
  const weatherCategories = ['all', 'clear', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'special'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '450px',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      borderLeft: '2px solid #0f3460',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#0f3460',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, color: '#e94560' }}>🛠️ Professional Tools</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        backgroundColor: '#16213e',
        borderBottom: '1px solid #0f3460',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 1 33%',
              padding: '10px 8px',
              backgroundColor: activeTab === tab.id ? '#0f3460' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#e94560' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '4px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleCreateMaterial}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                + Create New Material
              </button>

              <select
                value={materialCategory}
                onChange={(e) => setMaterialCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#16213e',
                  color: '#fff',
                  border: '1px solid #0f3460',
                  borderRadius: '4px',
                }}
              >
                {materialCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Presets</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {materialPresets
                .filter((p) => materialCategory === 'all' || p.category === materialCategory)
                .map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyMaterialPreset(preset)}
                    style={{
                      padding: '8px',
                      backgroundColor: '#16213e',
                      color: '#fff',
                      border: '1px solid #0f3460',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>{preset.category}</div>
                  </button>
                ))}
            </div>

            {selectedMaterial && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ color: '#e94560', margin: '0 0 12px' }}>Edit: {selectedMaterial.name}</h4>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '12px' }}>Roughness</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedMaterial.roughness}
                    onChange={(e) => handleUpdateMaterial(selectedMaterial.name, { roughness: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '12px' }}>Metalness</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedMaterial.metalness}
                    onChange={(e) => handleUpdateMaterial(selectedMaterial.name, { metalness: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '12px' }}>Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedMaterial.opacity ?? 1}
                    onChange={(e) => handleUpdateMaterial(selectedMaterial.name, { opacity: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Shaders Tab */}
        {activeTab === 'shaders' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleCreateShader}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                + Create New Shader
              </button>

              <select
                value={shaderCategory}
                onChange={(e) => setShaderCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#16213e',
                  color: '#fff',
                  border: '1px solid #0f3460',
                  borderRadius: '4px',
                }}
              >
                {shaderCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Templates</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {shaderTemplates
                .filter((t) => shaderCategory === 'all' || t.category === shaderCategory)
                .map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyShaderTemplate(template)}
                    style={{
                      padding: '10px',
                      backgroundColor: '#16213e',
                      color: '#fff',
                      border: '1px solid #0f3460',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{template.name}</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>{template.description}</div>
                  </button>
                ))}
            </div>

            {selectedShader && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ color: '#e94560', margin: '0 0 12px' }}>Edit: {selectedShader.name}</h4>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#fff', fontSize: '12px', marginBottom: '4px' }}>Uniforms:</div>
                  {selectedShader.uniforms.map((uniform) => (
                    <div key={uniform.name} style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      {uniform.type} {uniform.name}
                    </div>
                  ))}
                </div>

                <div style={{ color: '#888', fontSize: '10px' }}>
                  Category: {selectedShader.category}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Particles Tab */}
        {activeTab === 'particles' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleCreateParticleSystem}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                + Create Particle System
              </button>

              <select
                value={particleCategory}
                onChange={(e) => setParticleCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#16213e',
                  color: '#fff',
                  border: '1px solid #0f3460',
                  borderRadius: '4px',
                }}
              >
                {particleCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Presets</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {particlePresets
                .filter((p) => particleCategory === 'all' || p.category === particleCategory)
                .map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyParticlePreset(preset)}
                    style={{
                      padding: '8px',
                      backgroundColor: '#16213e',
                      color: '#fff',
                      border: '1px solid #0f3460',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>{preset.category}</div>
                  </button>
                ))}
            </div>

            {selectedParticle && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ color: '#e94560', margin: '0 0 12px' }}>{selectedParticle.name}</h4>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>Duration: {selectedParticle.duration}s</div>
                  <div>Max Particles: {selectedParticle.maxParticles}</div>
                  <div>Looping: {selectedParticle.looping ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terrain Tab */}
        {activeTab === 'terrain' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleCreateTerrain}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                + Create New Terrain
              </button>
            </div>

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Terrain Presets</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {terrainPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleGenerateTerrainFromPreset(preset)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#16213e',
                    color: '#fff',
                    border: '1px solid #0f3460',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                  <div style={{ color: '#888', fontSize: '11px' }}>{preset.description}</div>
                  <div style={{ color: '#666', fontSize: '10px' }}>Generator: {preset.generator}</div>
                </button>
              ))}
            </div>

            {selectedTerrain && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px' }}>
                <h4 style={{ color: '#e94560', margin: '0 0 12px' }}>{selectedTerrain.config.name}</h4>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>Size: {selectedTerrain.config.width} x {selectedTerrain.config.depth}</div>
                  <div>Height: {selectedTerrain.config.height}</div>
                  <div>Resolution: {selectedTerrain.config.resolution}</div>
                  <div>Layers: {selectedTerrain.layers.length}</div>
                  <div>Trees: {selectedTerrain.treeInstances.length}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Weather Tab */}
        {activeTab === 'weather' && (
          <div>
            <h4 style={{ color: '#e94560', margin: '0 0 8px' }}>Current Weather</h4>
            {weatherState && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>Rain: {weatherState.rain.enabled ? `${(weatherState.rain.intensity * 100).toFixed(0)}%` : 'Off'}</div>
                  <div>Snow: {weatherState.snow.enabled ? `${(weatherState.snow.intensity * 100).toFixed(0)}%` : 'Off'}</div>
                  <div>Fog: {weatherState.fog.enabled ? `Density: ${weatherState.fog.density.toFixed(4)}` : 'Off'}</div>
                  <div>Clouds: {weatherState.clouds.enabled ? `${(weatherState.clouds.coverage * 100).toFixed(0)}%` : 'Off'}</div>
                  <div>Wind: {weatherState.wind.speed.toFixed(1)} m/s</div>
                  <div>Temperature: {weatherState.temperature}°C</div>
                </div>
              </div>
            )}

            <select
              value={weatherCategory}
              onChange={(e) => setWeatherCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#16213e',
                color: '#fff',
                border: '1px solid #0f3460',
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            >
              {weatherCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Weather Presets</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {weatherPresets
                .filter((p) => weatherCategory === 'all' || p.category === weatherCategory)
                .map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyWeatherPreset(preset)}
                    style={{
                      padding: '8px',
                      backgroundColor: '#16213e',
                      color: '#fff',
                      border: '1px solid #0f3460',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>{preset.description}</div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Day/Night Tab */}
        {activeTab === 'daynight' && (
          <div>
            <h4 style={{ color: '#e94560', margin: '0 0 8px' }}>Time of Day</h4>
            <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', color: '#fff', textAlign: 'center', marginBottom: '12px' }}>
                {dayNightCycle.getFormattedTime()}
              </div>

              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={currentTime.hours + currentTime.minutes / 60}
                onChange={(e) => handleSetTime(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#fff', fontSize: '12px', marginBottom: '4px' }}>
                Time Scale: {timeScale}x
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="1"
                value={timeScale}
                onChange={(e) => handleSetTimeScale(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => handleSetTimeScale(0)}
                  style={{ flex: 1, padding: '4px', backgroundColor: '#16213e', color: '#fff', border: '1px solid #0f3460', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  Pause
                </button>
                <button
                  onClick={() => handleSetTimeScale(1)}
                  style={{ flex: 1, padding: '4px', backgroundColor: '#16213e', color: '#fff', border: '1px solid #0f3460', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  1x
                </button>
                <button
                  onClick={() => handleSetTimeScale(60)}
                  style={{ flex: 1, padding: '4px', backgroundColor: '#16213e', color: '#fff', border: '1px solid #0f3460', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  60x
                </button>
                <button
                  onClick={() => handleSetTimeScale(360)}
                  style={{ flex: 1, padding: '4px', backgroundColor: '#16213e', color: '#fff', border: '1px solid #0f3460', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  360x
                </button>
              </div>
            </div>

            {lightingState && (
              <div style={{ backgroundColor: '#16213e', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                <h5 style={{ color: '#e94560', margin: '0 0 8px' }}>Current Lighting</h5>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>Sun: {lightingState.sun.enabled ? `${(lightingState.sun.intensity * 100).toFixed(0)}%` : 'Off'}</div>
                  <div>Moon: {lightingState.moon.enabled ? `${(lightingState.moon.intensity * 100).toFixed(0)}%` : 'Off'}</div>
                  <div>Stars: {lightingState.stars.enabled ? 'Visible' : 'Hidden'}</div>
                  <div>Ambient: {(lightingState.ambient.intensity * 100).toFixed(0)}%</div>
                  <div>Daytime: {dayNightCycle.isDaytime() ? 'Yes' : 'No'}</div>
                  <div>Day Length: {dayNightCycle.getDayLength().toFixed(1)}h</div>
                </div>
              </div>
            )}

            <h4 style={{ color: '#e94560', margin: '16px 0 8px' }}>Environment Presets</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dayNightPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyDayNightPreset(preset)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#16213e',
                    color: '#fff',
                    border: '1px solid #0f3460',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                  <div style={{ color: '#888', fontSize: '11px' }}>{preset.description}</div>
                  <div style={{ color: '#666', fontSize: '10px' }}>Latitude: {preset.latitude}°</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
