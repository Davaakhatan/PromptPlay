/**
 * useBackup Hook
 * React hook for backup management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { backupService, BackupEntry, BackupSettings } from '../services/BackupService';
import type { GameSpec } from '@promptplay/shared-types';

interface UseBackupOptions {
  projectPath: string | null;
  gameSpec: GameSpec | null;
  onRestore?: (spec: GameSpec) => void;
}

export function useBackup({ projectPath, gameSpec, onRestore }: UseBackupOptions) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [settings, setSettings] = useState<BackupSettings>(backupService.getSettings());
  const autoBackupRef = useRef<NodeJS.Timeout | null>(null);

  // Load backups
  useEffect(() => {
    const loadBackups = () => {
      setBackups(backupService.getBackups(projectPath || undefined));
      setSettings(backupService.getSettings());
    };

    loadBackups();
    const unsubscribe = backupService.subscribe(loadBackups);
    return unsubscribe;
  }, [projectPath]);

  // Set current project
  useEffect(() => {
    backupService.setCurrentProject(projectPath);
  }, [projectPath]);

  // Auto backup timer
  useEffect(() => {
    if (!settings.enabled || !projectPath || !gameSpec) {
      if (autoBackupRef.current) {
        clearInterval(autoBackupRef.current);
        autoBackupRef.current = null;
      }
      return;
    }

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    autoBackupRef.current = setInterval(() => {
      if (gameSpec && projectPath) {
        backupService.createAutoBackup(gameSpec, projectPath);
      }
    }, intervalMs);

    return () => {
      if (autoBackupRef.current) {
        clearInterval(autoBackupRef.current);
      }
    };
  }, [settings.enabled, settings.intervalMinutes, projectPath, gameSpec]);

  const createBackup = useCallback((description?: string) => {
    if (!gameSpec || !projectPath) return null;
    return backupService.createBackup(gameSpec, projectPath, 'manual', description);
  }, [gameSpec, projectPath]);

  const createSaveBackup = useCallback(() => {
    if (!gameSpec || !projectPath) return null;
    return backupService.createSaveBackup(gameSpec, projectPath);
  }, [gameSpec, projectPath]);

  const createExportBackup = useCallback(() => {
    if (!gameSpec || !projectPath) return null;
    return backupService.createExportBackup(gameSpec, projectPath);
  }, [gameSpec, projectPath]);

  const restoreBackup = useCallback((backupId: string) => {
    const spec = backupService.restoreBackup(backupId);
    if (spec && onRestore) {
      onRestore(spec);
    }
    return spec;
  }, [onRestore]);

  const deleteBackup = useCallback((backupId: string) => {
    backupService.deleteBackup(backupId);
  }, []);

  const deleteAllBackups = useCallback(() => {
    backupService.deleteAllBackups(projectPath || undefined);
  }, [projectPath]);

  const updateSettings = useCallback((newSettings: Partial<BackupSettings>) => {
    backupService.updateSettings(newSettings);
  }, []);

  return {
    backups,
    settings,
    stats: backupService.getBackupStats(),
    createBackup,
    createSaveBackup,
    createExportBackup,
    restoreBackup,
    deleteBackup,
    deleteAllBackups,
    updateSettings,
    formatSize: backupService.formatSize,
    formatTimestamp: backupService.formatTimestamp,
  };
}

export default useBackup;
