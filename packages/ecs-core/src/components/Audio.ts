import { defineComponent, Types } from 'bitecs';

export const Audio = defineComponent({
  // Audio source ID (mapped to actual audio files)
  sourceId: Types.ui16,
  // Volume (0.0 to 1.0)
  volume: Types.f32,
  // Pitch multiplier
  pitch: Types.f32,
  // Is currently playing
  isPlaying: Types.ui8,
  // Should loop
  loop: Types.ui8,
  // Spatial audio: whether sound is 3D positioned
  spatial: Types.ui8,
  // Max distance for spatial audio
  maxDistance: Types.f32,
});
