import { useState, useEffect } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { ChevronRightIcon, TrashIcon, CopyIcon } from './Icons';

interface InspectorProps {
  gameSpec: GameSpec | null;
  selectedEntity: string | null;
  onUpdateEntity: (entityName: string, updates: any) => void;
  onDeleteEntity?: (entityName: string) => void;
  onDuplicateEntity?: (entityName: string) => void;
}

export default function Inspector({
  gameSpec,
  selectedEntity,
  onUpdateEntity,
  onDeleteEntity,
  onDuplicateEntity,
}: InspectorProps) {
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  const entity = gameSpec?.entities?.find((e) => e.name === selectedEntity);

  // Reset edited values when entity changes
  useEffect(() => {
    setEditedValues({});
  }, [selectedEntity]);

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

  const handleValueChange = (componentName: string, key: string, value: any) => {
    const editKey = `${componentName}.${key}`;
    setEditedValues((prev) => ({
      ...prev,
      [editKey]: value,
    }));
  };

  const handleApplyChanges = () => {
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
  };

  const renderValue = (componentName: string, key: string, value: any) => {
    const editKey = `${componentName}.${key}`;
    const currentValue = editedValues[editKey] !== undefined ? editedValues[editKey] : value;
    const isEdited = editedValues[editKey] !== undefined;

    if (typeof value === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={currentValue}
          onChange={(e) => handleValueChange(componentName, key, e.target.checked)}
          className="rounded border-gray-300"
        />
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={currentValue}
          onChange={(e) => handleValueChange(componentName, key, parseFloat(e.target.value) || 0)}
          className={`
            w-full px-2 py-1 text-sm border rounded
            ${isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
          step={key.includes('scale') || key.includes('rotation') ? 0.1 : 1}
        />
      );
    }

    if (typeof value === 'string') {
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
        {entity.tags && entity.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {entity.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
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
              <div className="p-3 space-y-2">
                {Object.entries(component as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm text-gray-600">{key}:</label>
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
