/**
 * BackupService Tests
 * Tests for automatic and manual project backup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameSpec } from '@promptplay/shared-types';

// Mock localStorage before importing the service
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
};

vi.stubGlobal('localStorage', localStorageMock);

// Mock Blob for size calculation
vi.stubGlobal('Blob', class MockBlob {
  size: number;
  constructor(parts: string[]) {
    this.size = parts.join('').length;
  }
});

// Import the service after mocking
import backupService from '../../src/services/BackupService';

// Mock GameSpec for testing
const createMockGameSpec = (title = 'Test Game'): GameSpec => ({
  version: '1.0',
  metadata: {
    title,
    genre: 'platformer',
    description: 'Test game',
  },
  config: {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 },
  },
  entities: [
    {
      name: 'player',
      components: {
        Transform: { x: 0, y: 0 },
      },
    },
  ],
  systems: [],
});

describe('BackupService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    backupService.stopAutoBackup();
    // Clean up backups
    backupService.deleteAllBackups();
  });

  describe('Settings Management', () => {
    it('should return default settings', () => {
      const settings = backupService.getSettings();

      expect(settings.enabled).toBe(true);
      expect(settings.intervalMinutes).toBe(15);
      expect(settings.maxBackups).toBe(50);
      expect(settings.backupOnSave).toBe(true);
      expect(settings.backupBeforeExport).toBe(true);
    });

    it('should update settings', () => {
      backupService.updateSettings({ intervalMinutes: 30, maxBackups: 100 });

      const settings = backupService.getSettings();
      expect(settings.intervalMinutes).toBe(30);
      expect(settings.maxBackups).toBe(100);

      // Reset to defaults
      backupService.updateSettings({ intervalMinutes: 15, maxBackups: 50 });
    });

    it('should persist settings to localStorage', () => {
      backupService.updateSettings({ enabled: false });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'promptplay_backup_settings',
        expect.any(String)
      );

      // Reset
      backupService.updateSettings({ enabled: true });
    });
  });

  describe('Backup Creation', () => {
    it('should create a manual backup', () => {
      const gameSpec = createMockGameSpec();
      const projectPath = '/test/project';

      const backup = backupService.createBackup(gameSpec, projectPath, 'manual', 'Test backup');

      expect(backup).toBeDefined();
      expect(backup.id).toMatch(/^backup_/);
      expect(backup.projectPath).toBe(projectPath);
      expect(backup.projectName).toBe('Test Game');
      expect(backup.type).toBe('manual');
      expect(backup.description).toBe('Test backup');
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.gameSpec).toEqual(gameSpec);
    });

    it('should create an auto backup', () => {
      const gameSpec = createMockGameSpec();
      const projectPath = '/test/project';

      // Set last backup time to past
      vi.setSystemTime(Date.now() + 20 * 60 * 1000); // 20 minutes later

      const backup = backupService.createAutoBackup(gameSpec, projectPath);

      expect(backup).toBeDefined();
      expect(backup?.type).toBe('auto');
      expect(backup?.description).toBe('Auto backup');
    });

    it('should not create auto backup if interval not elapsed', () => {
      const gameSpec = createMockGameSpec();
      const projectPath = '/test/project';

      // Create first backup
      backupService.createBackup(gameSpec, projectPath, 'manual');

      // Try to create auto backup immediately
      const backup = backupService.createAutoBackup(gameSpec, projectPath);

      expect(backup).toBeNull();
    });

    it('should create pre-save backup when enabled', () => {
      const gameSpec = createMockGameSpec();
      const projectPath = '/test/project';

      const backup = backupService.createSaveBackup(gameSpec, projectPath);

      expect(backup).toBeDefined();
      expect(backup?.description).toBe('Pre-save backup');
    });

    it('should not create pre-save backup when disabled', () => {
      backupService.updateSettings({ backupOnSave: false });
      const gameSpec = createMockGameSpec();

      const backup = backupService.createSaveBackup(gameSpec, '/test');

      expect(backup).toBeNull();

      // Reset
      backupService.updateSettings({ backupOnSave: true });
    });

    it('should create pre-export backup when enabled', () => {
      const gameSpec = createMockGameSpec();
      const projectPath = '/test/project';

      const backup = backupService.createExportBackup(gameSpec, projectPath);

      expect(backup).toBeDefined();
      expect(backup?.description).toBe('Pre-export backup');
    });

    it('should not create pre-export backup when disabled', () => {
      backupService.updateSettings({ backupBeforeExport: false });
      const gameSpec = createMockGameSpec();

      const backup = backupService.createExportBackup(gameSpec, '/test');

      expect(backup).toBeNull();

      // Reset
      backupService.updateSettings({ backupBeforeExport: true });
    });
  });

  describe('Backup Retrieval', () => {
    it('should get all backups', () => {
      const gameSpec = createMockGameSpec();

      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project2', 'manual');

      const backups = backupService.getBackups();

      expect(backups).toHaveLength(2);
    });

    it('should filter backups by project path', () => {
      const gameSpec = createMockGameSpec();

      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project2', 'manual');

      const backups = backupService.getBackups('/project1');

      expect(backups).toHaveLength(2);
      expect(backups.every(b => b.projectPath === '/project1')).toBe(true);
    });

    it('should get specific backup by ID', () => {
      const gameSpec = createMockGameSpec('Specific Game');

      const created = backupService.createBackup(gameSpec, '/test', 'manual');
      const retrieved = backupService.getBackup(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.projectName).toBe('Specific Game');
    });

    it('should return null for non-existent backup', () => {
      const backup = backupService.getBackup('non_existent_id');

      expect(backup).toBeNull();
    });
  });

  describe('Backup Deletion', () => {
    it('should delete a specific backup', () => {
      const gameSpec = createMockGameSpec();

      const backup = backupService.createBackup(gameSpec, '/test', 'manual');
      expect(backupService.getBackups()).toHaveLength(1);

      backupService.deleteBackup(backup.id);

      expect(backupService.getBackups()).toHaveLength(0);
    });

    it('should delete all backups for a project', () => {
      const gameSpec = createMockGameSpec();

      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project2', 'manual');

      backupService.deleteAllBackups('/project1');

      const remaining = backupService.getBackups();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].projectPath).toBe('/project2');
    });

    it('should delete all backups when no project specified', () => {
      const gameSpec = createMockGameSpec();

      backupService.createBackup(gameSpec, '/project1', 'manual');
      backupService.createBackup(gameSpec, '/project2', 'manual');

      backupService.deleteAllBackups();

      expect(backupService.getBackups()).toHaveLength(0);
    });
  });

  describe('Backup Restoration', () => {
    it('should restore backup and return GameSpec', () => {
      const gameSpec = createMockGameSpec('Restorable Game');

      const backup = backupService.createBackup(gameSpec, '/test', 'manual');
      const restored = backupService.restoreBackup(backup.id);

      expect(restored).toEqual(gameSpec);
    });

    it('should return null for non-existent backup', () => {
      const restored = backupService.restoreBackup('fake_id');

      expect(restored).toBeNull();
    });
  });

  describe('Max Backups Enforcement', () => {
    afterEach(() => {
      // Reset max backups setting
      backupService.updateSettings({ maxBackups: 50 });
    });

    it('should enforce max backups limit', () => {
      backupService.updateSettings({ maxBackups: 3 });
      const gameSpec = createMockGameSpec();

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000); // Ensure different timestamps
        backupService.createBackup(gameSpec, '/test', 'manual', `Backup ${i}`);
      }

      const backups = backupService.getBackups();
      expect(backups).toHaveLength(3);
    });

    it('should keep newest backups when enforcing limit', () => {
      backupService.updateSettings({ maxBackups: 2 });
      const gameSpec = createMockGameSpec();

      vi.setSystemTime(1000);
      backupService.createBackup(gameSpec, '/test', 'manual', 'Old');

      vi.setSystemTime(2000);
      backupService.createBackup(gameSpec, '/test', 'manual', 'Medium');

      vi.setSystemTime(3000);
      backupService.createBackup(gameSpec, '/test', 'manual', 'New');

      const backups = backupService.getBackups();
      const descriptions = backups.map(b => b.description);

      expect(descriptions).not.toContain('Old');
      expect(descriptions).toContain('New');
    });
  });

  describe('Statistics', () => {
    it('should return correct backup stats', () => {
      const gameSpec = createMockGameSpec();

      vi.setSystemTime(1000);
      backupService.createBackup(gameSpec, '/test', 'manual');

      vi.setSystemTime(2000);
      backupService.createBackup(gameSpec, '/test', 'manual');

      const stats = backupService.getBackupStats();

      expect(stats.totalBackups).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBe(1000);
      expect(stats.newestBackup).toBe(2000);
    });

    it('should return null timestamps when no backups', () => {
      const stats = backupService.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.oldestBackup).toBeNull();
      expect(stats.newestBackup).toBeNull();
    });
  });

  describe('Formatting Utilities', () => {
    it('should format bytes correctly', () => {
      expect(backupService.formatSize(500)).toBe('500 B');
      expect(backupService.formatSize(1024)).toBe('1.0 KB');
      expect(backupService.formatSize(1536)).toBe('1.5 KB');
      expect(backupService.formatSize(1048576)).toBe('1.0 MB');
      expect(backupService.formatSize(1572864)).toBe('1.5 MB');
    });

    it('should format timestamps correctly', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(backupService.formatTimestamp(now - 30 * 1000)).toBe('Just now');
      expect(backupService.formatTimestamp(now - 5 * 60 * 1000)).toBe('5 minutes ago');
      expect(backupService.formatTimestamp(now - 3 * 60 * 60 * 1000)).toBe('3 hours ago');
      expect(backupService.formatTimestamp(now - 2 * 24 * 60 * 60 * 1000)).toBe('2 days ago');
    });
  });

  describe('Auto Backup', () => {
    afterEach(() => {
      backupService.setCurrentProject(null);
      backupService.updateSettings({ enabled: true });
    });

    it('should start auto backup when project is set', () => {
      // Advance time to ensure interval has elapsed
      vi.advanceTimersByTime(20 * 60 * 1000);
      backupService.setCurrentProject('/test/project');

      // Auto backup should be running (internal interval set)
      // We can verify by checking shouldAutoBackup behavior
      expect(backupService.shouldAutoBackup()).toBe(true);
    });

    it('should respect enabled setting', () => {
      backupService.updateSettings({ enabled: false });

      expect(backupService.shouldAutoBackup()).toBe(false);
    });
  });

  describe('Subscription', () => {
    it('should notify listeners on backup creation', () => {
      const listener = vi.fn();
      backupService.subscribe(listener);

      backupService.createBackup(createMockGameSpec(), '/test', 'manual');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on backup deletion', () => {
      const listener = vi.fn();
      const backup = backupService.createBackup(createMockGameSpec(), '/test', 'manual');

      backupService.subscribe(listener);
      listener.mockClear();

      backupService.deleteBackup(backup.id);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = backupService.subscribe(listener);

      unsubscribe();
      backupService.createBackup(createMockGameSpec(), '/test', 'manual');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
