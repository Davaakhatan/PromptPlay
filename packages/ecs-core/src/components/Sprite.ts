import { defineComponent, Types } from 'bitecs';

export const Sprite = defineComponent({
  textureId: Types.ui32, // Index into texture registry
  width: Types.f32,
  height: Types.f32,
  tint: Types.ui32, // ARGB color
  visible: Types.ui8,
});
