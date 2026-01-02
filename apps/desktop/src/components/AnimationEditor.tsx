import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimationComponent, AnimationState, EntitySpec } from '@promptplay/shared-types';
import AnimationTimeline from './AnimationTimeline';
import { CloseIcon, ImageIcon } from './Icons';

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

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying || !activeState) return;

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= activeState.frameDuration) {
        lastFrameTimeRef.current = timestamp;

        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame > activeState.frameEnd) {
            if (activeState.loop) {
              return activeState.frameStart;
            } else {
              setIsPlaying(false);
              return activeState.frameEnd;
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
  useEffect(() => {
    onAnimationChange({
      ...animation,
      states,
      currentState,
      currentFrame,
    });
  }, [states, currentState, currentFrame]);

  const handlePlayPauseToggle = useCallback(() => {
    if (!isPlaying && activeState) {
      // Reset to start if at end
      if (currentFrame >= activeState.frameEnd) {
        setCurrentFrame(activeState.frameStart);
      }
      lastFrameTimeRef.current = 0;
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-panel-solid border border-subtle rounded-xl shadow-2xl w-[900px] h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-subtle border-b border-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Animation Editor</h2>
            <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
              {entity.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Preview Panel */}
          <div className="w-64 border-r border-subtle flex flex-col">
            <div className="px-3 py-2 bg-subtle/50 border-b border-subtle">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Preview
              </h3>
            </div>

            {/* Preview canvas */}
            <div
              ref={previewRef}
              className="flex-1 flex items-center justify-center bg-[#1a1a2e] relative overflow-hidden"
            >
              {spriteSheetUrl ? (
                <div
                  className="relative border border-dashed border-white/20"
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
                <div className="text-center text-text-tertiary">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sprite sheet</p>
                  <p className="text-xs mt-1">Set spriteSheet path in animation component</p>
                </div>
              )}

              {/* Checkerboard background pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
            </div>

            {/* Frame info */}
            <div className="px-3 py-2 bg-subtle/50 border-t border-subtle space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">State</span>
                <span className="text-text-primary font-medium">{currentState}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">Frame</span>
                <span className="text-text-primary font-mono">{currentFrame}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">Size</span>
                <span className="text-text-primary font-mono">{frameWidth} x {frameHeight}</span>
              </div>
              {activeState && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-tertiary">Duration</span>
                  <span className="text-text-primary font-mono">{activeState.frameDuration}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="flex-1 flex flex-col">
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
        <div className="px-4 py-3 bg-subtle border-t border-subtle flex items-center justify-between">
          <div className="text-xs text-text-tertiary">
            {states.length} state{states.length !== 1 ? 's' : ''} | {totalFrames} total frames
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
