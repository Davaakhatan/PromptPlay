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
      <div className="h-full flex flex-col bg-panel">
        <div className="px-3 py-2 bg-subtle border-b border-subtle flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Scene</h3>
          {onCreateEntity && (
            <button
              onClick={onCreateEntity}
              className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
              title="Create Entity"
            >
              <PlusIcon size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
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
    if (entity.tags?.includes('player')) return <PlayerIcon size={14} className="text-blue-400" />;
    if (entity.tags?.includes('coin')) return <CoinIcon size={14} className="text-yellow-400" />;
    if (entity.tags?.includes('collectible')) return <CollectibleIcon size={14} className="text-yellow-400" />;
    if (entity.tags?.includes('enemy')) return <EnemyIcon size={14} className="text-red-400" />;
    if (entity.tags?.includes('ground')) return <GroundIcon size={14} className="text-amber-600" />;
    if (entity.tags?.includes('platform')) return <PlatformIcon size={14} className="text-amber-500" />;
    return <EntityIcon size={14} className="text-text-tertiary" />;
  };

  const getComponentIcon = (componentName: string) => {
    switch (componentName) {
      case 'transform':
        return <TransformIcon size={12} className="text-purple-400" />;
      case 'sprite':
        return <SpriteIcon size={12} className="text-green-400" />;
      case 'velocity':
        return <VelocityIcon size={12} className="text-blue-400" />;
      case 'collider':
        return <ColliderIcon size={12} className="text-orange-400" />;
      case 'input':
        return <InputIcon size={12} className="text-indigo-400" />;
      case 'health':
        return <HealthIcon size={12} className="text-red-400" />;
      default:
        return <ComponentIcon size={12} className="text-text-tertiary" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-panel flex flex-col">
      {/* Header removed as it's now in the floating panel tab */}

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {gameSpec?.entities?.map((entity) => {
          const isSelected = selectedEntity === entity.name;
          const isExpanded = expandedEntities.has(entity.name);
          const hasComponents = entity.components && Object.keys(entity.components).length > 0;

          return (
            <div key={entity.name} className="mb-1">
              <div
                className={`
                  flex items-center px-3 py-2 cursor-pointer transition-all rounded-lg group
                  ${isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
                `}
                onClick={() => onSelectEntity(entity.name)}
              >
                {hasComponents && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(entity.name);
                    }}
                    className={`mr-1 transition-colors ${isSelected ? 'text-white/70 hover:text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                  >
                    {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                  </button>
                )}
                {!hasComponents && <span className="w-4 mr-1" />}
                <span className="mr-2 opacity-80 group-hover:opacity-100 transition-opacity">{getEntityIcon(entity)}</span>
                <span className="text-sm font-medium tracking-tight">
                  {entity.name}
                </span>
                {entity.tags && entity.tags.length > 0 && (
                  <span className={`ml-auto text-[10px] ${isSelected ? 'text-white/60' : 'text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                    {entity.tags[0]}
                  </span>
                )}
              </div>

              {isExpanded && hasComponents && (
                <div className="ml-4 pl-4 mt-1 space-y-0.5 border-l-2 border-white/5">
                  {Object.entries(entity.components).map(([componentName, _]) => (
                    <div
                      key={componentName}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary rounded-md hover:bg-white/5 hover:text-text-secondary transition-colors cursor-default"
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

      <div className="px-4 py-3 text-[10px] uppercase font-bold text-text-tertiary/50 text-center tracking-widest">
        {gameSpec?.entities?.length || 0} Entities
      </div>
    </div>
  );
}
