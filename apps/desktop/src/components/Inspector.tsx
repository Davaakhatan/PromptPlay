import { useState, useEffect, useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { ChevronRightIcon, TrashIcon, CopyIcon, PlusIcon, TagIcon } from './Icons';
import { componentRegistry, type FieldSchema } from '../services/ComponentRegistry';

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

    // 1. Try to get schema definition
    const schema = componentRegistry.get(componentName);
    const fieldSchema = schema?.fields[key];

    // 2. Generic Input Renderer Helper
    const renderInput = (type: string, props: any = {}) => {
      // Color Input
      if (type === 'color') {
        const colorHex = typeof currentValue === 'number' ? numberToHex(currentValue) : currentValue;
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => handleValueChange(componentName, key, typeof value === 'number' ? hexToNumber(e.target.value) : e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-subtle bg-canvas"
            />
            <input
              type="text"
              value={colorHex}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  handleValueChange(componentName, key, typeof value === 'number' ? hexToNumber(hex) : hex);
                }
              }}
              className={`
                w-20 px-2 py-1 text-xs font-mono border rounded bg-canvas text-text-primary
                ${isEdited ? 'border-primary bg-primary/10' : 'border-subtle'}
              `}
            />
          </div>
        );
      }

      // Range/Slider Input
      if (props.min !== undefined && props.max !== undefined && type === 'number') {
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={props.min}
              max={props.max}
              step={props.step || 1}
              value={currentValue}
              onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value))}
              className="flex-1 h-2 bg-subtle rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <input
              type="number"
              value={currentValue}
              step={props.step || 1}
              onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
              className={`
                w-16 px-2 py-1 text-xs border rounded text-center bg-canvas text-text-primary
                ${isEdited ? 'border-primary bg-primary/10' : 'border-subtle'}
              `}
            />
          </div>
        );
      }

      // Boolean Input
      if (type === 'boolean') {
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
              ${currentValue ? 'bg-primary' : 'bg-subtle'}
            `} />
          </label>
        );
      }

      // Select Input
      if (type === 'select' && props.options) {
        return (
          <select
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, e.target.value)}
            className={`
              w-full px-2 py-1 text-sm border rounded bg-canvas text-text-primary
              ${isEdited ? 'border-primary bg-primary/10' : 'border-subtle'}
            `}
          >
            {props.options.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }

      // Standard Number Input
      if (type === 'number') {
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
            className={`
              w-full px-2 py-1 text-sm border rounded bg-canvas text-text-primary
              ${isEdited ? 'border-primary bg-primary/10' : 'border-subtle'}
            `}
            step={props.step || 1}
          />
        );
      }

      // Default String Input
      return (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleValueChange(componentName, key, e.target.value)}
          className={`
            w-full px-2 py-1 text-sm border rounded bg-canvas text-text-primary
            ${isEdited ? 'border-primary bg-primary/10' : 'border-subtle'}
          `}
        />
      );
    };

    // 3. Render based on Schema or Fallback
    if (fieldSchema) {
      return renderInput(fieldSchema.type, fieldSchema);
    }

    // Fallback: Guess based on value type
    const guessedType = typeof value;
    return renderInput(guessedType);
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="px-4 py-3 bg-subtle border-b border-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{entity.name}</h3>
          <div className="flex items-center gap-1">
            {onDuplicateEntity && (
              <button
                onClick={() => onDuplicateEntity(entity.name)}
                className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                title="Duplicate Entity"
              >
                <CopyIcon size={14} />
              </button>
            )}
            {onDeleteEntity && (
              <button
                onClick={() => onDeleteEntity(entity.name)}
                className="p-1.5 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
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
            <TagIcon size={12} className="text-text-tertiary" />
            {entity.tags && entity.tags.map((tag) => (
              <span
                key={tag}
                className="group px-2 py-0.5 text-xs bg-canvas text-text-secondary border border-subtle rounded flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400"
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
                className="px-2 py-0.5 text-xs border border-subtle bg-canvas text-text-primary rounded w-20 focus:outline-none focus:border-primary"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowAddTag(true)}
                className="p-0.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-secondary"
                title="Add Tag"
              >
                <PlusIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {entity.components && Object.entries(entity.components).map(([componentName, component]) => (
          <div key={componentName} className="relative group">
            {/* Component Header with floating badge style */}
            <div className="absolute -top-2.5 left-3 px-2 bg-panel z-10 flex items-center gap-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-primary/20 border border-primary/30 px-2 py-0.5 rounded shadow-sm shadow-black/50">
                {componentName}
              </span>
            </div>

            <div className="border border-subtle rounded-xl bg-white/5 p-4 pt-5 transition-all hover:border-white/10 hover:bg-white/[0.07]">
              <div className="space-y-3">
                {Object.entries(component as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold ml-1 opacity-90">{key}</label>
                    <div className="bg-black/40 rounded-lg p-1 border border-white/5 focus-within:border-primary/50 transition-colors">
                      {renderValue(componentName, key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {/* Add Component Button Placeholder */}
        <button className="w-full py-2 rounded-xl border border-dashed border-subtle text-text-tertiary text-xs hover:border-text-secondary hover:text-text-secondary transition-all flex items-center justify-center gap-2 group">
          <PlusIcon size={14} className="group-hover:scale-110 transition-transform" />
          <span>Add Component</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-panel border-t border-subtle flex items-center justify-between">
        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          {Object.keys(entity.components || {}).length} components
        </span>
        {hasChanges && (
          <button
            onClick={handleApplyChanges}
            className="px-4 py-1.5 text-xs font-medium text-white bg-primary rounded-full hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            Apply Changes
          </button>
        )}
      </div>
    </div>
  );
}
