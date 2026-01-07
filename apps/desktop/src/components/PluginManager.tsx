/**
 * Plugin Manager Component
 * UI for managing plugins
 */

import { useState, useEffect } from 'react';
import { pluginService, InstalledPlugin, PluginManifest } from '../services/PluginService';

interface PluginManagerProps {
  onClose: () => void;
}

export function PluginManager({ onClose }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlugins();
    const unsubscribe = pluginService.subscribe(loadPlugins);
    return unsubscribe;
  }, []);

  const loadPlugins = () => {
    setPlugins(pluginService.getInstalledPlugins());
  };

  const handleTogglePlugin = async (pluginId: string) => {
    const plugin = plugins.find(p => p.manifest.id === pluginId);
    if (!plugin) return;

    if (plugin.state === 'active') {
      await pluginService.deactivatePlugin(pluginId);
    } else {
      // In a real implementation, you'd load the plugin module here
      console.log('Plugin activation would load the plugin module');
    }
  };

  const handleUninstall = async (pluginId: string) => {
    await pluginService.uninstallPlugin(pluginId);
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-600/20 text-green-400';
      case 'inactive': return 'bg-gray-600/20 text-gray-400';
      case 'error': return 'bg-red-600/20 text-red-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  // Sample plugins for the "Browse" tab (would come from API in real implementation)
  const availablePlugins: PluginManifest[] = [
    {
      id: 'pixel-art-tools',
      name: 'Pixel Art Tools',
      version: '1.0.0',
      description: 'Advanced pixel art drawing tools and palette management',
      author: 'PromptPlay Community',
      main: 'index.js',
      permissions: ['ui:panel', 'ui:toolbar', 'write:entities'],
    },
    {
      id: 'tilemap-generator',
      name: 'Tilemap Generator',
      version: '2.1.0',
      description: 'AI-powered tilemap generation from images',
      author: 'AI Tools Inc.',
      main: 'index.js',
      permissions: ['ui:panel', 'write:gameSpec', 'network:fetch'],
    },
    {
      id: 'sound-effects',
      name: 'Sound Effects Library',
      version: '1.5.0',
      description: 'Built-in library of game sound effects and music',
      author: 'Audio Masters',
      main: 'index.js',
      permissions: ['ui:panel', 'read:files'],
    },
    {
      id: 'version-control',
      name: 'Git Integration',
      version: '1.0.0',
      description: 'Git version control integration for your projects',
      author: 'DevTools',
      main: 'index.js',
      permissions: ['ui:panel', 'command:register', 'read:files', 'write:files'],
    },
  ];

  const filteredAvailablePlugins = availablePlugins.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Plugin Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-4 py-2 font-medium ${activeTab === 'installed' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Installed ({plugins.length})
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-medium ${activeTab === 'browse' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Browse Plugins
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'installed' ? (
            plugins.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="mb-2">No plugins installed</p>
                <p className="text-sm">Browse the plugin marketplace to find extensions for PromptPlay</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plugins.map(plugin => (
                  <div
                    key={plugin.manifest.id}
                    className="p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{plugin.manifest.name}</h3>
                          <span className="text-xs text-gray-500">v{plugin.manifest.version}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(plugin.state)}`}>
                            {plugin.state}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{plugin.manifest.description}</p>
                        <p className="text-xs text-gray-500 mt-1">by {plugin.manifest.author}</p>
                        {plugin.error && (
                          <p className="text-sm text-red-400 mt-2">{plugin.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleTogglePlugin(plugin.manifest.id)}
                          className={`px-3 py-1.5 rounded text-sm ${
                            plugin.state === 'active'
                              ? 'bg-gray-600 hover:bg-gray-500 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {plugin.state === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleUninstall(plugin.manifest.id)}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm"
                        >
                          Uninstall
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {filteredAvailablePlugins.map(plugin => {
                const isInstalled = plugins.some(p => p.manifest.id === plugin.id);
                return (
                  <div
                    key={plugin.id}
                    className="p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{plugin.name}</h3>
                          <span className="text-xs text-gray-500">v{plugin.version}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{plugin.description}</p>
                        <p className="text-xs text-gray-500 mt-1">by {plugin.author}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plugin.permissions.map(perm => (
                            <span key={perm} className="px-1.5 py-0.5 bg-gray-600/50 text-gray-400 rounded text-xs">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="ml-4">
                        {isInstalled ? (
                          <span className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-sm">
                            Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => pluginService.installPlugin(plugin)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between text-sm text-gray-400">
          <span>Plugins extend PromptPlay with new features and tools</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PluginManager;
