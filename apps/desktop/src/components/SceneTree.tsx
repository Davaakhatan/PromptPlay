import { useState } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import {
  PlayerIcon,
  PlatformIcon,
  GroundIcon,
  CollectibleIcon,
  CoinIcon,
  EnemyIcon,
  EntityIcon,
  ComponentIcon,
  TransformIcon,
  SpriteIcon,
  VelocityIcon,
  ColliderIcon,
  InputIcon,
  HealthIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
} from './Icons';

interface SceneTreeProps {
  gameSpec: GameSpec | null;
  selectedEntity: string | null;
  onSelectEntity: (entityName: string) => void;
  onCreateEntity?: () => void;
}

export default function SceneTree({
  gameSpec,
  selectedEntity,
  onSelectEntity,
  onCreateEntity,
}: SceneTreeProps) {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  if (!gameSpec || !gameSpec.entities) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-600 uppercase">Scene</h3>
          {onCreateEntity && (
            <button
              onClick={onCreateEntity}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              title="Create Entity"
            >
              <PlusIcon size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <p>No entities to display</p>
        </div>
      </div>
    );
  }

  const toggleExpand = (entityName: string) => {
    const newExpanded = new Set(expandedEntities);
    if (newExpanded.has(entityName)) {
      newExpanded.delete(entityName);
    } else {
      newExpanded.add(entityName);
    }
    setExpandedEntities(newExpanded);
  };

  const getEntityIcon = (entity: any) => {
    if (entity.tags?.includes('player')) return <PlayerIcon size={14} className="text-blue-500" />;
    if (entity.tags?.includes('coin')) return <CoinIcon size={14} className="text-yellow-500" />;
    if (entity.tags?.includes('collectible')) return <CollectibleIcon size={14} className="text-yellow-500" />;
    if (entity.tags?.includes('enemy')) return <EnemyIcon size={14} className="text-red-500" />;
    if (entity.tags?.includes('ground')) return <GroundIcon size={14} className="text-amber-700" />;
    if (entity.tags?.includes('platform')) return <PlatformIcon size={14} className="text-amber-600" />;
    return <EntityIcon size={14} className="text-gray-500" />;
  };

  const getComponentIcon = (componentName: string) => {
    switch (componentName) {
      case 'transform':
        return <TransformIcon size={12} className="text-purple-500" />;
      case 'sprite':
        return <SpriteIcon size={12} className="text-green-500" />;
      case 'velocity':
        return <VelocityIcon size={12} className="text-blue-500" />;
      case 'collider':
        return <ColliderIcon size={12} className="text-orange-500" />;
      case 'input':
        return <InputIcon size={12} className="text-indigo-500" />;
      case 'health':
        return <HealthIcon size={12} className="text-red-500" />;
      default:
        return <ComponentIcon size={12} className="text-gray-400" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase">Scene</h3>
        {onCreateEntity && (
          <button
            onClick={onCreateEntity}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            title="Create Entity"
          >
            <PlusIcon size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {gameSpec.entities.map((entity) => {
          const isSelected = selectedEntity === entity.name;
          const isExpanded = expandedEntities.has(entity.name);
          const hasComponents = entity.components && Object.keys(entity.components).length > 0;

          return (
            <div key={entity.name}>
              <div
                className={`
                  flex items-center px-3 py-1.5 cursor-pointer hover:bg-gray-100
                  ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
                `}
                onClick={() => onSelectEntity(entity.name)}
              >
                {hasComponents && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(entity.name);
                    }}
                    className="mr-1 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                  </button>
                )}
                {!hasComponents && <span className="w-4 mr-1" />}
                <span className="mr-2">{getEntityIcon(entity)}</span>
                <span className={`text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                  {entity.name}
                </span>
                {entity.tags && entity.tags.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">
                    {entity.tags.join(', ')}
                  </span>
                )}
              </div>

              {isExpanded && hasComponents && (
                <div className="ml-8 text-xs">
                  {Object.keys(entity.components).map((componentName) => (
                    <div
                      key={componentName}
                      className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-gray-50"
                    >
                      {getComponentIcon(componentName)}
                      <span>{componentName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
        {gameSpec.entities.length} entities
      </div>
    </div>
  );
}
