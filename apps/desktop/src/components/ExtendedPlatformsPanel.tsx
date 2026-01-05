import { useState, useEffect, useCallback } from 'react';
import { platformExportService, Platform, PlatformConfig, ExportConfig } from '../services/PlatformExportService';
import { webGPURenderer, WebGPUCapabilities } from '../services/WebGPURenderer';

interface ExtendedPlatformsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (message: string) => void;
}

type TabType = 'consoles' | 'vr-ar' | 'pc' | 'mobile' | 'webgpu';

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'nintendo-switch':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M14.176 24h3.674c3.376 0 6.15-2.774 6.15-6.15V6.15C24 2.775 21.226 0 17.85 0H14.1c-.074 0-.15.074-.15.15v23.7c0 .076.076.15.226.15zm4.574-13.199a1.8 1.8 0 11-.001-3.6 1.8 1.8 0 01.001 3.6zM6.15 0C2.774 0 0 2.775 0 6.15v11.7C0 21.226 2.775 24 6.15 24h3.674c.15 0 .226-.074.226-.15V.15c0-.076-.076-.15-.15-.15zm.001 10.2a1.8 1.8 0 111.8 1.8 1.8 1.8 0 01-1.8-1.8z"/></svg>;
    case 'playstation':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.393-1.501zm4.659 16.82l6.953-2.234c.79-.253 1.008-.602 1.008-.602.63-.447.324-1.204-.483-.997l-7.478 2.381c0-.001-5.096 1.603-5.096 1.603-1.048.334-2.321.312-3.086-.436-.835-.816-.802-2.158-.802-2.158V16.9s0-.594.324-1.107c.324-.513.92-.81.92-.81l7.74-2.748v3.293l-5.096 1.645c-.61.196-1.002.483-.862.847.14.364.75.485 1.36.289l4.598-1.491v2.598z"/></svg>;
    case 'xbox':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.008 17.48 24 14.861 24 12c0-3.875-1.836-7.32-4.687-9.52-.727-.566-3.664 1.264-4.051 4.147zm-6.52 0C8.354 3.727 5.416 1.897 4.69 2.46 1.836 4.68 0 8.125 0 12c0 2.861.992 5.48 2.662 7.539-1.408-2.599 3.576-9.951 6.08-12.912z"/></svg>;
    case 'steam':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303a3.015 3.015 0 00-3.015-3.015 3.015 3.015 0 100 6.03 3.015 3.015 0 003.015-3.015zm-5.273-.005c0-1.264 1.027-2.286 2.291-2.286s2.286 1.022 2.286 2.286c0 1.263-1.022 2.29-2.286 2.29s-2.291-1.027-2.291-2.29z"/></svg>;
    case 'meta-quest':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.559c-1.097 1.38-2.762 2.201-4.544 2.201H10.65c-1.782 0-3.447-.821-4.544-2.201-.956-1.203-1.429-2.73-1.429-4.559s.473-3.356 1.429-4.559C7.203 6.061 8.868 5.24 10.65 5.24h2.7c1.782 0 3.447.821 4.544 2.201.956 1.203 1.429 2.73 1.429 4.559s-.473 3.356-1.429 4.559z"/></svg>;
    case 'ios-appstore':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>;
    case 'google-play':
      return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186c-.181-.085-.351-.208-.498-.372-.303-.338-.47-.793-.47-1.275V3.46c0-.482.167-.937.47-1.275.147-.164.317-.287.497-.371zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626c.572.331.93.93.93 1.553 0 .623-.357 1.222-.93 1.553l-2.807 1.626L14.5 12l3.198-3.491zM4.064 1.134l10.937 6.333-2.302 2.302-8.635-8.635z"/></svg>;
    case 'webxr':
      return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
    default:
      return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
  }
};

export function ExtendedPlatformsPanel({ isOpen, onClose, onNotification }: ExtendedPlatformsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('consoles');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [exportConfig, setExportConfig] = useState<Partial<ExportConfig>>({
    appName: 'My Game',
    bundleId: 'com.company.mygame',
    version: '1.0.0',
    buildNumber: 1,
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [webGPUCapabilities, setWebGPUCapabilities] = useState<WebGPUCapabilities | null>(null);
  const [checkingWebGPU, setCheckingWebGPU] = useState(false);

  useEffect(() => {
    const handleProgress = (data: unknown) => {
      const { progress } = data as { progress: number };
      setExportProgress(progress);
    };

    const handleCompleted = (data: unknown) => {
      const result = data as { success: boolean; platform: Platform };
      setExporting(false);
      setExportProgress(0);
      if (result.success) {
        onNotification(`Successfully exported to ${result.platform}!`);
      }
    };

    platformExportService.on('export-progress', handleProgress);
    platformExportService.on('export-completed', handleCompleted);

    return () => {
      platformExportService.off('export-progress', handleProgress);
      platformExportService.off('export-completed', handleCompleted);
    };
  }, [onNotification]);

  const checkWebGPUSupport = useCallback(async () => {
    setCheckingWebGPU(true);
    const capabilities = await webGPURenderer.getCapabilities();
    setWebGPUCapabilities(capabilities);
    setCheckingWebGPU(false);
  }, []);

  const handleExport = async () => {
    if (!selectedPlatform) return;

    const config: ExportConfig = {
      ...exportConfig,
      platform: selectedPlatform,
      appName: exportConfig.appName || 'My Game',
      bundleId: exportConfig.bundleId || 'com.company.mygame',
      version: exportConfig.version || '1.0.0',
      buildNumber: exportConfig.buildNumber || 1,
    };

    const validation = platformExportService.validateConfig(config);
    if (!validation.valid) {
      onNotification(`Validation errors: ${validation.errors.join(', ')}`);
      return;
    }

    setExporting(true);
    await platformExportService.exportToPlatform(config);
  };

  if (!isOpen) return null;

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'consoles', label: 'Consoles' },
    { id: 'vr-ar', label: 'VR/AR' },
    { id: 'pc', label: 'PC' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'webgpu', label: 'WebGPU' },
  ];

  const getTabIcon = (id: TabType) => {
    switch (id) {
      case 'consoles': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
      case 'vr-ar': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
      case 'pc': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'mobile': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
      case 'webgpu': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;
    }
  };

  const getCategoryPlatforms = (category: TabType): PlatformConfig[] => {
    if (category === 'webgpu') return [];
    return platformExportService.getPlatformsByCategory(category as PlatformConfig['category']);
  };

  const renderPlatformCard = (platform: PlatformConfig) => (
    <div
      key={platform.platform}
      onClick={() => setSelectedPlatform(platform.platform)}
      className={`bg-black/30 rounded-lg p-4 border cursor-pointer transition-all ${
        selectedPlatform === platform.platform
          ? 'border-accent bg-accent/10'
          : 'border-subtle hover:border-accent/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white">
          {getPlatformIcon(platform.platform)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{platform.name}</h4>
          <p className="text-xs text-text-secondary mt-1">{platform.sdkVersion}</p>
        </div>
        {platform.supported && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Ready</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {platform.features.slice(0, 3).map((feature, idx) => (
          <span key={idx} className="text-xs bg-white/5 text-text-secondary px-2 py-0.5 rounded">
            {feature}
          </span>
        ))}
        {platform.features.length > 3 && (
          <span className="text-xs text-text-tertiary">+{platform.features.length - 3} more</span>
        )}
      </div>
    </div>
  );

  const renderExportForm = () => {
    if (!selectedPlatform) return null;

    const platform = platformExportService.getPlatform(selectedPlatform);
    if (!platform) return null;

    return (
      <div className="bg-black/20 rounded-lg p-4 mt-4">
        <h3 className="text-sm font-medium text-white mb-4">Export to {platform.name}</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">App Name</label>
            <input
              type="text"
              value={exportConfig.appName || ''}
              onChange={(e) => setExportConfig({ ...exportConfig, appName: e.target.value })}
              className="w-full bg-black/30 border border-subtle rounded px-3 py-2 text-sm text-white"
              placeholder="My Game"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Bundle ID</label>
            <input
              type="text"
              value={exportConfig.bundleId || ''}
              onChange={(e) => setExportConfig({ ...exportConfig, bundleId: e.target.value })}
              className="w-full bg-black/30 border border-subtle rounded px-3 py-2 text-sm text-white"
              placeholder="com.company.mygame"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Version</label>
              <input
                type="text"
                value={exportConfig.version || ''}
                onChange={(e) => setExportConfig({ ...exportConfig, version: e.target.value })}
                className="w-full bg-black/30 border border-subtle rounded px-3 py-2 text-sm text-white"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Build Number</label>
              <input
                type="number"
                value={exportConfig.buildNumber || 1}
                onChange={(e) => setExportConfig({ ...exportConfig, buildNumber: parseInt(e.target.value) || 1 })}
                className="w-full bg-black/30 border border-subtle rounded px-3 py-2 text-sm text-white"
                min={1}
              />
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs text-text-secondary mb-2">Requirements</h4>
            <ul className="space-y-1">
              {platform.requirements.map((req, idx) => (
                <li key={idx} className="text-xs text-text-tertiary flex items-center gap-2">
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {exporting && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>Exporting...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full mt-4 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
          >
            {exporting ? 'Exporting...' : `Export to ${platform.name}`}
          </button>
        </div>
      </div>
    );
  };

  const renderWebGPUTab = () => (
    <div className="space-y-6">
      <div className="bg-black/30 rounded-lg p-4 border border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-white">WebGPU Support</h3>
            <p className="text-xs text-text-secondary mt-1">Next-generation graphics API</p>
          </div>
          <button
            onClick={checkWebGPUSupport}
            disabled={checkingWebGPU}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            {checkingWebGPU ? 'Checking...' : 'Check Support'}
          </button>
        </div>

        {webGPUCapabilities && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {webGPUCapabilities.supported ? (
                <>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-400 text-sm font-medium">WebGPU Supported</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-400 text-sm font-medium">WebGPU Not Supported</span>
                </>
              )}
            </div>

            {webGPUCapabilities.supported && (
              <>
                <div>
                  <h4 className="text-xs text-text-secondary mb-2">Adapter</h4>
                  <p className="text-sm text-white">{webGPUCapabilities.adapter}</p>
                </div>

                <div>
                  <h4 className="text-xs text-text-secondary mb-2">Preferred Format</h4>
                  <p className="text-sm text-white">{webGPUCapabilities.preferredFormat}</p>
                </div>

                <div>
                  <h4 className="text-xs text-text-secondary mb-2">Features ({webGPUCapabilities.features.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {webGPUCapabilities.features.slice(0, 10).map((feature, idx) => (
                      <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                        {feature}
                      </span>
                    ))}
                    {webGPUCapabilities.features.length > 10 && (
                      <span className="text-xs text-text-tertiary">+{webGPUCapabilities.features.length - 10} more</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-text-secondary mb-2">Key Limits</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(webGPUCapabilities.limits).slice(0, 8).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-text-tertiary">{key.replace('max', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-white">{value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!webGPUCapabilities.supported && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                <h4 className="text-sm font-medium text-amber-400 mb-2">Fallback Available</h4>
                <p className="text-xs text-text-secondary mb-2">
                  WebGPU is not available. The engine will use WebGL2 as a fallback.
                </p>
                <ul className="text-xs text-text-tertiary space-y-1">
                  <li>Update to Chrome 113+ or Firefox 121+</li>
                  <li>Enable WebGPU flag in browser settings</li>
                  <li>Check GPU driver compatibility</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-black/30 rounded-lg p-4 border border-subtle">
        <h3 className="text-sm font-medium text-white mb-3">WebGPU Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Compute Shaders', desc: 'GPU-accelerated physics & particles', enabled: true },
            { name: 'Bindless Textures', desc: 'Unlimited texture bindings', enabled: true },
            { name: 'Mesh Shaders', desc: 'Advanced geometry processing', enabled: false },
            { name: 'Ray Tracing', desc: 'Real-time ray tracing (experimental)', enabled: false },
            { name: 'Variable Rate Shading', desc: 'Performance optimization', enabled: true },
            { name: 'Multi-Draw Indirect', desc: 'Batch rendering', enabled: true },
          ].map((feature, idx) => (
            <div key={idx} className={`p-3 rounded border ${feature.enabled ? 'border-green-500/20 bg-green-500/5' : 'border-subtle bg-black/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{feature.name}</span>
                {feature.enabled ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs text-amber-400">Soon</span>
                )}
              </div>
              <p className="text-xs text-text-tertiary mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl w-[1000px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-white">Extended Platforms</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedPlatform(null); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-accent'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {getTabIcon(tab.id)}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'webgpu' ? (
            renderWebGPUTab()
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {getCategoryPlatforms(activeTab).map(renderPlatformCard)}
            </div>
          )}

          {activeTab !== 'webgpu' && renderExportForm()}
        </div>
      </div>
    </div>
  );
}

export default ExtendedPlatformsPanel;
