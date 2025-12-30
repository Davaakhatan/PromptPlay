import { defineComponent, Types } from 'bitecs';

export const Input = defineComponent({
  moveSpeed: Types.f32,
  jumpForce: Types.f32,
  canJump: Types.ui8,
});
