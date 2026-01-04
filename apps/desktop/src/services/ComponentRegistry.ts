
export type FieldType = 'number' | 'string' | 'boolean' | 'color' | 'select' | 'vector2';

export interface FieldSchema {
    type: FieldType;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: any }[]; // For select
    defaultValue?: any;
}

export interface ComponentSchema {
    name: string;
    description?: string;
    fields: Record<string, FieldSchema>;
}

class ComponentRegistry {
    private schemas: Record<string, ComponentSchema> = {};

    register(schema: ComponentSchema) {
        this.schemas[schema.name] = schema;
    }

    get(name: string): ComponentSchema | undefined {
        return this.schemas[name];
    }

    getAll(): ComponentSchema[] {
        return Object.values(this.schemas);
    }
}

export const componentRegistry = new ComponentRegistry();

// Data-Driven Definitions for Core Components

componentRegistry.register({
    name: 'transform',
    description: 'Position, rotation, and scale',
    fields: {
        x: { type: 'number', label: 'X', step: 1 },
        y: { type: 'number', label: 'Y', step: 1 },
        rotation: { type: 'number', label: 'Rotation', min: -180, max: 180, step: 1 },
        scaleX: { type: 'number', label: 'Scale X', min: 0.1, max: 5, step: 0.1 },
        scaleY: { type: 'number', label: 'Scale Y', min: 0.1, max: 5, step: 0.1 },
    },
});

componentRegistry.register({
    name: 'sprite',
    description: 'Visual representation',
    fields: {
        texture: {
            type: 'select',
            label: 'Texture',
            options: [
                { label: 'Default', value: 'default' },
                { label: 'Player', value: 'player' },
                { label: 'Enemy', value: 'enemy' },
                { label: 'Platform', value: 'platform' },
                { label: 'Coin', value: 'coin' },
            ],
        },
        tint: { type: 'color', label: 'Tint' },
        width: { type: 'number', label: 'Width', min: 1 },
        height: { type: 'number', label: 'Height', min: 1 },
        visible: { type: 'boolean', label: 'Visible' },
    },
});

componentRegistry.register({
    name: 'collider',
    description: 'Physics collision storage',
    fields: {
        type: {
            type: 'select',
            label: 'Type',
            options: [
                { label: 'Box', value: 'box' },
                { label: 'Circle', value: 'circle' },
            ],
        },
        width: { type: 'number', label: 'Width', min: 1 },
        height: { type: 'number', label: 'Height', min: 1 },
        sensor: { type: 'boolean', label: 'Is Sensor' },
    },
});

componentRegistry.register({
    name: 'physics',
    description: 'Physics properties',
    fields: {
        mass: { type: 'number', label: 'Mass', min: 0 },
        friction: { type: 'number', label: 'Friction', min: 0, max: 1, step: 0.1 },
        restitution: { type: 'number', label: 'Bounciness', min: 0, max: 2, step: 0.1 },
        isStatic: { type: 'boolean', label: 'Static' },
    },
});

componentRegistry.register({
    name: 'velocity',
    description: 'Movement speed',
    fields: {
        vx: { type: 'number', label: 'Velocity X', step: 1, defaultValue: 0 },
        vy: { type: 'number', label: 'Velocity Y', step: 1, defaultValue: 0 },
    },
});

componentRegistry.register({
    name: 'input',
    description: 'Player controls',
    fields: {
        moveSpeed: { type: 'number', label: 'Move Speed', min: 0, max: 500, step: 10, defaultValue: 200 },
        jumpForce: { type: 'number', label: 'Jump Force', step: 10, defaultValue: -400 },
        canJump: { type: 'boolean', label: 'Can Jump', defaultValue: true },
    },
});

componentRegistry.register({
    name: 'health',
    description: 'Health system',
    fields: {
        current: { type: 'number', label: 'Current HP', min: 0, defaultValue: 100 },
        max: { type: 'number', label: 'Max HP', min: 1, defaultValue: 100 },
    },
});

componentRegistry.register({
    name: 'aiBehavior',
    description: 'AI behavior',
    fields: {
        type: {
            type: 'select',
            label: 'Behavior Type',
            options: [
                { label: 'Patrol', value: 'patrol' },
                { label: 'Chase', value: 'chase' },
                { label: 'Flee', value: 'flee' },
            ],
            defaultValue: 'patrol',
        },
        speed: { type: 'number', label: 'Speed', min: 0, max: 300, step: 10, defaultValue: 50 },
        detectionRadius: { type: 'number', label: 'Detection Radius', min: 0, max: 500, step: 10, defaultValue: 100 },
    },
});

componentRegistry.register({
    name: 'animation',
    description: 'Sprite animations',
    fields: {
        frameCount: { type: 'number', label: 'Frame Count', min: 1, defaultValue: 4 },
        frameDuration: { type: 'number', label: 'Frame Duration (ms)', min: 16, defaultValue: 100 },
        loop: { type: 'boolean', label: 'Loop', defaultValue: true },
        isPlaying: { type: 'boolean', label: 'Is Playing', defaultValue: true },
        spriteSheet: { type: 'string', label: 'Sprite Sheet', defaultValue: '' },
        frameWidth: { type: 'number', label: 'Frame Width', min: 1, defaultValue: 32 },
        frameHeight: { type: 'number', label: 'Frame Height', min: 1, defaultValue: 32 },
    },
});

componentRegistry.register({
    name: 'camera',
    description: 'Camera control',
    fields: {
        zoom: { type: 'number', label: 'Zoom', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
        followSmoothing: { type: 'number', label: 'Follow Smoothing', min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
        isActive: { type: 'boolean', label: 'Is Active', defaultValue: false },
    },
});

componentRegistry.register({
    name: 'particleEmitter',
    description: 'Particle effects',
    fields: {
        emitRate: { type: 'number', label: 'Emit Rate', min: 0, max: 100, defaultValue: 10 },
        maxParticles: { type: 'number', label: 'Max Particles', min: 1, max: 1000, defaultValue: 100 },
        minLifetime: { type: 'number', label: 'Min Lifetime', min: 0.1, max: 10, step: 0.1, defaultValue: 0.5 },
        maxLifetime: { type: 'number', label: 'Max Lifetime', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 },
        startColor: { type: 'color', label: 'Start Color', defaultValue: 0xFFFF00 },
        endColor: { type: 'color', label: 'End Color', defaultValue: 0xFF0000 },
        isEmitting: { type: 'boolean', label: 'Is Emitting', defaultValue: true },
    },
});

componentRegistry.register({
    name: 'audio',
    description: 'Sound playback',
    fields: {
        source: { type: 'string', label: 'Audio File', defaultValue: 'sound.mp3' },
        volume: { type: 'number', label: 'Volume', min: 0, max: 1, step: 0.1, defaultValue: 1 },
        pitch: { type: 'number', label: 'Pitch', min: 0.1, max: 4, step: 0.1, defaultValue: 1 },
        loop: { type: 'boolean', label: 'Loop', defaultValue: false },
        spatial: { type: 'boolean', label: 'Spatial Audio', defaultValue: false },
    },
});

// 3D Components

componentRegistry.register({
    name: 'transform3d',
    description: '3D Position, rotation, and scale',
    fields: {
        x: { type: 'number', label: 'X', step: 0.1, defaultValue: 0 },
        y: { type: 'number', label: 'Y', step: 0.1, defaultValue: 0 },
        z: { type: 'number', label: 'Z', step: 0.1, defaultValue: 0 },
        rotationX: { type: 'number', label: 'Rotation X', min: -180, max: 180, step: 1, defaultValue: 0 },
        rotationY: { type: 'number', label: 'Rotation Y', min: -180, max: 180, step: 1, defaultValue: 0 },
        rotationZ: { type: 'number', label: 'Rotation Z', min: -180, max: 180, step: 1, defaultValue: 0 },
        scaleX: { type: 'number', label: 'Scale X', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
        scaleY: { type: 'number', label: 'Scale Y', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
        scaleZ: { type: 'number', label: 'Scale Z', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
    },
});

componentRegistry.register({
    name: 'mesh',
    description: '3D Mesh geometry',
    fields: {
        geometry: {
            type: 'select',
            label: 'Geometry',
            options: [
                { label: 'Box', value: 'box' },
                { label: 'Sphere', value: 'sphere' },
                { label: 'Cylinder', value: 'cylinder' },
                { label: 'Cone', value: 'cone' },
                { label: 'Plane', value: 'plane' },
                { label: 'Torus', value: 'torus' },
            ],
            defaultValue: 'box',
        },
        width: { type: 'number', label: 'Width', min: 0.1, step: 0.1, defaultValue: 1 },
        height: { type: 'number', label: 'Height', min: 0.1, step: 0.1, defaultValue: 1 },
        depth: { type: 'number', label: 'Depth', min: 0.1, step: 0.1, defaultValue: 1 },
        radius: { type: 'number', label: 'Radius', min: 0.1, step: 0.1, defaultValue: 0.5 },
        castShadow: { type: 'boolean', label: 'Cast Shadow', defaultValue: true },
        receiveShadow: { type: 'boolean', label: 'Receive Shadow', defaultValue: true },
        visible: { type: 'boolean', label: 'Visible', defaultValue: true },
    },
});

componentRegistry.register({
    name: 'material',
    description: '3D Material properties',
    fields: {
        color: { type: 'color', label: 'Color', defaultValue: 0x3498db },
        metallic: { type: 'number', label: 'Metallic', min: 0, max: 1, step: 0.1, defaultValue: 0.1 },
        roughness: { type: 'number', label: 'Roughness', min: 0, max: 1, step: 0.1, defaultValue: 0.7 },
        opacity: { type: 'number', label: 'Opacity', min: 0, max: 1, step: 0.1, defaultValue: 1 },
        wireframe: { type: 'boolean', label: 'Wireframe', defaultValue: false },
    },
});

componentRegistry.register({
    name: 'model3d',
    description: 'Load 3D model (GLTF/GLB)',
    fields: {
        url: { type: 'string', label: 'Model URL/Path', defaultValue: '' },
        scale: { type: 'number', label: 'Scale', min: 0.01, max: 100, step: 0.1, defaultValue: 1 },
        castShadow: { type: 'boolean', label: 'Cast Shadow', defaultValue: true },
        receiveShadow: { type: 'boolean', label: 'Receive Shadow', defaultValue: true },
        animationName: { type: 'string', label: 'Animation Name', defaultValue: '' },
        animationLoop: { type: 'boolean', label: 'Loop Animation', defaultValue: true },
        animationSpeed: { type: 'number', label: 'Animation Speed', min: 0, max: 5, step: 0.1, defaultValue: 1 },
    },
});

componentRegistry.register({
    name: 'collider3d',
    description: '3D Physics collider',
    fields: {
        type: {
            type: 'select',
            label: 'Type',
            options: [
                { label: 'Box', value: 'box' },
                { label: 'Sphere', value: 'sphere' },
                { label: 'Capsule', value: 'capsule' },
                { label: 'Cylinder', value: 'cylinder' },
            ],
            defaultValue: 'box',
        },
        width: { type: 'number', label: 'Width', min: 0.1, step: 0.1, defaultValue: 1 },
        height: { type: 'number', label: 'Height', min: 0.1, step: 0.1, defaultValue: 1 },
        depth: { type: 'number', label: 'Depth', min: 0.1, step: 0.1, defaultValue: 1 },
        radius: { type: 'number', label: 'Radius', min: 0.1, step: 0.1, defaultValue: 0.5 },
        mass: { type: 'number', label: 'Mass', min: 0, step: 0.1, defaultValue: 1 },
        friction: { type: 'number', label: 'Friction', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
        restitution: { type: 'number', label: 'Bounciness', min: 0, max: 2, step: 0.1, defaultValue: 0.3 },
        isTrigger: { type: 'boolean', label: 'Is Trigger', defaultValue: false },
    },
});

componentRegistry.register({
    name: 'rigidbody3d',
    description: '3D Physics body',
    fields: {
        type: {
            type: 'select',
            label: 'Body Type',
            options: [
                { label: 'Dynamic', value: 'dynamic' },
                { label: 'Static', value: 'static' },
                { label: 'Kinematic', value: 'kinematic' },
            ],
            defaultValue: 'dynamic',
        },
        mass: { type: 'number', label: 'Mass', min: 0, step: 0.1, defaultValue: 1 },
        linearDamping: { type: 'number', label: 'Linear Damping', min: 0, max: 1, step: 0.01, defaultValue: 0.01 },
        angularDamping: { type: 'number', label: 'Angular Damping', min: 0, max: 1, step: 0.01, defaultValue: 0.01 },
        fixedRotation: { type: 'boolean', label: 'Fixed Rotation', defaultValue: false },
    },
});

componentRegistry.register({
    name: 'input3d',
    description: '3D Player controls',
    fields: {
        moveSpeed: { type: 'number', label: 'Move Speed', min: 0, max: 50, step: 0.5, defaultValue: 5 },
        jumpForce: { type: 'number', label: 'Jump Force', min: 0, max: 50, step: 0.5, defaultValue: 10 },
        canJump: { type: 'boolean', label: 'Can Jump', defaultValue: true },
        isGrounded: { type: 'boolean', label: 'Is Grounded', defaultValue: true },
    },
});

componentRegistry.register({
    name: 'velocity3d',
    description: '3D Movement velocity',
    fields: {
        vx: { type: 'number', label: 'Velocity X', step: 0.1, defaultValue: 0 },
        vy: { type: 'number', label: 'Velocity Y', step: 0.1, defaultValue: 0 },
        vz: { type: 'number', label: 'Velocity Z', step: 0.1, defaultValue: 0 },
        angularX: { type: 'number', label: 'Angular X', step: 0.1, defaultValue: 0 },
        angularY: { type: 'number', label: 'Angular Y', step: 0.1, defaultValue: 0 },
        angularZ: { type: 'number', label: 'Angular Z', step: 0.1, defaultValue: 0 },
    },
});

componentRegistry.register({
    name: 'light',
    description: '3D Light source',
    fields: {
        type: {
            type: 'select',
            label: 'Light Type',
            options: [
                { label: 'Ambient', value: 'ambient' },
                { label: 'Directional', value: 'directional' },
                { label: 'Point', value: 'point' },
                { label: 'Spot', value: 'spot' },
            ],
            defaultValue: 'point',
        },
        color: { type: 'color', label: 'Color', defaultValue: 0xFFFFFF },
        intensity: { type: 'number', label: 'Intensity', min: 0, max: 10, step: 0.1, defaultValue: 1 },
        castShadow: { type: 'boolean', label: 'Cast Shadow', defaultValue: true },
        distance: { type: 'number', label: 'Distance', min: 0, step: 1, defaultValue: 0 },
        decay: { type: 'number', label: 'Decay', min: 0, max: 5, step: 0.1, defaultValue: 2 },
    },
});

componentRegistry.register({
    name: 'camera3d',
    description: '3D Camera',
    fields: {
        type: {
            type: 'select',
            label: 'Camera Type',
            options: [
                { label: 'Perspective', value: 'perspective' },
                { label: 'Orthographic', value: 'orthographic' },
            ],
            defaultValue: 'perspective',
        },
        fov: { type: 'number', label: 'Field of View', min: 10, max: 120, step: 1, defaultValue: 75 },
        near: { type: 'number', label: 'Near Plane', min: 0.01, max: 10, step: 0.01, defaultValue: 0.1 },
        far: { type: 'number', label: 'Far Plane', min: 10, max: 10000, step: 10, defaultValue: 1000 },
        isActive: { type: 'boolean', label: 'Is Active', defaultValue: true },
        followSmoothing: { type: 'number', label: 'Follow Smoothing', min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
    },
});

// Visual Effects

componentRegistry.register({
    name: 'particleEmitter',
    description: 'Particle effects (fire, smoke, sparkles)',
    fields: {
        preset: {
            type: 'select',
            label: 'Preset',
            options: [
                { label: 'Custom', value: 'custom' },
                { label: 'Fire', value: 'fire' },
                { label: 'Smoke', value: 'smoke' },
                { label: 'Sparkle', value: 'sparkle' },
                { label: 'Explosion', value: 'explosion' },
                { label: 'Rain', value: 'rain' },
                { label: 'Snow', value: 'snow' },
                { label: 'Confetti', value: 'confetti' },
                { label: 'Trail', value: 'trail' },
            ],
            defaultValue: 'fire',
        },
        emissionRate: { type: 'number', label: 'Emission Rate', min: 0, max: 200, step: 5, defaultValue: 50 },
        maxParticles: { type: 'number', label: 'Max Particles', min: 10, max: 1000, step: 10, defaultValue: 200 },
        speed: { type: 'number', label: 'Speed', min: 0, max: 500, step: 10, defaultValue: 100 },
        speedVariance: { type: 'number', label: 'Speed Variance', min: 0, max: 100, step: 5, defaultValue: 20 },
        angle: { type: 'number', label: 'Angle', min: -180, max: 180, step: 5, defaultValue: -90 },
        angleVariance: { type: 'number', label: 'Spread', min: 0, max: 180, step: 5, defaultValue: 15 },
        lifetime: { type: 'number', label: 'Lifetime (s)', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
        sizeStart: { type: 'number', label: 'Size Start', min: 1, max: 100, step: 1, defaultValue: 20 },
        sizeEnd: { type: 'number', label: 'Size End', min: 0, max: 100, step: 1, defaultValue: 5 },
        colorStart: { type: 'color', label: 'Color Start', defaultValue: '#ff6600' },
        colorEnd: { type: 'color', label: 'Color End', defaultValue: '#ff0000' },
        alphaStart: { type: 'number', label: 'Alpha Start', min: 0, max: 1, step: 0.1, defaultValue: 1 },
        alphaEnd: { type: 'number', label: 'Alpha End', min: 0, max: 1, step: 0.1, defaultValue: 0 },
        gravity: { type: 'number', label: 'Gravity', min: -500, max: 500, step: 10, defaultValue: 0 },
        blendMode: {
            type: 'select',
            label: 'Blend Mode',
            options: [
                { label: 'Normal', value: 'normal' },
                { label: 'Additive', value: 'additive' },
                { label: 'Multiply', value: 'multiply' },
            ],
            defaultValue: 'additive',
        },
        shape: {
            type: 'select',
            label: 'Shape',
            options: [
                { label: 'Circle', value: 'circle' },
                { label: 'Square', value: 'square' },
                { label: 'Star', value: 'star' },
                { label: 'Spark', value: 'spark' },
            ],
            defaultValue: 'circle',
        },
        active: { type: 'boolean', label: 'Active', defaultValue: true },
    },
});

componentRegistry.register({
    name: 'audioSource',
    description: 'Sound and music playback',
    fields: {
        soundId: { type: 'string', label: 'Sound ID' },
        type: {
            type: 'select',
            label: 'Type',
            options: [
                { label: 'Sound Effect', value: 'sfx' },
                { label: 'Music', value: 'music' },
                { label: 'Ambient', value: 'ambient' },
            ],
            defaultValue: 'sfx',
        },
        volume: { type: 'number', label: 'Volume', min: 0, max: 1, step: 0.1, defaultValue: 1 },
        loop: { type: 'boolean', label: 'Loop', defaultValue: false },
        playOnStart: { type: 'boolean', label: 'Play on Start', defaultValue: false },
        spatial: { type: 'boolean', label: '3D Audio', defaultValue: false },
        minDistance: { type: 'number', label: 'Min Distance', min: 0, max: 1000, step: 10, defaultValue: 100 },
        maxDistance: { type: 'number', label: 'Max Distance', min: 0, max: 5000, step: 50, defaultValue: 1000 },
    },
});

componentRegistry.register({
    name: 'tilemap',
    description: 'Tile-based level layout',
    fields: {
        tilemapId: { type: 'string', label: 'Tilemap ID' },
        tileSize: { type: 'number', label: 'Tile Size', min: 8, max: 128, step: 8, defaultValue: 32 },
        offsetX: { type: 'number', label: 'Offset X', step: 1, defaultValue: 0 },
        offsetY: { type: 'number', label: 'Offset Y', step: 1, defaultValue: 0 },
        visible: { type: 'boolean', label: 'Visible', defaultValue: true },
    },
});
