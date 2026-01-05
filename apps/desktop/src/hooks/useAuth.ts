import { useState, useEffect, useCallback } from 'react';
import { authService, type AuthState } from '../services/AuthService';

/**
 * Hook to access authentication state and methods
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    return authService.subscribe(setState);
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    return authService.signUp(email, password, username);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return authService.signIn(email, password);
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'github' | 'google' | 'discord') => {
    return authService.signInWithOAuth(provider);
  }, []);

  const signOut = useCallback(async () => {
    return authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return authService.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    return authService.updatePassword(newPassword);
  }, []);

  const updateProfile = useCallback(async (updates: Parameters<typeof authService.updateProfile>[0]) => {
    return authService.updateProfile(updates);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    return authService.uploadAvatar(file);
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.user,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    uploadAvatar,
  };
}

export type UseAuthReturn = ReturnType<typeof useAuth>;
