/**
 * Safely extract error message from various error types.
 * Handles Tauri errors which may have cyclic references.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object') {
    // Try common error properties
    if ('message' in err && typeof err.message === 'string') {
      return err.message;
    }
    if ('error' in err && typeof err.error === 'string') {
      return err.error;
    }
    // Avoid JSON.stringify on potentially cyclic objects
    try {
      const str = String(err);
      if (str !== '[object Object]') {
        return str;
      }
    } catch {
      // Ignore
    }
  }
  return 'Unknown error';
}

/**
 * Safely log an error without cyclic reference issues.
 */
export function logError(context: string, err: unknown): void {
  const message = getErrorMessage(err);
  console.error(`${context}:`, message);
}
