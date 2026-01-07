// Main export
export { Runtime2D, Runtime2DConfig } from './Runtime2D';

// Export subsystems for advanced usage
export { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
export { MatterPhysics } from './physics/MatterPhysics';
export { InputManager, GamepadButton, GamepadAxis, GamepadState } from './input/InputManager';
export { GameLoop } from './gameloop/GameLoop';

// Export systems
export { InputSystem } from './systems/InputSystem';
export { AnimationSystem } from './systems/AnimationSystem';
export { AIBehaviorSystem } from './systems/AIBehaviorSystem';
export { CameraSystem, CameraState } from './systems/CameraSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export { CollisionEventSystem, CollisionHandler, CollisionRule } from './systems/CollisionEventSystem';
export { GameStateSystem, GameStateConfig, GameStateSnapshot } from './systems/GameStateSystem';
export {
  AudioSystem,
  playAudio,
  stopAudio,
  setAudioVolume,
  setAudioPitch,
  enableSpatialAudio,
  disableSpatialAudio,
} from './systems/AudioSystem';

// Export audio
export { SoundManager, SoundConfig, getSoundManager, resetSoundManager } from './audio/SoundManager';

// Export types
export { RenderableParticle, DebugInfo, HUDInfo } from './renderers/Canvas2DRenderer';
