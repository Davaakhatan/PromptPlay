import { defineComponent, Types } from 'bitecs';

export const Animation = defineComponent({
  // Current frame index
  currentFrame: Types.ui16,
  // Total frames in animation
  frameCount: Types.ui16,
  // Frame duration in milliseconds
  frameDuration: Types.f32,
  // Time accumulated since last frame change
  elapsed: Types.f32,
  // Is animation playing
  isPlaying: Types.ui8,
  // Should loop
  loop: Types.ui8,
  // Animation ID (for multiple animations per sprite)
  animationId: Types.ui16,
});
