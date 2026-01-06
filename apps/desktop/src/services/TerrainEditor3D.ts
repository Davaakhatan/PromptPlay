/**
 * Terrain Editor 3D - Professional terrain sculpting and painting
 * Supports heightmaps, texture splatting, and procedural generation
 */

export interface TerrainConfig {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  resolution: number; // Heightmap resolution
  position: [number, number, number];
}

export interface HeightmapData {
  width: number;
  height: number;
  data: Float32Array;
  minHeight: number;
  maxHeight: number;
}

export interface TerrainLayer {
  id: string;
  name: string;
  texture: string;
  normalMap?: string;
  tiling: [number, number];
  metallic: number;
  smoothness: number;
  maskMap?: string;
  blend: 'height' | 'slope' | 'custom';
  heightBlend?: { min: number; max: number; falloff: number };
  slopeBlend?: { min: number; max: number; falloff: number };
}

export interface SplatMap {
  width: number;
  height: number;
  channels: number; // Up to 4 channels per splat (RGBA)
  data: Float32Array;
}

export interface BrushSettings {
  type: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise' | 'paint' | 'erode' | 'stamp';
  size: number;
  strength: number;
  falloff: 'linear' | 'smooth' | 'sphere' | 'tip';
  rotation: number;
  spacing: number;
  jitter: number;
  stampTexture?: string;
  noiseScale?: number;
  noiseOctaves?: number;
  targetHeight?: number; // For flatten
  paintLayerIndex?: number; // For paint
}

export interface ErosionSettings {
  iterations: number;
  erosionStrength: number;
  depositionStrength: number;
  sedimentCapacity: number;
  evaporationRate: number;
  minSlope: number;
  gravity: number;
  rainAmount: number;
  thermalErosion: boolean;
  thermalStrength: number;
  thermalAngle: number;
}

export interface TerrainTreePrototype {
  id: string;
  name: string;
  prefab: string;
  bendFactor: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  color: [number, number, number];
  lightmapColor: [number, number, number];
}

export interface TerrainGrassPrototype {
  id: string;
  name: string;
  texture: string;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  noiseSpread: number;
  healthyColor: [number, number, number];
  dryColor: [number, number, number];
  renderMode: 'billboard' | 'cross' | 'mesh';
}

export interface DetailLayer {
  id: string;
  prototype: string; // Tree or grass ID
  density: number;
  minScale: number;
  maxScale: number;
  alignToGround: boolean;
  randomRotation: boolean;
  slopeLimit: number;
  heightRange: [number, number];
  noiseScale: number;
  noiseThreshold: number;
}

export interface TerrainInstance {
  id: string;
  config: TerrainConfig;
  heightmap: HeightmapData;
  layers: TerrainLayer[];
  splatMaps: SplatMap[];
  trees: TerrainTreePrototype[];
  grass: TerrainGrassPrototype[];
  details: DetailLayer[];
  treeInstances: Array<{
    prototypeId: string;
    position: [number, number, number];
    rotation: number;
    scale: [number, number, number];
  }>;
}

export interface TerrainPreset {
  id: string;
  name: string;
  category: 'flat' | 'hills' | 'mountains' | 'desert' | 'islands' | 'canyon' | 'custom';
  description?: string;
  generator: 'perlin' | 'ridged' | 'fbm' | 'voronoi' | 'hydraulic';
  generatorParams: Record<string, number>;
  defaultLayers: Omit<TerrainLayer, 'id'>[];
}

// Simplex noise implementation
class SimplexNoise {
  private perm: number[] = [];
  private grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];

  constructor(seed: number = Math.random() * 10000) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle based on seed
    const random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

const terrainPresets: TerrainPreset[] = [
  {
    id: 'flat',
    name: 'Flat Plains',
    category: 'flat',
    description: 'Mostly flat terrain with gentle variations',
    generator: 'perlin',
    generatorParams: { scale: 100, octaves: 2, persistence: 0.3, amplitude: 5 },
    defaultLayers: [
      { name: 'Grass', texture: 'grass_diffuse', tiling: [10, 10], metallic: 0, smoothness: 0.3, blend: 'slope', slopeBlend: { min: 0, max: 30, falloff: 5 } },
    ],
  },
  {
    id: 'rolling-hills',
    name: 'Rolling Hills',
    category: 'hills',
    description: 'Gentle rolling hills',
    generator: 'fbm',
    generatorParams: { scale: 50, octaves: 4, persistence: 0.5, amplitude: 30 },
    defaultLayers: [
      { name: 'Grass', texture: 'grass_diffuse', tiling: [15, 15], metallic: 0, smoothness: 0.3, blend: 'slope', slopeBlend: { min: 0, max: 45, falloff: 10 } },
      { name: 'Rock', texture: 'rock_diffuse', tiling: [8, 8], metallic: 0.1, smoothness: 0.4, blend: 'slope', slopeBlend: { min: 35, max: 90, falloff: 10 } },
    ],
  },
  {
    id: 'mountains',
    name: 'Mountain Range',
    category: 'mountains',
    description: 'Dramatic mountain peaks',
    generator: 'ridged',
    generatorParams: { scale: 30, octaves: 6, persistence: 0.6, amplitude: 100, ridgePower: 2 },
    defaultLayers: [
      { name: 'Grass', texture: 'grass_diffuse', tiling: [20, 20], metallic: 0, smoothness: 0.3, blend: 'height', heightBlend: { min: 0, max: 40, falloff: 10 } },
      { name: 'Rock', texture: 'rock_diffuse', tiling: [10, 10], metallic: 0.1, smoothness: 0.4, blend: 'height', heightBlend: { min: 30, max: 70, falloff: 15 } },
      { name: 'Snow', texture: 'snow_diffuse', tiling: [15, 15], metallic: 0, smoothness: 0.6, blend: 'height', heightBlend: { min: 60, max: 100, falloff: 10 } },
    ],
  },
  {
    id: 'desert-dunes',
    name: 'Desert Dunes',
    category: 'desert',
    description: 'Sandy desert with dunes',
    generator: 'fbm',
    generatorParams: { scale: 40, octaves: 3, persistence: 0.4, amplitude: 20 },
    defaultLayers: [
      { name: 'Sand', texture: 'sand_diffuse', tiling: [20, 20], metallic: 0, smoothness: 0.1, blend: 'slope', slopeBlend: { min: 0, max: 90, falloff: 5 } },
    ],
  },
  {
    id: 'islands',
    name: 'Island Archipelago',
    category: 'islands',
    description: 'Islands rising from water',
    generator: 'voronoi',
    generatorParams: { scale: 20, amplitude: 50, falloff: 2, waterLevel: 0.3 },
    defaultLayers: [
      { name: 'Sand', texture: 'sand_diffuse', tiling: [20, 20], metallic: 0, smoothness: 0.2, blend: 'height', heightBlend: { min: 0, max: 20, falloff: 5 } },
      { name: 'Grass', texture: 'grass_diffuse', tiling: [15, 15], metallic: 0, smoothness: 0.3, blend: 'height', heightBlend: { min: 15, max: 80, falloff: 10 } },
    ],
  },
  {
    id: 'canyon',
    name: 'Canyon Lands',
    category: 'canyon',
    description: 'Deep canyons and plateaus',
    generator: 'hydraulic',
    generatorParams: { scale: 35, octaves: 5, persistence: 0.55, amplitude: 60, erosionIterations: 1000 },
    defaultLayers: [
      { name: 'Red Rock', texture: 'redrock_diffuse', tiling: [12, 12], metallic: 0, smoothness: 0.3, blend: 'slope', slopeBlend: { min: 0, max: 60, falloff: 15 } },
      { name: 'Cliff', texture: 'cliff_diffuse', tiling: [8, 8], metallic: 0.1, smoothness: 0.4, blend: 'slope', slopeBlend: { min: 50, max: 90, falloff: 10 } },
    ],
  },
];

class TerrainEditor3DService {
  private terrains: Map<string, TerrainInstance> = new Map();
  private presets: TerrainPreset[] = [...terrainPresets];
  private noiseGenerator: SimplexNoise;

  constructor() {
    this.noiseGenerator = new SimplexNoise();
  }

  /**
   * Create a new terrain
   */
  createTerrain(config: Partial<TerrainConfig>): TerrainInstance {
    const terrainConfig: TerrainConfig = {
      id: config.id || `terrain_${Date.now()}`,
      name: config.name || 'New Terrain',
      width: config.width || 256,
      depth: config.depth || 256,
      height: config.height || 100,
      resolution: config.resolution || 257,
      position: config.position || [0, 0, 0],
    };

    const heightmap = this.createHeightmap(terrainConfig.resolution, terrainConfig.resolution);

    const terrain: TerrainInstance = {
      id: terrainConfig.id,
      config: terrainConfig,
      heightmap,
      layers: [],
      splatMaps: [],
      trees: [],
      grass: [],
      details: [],
      treeInstances: [],
    };

    this.terrains.set(terrain.id, terrain);
    return terrain;
  }

  /**
   * Create empty heightmap
   */
  private createHeightmap(width: number, height: number): HeightmapData {
    return {
      width,
      height,
      data: new Float32Array(width * height),
      minHeight: 0,
      maxHeight: 0,
    };
  }

  /**
   * Generate terrain from preset
   */
  generateFromPreset(presetId: string, config?: Partial<TerrainConfig>): TerrainInstance | null {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return null;

    const terrain = this.createTerrain(config || {});
    this.generateHeightmap(terrain.id, preset.generator, preset.generatorParams);

    // Add default layers
    preset.defaultLayers.forEach((layer, index) => {
      this.addLayer(terrain.id, {
        ...layer,
        id: `layer_${index}`,
      });
    });

    return terrain;
  }

  /**
   * Generate heightmap using various algorithms
   */
  generateHeightmap(
    terrainId: string,
    generator: TerrainPreset['generator'],
    params: Record<string, number>
  ): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return false;

    const { width, height } = terrain.heightmap;
    const data = terrain.heightmap.data;
    const scale = params.scale || 50;
    const octaves = params.octaves || 4;
    const persistence = params.persistence || 0.5;
    const amplitude = params.amplitude || 50;

    this.noiseGenerator = new SimplexNoise(params.seed || Math.random() * 10000);

    let minH = Infinity;
    let maxH = -Infinity;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = 0;

        switch (generator) {
          case 'perlin':
            value = this.perlinNoise(x, y, scale, octaves, persistence) * amplitude;
            break;

          case 'fbm':
            value = this.fbmNoise(x, y, scale, octaves, persistence) * amplitude;
            break;

          case 'ridged':
            value = this.ridgedNoise(x, y, scale, octaves, persistence, params.ridgePower || 2) * amplitude;
            break;

          case 'voronoi':
            value = this.voronoiNoise(x, y, scale, params.falloff || 2) * amplitude;
            break;

          case 'hydraulic':
            value = this.fbmNoise(x, y, scale, octaves, persistence) * amplitude;
            break;
        }

        data[y * width + x] = value;
        minH = Math.min(minH, value);
        maxH = Math.max(maxH, value);
      }
    }

    // Apply hydraulic erosion if specified
    if (generator === 'hydraulic' && params.erosionIterations) {
      this.applyHydraulicErosion(terrain.id, {
        iterations: params.erosionIterations,
        erosionStrength: 0.3,
        depositionStrength: 0.3,
        sedimentCapacity: 4,
        evaporationRate: 0.02,
        minSlope: 0.01,
        gravity: 4,
        rainAmount: 1,
        thermalErosion: false,
        thermalStrength: 0.5,
        thermalAngle: 30,
      });
    }

    terrain.heightmap.minHeight = minH;
    terrain.heightmap.maxHeight = maxH;

    return true;
  }

  private perlinNoise(x: number, y: number, scale: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noiseGenerator.noise2D(x * frequency / scale, y * frequency / scale) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return (total / maxValue + 1) / 2; // Normalize to 0-1
  }

  private fbmNoise(x: number, y: number, scale: number, octaves: number, persistence: number): number {
    return this.perlinNoise(x, y, scale, octaves, persistence);
  }

  private ridgedNoise(x: number, y: number, scale: number, octaves: number, persistence: number, power: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const noise = this.noiseGenerator.noise2D(x * frequency / scale, y * frequency / scale);
      const ridged = 1 - Math.abs(noise);
      total += Math.pow(ridged, power) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  private voronoiNoise(x: number, y: number, scale: number, falloff: number): number {
    const sx = x / scale;
    const sy = y / scale;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);

    let minDist = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cellX = ix + dx;
        const cellY = iy + dy;
        // Pseudo-random point in cell
        const px = cellX + this.hash(cellX, cellY) * 0.9 + 0.05;
        const py = cellY + this.hash(cellY, cellX) * 0.9 + 0.05;
        const dist = Math.sqrt((sx - px) ** 2 + (sy - py) ** 2);
        minDist = Math.min(minDist, dist);
      }
    }

    return Math.pow(1 - Math.min(minDist, 1), falloff);
  }

  private hash(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Apply brush stroke to terrain
   */
  applyBrush(terrainId: string, x: number, z: number, brush: BrushSettings): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return false;

    const { width, height, data } = terrain.heightmap;
    const { config } = terrain;

    // Convert world coords to heightmap coords
    const hx = Math.floor(((x - config.position[0]) / config.width + 0.5) * width);
    const hz = Math.floor(((z - config.position[2]) / config.depth + 0.5) * height);

    const radius = Math.floor((brush.size / config.width) * width);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = hx + dx;
        const pz = hz + dy;

        if (px < 0 || px >= width || pz < 0 || pz >= height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / radius;
        if (dist > 1) continue;

        const falloffValue = this.calculateFalloff(dist, brush.falloff);
        const idx = pz * width + px;

        switch (brush.type) {
          case 'raise':
            data[idx] += brush.strength * falloffValue;
            break;

          case 'lower':
            data[idx] -= brush.strength * falloffValue;
            break;

          case 'smooth':
            const avg = this.getAverageHeight(terrain, px, pz, 3);
            data[idx] = data[idx] + (avg - data[idx]) * brush.strength * falloffValue;
            break;

          case 'flatten':
            const target = brush.targetHeight ?? data[idx];
            data[idx] = data[idx] + (target - data[idx]) * brush.strength * falloffValue;
            break;

          case 'noise':
            const noiseVal = this.noiseGenerator.noise2D(
              px * (brush.noiseScale || 0.1),
              pz * (brush.noiseScale || 0.1)
            );
            data[idx] += noiseVal * brush.strength * falloffValue;
            break;
        }
      }
    }

    this.updateHeightmapBounds(terrain);
    return true;
  }

  private calculateFalloff(dist: number, falloffType: BrushSettings['falloff']): number {
    switch (falloffType) {
      case 'linear':
        return 1 - dist;
      case 'smooth':
        return 1 - dist * dist * (3 - 2 * dist);
      case 'sphere':
        return Math.sqrt(1 - dist * dist);
      case 'tip':
        return Math.pow(1 - dist, 2);
      default:
        return 1 - dist;
    }
  }

  private getAverageHeight(terrain: TerrainInstance, x: number, z: number, radius: number): number {
    const { width, height, data } = terrain.heightmap;
    let sum = 0;
    let count = 0;

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = x + dx;
        const pz = z + dz;
        if (px >= 0 && px < width && pz >= 0 && pz < height) {
          sum += data[pz * width + px];
          count++;
        }
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private updateHeightmapBounds(terrain: TerrainInstance): void {
    const { data } = terrain.heightmap;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }

    terrain.heightmap.minHeight = min;
    terrain.heightmap.maxHeight = max;
  }

  /**
   * Apply hydraulic erosion
   */
  applyHydraulicErosion(terrainId: string, settings: ErosionSettings): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return false;

    const { width, height, data } = terrain.heightmap;

    // Simplified droplet erosion
    for (let i = 0; i < settings.iterations; i++) {
      // Random starting position
      let x = Math.random() * (width - 1);
      let y = Math.random() * (height - 1);
      let dirX = 0;
      let dirY = 0;
      let speed = 1;
      let water = settings.rainAmount;
      let sediment = 0;

      for (let step = 0; step < 100; step++) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 1 || ix >= width - 1 || iy < 1 || iy >= height - 1) break;

        // Calculate gradient
        const idx = iy * width + ix;
        const gradX = data[idx + 1] - data[idx - 1];
        const gradY = data[idx + width] - data[idx - width];

        // Update direction
        dirX = dirX * 0.5 - gradX * 0.5;
        dirY = dirY * 0.5 - gradY * 0.5;

        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len < 0.01) break;
        dirX /= len;
        dirY /= len;

        // Move droplet
        const newX = x + dirX;
        const newY = y + dirY;
        const newIdx = Math.floor(newY) * width + Math.floor(newX);

        if (newIdx < 0 || newIdx >= data.length) break;

        // Calculate height difference
        const deltaHeight = data[newIdx] - data[idx];

        // Capacity based on speed and water
        const capacity = Math.max(-deltaHeight * speed * water * settings.sedimentCapacity, settings.minSlope);

        if (sediment > capacity || deltaHeight > 0) {
          // Deposit sediment
          const deposit = deltaHeight > 0
            ? Math.min(deltaHeight, sediment)
            : (sediment - capacity) * settings.depositionStrength;
          sediment -= deposit;
          data[idx] += deposit;
        } else {
          // Erode
          const erode = Math.min((capacity - sediment) * settings.erosionStrength, -deltaHeight);
          sediment += erode;
          data[idx] -= erode;
        }

        // Update speed and water
        speed = Math.sqrt(Math.max(0, speed * speed + deltaHeight * settings.gravity));
        water *= (1 - settings.evaporationRate);

        x = newX;
        y = newY;

        if (water < 0.01) break;
      }
    }

    // Apply thermal erosion if enabled
    if (settings.thermalErosion) {
      this.applyThermalErosion(terrain, settings.thermalStrength, settings.thermalAngle);
    }

    this.updateHeightmapBounds(terrain);
    return true;
  }

  private applyThermalErosion(terrain: TerrainInstance, strength: number, maxAngle: number): void {
    const { width, height, data } = terrain.heightmap;
    const tanAngle = Math.tan((maxAngle * Math.PI) / 180);
    const temp = new Float32Array(data.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const h = data[idx];
        let totalDelta = 0;
        let maxDelta = 0;
        let maxNeighbor = idx;

        // Check 4 neighbors
        const neighbors = [
          [x - 1, y, idx - 1],
          [x + 1, y, idx + 1],
          [x, y - 1, idx - width],
          [x, y + 1, idx + width],
        ];

        for (const [_nx, _ny, nidx] of neighbors) {
          const delta = h - data[nidx];
          if (delta > tanAngle) {
            totalDelta += delta;
            if (delta > maxDelta) {
              maxDelta = delta;
              maxNeighbor = nidx;
            }
          }
        }

        if (totalDelta > 0 && maxNeighbor !== idx) {
          const transfer = (maxDelta - tanAngle) * strength * 0.5;
          temp[idx] -= transfer;
          temp[maxNeighbor] += transfer;
        }
      }
    }

    // Apply changes
    for (let i = 0; i < data.length; i++) {
      data[i] += temp[i];
    }
  }

  /**
   * Add texture layer
   */
  addLayer(terrainId: string, layer: TerrainLayer): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return false;

    terrain.layers.push(layer);

    // Create splat map if needed
    if (terrain.splatMaps.length === 0 || terrain.layers.length > terrain.splatMaps.length * 4) {
      terrain.splatMaps.push(this.createSplatMap(terrain.heightmap.width, terrain.heightmap.height));
    }

    return true;
  }

  private createSplatMap(width: number, height: number): SplatMap {
    return {
      width,
      height,
      channels: 4,
      data: new Float32Array(width * height * 4),
    };
  }

  /**
   * Paint texture layer
   */
  paintLayer(
    terrainId: string,
    x: number,
    z: number,
    layerIndex: number,
    brush: BrushSettings
  ): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain || layerIndex >= terrain.layers.length) return false;

    const splatMapIndex = Math.floor(layerIndex / 4);
    const channel = layerIndex % 4;

    if (splatMapIndex >= terrain.splatMaps.length) return false;

    const splatMap = terrain.splatMaps[splatMapIndex];
    const { width, height, data } = splatMap;
    const { config } = terrain;

    const hx = Math.floor(((x - config.position[0]) / config.width + 0.5) * width);
    const hz = Math.floor(((z - config.position[2]) / config.depth + 0.5) * height);

    const radius = Math.floor((brush.size / config.width) * width);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = hx + dx;
        const pz = hz + dy;

        if (px < 0 || px >= width || pz < 0 || pz >= height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / radius;
        if (dist > 1) continue;

        const falloff = this.calculateFalloff(dist, brush.falloff);
        const idx = (pz * width + px) * 4;

        // Add to target channel, normalize others
        const addition = brush.strength * falloff;
        data[idx + channel] += addition;

        // Normalize all channels to sum to 1
        const total = data[idx] + data[idx + 1] + data[idx + 2] + data[idx + 3];
        if (total > 0) {
          data[idx] /= total;
          data[idx + 1] /= total;
          data[idx + 2] /= total;
          data[idx + 3] /= total;
        }
      }
    }

    return true;
  }

  /**
   * Auto-generate splat maps based on height/slope
   */
  autoGenerateSplatMaps(terrainId: string): boolean {
    const terrain = this.terrains.get(terrainId);
    if (!terrain || terrain.layers.length === 0) return false;

    const { width, height, data } = terrain.heightmap;
    const { minHeight, maxHeight } = terrain.heightmap;
    const heightRange = maxHeight - minHeight || 1;

    // Ensure we have enough splat maps
    const neededSplats = Math.ceil(terrain.layers.length / 4);
    while (terrain.splatMaps.length < neededSplats) {
      terrain.splatMaps.push(this.createSplatMap(width, height));
    }

    // Clear existing splat data
    terrain.splatMaps.forEach((splat) => splat.data.fill(0));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const h = (data[idx] - minHeight) / heightRange;
        const slope = this.calculateSlope(terrain, x, y);

        // Determine weights for each layer
        const weights: number[] = [];

        terrain.layers.forEach((layer) => {
          let weight = 0;

          if (layer.blend === 'height' && layer.heightBlend) {
            const { min, max, falloff } = layer.heightBlend;
            const hNorm = h * 100; // Convert to percentage
            if (hNorm >= min && hNorm <= max) {
              weight = 1;
            } else if (hNorm < min) {
              weight = Math.max(0, 1 - (min - hNorm) / falloff);
            } else {
              weight = Math.max(0, 1 - (hNorm - max) / falloff);
            }
          } else if (layer.blend === 'slope' && layer.slopeBlend) {
            const { min, max, falloff } = layer.slopeBlend;
            const slopeDeg = (Math.asin(slope) * 180) / Math.PI;
            if (slopeDeg >= min && slopeDeg <= max) {
              weight = 1;
            } else if (slopeDeg < min) {
              weight = Math.max(0, 1 - (min - slopeDeg) / falloff);
            } else {
              weight = Math.max(0, 1 - (slopeDeg - max) / falloff);
            }
          }

          weights.push(weight);
        });

        // Normalize weights
        const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
        weights.forEach((w, i) => {
          const splatIdx = Math.floor(i / 4);
          const channel = i % 4;
          terrain.splatMaps[splatIdx].data[idx * 4 + channel] = w / totalWeight;
        });
      }
    }

    return true;
  }

  private calculateSlope(terrain: TerrainInstance, x: number, y: number): number {
    const { width, height, data } = terrain.heightmap;

    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 0;

    const idx = y * width + x;
    const dx = data[idx + 1] - data[idx - 1];
    const dy = data[idx + width] - data[idx - width];

    return Math.sqrt(dx * dx + dy * dy) / 2;
  }

  /**
   * Add tree prototype
   */
  addTreePrototype(terrainId: string, tree: Omit<TerrainTreePrototype, 'id'>): TerrainTreePrototype | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const prototype: TerrainTreePrototype = {
      ...tree,
      id: `tree_${Date.now()}`,
    };

    terrain.trees.push(prototype);
    return prototype;
  }

  /**
   * Place trees automatically
   */
  autoPlaceTrees(
    terrainId: string,
    prototypeId: string,
    density: number,
    options: {
      slopeLimit?: number;
      heightRange?: [number, number];
      noiseScale?: number;
      noiseThreshold?: number;
    } = {}
  ): number {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return 0;

    const prototype = terrain.trees.find((t) => t.id === prototypeId);
    if (!prototype) return 0;

    const { config, heightmap } = terrain;
    const { width, height, data, minHeight, maxHeight } = heightmap;
    const heightRange = maxHeight - minHeight || 1;

    const slopeLimit = options.slopeLimit ?? 30;
    const [minH, maxH] = options.heightRange ?? [0, 100];
    const noiseScale = options.noiseScale ?? 0.1;
    const noiseThreshold = options.noiseThreshold ?? 0.5;

    let placed = 0;
    const spacing = Math.sqrt(1 / density);

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const idx = iy * width + ix;

        // Check height
        const h = ((data[idx] - minHeight) / heightRange) * 100;
        if (h < minH || h > maxH) continue;

        // Check slope
        const slope = this.calculateSlope(terrain, ix, iy);
        const slopeDeg = (Math.asin(slope) * 180) / Math.PI;
        if (slopeDeg > slopeLimit) continue;

        // Check noise
        const noise = this.noiseGenerator.noise2D(x * noiseScale, y * noiseScale);
        if (noise < noiseThreshold) continue;

        // Add jitter
        const jitterX = (Math.random() - 0.5) * spacing;
        const jitterY = (Math.random() - 0.5) * spacing;

        const worldX = ((x + jitterX) / width - 0.5) * config.width + config.position[0];
        const worldZ = ((y + jitterY) / height - 0.5) * config.depth + config.position[2];
        const worldY = data[idx] + config.position[1];

        const scale = prototype.minWidth + Math.random() * (prototype.maxWidth - prototype.minWidth);

        terrain.treeInstances.push({
          prototypeId,
          position: [worldX, worldY, worldZ],
          rotation: Math.random() * Math.PI * 2,
          scale: [scale, prototype.minHeight + Math.random() * (prototype.maxHeight - prototype.minHeight), scale],
        });

        placed++;
      }
    }

    return placed;
  }

  /**
   * Get terrain by ID
   */
  getTerrain(id: string): TerrainInstance | undefined {
    return this.terrains.get(id);
  }

  /**
   * Get all terrains
   */
  getAllTerrains(): TerrainInstance[] {
    return Array.from(this.terrains.values());
  }

  /**
   * Get all presets
   */
  getPresets(): TerrainPreset[] {
    return [...this.presets];
  }

  /**
   * Delete terrain
   */
  deleteTerrain(id: string): boolean {
    return this.terrains.delete(id);
  }

  /**
   * Export heightmap as PNG data URL
   */
  exportHeightmapAsImage(terrainId: string): string | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const { width, height, data, minHeight, maxHeight } = terrain.heightmap;
    const range = maxHeight - minHeight || 1;

    // Create image data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < data.length; i++) {
      const normalized = ((data[i] - minHeight) / range) * 255;
      const idx = i * 4;
      imageData.data[idx] = normalized;
      imageData.data[idx + 1] = normalized;
      imageData.data[idx + 2] = normalized;
      imageData.data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * Import heightmap from image
   */
  importHeightmapFromImage(terrainId: string, imageDataUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const terrain = this.terrains.get(terrainId);
      if (!terrain) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = terrain.heightmap.width;
        canvas.height = terrain.heightmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < terrain.heightmap.data.length; i++) {
          // Use red channel, normalize to terrain height
          const value = imageData.data[i * 4] / 255;
          terrain.heightmap.data[i] = value * terrain.config.height;
        }

        this.updateHeightmapBounds(terrain);
        resolve(true);
      };

      img.onerror = () => resolve(false);
      img.src = imageDataUrl;
    });
  }

  /**
   * Get height at world position
   */
  getHeightAtPosition(terrainId: string, x: number, z: number): number | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const { config, heightmap } = terrain;
    const { width, height, data } = heightmap;

    // Convert world to heightmap coords
    const hx = ((x - config.position[0]) / config.width + 0.5) * (width - 1);
    const hz = ((z - config.position[2]) / config.depth + 0.5) * (height - 1);

    if (hx < 0 || hx >= width - 1 || hz < 0 || hz >= height - 1) return null;

    // Bilinear interpolation
    const x0 = Math.floor(hx);
    const z0 = Math.floor(hz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    const fx = hx - x0;
    const fz = hz - z0;

    const h00 = data[z0 * width + x0];
    const h10 = data[z0 * width + x1];
    const h01 = data[z1 * width + x0];
    const h11 = data[z1 * width + x1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz + config.position[1];
  }

  /**
   * LOD (Level of Detail) System
   */

  /**
   * Generate LOD heightmap at specified resolution divisor
   * @param terrainId - Terrain ID
   * @param lodLevel - Resolution divisor (1 = full, 2 = half, 4 = quarter, etc.)
   */
  generateLODHeightmap(terrainId: string, lodLevel: number): HeightmapData | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const { width, height, data, minHeight, maxHeight } = terrain.heightmap;
    const lodWidth = Math.ceil(width / lodLevel);
    const lodHeight = Math.ceil(height / lodLevel);

    const lodData = new Float32Array(lodWidth * lodHeight);

    for (let y = 0; y < lodHeight; y++) {
      for (let x = 0; x < lodWidth; x++) {
        // Sample from original heightmap with averaging
        const srcX = x * lodLevel;
        const srcY = y * lodLevel;

        // Average surrounding samples for better quality
        let sum = 0;
        let count = 0;

        for (let dy = 0; dy < lodLevel && srcY + dy < height; dy++) {
          for (let dx = 0; dx < lodLevel && srcX + dx < width; dx++) {
            sum += data[(srcY + dy) * width + (srcX + dx)];
            count++;
          }
        }

        lodData[y * lodWidth + x] = count > 0 ? sum / count : 0;
      }
    }

    return {
      width: lodWidth,
      height: lodHeight,
      data: lodData,
      minHeight,
      maxHeight,
    };
  }

  /**
   * Generate mesh geometry for terrain at specified LOD level
   * Returns vertex positions, normals, UVs, and indices
   */
  generateTerrainMesh(
    terrainId: string,
    lodLevel: number = 1
  ): {
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    triangleCount: number;
  } | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const lodHeightmap = lodLevel === 1 ? terrain.heightmap : this.generateLODHeightmap(terrainId, lodLevel);
    if (!lodHeightmap) return null;

    const { width, height, data } = lodHeightmap;
    const { config } = terrain;

    const vertexCount = width * height;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    // Generate vertices
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width + x;
        const vIdx = idx * 3;
        const uIdx = idx * 2;

        // Position
        const worldX = ((x / (width - 1)) - 0.5) * config.width + config.position[0];
        const worldY = data[idx] + config.position[1];
        const worldZ = ((z / (height - 1)) - 0.5) * config.depth + config.position[2];

        positions[vIdx] = worldX;
        positions[vIdx + 1] = worldY;
        positions[vIdx + 2] = worldZ;

        // UVs
        uvs[uIdx] = x / (width - 1);
        uvs[uIdx + 1] = z / (height - 1);
      }
    }

    // Calculate normals
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width + x;
        const vIdx = idx * 3;

        // Get heights of neighbors (with clamping)
        const hL = data[z * width + Math.max(0, x - 1)];
        const hR = data[z * width + Math.min(width - 1, x + 1)];
        const hD = data[Math.max(0, z - 1) * width + x];
        const hU = data[Math.min(height - 1, z + 1) * width + x];

        // Calculate normal
        const scale = config.width / (width - 1);
        const nx = (hL - hR) / (2 * scale);
        const nz = (hD - hU) / (2 * scale);
        const ny = 1;

        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals[vIdx] = nx / len;
        normals[vIdx + 1] = ny / len;
        normals[vIdx + 2] = nz / len;
      }
    }

    // Generate indices for triangles
    const triangleCount = (width - 1) * (height - 1) * 2;
    const indices = new Uint32Array(triangleCount * 3);

    let iIdx = 0;
    for (let z = 0; z < height - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const topLeft = z * width + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * width + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices[iIdx++] = topLeft;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = topRight;

        // Second triangle
        indices[iIdx++] = topRight;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = bottomRight;
      }
    }

    return {
      positions,
      normals,
      uvs,
      indices,
      vertexCount,
      triangleCount,
    };
  }

  /**
   * Calculate appropriate LOD level based on camera distance
   */
  calculateLODLevel(
    distance: number,
    lodDistances: number[] = [0, 100, 200, 400, 800]
  ): number {
    for (let i = lodDistances.length - 1; i >= 0; i--) {
      if (distance >= lodDistances[i]) {
        return Math.pow(2, i); // 1, 2, 4, 8, 16
      }
    }
    return 1;
  }

  /**
   * Generate all LOD levels for terrain
   */
  generateAllLODLevels(
    terrainId: string,
    levels: number[] = [1, 2, 4, 8, 16]
  ): Map<number, ReturnType<typeof this.generateTerrainMesh>> {
    const lodMeshes = new Map<number, ReturnType<typeof this.generateTerrainMesh>>();

    for (const level of levels) {
      const mesh = this.generateTerrainMesh(terrainId, level);
      if (mesh) {
        lodMeshes.set(level, mesh);
      }
    }

    return lodMeshes;
  }

  /**
   * Get terrain chunk for chunked LOD rendering
   * Useful for very large terrains
   */
  getTerrainChunk(
    terrainId: string,
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    lodLevel: number = 1
  ): {
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
  } | null {
    const terrain = this.terrains.get(terrainId);
    if (!terrain) return null;

    const { width, height, data } = terrain.heightmap;
    const { config } = terrain;

    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;
    const endX = Math.min(startX + chunkSize + 1, width);
    const endZ = Math.min(startZ + chunkSize + 1, height);

    const chunkWidth = Math.ceil((endX - startX) / lodLevel);
    const chunkHeight = Math.ceil((endZ - startZ) / lodLevel);

    const vertexCount = chunkWidth * chunkHeight;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    // Generate chunk vertices
    for (let z = 0; z < chunkHeight; z++) {
      for (let x = 0; x < chunkWidth; x++) {
        const srcX = startX + x * lodLevel;
        const srcZ = startZ + z * lodLevel;
        const srcIdx = Math.min(srcZ, height - 1) * width + Math.min(srcX, width - 1);

        const idx = z * chunkWidth + x;
        const vIdx = idx * 3;
        const uIdx = idx * 2;

        // Position
        const worldX = ((srcX / (width - 1)) - 0.5) * config.width + config.position[0];
        const worldY = data[srcIdx] + config.position[1];
        const worldZ = ((srcZ / (height - 1)) - 0.5) * config.depth + config.position[2];

        positions[vIdx] = worldX;
        positions[vIdx + 1] = worldY;
        positions[vIdx + 2] = worldZ;

        // UVs (relative to full terrain)
        uvs[uIdx] = srcX / (width - 1);
        uvs[uIdx + 1] = srcZ / (height - 1);

        // Normal calculation (simplified)
        const hL = data[srcIdx - Math.min(1, srcX)];
        const hR = data[srcIdx + Math.min(1, width - 1 - srcX)];
        const hD = data[srcIdx - Math.min(width, srcZ * width)];
        const hU = data[srcIdx + Math.min(width, (height - 1 - srcZ) * width)];

        const scale = config.width / (width - 1) * lodLevel;
        const nx = (hL - hR) / (2 * scale);
        const nz = (hD - hU) / (2 * scale);
        const ny = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        normals[vIdx] = nx / len;
        normals[vIdx + 1] = ny / len;
        normals[vIdx + 2] = nz / len;
      }
    }

    // Generate indices
    const triangleCount = (chunkWidth - 1) * (chunkHeight - 1) * 2;
    const indices = new Uint32Array(triangleCount * 3);

    let iIdx = 0;
    for (let z = 0; z < chunkHeight - 1; z++) {
      for (let x = 0; x < chunkWidth - 1; x++) {
        const topLeft = z * chunkWidth + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * chunkWidth + x;
        const bottomRight = bottomLeft + 1;

        indices[iIdx++] = topLeft;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = topRight;

        indices[iIdx++] = topRight;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = bottomRight;
      }
    }

    return { positions, normals, uvs, indices };
  }
}

export const terrainEditor3D = new TerrainEditor3DService();
