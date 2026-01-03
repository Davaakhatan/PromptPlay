import { useState } from 'react';
import type { Entity3DComponents, MeshComponent, LightComponent } from '@promptplay/shared-types';

interface Entity3DSpec {
  name: string;
  components: Entity3DComponents;
  tags?: string[];
}

interface Inspector3DProps {
  entity: Entity3DSpec | null;
  onUpdateEntity: (name: string, updates: Partial<Entity3DSpec>) => void;
}

// Collapsible section component
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-subtle">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-medium text-white">{title}</span>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// Number input component
function NumberInput({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-secondary w-8">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="flex-1 bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// Vector3 input component
function Vector3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary">{label}</label>
      <div className="flex gap-1">
        <div className="flex-1 flex items-center gap-1">
          <span className="text-xs text-red-400 w-3">X</span>
          <input
            type="number"
            value={value.x}
            onChange={(e) => onChange({ ...value, x: parseFloat(e.target.value) || 0 })}
            step={step}
            className="w-full bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-xs text-green-400 w-3">Y</span>
          <input
            type="number"
            value={value.y}
            onChange={(e) => onChange({ ...value, y: parseFloat(e.target.value) || 0 })}
            step={step}
            className="w-full bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-xs text-blue-400 w-3">Z</span>
          <input
            type="number"
            value={value.z}
            onChange={(e) => onChange({ ...value, z: parseFloat(e.target.value) || 0 })}
            step={step}
            className="w-full bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// Color input component
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-secondary flex-1">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 rounded cursor-pointer border border-subtle"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// Select input component
function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-secondary flex-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-subtle rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Inspector3D({ entity, onUpdateEntity }: Inspector3DProps) {
  if (!entity) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
        No entity selected
      </div>
    );
  }

  const { components } = entity;
  const transform = components.transform3d;
  const mesh = components.mesh;
  const material = components.material;
  const light = components.light;

  // Update helper
  const updateComponent = <K extends keyof Entity3DComponents>(
    componentName: K,
    updates: Partial<Entity3DComponents[K]>
  ) => {
    onUpdateEntity(entity.name, {
      components: {
        ...components,
        [componentName]: {
          ...components[componentName],
          ...updates,
        },
      },
    });
  };

  return (
    <div className="h-full overflow-auto">
      {/* Entity Header */}
      <div className="px-3 py-2 border-b border-subtle">
        <input
          type="text"
          value={entity.name}
          onChange={(e) => onUpdateEntity(entity.name, { name: e.target.value })}
          className="w-full bg-transparent text-sm font-medium text-white focus:outline-none"
        />
        <div className="flex gap-1 mt-1">
          {entity.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-text-tertiary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Transform3D */}
      {transform && (
        <Section title="Transform">
          <Vector3Input
            label="Position"
            value={{ x: transform.x, y: transform.y, z: transform.z }}
            onChange={(v) => updateComponent('transform3d', { x: v.x, y: v.y, z: v.z })}
          />
          <Vector3Input
            label="Rotation"
            value={{
              x: (transform.rotationX ?? 0) * (180 / Math.PI),
              y: (transform.rotationY ?? 0) * (180 / Math.PI),
              z: (transform.rotationZ ?? 0) * (180 / Math.PI),
            }}
            onChange={(v) =>
              updateComponent('transform3d', {
                rotationX: v.x * (Math.PI / 180),
                rotationY: v.y * (Math.PI / 180),
                rotationZ: v.z * (Math.PI / 180),
              })
            }
            step={1}
          />
          <Vector3Input
            label="Scale"
            value={{
              x: transform.scaleX ?? 1,
              y: transform.scaleY ?? 1,
              z: transform.scaleZ ?? 1,
            }}
            onChange={(v) =>
              updateComponent('transform3d', { scaleX: v.x, scaleY: v.y, scaleZ: v.z })
            }
            step={0.1}
          />
        </Section>
      )}

      {/* Mesh */}
      {mesh && (
        <Section title="Mesh">
          <SelectInput
            label="Geometry"
            value={mesh.geometry}
            options={[
              { value: 'box', label: 'Box' },
              { value: 'sphere', label: 'Sphere' },
              { value: 'plane', label: 'Plane' },
              { value: 'cylinder', label: 'Cylinder' },
              { value: 'cone', label: 'Cone' },
              { value: 'torus', label: 'Torus' },
            ]}
            onChange={(v) => updateComponent('mesh', { geometry: v as MeshComponent['geometry'] })}
          />

          {(mesh.geometry === 'box' || mesh.geometry === 'plane') && (
            <>
              <NumberInput
                label="Width"
                value={mesh.width ?? 1}
                onChange={(v) => updateComponent('mesh', { width: v })}
              />
              <NumberInput
                label="Height"
                value={mesh.height ?? 1}
                onChange={(v) => updateComponent('mesh', { height: v })}
              />
              {mesh.geometry === 'box' && (
                <NumberInput
                  label="Depth"
                  value={mesh.depth ?? 1}
                  onChange={(v) => updateComponent('mesh', { depth: v })}
                />
              )}
            </>
          )}

          {(mesh.geometry === 'sphere' ||
            mesh.geometry === 'cylinder' ||
            mesh.geometry === 'cone' ||
            mesh.geometry === 'torus') && (
            <NumberInput
              label="Radius"
              value={mesh.radius ?? 0.5}
              onChange={(v) => updateComponent('mesh', { radius: v })}
            />
          )}

          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={mesh.castShadow ?? true}
                onChange={(e) => updateComponent('mesh', { castShadow: e.target.checked })}
                className="rounded border-subtle"
              />
              Cast Shadow
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={mesh.receiveShadow ?? true}
                onChange={(e) => updateComponent('mesh', { receiveShadow: e.target.checked })}
                className="rounded border-subtle"
              />
              Receive Shadow
            </label>
          </div>
        </Section>
      )}

      {/* Material */}
      {material && (
        <Section title="Material">
          <ColorInput
            label="Color"
            value={material.color ?? '#3498db'}
            onChange={(v) => updateComponent('material', { color: v })}
          />
          <NumberInput
            label="Metallic"
            value={material.metallic ?? 0}
            onChange={(v) => updateComponent('material', { metallic: v })}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberInput
            label="Roughness"
            value={material.roughness ?? 0.5}
            onChange={(v) => updateComponent('material', { roughness: v })}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberInput
            label="Opacity"
            value={material.opacity ?? 1}
            onChange={(v) => updateComponent('material', { opacity: v })}
            min={0}
            max={1}
            step={0.1}
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary mt-2">
            <input
              type="checkbox"
              checked={material.wireframe ?? false}
              onChange={(e) => updateComponent('material', { wireframe: e.target.checked })}
              className="rounded border-subtle"
            />
            Wireframe
          </label>
        </Section>
      )}

      {/* Light */}
      {light && (
        <Section title="Light">
          <SelectInput
            label="Type"
            value={light.type}
            options={[
              { value: 'ambient', label: 'Ambient' },
              { value: 'directional', label: 'Directional' },
              { value: 'point', label: 'Point' },
              { value: 'spot', label: 'Spot' },
              { value: 'hemisphere', label: 'Hemisphere' },
            ]}
            onChange={(v) => updateComponent('light', { type: v as LightComponent['type'] })}
          />
          <ColorInput
            label="Color"
            value={light.color ?? '#ffffff'}
            onChange={(v) => updateComponent('light', { color: v })}
          />
          <NumberInput
            label="Intensity"
            value={light.intensity ?? 1}
            onChange={(v) => updateComponent('light', { intensity: v })}
            min={0}
            step={0.1}
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary mt-2">
            <input
              type="checkbox"
              checked={light.castShadow ?? false}
              onChange={(e) => updateComponent('light', { castShadow: e.target.checked })}
              className="rounded border-subtle"
            />
            Cast Shadow
          </label>
        </Section>
      )}

      {/* Add Component Button */}
      <div className="p-3">
        <button className="w-full py-2 text-xs text-text-secondary hover:text-white border border-dashed border-subtle hover:border-primary rounded transition-colors">
          + Add Component
        </button>
      </div>
    </div>
  );
}

export default Inspector3D;
