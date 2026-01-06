import { useState, useRef, useCallback, useEffect } from 'react';
import type { EasingType, BezierCurve } from '@promptplay/shared-types';

interface EasingCurveEditorProps {
  easing: EasingType;
  customCurve?: BezierCurve;
  onChange: (easing: EasingType, customCurve?: BezierCurve) => void;
  compact?: boolean;
}

// Predefined bezier curves for each easing type
const EASING_PRESETS: Record<Exclude<EasingType, 'custom'>, BezierCurve> = {
  'linear': { x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 },
  'ease-in-quad': { x1: 0.55, y1: 0.085, x2: 0.68, y2: 0.53 },
  'ease-out-quad': { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  'ease-in-out-quad': { x1: 0.455, y1: 0.03, x2: 0.515, y2: 0.955 },
  'ease-in-cubic': { x1: 0.55, y1: 0.055, x2: 0.675, y2: 0.19 },
  'ease-out-cubic': { x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 },
  'ease-in-out-cubic': { x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
  'ease-in-quart': { x1: 0.895, y1: 0.03, x2: 0.685, y2: 0.22 },
  'ease-out-quart': { x1: 0.165, y1: 0.84, x2: 0.44, y2: 1 },
  'ease-in-out-quart': { x1: 0.77, y1: 0, x2: 0.175, y2: 1 },
  'ease-in-sine': { x1: 0.47, y1: 0, x2: 0.745, y2: 0.715 },
  'ease-out-sine': { x1: 0.39, y1: 0.575, x2: 0.565, y2: 1 },
  'ease-in-out-sine': { x1: 0.445, y1: 0.05, x2: 0.55, y2: 0.95 },
  'ease-in-expo': { x1: 0.95, y1: 0.05, x2: 0.795, y2: 0.035 },
  'ease-out-expo': { x1: 0.19, y1: 1, x2: 0.22, y2: 1 },
  'ease-in-out-expo': { x1: 1, y1: 0, x2: 0, y2: 1 },
  'ease-in-elastic': { x1: 0.5, y1: -0.5, x2: 0.75, y2: 0.5 },
  'ease-out-elastic': { x1: 0.25, y1: 0.5, x2: 0.5, y2: 1.5 },
  'ease-in-out-elastic': { x1: 0.5, y1: -0.25, x2: 0.5, y2: 1.25 },
  'ease-in-bounce': { x1: 0.6, y1: -0.28, x2: 0.735, y2: 0.045 },
  'ease-out-bounce': { x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 },
  'ease-in-out-bounce': { x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 },
};

// Grouped easing options for dropdown
const EASING_GROUPS = [
  { label: 'Linear', options: ['linear'] },
  { label: 'Quad', options: ['ease-in-quad', 'ease-out-quad', 'ease-in-out-quad'] },
  { label: 'Cubic', options: ['ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic'] },
  { label: 'Quart', options: ['ease-in-quart', 'ease-out-quart', 'ease-in-out-quart'] },
  { label: 'Sine', options: ['ease-in-sine', 'ease-out-sine', 'ease-in-out-sine'] },
  { label: 'Expo', options: ['ease-in-expo', 'ease-out-expo', 'ease-in-out-expo'] },
  { label: 'Elastic', options: ['ease-in-elastic', 'ease-out-elastic', 'ease-in-out-elastic'] },
  { label: 'Bounce', options: ['ease-in-bounce', 'ease-out-bounce', 'ease-in-out-bounce'] },
  { label: 'Custom', options: ['custom'] },
];

// Calculate bezier curve point
function bezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// Generate SVG path for bezier curve
function generateCurvePath(curve: BezierCurve, width: number, height: number, padding: number): string {
  const points: string[] = [];
  const steps = 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = bezier(t, 0, curve.x1, curve.x2, 1);
    const y = bezier(t, 0, curve.y1, curve.y2, 1);

    const px = padding + x * (width - 2 * padding);
    const py = height - padding - y * (height - 2 * padding);

    points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
  }

  return points.join(' ');
}

export default function EasingCurveEditor({
  easing,
  customCurve,
  onChange,
  compact = false,
}: EasingCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Get current curve values
  const curve = easing === 'custom' && customCurve
    ? customCurve
    : EASING_PRESETS[easing as Exclude<EasingType, 'custom'>] || EASING_PRESETS.linear;

  const width = compact ? 80 : 120;
  const height = compact ? 80 : 120;
  const padding = 10;

  const handleMouseDown = useCallback((point: 'p1' | 'p2') => {
    setDragging(point);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left - padding) / (width - 2 * padding)));
    const y = Math.max(-0.5, Math.min(1.5, 1 - (e.clientY - rect.top - padding) / (height - 2 * padding)));

    const newCurve = { ...curve };
    if (dragging === 'p1') {
      newCurve.x1 = x;
      newCurve.y1 = y;
    } else {
      newCurve.x2 = x;
      newCurve.y2 = y;
    }

    onChange('custom', newCurve);
  }, [dragging, curve, width, height, padding, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handlePresetSelect = useCallback((preset: EasingType) => {
    if (preset === 'custom') {
      onChange('custom', customCurve || { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
    } else {
      onChange(preset);
    }
    setShowDropdown(false);
  }, [customCurve, onChange]);

  // Calculate control point positions in SVG coordinates
  const p1x = padding + curve.x1 * (width - 2 * padding);
  const p1y = height - padding - curve.y1 * (height - 2 * padding);
  const p2x = padding + curve.x2 * (width - 2 * padding);
  const p2y = height - padding - curve.y2 * (height - 2 * padding);

  const startX = padding;
  const startY = height - padding;
  const endX = width - padding;
  const endY = padding;

  return (
    <div className="flex flex-col gap-2">
      {/* Easing type dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-2 py-1 text-xs bg-canvas border border-subtle rounded text-text-primary text-left flex items-center justify-between hover:border-primary/50 transition-colors"
        >
          <span className="truncate">{easing}</span>
          <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-panel border border-subtle rounded shadow-lg max-h-48 overflow-y-auto">
            {EASING_GROUPS.map(group => (
              <div key={group.label}>
                <div className="px-2 py-1 text-[10px] text-text-tertiary bg-subtle/50 sticky top-0">
                  {group.label}
                </div>
                {group.options.map(option => (
                  <button
                    key={option}
                    onClick={() => handlePresetSelect(option as EasingType)}
                    className={`w-full px-2 py-1 text-xs text-left hover:bg-white/5 ${
                      easing === option ? 'text-primary bg-primary/10' : 'text-text-primary'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curve preview/editor */}
      <div className="relative bg-canvas border border-subtle rounded overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block"
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-subtle" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Diagonal reference line */}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2,2"
            className="text-text-tertiary"
          />

          {/* Control point lines */}
          <line
            x1={startX}
            y1={startY}
            x2={p1x}
            y2={p1y}
            stroke="currentColor"
            strokeWidth="1"
            className="text-blue-400"
          />
          <line
            x1={endX}
            y1={endY}
            x2={p2x}
            y2={p2y}
            stroke="currentColor"
            strokeWidth="1"
            className="text-orange-400"
          />

          {/* Bezier curve */}
          <path
            d={generateCurvePath(curve, width, height, padding)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />

          {/* Control points (draggable when easing is custom) */}
          <circle
            cx={p1x}
            cy={p1y}
            r={5}
            fill="currentColor"
            className={`text-blue-400 ${easing === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={easing === 'custom' ? () => handleMouseDown('p1') : undefined}
          />
          <circle
            cx={p2x}
            cy={p2y}
            r={5}
            fill="currentColor"
            className={`text-orange-400 ${easing === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={easing === 'custom' ? () => handleMouseDown('p2') : undefined}
          />

          {/* Start and end points */}
          <circle cx={startX} cy={startY} r={3} fill="currentColor" className="text-text-secondary" />
          <circle cx={endX} cy={endY} r={3} fill="currentColor" className="text-text-secondary" />
        </svg>

        {/* Hint for custom mode */}
        {easing === 'custom' && (
          <div className="absolute bottom-1 left-1 right-1 text-[8px] text-text-tertiary text-center">
            Drag points to edit
          </div>
        )}
      </div>

      {/* Custom curve values (when in custom mode) */}
      {easing === 'custom' && !compact && (
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-blue-400">P1:</span>
            <span className="text-text-secondary">
              ({curve.x1.toFixed(2)}, {curve.y1.toFixed(2)})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-orange-400">P2:</span>
            <span className="text-text-secondary">
              ({curve.x2.toFixed(2)}, {curve.y2.toFixed(2)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to get easing value at time t
export function getEasingValue(t: number, easing: EasingType, customCurve?: BezierCurve): number {
  const curve = easing === 'custom' && customCurve
    ? customCurve
    : EASING_PRESETS[easing as Exclude<EasingType, 'custom'>] || EASING_PRESETS.linear;

  // Use Newton-Raphson to find t for given x (since bezier x != t)
  let guess = t;
  for (let i = 0; i < 4; i++) {
    const x = bezier(guess, 0, curve.x1, curve.x2, 1);
    const slope = 3 * (1 - guess) * (1 - guess) * curve.x1 +
                  6 * (1 - guess) * guess * (curve.x2 - curve.x1) +
                  3 * guess * guess * (1 - curve.x2);
    if (Math.abs(slope) < 0.0001) break;
    guess -= (x - t) / slope;
    guess = Math.max(0, Math.min(1, guess));
  }

  return bezier(guess, 0, curve.y1, curve.y2, 1);
}

// Export presets for use elsewhere
export { EASING_PRESETS };
