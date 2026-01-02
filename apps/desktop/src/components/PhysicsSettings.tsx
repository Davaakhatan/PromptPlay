import { useState, useCallback } from 'react';
import type { GameSpec, GameConfig } from '@promptplay/shared-types';
import { ChevronDownIcon, ChevronRightIcon } from './Icons';

interface PhysicsSettingsProps {
  gameSpec: GameSpec;
  onConfigChange: (config: GameConfig) => void;
}

// Physics material presets
const MATERIAL_PRESETS = [
  { id: 'default', name: 'Default', friction: 0.5, restitution: 0.0, description: 'Standard physics' },
  { id: 'bouncy', name: 'Bouncy', friction: 0.3, restitution: 0.8, description: 'High bounce' },
  { id: 'rubber', name: 'Rubber', friction: 0.8, restitution: 0.5, description: 'High friction, medium bounce' },
  { id: 'ice', name: 'Ice', friction: 0.05, restitution: 0.1, description: 'Very slippery' },
  { id: 'metal', name: 'Metal', friction: 0.4, restitution: 0.3, description: 'Solid, slight bounce' },
  { id: 'wood', name: 'Wood', friction: 0.6, restitution: 0.2, description: 'Medium friction' },
  { id: 'super_bouncy', name: 'Super Bouncy', friction: 0.1, restitution: 1.0, description: 'Maximum bounce' },
];

// Gravity presets
const GRAVITY_PRESETS = [
  { id: 'earth', name: 'Earth', x: 0, y: 1, description: 'Standard gravity (9.8 m/s²)' },
  { id: 'moon', name: 'Moon', x: 0, y: 0.166, description: 'Low gravity' },
  { id: 'mars', name: 'Mars', x: 0, y: 0.38, description: 'Martian gravity' },
  { id: 'jupiter', name: 'Jupiter', x: 0, y: 2.36, description: 'Heavy gravity' },
  { id: 'zero_g', name: 'Zero-G', x: 0, y: 0, description: 'Space/floating' },
  { id: 'platformer', name: 'Platformer', x: 0, y: 1.5, description: 'Snappy jump feel' },
  { id: 'floaty', name: 'Floaty', x: 0, y: 0.5, description: 'Slower falling' },
];

export default function PhysicsSettings({
  gameSpec,
  onConfigChange,
}: PhysicsSettingsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['gravity', 'materials'])
  );

  const config = gameSpec.config;

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleGravityChange = useCallback((axis: 'x' | 'y', value: number) => {
    onConfigChange({
      ...config,
      gravity: {
        ...config.gravity,
        [axis]: value,
      },
    });
  }, [config, onConfigChange]);

  const handleGravityPreset = useCallback((presetId: string) => {
    const preset = GRAVITY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onConfigChange({
        ...config,
        gravity: { x: preset.x, y: preset.y },
      });
    }
  }, [config, onConfigChange]);

  const handleWorldBoundsChange = useCallback((dimension: 'width' | 'height', value: number) => {
    onConfigChange({
      ...config,
      worldBounds: {
        ...config.worldBounds,
        [dimension]: value,
      },
    });
  }, [config, onConfigChange]);

  // Find current gravity preset (if matching)
  const currentGravityPreset = GRAVITY_PRESETS.find(
    p => Math.abs(p.x - config.gravity.x) < 0.01 && Math.abs(p.y - config.gravity.y) < 0.01
  );

  return (
    <div className="h-full flex flex-col bg-panel overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2 bg-subtle border-b border-subtle">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Physics Settings
        </h3>
      </div>

      {/* Gravity Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('gravity')}
          className="w-full px-3 py-2 flex items-center gap-2 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('gravity') ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
          <span className="text-sm font-medium">Gravity</span>
        </button>

        {expandedSections.has('gravity') && (
          <div className="px-3 pb-3 space-y-3">
            {/* Gravity values */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-tertiary mb-1">X</label>
                <input
                  type="number"
                  value={config.gravity.x}
                  onChange={(e) => handleGravityChange('x', parseFloat(e.target.value) || 0)}
                  step={0.1}
                  className="w-full px-2 py-1.5 text-sm bg-canvas border border-subtle rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-tertiary mb-1">Y</label>
                <input
                  type="number"
                  value={config.gravity.y}
                  onChange={(e) => handleGravityChange('y', parseFloat(e.target.value) || 0)}
                  step={0.1}
                  className="w-full px-2 py-1.5 text-sm bg-canvas border border-subtle rounded text-text-primary"
                />
              </div>
            </div>

            {/* Current preset indicator */}
            {currentGravityPreset && (
              <div className="text-xs text-primary">
                Current: {currentGravityPreset.name}
              </div>
            )}

            {/* Gravity presets */}
            <div className="grid grid-cols-2 gap-1.5">
              {GRAVITY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleGravityPreset(preset.id)}
                  className={`px-2 py-1.5 text-xs rounded border transition-colors text-left ${
                    currentGravityPreset?.id === preset.id
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-canvas border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* World Bounds Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('bounds')}
          className="w-full px-3 py-2 flex items-center gap-2 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('bounds') ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
          <span className="text-sm font-medium">World Bounds</span>
        </button>

        {expandedSections.has('bounds') && (
          <div className="px-3 pb-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-tertiary mb-1">Width</label>
                <input
                  type="number"
                  value={config.worldBounds.width}
                  onChange={(e) => handleWorldBoundsChange('width', parseInt(e.target.value) || 800)}
                  min={100}
                  className="w-full px-2 py-1.5 text-sm bg-canvas border border-subtle rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-tertiary mb-1">Height</label>
                <input
                  type="number"
                  value={config.worldBounds.height}
                  onChange={(e) => handleWorldBoundsChange('height', parseInt(e.target.value) || 600)}
                  min={100}
                  className="w-full px-2 py-1.5 text-sm bg-canvas border border-subtle rounded text-text-primary"
                />
              </div>
            </div>

            {/* Common resolutions */}
            <div className="flex flex-wrap gap-1">
              {[
                { w: 800, h: 600, label: '800x600' },
                { w: 1280, h: 720, label: '720p' },
                { w: 1920, h: 1080, label: '1080p' },
                { w: 1024, h: 768, label: '4:3' },
              ].map((res) => (
                <button
                  key={res.label}
                  onClick={() => onConfigChange({
                    ...config,
                    worldBounds: { width: res.w, height: res.h },
                  })}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                    config.worldBounds.width === res.w && config.worldBounds.height === res.h
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-canvas border-subtle text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Material Presets Reference */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('materials')}
          className="w-full px-3 py-2 flex items-center gap-2 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('materials') ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
          <span className="text-sm font-medium">Material Presets</span>
          <span className="ml-auto text-[10px] text-text-tertiary">Reference</span>
        </button>

        {expandedSections.has('materials') && (
          <div className="px-3 pb-3 space-y-1.5">
            <p className="text-[10px] text-text-tertiary mb-2">
              Apply these values to entity physics components:
            </p>
            {MATERIAL_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="p-2 bg-canvas/50 rounded border border-subtle"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-primary">{preset.name}</span>
                  <span className="text-[10px] text-text-tertiary">{preset.description}</span>
                </div>
                <div className="flex gap-4 text-[10px]">
                  <span className="text-text-secondary">
                    Friction: <span className="text-cyan-400 font-mono">{preset.friction}</span>
                  </span>
                  <span className="text-text-secondary">
                    Bounce: <span className="text-orange-400 font-mono">{preset.restitution}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collision Layers Section */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('layers')}
          className="w-full px-3 py-2 flex items-center gap-2 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('layers') ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
          <span className="text-sm font-medium">Collision Layers</span>
          <span className="ml-auto text-[10px] text-text-tertiary">Preview</span>
        </button>

        {expandedSections.has('layers') && (
          <div className="px-3 pb-3 space-y-3">
            <p className="text-[10px] text-text-tertiary">
              Define which layers can collide. Layer support coming in a future update.
            </p>

            {/* Layer Matrix Preview */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="p-1 text-left text-text-tertiary"></th>
                    {['Default', 'Player', 'Enemy', 'Platform', 'Trigger'].map((layer) => (
                      <th key={layer} className="p-1 text-center text-text-tertiary font-normal" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {layer}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Default', 'Player', 'Enemy', 'Platform', 'Trigger'].map((rowLayer, rowIdx) => (
                    <tr key={rowLayer}>
                      <td className="p-1 text-text-secondary">{rowLayer}</td>
                      {['Default', 'Player', 'Enemy', 'Platform', 'Trigger'].map((colLayer, colIdx) => {
                        // Default collision matrix (symmetric)
                        const defaultMatrix = [
                          [true, true, true, true, true],    // Default
                          [true, false, true, true, true],   // Player (no player-player)
                          [true, true, false, true, true],   // Enemy (no enemy-enemy)
                          [true, true, true, false, false],  // Platform (no platform-platform/trigger)
                          [true, true, true, false, false],  // Trigger (no trigger-trigger/platform)
                        ];
                        const isEnabled = rowIdx <= colIdx ? defaultMatrix[rowIdx][colIdx] : defaultMatrix[colIdx][rowIdx];
                        const isDisabled = rowIdx > colIdx; // Lower triangle is mirrored

                        return (
                          <td key={colLayer} className="p-1 text-center">
                            <div
                              className={`w-4 h-4 mx-auto rounded-sm border ${
                                isDisabled
                                  ? 'bg-subtle/30 border-subtle/30'
                                  : isEnabled
                                    ? 'bg-green-500/30 border-green-500'
                                    : 'bg-canvas border-subtle'
                              }`}
                            >
                              {!isDisabled && isEnabled && (
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-text-tertiary pt-2 border-t border-subtle/50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500/30 border border-green-500 rounded-sm" />
                <span>Collides</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-canvas border border-subtle rounded-sm" />
                <span>No collision</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Legend */}
      <div className="border-b border-subtle">
        <button
          onClick={() => toggleSection('legend')}
          className="w-full px-3 py-2 flex items-center gap-2 text-text-primary hover:bg-white/5 transition-colors"
        >
          {expandedSections.has('legend') ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
          <span className="text-sm font-medium">Debug Legend</span>
        </button>

        {expandedSections.has('legend') && (
          <div className="px-3 pb-3 space-y-2">
            <p className="text-[10px] text-text-tertiary mb-2">
              Press D to toggle debug view:
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-500 bg-green-500/20 rounded-sm" />
                <span className="text-xs text-text-secondary">Box Collider</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-400 bg-cyan-400/20 rounded-full" />
                <span className="text-xs text-text-secondary">Circle Collider</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-dashed border-yellow-500 bg-yellow-500/20 rounded-sm" />
                <span className="text-xs text-text-secondary">Sensor (trigger)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" />
                <span className="text-xs text-text-secondary">Velocity Vector</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full" />
                <span className="text-xs text-text-secondary">Rotation Indicator</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-3 text-[10px] uppercase font-bold text-text-tertiary/50 text-center tracking-widest border-t border-subtle">
        Physics Engine: Matter.js
      </div>
    </div>
  );
}
