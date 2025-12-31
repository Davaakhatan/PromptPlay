interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

interface ErrorInfo {
  title: string;
  suggestion: string;
  action?: string;
}

function getErrorInfo(error: string): ErrorInfo {
  const lowerError = error.toLowerCase();

  // File/path related errors
  if (lowerError.includes('game.json not found')) {
    return {
      title: 'Game file not found',
      suggestion: 'The selected folder does not contain a game.json file.',
      action: 'Try creating a new project or select a folder that contains game.json.',
    };
  }

  if (lowerError.includes('failed to read') || lowerError.includes('no such file')) {
    return {
      title: 'File read error',
      suggestion: 'The file could not be read. It may have been moved or deleted.',
      action: 'Check if the file exists and try again.',
    };
  }

  if (lowerError.includes('permission denied')) {
    return {
      title: 'Permission denied',
      suggestion: 'You do not have permission to access this file or folder.',
      action: 'Try running the app with appropriate permissions or choose a different location.',
    };
  }

  // JSON parsing errors
  if (lowerError.includes('invalid json') || lowerError.includes('json parse') || lowerError.includes('unexpected token')) {
    return {
      title: 'Invalid JSON format',
      suggestion: 'The game.json file contains invalid JSON syntax.',
      action: 'Check for missing commas, brackets, or quotes in your JSON file.',
    };
  }

  // Export errors
  if (lowerError.includes('failed to export')) {
    return {
      title: 'Export failed',
      suggestion: 'Could not export the game to the specified location.',
      action: 'Make sure you have write permissions and try a different location.',
    };
  }

  // API errors
  if (lowerError.includes('api key') || lowerError.includes('unauthorized')) {
    return {
      title: 'API key issue',
      suggestion: 'The AI API key is missing or invalid.',
      action: 'Click the settings icon in the AI panel to configure your API key.',
    };
  }

  if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
    return {
      title: 'Rate limit exceeded',
      suggestion: 'Too many requests have been made to the AI API.',
      action: 'Wait a few minutes before trying again.',
    };
  }

  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('fetch')) {
    return {
      title: 'Network error',
      suggestion: 'Could not connect to the server.',
      action: 'Check your internet connection and try again.',
    };
  }

  // Project creation errors
  if (lowerError.includes('failed to create project') || lowerError.includes('failed to create directory')) {
    return {
      title: 'Project creation failed',
      suggestion: 'Could not create the project in the specified location.',
      action: 'Choose a different location or check folder permissions.',
    };
  }

  // Default error
  return {
    title: 'An error occurred',
    suggestion: error,
    action: 'If this persists, try restarting the application.',
  };
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const { title, suggestion, action } = getErrorInfo(error);

  return (
    <div className="p-4 bg-red-50 border-l-4 border-red-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-red-800">{title}</p>
          </div>
          <p className="text-sm text-red-700 mt-1 ml-7">{suggestion}</p>
          {action && (
            <p className="text-sm text-red-600 mt-2 ml-7 flex items-center gap-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Tip:</span> {action}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 p-1 -mt-1 -mr-1"
            title="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
