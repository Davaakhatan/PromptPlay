/**
 * Mobile Preview Component
 * Preview games in simulated mobile device frames
 */

import { useState, useRef, useEffect } from 'react';

type DeviceType = 'iphone14' | 'iphone14pro' | 'pixel7' | 'ipad' | 'custom';
type Orientation = 'portrait' | 'landscape';

interface DeviceSpec {
  name: string;
  width: number;
  height: number;
  devicePixelRatio: number;
  notchHeight?: number;
  borderRadius: number;
}

const DEVICES: Record<DeviceType, DeviceSpec> = {
  iphone14: {
    name: 'iPhone 14',
    width: 390,
    height: 844,
    devicePixelRatio: 3,
    notchHeight: 47,
    borderRadius: 47,
  },
  iphone14pro: {
    name: 'iPhone 14 Pro',
    width: 393,
    height: 852,
    devicePixelRatio: 3,
    notchHeight: 59,
    borderRadius: 55,
  },
  pixel7: {
    name: 'Pixel 7',
    width: 412,
    height: 915,
    devicePixelRatio: 2.625,
    notchHeight: 32,
    borderRadius: 24,
  },
  ipad: {
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    devicePixelRatio: 2,
    borderRadius: 18,
  },
  custom: {
    name: 'Custom',
    width: 375,
    height: 667,
    devicePixelRatio: 2,
    borderRadius: 0,
  },
};

interface MobilePreviewProps {
  gameUrl?: string;
  onClose: () => void;
  projectPath?: string;
}

export function MobilePreview({ gameUrl, onClose, projectPath }: MobilePreviewProps) {
  const [device, setDevice] = useState<DeviceType>('iphone14');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scale, setScale] = useState(0.5);
  const [showTouchIndicator, setShowTouchIndicator] = useState(true);
  const [customWidth, setCustomWidth] = useState(375);
  const [customHeight, setCustomHeight] = useState(667);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDevice = device === 'custom'
    ? { ...DEVICES.custom, width: customWidth, height: customHeight }
    : DEVICES[device];

  const displayWidth = orientation === 'portrait' ? currentDevice.width : currentDevice.height;
  const displayHeight = orientation === 'portrait' ? currentDevice.height : currentDevice.width;

  // Auto-scale to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.clientWidth - 80;
      const containerHeight = container.clientHeight - 120;
      const deviceWidth = displayWidth + 40; // Add frame padding
      const deviceHeight = displayHeight + 40;

      const scaleX = containerWidth / deviceWidth;
      const scaleY = containerHeight / deviceHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(Math.max(0.25, newScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [displayWidth, displayHeight]);

  // Simulate touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!iframeRef.current?.contentWindow) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Send touch event to iframe
    iframeRef.current.contentWindow.postMessage({
      type: 'touch',
      action: 'start',
      x,
      y,
    }, '*');
  };

  const handleMouseUp = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'touch',
      action: 'end',
    }, '*');
  };

  // Generate preview URL
  const previewUrl = gameUrl || (projectPath
    ? `file://${projectPath}/dist/index.html`
    : 'about:blank');

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-panel border-b border-subtle">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Mobile Preview</h2>

          {/* Device selector */}
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as DeviceType)}
            className="px-3 py-1.5 bg-subtle border border-subtle rounded text-sm"
          >
            {Object.entries(DEVICES).map(([key, spec]) => (
              <option key={key} value={key}>{spec.name}</option>
            ))}
          </select>

          {/* Orientation toggle */}
          <button
            onClick={() => setOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')}
            className={`px-3 py-1.5 rounded text-sm ${
              orientation === 'portrait' ? 'bg-accent text-white' : 'bg-subtle'
            }`}
          >
            {orientation === 'portrait' ? '📱 Portrait' : '📱 Landscape'}
          </button>

          {/* Custom dimensions */}
          {device === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 375)}
                className="w-16 px-2 py-1 bg-subtle border border-subtle rounded text-sm text-center"
                placeholder="W"
              />
              <span className="text-text-secondary">×</span>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 667)}
                className="w-16 px-2 py-1 bg-subtle border border-subtle rounded text-sm text-center"
                placeholder="H"
              />
            </div>
          )}

          {/* Scale slider */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Scale:</span>
            <input
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-text-secondary">{Math.round(scale * 100)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTouchIndicator}
              onChange={(e) => setShowTouchIndicator(e.target.checked)}
              className="rounded"
            />
            <span className="text-text-secondary">Touch indicator</span>
          </label>

          <button
            onClick={() => iframeRef.current?.contentWindow?.location.reload()}
            className="px-3 py-1.5 bg-subtle hover:bg-subtle/80 rounded text-sm"
          >
            🔄 Reload
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Device frame */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-8 overflow-auto"
      >
        <div
          className="relative bg-black rounded-[var(--radius)] shadow-2xl"
          style={{
            '--radius': `${currentDevice.borderRadius * scale}px`,
            width: (displayWidth + 20) * scale,
            height: (displayHeight + 20) * scale,
            padding: 10 * scale,
          } as React.CSSProperties}
        >
          {/* Notch (if applicable) */}
          {currentDevice.notchHeight && orientation === 'portrait' && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 bg-black rounded-b-2xl z-10"
              style={{
                width: 150 * scale,
                height: currentDevice.notchHeight * scale,
              }}
            />
          )}

          {/* Screen */}
          <div
            className="relative overflow-hidden bg-white"
            style={{
              width: displayWidth * scale,
              height: displayHeight * scale,
              borderRadius: (currentDevice.borderRadius - 6) * scale,
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="border-0"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              title="Mobile Preview"
            />

            {/* Touch indicator overlay */}
            {showTouchIndicator && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                  Click to simulate touch
                </div>
              </div>
            )}
          </div>

          {/* Home indicator (iOS style) */}
          {orientation === 'portrait' && (
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-white/30 rounded-full"
              style={{
                width: 134 * scale,
                height: 5 * scale,
              }}
            />
          )}
        </div>
      </div>

      {/* Device info */}
      <div className="px-4 py-2 bg-panel border-t border-subtle text-center">
        <span className="text-sm text-text-secondary">
          {currentDevice.name} • {displayWidth}×{displayHeight} @ {currentDevice.devicePixelRatio}x
        </span>
      </div>
    </div>
  );
}

export default MobilePreview;
