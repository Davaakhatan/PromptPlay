import { supabase, isSupabaseConfigured, type CloudProject } from '../lib/supabase';
import { authService } from './AuthService';
import type { GameSpec } from '@promptplay/shared-types';

export interface CloudSaveResult {
  success: boolean;
  project?: CloudProject;
  error?: string;
}

export interface CloudProjectListResult {
  success: boolean;
  projects?: CloudProject[];
  error?: string;
}

/**
 * Cloud Save Service
 * Handles saving and loading projects from Supabase
 */
export class CloudSaveService {
  private static instance: CloudSaveService;

  private constructor() {}

  static getInstance(): CloudSaveService {
    if (!CloudSaveService.instance) {
      CloudSaveService.instance = new CloudSaveService();
    }
    return CloudSaveService.instance;
  }

  /**
   * Check if cloud save is available
   */
  isAvailable(): boolean {
    return isSupabaseConfigured() && !!authService.getState().user;
  }

  /**
   * Save a project to the cloud
   */
  async saveProject(
    name: string,
    gameSpec: GameSpec,
    options: {
      description?: string;
      isPublic?: boolean;
      tags?: string[];
      existingProjectId?: string;
    } = {}
  ): Promise<CloudSaveResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Cloud save not available. Please sign in.' };
    }

    const userId = authService.getState().user!.id;

    try {
      const projectData = {
        user_id: userId,
        name,
        description: options.description || null,
        game_spec: gameSpec as unknown as Record<string, unknown>,
        is_public: options.isPublic ?? false,
        tags: options.tags || [],
        updated_at: new Date().toISOString(),
      };

      let result;

      if (options.existingProjectId) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', options.existingProjectId)
          .eq('user_id', userId) // Ensure user owns the project
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert({
            ...projectData,
            created_at: new Date().toISOString(),
            downloads: 0,
            likes: 0,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return { success: true, project: result as CloudProject };
    } catch (err) {
      console.error('Error saving project:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save project',
      };
    }
  }

  /**
   * Load a project from the cloud
   */
  async loadProject(projectId: string): Promise<{ success: boolean; project?: CloudProject; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      // Check access - either owner or public
      const userId = authService.getState().user?.id;
      if (!data.is_public && data.user_id !== userId) {
        return { success: false, error: 'Access denied' };
      }

      return { success: true, project: data as CloudProject };
    } catch (err) {
      console.error('Error loading project:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load project',
      };
    }
  }

  /**
   * Get user's projects
   */
  async getMyProjects(): Promise<CloudProjectListResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = authService.getState().user!.id;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return { success: true, projects: data as CloudProject[] };
    } catch (err) {
      console.error('Error fetching projects:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch projects',
      };
    }
  }

  /**
   * Get public projects (for community browsing)
   */
  async getPublicProjects(options: {
    limit?: number;
    offset?: number;
    tags?: string[];
    search?: string;
    sortBy?: 'recent' | 'popular' | 'likes';
  } = {}): Promise<CloudProjectListResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud not configured' };
    }

    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('is_public', true);

      // Apply filters
      if (options.tags && options.tags.length > 0) {
        query = query.contains('tags', options.tags);
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      // Apply sorting
      switch (options.sortBy) {
        case 'popular':
          query = query.order('downloads', { ascending: false });
          break;
        case 'likes':
          query = query.order('likes', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, projects: data as CloudProject[] };
    } catch (err) {
      console.error('Error fetching public projects:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch projects',
      };
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = authService.getState().user!.id;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error deleting project:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete project',
      };
    }
  }

  /**
   * Fork a public project
   */
  async forkProject(projectId: string, newName: string): Promise<CloudSaveResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Load the original project
      const { project, error: loadError } = await this.loadProject(projectId);
      if (loadError || !project) {
        return { success: false, error: loadError || 'Project not found' };
      }

      // Increment download count for original
      await supabase.rpc('increment_downloads', { project_id: projectId });

      // Save as new project
      return this.saveProject(newName, project.game_spec as unknown as GameSpec, {
        description: `Forked from ${project.name}`,
        isPublic: false,
        tags: project.tags,
      });
    } catch (err) {
      console.error('Error forking project:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fork project',
      };
    }
  }

  /**
   * Like a project
   */
  async likeProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = authService.getState().user!.id;

    try {
      // Check if already liked
      const { data: existing } = await supabase
        .from('project_likes')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Unlike
        await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);

        await supabase.rpc('decrement_likes', { project_id: projectId });
      } else {
        // Like
        await supabase.from('project_likes').insert({
          project_id: projectId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

        await supabase.rpc('increment_likes', { project_id: projectId });
      }

      return { success: true };
    } catch (err) {
      console.error('Error liking project:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to like project',
      };
    }
  }

  /**
   * Upload project thumbnail
   */
  async uploadThumbnail(projectId: string, file: File): Promise<{ url?: string; error?: string }> {
    if (!this.isAvailable()) {
      return { error: 'Not authenticated' };
    }

    const userId = authService.getState().user!.id;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${projectId}/thumbnail.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-thumbnails')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-thumbnails')
        .getPublicUrl(fileName);

      // Update project with thumbnail URL
      await supabase
        .from('projects')
        .update({ thumbnail_url: publicUrl })
        .eq('id', projectId)
        .eq('user_id', userId);

      return { url: publicUrl };
    } catch (err) {
      console.error('Error uploading thumbnail:', err);
      return { error: err instanceof Error ? err.message : 'Failed to upload thumbnail' };
    }
  }
}

// Singleton instance
export const cloudSaveService = CloudSaveService.getInstance();
