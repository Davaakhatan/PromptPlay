// Main export
export { Runtime2D, Runtime2DConfig } from './Runtime2D';

// Export subsystems for advanced usage
export { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
export { MatterPhysics } from './physics/MatterPhysics';
export { InputManager } from './input/InputManager';
export { GameLoop } from './gameloop/GameLoop';

// Export systems
export { InputSystem } from './systems/InputSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { AIBehaviorSystem } from './systems/AIBehaviorSystem';
export { CameraSystem, CameraState } from './systems/CameraSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export { CollisionEventSystem, CollisionHandler, CollisionRule } from './systems/CollisionEventSystem';
export {
  AudioSystem,
  playAudio,
  stopAudio,
  setAudioVolume,
  setAudioPitch,
  enableSpatialAudio,
  disableSpatialAudio,
} from './systems/AudioSystem';

// Export types
export { RenderableParticle, DebugInfo } from './renderers/Canvas2DRenderer';
