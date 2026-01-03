/**
 * GamePackageService - Export and import complete game packages
 *
 * Handles .promptplay.json files that bundle:
 * - Game specification (game.json)
 * - Embedded assets (images, audio as base64)
 * - Custom prefabs
 * - Optional chat history
 */

import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import type {
  GamePackage,
  GameSpec,
  Prefab,
  EmbeddedAsset,
  PackageMetadata,
  ChatMessage,
} from '@promptplay/shared-types';
import { fileSystem, TauriFileSystem } from './FileSystem';

/** File extension for PromptPlay game packages */
export const PACKAGE_EXTENSION = '.promptplay.json';

/** Current package format version */
export const PACKAGE_FORMAT_VERSION = '1.0' as const;

/** Maximum file size for embedding (5MB) */
const MAX_EMBED_SIZE = 5 * 1024 * 1024;

/** Supported image types for embedding */
const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

/** Supported audio types for embedding */
const AUDIO_TYPES = ['mp3', 'wav', 'ogg', 'webm'];

export interface ExportOptions {
  /** Include assets as embedded base64 */
  embedAssets?: boolean;
  /** Include custom prefabs */
  includePrefabs?: boolean;
  /** Include chat history */
  includeChatHistory?: boolean;
  /** Author name */
  author?: string;
  /** Package description (overrides game description) */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Generate thumbnail from canvas */
  generateThumbnail?: boolean;
}

export interface ImportResult {
  /** The imported game specification */
  gameSpec: GameSpec;
  /** Extracted prefabs */
  prefabs: Prefab[];
  /** Chat history (if included) */
  chatHistory?: ChatMessage[];
  /** Assets that were extracted */
  extractedAssets: string[];
  /** Package metadata */
  metadata: PackageMetadata;
}

/**
 * Export a game as a portable package
 */
export async function exportGamePackage(
  gameSpec: GameSpec,
  projectPath: string | null,
  prefabs: Prefab[] = [],
  chatHistory: ChatMessage[] = [],
  options: ExportOptions = {}
): Promise<string | null> {
  const {
    embedAssets = true,
    includePrefabs = true,
    includeChatHistory = false,
    author,
    description,
    tags,
  } = options;

  // Get save path from user
  const savePath = await save({
    defaultPath: `${gameSpec.metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}${PACKAGE_EXTENSION}`,
    filters: [
      {
        name: 'PromptPlay Package',
        extensions: ['promptplay.json'],
      },
    ],
  });

  if (!savePath) {
    return null; // User cancelled
  }

  // Collect assets if embedding
  let assets: EmbeddedAsset[] = [];
  if (embedAssets && projectPath) {
    assets = await collectAssets(gameSpec, projectPath);
  }

  // Filter custom prefabs (exclude built-in)
  const customPrefabs = includePrefabs
    ? prefabs.filter(p => !p.isBuiltIn)
    : [];

  // Build package
  const now = new Date().toISOString();
  const gamePackage: GamePackage = {
    formatVersion: PACKAGE_FORMAT_VERSION,
    gameSpec,
    packageMetadata: {
      createdAt: now,
      modifiedAt: now,
      author,
      description: description || gameSpec.metadata.description,
      tags,
      engineVersion: '1.0.0', // TODO: Get from package.json
    },
    assets: assets.length > 0 ? assets : undefined,
    prefabs: customPrefabs.length > 0 ? customPrefabs : undefined,
    chatHistory: includeChatHistory && chatHistory.length > 0 ? chatHistory : undefined,
  };

  // Write to file
  const json = JSON.stringify(gamePackage, null, 2);
  await invoke('write_file', { path: savePath, content: json });

  return savePath;
}

/**
 * Import a game package
 */
export async function importGamePackage(
  targetProjectPath?: string
): Promise<ImportResult | null> {
  // Get file path from user
  const filePath = await open({
    filters: [
      {
        name: 'PromptPlay Package',
        extensions: ['promptplay.json', 'json'],
      },
    ],
    multiple: false,
  });

  if (!filePath || typeof filePath !== 'string') {
    return null; // User cancelled
  }

  return importGamePackageFromPath(filePath, targetProjectPath);
}

/**
 * Import a game package from a specific path
 */
export async function importGamePackageFromPath(
  filePath: string,
  targetProjectPath?: string
): Promise<ImportResult> {
  // Read and parse package
  const content = await invoke<string>('read_file', { path: filePath });
  const gamePackage = JSON.parse(content) as GamePackage;

  // Validate format version
  if (!gamePackage.formatVersion) {
    throw new Error('Invalid package: missing formatVersion');
  }

  if (gamePackage.formatVersion !== PACKAGE_FORMAT_VERSION) {
    console.warn(
      `Package version ${gamePackage.formatVersion} may not be fully compatible with current version ${PACKAGE_FORMAT_VERSION}`
    );
  }

  // Validate required fields
  if (!gamePackage.gameSpec) {
    throw new Error('Invalid package: missing gameSpec');
  }

  if (!gamePackage.packageMetadata) {
    throw new Error('Invalid package: missing packageMetadata');
  }

  // Extract assets if target path provided
  const extractedAssets: string[] = [];
  if (targetProjectPath && gamePackage.assets && gamePackage.assets.length > 0) {
    const assetsDir = `${targetProjectPath}/assets`;

    // Ensure assets directory exists
    const fs = new TauriFileSystem();
    const dirExists = await fs.exists(assetsDir);
    if (!dirExists) {
      await fs.createDirectory(assetsDir);
    }

    // Extract each asset
    for (const asset of gamePackage.assets) {
      try {
        const assetPath = `${assetsDir}/${asset.name}`;
        const data = base64ToUint8Array(asset.data);
        await fs.writeFile(assetPath, data);
        extractedAssets.push(asset.name);
      } catch (error) {
        console.error(`Failed to extract asset ${asset.name}:`, error);
      }
    }
  }

  return {
    gameSpec: gamePackage.gameSpec,
    prefabs: gamePackage.prefabs || [],
    chatHistory: gamePackage.chatHistory,
    extractedAssets,
    metadata: gamePackage.packageMetadata,
  };
}

/**
 * Validate a package file without importing
 */
export async function validatePackage(filePath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: PackageMetadata;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const content = await invoke<string>('read_file', { path: filePath });
    const gamePackage = JSON.parse(content) as GamePackage;

    // Check format version
    if (!gamePackage.formatVersion) {
      errors.push('Missing formatVersion field');
    } else if (gamePackage.formatVersion !== PACKAGE_FORMAT_VERSION) {
      warnings.push(
        `Package version ${gamePackage.formatVersion} differs from current ${PACKAGE_FORMAT_VERSION}`
      );
    }

    // Check gameSpec
    if (!gamePackage.gameSpec) {
      errors.push('Missing gameSpec field');
    } else {
      if (!gamePackage.gameSpec.version) {
        errors.push('GameSpec missing version');
      }
      if (!gamePackage.gameSpec.metadata) {
        errors.push('GameSpec missing metadata');
      }
      if (!gamePackage.gameSpec.config) {
        errors.push('GameSpec missing config');
      }
      if (!gamePackage.gameSpec.entities) {
        errors.push('GameSpec missing entities array');
      }
    }

    // Check metadata
    if (!gamePackage.packageMetadata) {
      errors.push('Missing packageMetadata field');
    }

    // Check assets
    if (gamePackage.assets) {
      for (let i = 0; i < gamePackage.assets.length; i++) {
        const asset = gamePackage.assets[i];
        if (!asset.name) {
          errors.push(`Asset ${i} missing name`);
        }
        if (!asset.data) {
          errors.push(`Asset ${asset.name || i} missing data`);
        }
        if (!asset.mimeType) {
          warnings.push(`Asset ${asset.name || i} missing mimeType`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: gamePackage.packageMetadata,
    };
  } catch (error) {
    errors.push(`Failed to parse package: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Collect assets from project directory
 */
async function collectAssets(
  gameSpec: GameSpec,
  projectPath: string
): Promise<EmbeddedAsset[]> {
  const assets: EmbeddedAsset[] = [];
  const assetNames = new Set<string>();

  // Collect texture names from sprites
  const collectFromEntities = (entities: typeof gameSpec.entities) => {
    for (const entity of entities) {
      if (entity.components.sprite?.texture) {
        assetNames.add(entity.components.sprite.texture);
      }
      if (entity.components.animation?.spriteSheet) {
        assetNames.add(entity.components.animation.spriteSheet);
      }
      if (entity.components.audio?.source) {
        assetNames.add(entity.components.audio.source);
      }
    }
  };

  // Collect from main entities
  collectFromEntities(gameSpec.entities);

  // Collect from scenes
  if (gameSpec.scenes) {
    for (const scene of gameSpec.scenes) {
      collectFromEntities(scene.entities);
    }
  }

  // Try to load each asset
  const assetsDir = `${projectPath}/assets`;
  const fs = new TauriFileSystem();

  for (const name of assetNames) {
    // Try different extensions for images
    const possiblePaths = [
      `${assetsDir}/${name}`,
      ...IMAGE_TYPES.map(ext => `${assetsDir}/${name}.${ext}`),
      ...AUDIO_TYPES.map(ext => `${assetsDir}/${name}.${ext}`),
    ];

    for (const assetPath of possiblePaths) {
      try {
        const exists = await fs.exists(assetPath);
        if (!exists) continue;

        const info = await fs.getFileInfo?.(assetPath);
        if (info && info.size > MAX_EMBED_SIZE) {
          console.warn(`Asset ${name} too large to embed (${info.size} bytes)`);
          continue;
        }

        const data = await fs.readFile(assetPath);
        const ext = assetPath.split('.').pop()?.toLowerCase() || '';
        const mimeType = getMimeType(ext);
        const type = getAssetType(ext);

        assets.push({
          name: assetPath.split('/').pop() || name,
          type,
          mimeType,
          data: uint8ArrayToBase64(data),
          size: data.length,
        });

        break; // Found the asset, move to next
      } catch {
        // Asset doesn't exist at this path, try next
      }
    }
  }

  return assets;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get asset type from file extension
 */
function getAssetType(ext: string): EmbeddedAsset['type'] {
  if (IMAGE_TYPES.includes(ext)) return 'image';
  if (AUDIO_TYPES.includes(ext)) return 'audio';
  return 'other';
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get package info without full import
 */
export async function getPackageInfo(filePath: string): Promise<{
  title: string;
  description: string;
  genre: string;
  author?: string;
  createdAt: string;
  assetCount: number;
  prefabCount: number;
  entityCount: number;
} | null> {
  try {
    const content = await invoke<string>('read_file', { path: filePath });
    const pkg = JSON.parse(content) as GamePackage;

    const entityCount = pkg.gameSpec.scenes
      ? pkg.gameSpec.scenes.reduce((sum, s) => sum + s.entities.length, 0)
      : pkg.gameSpec.entities.length;

    return {
      title: pkg.gameSpec.metadata.title,
      description: pkg.packageMetadata.description || pkg.gameSpec.metadata.description,
      genre: pkg.gameSpec.metadata.genre,
      author: pkg.packageMetadata.author,
      createdAt: pkg.packageMetadata.createdAt,
      assetCount: pkg.assets?.length || 0,
      prefabCount: pkg.prefabs?.length || 0,
      entityCount,
    };
  } catch {
    return null;
  }
}
