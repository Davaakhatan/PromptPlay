/**
 * Voice Input Service - Speech-to-text for hands-free game creation
 * Uses the Web Speech API for browser-based speech recognition
 */

export interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export type VoiceInputCallback = (result: VoiceInputResult) => void;
export type VoiceErrorCallback = (error: string) => void;

/**
 * Service for voice input using Web Speech API
 */
export class VoiceInputService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResult: VoiceInputCallback | null = null;
  private onError: VoiceErrorCallback | null = null;
  private onStart: (() => void) | null = null;
  private onEnd: (() => void) | null = null;

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return !!(
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition
    );
  }

  /**
   * Initialize the speech recognition
   */
  initialize(options: VoiceInputOptions = {}): boolean {
    if (!VoiceInputService.isSupported()) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.lang = options.language || 'en-US';
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

    // Set up event handlers
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      if (this.onResult) {
        this.onResult({ transcript, confidence, isFinal });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech was detected. Please try again.',
        'audio-capture': 'No microphone was found.',
        'not-allowed': 'Microphone access was denied.',
        'network': 'Network error occurred.',
        'aborted': 'Speech recognition was aborted.',
        'language-not-supported': 'Language not supported.',
        'service-not-allowed': 'Speech recognition service not allowed.',
      };

      const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;

      if (this.onError) {
        this.onError(message);
      }

      this.isListening = false;
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) {
        this.onStart();
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) {
        this.onEnd();
      }
    };

    return true;
  }

  /**
   * Start listening for voice input
   */
  startListening(
    onResult: VoiceInputCallback,
    onError?: VoiceErrorCallback
  ): boolean {
    if (!this.recognition) {
      if (!this.initialize()) {
        return false;
      }
    }

    if (this.isListening) {
      return true;
    }

    this.onResult = onResult;
    this.onError = onError || null;

    try {
      this.recognition!.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort speech recognition immediately
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  /**
   * Set callback for when listening starts
   */
  setOnStart(callback: () => void): void {
    this.onStart = callback;
  }

  /**
   * Set callback for when listening ends
   */
  setOnEnd(callback: () => void): void {
    this.onEnd = callback;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): { code: string; name: string }[] {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
    ];
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.abort();
    this.recognition = null;
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
  }
}

// Singleton instance
export const voiceInput = new VoiceInputService();

/**
 * React hook for voice input
 */
export function createVoiceInputHook() {
  return {
    isSupported: VoiceInputService.isSupported(),
    service: voiceInput,
  };
}
