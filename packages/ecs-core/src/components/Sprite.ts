import { defineComponent, Types } from 'bitecs';

export const Sprite = defineComponent({
  textureId: Types.ui32, // Index into texture registry
  width: Types.f32,
  height: Types.f32,
  tint: Types.ui32, // ARGB color
  visible: Types.ui8,
  zIndex: Types.i16, // Render order (-32768 to 32767, higher = front)
  // Sprite sheet support
  frameX: Types.ui16, // Current frame X in sprite sheet
  frameY: Types.ui16, // Current frame Y in sprite sheet
  frameWidth: Types.ui16, // Width of a single frame (0 = use full texture)
  frameHeight: Types.ui16, // Height of a single frame (0 = use full texture)
  // Anchor point (0-1, default 0.5 = center)
  anchorX: Types.f32,
  anchorY: Types.f32,
  // Flip support
  flipX: Types.ui8,
  flipY: Types.ui8,
});
