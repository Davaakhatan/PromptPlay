import { useState, useEffect } from 'react';
import { NewProjectIcon, RocketIcon, ClockIcon } from './Icons';
import { GAME_TEMPLATES, type GameTemplate } from '../services/TemplateService';
import { getRecentProjects, RecentProject, formatLastOpened, recentProjectsManager } from '../services/RecentProjectsService';

// Template icon renderer
const getTemplateIcon = (iconId: string, className = 'w-6 h-6') => {
  switch (iconId) {
    case 'game': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'map': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
    case 'skull': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'run': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    case 'rocket': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>;
    case 'target': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    case 'explosion': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>;
    case 'cube': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'maze': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
    case 'cog': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'document': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case 'car': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M9 11h6M5 11l2-6h10l2 6M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11H3m16 0h2" /></svg>;
    case 'image': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    default: return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
};

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
                    <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.text}`}>
                      {getTemplateIcon(template.icon)}
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
          v3.0.0 • The AI-First 2D & 3D Game Engine
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
