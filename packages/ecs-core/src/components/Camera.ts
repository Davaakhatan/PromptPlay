import { defineComponent, Types } from 'bitecs';

export const Camera = defineComponent({
  // Camera position (can differ from entity transform for effects)
  offsetX: Types.f32,
  offsetY: Types.f32,
  // Zoom level (1.0 = normal, 2.0 = 2x zoom in, 0.5 = zoom out)
  zoom: Types.f32,
  // Target entity to follow (0 = no follow)
  followTarget: Types.eid,
  // Follow smoothing (0 = instant, 1 = very smooth)
  followSmoothing: Types.f32,
  // Viewport bounds
  viewportWidth: Types.f32,
  viewportHeight: Types.f32,
  // Screen shake
  shakeIntensity: Types.f32,
  shakeDuration: Types.f32,
  shakeElapsed: Types.f32,
  // Is this the active camera
  isActive: Types.ui8,
});
