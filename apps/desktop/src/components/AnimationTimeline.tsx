import { useState, useRef, useCallback, useEffect } from 'react';
import type { AnimationState, EasingType, BezierCurve, AnimationTrack, AnimatableProperty, AnimationKeyframe } from '@promptplay/shared-types';
import { ChevronRightIcon, ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';
import EasingCurveEditor from './EasingCurveEditor';

// Clipboard type for keyframes
interface KeyframeClipboard {
  keyframes: AnimationKeyframe[];
  property: AnimatableProperty;
  sourceStateName: string;
  sourceTrackId: string;
}

// Property display names
const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  'position.x': 'X Position',
  'position.y': 'Y Position',
  'rotation': 'Rotation',
  'scale.x': 'Scale X',
  'scale.y': 'Scale Y',
  'opacity': 'Opacity',
  'tint': 'Tint',
  'frame': 'Frame',
};

// Property colors for visual distinction
const PROPERTY_COLORS: Record<AnimatableProperty, string> = {
  'position.x': '#ef4444', // red
  'position.y': '#22c55e', // green
  'rotation': '#3b82f6', // blue
  'scale.x': '#f59e0b', // amber
  'scale.y': '#f97316', // orange
  'opacity': '#8b5cf6', // violet
  'tint': '#ec4899', // pink
  'frame': '#06b6d4', // cyan
};

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

  // Track management
  const [showTrackPicker, setShowTrackPicker] = useState<string | null>(null);
  const [_selectedKeyframe, setSelectedKeyframe] = useState<{ stateName: string; trackId: string; index: number } | null>(null);

  // Easing editor modal
  const [easingModalState, setEasingModalState] = useState<string | null>(null);

  const handleAddTrack = useCallback((stateName: string) => {
    setShowTrackPicker(stateName);
  }, []);

  const handleCreateTrack = useCallback((stateName: string, property: AnimatableProperty) => {
    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;

      const newTrack: AnimationTrack = {
        id: `track_${Date.now()}`,
        property,
        keyframes: [
          { frame: 0, value: 0 }, // Start keyframe
          { frame: s.frameEnd - s.frameStart, value: 0 }, // End keyframe
        ],
        enabled: true,
      };

      return {
        ...s,
        tracks: [...(s.tracks || []), newTrack],
      };
    }));
    setShowTrackPicker(null);
  }, [states, onStatesChange]);

  const handleDeleteTrack = useCallback((stateName: string, trackId: string) => {
    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;
      return {
        ...s,
        tracks: (s.tracks || []).filter(t => t.id !== trackId),
      };
    }));
  }, [states, onStatesChange]);

  const handleToggleTrack = useCallback((stateName: string, trackId: string) => {
    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;
      return {
        ...s,
        tracks: (s.tracks || []).map(t =>
          t.id === trackId ? { ...t, enabled: !t.enabled } : t
        ),
      };
    }));
  }, [states, onStatesChange]);

  const handleAddKeyframe = useCallback((stateName: string, trackId: string, frame: number) => {
    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;

      const relativeFrame = frame - s.frameStart;

      return {
        ...s,
        tracks: (s.tracks || []).map(t => {
          if (t.id !== trackId) return t;

          // Check if keyframe already exists at this frame
          if (t.keyframes.some(kf => kf.frame === relativeFrame)) return t;

          // Interpolate value from surrounding keyframes
          let value = 0;
          const sortedKfs = [...t.keyframes].sort((a, b) => a.frame - b.frame);
          for (let i = 0; i < sortedKfs.length - 1; i++) {
            if (sortedKfs[i].frame <= relativeFrame && sortedKfs[i + 1].frame >= relativeFrame) {
              const t_val = (relativeFrame - sortedKfs[i].frame) / (sortedKfs[i + 1].frame - sortedKfs[i].frame);
              value = sortedKfs[i].value + (sortedKfs[i + 1].value - sortedKfs[i].value) * t_val;
              break;
            }
          }

          const newKeyframes = [...t.keyframes, { frame: relativeFrame, value }]
            .sort((a, b) => a.frame - b.frame);

          return { ...t, keyframes: newKeyframes };
        }),
      };
    }));
  }, [states, onStatesChange]);

  const handleDeleteKeyframe = useCallback((stateName: string, trackId: string, keyframeIndex: number) => {
    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;
      return {
        ...s,
        tracks: (s.tracks || []).map(t => {
          if (t.id !== trackId) return t;
          // Keep at least 2 keyframes
          if (t.keyframes.length <= 2) return t;
          return {
            ...t,
            keyframes: t.keyframes.filter((_, i) => i !== keyframeIndex),
          };
        }),
      };
    }));
  }, [states, onStatesChange]);

  const handleSelectKeyframe = useCallback((stateName: string, trackId: string, index: number) => {
    setSelectedKeyframe({ stateName, trackId, index });
  }, []);

  // Keyframe clipboard for copy/paste
  const [clipboard, setClipboard] = useState<KeyframeClipboard | null>(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set()); // "stateName:trackId:index"

  const handleCopyKeyframes = useCallback((stateName: string, trackId: string, indices?: number[]) => {
    const state = states.find(s => s.name === stateName);
    const track = state?.tracks?.find(t => t.id === trackId);
    if (!track) return;

    const keyframesToCopy = indices && indices.length > 0
      ? indices.map(i => track.keyframes[i]).filter(Boolean)
      : [...track.keyframes];

    if (keyframesToCopy.length === 0) return;

    setClipboard({
      keyframes: keyframesToCopy.map(kf => ({ ...kf })),
      property: track.property,
      sourceStateName: stateName,
      sourceTrackId: trackId,
    });
  }, [states]);

  const handlePasteKeyframes = useCallback((stateName: string, trackId: string, targetFrame?: number) => {
    if (!clipboard) return;

    onStatesChange(states.map(s => {
      if (s.name !== stateName) return s;

      return {
        ...s,
        tracks: (s.tracks || []).map(t => {
          if (t.id !== trackId) return t;

          // Calculate frame offset
          const offset = targetFrame !== undefined
            ? targetFrame - (clipboard.keyframes[0]?.frame || 0)
            : 0;

          // Create new keyframes with offset
          const pastedKeyframes = clipboard.keyframes.map(kf => ({
            ...kf,
            frame: kf.frame + offset,
          }));

          // Merge with existing keyframes, replacing any at same frame
          const existingFrames = new Set(pastedKeyframes.map(kf => kf.frame));
          const mergedKeyframes = [
            ...t.keyframes.filter(kf => !existingFrames.has(kf.frame)),
            ...pastedKeyframes,
          ].sort((a, b) => a.frame - b.frame);

          return { ...t, keyframes: mergedKeyframes };
        }),
      };
    }));
  }, [clipboard, states, onStatesChange]);

  const handleCopyTrack = useCallback((stateName: string, trackId: string) => {
    handleCopyKeyframes(stateName, trackId);
  }, [handleCopyKeyframes]);

  const handleSelectAllKeyframes = useCallback((stateName: string, trackId: string) => {
    const state = states.find(s => s.name === stateName);
    const track = state?.tracks?.find(t => t.id === trackId);
    if (!track) return;

    const newSelected = new Set(selectedKeyframes);
    track.keyframes.forEach((_, i) => {
      newSelected.add(`${stateName}:${trackId}:${i}`);
    });
    setSelectedKeyframes(newSelected);
  }, [states, selectedKeyframes]);

  const handleClearSelection = useCallback(() => {
    setSelectedKeyframes(new Set());
  }, []);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if timeline is focused (could add ref check)
      if (e.target instanceof HTMLInputElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        // Copy selected keyframes or entire track
        if (selectedKeyframes.size > 0) {
          const first = Array.from(selectedKeyframes)[0];
          const [stateName, trackId] = first.split(':');
          const indices = Array.from(selectedKeyframes)
            .filter(k => k.startsWith(`${stateName}:${trackId}:`))
            .map(k => parseInt(k.split(':')[2]));
          handleCopyKeyframes(stateName, trackId, indices);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Paste at current frame
        if (clipboard && currentState) {
          const state = states.find(s => s.name === currentState);
          const targetTrack = state?.tracks?.find(t => t.property === clipboard.property);
          if (targetTrack) {
            const relativeFrame = currentFrame - (state?.frameStart || 0);
            handlePasteKeyframes(currentState, targetTrack.id, relativeFrame);
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Select all in current track - prevent default
        e.preventDefault();
      } else if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKeyframes, clipboard, currentState, currentFrame, states, handleCopyKeyframes, handlePasteKeyframes, handleClearSelection]);

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

        {/* Clipboard indicator */}
        {clipboard && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded border border-primary/30">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span className="text-[10px] text-primary">
              {clipboard.keyframes.length} keyframe{clipboard.keyframes.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setClipboard(null)}
              className="p-0.5 rounded hover:bg-primary/20 text-primary/70 hover:text-primary"
              title="Clear clipboard"
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Selection indicator */}
        {selectedKeyframes.size > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-subtle">
            <span className="text-[10px] text-text-secondary">
              {selectedKeyframes.size} selected
            </span>
            <button
              onClick={handleClearSelection}
              className="p-0.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary"
              title="Clear selection (Esc)"
            >
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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
                <div className="bg-canvas/50">
                  {/* Properties row - compact horizontal layout */}
                  <div className="flex items-center gap-4 px-3 py-2 border-b border-subtle/50">
                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-tertiary">Duration</span>
                      <input
                        type="number"
                        value={state.frameDuration}
                        onChange={(e) => handleUpdateState(state.name, { frameDuration: parseInt(e.target.value) || 100 })}
                        className="w-14 px-1.5 py-0.5 text-xs bg-canvas border border-subtle rounded text-text-primary text-right"
                        min={16}
                        step={16}
                      />
                      <span className="text-[10px] text-text-tertiary">ms</span>
                    </div>

                    {/* Loop */}
                    <div className="flex items-center gap-2">
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

                    {/* Easing - button to open modal */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-tertiary">Easing</span>
                      <button
                        onClick={() => setEasingModalState(state.name)}
                        className="px-2 py-0.5 text-xs bg-canvas border border-subtle rounded text-text-primary hover:border-primary/50 transition-colors flex items-center gap-1"
                      >
                        {state.easing || 'linear'}
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-right">
                      <span className="text-[10px] text-text-tertiary">
                        {state.frameEnd - state.frameStart + 1} frames = {((state.frameEnd - state.frameStart + 1) * state.frameDuration / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>

                  {/* Property Tracks */}
                  <div className="border-t border-subtle/30">
                    {/* Track header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-subtle/30 relative">
                      <span className="text-[10px] font-medium text-text-secondary">Property Tracks</span>
                      <button
                        onClick={() => handleAddTrack(state.name)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-primary hover:bg-primary/10 transition-colors"
                      >
                        <PlusIcon size={10} />
                        Add Track
                      </button>

                      {/* Track property picker dropdown */}
                      {showTrackPicker === state.name && (
                        <div className="absolute right-2 top-full mt-1 z-50 bg-panel border border-subtle rounded shadow-lg py-1 min-w-[140px]">
                          {(Object.keys(PROPERTY_LABELS) as AnimatableProperty[])
                            .filter(prop => !(state.tracks || []).some(t => t.property === prop))
                            .map(prop => (
                              <button
                                key={prop}
                                onClick={() => handleCreateTrack(state.name, prop)}
                                className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-white/5 flex items-center gap-2"
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: PROPERTY_COLORS[prop] }}
                                />
                                {PROPERTY_LABELS[prop]}
                              </button>
                            ))}
                          {(Object.keys(PROPERTY_LABELS) as AnimatableProperty[])
                            .filter(prop => !(state.tracks || []).some(t => t.property === prop))
                            .length === 0 && (
                            <div className="px-3 py-1.5 text-xs text-text-tertiary">
                              All properties added
                            </div>
                          )}
                          <div className="border-t border-subtle mt-1 pt-1">
                            <button
                              onClick={() => setShowTrackPicker(null)}
                              className="w-full px-3 py-1 text-left text-xs text-text-tertiary hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Track rows */}
                    {(state.tracks || []).map((track) => (
                      <div key={track.id} className="flex border-t border-subtle/30">
                        {/* Track label */}
                        <div
                          className="w-40 flex-shrink-0 flex items-center gap-1 px-2 py-1.5 border-r border-subtle"
                          style={{ borderLeftWidth: 3, borderLeftColor: PROPERTY_COLORS[track.property] }}
                        >
                          <button
                            onClick={() => handleToggleTrack(state.name, track.id)}
                            className={`w-3 h-3 rounded-sm border flex-shrink-0 ${
                              track.enabled
                                ? 'bg-primary border-primary'
                                : 'border-subtle bg-transparent'
                            }`}
                          >
                            {track.enabled && (
                              <svg viewBox="0 0 12 12" className="w-full h-full text-white">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
                              </svg>
                            )}
                          </button>
                          <span className="text-[10px] text-text-secondary flex-1 truncate">
                            {PROPERTY_LABELS[track.property]}
                          </span>
                          {/* Copy track button */}
                          <button
                            onClick={() => handleCopyTrack(state.name, track.id)}
                            className="p-0.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                            title="Copy keyframes (Ctrl+C)"
                          >
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                          </button>
                          {/* Paste button (only show if clipboard has matching property) */}
                          {clipboard && clipboard.property === track.property && (
                            <button
                              onClick={() => handlePasteKeyframes(state.name, track.id, currentFrame - state.frameStart)}
                              className="p-0.5 rounded hover:bg-primary/20 text-primary transition-colors"
                              title="Paste keyframes (Ctrl+V)"
                            >
                              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" />
                              </svg>
                            </button>
                          )}
                          {/* Select all button */}
                          <button
                            onClick={() => handleSelectAllKeyframes(state.name, track.id)}
                            className="p-0.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                            title="Select all keyframes"
                          >
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(state.name, track.id)}
                            className="p-0.5 rounded hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors"
                            title="Delete track"
                          >
                            <TrashIcon size={10} />
                          </button>
                        </div>

                        {/* Track timeline with keyframes */}
                        <div
                          className="flex-1 relative h-6"
                          style={{ minWidth: totalFrames * framePixelWidth }}
                          onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const frame = Math.floor(x / framePixelWidth);
                            if (frame >= state.frameStart && frame <= state.frameEnd) {
                              handleAddKeyframe(state.name, track.id, frame);
                            }
                          }}
                        >
                          {/* Track background within state range */}
                          <div
                            className="absolute top-1 bottom-1 rounded-sm"
                            style={{
                              left: state.frameStart * framePixelWidth,
                              width: (state.frameEnd - state.frameStart + 1) * framePixelWidth,
                              backgroundColor: `${PROPERTY_COLORS[track.property]}15`,
                            }}
                          />

                          {/* Keyframes */}
                          {track.keyframes.map((keyframe, kfIndex) => {
                            const isSelected = selectedKeyframes.has(`${state.name}:${track.id}:${kfIndex}`);
                            const isCurrentFrame = keyframe.frame === currentFrame - state.frameStart;
                            return (
                              <div
                                key={kfIndex}
                                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer hover:scale-125 transition-transform ${
                                  isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''
                                }`}
                                style={{
                                  left: (state.frameStart + keyframe.frame) * framePixelWidth + framePixelWidth / 2 - 6,
                                  backgroundColor: PROPERTY_COLORS[track.property],
                                  boxShadow: isCurrentFrame ? `0 0 6px ${PROPERTY_COLORS[track.property]}` : undefined,
                                }}
                                onClick={(e) => {
                                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                    // Multi-select
                                    const key = `${state.name}:${track.id}:${kfIndex}`;
                                    setSelectedKeyframes(prev => {
                                      const next = new Set(prev);
                                      if (next.has(key)) {
                                        next.delete(key);
                                      } else {
                                        next.add(key);
                                      }
                                      return next;
                                    });
                                  } else {
                                    // Single select
                                    handleSelectKeyframe(state.name, track.id, kfIndex);
                                    setSelectedKeyframes(new Set([`${state.name}:${track.id}:${kfIndex}`]));
                                  }
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteKeyframe(state.name, track.id, kfIndex);
                                }}
                                title={`Frame ${keyframe.frame}: ${keyframe.value}${isSelected ? ' (selected)' : ''}`}
                              />
                            );
                          })}

                          {/* Add keyframe hint on hover */}
                          <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none flex items-center justify-center">
                            <span className="text-[8px] text-text-tertiary bg-canvas/80 px-1 rounded">
                              Double-click to add keyframe
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty state for tracks */}
                    {(!state.tracks || state.tracks.length === 0) && (
                      <div className="px-3 py-3 text-center">
                        <span className="text-[10px] text-text-tertiary">
                          No property tracks. Click "Add Track" to animate properties.
                        </span>
                      </div>
                    )}
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

      {/* Easing Editor Modal */}
      {easingModalState && (() => {
        const modalState = states.find(s => s.name === easingModalState);
        if (!modalState) return null;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setEasingModalState(null)}>
            <div className="bg-panel-solid border border-subtle rounded-xl shadow-2xl p-4 w-[300px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Easing Curve</h3>
                <button
                  onClick={() => setEasingModalState(null)}
                  className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <EasingCurveEditor
                easing={modalState.easing || 'linear'}
                customCurve={modalState.customEasing}
                onChange={(easing: EasingType, customCurve?: BezierCurve) => {
                  handleUpdateState(easingModalState, {
                    easing,
                    customEasing: customCurve,
                  });
                }}
              />

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setEasingModalState(null)}
                  className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
