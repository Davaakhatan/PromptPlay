import { NewProjectIcon, AIIcon, GamepadIcon, CrosshairIcon, PuzzleIcon, FileTextIcon, RocketIcon } from './Icons';

// Project template definition
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Classic side-scrolling platformer with player, platforms, and collectibles',
    icon: <GamepadIcon className="w-8 h-8 text-primary" />,
    color: 'bg-blue-500',
  },
  {
    id: 'shooter',
    name: 'Top-Down Shooter',
    description: 'Top-down action game with enemies and projectiles',
    icon: <CrosshairIcon className="w-8 h-8 text-rose-500" />,
    color: 'bg-red-500',
  },
  {
    id: 'puzzle',
    name: 'Puzzle Game',
    description: 'Grid-based puzzle with movable blocks and goals',
    icon: <PuzzleIcon className="w-8 h-8 text-amber-500" />,
    color: 'bg-purple-500',
  },
  {
    id: 'empty',
    name: 'Empty Project',
    description: 'Start from scratch with just a player entity',
    icon: <FileTextIcon className="w-8 h-8 text-text-tertiary" />,
    color: 'bg-subtle',
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
    <div className="h-full flex flex-col items-center justify-center bg-canvas p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        <div className="mb-8 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 transform rotate-3">
            <div className="p-3 bg-primary/10 rounded-2xl mb-4 shadow-lg shadow-primary/20 ring-1 ring-primary/20">
              <RocketIcon className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PromptPlay</h1>
          <p className="text-lg text-text-secondary max-w-md mx-auto">
            Create, edit, and experiment with your games in a beautiful, focused environment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-scale-in">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onCreateFromTemplate(template.id)}
              className="group relative flex flex-col items-center p-6 bg-panel/50 backdrop-blur-sm border border-subtle rounded-2xl hover:bg-white/5 transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 text-center"
            >
              <div className={`p-3 rounded-xl bg-white/5 text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 ${template.color.replace('bg-', 'text-').replace('-500', '-400')}`}>
                {template.icon}
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-white transition-colors">
                {template.name}
              </h3>
              <p className="text-sm text-text-tertiary group-hover:text-text-secondary transition-colors line-clamp-2">
                {template.description}
              </p>
            </button>
          ))}
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-8 flex justify-center gap-4 animate-fade-in delay-100">
          <button onClick={onOpenProject} className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
            Open Existing Project
          </button>
          <span className="text-text-tertiary">•</span>
          <button onClick={onNewProject} className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2">
            <NewProjectIcon size={14} />
            Create Blank Project
          </button>
        </div>

        <div className="mt-12 text-xs text-text-tertiary/50">
          v0.1.0 • Designed for speed and focus
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
