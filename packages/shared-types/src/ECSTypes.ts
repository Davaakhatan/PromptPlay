// ECS system interface
export interface ISystem {
  init(world: any): void;
  update(world: any, deltaTime: number): void;
  cleanup?(world: any): void;
}

// Component type markers
export enum ComponentType {
  Transform,
  Velocity,
  Sprite,
  Collider,
  Input,
  Health,
  AIBehavior,
}

// Entity ID type alias
export type EntityId = number;
