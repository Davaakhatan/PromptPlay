import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// Lazy-loaded Supabase client (singleton)
let _supabaseClient: SupabaseClient | null = null;

// Get or create Supabase client - only creates when configured
function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseClient) return _supabaseClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return _supabaseClient;
}

// Export a proxy that lazily initializes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      // Return no-op functions for unconfigured state
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signOut: async () => ({ error: null }),
          resetPasswordForEmail: async () => ({ error: { message: 'Supabase not configured' } }),
          updateUser: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        };
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          upsert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        });
      }
      if (prop === 'storage') {
        return {
          from: () => ({
            upload: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
          }),
        };
      }
      if (prop === 'channel') {
        return () => ({
          on: () => ({ subscribe: () => {} }),
          subscribe: () => {},
          unsubscribe: () => {},
          track: async () => {},
          send: async () => {},
        });
      }
      return undefined;
    }
    return (client as unknown as Record<string, unknown>)[prop as string];
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
