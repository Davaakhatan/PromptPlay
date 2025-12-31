export interface GameSpec {
    version: string;
    metadata: GameMetadata;
    config: GameConfig;
    entities: EntitySpec[];
    systems: string[];
}
export interface GameMetadata {
    title: string;
    genre: 'platformer' | 'shooter' | 'puzzle';
    description: string;
}
export interface GameConfig {
    gravity: {
        x: number;
        y: number;
    };
    worldBounds: {
        width: number;
        height: number;
    };
}
export interface EntitySpec {
    name: string;
    components: EntityComponents;
    tags?: string[];
}
export interface EntityComponents {
    transform?: TransformComponent;
    velocity?: VelocityComponent;
    sprite?: SpriteComponent;
    collider?: ColliderComponent;
    input?: InputComponent;
    health?: HealthComponent;
    aiBehavior?: AIBehaviorComponent;
}
export interface TransformComponent {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}
export interface VelocityComponent {
    vx: number;
    vy: number;
}
export interface SpriteComponent {
    texture: string;
    width: number;
    height: number;
    tint?: string | number;
}
export interface ColliderComponent {
    type: 'box' | 'circle';
    width?: number;
    height?: number;
    radius?: number;
    isSensor?: boolean;
    layer?: number;
}
export interface InputComponent {
    moveSpeed: number;
    jumpForce: number;
    canJump?: boolean;
}
export interface HealthComponent {
    current: number;
    max: number;
}
export interface AIBehaviorComponent {
    type: 'patrol' | 'chase' | 'flee';
    speed: number;
    detectionRadius: number;
    targetEntity?: number;
}
//# sourceMappingURL=GameTypes.d.ts.map