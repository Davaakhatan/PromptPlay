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
    animation?: AnimationComponent;
    camera?: CameraComponent;
    particleEmitter?: ParticleEmitterComponent;
    audio?: AudioComponent;
    [key: string]: unknown;
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
    isStatic?: boolean;
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
export interface AnimationComponent {
    currentState?: string;
    states?: AnimationState[];
    spriteSheet?: string;
    frameWidth?: number;
    frameHeight?: number;
    currentFrame?: number;
}
export interface CameraComponent {
    followTarget?: string;
    zoom?: number;
    bounds?: { x: number; y: number; width: number; height: number };
}
export interface ParticleEmitterComponent {
    preset?: string;
    emitRate?: number;
    maxParticles?: number;
    minLifetime?: number;
    maxLifetime?: number;
    isEmitting?: boolean;
}
export interface AudioComponent {
    source: string;
    volume?: number;
    pitch?: number;
    isPlaying?: boolean;
    loop?: boolean;
    spatial?: boolean;
}
export interface AnimationState {
    name: string;
    frameStart: number;
    frameEnd: number;
    frameDuration: number;
    loop: boolean;
}
//# sourceMappingURL=GameTypes.d.ts.map