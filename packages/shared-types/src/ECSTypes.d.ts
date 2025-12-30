import { IWorld } from 'bitecs';
export interface ISystem {
    init(world: IWorld): void;
    update(world: IWorld, deltaTime: number): void;
    cleanup?(world: IWorld): void;
}
export declare enum ComponentType {
    Transform = 0,
    Velocity = 1,
    Sprite = 2,
    Collider = 3,
    Input = 4,
    Health = 5,
    AIBehavior = 6
}
export type EntityId = number;
//# sourceMappingURL=ECSTypes.d.ts.map