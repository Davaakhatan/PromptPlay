import { defineComponent, Types } from 'bitecs';

export const Input = defineComponent({
  moveSpeed: Types.f32,
  jumpForce: Types.f32,
  canJump: Types.ui8,
  isGrounded: Types.ui8, // 1 if touching ground, 0 otherwise
});
