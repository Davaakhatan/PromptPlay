import { useState, useRef, useCallback } from 'react';
import type { AnimationState } from '@promptplay/shared-types';
import { ChevronRightIcon, ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';

interface AnimationTimelineProps {
  states: AnimationState[];
  currentState: string;
  currentFrame: number;
  isPlaying: boolean;
  onStatesChange: (states: AnimationState[]) => void;
  onCurrentStateChange: (stateName: string) => void;
  onCurrentFrameChange: (frame: number) => void;
  onPlayPauseToggle: () => void;
  frameWidth?: number;
  frameHeight?: number;
  totalFrames?: number;
}

// Play/Pause icons
function PlayIcon2({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon2({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function SkipBackIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="19,20 9,12 19,4" fill="currentColor" />
      <line x1="5" y1="4" x2="5" y2="20" />
    </svg>
  );
}

function SkipForwardIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="5,4 15,12 5,20" fill="currentColor" />
      <line x1="19" y1="4" x2="19" y2="20" />
    </svg>
  );
}

export default function AnimationTimeline({
  states,
  currentState,
  currentFrame,
  isPlaying,
  onStatesChange,
  onCurrentStateChange,
  onCurrentFrameChange,
  onPlayPauseToggle,
  totalFrames = 16,
}: AnimationTimelineProps) {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set([currentState]));
  const [editingState, setEditingState] = useState<string | null>(null);
  const [_dragFrame, setDragFrame] = useState<{ state: string; type: 'start' | 'end' } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const activeState = states.find(s => s.name === currentState);
  const framePixelWidth = 24; // pixels per frame

  const toggleStateExpand = useCallback((stateName: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(stateName)) {
        next.delete(stateName);
      } else {
        next.add(stateName);
      }
      return next;
    });
  }, []);

  const handleAddState = useCallback(() => {
    const baseName = 'state';
    let counter = states.length + 1;
    const existingNames = new Set(states.map(s => s.name));
    while (existingNames.has(`${baseName}${counter}`)) {
      counter++;
    }

    const newState: AnimationState = {
      name: `${baseName}${counter}`,
      frameStart: 0,
      frameEnd: 3,
      frameDuration: 100,
      loop: true,
    };

    onStatesChange([...states, newState]);
  }, [states, onStatesChange]);

  const handleDeleteState = useCallback((stateName: string) => {
    if (states.length <= 1) return; // Keep at least one state

    const filtered = states.filter(s => s.name !== stateName);
    onStatesChange(filtered);

    if (currentState === stateName && filtered.length > 0) {
      onCurrentStateChange(filtered[0].name);
    }
  }, [states, currentState, onStatesChange, onCurrentStateChange]);

  const handleUpdateState = useCallback((stateName: string, updates: Partial<AnimationState>) => {
    onStatesChange(states.map(s =>
      s.name === stateName ? { ...s, ...updates } : s
    ));
  }, [states, onStatesChange]);

  const handleRenameState = useCallback((oldName: string, newName: string) => {
    if (!newName.trim() || states.some(s => s.name === newName && s.name !== oldName)) {
      setEditingState(null);
      return;
    }

    onStatesChange(states.map(s =>
      s.name === oldName ? { ...s, name: newName } : s
    ));

    if (currentState === oldName) {
      onCurrentStateChange(newName);
    }
    setEditingState(null);
  }, [states, currentState, onStatesChange, onCurrentStateChange]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.floor(x / framePixelWidth);

    if (frame >= 0 && frame < totalFrames) {
      onCurrentFrameChange(frame);
    }
  }, [totalFrames, onCurrentFrameChange]);

  const handleGoToStart = useCallback(() => {
    if (activeState) {
      onCurrentFrameChange(activeState.frameStart);
    }
  }, [activeState, onCurrentFrameChange]);

  const handleGoToEnd = useCallback(() => {
    if (activeState) {
      onCurrentFrameChange(activeState.frameEnd);
    }
  }, [activeState, onCurrentFrameChange]);

  const handlePrevFrame = useCallback(() => {
    if (activeState && currentFrame > activeState.frameStart) {
      onCurrentFrameChange(currentFrame - 1);
    }
  }, [activeState, currentFrame, onCurrentFrameChange]);

  const handleNextFrame = useCallback(() => {
    if (activeState && currentFrame < activeState.frameEnd) {
      onCurrentFrameChange(currentFrame + 1);
    }
  }, [activeState, currentFrame, onCurrentFrameChange]);

  return (
    <div className="flex flex-col h-full bg-panel">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-subtle bg-subtle">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoToStart}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            title="Go to Start"
          >
            <SkipBackIcon size={14} />
          </button>
          <button
            onClick={handlePrevFrame}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            title="Previous Frame"
          >
            <ChevronRightIcon size={14} className="rotate-180" />
          </button>
          <button
            onClick={onPlayPauseToggle}
            className={`p-2 rounded transition-colors ${
              isPlaying
                ? 'bg-primary text-white'
                : 'bg-white/10 text-text-primary hover:bg-white/20'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon2 size={16} /> : <PlayIcon2 size={16} />}
          </button>
          <button
            onClick={handleNextFrame}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            title="Next Frame"
          >
            <ChevronRightIcon size={14} />
          </button>
          <button
            onClick={handleGoToEnd}
            className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            title="Go to End"
          >
            <SkipForwardIcon size={14} />
          </button>
        </div>

        {/* Frame counter */}
        <div className="flex items-center gap-2 px-3 py-1 bg-canvas rounded border border-subtle">
          <span className="text-xs text-text-tertiary">Frame</span>
          <span className="text-sm font-mono text-text-primary">{currentFrame}</span>
          {activeState && (
            <span className="text-xs text-text-tertiary">
              / {activeState.frameEnd - activeState.frameStart + 1}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Add state button */}
        <button
          onClick={handleAddState}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
        >
          <PlusIcon size={12} />
          Add State
        </button>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-auto">
        {/* Frame ruler */}
        <div className="sticky top-0 z-10 flex bg-subtle border-b border-subtle">
          <div className="w-40 flex-shrink-0 px-3 py-1.5 border-r border-subtle">
            <span className="text-xs font-medium text-text-secondary">States</span>
          </div>
          <div
            ref={timelineRef}
            className="flex-1 flex items-center cursor-pointer relative"
            onClick={handleTimelineClick}
            style={{ minWidth: totalFrames * framePixelWidth }}
          >
            {Array.from({ length: totalFrames }).map((_, i) => (
              <div
                key={i}
                className={`flex-shrink-0 text-center border-r border-subtle/50 ${
                  i === currentFrame ? 'bg-primary/30' : ''
                }`}
                style={{ width: framePixelWidth }}
              >
                <span className="text-[10px] text-text-tertiary">{i}</span>
              </div>
            ))}
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-20"
              style={{ left: currentFrame * framePixelWidth + framePixelWidth / 2 }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary transform rotate-45" />
            </div>
          </div>
        </div>

        {/* State rows */}
        {states.map((state) => {
          const isExpanded = expandedStates.has(state.name);
          const isActive = state.name === currentState;

          return (
            <div key={state.name} className="border-b border-subtle">
              {/* State header */}
              <div className="flex">
                <div
                  className={`w-40 flex-shrink-0 flex items-center gap-2 px-2 py-2 border-r border-subtle cursor-pointer ${
                    isActive ? 'bg-primary/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => onCurrentStateChange(state.name)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStateExpand(state.name);
                    }}
                    className="p-0.5 hover:bg-white/10 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon size={12} className="text-text-tertiary" />
                    ) : (
                      <ChevronRightIcon size={12} className="text-text-tertiary" />
                    )}
                  </button>

                  {editingState === state.name ? (
                    <input
                      type="text"
                      defaultValue={state.name}
                      autoFocus
                      onBlur={(e) => handleRenameState(state.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameState(state.name, e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                          setEditingState(null);
                        }
                      }}
                      className="flex-1 px-1 py-0.5 text-xs bg-canvas border border-primary rounded text-text-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`flex-1 text-xs font-medium truncate ${
                        isActive ? 'text-primary' : 'text-text-primary'
                      }`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingState(state.name);
                      }}
                    >
                      {state.name}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteState(state.name);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-all"
                    title="Delete State"
                  >
                    <TrashIcon size={10} />
                  </button>
                </div>

                {/* State timeline bar */}
                <div
                  className="flex-1 relative h-10"
                  style={{ minWidth: totalFrames * framePixelWidth }}
                >
                  {/* Frame range indicator */}
                  <div
                    className={`absolute top-1 bottom-1 rounded ${
                      isActive ? 'bg-primary/40 border border-primary' : 'bg-blue-500/30 border border-blue-500/50'
                    }`}
                    style={{
                      left: state.frameStart * framePixelWidth,
                      width: (state.frameEnd - state.frameStart + 1) * framePixelWidth,
                    }}
                  >
                    {/* Frame cells within the range */}
                    {Array.from({ length: state.frameEnd - state.frameStart + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-r border-white/20 ${
                          state.frameStart + i === currentFrame && isActive ? 'bg-white/20' : ''
                        }`}
                        style={{
                          left: i * framePixelWidth,
                          width: framePixelWidth,
                        }}
                      />
                    ))}

                    {/* Start handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/30 hover:bg-white/50 rounded-l"
                      onMouseDown={() => setDragFrame({ state: state.name, type: 'start' })}
                    />
                    {/* End handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/30 hover:bg-white/50 rounded-r"
                      onMouseDown={() => setDragFrame({ state: state.name, type: 'end' })}
                    />
                  </div>
                </div>
              </div>

              {/* State properties (expanded) */}
              {isExpanded && (
                <div className="flex bg-canvas/50">
                  <div className="w-40 flex-shrink-0 border-r border-subtle px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary">Duration</span>
                      <input
                        type="number"
                        value={state.frameDuration}
                        onChange={(e) => handleUpdateState(state.name, { frameDuration: parseInt(e.target.value) || 100 })}
                        className="w-16 px-1.5 py-0.5 text-xs bg-canvas border border-subtle rounded text-text-primary text-right"
                        min={16}
                        step={16}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary">Loop</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.loop}
                          onChange={(e) => handleUpdateState(state.name, { loop: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className={`
                          w-7 h-4 rounded-full peer peer-checked:after:translate-x-full
                          after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                          after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all
                          ${state.loop ? 'bg-primary' : 'bg-subtle'}
                        `} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary">Frames</span>
                      <span className="text-xs text-text-secondary">
                        {state.frameStart} - {state.frameEnd}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 py-2 px-3">
                    <span className="text-[10px] text-text-tertiary">
                      {state.frameEnd - state.frameStart + 1} frames @ {state.frameDuration}ms = {((state.frameEnd - state.frameStart + 1) * state.frameDuration / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {states.length === 0 && (
          <div className="flex items-center justify-center py-12 text-text-tertiary">
            <div className="text-center">
              <p className="text-sm mb-2">No animation states</p>
              <button
                onClick={handleAddState}
                className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
              >
                Create First State
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
