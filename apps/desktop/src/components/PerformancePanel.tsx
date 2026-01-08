import { useState, useCallback, useEffect } from 'react';
import { gpuInstancing, type InstancingStats, type InstanceGroup } from '../services/GPUInstancing';
import { lodSystem, type LODStats, type LODGroup } from '../services/LODSystem';
import { occlusionCulling, type CullingStats, type CullingConfig } from '../services/OcclusionCulling';
import { assetStreaming, type StreamingStats, type StreamingConfig } from '../services/AssetStreaming';
import { memoryOptimizer, type MemoryStats, type MemoryBudget, type MemoryPressure } from '../services/MemoryOptimizer';
import { TabContent } from './ui/TabContent';

interface PerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

type TabType = 'overview' | 'instancing' | 'lod' | 'culling' | 'streaming' | 'memory';

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  isOpen,
  onClose,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Stats states
  const [instancingStats, setInstancingStats] = useState<InstancingStats | null>(null);
  const [lodStats, setLodStats] = useState<LODStats | null>(null);
  const [cullingStats, setCullingStats] = useState<CullingStats | null>(null);
  const [streamingStats, setStreamingStats] = useState<StreamingStats | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  // Instance groups
  const [instanceGroups, setInstanceGroups] = useState<InstanceGroup[]>([]);
  const [lodObjects, setLodObjects] = useState<LODGroup[]>([]);

  // Configurations
  const [cullingConfig, setCullingConfig] = useState<CullingConfig | null>(null);
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig | null>(null);
  const [memoryBudget, setMemoryBudget] = useState<MemoryBudget | null>(null);

  // Memory pressure
  const [memoryPressure, setMemoryPressure] = useState<MemoryPressure>('low');

  // Update stats periodically
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setInstancingStats(gpuInstancing.getStats());
      setLodStats(lodSystem.getStats());
      setCullingStats(occlusionCulling.getStats());
      setStreamingStats(assetStreaming.getStats());
      setMemoryStats(memoryOptimizer.getStats());
      setMemoryPressure(memoryOptimizer.getMemoryPressure());

      setInstanceGroups(gpuInstancing.getGroups());
      setLodObjects(lodSystem.getObjects());

      setCullingConfig(occlusionCulling.getConfig());
      setStreamingConfig(assetStreaming.getConfig());
      setMemoryBudget(memoryOptimizer.getBudget());
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Format bytes to human readable
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  // Format milliseconds
  const formatMs = useCallback((ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  }, []);

  // Culling config handlers
  const handleCullingConfigChange = useCallback((key: keyof CullingConfig, value: boolean | number) => {
    occlusionCulling.configure({ [key]: value });
    setCullingConfig(occlusionCulling.getConfig());
    onNotification(`Culling ${key} updated`);
  }, [onNotification]);

  // Streaming config handlers
  const handleStreamingConfigChange = useCallback((key: keyof StreamingConfig, value: boolean | number) => {
    assetStreaming.configure({ [key]: value });
    setStreamingConfig(assetStreaming.getConfig());
    onNotification(`Streaming ${key} updated`);
  }, [onNotification]);

  // Memory budget handlers
  const handleMemoryBudgetChange = useCallback((key: keyof MemoryBudget, value: number) => {
    memoryOptimizer.configureBudget({ [key]: value });
    setMemoryBudget(memoryOptimizer.getBudget());
    onNotification(`Memory ${key} updated`);
  }, [onNotification]);

  // Force cleanup
  const handleForceCleanup = useCallback(() => {
    memoryOptimizer.performCleanup();
    onNotification('Memory cleanup performed');
  }, [onNotification]);

  // Clear streaming cache
  const handleClearStreamingCache = useCallback(() => {
    assetStreaming.clearAll();
    onNotification('Streaming cache cleared');
  }, [onNotification]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'instancing', label: 'Instancing' },
    { id: 'lod', label: 'LOD' },
    { id: 'culling', label: 'Culling' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'memory', label: 'Memory' },
  ];

  const getPressureColor = (pressure: MemoryPressure): string => {
    switch (pressure) {
      case 'low': return '#22c55e';
      case 'moderate': return '#eab308';
      case 'high': return '#f97316';
      case 'critical': return '#ef4444';
    }
  };

  return (
    <div className="absolute top-10 right-0 w-[420px] h-[calc(100vh-40px)] bg-gray-900 border-l border-gray-700 flex flex-col z-[100]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <span className="font-bold text-white">Performance Tools</span>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-gray-400 hover:text-white cursor-pointer text-lg"
          aria-label="Close performance panel"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 border-none text-xs whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'bg-transparent text-gray-400 border-b-2 border-transparent hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Memory Pressure Indicator */}
            <div style={{
              padding: 16,
              backgroundColor: '#252525',
              borderRadius: 8,
              borderLeft: `4px solid ${getPressureColor(memoryPressure)}`,
            }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>MEMORY PRESSURE</div>
              <div style={{ color: getPressureColor(memoryPressure), fontSize: 18, fontWeight: 'bold' }}>
                {memoryPressure.toUpperCase()}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11 }}>INSTANCES</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {instancingStats?.activeInstances || 0}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>
                  {instancingStats?.totalGroups || 0} groups
                </div>
              </div>

              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11 }}>LOD OBJECTS</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {lodStats?.visibleObjects || 0}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>
                  of {lodStats?.totalObjects || 0} total
                </div>
              </div>

              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11 }}>CULLED</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {(cullingStats?.frustumCulled || 0) + (cullingStats?.distanceCulled || 0)}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>
                  objects hidden
                </div>
              </div>

              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11 }}>ASSETS LOADED</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  {streamingStats?.loadedAssets || 0}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>
                  of {streamingStats?.totalAssets || 0} registered
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>PERFORMANCE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Triangles Rendered</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {(instancingStats?.triangles || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Triangles Saved (LOD)</span>
                  <span style={{ color: '#22c55e', fontSize: 12 }}>
                    {(lodStats?.trianglesSaved || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Draw Calls</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {instancingStats?.drawCalls || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Culling Time</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {formatMs(cullingStats?.updateTime || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>MEMORY USAGE</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  height: 8,
                  backgroundColor: '#333',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${((memoryStats?.current.heapUsed || 0) / (memoryBudget?.totalBudget || 1)) * 100}%`,
                    height: '100%',
                    backgroundColor: getPressureColor(memoryPressure),
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: 12 }}>
                  {formatBytes(memoryStats?.current.heapUsed || 0)}
                </span>
                <span style={{ color: '#888', fontSize: 12 }}>
                  / {formatBytes(memoryBudget?.totalBudget || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Instancing Tab */}
        {activeTab === 'instancing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>INSTANCING STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Total Groups</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{instancingStats?.totalGroups || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Active Instances</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{instancingStats?.activeInstances || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Draw Calls</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{instancingStats?.drawCalls || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Triangles</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {(instancingStats?.triangles || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Memory Used</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {formatBytes(instancingStats?.memoryUsage || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Update Time</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {formatMs(instancingStats?.updateTime || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Instance Groups */}
            <div>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>INSTANCE GROUPS</div>
              {instanceGroups.length === 0 ? (
                <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No instance groups created
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {instanceGroups.map(group => (
                    <div key={group.id} style={{
                      padding: 12,
                      backgroundColor: '#252525',
                      borderRadius: 8,
                    }}>
                      <div style={{ color: '#fff', fontSize: 13, marginBottom: 4 }}>{group.name}</div>
                      <div style={{ display: 'flex', gap: 16, color: '#888', fontSize: 11 }}>
                        <span>Active: {group.activeCount}</span>
                        <span>Max: {group.maxInstances}</span>
                        <span>{group.dirty ? 'Dirty' : 'Clean'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOD Tab */}
        {activeTab === 'lod' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>LOD STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Total Objects</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{lodStats?.totalObjects || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Visible Objects</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{lodStats?.visibleObjects || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Triangles Rendered</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {(lodStats?.trianglesRendered || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Triangles Saved</div>
                  <div style={{ color: '#22c55e', fontSize: 14 }}>
                    {(lodStats?.trianglesSaved || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Level Distribution */}
            {lodStats && Object.keys(lodStats.levelDistribution).length > 0 && (
              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>LEVEL DISTRIBUTION</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(lodStats.levelDistribution).map(([level, count]) => (
                    <div key={level} style={{
                      flex: 1,
                      padding: 8,
                      backgroundColor: '#333',
                      borderRadius: 4,
                      textAlign: 'center',
                    }}>
                      <div style={{ color: '#fff', fontSize: 14 }}>{count}</div>
                      <div style={{ color: '#666', fontSize: 10 }}>LOD {level}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOD Objects */}
            <div>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>LOD OBJECTS</div>
              {lodObjects.length === 0 ? (
                <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No LOD objects created
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lodObjects.map(obj => (
                    <div key={obj.id} style={{
                      padding: 12,
                      backgroundColor: '#252525',
                      borderRadius: 8,
                    }}>
                      <div style={{ color: '#fff', fontSize: 13, marginBottom: 4 }}>{obj.name}</div>
                      <div style={{ display: 'flex', gap: 16, color: '#888', fontSize: 11 }}>
                        <span>Current: LOD {obj.currentLevel}</span>
                        <span>Levels: {obj.config.levels.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Culling Tab */}
        {activeTab === 'culling' && cullingConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>CULLING STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Total Objects</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{cullingStats?.totalObjects || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Visible</div>
                  <div style={{ color: '#22c55e', fontSize: 14 }}>{cullingStats?.visibleObjects || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Frustum Culled</div>
                  <div style={{ color: '#ef4444', fontSize: 14 }}>{cullingStats?.frustumCulled || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Distance Culled</div>
                  <div style={{ color: '#f97316', fontSize: 14 }}>{cullingStats?.distanceCulled || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Occlusion Culled</div>
                  <div style={{ color: '#eab308', fontSize: 14 }}>{cullingStats?.occlusionCulled || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Size Culled</div>
                  <div style={{ color: '#a855f7', fontSize: 14 }}>{cullingStats?.sizeCulled || 0}</div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>CULLING SETTINGS</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cullingConfig.enableFrustumCulling}
                    onChange={(e) => handleCullingConfigChange('enableFrustumCulling', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Frustum Culling</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cullingConfig.enableDistanceCulling}
                    onChange={(e) => handleCullingConfigChange('enableDistanceCulling', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Distance Culling</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cullingConfig.enableOcclusionCulling}
                    onChange={(e) => handleCullingConfigChange('enableOcclusionCulling', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Occlusion Culling</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cullingConfig.enableSizeCulling}
                    onChange={(e) => handleCullingConfigChange('enableSizeCulling', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Size Culling</span>
                </label>

                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Max Distance: {cullingConfig.maxDistance}</div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    value={cullingConfig.maxDistance}
                    onChange={(e) => handleCullingConfigChange('maxDistance', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
                    Min Screen Size: {(cullingConfig.minScreenSize * 100).toFixed(1)}%
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.1"
                    step="0.001"
                    value={cullingConfig.minScreenSize}
                    onChange={(e) => handleCullingConfigChange('minScreenSize', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Streaming Tab */}
        {activeTab === 'streaming' && streamingConfig && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>STREAMING STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Total Assets</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{streamingStats?.totalAssets || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Loaded</div>
                  <div style={{ color: '#22c55e', fontSize: 14 }}>{streamingStats?.loadedAssets || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Queued</div>
                  <div style={{ color: '#eab308', fontSize: 14 }}>{streamingStats?.queuedAssets || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Loading</div>
                  <div style={{ color: '#3b82f6', fontSize: 14 }}>{streamingStats?.loadingAssets || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Memory Used</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {formatBytes(streamingStats?.memoryUsed || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Avg Load Time</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {formatMs(streamingStats?.avgLoadTime || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Progress */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>MEMORY BUDGET</div>
              <div style={{
                height: 8,
                backgroundColor: '#333',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <div style={{
                  width: `${((streamingStats?.memoryUsed || 0) / (streamingConfig?.memoryBudget || 1)) * 100}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11 }}>
                <span>{formatBytes(streamingStats?.memoryUsed || 0)}</span>
                <span>/ {formatBytes(streamingConfig?.memoryBudget || 0)}</span>
              </div>
            </div>

            {/* Settings */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>STREAMING SETTINGS</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={streamingConfig.enableDistanceLoading}
                    onChange={(e) => handleStreamingConfigChange('enableDistanceLoading', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Distance-based Loading</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={streamingConfig.enablePredictiveLoading}
                    onChange={(e) => handleStreamingConfigChange('enablePredictiveLoading', e.target.checked)}
                  />
                  <span style={{ color: '#fff', fontSize: 12 }}>Predictive Loading</span>
                </label>

                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
                    Max Concurrent Loads: {streamingConfig.maxConcurrentLoads}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={streamingConfig.maxConcurrentLoads}
                    onChange={(e) => handleStreamingConfigChange('maxConcurrentLoads', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
                    Load Radius: {streamingConfig.loadRadius}
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    value={streamingConfig.loadRadius}
                    onChange={(e) => handleStreamingConfigChange('loadRadius', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleClearStreamingCache}
              style={{
                padding: '10px 16px',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Clear Streaming Cache
            </button>
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === 'memory' && memoryBudget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current Usage */}
            <div style={{
              padding: 16,
              backgroundColor: '#252525',
              borderRadius: 8,
              borderLeft: `4px solid ${getPressureColor(memoryPressure)}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#888', fontSize: 11 }}>CURRENT USAGE</div>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                    {formatBytes(memoryStats?.current.heapUsed || 0)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: getPressureColor(memoryPressure),
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}>
                  {memoryPressure.toUpperCase()}
                </div>
              </div>
              <div style={{
                height: 8,
                backgroundColor: '#333',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${((memoryStats?.current.heapUsed || 0) / memoryBudget.totalBudget) * 100}%`,
                  height: '100%',
                  backgroundColor: getPressureColor(memoryPressure),
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* Memory Breakdown */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>MEMORY BREAKDOWN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Textures</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {formatBytes(memoryStats?.current.textureMemory || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Geometry</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {formatBytes(memoryStats?.current.geometryMemory || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Object Pools</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {formatBytes(memoryStats?.current.poolMemory || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Peak Usage */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>PEAK USAGE</div>
              <div style={{ color: '#fff', fontSize: 16 }}>
                {formatBytes(memoryStats?.peak.heapUsed || 0)}
              </div>
            </div>

            {/* Budget Settings */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>BUDGET SETTINGS</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
                    Total Budget: {formatBytes(memoryBudget.totalBudget)}
                  </div>
                  <input
                    type="range"
                    min={256 * 1024 * 1024}
                    max={2048 * 1024 * 1024}
                    step={128 * 1024 * 1024}
                    value={memoryBudget.totalBudget}
                    onChange={(e) => handleMemoryBudgetChange('totalBudget', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>
                    Warning Threshold: {(memoryBudget.warningThreshold * 100).toFixed(0)}%
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={0.9}
                    step={0.05}
                    value={memoryBudget.warningThreshold}
                    onChange={(e) => handleMemoryBudgetChange('warningThreshold', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Warnings */}
            {memoryStats && memoryStats.warnings.length > 0 && (
              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 8 }}>WARNINGS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {memoryStats.warnings.slice(-5).map((warning, index) => (
                    <div key={index} style={{ color: '#f97316', fontSize: 11 }}>
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={handleForceCleanup}
              style={{
                padding: '10px 16px',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Force Memory Cleanup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
