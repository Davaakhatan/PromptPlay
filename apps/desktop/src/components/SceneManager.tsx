import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameSpec, SceneSpec } from '@promptplay/shared-types';
import {
  SceneIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  ChevronRightIcon,
} from './Icons';

interface SceneManagerProps {
  gameSpec: GameSpec | null;
  activeSceneId: string | null;
  onSwitchScene: (sceneId: string) => void;
  onCreateScene: (name: string) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
}

export default function SceneManager({
  gameSpec,
  activeSceneId,
  onSwitchScene,
  onCreateScene,
  onRenameScene,
  onDeleteScene,
  onDuplicateScene,
}: SceneManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);

  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Get scenes from gameSpec (or create a default scene from entities)
  const scenes: SceneSpec[] = gameSpec?.scenes || (gameSpec?.entities ? [{
    id: 'main',
    name: 'Main Scene',
    entities: gameSpec.entities,
  }] : []);

  // Focus create input when creating
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingSceneId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSceneId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const handleCreateSubmit = useCallback(() => {
    const name = newSceneName.trim();
    if (name) {
      onCreateScene(name);
      setNewSceneName('');
      setIsCreating(false);
    }
  }, [newSceneName, onCreateScene]);

  const handleCreateKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreating(false);
      setNewSceneName('');
    }
  }, [handleCreateSubmit]);

  const startEditing = useCallback((sceneId: string, currentName: string) => {
    setEditingSceneId(sceneId);
    setEditValue(currentName);
    setContextMenu(null);
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (editingSceneId && editValue.trim()) {
      onRenameScene(editingSceneId, editValue.trim());
    }
    setEditingSceneId(null);
    setEditValue('');
  }, [editingSceneId, editValue, onRenameScene]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingSceneId(null);
      setEditValue('');
    }
  }, [handleEditSubmit]);

  const handleContextMenu = useCallback((e: React.MouseEvent, sceneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sceneId,
    });
  }, []);

  const handleContextAction = useCallback((action: string) => {
    if (!contextMenu) return;

    const scene = scenes.find(s => s.id === contextMenu.sceneId);
    if (!scene) return;

    setContextMenu(null);

    switch (action) {
      case 'rename':
        startEditing(scene.id, scene.name);
        break;
      case 'duplicate':
        onDuplicateScene(scene.id);
        break;
      case 'delete':
        if (scenes.length > 1) {
          onDeleteScene(scene.id);
        }
        break;
    }
  }, [contextMenu, scenes, startEditing, onDuplicateScene, onDeleteScene]);

  if (!gameSpec) {
    return (
      <div className="h-full flex flex-col bg-panel">
        <div className="px-3 py-2 bg-subtle border-b border-subtle">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Scenes</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          <p>No project loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="px-3 py-2 bg-subtle border-b border-subtle flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Scenes</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
          title="Create Scene"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      {/* Scene List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {scenes.map((scene) => {
          const isActive = scene.id === activeSceneId || (activeSceneId === null && scene.id === 'main');
          const isEditing = editingSceneId === scene.id;

          return (
            <div
              key={scene.id}
              className={`
                flex items-center px-3 py-2 cursor-pointer transition-all rounded-lg group mb-1
                ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
              `}
              onClick={() => !isEditing && onSwitchScene(scene.id)}
              onDoubleClick={() => startEditing(scene.id, scene.name)}
              onContextMenu={(e) => handleContextMenu(e, scene.id)}
            >
              <ChevronRightIcon
                size={12}
                className={`mr-1.5 ${isActive ? 'text-white/70' : 'text-text-tertiary'}`}
              />
              <SceneIcon
                size={14}
                className={`mr-2 ${isActive ? 'text-white/80' : 'text-text-tertiary'}`}
              />

              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditSubmit}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm font-medium tracking-tight bg-canvas border border-white/20 rounded px-2 py-0.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <span className="text-sm font-medium tracking-tight flex-1">
                  {scene.name}
                </span>
              )}

              <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                {scene.entities?.length || 0}
              </span>
            </div>
          );
        })}

        {/* Create New Scene Input */}
        {isCreating && (
          <div className="flex items-center px-3 py-2 rounded-lg bg-white/5 border border-primary/30 mb-1">
            <SceneIcon size={14} className="mr-2 text-primary" />
            <input
              ref={createInputRef}
              type="text"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => {
                if (!newSceneName.trim()) {
                  setIsCreating(false);
                }
              }}
              placeholder="Scene name..."
              className="flex-1 text-sm bg-transparent border-none text-text-primary placeholder-text-tertiary focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-[10px] uppercase font-bold text-text-tertiary/50 text-center tracking-widest border-t border-subtle">
        {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-panel border border-subtle rounded-lg shadow-2xl py-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleContextAction('rename')}
            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <EditIcon size={14} className="text-text-tertiary" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => handleContextAction('duplicate')}
            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <PlusIcon size={14} className="text-text-tertiary" />
            <span>Duplicate</span>
          </button>
          {scenes.length > 1 && (
            <>
              <div className="my-1 border-t border-subtle" />
              <button
                onClick={() => handleContextAction('delete')}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <TrashIcon size={14} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
