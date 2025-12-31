import type { GameSpec } from '@promptplay/shared-types';

interface DiffPreviewProps {
  currentSpec: GameSpec;
  pendingSpec: GameSpec;
}

interface EntityDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  name: string;
  changes?: PropertyChange[];
}

interface PropertyChange {
  path: string;
  oldValue: any;
  newValue: any;
}

function getEntityDiffs(current: GameSpec, pending: GameSpec): EntityDiff[] {
  const diffs: EntityDiff[] = [];
  const currentNames = new Set(current.entities.map(e => e.name));
  const pendingNames = new Set(pending.entities.map(e => e.name));

  // Find added entities
  for (const entity of pending.entities) {
    if (!currentNames.has(entity.name)) {
      diffs.push({ type: 'added', name: entity.name });
    }
  }

  // Find removed entities
  for (const entity of current.entities) {
    if (!pendingNames.has(entity.name)) {
      diffs.push({ type: 'removed', name: entity.name });
    }
  }

  // Find modified entities
  for (const currentEntity of current.entities) {
    if (pendingNames.has(currentEntity.name)) {
      const pendingEntity = pending.entities.find(e => e.name === currentEntity.name);
      if (pendingEntity) {
        const changes = getPropertyChanges(currentEntity, pendingEntity, '');
        if (changes.length > 0) {
          diffs.push({ type: 'modified', name: currentEntity.name, changes });
        }
      }
    }
  }

  return diffs;
}

function getPropertyChanges(current: any, pending: any, path: string): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Handle primitives
  if (typeof current !== 'object' || current === null) {
    if (current !== pending) {
      changes.push({ path, oldValue: current, newValue: pending });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(current)) {
    if (JSON.stringify(current) !== JSON.stringify(pending)) {
      changes.push({ path, oldValue: current, newValue: pending });
    }
    return changes;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(current), ...Object.keys(pending || {})]);
  for (const key of allKeys) {
    if (key === 'name') continue; // Skip name comparison
    const newPath = path ? `${path}.${key}` : key;
    const currentVal = current[key];
    const pendingVal = pending?.[key];

    if (typeof currentVal === 'object' && currentVal !== null && !Array.isArray(currentVal)) {
      changes.push(...getPropertyChanges(currentVal, pendingVal, newPath));
    } else if (JSON.stringify(currentVal) !== JSON.stringify(pendingVal)) {
      changes.push({ path: newPath, oldValue: currentVal, newValue: pendingVal });
    }
  }

  return changes;
}

function formatValue(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'number') {
    // Format numbers nicely
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatPath(path: string): string {
  // Clean up paths like "components.transform.x" to "transform.x"
  return path.replace('components.', '');
}

export default function DiffPreview({ currentSpec, pendingSpec }: DiffPreviewProps) {
  const entityDiffs = getEntityDiffs(currentSpec, pendingSpec);

  // Also check for config changes
  const configChanges = getPropertyChanges(currentSpec.config, pendingSpec.config, 'config');

  if (entityDiffs.length === 0 && configChanges.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-2">
        No changes detected
      </div>
    );
  }

  return (
    <div className="text-sm space-y-2 max-h-[200px] overflow-y-auto">
      {/* Config changes */}
      {configChanges.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <div className="font-medium text-yellow-800 mb-1">Config Changes</div>
          {configChanges.map((change, i) => (
            <div key={i} className="text-xs text-yellow-700 flex items-center gap-1">
              <span className="text-yellow-600">{formatPath(change.path)}:</span>
              <span className="line-through text-red-500">{formatValue(change.oldValue)}</span>
              <span className="text-gray-400">-&gt;</span>
              <span className="text-green-600">{formatValue(change.newValue)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Entity changes */}
      {entityDiffs.map((diff, i) => (
        <div
          key={i}
          className={`rounded p-2 border ${
            diff.type === 'added'
              ? 'bg-green-50 border-green-200'
              : diff.type === 'removed'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                diff.type === 'added'
                  ? 'bg-green-200 text-green-800'
                  : diff.type === 'removed'
                  ? 'bg-red-200 text-red-800'
                  : 'bg-yellow-200 text-yellow-800'
              }`}
            >
              {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : '~'}
            </span>
            <span className="font-medium text-gray-800">{diff.name}</span>
            <span
              className={`text-xs ${
                diff.type === 'added'
                  ? 'text-green-600'
                  : diff.type === 'removed'
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}
            >
              {diff.type === 'added' ? 'New entity' : diff.type === 'removed' ? 'Removed' : 'Modified'}
            </span>
          </div>

          {/* Show property changes for modified entities */}
          {diff.changes && diff.changes.length > 0 && (
            <div className="mt-1 pl-6 space-y-0.5">
              {diff.changes.slice(0, 5).map((change, j) => (
                <div key={j} className="text-xs text-gray-600 flex items-center gap-1">
                  <span className="text-yellow-700">{formatPath(change.path)}:</span>
                  <span className="text-red-500 line-through">{formatValue(change.oldValue)}</span>
                  <span className="text-gray-400">-&gt;</span>
                  <span className="text-green-600">{formatValue(change.newValue)}</span>
                </div>
              ))}
              {diff.changes.length > 5 && (
                <div className="text-xs text-gray-400 italic">
                  +{diff.changes.length - 5} more changes
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
