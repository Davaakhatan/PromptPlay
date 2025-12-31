import { NewProjectIcon, AIIcon } from './Icons';

// Project template definition
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Classic side-scrolling platformer with player, platforms, and collectibles',
    icon: '🎮',
    color: 'bg-blue-500',
  },
  {
    id: 'shooter',
    name: 'Top-Down Shooter',
    description: 'Top-down action game with enemies and projectiles',
    icon: '🔫',
    color: 'bg-red-500',
  },
  {
    id: 'puzzle',
    name: 'Puzzle Game',
    description: 'Grid-based puzzle with movable blocks and goals',
    icon: '🧩',
    color: 'bg-purple-500',
  },
  {
    id: 'empty',
    name: 'Empty Project',
    description: 'Start from scratch with just a player entity',
    icon: '📝',
    color: 'bg-gray-500',
  },
];

interface WelcomeScreenProps {
  onOpenProject: () => void;
  onNewProject: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  loading?: boolean;
}

export function WelcomeScreen({ onOpenProject, onNewProject, onCreateFromTemplate, loading }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <AIIcon size={28} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">PromptPlay</h1>
          </div>
          <p className="text-lg text-gray-600">AI-First 2D Game Engine for Desktop</p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={onOpenProject}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-lg shadow-blue-200 transition-all hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            {loading ? 'Loading...' : 'Open Project'}
          </button>
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium border border-gray-200 shadow transition-all hover:shadow-md"
          >
            <NewProjectIcon size={20} />
            New Project
          </button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="flex justify-center gap-4 mb-12 text-sm text-gray-500 flex-wrap">
          <span><kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+O</kbd> Open</span>
          <span><kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+N</kbd> New</span>
          <span><kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+S</kbd> Save</span>
          <span><kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+E</kbd> Export</span>
        </div>

        {/* Templates Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Start from a Template</h2>
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onCreateFromTemplate(template.id)}
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400">
          <p>Version 0.1.0 | Select a folder containing game.json or start fresh</p>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
