# @promptplay/runtime-3d

3D runtime for the PromptPlay game engine, built on Three.js.

## Features

- Three.js-based 3D rendering
- ECS integration with bitecs
- PBR materials support
- GLTF model loading
- 3D physics (Cannon-es) - coming soon

## Installation

```bash
pnpm add @promptplay/runtime-3d
```

## Usage

```typescript
import { Game3D, ThreeRenderer } from '@promptplay/runtime-3d';

// Create a 3D game instance
const game = new Game3D({
  canvas: document.getElementById('game-canvas'),
  width: 800,
  height: 600,
});

// Load a game spec
game.loadSpec(gameSpec);

// Start the game loop
game.start();
```

## Components

### Transform3D
Extended transform with Z position and full 3D rotation.

```typescript
{
  x: number,
  y: number,
  z: number,
  rotationX: number,  // Euler angles in radians
  rotationY: number,
  rotationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
}
```

### Mesh
3D geometry and material reference.

```typescript
{
  geometry: 'box' | 'sphere' | 'plane' | 'cylinder' | 'cone' | 'torus',
  width: number,
  height: number,
  depth: number,
  materialId: number,  // Reference to Material component
  castShadow: boolean,
  receiveShadow: boolean
}
```

### Material
PBR material properties.

```typescript
{
  color: string,       // Hex color
  metallic: number,    // 0-1
  roughness: number,   // 0-1
  opacity: number,     // 0-1
  emissive: string,    // Hex color
  emissiveIntensity: number
}
```

### Light
Light sources for the scene.

```typescript
{
  type: 'ambient' | 'directional' | 'point' | 'spot',
  color: string,
  intensity: number,
  castShadow: boolean,
  // For directional/spot:
  targetX: number,
  targetY: number,
  targetZ: number
}
```

## Architecture

```
runtime-3d/
├── src/
│   ├── index.ts           # Main exports
│   ├── Game3D.ts          # 3D game loop
│   ├── renderers/
│   │   └── ThreeRenderer.ts
│   ├── systems/
│   │   ├── Render3DSystem.ts
│   │   ├── Transform3DSystem.ts
│   │   └── LightingSystem.ts
│   └── physics/
│       └── CannonPhysics.ts  # Future
└── tests/
```

## License

MIT
