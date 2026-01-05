/**
 * PBR Material System - Professional physically-based rendering materials
 * Supports normal maps, roughness, metalness, ambient occlusion, and more
 */

export interface PBRMaterialConfig {
  name: string;
  albedoColor: [number, number, number];
  albedoMap?: string; // Base color texture URL
  normalMap?: string;
  normalScale?: number;
  roughness: number;
  roughnessMap?: string;
  metalness: number;
  metalnessMap?: string;
  aoMap?: string; // Ambient occlusion
  aoIntensity?: number;
  emissive?: [number, number, number];
  emissiveMap?: string;
  emissiveIntensity?: number;
  displacementMap?: string;
  displacementScale?: number;
  alphaMap?: string;
  opacity?: number;
  transparent?: boolean;
  side?: 'front' | 'back' | 'double';
  wireframe?: boolean;
  flatShading?: boolean;
  envMapIntensity?: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  category: 'metal' | 'wood' | 'stone' | 'fabric' | 'plastic' | 'organic' | 'glass' | 'custom';
  config: Partial<PBRMaterialConfig>;
  thumbnail?: string;
}

export interface TextureSettings {
  url: string;
  repeat?: [number, number];
  offset?: [number, number];
  rotation?: number;
  wrapS?: 'repeat' | 'clamp' | 'mirror';
  wrapT?: 'repeat' | 'clamp' | 'mirror';
  minFilter?: 'nearest' | 'linear' | 'mipmap';
  magFilter?: 'nearest' | 'linear';
  anisotropy?: number;
  flipY?: boolean;
  encoding?: 'linear' | 'srgb';
}

export interface MaterialLibrary {
  id: string;
  name: string;
  materials: PBRMaterialConfig[];
  presets: MaterialPreset[];
}

// Default material presets for common surfaces
const defaultPresets: MaterialPreset[] = [
  // Metals
  {
    id: 'gold',
    name: 'Gold',
    category: 'metal',
    config: {
      albedoColor: [1.0, 0.766, 0.336],
      roughness: 0.3,
      metalness: 1.0,
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    category: 'metal',
    config: {
      albedoColor: [0.972, 0.960, 0.915],
      roughness: 0.2,
      metalness: 1.0,
    },
  },
  {
    id: 'copper',
    name: 'Copper',
    category: 'metal',
    config: {
      albedoColor: [0.955, 0.637, 0.538],
      roughness: 0.4,
      metalness: 1.0,
    },
  },
  {
    id: 'iron',
    name: 'Iron',
    category: 'metal',
    config: {
      albedoColor: [0.560, 0.570, 0.580],
      roughness: 0.5,
      metalness: 0.9,
    },
  },
  {
    id: 'steel-brushed',
    name: 'Brushed Steel',
    category: 'metal',
    config: {
      albedoColor: [0.8, 0.8, 0.82],
      roughness: 0.6,
      metalness: 0.95,
    },
  },
  // Woods
  {
    id: 'oak',
    name: 'Oak Wood',
    category: 'wood',
    config: {
      albedoColor: [0.65, 0.45, 0.28],
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  {
    id: 'pine',
    name: 'Pine Wood',
    category: 'wood',
    config: {
      albedoColor: [0.85, 0.7, 0.5],
      roughness: 0.65,
      metalness: 0.0,
    },
  },
  {
    id: 'walnut',
    name: 'Walnut',
    category: 'wood',
    config: {
      albedoColor: [0.35, 0.22, 0.15],
      roughness: 0.6,
      metalness: 0.0,
    },
  },
  // Stones
  {
    id: 'marble-white',
    name: 'White Marble',
    category: 'stone',
    config: {
      albedoColor: [0.95, 0.95, 0.95],
      roughness: 0.3,
      metalness: 0.0,
    },
  },
  {
    id: 'granite',
    name: 'Granite',
    category: 'stone',
    config: {
      albedoColor: [0.5, 0.5, 0.5],
      roughness: 0.6,
      metalness: 0.0,
    },
  },
  {
    id: 'concrete',
    name: 'Concrete',
    category: 'stone',
    config: {
      albedoColor: [0.6, 0.6, 0.6],
      roughness: 0.9,
      metalness: 0.0,
    },
  },
  {
    id: 'brick',
    name: 'Brick',
    category: 'stone',
    config: {
      albedoColor: [0.7, 0.35, 0.25],
      roughness: 0.85,
      metalness: 0.0,
    },
  },
  // Plastics
  {
    id: 'plastic-glossy',
    name: 'Glossy Plastic',
    category: 'plastic',
    config: {
      albedoColor: [0.8, 0.2, 0.2],
      roughness: 0.1,
      metalness: 0.0,
    },
  },
  {
    id: 'plastic-matte',
    name: 'Matte Plastic',
    category: 'plastic',
    config: {
      albedoColor: [0.2, 0.5, 0.8],
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  {
    id: 'rubber',
    name: 'Rubber',
    category: 'plastic',
    config: {
      albedoColor: [0.1, 0.1, 0.1],
      roughness: 0.95,
      metalness: 0.0,
    },
  },
  // Fabrics
  {
    id: 'velvet',
    name: 'Velvet',
    category: 'fabric',
    config: {
      albedoColor: [0.5, 0.1, 0.2],
      roughness: 0.9,
      metalness: 0.0,
    },
  },
  {
    id: 'silk',
    name: 'Silk',
    category: 'fabric',
    config: {
      albedoColor: [0.9, 0.85, 0.75],
      roughness: 0.4,
      metalness: 0.0,
    },
  },
  {
    id: 'leather',
    name: 'Leather',
    category: 'fabric',
    config: {
      albedoColor: [0.4, 0.25, 0.15],
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  // Glass
  {
    id: 'glass-clear',
    name: 'Clear Glass',
    category: 'glass',
    config: {
      albedoColor: [1.0, 1.0, 1.0],
      roughness: 0.0,
      metalness: 0.0,
      opacity: 0.2,
      transparent: true,
    },
  },
  {
    id: 'glass-frosted',
    name: 'Frosted Glass',
    category: 'glass',
    config: {
      albedoColor: [0.95, 0.95, 1.0],
      roughness: 0.5,
      metalness: 0.0,
      opacity: 0.5,
      transparent: true,
    },
  },
  // Organic
  {
    id: 'skin',
    name: 'Skin',
    category: 'organic',
    config: {
      albedoColor: [0.9, 0.75, 0.65],
      roughness: 0.5,
      metalness: 0.0,
    },
  },
  {
    id: 'grass',
    name: 'Grass',
    category: 'organic',
    config: {
      albedoColor: [0.3, 0.5, 0.2],
      roughness: 0.85,
      metalness: 0.0,
    },
  },
  {
    id: 'water',
    name: 'Water',
    category: 'organic',
    config: {
      albedoColor: [0.2, 0.4, 0.6],
      roughness: 0.0,
      metalness: 0.0,
      opacity: 0.7,
      transparent: true,
    },
  },
];

class PBRMaterialSystem {
  private materials: Map<string, PBRMaterialConfig> = new Map();
  private presets: MaterialPreset[] = [...defaultPresets];
  private libraries: Map<string, MaterialLibrary> = new Map();

  constructor() {
    // Initialize with default presets as materials
    this.presets.forEach((preset) => {
      const material = this.createMaterialFromPreset(preset);
      this.materials.set(material.name, material);
    });
  }

  /**
   * Create a new PBR material
   */
  createMaterial(config: Partial<PBRMaterialConfig>): PBRMaterialConfig {
    const material: PBRMaterialConfig = {
      name: config.name || `material_${Date.now()}`,
      albedoColor: config.albedoColor || [1, 1, 1],
      roughness: config.roughness ?? 0.5,
      metalness: config.metalness ?? 0.0,
      normalScale: config.normalScale ?? 1.0,
      aoIntensity: config.aoIntensity ?? 1.0,
      emissive: config.emissive || [0, 0, 0],
      emissiveIntensity: config.emissiveIntensity ?? 0,
      displacementScale: config.displacementScale ?? 0.1,
      opacity: config.opacity ?? 1.0,
      transparent: config.transparent ?? false,
      side: config.side || 'front',
      wireframe: config.wireframe ?? false,
      flatShading: config.flatShading ?? false,
      envMapIntensity: config.envMapIntensity ?? 1.0,
      ...config,
    };

    this.materials.set(material.name, material);
    return material;
  }

  /**
   * Create material from a preset
   */
  createMaterialFromPreset(preset: MaterialPreset): PBRMaterialConfig {
    return this.createMaterial({
      name: preset.name,
      ...preset.config,
    });
  }

  /**
   * Get material by name
   */
  getMaterial(name: string): PBRMaterialConfig | undefined {
    return this.materials.get(name);
  }

  /**
   * Update material properties
   */
  updateMaterial(
    name: string,
    updates: Partial<PBRMaterialConfig>
  ): PBRMaterialConfig | undefined {
    const material = this.materials.get(name);
    if (!material) return undefined;

    const updated = { ...material, ...updates };
    this.materials.set(name, updated);
    return updated;
  }

  /**
   * Delete a material
   */
  deleteMaterial(name: string): boolean {
    return this.materials.delete(name);
  }

  /**
   * Get all materials
   */
  getAllMaterials(): PBRMaterialConfig[] {
    return Array.from(this.materials.values());
  }

  /**
   * Get all presets
   */
  getPresets(): MaterialPreset[] {
    return [...this.presets];
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: MaterialPreset['category']): MaterialPreset[] {
    return this.presets.filter((p) => p.category === category);
  }

  /**
   * Add a custom preset
   */
  addPreset(preset: Omit<MaterialPreset, 'id'>): MaterialPreset {
    const newPreset: MaterialPreset = {
      ...preset,
      id: `custom_${Date.now()}`,
    };
    this.presets.push(newPreset);
    return newPreset;
  }

  /**
   * Generate normal map from height map (simplified algorithm)
   */
  generateNormalMapData(
    heightMapData: Uint8ClampedArray,
    width: number,
    height: number,
    strength: number = 1.0
  ): Uint8ClampedArray {
    const normalData = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Sample neighboring heights
        const left = this.getHeight(heightMapData, width, height, x - 1, y);
        const right = this.getHeight(heightMapData, width, height, x + 1, y);
        const up = this.getHeight(heightMapData, width, height, x, y - 1);
        const down = this.getHeight(heightMapData, width, height, x, y + 1);

        // Calculate normal
        const dx = (right - left) * strength;
        const dy = (down - up) * strength;
        const dz = 1.0;

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = dx / len;
        const ny = dy / len;
        const nz = dz / len;

        // Convert to RGB (0-255 range)
        normalData[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
        normalData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        normalData[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        normalData[idx + 3] = 255;
      }
    }

    return normalData;
  }

  private getHeight(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): number {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    const idx = (y * width + x) * 4;
    return data[idx] / 255;
  }

  /**
   * Generate roughness map from albedo (simplified)
   */
  generateRoughnessFromAlbedo(
    albedoData: Uint8ClampedArray,
    width: number,
    height: number,
    baseRoughness: number = 0.5
  ): Uint8ClampedArray {
    const roughnessData = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      // Simple roughness based on luminance variance
      const luminance =
        (albedoData[idx] * 0.299 +
          albedoData[idx + 1] * 0.587 +
          albedoData[idx + 2] * 0.114) /
        255;
      const roughness = Math.min(1, Math.max(0, baseRoughness + (1 - luminance) * 0.3));
      const value = Math.floor(roughness * 255);

      roughnessData[idx] = value;
      roughnessData[idx + 1] = value;
      roughnessData[idx + 2] = value;
      roughnessData[idx + 3] = 255;
    }

    return roughnessData;
  }

  /**
   * Export material to Three.js compatible format
   */
  exportToThreeJS(material: PBRMaterialConfig): Record<string, unknown> {
    return {
      type: 'MeshStandardMaterial',
      color: this.rgbToHex(material.albedoColor),
      map: material.albedoMap || null,
      normalMap: material.normalMap || null,
      normalScale: [material.normalScale || 1, material.normalScale || 1],
      roughness: material.roughness,
      roughnessMap: material.roughnessMap || null,
      metalness: material.metalness,
      metalnessMap: material.metalnessMap || null,
      aoMap: material.aoMap || null,
      aoMapIntensity: material.aoIntensity || 1,
      emissive: material.emissive ? this.rgbToHex(material.emissive) : 0x000000,
      emissiveMap: material.emissiveMap || null,
      emissiveIntensity: material.emissiveIntensity || 0,
      displacementMap: material.displacementMap || null,
      displacementScale: material.displacementScale || 0.1,
      alphaMap: material.alphaMap || null,
      opacity: material.opacity ?? 1,
      transparent: material.transparent ?? false,
      side: this.getSideValue(material.side || 'front'),
      wireframe: material.wireframe ?? false,
      flatShading: material.flatShading ?? false,
      envMapIntensity: material.envMapIntensity ?? 1,
    };
  }

  private rgbToHex(rgb: [number, number, number]): number {
    const r = Math.floor(rgb[0] * 255);
    const g = Math.floor(rgb[1] * 255);
    const b = Math.floor(rgb[2] * 255);
    return (r << 16) | (g << 8) | b;
  }

  private getSideValue(side: 'front' | 'back' | 'double'): number {
    switch (side) {
      case 'front':
        return 0;
      case 'back':
        return 1;
      case 'double':
        return 2;
      default:
        return 0;
    }
  }

  /**
   * Create material library
   */
  createLibrary(name: string): MaterialLibrary {
    const library: MaterialLibrary = {
      id: `lib_${Date.now()}`,
      name,
      materials: [],
      presets: [],
    };
    this.libraries.set(library.id, library);
    return library;
  }

  /**
   * Add material to library
   */
  addToLibrary(libraryId: string, material: PBRMaterialConfig): boolean {
    const library = this.libraries.get(libraryId);
    if (!library) return false;
    library.materials.push(material);
    return true;
  }

  /**
   * Export library to JSON
   */
  exportLibrary(libraryId: string): string | null {
    const library = this.libraries.get(libraryId);
    if (!library) return null;
    return JSON.stringify(library, null, 2);
  }

  /**
   * Import library from JSON
   */
  importLibrary(json: string): MaterialLibrary | null {
    try {
      const library = JSON.parse(json) as MaterialLibrary;
      library.id = `lib_${Date.now()}`; // Generate new ID
      this.libraries.set(library.id, library);
      return library;
    } catch {
      return null;
    }
  }

  /**
   * Get texture settings with defaults
   */
  getTextureSettings(partial: Partial<TextureSettings>): TextureSettings {
    return {
      url: partial.url || '',
      repeat: partial.repeat || [1, 1],
      offset: partial.offset || [0, 0],
      rotation: partial.rotation || 0,
      wrapS: partial.wrapS || 'repeat',
      wrapT: partial.wrapT || 'repeat',
      minFilter: partial.minFilter || 'mipmap',
      magFilter: partial.magFilter || 'linear',
      anisotropy: partial.anisotropy || 4,
      flipY: partial.flipY ?? true,
      encoding: partial.encoding || 'srgb',
    };
  }

  /**
   * Blend two materials
   */
  blendMaterials(
    mat1: PBRMaterialConfig,
    mat2: PBRMaterialConfig,
    factor: number
  ): PBRMaterialConfig {
    const blend = Math.max(0, Math.min(1, factor));
    const inv = 1 - blend;

    return this.createMaterial({
      name: `${mat1.name}_${mat2.name}_blend`,
      albedoColor: [
        mat1.albedoColor[0] * inv + mat2.albedoColor[0] * blend,
        mat1.albedoColor[1] * inv + mat2.albedoColor[1] * blend,
        mat1.albedoColor[2] * inv + mat2.albedoColor[2] * blend,
      ],
      roughness: mat1.roughness * inv + mat2.roughness * blend,
      metalness: mat1.metalness * inv + mat2.metalness * blend,
      opacity: (mat1.opacity || 1) * inv + (mat2.opacity || 1) * blend,
    });
  }
}

export const pbrMaterialSystem = new PBRMaterialSystem();
