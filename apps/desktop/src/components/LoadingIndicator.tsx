/**
 * Loading Indicator Components
 * Reusable loading states for async operations
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Animated spinner for inline loading states
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-current border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number; // 0-100
  className?: string;
}

/**
 * Full overlay loading state with optional progress
 */
export function LoadingOverlay({ message, progress, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="bg-panel rounded-lg p-6 shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
        <Spinner size="lg" className="text-accent" />
        {message && (
          <p className="text-text-primary text-sm font-medium">{message}</p>
        )}
        {progress !== undefined && (
          <div className="w-full">
            <div className="h-2 bg-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-text-secondary text-xs text-center mt-1">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * Button with loading state
 */
export function LoadingButton({
  isLoading,
  loadingText,
  children,
  onClick,
  disabled,
  className = '',
  variant = 'primary',
}: LoadingButtonProps) {
  const variantClasses = {
    primary: 'bg-accent hover:bg-accent/90 text-white',
    secondary: 'bg-subtle hover:bg-subtle/80 text-text-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span>{loadingText || 'Loading...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

/**
 * Skeleton placeholder for content loading
 */
export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-subtle rounded animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

interface LoadingCardProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Wrapper that handles loading/error states for card-like content
 */
export function LoadingCard({
  isLoading,
  error,
  onRetry,
  children,
  loadingComponent,
}: LoadingCardProps) {
  if (isLoading) {
    return loadingComponent || <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Toast notification for async operation feedback
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const typeStyles = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-lg shadow-lg border
        flex items-center gap-3
        animate-slide-in
        ${typeStyles[toast.type]}
      `}
    >
      <span className="text-lg">{icons[toast.type]}</span>
      <p className="text-white text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/70 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/**
 * Hook for managing toast notifications
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastMessage['type'],
    message: string,
    duration = 5000
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast: ToastMessage = { id, type, message, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

// Import useState and useCallback for the hook
import { useState, useCallback } from 'react';
