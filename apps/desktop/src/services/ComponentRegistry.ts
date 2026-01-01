
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
        frameCount: { type: 'number', label: 'Frame Count', min: 1, defaultValue: 1 },
        frameDuration: { type: 'number', label: 'Frame Duration (ms)', min: 16, defaultValue: 100 },
        loop: { type: 'boolean', label: 'Loop', defaultValue: true },
        isPlaying: { type: 'boolean', label: 'Is Playing', defaultValue: true },
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
