import { useState, useEffect } from 'react';
import { NewProjectIcon, RocketIcon, ClockIcon } from './Icons';
import { GAME_TEMPLATES, type GameTemplate } from '../services/TemplateService';
import { getRecentProjects, RecentProject, formatLastOpened, recentProjectsManager } from '../services/RecentProjectsService';

// Color mapping for templates
const COLOR_CLASSES: Record<string, { bg: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', hover: 'hover:border-blue-500/50' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', hover: 'hover:border-red-500/50' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', hover: 'hover:border-orange-500/50' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', hover: 'hover:border-purple-500/50' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', hover: 'hover:border-rose-500/50' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', hover: 'hover:border-pink-500/50' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', hover: 'hover:border-amber-500/50' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', hover: 'hover:border-cyan-500/50' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', hover: 'hover:border-slate-500/50' },
  gray: { bg: 'bg-gray-500/10', text: 'text-gray-400', hover: 'hover:border-gray-500/50' },
};

const GENRE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'platformer', label: 'Platformer' },
  { id: 'shooter', label: 'Shooter' },
  { id: 'puzzle', label: 'Puzzle' },
];

const DIFFICULTY_BADGES: Record<string, { label: string; className: string }> = {
  beginner: { label: 'Beginner', className: 'bg-green-500/20 text-green-400' },
  intermediate: { label: 'Intermediate', className: 'bg-amber-500/20 text-amber-400' },
  advanced: { label: 'Advanced', className: 'bg-red-500/20 text-red-400' },
};

interface WelcomeScreenProps {
  onOpenProject: (path?: string) => void;
  onNewProject: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  onImportPackage?: () => void;
  loading?: boolean;
}

export function WelcomeScreen({
  onOpenProject,
  onNewProject,
  onCreateFromTemplate,
  onImportPackage,
  loading: _loading,
}: WelcomeScreenProps) {
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // Load recent projects
  useEffect(() => {
    setRecentProjects(getRecentProjects());

    const unsubscribe = recentProjectsManager.subscribe(() => {
      setRecentProjects(getRecentProjects());
    });

    return unsubscribe;
  }, []);

  // Filter templates
  const filteredTemplates = GAME_TEMPLATES.filter(t => {
    if (genreFilter === 'all') return true;
    return t.genre === genreFilter;
  });

  // Show first 6 or all
  const displayedTemplates = showAll ? filteredTemplates : filteredTemplates.slice(0, 6);

  const getColorClasses = (color: string) => {
    return COLOR_CLASSES[color] || COLOR_CLASSES.gray;
  };

  return (
    <div className="h-full flex flex-col bg-canvas overflow-auto">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-12 pb-6 px-8 relative">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 blur-[150px] rounded-full opacity-50" />
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-4">
            <RocketIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PromptPlay</h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Create 2D games with AI assistance. Choose a template to get started.
          </p>
        </div>
      </div>

      {/* Recent Projects Section */}
      {recentProjects.length > 0 && (
        <div className="flex-shrink-0 px-8 pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon size={14} className="text-text-tertiary" />
              <h2 className="text-sm font-medium text-text-secondary">Recent Projects</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentProjects.slice(0, 4).map((project) => (
                <button
                  key={project.path}
                  onClick={() => onOpenProject(project.path)}
                  className="flex-shrink-0 w-48 p-3 bg-panel/50 backdrop-blur-sm border border-subtle rounded-xl hover:bg-white/5 hover:border-violet-500/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-violet-500/20">
                      <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-violet-400 transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatLastOpened(project.lastOpened)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Genre Filter */}
      <div className="flex-shrink-0 px-8 pb-4">
        <div className="flex justify-center gap-2">
          {GENRE_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => {
                setGenreFilter(filter.id);
                setShowAll(false);
              }}
              className={`px-4 py-1.5 text-sm rounded-full transition-all ${
                genreFilter === filter.id
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 px-8 pb-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTemplates.map((template: GameTemplate) => {
              const colors = getColorClasses(template.color);
              const badge = DIFFICULTY_BADGES[template.difficulty];

              return (
                <button
                  key={template.id}
                  onClick={() => onCreateFromTemplate(template.id)}
                  className={`group relative flex flex-col p-5 bg-panel/50 backdrop-blur-sm border border-subtle rounded-xl hover:bg-white/5 transition-all hover:scale-[1.02] ${colors.hover} hover:shadow-lg text-left`}
                >
                  {/* Header with icon and badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${colors.bg} text-2xl`}>
                      {template.icon}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-base font-semibold mb-1 group-hover:text-white transition-colors ${colors.text}`}>
                    {template.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors line-clamp-2 flex-1">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-text-tertiary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Show More/Less */}
          {filteredTemplates.length > 6 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                {showAll ? 'Show Less' : `Show All (${filteredTemplates.length} templates)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-subtle bg-panel/30">
        <div className="max-w-4xl mx-auto flex justify-center gap-6">
          <button
            onClick={() => onOpenProject()}
            className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            Open Project
          </button>

          <span className="text-text-tertiary">•</span>

          <button
            onClick={onNewProject}
            className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2"
          >
            <NewProjectIcon size={14} />
            New Blank Project
          </button>

          {onImportPackage && (
            <>
              <span className="text-text-tertiary">•</span>
              <button
                onClick={onImportPackage}
                className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Package
              </button>
            </>
          )}
        </div>

        <div className="text-center mt-4 text-xs text-text-tertiary/50">
          v1.0.0 • The AI-First Game Engine
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
