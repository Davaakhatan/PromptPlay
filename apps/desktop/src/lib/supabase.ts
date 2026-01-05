import { createClient } from '@supabase/supabase-js';

// Vite env type declaration
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

// Supabase configuration
// Users need to set these in their environment or settings
const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

// Create Supabase client (singleton)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Database types for our tables
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  game_spec: Record<string, unknown>;
  is_public: boolean;
  thumbnail_url: string | null;
  tags: string[];
  downloads: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceAsset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: 'sprite' | 'sound' | 'music' | 'prefab' | 'template' | 'tileset';
  file_url: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  tags: string[];
  price: number; // 0 = free
  downloads: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface AssetReview {
  id: string;
  asset_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// Export types for use in other files
export type { User, Session } from '@supabase/supabase-js';
