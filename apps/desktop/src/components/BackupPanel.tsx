/**
 * Backup Panel Component
 * UI for managing project backups
 */

import { useState, useEffect } from 'react';
import { backupService, BackupEntry, BackupSettings } from '../services/BackupService';
import type { GameSpec } from '@promptplay/shared-types';
import { TabContent } from './ui/TabContent';

interface BackupPanelProps {
  projectPath: string | null;
  gameSpec: GameSpec | null;
  onRestore: (spec: GameSpec) => void;
  onClose: () => void;
  onNotification?: (msg: string) => void;
}

export function BackupPanel({ projectPath, gameSpec, onRestore, onClose, onNotification }: BackupPanelProps) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [settings, setSettings] = useState<BackupSettings>(backupService.getSettings());
  const [activeTab, setActiveTab] = useState<'backups' | 'settings'>('backups');
  const [filter, setFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
    const unsubscribe = backupService.subscribe(loadBackups);
    return unsubscribe;
  }, [projectPath]);

  const loadBackups = () => {
    setBackups(backupService.getBackups(projectPath || undefined));
    setSettings(backupService.getSettings());
  };

  const handleCreateBackup = () => {
    if (gameSpec && projectPath) {
      backupService.createBackup(gameSpec, projectPath, 'manual', 'Manual backup');
      onNotification?.('Backup created successfully');
    }
  };

  const handleRestore = (backupId: string) => {
    const spec = backupService.restoreBackup(backupId);
    if (spec) {
      onRestore(spec);
      onNotification?.('Project restored from backup');
      onClose();
    }
  };

  const handleDelete = (backupId: string) => {
    backupService.deleteBackup(backupId);
    setConfirmDelete(null);
    onNotification?.('Backup deleted');
  };

  const handleDeleteAll = () => {
    backupService.deleteAllBackups(projectPath || undefined);
    onNotification?.('All backups deleted');
  };

  const handleSettingChange = <K extends keyof BackupSettings>(key: K, value: BackupSettings[K]) => {
    backupService.updateSettings({ [key]: value });
    setSettings(backupService.getSettings());
  };

  const filteredBackups = backups.filter(b => {
    if (filter === 'all') return true;
    return b.type === filter;
  });

  const stats = backupService.getBackupStats();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Project Backups</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-2 font-medium ${activeTab === 'backups' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Backups ({backups.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium ${activeTab === 'settings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 relative">
          <TabContent isActive={activeTab === 'backups'}>
            {/* Actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBackup}
                    disabled={!gameSpec || !projectPath}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white"
                  >
                    Create Backup
                  </button>
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value as typeof filter)}
                    className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    <option value="all">All Backups</option>
                    <option value="manual">Manual Only</option>
                    <option value="auto">Auto Only</option>
                  </select>
                </div>
                <div className="text-sm text-gray-400">
                  {backupService.formatSize(stats.totalSize)} used
                </div>
              </div>

              {/* Backup List */}
              {filteredBackups.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No backups found. Create one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBackups.map(backup => (
                    <div
                      key={backup.id}
                      className="p-3 bg-gray-700/50 rounded hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">
                            {backup.projectName}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${backup.type === 'manual' ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-600 text-gray-300'}`}>
                            {backup.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-3">
                          <span>{backupService.formatTimestamp(backup.timestamp)}</span>
                          <span>{backupService.formatSize(backup.size)}</span>
                          {backup.description && (
                            <span className="text-gray-500">- {backup.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleRestore(backup.id)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                        >
                          Restore
                        </button>
                        {confirmDelete === backup.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(backup.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(backup.id)}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </TabContent>

          <TabContent isActive={activeTab === 'settings'}>
            {/* Settings Tab */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Auto Backup</div>
                  <div className="text-sm text-gray-400">Automatically backup at intervals</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={e => handleSettingChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="text-white font-medium block mb-2">
                  Backup Interval (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.intervalMinutes}
                  onChange={e => handleSettingChange('intervalMinutes', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">
                  Maximum Backups
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.maxBackups}
                  onChange={e => handleSettingChange('maxBackups', parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <div className="text-sm text-gray-400 mt-1">
                  Oldest backups will be removed when limit is reached
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Backup on Save</div>
                  <div className="text-sm text-gray-400">Create backup before saving</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backupOnSave}
                    onChange={e => handleSettingChange('backupOnSave', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Backup Before Export</div>
                  <div className="text-sm text-gray-400">Create backup before exporting</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backupBeforeExport}
                    onChange={e => handleSettingChange('backupBeforeExport', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded"
                >
                  Delete All Backups
                </button>
              </div>
            </div>
          </TabContent>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackupPanel;
