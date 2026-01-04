import { useState, useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { saveAsTemplate } from '../services/TemplateService';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSpec: GameSpec;
  onSaved: (templateName: string) => void;
}

const ICON_OPTIONS = ['📁', '🎮', '🚀', '🎯', '🧩', '⚔️', '🏃', '🎪', '🌟', '💎', '🔥', '⚡'];
const COLOR_OPTIONS = ['violet', 'blue', 'emerald', 'orange', 'rose', 'cyan', 'amber', 'pink'];

export function SaveAsTemplateModal({ isOpen, onClose, gameSpec, onSaved }: SaveAsTemplateModalProps) {
  const [name, setName] = useState(gameSpec.metadata?.title || 'My Template');
  const [description, setDescription] = useState(gameSpec.metadata?.description || '');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('violet');
  const [tags, setTags] = useState<string[]>([gameSpec.metadata?.genre || 'platformer', 'custom']);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      saveAsTemplate(gameSpec, name.trim(), description.trim(), {
        icon: selectedIcon,
        color: selectedColor,
        tags,
      });
      onSaved(name.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  }, [gameSpec, name, description, selectedIcon, selectedColor, tags, onSaved, onClose]);

  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  }, [tags]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-panel border border-subtle rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Save as Template</h2>
          <p className="text-sm text-text-secondary mt-1">
            Save your current game as a reusable template
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Template"
              className="w-full px-3 py-2 bg-canvas border border-subtle rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-tertiary"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your template..."
              rows={3}
              className="w-full px-3 py-2 bg-canvas border border-subtle rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-tertiary resize-none"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedIcon === icon
                      ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-panel'
                      : 'bg-canvas hover:bg-white/10'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-panel scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: {
                      violet: '#8b5cf6',
                      blue: '#3b82f6',
                      emerald: '#10b981',
                      orange: '#f97316',
                      rose: '#f43f5e',
                      cyan: '#06b6d4',
                      amber: '#f59e0b',
                      pink: '#ec4899',
                    }[color],
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 rounded-md text-sm text-text-secondary"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 bg-canvas border border-subtle rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-tertiary"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm text-text-secondary transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Preview Info */}
          <div className="p-3 bg-canvas rounded-lg border border-subtle">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: {
                    violet: '#8b5cf6',
                    blue: '#3b82f6',
                    emerald: '#10b981',
                    orange: '#f97316',
                    rose: '#f43f5e',
                    cyan: '#06b6d4',
                    amber: '#f59e0b',
                    pink: '#ec4899',
                  }[selectedColor] + '30',
                }}
              >
                {selectedIcon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary truncate">
                  {name || 'Untitled Template'}
                </h4>
                <p className="text-xs text-text-tertiary">
                  {gameSpec.entities?.length || 0} entities • {gameSpec.metadata?.genre || 'platformer'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-subtle flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
