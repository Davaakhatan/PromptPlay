import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AnimationComponent, AnimationState, EntitySpec } from '@promptplay/shared-types';
import AnimationTimeline from './AnimationTimeline';
import { ImageIcon } from './Icons';

interface AnimationEditorProps {
  entity: EntitySpec;
  animation: AnimationComponent;
  onAnimationChange: (animation: AnimationComponent) => void;
  onClose: () => void;
  projectPath: string | null;
}

// Default animation state for new animations
const createDefaultState = (): AnimationState => ({
  name: 'idle',
  frameStart: 0,
  frameEnd: 3,
  frameDuration: 100,
  loop: true,
});

export default function AnimationEditor({
  entity,
  animation,
  onAnimationChange,
  onClose,
  projectPath,
}: AnimationEditorProps) {
  const [states, setStates] = useState<AnimationState[]>(
    animation.states || [createDefaultState()]
  );
  const [currentState, setCurrentState] = useState(
    animation.currentState || states[0]?.name || 'idle'
  );
  const [currentFrame, setCurrentFrame] = useState(animation.currentFrame || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spriteSheetUrl, setSpriteSheetUrl] = useState<string | null>(null);
  const [spriteSheetDimensions, setSpriteSheetDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  const frameWidth = animation.frameWidth || 32;
  const frameHeight = animation.frameHeight || 32;
  const totalFrames = animation.frameCount || 16;

  const activeState = states.find(s => s.name === currentState);

  // Load sprite sheet image
  useEffect(() => {
    if (animation.spriteSheet && projectPath) {
      // Construct URL for sprite sheet
      const url = `file://${projectPath}/assets/${animation.spriteSheet}`;
      setSpriteSheetUrl(url);

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setSpriteSheetDimensions({ width: img.width, height: img.height });
      };
      img.src = url;
    }
  }, [animation.spriteSheet, projectPath]);

  // Animation playback loop with proper frame synchronization
  useEffect(() => {
    if (!isPlaying || !activeState) return;

    const frameDuration = activeState.frameDuration;
    const frameStart = activeState.frameStart;
    const frameEnd = activeState.frameEnd;
    const shouldLoop = activeState.loop;
    const totalStateFrames = frameEnd - frameStart + 1;

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
        accumulatedTimeRef.current = 0;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      accumulatedTimeRef.current += deltaTime;

      // Calculate how many frames to advance based on accumulated time
      // This handles frame skipping when browser is slow
      if (accumulatedTimeRef.current >= frameDuration) {
        const framesToAdvance = Math.floor(accumulatedTimeRef.current / frameDuration);
        accumulatedTimeRef.current = accumulatedTimeRef.current % frameDuration;

        setCurrentFrame(prev => {
          let nextFrame = prev + framesToAdvance;

          // Handle wrapping/stopping
          if (nextFrame > frameEnd) {
            if (shouldLoop) {
              // Properly wrap around for looping
              const overflow = nextFrame - frameEnd - 1;
              nextFrame = frameStart + (overflow % totalStateFrames);
            } else {
              setIsPlaying(false);
              return frameEnd;
            }
          }
          return nextFrame;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, activeState]);

  // Sync state changes to parent
  // Using a ref to track if we should sync to avoid infinite loops
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Debounce the sync to avoid excessive updates during playback
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      onAnimationChange({
        ...animation,
        states,
        currentState,
        currentFrame,
      });
    }, isPlaying ? 100 : 0); // Debounce during playback, immediate when paused

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [states, currentState, currentFrame, isPlaying, animation, onAnimationChange]);

  const handlePlayPauseToggle = useCallback(() => {
    if (!isPlaying && activeState) {
      // Reset to start if at end
      if (currentFrame >= activeState.frameEnd) {
        setCurrentFrame(activeState.frameStart);
      }
      // Reset timing refs for clean playback start
      lastFrameTimeRef.current = 0;
      accumulatedTimeRef.current = 0;
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, activeState, currentFrame]);

  const handleStatesChange = useCallback((newStates: AnimationState[]) => {
    setStates(newStates);
  }, []);

  const handleCurrentStateChange = useCallback((stateName: string) => {
    setCurrentState(stateName);
    const state = states.find(s => s.name === stateName);
    if (state) {
      setCurrentFrame(state.frameStart);
      setIsPlaying(false);
    }
  }, [states]);

  const handleCurrentFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  // Calculate frame position in sprite sheet grid
  const getFramePosition = (frameIndex: number) => {
    if (!spriteSheetDimensions) return { x: 0, y: 0 };

    const framesPerRow = Math.floor(spriteSheetDimensions.width / frameWidth);
    const row = Math.floor(frameIndex / framesPerRow);
    const col = frameIndex % framesPerRow;

    return { x: col * frameWidth, y: row * frameHeight };
  };

  const framePos = getFramePosition(currentFrame);

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-[900px] h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Animation Editor</h2>
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
              {entity.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview Panel */}
          <div className="w-64 border-r border-subtle flex flex-col bg-black/20">
            <div className="px-4 py-3 border-b border-subtle">
              <h3 className="text-sm font-medium text-white">Preview</h3>
            </div>

            {/* Preview canvas */}
            <div
              ref={previewRef}
              className="flex-1 flex items-center justify-center bg-black/30 relative overflow-hidden"
            >
              {spriteSheetUrl ? (
                <div
                  className="relative border border-dashed border-white/20 rounded"
                  style={{
                    width: frameWidth * 3,
                    height: frameHeight * 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      width: spriteSheetDimensions?.width ? spriteSheetDimensions.width * 3 : frameWidth * 3,
                      height: spriteSheetDimensions?.height ? spriteSheetDimensions.height * 3 : frameHeight * 3,
                      backgroundImage: `url(${spriteSheetUrl})`,
                      backgroundSize: `${(spriteSheetDimensions?.width || frameWidth) * 3}px ${(spriteSheetDimensions?.height || frameHeight) * 3}px`,
                      imageRendering: 'pixelated',
                      left: -framePos.x * 3,
                      top: -framePos.y * 3,
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-text-tertiary p-4">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-white">No sprite sheet</p>
                  <p className="text-xs mt-1">Set spriteSheet path in animation component</p>
                </div>
              )}

              {/* Checkerboard background pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10 -z-10"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
            </div>

            {/* Frame info */}
            <div className="bg-black/30 border-t border-subtle p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">State</span>
                <span className="text-white font-medium">{currentState}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Frame</span>
                <span className="text-white font-mono">{currentFrame}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Size</span>
                <span className="text-white font-mono">{frameWidth} × {frameHeight}</span>
              </div>
              {activeState && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Duration</span>
                  <span className="text-white font-mono">{activeState.frameDuration}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimationTimeline
              states={states}
              currentState={currentState}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              onStatesChange={handleStatesChange}
              onCurrentStateChange={handleCurrentStateChange}
              onCurrentFrameChange={handleCurrentFrameChange}
              onPlayPauseToggle={handlePlayPauseToggle}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              totalFrames={totalFrames}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {states.length} state{states.length !== 1 ? 's' : ''} • {totalFrames} total frames
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
