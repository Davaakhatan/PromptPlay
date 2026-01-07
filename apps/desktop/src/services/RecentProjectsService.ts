/**
 * Recent Projects Service - Track and manage recently opened projects
 */
import { logError } from '../utils/errorUtils';

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
  thumbnail?: string;
  genre?: string;
  entityCount?: number;
  isFavorite?: boolean;
  tags?: string[];
  description?: string;
}

const STORAGE_KEY = 'promptplay_recent_projects';
const MAX_RECENT_PROJECTS = 10;

/**
 * Get all recent projects
 */
export function getRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as RecentProject[];
      // Sort by most recently opened
      return projects.sort((a, b) =>
        new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
      );
    }
  } catch (e) {
    logError('Failed to load recent projects', e);
  }
  return [];
}

/**
 * Add or update a project in recent projects
 */
export function addRecentProject(project: Omit<RecentProject, 'lastOpened'>): void {
  const projects = getRecentProjects();

  // Remove existing entry for this path if it exists
  const filteredProjects = projects.filter(p => p.path !== project.path);

  // Add new entry at the beginning
  const newProject: RecentProject = {
    ...project,
    lastOpened: new Date().toISOString(),
  };

  filteredProjects.unshift(newProject);

  // Keep only the most recent projects
  const trimmedProjects = filteredProjects.slice(0, MAX_RECENT_PROJECTS);

  // Save to storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedProjects));
}

/**
 * Remove a project from recent projects
 */
export function removeRecentProject(path: string): boolean {
  const projects = getRecentProjects();
  const filtered = projects.filter(p => p.path !== path);

  if (filtered.length === projects.length) {
    return false; // Project not found
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Update project metadata (e.g., thumbnail, entity count)
 */
export function updateRecentProject(
  path: string,
  updates: Partial<Omit<RecentProject, 'path' | 'lastOpened'>>
): RecentProject | null {
  const projects = getRecentProjects();
  const index = projects.findIndex(p => p.path === path);

  if (index === -1) {
    return null;
  }

  projects[index] = {
    ...projects[index],
    ...updates,
    lastOpened: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects[index];
}

/**
 * Check if a project exists in recent projects
 */
export function isRecentProject(path: string): boolean {
  return getRecentProjects().some(p => p.path === path);
}

/**
 * Get the most recently opened project
 */
export function getMostRecentProject(): RecentProject | null {
  const projects = getRecentProjects();
  return projects.length > 0 ? projects[0] : null;
}

/**
 * Format the last opened time as a relative string
 */
export function formatLastOpened(lastOpened: string): string {
  const date = new Date(lastOpened);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Singleton for event-based updates
class RecentProjectsManager {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyChange(): void {
    this.listeners.forEach(callback => callback());
  }

  addProject(project: Omit<RecentProject, 'lastOpened'>): void {
    addRecentProject(project);
    this.notifyChange();
  }

  removeProject(path: string): boolean {
    const result = removeRecentProject(path);
    if (result) {
      this.notifyChange();
    }
    return result;
  }

  clear(): void {
    clearRecentProjects();
    this.notifyChange();
  }
}

export const recentProjectsManager = new RecentProjectsManager();

/**
 * Toggle favorite status for a project
 */
export function toggleFavorite(path: string): boolean {
  const projects = getRecentProjects();
  const project = projects.find(p => p.path === path);
  if (!project) return false;

  project.isFavorite = !project.isFavorite;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  recentProjectsManager.notifyChange();
  return project.isFavorite;
}

/**
 * Add a tag to a project
 */
export function addTag(path: string, tag: string): void {
  const projects = getRecentProjects();
  const project = projects.find(p => p.path === path);
  if (!project) return;

  if (!project.tags) project.tags = [];
  if (!project.tags.includes(tag)) {
    project.tags.push(tag);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    recentProjectsManager.notifyChange();
  }
}

/**
 * Remove a tag from a project
 */
export function removeTag(path: string, tag: string): void {
  const projects = getRecentProjects();
  const project = projects.find(p => p.path === path);
  if (!project?.tags) return;

  project.tags = project.tags.filter(t => t !== tag);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  recentProjectsManager.notifyChange();
}

/**
 * Get all unique tags across all projects
 */
export function getAllTags(): string[] {
  const projects = getRecentProjects();
  const tagSet = new Set<string>();
  projects.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

/**
 * Filter projects by tag
 */
export function getProjectsByTag(tag: string): RecentProject[] {
  return getRecentProjects().filter(p => p.tags?.includes(tag));
}

/**
 * Get favorite projects
 */
export function getFavoriteProjects(): RecentProject[] {
  return getRecentProjects().filter(p => p.isFavorite);
}

/**
 * Search projects by name or path
 */
export function searchProjects(query: string): RecentProject[] {
  const lowerQuery = query.toLowerCase();
  return getRecentProjects().filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.path.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
