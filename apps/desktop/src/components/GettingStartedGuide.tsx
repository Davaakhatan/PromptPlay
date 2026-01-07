/**
 * Getting Started Guide
 * Interactive onboarding tutorial for new users
 */

import { useState, useEffect } from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: string;
  highlight?: string;
}

const GUIDE_STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to PromptPlay!',
    description: 'PromptPlay is a visual game engine that lets you create 2D and 3D games without writing code. Let\'s take a quick tour of the main features.',
    icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: 'Click "New Project" to start fresh, or choose from our templates for platformers, top-down games, puzzles, and more.',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    action: 'new-project',
  },
  {
    id: 'entities',
    title: 'Add Entities',
    description: 'Entities are the building blocks of your game - players, enemies, platforms, collectibles. Use the + button in the Entities panel to create new ones.',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    highlight: 'entities-panel',
  },
  {
    id: 'inspector',
    title: 'Configure with Inspector',
    description: 'Select an entity and use the Inspector panel to modify its properties - position, size, physics, sprites, and behaviors.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    highlight: 'inspector-panel',
  },
  {
    id: 'visual-scripting',
    title: 'Visual Scripting',
    description: 'Create game logic without code! Switch to the "Nodes" view to build behavior graphs by connecting nodes together.',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    action: 'view-nodes',
  },
  {
    id: 'play-test',
    title: 'Play & Test',
    description: 'Press the Play button (or Space) to test your game instantly. Use Stop to return to editing. Your game runs right in the editor!',
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
    highlight: 'play-button',
  },
  {
    id: '3d-mode',
    title: '3D Mode',
    description: 'Toggle 3D mode to create three-dimensional games with the same visual workflow. Works with physics, lighting, and more.',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    action: 'toggle-3d',
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    description: 'Stuck? Click the AI button to get help generating entities, writing game logic, or debugging issues. Just describe what you want!',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    action: 'toggle-ai',
  },
  {
    id: 'export',
    title: 'Export Your Game',
    description: 'When you\'re ready, use Export to create standalone HTML5 games, mobile apps, or publish to our community gallery.',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    action: 'export',
  },
  {
    id: 'collaboration',
    title: 'Collaborate',
    description: 'Work together with friends! Click the collaborators icon to invite others to edit your project in real-time.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    highlight: 'collaborators-button',
  },
  {
    id: 'done',
    title: 'You\'re Ready!',
    description: 'That\'s the basics! Explore the Asset Marketplace for free sprites and sounds, check out the documentation for advanced features, and most importantly - have fun creating!',
    icon: 'M5 13l4 4L19 7',
  },
];

const STORAGE_KEY = 'promptplay-guide-completed';

interface GettingStartedGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function GettingStartedGuide({ isOpen, onClose, onAction }: GettingStartedGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Load completed state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCompletedSteps(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load guide state:', e);
      }
    }
  }, []);

  // Save completed state
  const markStepCompleted = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newCompleted]));
  };

  const handleNext = () => {
    markStepCompleted(GUIDE_STEPS[currentStep].id);
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    const step = GUIDE_STEPS[currentStep];
    if (step.action && onAction) {
      onAction(step.action);
    }
  };

  const resetGuide = () => {
    setCompletedSteps(new Set());
    setCurrentStep(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!isOpen) return null;

  const step = GUIDE_STEPS[currentStep];
  const progress = ((currentStep + 1) / GUIDE_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-panel border border-subtle rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-subtle">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">
              Step {currentStep + 1} of {GUIDE_STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-white transition-colors"
            title="Close guide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-text-primary text-center mb-4">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-text-secondary text-center leading-relaxed">
            {step.description}
          </p>

          {/* Action Button */}
          {step.action && (
            <button
              onClick={handleAction}
              className="mt-6 mx-auto block px-4 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            >
              Try it now
            </button>
          )}
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-1.5 py-4">
          {GUIDE_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-blue-500 w-6'
                  : completedSteps.has(s.id)
                  ? 'bg-green-500'
                  : 'bg-subtle hover:bg-white/20'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-subtle">
          <button
            onClick={resetGuide}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Reset guide
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                currentStep === 0
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'bg-subtle hover:bg-white/10'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              {currentStep === GUIDE_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check if user has completed the guide
export function useHasCompletedGuide(): boolean {
  const [completed, setCompleted] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setCompleted(false);
    } else {
      try {
        const steps = JSON.parse(saved);
        setCompleted(steps.length >= GUIDE_STEPS.length);
      } catch {
        setCompleted(false);
      }
    }
  }, []);

  return completed;
}

export default GettingStartedGuide;
