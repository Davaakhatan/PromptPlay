import type { Game3DSpec, Entity3DComponents } from '@promptplay/shared-types';

/**
 * 3D Game template definition
 */
export interface Game3DTemplate {
  id: string;
  name: string;
  description: string;
  genre: string;
  icon: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

/**
 * 3D Prefab definition
 */
export interface Prefab3D {
  id: string;
  name: string;
  description: string;
  category: 'primitive' | 'character' | 'environment' | 'light' | 'camera' | 'effect';
  icon: string;
  components: Entity3DComponents;
  tags?: string[];
}

// Built-in 3D game templates
export const GAME_3D_TEMPLATES: Game3DTemplate[] = [
  {
    id: 'fps-basic',
    name: 'First Person',
    description: 'Basic first-person 3D environment with player controls',
    genre: 'fps',
    icon: '🎯',
    color: 'red',
    difficulty: 'intermediate',
    tags: ['3D', 'FPS', 'First Person'],
  },
  {
    id: 'third-person',
    name: 'Third Person',
    description: 'Third-person character controller with camera follow',
    genre: 'action',
    icon: '🏃',
    color: 'blue',
    difficulty: 'intermediate',
    tags: ['3D', 'Action', 'Third Person'],
  },
  {
    id: 'racing-3d',
    name: '3D Racing',
    description: 'Racing game with vehicle physics and track',
    genre: 'racing',
    icon: '🏎️',
    color: 'orange',
    difficulty: 'advanced',
    tags: ['3D', 'Racing', 'Physics'],
  },
  {
    id: 'puzzle-3d',
    name: '3D Puzzle',
    description: 'Physics-based puzzle game with interactive objects',
    genre: 'puzzle',
    icon: '🧊',
    color: 'purple',
    difficulty: 'beginner',
    tags: ['3D', 'Puzzle', 'Physics'],
  },
  {
    id: 'showcase-3d',
    name: '3D Showcase',
    description: 'Empty scene for 3D model showcase with orbit controls',
    genre: 'showcase',
    icon: '🎨',
    color: 'cyan',
    difficulty: 'beginner',
    tags: ['3D', 'Showcase', 'Gallery'],
  },
  {
    id: 'empty-3d',
    name: 'Empty 3D',
    description: 'Blank 3D scene with basic lighting',
    genre: 'custom',
    icon: '📦',
    color: 'gray',
    difficulty: 'beginner',
    tags: ['3D', 'Empty', 'Custom'],
  },
];

// Built-in 3D prefabs
export const PREFABS_3D: Prefab3D[] = [
  // Primitives
  {
    id: 'cube',
    name: 'Cube',
    description: 'Basic cube mesh',
    category: 'primitive',
    icon: '🧊',
    components: {
      transform3d: { x: 0, y: 0.5, z: 0 },
      mesh: { geometry: 'box', width: 1, height: 1, depth: 1 },
      material: { color: '#3498db', metallic: 0.1, roughness: 0.7 },
    },
    tags: ['primitive', 'box'],
  },
  {
    id: 'sphere',
    name: 'Sphere',
    description: 'Basic sphere mesh',
    category: 'primitive',
    icon: '⚽',
    components: {
      transform3d: { x: 0, y: 0.5, z: 0 },
      mesh: { geometry: 'sphere', radius: 0.5 },
      material: { color: '#e74c3c', metallic: 0.3, roughness: 0.5 },
    },
    tags: ['primitive', 'sphere'],
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    description: 'Basic cylinder mesh',
    category: 'primitive',
    icon: '🥫',
    components: {
      transform3d: { x: 0, y: 0.5, z: 0 },
      mesh: { geometry: 'cylinder', radius: 0.5, height: 1 },
      material: { color: '#2ecc71', metallic: 0.2, roughness: 0.6 },
    },
    tags: ['primitive', 'cylinder'],
  },
  {
    id: 'plane',
    name: 'Plane',
    description: 'Flat plane mesh',
    category: 'primitive',
    icon: '⬜',
    components: {
      transform3d: { x: 0, y: 0, z: 0, rotationX: -Math.PI / 2 },
      mesh: { geometry: 'plane', width: 10, height: 10 },
      material: { color: '#7f8c8d', metallic: 0, roughness: 0.9 },
    },
    tags: ['primitive', 'ground', 'floor'],
  },
  // Lights
  {
    id: 'directional-light',
    name: 'Directional Light',
    description: 'Sun-like directional light with shadows',
    category: 'light',
    icon: '☀️',
    components: {
      transform3d: { x: 5, y: 10, z: 5 },
      light: {
        type: 'directional',
        color: '#ffffff',
        intensity: 1,
        castShadow: true,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      },
    },
    tags: ['light', 'sun', 'shadow'],
  },
  {
    id: 'point-light',
    name: 'Point Light',
    description: 'Omni-directional point light',
    category: 'light',
    icon: '💡',
    components: {
      transform3d: { x: 0, y: 3, z: 0 },
      light: {
        type: 'point',
        color: '#ffffff',
        intensity: 1,
        distance: 10,
        decay: 2,
      },
    },
    tags: ['light', 'point'],
  },
  {
    id: 'spot-light',
    name: 'Spot Light',
    description: 'Focused spot light with cone',
    category: 'light',
    icon: '🔦',
    components: {
      transform3d: { x: 0, y: 5, z: 5 },
      light: {
        type: 'spot',
        color: '#ffffff',
        intensity: 1,
        castShadow: true,
        angle: Math.PI / 6,
        penumbra: 0.2,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      },
    },
    tags: ['light', 'spot', 'shadow'],
  },
  {
    id: 'ambient-light',
    name: 'Ambient Light',
    description: 'Global ambient illumination',
    category: 'light',
    icon: '🌤️',
    components: {
      transform3d: { x: 0, y: 0, z: 0 },
      light: {
        type: 'ambient',
        color: '#404040',
        intensity: 0.5,
      },
    },
    tags: ['light', 'ambient'],
  },
  // Camera
  {
    id: 'camera-perspective',
    name: 'Camera',
    description: 'Perspective camera',
    category: 'camera',
    icon: '📷',
    components: {
      transform3d: { x: 0, y: 5, z: 10 },
      camera3d: {
        type: 'perspective',
        fov: 75,
        near: 0.1,
        far: 1000,
        isActive: true,
      },
    },
    tags: ['camera', 'perspective'],
  },
  // Characters
  {
    id: 'player-capsule',
    name: 'Player Capsule',
    description: 'Simple player character capsule',
    category: 'character',
    icon: '🧑',
    components: {
      transform3d: { x: 0, y: 1, z: 0 },
      mesh: { geometry: 'cylinder', radius: 0.5, height: 2 },
      material: { color: '#3498db', metallic: 0.2, roughness: 0.6 },
      collider3d: {
        type: 'capsule',
        radius: 0.5,
        height: 2,
        mass: 1,
      },
    },
    tags: ['player', 'character', 'capsule'],
  },
  // Environment
  {
    id: 'ground-plane',
    name: 'Ground',
    description: 'Large ground plane with physics',
    category: 'environment',
    icon: '🌍',
    components: {
      transform3d: { x: 0, y: 0, z: 0, rotationX: -Math.PI / 2 },
      mesh: { geometry: 'plane', width: 50, height: 50 },
      material: { color: '#2c3e50', metallic: 0, roughness: 0.9 },
      collider3d: {
        type: 'box',
        width: 50,
        height: 0.1,
        depth: 50,
        mass: 0,
      },
    },
    tags: ['ground', 'floor', 'static'],
  },
  {
    id: 'physics-box',
    name: 'Physics Box',
    description: 'Box with physics collision',
    category: 'environment',
    icon: '📦',
    components: {
      transform3d: { x: 0, y: 2, z: 0 },
      mesh: { geometry: 'box', width: 1, height: 1, depth: 1 },
      material: { color: '#e67e22', metallic: 0.1, roughness: 0.7 },
      collider3d: {
        type: 'box',
        width: 1,
        height: 1,
        depth: 1,
        mass: 1,
      },
    },
    tags: ['physics', 'box', 'dynamic'],
  },
  {
    id: 'physics-sphere',
    name: 'Physics Ball',
    description: 'Bouncy ball with physics',
    category: 'environment',
    icon: '🔴',
    components: {
      transform3d: { x: 0, y: 3, z: 0 },
      mesh: { geometry: 'sphere', radius: 0.5 },
      material: { color: '#e74c3c', metallic: 0.2, roughness: 0.4 },
      collider3d: {
        type: 'sphere',
        radius: 0.5,
        mass: 1,
        restitution: 0.8,
      },
    },
    tags: ['physics', 'ball', 'bouncy'],
  },
];

/**
 * Get a 3D game spec from template
 */
export function get3DTemplateSpec(templateId: string, projectName: string): Game3DSpec {
  const template = GAME_3D_TEMPLATES.find((t) => t.id === templateId);

  const baseSpec: Game3DSpec = {
    version: '1.0',
    mode: '3d',
    metadata: {
      title: projectName,
      genre: template?.genre || 'custom',
      description: template?.description || 'A 3D game',
    },
    config: {
      backgroundColor: '#1a1a2e',
      gravity: { x: 0, y: -9.82, z: 0 },
      ambientColor: '#404040',
      ambientIntensity: 0.3,
      worldBounds: { width: 100, height: 100, depth: 100 },
    },
    entities: [],
    systems: ['physics3d', 'render3d', 'camera3d', 'lighting'],
  };

  switch (templateId) {
    case 'fps-basic':
      baseSpec.entities = [
        createEntity('player', PREFABS_3D.find((p) => p.id === 'player-capsule')!, { x: 0, y: 1, z: 5 }),
        createEntity('ground', PREFABS_3D.find((p) => p.id === 'ground-plane')!),
        createEntity('sun', PREFABS_3D.find((p) => p.id === 'directional-light')!),
        createEntity('ambient', PREFABS_3D.find((p) => p.id === 'ambient-light')!),
        createEntity('camera', PREFABS_3D.find((p) => p.id === 'camera-perspective')!, { x: 0, y: 5, z: 10 }),
        // Add some obstacles
        createEntity('box_1', PREFABS_3D.find((p) => p.id === 'cube')!, { x: 3, y: 0.5, z: 0 }),
        createEntity('box_2', PREFABS_3D.find((p) => p.id === 'cube')!, { x: -3, y: 0.5, z: 2 }),
      ];
      break;

    case 'third-person':
      baseSpec.entities = [
        createEntity('player', PREFABS_3D.find((p) => p.id === 'player-capsule')!),
        createEntity('ground', PREFABS_3D.find((p) => p.id === 'ground-plane')!),
        createEntity('sun', PREFABS_3D.find((p) => p.id === 'directional-light')!),
        createEntity('ambient', PREFABS_3D.find((p) => p.id === 'ambient-light')!),
        {
          name: 'follow_camera',
          components: {
            transform3d: { x: 0, y: 8, z: 12 },
            camera3d: {
              type: 'perspective',
              fov: 60,
              near: 0.1,
              far: 1000,
              isActive: true,
              followTarget: 0,
              followSmoothing: 0.1,
              followOffsetX: 0,
              followOffsetY: 5,
              followOffsetZ: 10,
            },
          },
          tags: ['camera'],
        },
      ];
      break;

    case 'puzzle-3d':
      baseSpec.entities = [
        createEntity('ground', PREFABS_3D.find((p) => p.id === 'ground-plane')!),
        createEntity('sun', PREFABS_3D.find((p) => p.id === 'directional-light')!),
        createEntity('ambient', PREFABS_3D.find((p) => p.id === 'ambient-light')!),
        createEntity('camera', PREFABS_3D.find((p) => p.id === 'camera-perspective')!, { x: 0, y: 8, z: 8 }),
        // Puzzle pieces
        createEntity('box_1', PREFABS_3D.find((p) => p.id === 'physics-box')!, { x: -2, y: 2, z: 0 }),
        createEntity('box_2', PREFABS_3D.find((p) => p.id === 'physics-box')!, { x: 0, y: 4, z: 0 }),
        createEntity('box_3', PREFABS_3D.find((p) => p.id === 'physics-box')!, { x: 2, y: 6, z: 0 }),
        createEntity('ball_1', PREFABS_3D.find((p) => p.id === 'physics-sphere')!, { x: 0, y: 8, z: 0 }),
      ];
      break;

    case 'showcase-3d':
      baseSpec.entities = [
        createEntity('ground', PREFABS_3D.find((p) => p.id === 'ground-plane')!),
        createEntity('sun', PREFABS_3D.find((p) => p.id === 'directional-light')!),
        createEntity('ambient', PREFABS_3D.find((p) => p.id === 'ambient-light')!),
        createEntity('camera', PREFABS_3D.find((p) => p.id === 'camera-perspective')!),
        // Showcase items
        createEntity('cube', PREFABS_3D.find((p) => p.id === 'cube')!, { x: -2, y: 0.5, z: 0 }),
        createEntity('sphere', PREFABS_3D.find((p) => p.id === 'sphere')!, { x: 0, y: 0.5, z: 0 }),
        createEntity('cylinder', PREFABS_3D.find((p) => p.id === 'cylinder')!, { x: 2, y: 0.5, z: 0 }),
      ];
      break;

    case 'empty-3d':
    default:
      baseSpec.entities = [
        createEntity('ground', PREFABS_3D.find((p) => p.id === 'ground-plane')!),
        createEntity('sun', PREFABS_3D.find((p) => p.id === 'directional-light')!),
        createEntity('ambient', PREFABS_3D.find((p) => p.id === 'ambient-light')!),
        createEntity('camera', PREFABS_3D.find((p) => p.id === 'camera-perspective')!),
      ];
      break;
  }

  return baseSpec;
}

/**
 * Create entity from prefab with optional position override
 */
function createEntity(
  name: string,
  prefab: Prefab3D,
  position?: { x: number; y: number; z: number }
): { name: string; components: Entity3DComponents; tags?: string[] } {
  const components = { ...prefab.components };

  if (position && components.transform3d) {
    components.transform3d = {
      ...components.transform3d,
      x: position.x,
      y: position.y,
      z: position.z,
    };
  }

  return {
    name,
    components,
    tags: prefab.tags,
  };
}

/**
 * Get prefabs by category
 */
export function get3DPrefabsByCategory(category?: Prefab3D['category']): Prefab3D[] {
  if (!category) return PREFABS_3D;
  return PREFABS_3D.filter((p) => p.category === category);
}

/**
 * Get prefab by ID
 */
export function get3DPrefab(id: string): Prefab3D | undefined {
  return PREFABS_3D.find((p) => p.id === id);
}
