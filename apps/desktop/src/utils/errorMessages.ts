/**
 * Centralized Error Messages
 * User-friendly error messages for all services
 */

/**
 * Error categories for better handling
 */
export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'file'
  | 'permission'
  | 'notFound'
  | 'conflict'
  | 'timeout'
  | 'unknown';

/**
 * Structured error with user-friendly message
 */
export interface AppError {
  code: string;
  message: string;
  category: ErrorCategory;
  details?: string;
  recoverable: boolean;
  suggestion?: string;
}

/**
 * Convert raw error to user-friendly AppError
 */
export function toAppError(error: unknown, context?: string): AppError {
  // Handle string errors
  if (typeof error === 'string') {
    return parseErrorMessage(error, context);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return parseErrorMessage(error.message, context);
  }

  // Handle fetch/network errors
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    if ('status' in errObj && typeof errObj.status === 'number') {
      return parseHttpError(errObj.status, errObj.message as string | undefined, context);
    }
  }

  // Fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    category: 'unknown',
    details: context,
    recoverable: true,
    suggestion: 'Please try again. If the problem persists, restart the application.',
  };
}

/**
 * Parse error message and categorize
 */
function parseErrorMessage(message: string, context?: string): AppError {
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') || lowerMessage.includes('offline')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server',
      category: 'network',
      details: message,
      recoverable: true,
      suggestion: 'Check your internet connection and try again.',
    };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      code: 'TIMEOUT_ERROR',
      message: 'The operation took too long',
      category: 'timeout',
      details: message,
      recoverable: true,
      suggestion: 'The server may be busy. Please try again in a moment.',
    };
  }

  // Auth errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication') ||
      lowerMessage.includes('not logged in') || lowerMessage.includes('token')) {
    return {
      code: 'AUTH_ERROR',
      message: 'You need to sign in to perform this action',
      category: 'auth',
      details: message,
      recoverable: true,
      suggestion: 'Please sign in and try again.',
    };
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') ||
      lowerMessage.includes('access denied')) {
    return {
      code: 'PERMISSION_ERROR',
      message: "You don't have permission to perform this action",
      category: 'permission',
      details: message,
      recoverable: false,
      suggestion: 'Contact the project owner if you need access.',
    };
  }

  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist') ||
      lowerMessage.includes('404')) {
    return {
      code: 'NOT_FOUND',
      message: context ? `${context} was not found` : 'The requested resource was not found',
      category: 'notFound',
      details: message,
      recoverable: false,
      suggestion: 'The item may have been deleted or moved.',
    };
  }

  // File errors
  if (lowerMessage.includes('file') || lowerMessage.includes('directory') ||
      lowerMessage.includes('path') || lowerMessage.includes('read') ||
      lowerMessage.includes('write') || lowerMessage.includes('save')) {
    return {
      code: 'FILE_ERROR',
      message: 'There was a problem accessing the file',
      category: 'file',
      details: message,
      recoverable: true,
      suggestion: 'Make sure the file exists and you have the necessary permissions.',
    };
  }

  // Validation errors
  if (lowerMessage.includes('invalid') || lowerMessage.includes('required') ||
      lowerMessage.includes('must be') || lowerMessage.includes('cannot be')) {
    return {
      code: 'VALIDATION_ERROR',
      message: message, // Use original message for validation - it's usually specific
      category: 'validation',
      recoverable: true,
      suggestion: 'Please check your input and try again.',
    };
  }

  // Conflict errors
  if (lowerMessage.includes('already exists') || lowerMessage.includes('conflict') ||
      lowerMessage.includes('duplicate')) {
    return {
      code: 'CONFLICT_ERROR',
      message: message,
      category: 'conflict',
      details: message,
      recoverable: true,
      suggestion: 'Try using a different name or updating the existing item.',
    };
  }

  // Default case
  return {
    code: 'OPERATION_FAILED',
    message: context ? `Failed to ${context}` : message,
    category: 'unknown',
    details: message,
    recoverable: true,
    suggestion: 'Please try again. If the problem persists, check the console for more details.',
  };
}

/**
 * Parse HTTP status code to user-friendly error
 */
function parseHttpError(status: number, message?: string, context?: string): AppError {
  switch (status) {
    case 400:
      return {
        code: 'BAD_REQUEST',
        message: message || 'Invalid request',
        category: 'validation',
        recoverable: true,
        suggestion: 'Please check your input and try again.',
      };

    case 401:
      return {
        code: 'UNAUTHORIZED',
        message: 'Your session has expired',
        category: 'auth',
        recoverable: true,
        suggestion: 'Please sign in again.',
      };

    case 403:
      return {
        code: 'FORBIDDEN',
        message: "You don't have permission to perform this action",
        category: 'permission',
        recoverable: false,
        suggestion: 'Contact the administrator if you need access.',
      };

    case 404:
      return {
        code: 'NOT_FOUND',
        message: context ? `${context} was not found` : 'The requested resource was not found',
        category: 'notFound',
        recoverable: false,
        suggestion: 'The item may have been deleted or moved.',
      };

    case 409:
      return {
        code: 'CONFLICT',
        message: message || 'A conflict occurred',
        category: 'conflict',
        recoverable: true,
        suggestion: 'The resource may have been modified. Try refreshing and try again.',
      };

    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        category: 'timeout',
        recoverable: true,
        suggestion: 'Please wait a moment before trying again.',
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        code: 'SERVER_ERROR',
        message: 'The server encountered an error',
        category: 'network',
        recoverable: true,
        suggestion: 'Please try again later. If the problem persists, contact support.',
      };

    default:
      return {
        code: `HTTP_${status}`,
        message: message || `Request failed with status ${status}`,
        category: 'unknown',
        recoverable: true,
        suggestion: 'Please try again.',
      };
  }
}

/**
 * Common error messages for specific operations
 */
export const ErrorMessages = {
  // Project operations
  PROJECT_LOAD_FAILED: 'Failed to load project',
  PROJECT_SAVE_FAILED: 'Failed to save project',
  PROJECT_CREATE_FAILED: 'Failed to create project',
  PROJECT_DELETE_FAILED: 'Failed to delete project',

  // File operations
  FILE_READ_FAILED: 'Failed to read file',
  FILE_WRITE_FAILED: 'Failed to write file',
  FILE_NOT_FOUND: 'File not found',
  DIRECTORY_NOT_FOUND: 'Directory not found',

  // Export operations
  EXPORT_FAILED: 'Failed to export game',
  PUBLISH_FAILED: 'Failed to publish game',
  ZIP_CREATE_FAILED: 'Failed to create ZIP file',

  // Cloud operations
  CLOUD_SYNC_FAILED: 'Failed to sync with cloud',
  CLOUD_UPLOAD_FAILED: 'Failed to upload to cloud',
  CLOUD_DOWNLOAD_FAILED: 'Failed to download from cloud',

  // Collaboration
  COLLAB_CONNECT_FAILED: 'Failed to connect to collaboration server',
  COLLAB_SYNC_FAILED: 'Failed to sync changes',

  // Marketplace
  MARKETPLACE_LOAD_FAILED: 'Failed to load marketplace assets',
  ASSET_DOWNLOAD_FAILED: 'Failed to download asset',
  ASSET_UPLOAD_FAILED: 'Failed to upload asset',

  // Game sharing
  GAME_PUBLISH_FAILED: 'Failed to publish game',
  GAME_LOAD_FAILED: 'Failed to load game',
};

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  description: string;
  action?: string;
} {
  return {
    title: error.message,
    description: error.suggestion || 'Please try again.',
    action: error.recoverable ? 'Try Again' : undefined,
  };
}

/**
 * Log error with context for debugging
 */
export function logError(error: unknown, context: string): void {
  const appError = toAppError(error, context);
  console.error(`[${context}] ${appError.code}: ${appError.message}`, {
    category: appError.category,
    details: appError.details,
    recoverable: appError.recoverable,
    originalError: error,
  });
}
