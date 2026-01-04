import React, { useState } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { publishService, PublishPlatform, PublishResult } from '../services/PublishService';
import { CloseIcon, RocketIcon, GlobeIcon, CloudUploadIcon, ShareIcon } from './Icons';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameSpec: GameSpec | null;
  onNotification: (message: string) => void;
}

interface Platform {
  id: PublishPlatform;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const platforms: Platform[] = [
  {
    id: 'itch',
    name: 'itch.io',
    description: 'Popular indie game platform',
    icon: <GlobeIcon size={24} />,
    color: 'text-red-400',
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    description: 'Free hosting on GitHub',
    icon: <CloudUploadIcon size={24} />,
    color: 'text-gray-400',
  },
  {
    id: 'pwa',
    name: 'Mobile PWA',
    description: 'Install on phones as app',
    icon: <RocketIcon size={24} />,
    color: 'text-blue-400',
  },
  {
    id: 'html',
    name: 'HTML File',
    description: 'Single file, share anywhere',
    icon: <ShareIcon size={24} />,
    color: 'text-green-400',
  },
];

export default function PublishDialog({
  isOpen,
  onClose,
  gameSpec,
  onNotification,
}: PublishDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PublishPlatform>('itch');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!gameSpec) return;

    setIsPublishing(true);
    setResult(null);

    try {
      const publishResult = await publishService.publish({
        platform: selectedPlatform,
        gameSpec,
        options: {
          title: title || gameSpec.metadata?.title || 'My Game',
          description: description || gameSpec.metadata?.description,
        },
      });

      setResult(publishResult);

      if (publishResult.success && publishResult.output) {
        // Handle file download
        if (selectedPlatform === 'pwa' || selectedPlatform === 'mobile') {
          const pwaPackage = JSON.parse(publishResult.output as string);
          for (const [filename, content] of Object.entries(pwaPackage)) {
            const blob = new Blob([content as string], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }
        } else {
          const blob = new Blob([publishResult.output as string], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = publishResult.filename || 'game.html';
          a.click();
          URL.revokeObjectURL(url);
        }

        onNotification('Files downloaded! Follow the instructions to publish.');
      }
    } catch (error) {
      onNotification(`Publish error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedPlatformInfo = platforms.find(p => p.id === selectedPlatform);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <RocketIcon size={24} className="text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Publish Game</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <CloseIcon size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!result ? (
            <div className="space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Choose Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedPlatform === platform.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className={`${platform.color} mb-2`}>{platform.icon}</div>
                      <div className="text-sm font-medium text-white">{platform.name}</div>
                      <div className="text-xs text-gray-400">{platform.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Game Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={gameSpec?.metadata?.title || 'My Awesome Game'}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A fun game made with PromptPlay"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Platform Info */}
              {selectedPlatformInfo && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    About {selectedPlatformInfo.name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {selectedPlatform === 'itch' && (
                      <>
                        itch.io is the most popular indie game hosting platform.
                        You'll need to create an account and upload your game files manually.
                        Great for reaching a large audience of indie game fans.
                      </>
                    )}
                    {selectedPlatform === 'github-pages' && (
                      <>
                        GitHub Pages provides free hosting for static websites.
                        Create a repository, upload the files, and enable Pages in settings.
                        Perfect for developers who already use GitHub.
                      </>
                    )}
                    {selectedPlatform === 'pwa' && (
                      <>
                        Export as a Progressive Web App that can be installed on mobile devices.
                        Includes touch controls, offline support, and app manifest.
                        Deploy to any HTTPS server for full PWA functionality.
                      </>
                    )}
                    {selectedPlatform === 'html' && (
                      <>
                        Export as a single HTML file that works anywhere.
                        Just open in a browser - no server needed.
                        Easy to share via email, Discord, or any file sharing service.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success Message */}
              <div className={`rounded-lg p-6 ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.success ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white">✕</div>
                  )}
                  <h3 className="text-lg font-semibold text-white">
                    {result.success ? 'Files Ready!' : 'Export Failed'}
                  </h3>
                </div>
                {result.error && (
                  <p className="text-red-300">{result.error}</p>
                )}
              </div>

              {/* Instructions */}
              {result.instructions && result.instructions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Next Steps
                  </h4>
                  <ol className="space-y-2">
                    {result.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        {instruction.startsWith('For local') || instruction === '' ? (
                          <span className="text-gray-500">{instruction}</span>
                        ) : (
                          <>
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-xs">
                              {index + 1}
                            </span>
                            <span>{instruction}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Quick Links */}
              {selectedPlatform === 'itch' && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Quick Links</h4>
                  <div className="flex gap-3">
                    <a
                      href="https://itch.io/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Open itch.io Dashboard →
                    </a>
                    <a
                      href="https://itch.io/game/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Create New Project →
                    </a>
                  </div>
                </div>
              )}

              {selectedPlatform === 'github-pages' && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Quick Links</h4>
                  <div className="flex gap-3">
                    <a
                      href="https://github.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Create New Repository →
                    </a>
                    <a
                      href="https://docs.github.com/pages"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Pages Documentation →
                    </a>
                  </div>
                </div>
              )}

              {/* Publish Another */}
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Export for another platform
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || !gameSpec}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isPublishing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Preparing...
                </>
              ) : (
                <>
                  <RocketIcon size={16} />
                  Export & Publish
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
