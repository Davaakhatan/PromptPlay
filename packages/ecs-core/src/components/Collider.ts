import { defineComponent, Types } from 'bitecs';

export const Collider = defineComponent({
  type: Types.ui8, // 0 = box, 1 = circle
  width: Types.f32,
  height: Types.f32,
  radius: Types.f32,
  isSensor: Types.ui8,
  isStatic: Types.ui8, // 1 = static body (doesn't move, for platforms/ground)
  layer: Types.ui8, // Collision layer mask
});
