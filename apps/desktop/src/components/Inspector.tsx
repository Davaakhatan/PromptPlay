import { useState, useEffect, useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { ChevronRightIcon, TrashIcon, CopyIcon, PlusIcon, TagIcon } from './Icons';

interface InspectorProps {
  gameSpec: GameSpec | null;
  selectedEntity: string | null;
  onUpdateEntity: (entityName: string, updates: any) => void;
  onDeleteEntity?: (entityName: string) => void;
  onDuplicateEntity?: (entityName: string) => void;
}

// Convert number to hex color string
const numberToHex = (num: number): string => {
  const hex = num.toString(16).padStart(6, '0');
  return `#${hex}`;
};

// Convert hex color string to number
const hexToNumber = (hex: string): number => {
  return parseInt(hex.replace('#', ''), 16);
};

export default function Inspector({
  gameSpec,
  selectedEntity,
  onUpdateEntity,
  onDeleteEntity,
  onDuplicateEntity,
}: InspectorProps) {
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  const entity = gameSpec?.entities?.find((e) => e.name === selectedEntity);

  // Reset edited values when entity changes
  useEffect(() => {
    setEditedValues({});
    setShowAddTag(false);
    setNewTag('');
  }, [selectedEntity]);

  const handleValueChange = useCallback((componentName: string, key: string, value: any) => {
    const editKey = `${componentName}.${key}`;
    setEditedValues((prev) => ({
      ...prev,
      [editKey]: value,
    }));
  }, []);

  const handleApplyChanges = useCallback(() => {
    if (!entity) return;

    const updatedComponents = { ...entity.components } as Record<string, any>;

    // Apply all edited values
    Object.entries(editedValues).forEach(([editKey, value]) => {
      const [componentName, key] = editKey.split('.');
      if (updatedComponents[componentName]) {
        updatedComponents[componentName] = {
          ...updatedComponents[componentName],
          [key]: value,
        };
      }
    });

    onUpdateEntity(entity.name, { components: updatedComponents });
    setEditedValues({});
  }, [entity, editedValues, onUpdateEntity]);

  const handleAddTag = useCallback(() => {
    if (!entity || !newTag.trim()) return;

    const currentTags = entity.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag('');
      setShowAddTag(false);
      return;
    }

    onUpdateEntity(entity.name, {
      tags: [...currentTags, newTag.trim()],
    });
    setNewTag('');
    setShowAddTag(false);
  }, [entity, newTag, onUpdateEntity]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    if (!entity) return;

    const currentTags = entity.tags || [];
    onUpdateEntity(entity.name, {
      tags: currentTags.filter(t => t !== tagToRemove),
    });
  }, [entity, onUpdateEntity]);

  if (!gameSpec) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-4">
        <p>No game loaded</p>
      </div>
    );
  }

  if (!selectedEntity || !entity) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-4 text-center">
        <div className="mb-2">
          <ChevronRightIcon size={32} className="text-gray-300" />
        </div>
        <p>Select an entity from</p>
        <p>the scene tree to inspect</p>
      </div>
    );
  }

  // Render specialized input based on key name and value type
  const renderValue = (componentName: string, key: string, value: any) => {
    const editKey = `${componentName}.${key}`;
    const currentValue = editedValues[editKey] !== undefined ? editedValues[editKey] : value;
    const isEdited = editedValues[editKey] !== undefined;

    // Boolean toggle
    if (typeof value === 'boolean') {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={currentValue}
            onChange={(e) => handleValueChange(componentName, key, e.target.checked)}
            className="sr-only peer"
          />
          <div className={`
            w-9 h-5 rounded-full peer peer-checked:after:translate-x-full
            after:content-[''] after:absolute after:top-0.5 after:left-[2px]
            after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
            ${currentValue ? 'bg-blue-600' : 'bg-gray-300'}
          `} />
        </label>
      );
    }

    // Color picker for tint
    if (key === 'tint' && typeof value === 'number') {
      const colorHex = numberToHex(currentValue);
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorHex}
            onChange={(e) => handleValueChange(componentName, key, hexToNumber(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={colorHex}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                handleValueChange(componentName, key, hexToNumber(hex));
              }
            }}
            className={`
              w-20 px-2 py-1 text-xs font-mono border rounded
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          />
        </div>
      );
    }

    // Slider for rotation
    if (key === 'rotation' && typeof value === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
            className={`
              w-16 px-2 py-1 text-xs border rounded text-center
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          />
        </div>
      );
    }

    // Slider for scale
    if ((key === 'scaleX' || key === 'scaleY') && typeof value === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            value={currentValue}
            step="0.1"
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
            className={`
              w-16 px-2 py-1 text-xs border rounded text-center
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          />
        </div>
      );
    }

    // Slider for zoom
    if (key === 'zoom' && typeof value === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            value={currentValue}
            step="0.1"
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
            className={`
              w-16 px-2 py-1 text-xs border rounded text-center
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          />
        </div>
      );
    }

    // Number input with appropriate step
    if (typeof value === 'number') {
      // Determine step based on key name
      let step = 1;
      if (key.includes('speed') || key.includes('force') || key.includes('gravity')) {
        step = 10;
      } else if (key.includes('smoothing') || key.includes('intensity')) {
        step = 0.1;
      }

      return (
        <input
          type="number"
          value={currentValue}
          onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
          className={`
            w-full px-2 py-1 text-sm border rounded
            ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
          step={step}
        />
      );
    }

    // Text input
    if (typeof value === 'string') {
      // Dropdown for collider type
      if (key === 'type' && componentName === 'collider') {
        return (
          <select
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, e.target.value)}
            className={`
              w-full px-2 py-1 text-sm border rounded
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          >
            <option value="box">Box</option>
            <option value="circle">Circle</option>
          </select>
        );
      }

      // Dropdown for texture
      if (key === 'texture') {
        return (
          <select
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, e.target.value)}
            className={`
              w-full px-2 py-1 text-sm border rounded
              ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
          >
            <option value="default">Default</option>
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
            <option value="platform">Platform</option>
            <option value="coin">Coin</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleValueChange(componentName, key, e.target.value)}
          className={`
            w-full px-2 py-1 text-sm border rounded
            ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
        />
      );
    }

    return <span className="text-xs text-gray-500">{JSON.stringify(value)}</span>;
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{entity.name}</h3>
          <div className="flex items-center gap-1">
            {onDuplicateEntity && (
              <button
                onClick={() => onDuplicateEntity(entity.name)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                title="Duplicate Entity"
              >
                <CopyIcon size={14} />
              </button>
            )}
            {onDeleteEntity && (
              <button
                onClick={() => onDeleteEntity(entity.name)}
                className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                title="Delete Entity"
              >
                <TrashIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2">
          <div className="flex items-center gap-1 flex-wrap">
            <TagIcon size={12} className="text-gray-400" />
            {entity.tags && entity.tags.map((tag) => (
              <span
                key={tag}
                className="group px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-600"
                >
                  &times;
                </button>
              </span>
            ))}
            {showAddTag ? (
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') {
                    setShowAddTag(false);
                    setNewTag('');
                  }
                }}
                onBlur={() => {
                  if (newTag.trim()) handleAddTag();
                  else {
                    setShowAddTag(false);
                    setNewTag('');
                  }
                }}
                placeholder="tag name"
                className="px-2 py-0.5 text-xs border border-gray-300 rounded w-20"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowAddTag(true)}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                title="Add Tag"
              >
                <PlusIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {entity.components && Object.entries(entity.components).map(([componentName, component]) => (
            <div key={componentName} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <h4 className="text-xs font-semibold text-gray-600 uppercase">
                  {componentName}
                </h4>
              </div>
              <div className="p-3 space-y-3">
                {Object.entries(component as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">{key}</label>
                    {renderValue(componentName, key, value)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {Object.keys(entity.components || {}).length} components
        </span>
        {hasChanges && (
          <button
            onClick={handleApplyChanges}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Apply Changes
          </button>
        )}
      </div>
    </div>
  );
}
