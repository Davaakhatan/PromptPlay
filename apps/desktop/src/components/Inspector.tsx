import { useState, useEffect, useCallback, memo } from 'react';
import type { GameSpec, AnimationComponent } from '@promptplay/shared-types';
import { TrashIcon, CopyIcon, PlusIcon, TagIcon, EditIcon } from './Icons';
import { componentRegistry } from '../services/ComponentRegistry';
import AnimationEditor from './AnimationEditor';

interface InspectorProps {
  gameSpec: GameSpec | null;
  selectedEntities: Set<string>;
  onUpdateEntity: (entityName: string, updates: any) => void;
  onDeleteEntity?: (entityName: string) => void;
  onDuplicateEntity?: (entityName: string) => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  projectPath?: string | null;
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

function Inspector({
  gameSpec,
  selectedEntities,
  onUpdateEntity,
  onDeleteEntity,
  onDuplicateEntity,
  onDeleteSelected,
  onDuplicateSelected,
  projectPath,
}: InspectorProps) {
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showAnimationEditor, setShowAnimationEditor] = useState(false);

  // Get primary selected entity (first in set)
  const selectedEntity = selectedEntities.size > 0 ? Array.from(selectedEntities)[0] : null;
  const entity = gameSpec?.entities?.find((e) => e.name === selectedEntity);
  const isMultiSelect = selectedEntities.size > 1;

  // Get available components that aren't already on this entity
  const availableComponents = componentRegistry.getAll().filter(
    (schema) => !entity?.components || !(schema.name in entity.components)
  );

  // Reset edited values when entity changes
  useEffect(() => {
    setEditedValues({});
    setShowAddTag(false);
    setShowAddComponent(false);
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

  const handleAddComponent = useCallback((componentName: string) => {
    if (!entity) return;

    const schema = componentRegistry.get(componentName);
    if (!schema) return;

    // Build default component data from schema
    const newComponentData: Record<string, any> = {};
    Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.defaultValue !== undefined) {
        newComponentData[fieldName] = fieldSchema.defaultValue;
      } else {
        // Set sensible defaults based on type
        switch (fieldSchema.type) {
          case 'number':
            newComponentData[fieldName] = 0;
            break;
          case 'boolean':
            newComponentData[fieldName] = false;
            break;
          case 'string':
            newComponentData[fieldName] = '';
            break;
          case 'color':
            newComponentData[fieldName] = 0xFFFFFF;
            break;
          case 'select':
            newComponentData[fieldName] = fieldSchema.options?.[0]?.value || '';
            break;
          default:
            newComponentData[fieldName] = null;
        }
      }
    });

    const updatedComponents = {
      ...entity.components,
      [componentName]: newComponentData,
    };

    onUpdateEntity(entity.name, { components: updatedComponents });
    setShowAddComponent(false);
  }, [entity, onUpdateEntity]);

  const handleRemoveComponent = useCallback((componentName: string) => {
    if (!entity) return;

    const updatedComponents = { ...entity.components } as Record<string, any>;
    delete updatedComponents[componentName];

    onUpdateEntity(entity.name, { components: updatedComponents });
  }, [entity, onUpdateEntity]);

  const handleAnimationChange = useCallback((animation: AnimationComponent) => {
    if (!entity) return;

    onUpdateEntity(entity.name, {
      components: {
        ...entity.components,
        animation,
      },
    });
  }, [entity, onUpdateEntity]);

  if (!gameSpec) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-tertiary text-sm p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-subtle/30 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-medium text-text-secondary mb-1">No game loaded</p>
        <p className="text-xs opacity-70">Create or open a project to get started</p>
      </div>
    );
  }

  if (!selectedEntity || !entity) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-tertiary text-sm p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary opacity-60">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="font-medium text-text-secondary mb-1">No entity selected</p>
        <p className="text-xs opacity-70 max-w-[180px]">
          Click an entity in the Scene Tree or Game Canvas to inspect its properties
        </p>
        <div className="mt-4 flex items-center gap-2 text-[10px] text-text-tertiary">
          <kbd className="px-1.5 py-0.5 bg-subtle rounded text-[10px]">Ctrl</kbd>
          <span>+ click for multi-select</span>
        </div>
      </div>
    );
  }

  // Multi-selection view
  if (isMultiSelect) {
    const selectedArray = Array.from(selectedEntities);
    const selectedEntitiesData = selectedArray
      .map(name => gameSpec?.entities?.find(e => e.name === name))
      .filter(Boolean);

    return (
      <div className="h-full flex flex-col bg-panel">
        {/* Header */}
        <div className="px-4 py-3 bg-subtle border-b border-subtle">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              {selectedEntities.size} Entities Selected
            </h3>
            <div className="flex items-center gap-1">
              {onDuplicateSelected && (
                <button
                  onClick={onDuplicateSelected}
                  className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                  title="Duplicate All"
                >
                  <CopyIcon size={14} />
                </button>
              )}
              {onDeleteSelected && (
                <button
                  onClick={onDeleteSelected}
                  className="p-1.5 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                  title="Delete All"
                >
                  <TrashIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected entities list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {selectedEntitiesData.map((ent) => ent && (
              <div
                key={ent.name}
                className="p-3 bg-white/5 border border-subtle rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{ent.name}</span>
                  <div className="flex items-center gap-1">
                    {ent.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
                        {tag}
                      </span>
                    ))}
                    {(ent.tags?.length || 0) > 2 && (
                      <span className="text-[10px] text-text-tertiary">+{ent.tags!.length - 2}</span>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs text-text-tertiary">
                  {Object.keys(ent.components || {}).length} components
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-panel border-t border-subtle">
          <p className="text-[10px] text-text-tertiary text-center">
            Ctrl+Click to toggle selection • Shift+Click for range
          </p>
        </div>
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
            <div className="absolute -top-2.5 left-3 right-3 px-2 bg-panel z-10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-primary/20 border border-primary/30 px-2 py-0.5 rounded shadow-sm shadow-black/50">
                {componentName}
              </span>
              <div className="flex items-center gap-1">
                {componentName === 'animation' && (
                  <button
                    onClick={() => setShowAnimationEditor(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/20 text-text-tertiary hover:text-primary transition-all flex items-center gap-1"
                    title="Edit Animation"
                  >
                    <EditIcon size={12} />
                    <span className="text-[10px]">Edit</span>
                  </button>
                )}
                <button
                  onClick={() => handleRemoveComponent(componentName)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-all"
                  title={`Remove ${componentName}`}
                >
                  <TrashIcon size={12} />
                </button>
              </div>
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

        {/* Add Component Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddComponent(!showAddComponent)}
            disabled={availableComponents.length === 0}
            className={`
              w-full py-2 rounded-xl border border-dashed text-xs transition-all flex items-center justify-center gap-2 group
              ${availableComponents.length === 0
                ? 'border-subtle/50 text-text-tertiary/50 cursor-not-allowed'
                : 'border-subtle text-text-tertiary hover:border-text-secondary hover:text-text-secondary'
              }
            `}
          >
            <PlusIcon size={14} className="group-hover:scale-110 transition-transform" />
            <span>{availableComponents.length === 0 ? 'All Components Added' : 'Add Component'}</span>
          </button>

          {showAddComponent && availableComponents.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-panel border border-subtle rounded-xl shadow-xl z-20 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {availableComponents.map((schema) => (
                  <button
                    key={schema.name}
                    onClick={() => handleAddComponent(schema.name)}
                    className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors border-b border-subtle/50 last:border-0"
                  >
                    <div className="text-sm font-medium text-text-primary capitalize">{schema.name}</div>
                    {schema.description && (
                      <div className="text-xs text-text-tertiary mt-0.5">{schema.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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

      {/* Animation Editor Modal */}
      {showAnimationEditor && entity.components?.animation && (
        <AnimationEditor
          entity={entity}
          animation={entity.components.animation as AnimationComponent}
          onAnimationChange={handleAnimationChange}
          onClose={() => setShowAnimationEditor(false)}
          projectPath={projectPath || null}
        />
      )}
    </div>
  );
}

export default memo(Inspector);
