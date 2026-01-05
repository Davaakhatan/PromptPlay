import { supabase, isSupabaseConfigured, type UserProfile, type User, type Session } from '../lib/supabase';

export type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
};

export type AuthError = {
  message: string;
  code?: string;
};

/**
 * Authentication Service
 * Handles user authentication, profile management, and session state
 */
export class AuthService {
  private static instance: AuthService;
  private listeners: Set<(state: AuthState) => void> = new Set();
  private state: AuthState = {
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isConfigured: isSupabaseConfigured(),
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth state and listen for changes
   */
  private async initialize(): Promise<void> {
    if (!this.state.isConfigured) {
      this.setState({ isLoading: false });
      return;
    }

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await this.fetchProfile(session.user.id);
      this.setState({
        user: session.user,
        session,
        profile,
        isLoading: false,
      });
    } else {
      this.setState({ isLoading: false });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (session?.user) {
        const profile = await this.fetchProfile(session.user.id);
        this.setState({
          user: session.user,
          session,
          profile,
        });
      } else {
        this.setState({
          user: null,
          session: null,
          profile: null,
        });
      }
    });
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return this.state;
  }

  private setState(partial: Partial<AuthState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, username: string): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existing) {
        return { error: { message: 'Username is already taken' } };
      }

      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      // Create profile
      if (data.user) {
        await this.createProfile(data.user.id, email, username);
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Sign up failed' } };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Sign in failed' } };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: 'github' | 'google' | 'discord'): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'OAuth sign in failed' } };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Sign out failed' } };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Password reset failed' } };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: { message: error.message, code: error.name } };
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Password update failed' } };
    }
  }

  /**
   * Fetch user profile
   */
  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }

  /**
   * Create user profile
   */
  private async createProfile(userId: string, email: string, username: string): Promise<void> {
    try {
      await supabase.from('profiles').insert({
        id: userId,
        email,
        username,
        display_name: username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Pick<UserProfile, 'display_name' | 'bio' | 'avatar_url'>>): Promise<{ error?: AuthError }> {
    if (!this.state.isConfigured || !this.state.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.state.user.id);

      if (error) {
        return { error: { message: error.message } };
      }

      // Refresh profile
      const profile = await this.fetchProfile(this.state.user.id);
      this.setState({ profile });

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Profile update failed' } };
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File): Promise<{ url?: string; error?: AuthError }> {
    if (!this.state.isConfigured || !this.state.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${this.state.user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        return { error: { message: uploadError.message } };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await this.updateProfile({ avatar_url: publicUrl });

      return { url: publicUrl };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Avatar upload failed' } };
    }
  }
}

// Singleton instance
export const authService = AuthService.getInstance();
