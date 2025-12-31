
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
