/**
 * Backup Service
 * Manages automatic and manual project backups
 */

import type { GameSpec } from '@promptplay/shared-types';

export interface BackupEntry {
  id: string;
  projectPath: string;
  projectName: string;
  timestamp: number;
  size: number;
  type: 'auto' | 'manual';
  description?: string;
  gameSpec: GameSpec;
}

export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number;
  maxBackups: number;
  backupOnSave: boolean;
  backupBeforeExport: boolean;
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalMinutes: 15,
  maxBackups: 50,
  backupOnSave: true,
  backupBeforeExport: true,
};

class BackupService {
  private settings: BackupSettings = DEFAULT_SETTINGS;
  private backups: BackupEntry[] = [];
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private currentProjectPath: string | null = null;
  private lastBackupTime: number = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSettings();
    this.loadBackups();
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('promptplay_backup_settings');
    if (saved) {
      try {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load backup settings:', e);
      }
    }
  }

  private saveSettings(): void {
    localStorage.setItem('promptplay_backup_settings', JSON.stringify(this.settings));
  }

  private loadBackups(): void {
    const saved = localStorage.getItem('promptplay_backups');
    if (saved) {
      try {
        this.backups = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load backups:', e);
        this.backups = [];
      }
    }
  }

  private saveBackupsList(): void {
    // Only save metadata, not full specs (to reduce localStorage usage)
    const metadata = this.backups.map(b => ({
      id: b.id,
      projectPath: b.projectPath,
      projectName: b.projectName,
      timestamp: b.timestamp,
      size: b.size,
      type: b.type,
      description: b.description,
    }));
    localStorage.setItem('promptplay_backups', JSON.stringify(metadata));
  }

  private saveBackupData(backup: BackupEntry): void {
    // Save full backup data separately
    localStorage.setItem(`promptplay_backup_${backup.id}`, JSON.stringify(backup.gameSpec));
  }

  private loadBackupData(backupId: string): GameSpec | null {
    const saved = localStorage.getItem(`promptplay_backup_${backupId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  private deleteBackupData(backupId: string): void {
    localStorage.removeItem(`promptplay_backup_${backupId}`);
  }

  private generateId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSize(spec: GameSpec): number {
    return new Blob([JSON.stringify(spec)]).size;
  }

  private enforceMaxBackups(): void {
    // Sort by timestamp descending
    this.backups.sort((a, b) => b.timestamp - a.timestamp);

    // Remove old backups beyond max
    while (this.backups.length > this.settings.maxBackups) {
      const removed = this.backups.pop();
      if (removed) {
        this.deleteBackupData(removed.id);
      }
    }
  }

  getSettings(): BackupSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<BackupSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();

    // Restart auto backup if interval changed
    if (settings.intervalMinutes !== undefined || settings.enabled !== undefined) {
      this.stopAutoBackup();
      if (this.settings.enabled && this.currentProjectPath) {
        this.startAutoBackup();
      }
    }

    this.notifyListeners();
  }

  startAutoBackup(): void {
    if (!this.settings.enabled || this.autoBackupInterval) return;

    const intervalMs = this.settings.intervalMinutes * 60 * 1000;
    this.autoBackupInterval = setInterval(() => {
      // Auto backup will be triggered by the component that has the game spec
      this.notifyListeners();
    }, intervalMs);
  }

  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  shouldAutoBackup(): boolean {
    if (!this.settings.enabled) return false;
    const now = Date.now();
    const intervalMs = this.settings.intervalMinutes * 60 * 1000;
    return now - this.lastBackupTime >= intervalMs;
  }

  setCurrentProject(projectPath: string | null): void {
    this.currentProjectPath = projectPath;
    if (projectPath && this.settings.enabled) {
      this.startAutoBackup();
    } else {
      this.stopAutoBackup();
    }
  }

  createBackup(
    gameSpec: GameSpec,
    projectPath: string,
    type: 'auto' | 'manual' = 'manual',
    description?: string
  ): BackupEntry {
    const backup: BackupEntry = {
      id: this.generateId(),
      projectPath,
      projectName: gameSpec.name || 'Untitled',
      timestamp: Date.now(),
      size: this.calculateSize(gameSpec),
      type,
      description,
      gameSpec,
    };

    this.backups.unshift(backup);
    this.saveBackupData(backup);
    this.enforceMaxBackups();
    this.saveBackupsList();

    this.lastBackupTime = Date.now();
    this.notifyListeners();

    return backup;
  }

  createAutoBackup(gameSpec: GameSpec, projectPath: string): BackupEntry | null {
    if (!this.shouldAutoBackup()) return null;
    return this.createBackup(gameSpec, projectPath, 'auto', 'Auto backup');
  }

  createSaveBackup(gameSpec: GameSpec, projectPath: string): BackupEntry | null {
    if (!this.settings.backupOnSave) return null;
    return this.createBackup(gameSpec, projectPath, 'auto', 'Pre-save backup');
  }

  createExportBackup(gameSpec: GameSpec, projectPath: string): BackupEntry | null {
    if (!this.settings.backupBeforeExport) return null;
    return this.createBackup(gameSpec, projectPath, 'auto', 'Pre-export backup');
  }

  getBackups(projectPath?: string): BackupEntry[] {
    let backups = [...this.backups];

    if (projectPath) {
      backups = backups.filter(b => b.projectPath === projectPath);
    }

    // Load full data for each backup
    return backups.map(b => ({
      ...b,
      gameSpec: this.loadBackupData(b.id) || b.gameSpec,
    }));
  }

  getBackup(backupId: string): BackupEntry | null {
    const backup = this.backups.find(b => b.id === backupId);
    if (!backup) return null;

    return {
      ...backup,
      gameSpec: this.loadBackupData(backupId) || backup.gameSpec,
    };
  }

  deleteBackup(backupId: string): void {
    const index = this.backups.findIndex(b => b.id === backupId);
    if (index >= 0) {
      this.backups.splice(index, 1);
      this.deleteBackupData(backupId);
      this.saveBackupsList();
      this.notifyListeners();
    }
  }

  deleteAllBackups(projectPath?: string): void {
    if (projectPath) {
      const toDelete = this.backups.filter(b => b.projectPath === projectPath);
      toDelete.forEach(b => this.deleteBackupData(b.id));
      this.backups = this.backups.filter(b => b.projectPath !== projectPath);
    } else {
      this.backups.forEach(b => this.deleteBackupData(b.id));
      this.backups = [];
    }
    this.saveBackupsList();
    this.notifyListeners();
  }

  restoreBackup(backupId: string): GameSpec | null {
    const backup = this.getBackup(backupId);
    return backup?.gameSpec || null;
  }

  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: number | null;
    newestBackup: number | null;
  } {
    const totalBackups = this.backups.length;
    const totalSize = this.backups.reduce((sum, b) => sum + b.size, 0);
    const timestamps = this.backups.map(b => b.timestamp);

    return {
      totalBackups,
      totalSize,
      oldestBackup: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestBackup: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} minutes ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const backupService = new BackupService();
export default backupService;
