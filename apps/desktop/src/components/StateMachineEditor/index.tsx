// State Machine Editor - Visual FSM editor

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { StateMachine, State, Transition, Parameter, ParameterType } from '../../types/StateMachine';
import { STATE_COLORS, PARAMETER_COLORS, OPERATOR_LABELS } from '../../types/StateMachine';
import { createDefaultStateMachine, STATE_MACHINE_PRESETS, validateStateMachine } from '../../services/StateMachineLibrary';
import StateMachineCanvas from './StateMachineCanvas';

interface StateMachineEditorProps {
  machine?: StateMachine | null;
  onMachineChange?: (machine: StateMachine) => void;
  onClose?: () => void;
  onSave?: () => void;
}

export default function StateMachineEditor({
  machine: initialMachine,
  onMachineChange,
  onClose,
  onSave
}: StateMachineEditorProps) {
  const [machine, setMachine] = useState<StateMachine>(initialMachine || createDefaultStateMachine());
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'states' | 'parameters'>('states');
  const presetMenuRef = useRef<HTMLDivElement>(null);

  // Validate on machine change
  useEffect(() => {
    setValidationErrors(validateStateMachine(machine));
  }, [machine]);

  // Close preset menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleMachineChange = useCallback((newMachine: StateMachine) => {
    setMachine(newMachine);
    onMachineChange?.(newMachine);
  }, [onMachineChange]);

  const handleSave = useCallback(() => {
    onSave?.();
    showNotification('State machine saved');
  }, [onSave, showNotification]);

  // Add a new state
  const addState = useCallback(() => {
    const newState: State = {
      id: `state_${Date.now()}`,
      name: `State ${machine.states.length + 1}`,
      position: {
        x: machine.viewport.x + 300,
        y: machine.viewport.y + 200,
      },
      color: STATE_COLORS.default,
    };

    handleMachineChange({
      ...machine,
      states: [...machine.states, newState],
    });
    showNotification(`Added state: ${newState.name}`);
  }, [machine, handleMachineChange, showNotification]);

  // Add a new parameter
  const addParameter = useCallback((type: ParameterType) => {
    const newParam: Parameter = {
      id: `param_${Date.now()}`,
      name: `param${machine.parameters.length + 1}`,
      type,
      defaultValue: type === 'bool' || type === 'trigger' ? false : 0,
    };

    handleMachineChange({
      ...machine,
      parameters: [...machine.parameters, newParam],
    });
    showNotification(`Added ${type} parameter`);
  }, [machine, handleMachineChange, showNotification]);

  // Delete selected state
  const deleteSelectedState = useCallback(() => {
    if (!selectedStateId) return;

    handleMachineChange({
      ...machine,
      states: machine.states.filter(s => s.id !== selectedStateId),
      transitions: machine.transitions.filter(
        t => t.fromStateId !== selectedStateId && t.toStateId !== selectedStateId
      ),
    });
    setSelectedStateId(null);
    showNotification('State deleted');
  }, [selectedStateId, machine, handleMachineChange, showNotification]);

  // Load a preset
  const loadPreset = useCallback((presetKey: string) => {
    const presetFn = STATE_MACHINE_PRESETS[presetKey];
    if (presetFn) {
      handleMachineChange(presetFn());
      showNotification(`Loaded: ${presetKey}`);
    }
    setShowPresetMenu(false);
  }, [handleMachineChange, showNotification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStateId && e.target === document.body) {
        e.preventDefault();
        deleteSelectedState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, selectedStateId, deleteSelectedState]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2a2a3e] border border-[#3f3f5a] rounded-lg shadow-lg text-sm text-white animate-fade-in">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a28] border-b border-[#3f3f5a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            State Machine Editor
          </span>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#3f3f5a] rounded">
            {machine.states.length} states • {machine.transitions.length} transitions
          </span>
          {validationErrors.length > 0 && (
            <span className="text-xs text-red-400 px-2 py-0.5 bg-red-500/20 rounded">
              {validationErrors.length} issues
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add State Button */}
          <button
            onClick={addState}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add State
          </button>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Presets Button */}
          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Presets
            </button>

            {showPresetMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a28] border border-[#3f3f5a] rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => loadPreset('playerMovement')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3"
                >
                  <span className="text-lg">🏃</span>
                  <div>
                    <div className="font-medium">Player Movement</div>
                    <div className="text-xs text-gray-500">Idle, Walk, Run, Jump, Fall</div>
                  </div>
                </button>
                <button
                  onClick={() => loadPreset('enemyAI')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3"
                >
                  <span className="text-lg">👾</span>
                  <div>
                    <div className="font-medium">Enemy AI</div>
                    <div className="text-xs text-gray-500">Patrol, Chase, Attack, Retreat</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          <div className="w-px h-5 bg-[#3f3f5a] mx-1" />

          <input
            type="text"
            value={machine.name}
            onChange={(e) => handleMachineChange({ ...machine, name: e.target.value })}
            className="px-3 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-green-500 w-40"
          />

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <StateMachineCanvas
            machine={machine}
            onMachineChange={handleMachineChange}
            onStateSelect={setSelectedStateId}
            onTransitionSelect={setSelectedTransitionId}
            selectedStateId={selectedStateId}
            selectedTransitionId={selectedTransitionId}
          />
        </div>

        {/* Side Panel */}
        <div className="w-72 bg-[#1a1a28] border-l border-[#3f3f5a] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[#3f3f5a]">
            <button
              onClick={() => setActiveTab('states')}
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === 'states'
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              States
            </button>
            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === 'parameters'
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Parameters
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'states' ? (
              <StateInspector
                machine={machine}
                selectedStateId={selectedStateId}
                selectedTransitionId={selectedTransitionId}
                onMachineChange={handleMachineChange}
              />
            ) : (
              <ParametersPanel
                machine={machine}
                onMachineChange={handleMachineChange}
                onAddParameter={addParameter}
              />
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 border-t border-[#3f3f5a] bg-red-500/10 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-red-400 mb-2">Issues:</div>
              {validationErrors.map((error, i) => (
                <div key={i} className="text-xs text-red-300/70 mb-1">• {error}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// State inspector component
function StateInspector({
  machine,
  selectedStateId,
  selectedTransitionId,
  onMachineChange
}: {
  machine: StateMachine;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  onMachineChange: (machine: StateMachine) => void;
}) {
  const state = selectedStateId ? machine.states.find(s => s.id === selectedStateId) : null;
  const transition = selectedTransitionId ? machine.transitions.find(t => t.id === selectedTransitionId) : null;

  if (transition) {
    return <TransitionInspector machine={machine} transition={transition} onMachineChange={onMachineChange} />;
  }

  if (!state) {
    return (
      <div className="text-center text-gray-500 text-sm py-8">
        Select a state or transition to edit
      </div>
    );
  }

  const updateState = (updates: Partial<State>) => {
    onMachineChange({
      ...machine,
      states: machine.states.map(s => s.id === state.id ? { ...s, ...updates } : s),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">State Name</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => updateState({ name: e.target.value })}
          className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-green-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={state.isInitial || false}
          onChange={(e) => {
            // Clear other initial states
            const updatedStates = machine.states.map(s => ({
              ...s,
              isInitial: s.id === state.id ? e.target.checked : false,
            }));
            onMachineChange({ ...machine, states: updatedStates });
          }}
          className="w-4 h-4 rounded bg-[#2a2a3e] border-[#3f3f5a] text-green-500"
        />
        <span className="text-sm text-gray-300">Initial State</span>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Color</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATE_COLORS).map(([name, color]) => (
            <button
              key={name}
              onClick={() => updateState({ color })}
              className={`w-6 h-6 rounded border-2 ${state.color === color ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              title={name}
            />
          ))}
        </div>
      </div>

      {/* Outgoing transitions */}
      <div className="pt-4 border-t border-[#3f3f5a]">
        <div className="text-xs text-gray-500 mb-2">Outgoing Transitions</div>
        {machine.transitions.filter(t => t.fromStateId === state.id).map(t => {
          const toState = machine.states.find(s => s.id === t.toStateId);
          return (
            <div key={t.id} className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              <span className="text-gray-500">→</span>
              <span>{toState?.name || 'Unknown'}</span>
              <span className="text-gray-600">({t.conditions.length} conditions)</span>
            </div>
          );
        })}
        {machine.transitions.filter(t => t.fromStateId === state.id).length === 0 && (
          <div className="text-xs text-gray-600">No outgoing transitions</div>
        )}
      </div>
    </div>
  );
}

// Transition inspector component
function TransitionInspector({
  machine,
  transition,
  onMachineChange
}: {
  machine: StateMachine;
  transition: Transition;
  onMachineChange: (machine: StateMachine) => void;
}) {
  const fromState = machine.states.find(s => s.id === transition.fromStateId);
  const toState = machine.states.find(s => s.id === transition.toStateId);

  const updateTransition = (updates: Partial<Transition>) => {
    onMachineChange({
      ...machine,
      transitions: machine.transitions.map(t => t.id === transition.id ? { ...t, ...updates } : t),
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 font-medium">
        {fromState?.name} → {toState?.name}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Condition Mode</label>
        <select
          value={transition.conditionMode}
          onChange={(e) => updateTransition({ conditionMode: e.target.value as 'all' | 'any' })}
          className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="all">All conditions (AND)</option>
          <option value="any">Any condition (OR)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Priority</label>
        <input
          type="number"
          value={transition.priority}
          onChange={(e) => updateTransition({ priority: parseInt(e.target.value) || 0 })}
          className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-sm text-white focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Conditions list */}
      <div className="pt-4 border-t border-[#3f3f5a]">
        <div className="text-xs text-gray-500 mb-2">Conditions</div>
        {transition.conditions.map((cond, i) => (
          <div key={cond.id} className="mb-2 p-2 bg-[#0f0f1a] rounded text-xs">
            <div className="text-gray-300">
              {cond.parameter} {OPERATOR_LABELS[cond.operator]} {String(cond.value)}
            </div>
          </div>
        ))}
        {transition.conditions.length === 0 && (
          <div className="text-xs text-gray-600">No conditions (always transitions)</div>
        )}
      </div>
    </div>
  );
}

// Parameters panel
function ParametersPanel({
  machine,
  onMachineChange,
  onAddParameter
}: {
  machine: StateMachine;
  onMachineChange: (machine: StateMachine) => void;
  onAddParameter: (type: ParameterType) => void;
}) {
  const updateParameter = (paramId: string, updates: Partial<Parameter>) => {
    onMachineChange({
      ...machine,
      parameters: machine.parameters.map(p => p.id === paramId ? { ...p, ...updates } : p),
    });
  };

  const deleteParameter = (paramId: string) => {
    onMachineChange({
      ...machine,
      parameters: machine.parameters.filter(p => p.id !== paramId),
    });
  };

  return (
    <div className="space-y-4">
      {/* Add parameter buttons */}
      <div className="flex flex-wrap gap-2">
        {(['float', 'int', 'bool', 'trigger'] as ParameterType[]).map(type => (
          <button
            key={type}
            onClick={() => onAddParameter(type)}
            className="px-2 py-1 text-xs rounded border"
            style={{
              borderColor: PARAMETER_COLORS[type],
              color: PARAMETER_COLORS[type],
            }}
          >
            + {type}
          </button>
        ))}
      </div>

      {/* Parameter list */}
      <div className="space-y-2">
        {machine.parameters.map(param => (
          <div key={param.id} className="p-2 bg-[#0f0f1a] rounded">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PARAMETER_COLORS[param.type] }}
              />
              <input
                type="text"
                value={param.name}
                onChange={(e) => updateParameter(param.id, { name: e.target.value })}
                className="flex-1 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-[#3f3f5a] focus:border-green-500 text-sm text-white focus:outline-none"
              />
              <button
                onClick={() => deleteParameter(param.id)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{param.type}</span>
              <span>= {String(param.defaultValue)}</span>
            </div>
          </div>
        ))}

        {machine.parameters.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No parameters defined
          </div>
        )}
      </div>
    </div>
  );
}

export { createDefaultStateMachine };
export type { StateMachineEditorProps };
