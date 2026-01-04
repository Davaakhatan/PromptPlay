import { useState } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { publishService, PublishPlatform } from '../services/PublishService';
import { CloseIcon, DownloadIcon, SmartphoneIcon, GlobeIcon } from './Icons';

interface MobileExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameSpec: GameSpec | null;
  onNotification: (message: string) => void;
}

export default function MobileExportDialog({
  isOpen,
  onClose,
  gameSpec,
  onNotification,
}: MobileExportDialogProps) {
  const [platform, setPlatform] = useState<PublishPlatform>('pwa');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState<'any' | 'portrait' | 'landscape'>('any');
  const [touchControls, setTouchControls] = useState(true);
  const [offlineSupport, setOfflineSupport] = useState(true);
  const [themeColor, setThemeColor] = useState('#1a1a2e');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!gameSpec) return;

    setIsExporting(true);

    try {
      const result = await publishService.publish({
        platform,
        gameSpec,
        options: {
          title: title || gameSpec.metadata?.title || 'PromptPlay Game',
          description: description || gameSpec.metadata?.description,
          themeColor,
          orientation,
          touchControls,
          offlineSupport,
        },
      });

      if (result.success && result.output) {
        if (platform === 'pwa' || platform === 'mobile') {
          // PWA export returns a JSON package with multiple files
          const pwaPackage = JSON.parse(result.output as string);

          // Create a zip-like download with all files
          for (const [filename, content] of Object.entries(pwaPackage)) {
            const blob = new Blob([content as string], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }

          onNotification(`PWA files exported! ${result.instructions?.join(' ')}`);
        } else {
          // Single file export
          const blob = new Blob([result.output as string], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.filename || 'game.html';
          a.click();
          URL.revokeObjectURL(url);

          onNotification('Game exported successfully!');
        }

        onClose();
      } else {
        onNotification(`Export failed: ${result.error}`);
      }
    } catch (error) {
      onNotification(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <SmartphoneIcon size={24} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Mobile Export</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <CloseIcon size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlatform('pwa')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  platform === 'pwa'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <SmartphoneIcon size={24} className="mx-auto mb-2 text-blue-400" />
                <div className="text-sm font-medium text-white">PWA (Mobile)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Install on phone home screen
                </div>
              </button>
              <button
                onClick={() => setPlatform('html')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  platform === 'html'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <GlobeIcon size={24} className="mx-auto mb-2 text-green-400" />
                <div className="text-sm font-medium text-white">HTML</div>
                <div className="text-xs text-gray-400 mt-1">
                  Single file, works anywhere
                </div>
              </button>
            </div>
          </div>

          {/* Game Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Game Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={gameSpec?.metadata?.title || 'My Game'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A fun game made with PromptPlay"
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* PWA Options */}
          {(platform === 'pwa' || platform === 'mobile') && (
            <>
              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Screen Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'any' | 'portrait' | 'landscape')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Any (Auto-rotate)</option>
                  <option value="landscape">Landscape Only</option>
                  <option value="portrait">Portrait Only</option>
                </select>
              </div>

              {/* Theme Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={touchControls}
                    onChange={(e) => setTouchControls(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Touch Controls</div>
                    <div className="text-xs text-gray-400">
                      Add on-screen D-pad and action buttons
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offlineSupport}
                    onChange={(e) => setOfflineSupport(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Offline Support</div>
                    <div className="text-xs text-gray-400">
                      Works without internet after install
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            {platform === 'pwa' || platform === 'mobile'
              ? 'Exports: index.html, manifest.json, sw.js'
              : 'Exports: single HTML file'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !gameSpec}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon size={16} />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
