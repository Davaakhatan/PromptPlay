/**
 * Plugin Service
 * Manages loading, lifecycle, and API for plugins
 */

import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  main: string;
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
  engines?: {
    promptplay: string;
  };
}

export type PluginPermission =
  | 'read:gameSpec'
  | 'write:gameSpec'
  | 'read:entities'
  | 'write:entities'
  | 'read:files'
  | 'write:files'
  | 'ui:panel'
  | 'ui:toolbar'
  | 'ui:menu'
  | 'ui:contextMenu'
  | 'command:register'
  | 'event:subscribe'
  | 'network:fetch';

export interface PluginContext {
  // Game spec access
  getGameSpec: () => GameSpec | null;
  setGameSpec: (spec: GameSpec) => void;

  // Entity operations
  getEntity: (name: string) => EntitySpec | undefined;
  createEntity: (entity: EntitySpec) => void;
  updateEntity: (name: string, updates: Partial<EntitySpec>) => void;
  deleteEntity: (name: string) => void;

  // UI extensions
  registerPanel: (panel: PluginPanel) => () => void;
  registerToolbarButton: (button: PluginToolbarButton) => () => void;
  registerMenuItem: (item: PluginMenuItem) => () => void;
  registerContextMenuItem: (item: PluginContextMenuItem) => () => void;

  // Commands
  registerCommand: (command: PluginCommand) => () => void;
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<unknown>;

  // Events
  on: (event: PluginEvent, handler: (...args: unknown[]) => void) => () => void;
  emit: (event: string, ...args: unknown[]) => void;

  // Storage
  getStorage: (key: string) => unknown;
  setStorage: (key: string, value: unknown) => void;

  // Notifications
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  // Dialogs
  showDialog: (options: DialogOptions) => Promise<DialogResult>;

  // Logger
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface PluginPanel {
  id: string;
  title: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  render: () => HTMLElement | null;
}

export interface PluginToolbarButton {
  id: string;
  title: string;
  icon: string;
  onClick: () => void;
  isActive?: () => boolean;
}

export interface PluginMenuItem {
  id: string;
  label: string;
  menu: 'file' | 'edit' | 'view' | 'tools' | 'help';
  accelerator?: string;
  onClick: () => void;
}

export interface PluginContextMenuItem {
  id: string;
  label: string;
  context: 'entity' | 'file' | 'canvas';
  onClick: (target: unknown) => void;
}

export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export type PluginEvent =
  | 'gameSpec:changed'
  | 'entity:created'
  | 'entity:updated'
  | 'entity:deleted'
  | 'entity:selected'
  | 'project:opened'
  | 'project:saved'
  | 'play:started'
  | 'play:stopped';

export interface DialogOptions {
  title: string;
  message: string;
  type?: 'info' | 'confirm' | 'prompt';
  defaultValue?: string;
  buttons?: string[];
}

export interface DialogResult {
  confirmed: boolean;
  value?: string;
  button?: string;
}

export interface Plugin {
  manifest: PluginManifest;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export type PluginState = 'installed' | 'active' | 'inactive' | 'error';

export interface InstalledPlugin {
  manifest: PluginManifest;
  state: PluginState;
  error?: string;
  installedAt: number;
  updatedAt: number;
}

class PluginService {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private activePlugins: Map<string, Plugin> = new Map();
  private panels: Map<string, PluginPanel> = new Map();
  private toolbarButtons: Map<string, PluginToolbarButton> = new Map();
  private menuItems: Map<string, PluginMenuItem> = new Map();
  private contextMenuItems: Map<string, PluginContextMenuItem> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private eventHandlers: Map<PluginEvent, Set<(...args: unknown[]) => void>> = new Map();
  private listeners: Set<() => void> = new Set();

  // Context provided to plugins
  private gameSpec: GameSpec | null = null;
  private setGameSpecCallback: ((spec: GameSpec) => void) | null = null;
  private notificationCallback: ((message: string, type?: string) => void) | null = null;

  constructor() {
    this.loadInstalledPlugins();
  }

  private loadInstalledPlugins(): void {
    const saved = localStorage.getItem('promptplay_plugins');
    if (saved) {
      try {
        const plugins = JSON.parse(saved) as InstalledPlugin[];
        plugins.forEach(p => this.plugins.set(p.manifest.id, p));
      } catch (e) {
        console.error('Failed to load plugins:', e);
      }
    }
  }

  private saveInstalledPlugins(): void {
    const plugins = Array.from(this.plugins.values());
    localStorage.setItem('promptplay_plugins', JSON.stringify(plugins));
  }

  setContext(
    gameSpec: GameSpec | null,
    setGameSpec: (spec: GameSpec) => void,
    showNotification: (message: string, type?: string) => void
  ): void {
    this.gameSpec = gameSpec;
    this.setGameSpecCallback = setGameSpec;
    this.notificationCallback = showNotification;
  }

  private createContext(pluginId: string): PluginContext {
    const plugin = this.plugins.get(pluginId);
    const permissions = plugin?.manifest.permissions || [];

    const hasPermission = (perm: PluginPermission) => permissions.includes(perm);

    return {
      getGameSpec: () => {
        if (!hasPermission('read:gameSpec')) {
          throw new Error('Plugin does not have read:gameSpec permission');
        }
        return this.gameSpec;
      },

      setGameSpec: (spec: GameSpec) => {
        if (!hasPermission('write:gameSpec')) {
          throw new Error('Plugin does not have write:gameSpec permission');
        }
        this.setGameSpecCallback?.(spec);
        this.emit('gameSpec:changed', spec);
      },

      getEntity: (name: string) => {
        if (!hasPermission('read:entities')) {
          throw new Error('Plugin does not have read:entities permission');
        }
        return this.gameSpec?.entities?.find(e => e.name === name);
      },

      createEntity: (entity: EntitySpec) => {
        if (!hasPermission('write:entities')) {
          throw new Error('Plugin does not have write:entities permission');
        }
        if (this.gameSpec) {
          const newSpec = {
            ...this.gameSpec,
            entities: [...(this.gameSpec.entities || []), entity],
          };
          this.setGameSpecCallback?.(newSpec);
          this.emit('entity:created', entity);
        }
      },

      updateEntity: (name: string, updates: Partial<EntitySpec>) => {
        if (!hasPermission('write:entities')) {
          throw new Error('Plugin does not have write:entities permission');
        }
        if (this.gameSpec) {
          const newSpec = {
            ...this.gameSpec,
            entities: this.gameSpec.entities?.map(e =>
              e.name === name ? { ...e, ...updates } : e
            ),
          };
          this.setGameSpecCallback?.(newSpec);
          this.emit('entity:updated', name, updates);
        }
      },

      deleteEntity: (name: string) => {
        if (!hasPermission('write:entities')) {
          throw new Error('Plugin does not have write:entities permission');
        }
        if (this.gameSpec) {
          const newSpec = {
            ...this.gameSpec,
            entities: this.gameSpec.entities?.filter(e => e.name !== name),
          };
          this.setGameSpecCallback?.(newSpec);
          this.emit('entity:deleted', name);
        }
      },

      registerPanel: (panel: PluginPanel) => {
        if (!hasPermission('ui:panel')) {
          throw new Error('Plugin does not have ui:panel permission');
        }
        const id = `${pluginId}:${panel.id}`;
        this.panels.set(id, { ...panel, id });
        this.notifyListeners();
        return () => {
          this.panels.delete(id);
          this.notifyListeners();
        };
      },

      registerToolbarButton: (button: PluginToolbarButton) => {
        if (!hasPermission('ui:toolbar')) {
          throw new Error('Plugin does not have ui:toolbar permission');
        }
        const id = `${pluginId}:${button.id}`;
        this.toolbarButtons.set(id, { ...button, id });
        this.notifyListeners();
        return () => {
          this.toolbarButtons.delete(id);
          this.notifyListeners();
        };
      },

      registerMenuItem: (item: PluginMenuItem) => {
        if (!hasPermission('ui:menu')) {
          throw new Error('Plugin does not have ui:menu permission');
        }
        const id = `${pluginId}:${item.id}`;
        this.menuItems.set(id, { ...item, id });
        this.notifyListeners();
        return () => {
          this.menuItems.delete(id);
          this.notifyListeners();
        };
      },

      registerContextMenuItem: (item: PluginContextMenuItem) => {
        if (!hasPermission('ui:contextMenu')) {
          throw new Error('Plugin does not have ui:contextMenu permission');
        }
        const id = `${pluginId}:${item.id}`;
        this.contextMenuItems.set(id, { ...item, id });
        this.notifyListeners();
        return () => {
          this.contextMenuItems.delete(id);
          this.notifyListeners();
        };
      },

      registerCommand: (command: PluginCommand) => {
        if (!hasPermission('command:register')) {
          throw new Error('Plugin does not have command:register permission');
        }
        const id = `${pluginId}:${command.id}`;
        this.commands.set(id, { ...command, id });
        return () => {
          this.commands.delete(id);
        };
      },

      executeCommand: async (commandId: string, ...args: unknown[]) => {
        const command = this.commands.get(commandId);
        if (!command) {
          throw new Error(`Command not found: ${commandId}`);
        }
        return command.handler(...args);
      },

      on: (event: PluginEvent, handler: (...args: unknown[]) => void) => {
        if (!hasPermission('event:subscribe')) {
          throw new Error('Plugin does not have event:subscribe permission');
        }
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
        return () => {
          this.eventHandlers.get(event)?.delete(handler);
        };
      },

      emit: (event: string, ...args: unknown[]) => {
        this.emit(event as PluginEvent, ...args);
      },

      getStorage: (key: string) => {
        const storage = localStorage.getItem(`promptplay_plugin_${pluginId}`);
        if (storage) {
          try {
            const data = JSON.parse(storage);
            return data[key];
          } catch {
            return undefined;
          }
        }
        return undefined;
      },

      setStorage: (key: string, value: unknown) => {
        const storageKey = `promptplay_plugin_${pluginId}`;
        const storage = localStorage.getItem(storageKey);
        let data: Record<string, unknown> = {};
        if (storage) {
          try {
            data = JSON.parse(storage);
          } catch {
            // ignore
          }
        }
        data[key] = value;
        localStorage.setItem(storageKey, JSON.stringify(data));
      },

      showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
        this.notificationCallback?.(message, type);
      },

      showDialog: async (options: DialogOptions): Promise<DialogResult> => {
        // Simple implementation using browser dialogs
        if (options.type === 'confirm') {
          const confirmed = window.confirm(`${options.title}\n\n${options.message}`);
          return { confirmed };
        } else if (options.type === 'prompt') {
          const value = window.prompt(`${options.title}\n\n${options.message}`, options.defaultValue);
          return { confirmed: value !== null, value: value || undefined };
        } else {
          window.alert(`${options.title}\n\n${options.message}`);
          return { confirmed: true };
        }
      },

      log: (message: string, ...args: unknown[]) => {
        console.log(`[Plugin:${pluginId}]`, message, ...args);
      },

      warn: (message: string, ...args: unknown[]) => {
        console.warn(`[Plugin:${pluginId}]`, message, ...args);
      },

      error: (message: string, ...args: unknown[]) => {
        console.error(`[Plugin:${pluginId}]`, message, ...args);
      },
    };
  }

  private emit(event: PluginEvent, ...args: unknown[]): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async installPlugin(manifest: PluginManifest): Promise<void> {
    const installed: InstalledPlugin = {
      manifest,
      state: 'installed',
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.plugins.set(manifest.id, installed);
    this.saveInstalledPlugins();
    this.notifyListeners();
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId);
    this.plugins.delete(pluginId);
    localStorage.removeItem(`promptplay_plugin_${pluginId}`);
    this.saveInstalledPlugins();
    this.notifyListeners();
  }

  async activatePlugin(pluginId: string, plugin: Plugin): Promise<void> {
    const installed = this.plugins.get(pluginId);
    if (!installed) {
      throw new Error(`Plugin not installed: ${pluginId}`);
    }

    try {
      const context = this.createContext(pluginId);
      await plugin.activate(context);
      this.activePlugins.set(pluginId, plugin);
      installed.state = 'active';
      installed.error = undefined;
      this.saveInstalledPlugins();
      this.notifyListeners();
    } catch (e) {
      installed.state = 'error';
      installed.error = e instanceof Error ? e.message : 'Unknown error';
      this.saveInstalledPlugins();
      this.notifyListeners();
      throw e;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.activePlugins.get(pluginId);
    if (plugin) {
      try {
        await plugin.deactivate?.();
      } catch (e) {
        console.error(`Error deactivating plugin ${pluginId}:`, e);
      }
      this.activePlugins.delete(pluginId);
    }

    const installed = this.plugins.get(pluginId);
    if (installed) {
      installed.state = 'inactive';
      this.saveInstalledPlugins();
    }

    // Clean up registered items
    for (const [id] of this.panels) {
      if (id.startsWith(`${pluginId}:`)) {
        this.panels.delete(id);
      }
    }
    for (const [id] of this.toolbarButtons) {
      if (id.startsWith(`${pluginId}:`)) {
        this.toolbarButtons.delete(id);
      }
    }
    for (const [id] of this.menuItems) {
      if (id.startsWith(`${pluginId}:`)) {
        this.menuItems.delete(id);
      }
    }
    for (const [id] of this.commands) {
      if (id.startsWith(`${pluginId}:`)) {
        this.commands.delete(id);
      }
    }

    this.notifyListeners();
  }

  getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  getPanels(): PluginPanel[] {
    return Array.from(this.panels.values());
  }

  getToolbarButtons(): PluginToolbarButton[] {
    return Array.from(this.toolbarButtons.values());
  }

  getMenuItems(menu: string): PluginMenuItem[] {
    return Array.from(this.menuItems.values()).filter(item => item.menu === menu);
  }

  getCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const pluginService = new PluginService();
export default pluginService;
