/**
 * Screen Capture Service - Screenshots and GIF recording
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

// Note: GIF encoder placeholder removed - use gif.js library for production GIF encoding

export interface CaptureOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-1 for jpeg/webp
  scale?: number; // Scale factor
}

export interface RecordingOptions {
  fps: number;
  maxDuration: number; // in seconds
  quality?: number;
}

export type VideoFormat = 'webm' | 'mp4';
export type VideoResolution = '480p' | '720p' | '1080p' | '4k' | 'custom';

export interface VideoRecordingOptions {
  resolution: VideoResolution;
  customWidth?: number;
  customHeight?: number;
  fps: 24 | 30 | 60;
  format: VideoFormat;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  includeAudio: boolean;
  audioBitrate?: number; // kbps
  videoBitrate?: number; // kbps
  maxDuration?: number; // seconds, 0 = unlimited
}

// Resolution presets
const RESOLUTION_PRESETS: Record<VideoResolution, { width: number; height: number }> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  'custom': { width: 0, height: 0 },
};

// Quality presets (video bitrate in kbps)
const QUALITY_BITRATES: Record<string, Record<VideoRecordingOptions['quality'], number>> = {
  '480p': { low: 1000, medium: 2000, high: 3000, ultra: 4000 },
  '720p': { low: 2500, medium: 5000, high: 7500, ultra: 10000 },
  '1080p': { low: 4000, medium: 8000, high: 12000, ultra: 16000 },
  '4k': { low: 15000, medium: 25000, high: 35000, ultra: 50000 },
};

export class ScreenCaptureService {
  private isRecording = false;
  private recordingStartTime = 0;
  private recordedFrames: ImageData[] = [];
  private recordingInterval: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private maxFrames = 300; // ~10 seconds at 30fps

  /**
   * Capture a screenshot of the canvas
   */
  async captureScreenshot(
    canvas: HTMLCanvasElement,
    options: CaptureOptions = { format: 'png' }
  ): Promise<string> {
    const { format, quality = 0.92, scale = 1 } = options;

    // Create scaled canvas if needed
    let sourceCanvas = canvas;
    if (scale !== 1) {
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = canvas.width * scale;
      sourceCanvas.height = canvas.height * scale;
      const ctx = sourceCanvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(canvas, 0, 0);
    }

    // Get data URL
    const mimeType = `image/${format}`;
    const dataUrl = sourceCanvas.toDataURL(mimeType, quality);

    return dataUrl;
  }

  /**
   * Save screenshot to file
   */
  async saveScreenshot(
    canvas: HTMLCanvasElement,
    options: CaptureOptions = { format: 'png' }
  ): Promise<string | null> {
    const dataUrl = await this.captureScreenshot(canvas, options);

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    // Get save path from user
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `screenshot-${timestamp}.${options.format}`;

    const path = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'Image',
          extensions: [options.format],
        },
      ],
    });

    if (path) {
      await writeFile(path, new Uint8Array(arrayBuffer));
      return path;
    }

    return null;
  }

  /**
   * Copy screenshot to clipboard (with fallback)
   */
  async copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      // Try using the Clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      return true;
    } catch (err) {
      console.error('Clipboard not available, trying fallback:', err);
      // Fallback: create download link
      return this.downloadScreenshot(canvas);
    }
  }

  /**
   * Download screenshot as file (fallback when clipboard fails)
   */
  private downloadScreenshot(canvas: HTMLCanvasElement): boolean {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.download = `screenshot-${timestamp}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (err) {
      console.error('Failed to download screenshot:', err);
      return false;
    }
  }

  /**
   * Quick screenshot - saves to downloads folder automatically
   */
  async quickScreenshot(canvas: HTMLCanvasElement): Promise<string | null> {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshot-${timestamp}.png`;

      // Create download link
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      return fileName;
    } catch (err) {
      console.error('Failed to take quick screenshot:', err);
      return null;
    }
  }

  /**
   * Start recording frames
   */
  startRecording(
    canvas: HTMLCanvasElement,
    options: RecordingOptions = { fps: 30, maxDuration: 10 }
  ): void {
    if (this.isRecording) return;

    this.canvas = canvas;
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.recordedFrames = [];
    this.maxFrames = options.fps * options.maxDuration;

    const frameInterval = 1000 / options.fps;

    this.recordingInterval = window.setInterval(() => {
      if (!this.canvas || !this.isRecording) return;

      // Check duration limit
      const elapsed = (Date.now() - this.recordingStartTime) / 1000;
      if (elapsed >= options.maxDuration || this.recordedFrames.length >= this.maxFrames) {
        this.stopRecording();
        return;
      }

      // Capture frame
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.recordedFrames.push(imageData);
      }
    }, frameInterval);
  }

  /**
   * Stop recording and return frames
   */
  stopRecording(): ImageData[] {
    if (!this.isRecording) return [];

    this.isRecording = false;
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    const frames = [...this.recordedFrames];
    this.recordedFrames = [];
    return frames;
  }

  /**
   * Get recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    frameCount: number;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      frameCount: this.recordedFrames.length,
      duration: this.isRecording
        ? (Date.now() - this.recordingStartTime) / 1000
        : 0,
    };
  }

  /**
   * Export recorded frames as WebM video (if supported)
   */
  async exportAsVideo(
    canvas: HTMLCanvasElement,
    durationMs: number = 5000
  ): Promise<Blob | null> {
    // Check for MediaRecorder support
    if (!('MediaRecorder' in window)) {
      console.warn('MediaRecorder not supported');
      return null;
    }

    return new Promise((resolve) => {
      const stream = canvas.captureStream(30);
      const chunks: Blob[] = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.onerror = () => {
        resolve(null);
      };

      recorder.start();
      setTimeout(() => recorder.stop(), durationMs);
    });
  }

  /**
   * Save video recording
   */
  async saveVideo(
    canvas: HTMLCanvasElement,
    durationMs: number = 5000
  ): Promise<string | null> {
    const blob = await this.exportAsVideo(canvas, durationMs);
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `recording-${timestamp}.webm`;

    const path = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'Video',
          extensions: ['webm'],
        },
      ],
    });

    if (path) {
      await writeFile(path, new Uint8Array(arrayBuffer));
      return path;
    }

    return null;
  }

  /**
   * Create animated frames preview (returns individual frame data URLs)
   */
  async createFrameSequence(
    canvas: HTMLCanvasElement,
    frames: number = 10,
    intervalMs: number = 100
  ): Promise<string[]> {
    const frameUrls: string[] = [];

    return new Promise((resolve) => {
      let count = 0;
      const interval = setInterval(() => {
        frameUrls.push(canvas.toDataURL('image/png'));
        count++;
        if (count >= frames) {
          clearInterval(interval);
          resolve(frameUrls);
        }
      }, intervalMs);
    });
  }

  // ============================================
  // Enhanced Video Recording with Quality Options
  // ============================================

  private videoRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private videoStream: MediaStream | null = null;
  private recordingOptions: VideoRecordingOptions | null = null;
  private recordingTimeout: number | null = null;

  /**
   * Get supported video formats
   */
  getSupportedFormats(): VideoFormat[] {
    const formats: VideoFormat[] = [];

    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      formats.push('webm');
    }
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      formats.push('mp4');
    }

    // Fallback - WebM is usually supported
    if (formats.length === 0 && MediaRecorder.isTypeSupported('video/webm')) {
      formats.push('webm');
    }

    return formats;
  }

  /**
   * Get default recording options
   */
  getDefaultRecordingOptions(): VideoRecordingOptions {
    return {
      resolution: '1080p',
      fps: 30,
      format: 'webm',
      quality: 'high',
      includeAudio: false,
      maxDuration: 60,
    };
  }

  /**
   * Get resolution dimensions
   */
  getResolutionDimensions(
    resolution: VideoResolution,
    customWidth?: number,
    customHeight?: number
  ): { width: number; height: number } {
    if (resolution === 'custom' && customWidth && customHeight) {
      return { width: customWidth, height: customHeight };
    }
    return RESOLUTION_PRESETS[resolution];
  }

  /**
   * Get video bitrate for quality setting
   */
  getVideoBitrate(resolution: VideoResolution, quality: VideoRecordingOptions['quality']): number {
    const resKey = resolution === 'custom' ? '1080p' : resolution;
    return QUALITY_BITRATES[resKey]?.[quality] ?? QUALITY_BITRATES['1080p'][quality];
  }

  /**
   * Start enhanced video recording with options
   */
  async startVideoRecording(
    canvas: HTMLCanvasElement,
    options: Partial<VideoRecordingOptions> = {}
  ): Promise<boolean> {
    if (this.videoRecorder && this.videoRecorder.state === 'recording') {
      console.warn('Recording already in progress');
      return false;
    }

    // Merge with defaults
    const opts: VideoRecordingOptions = {
      ...this.getDefaultRecordingOptions(),
      ...options,
    };
    this.recordingOptions = opts;

    try {
      // Get resolution
      const { width, height } = this.getResolutionDimensions(
        opts.resolution,
        opts.customWidth,
        opts.customHeight
      );

      // Create scaled canvas if resolution differs
      let sourceCanvas = canvas;
      if (width !== canvas.width || height !== canvas.height) {
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = width;
        sourceCanvas.height = height;

        // Copy content scaled
        const ctx = sourceCanvas.getContext('2d')!;
        const scale = () => {
          ctx.drawImage(canvas, 0, 0, width, height);
          if (this.videoRecorder?.state === 'recording') {
            requestAnimationFrame(scale);
          }
        };
        scale();
      }

      // Capture video stream
      const videoStream = sourceCanvas.captureStream(opts.fps);
      this.videoStream = videoStream;

      // Add audio if requested
      if (opts.includeAudio) {
        try {
          // Try to get system audio (game audio)
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
            video: false,
          });

          // Combine video and audio tracks
          const audioTrack = audioStream.getAudioTracks()[0];
          if (audioTrack) {
            videoStream.addTrack(audioTrack);
          }
        } catch (audioErr) {
          console.warn('Could not capture audio:', audioErr);
          // Continue without audio
        }
      }

      // Determine MIME type and codec
      let mimeType: string;
      if (opts.format === 'mp4') {
        mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
          ? 'video/mp4;codecs=avc1'
          : 'video/webm;codecs=vp9';
      } else {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
      }

      // Calculate bitrate
      const videoBitrate = opts.videoBitrate ?? this.getVideoBitrate(opts.resolution, opts.quality);
      const audioBitrate = opts.audioBitrate ?? 128;

      // Create MediaRecorder
      this.videoRecorder = new MediaRecorder(videoStream, {
        mimeType,
        videoBitsPerSecond: videoBitrate * 1000,
        audioBitsPerSecond: opts.includeAudio ? audioBitrate * 1000 : undefined,
      });

      this.videoChunks = [];

      this.videoRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.videoChunks.push(e.data);
        }
      };

      // Start recording
      this.videoRecorder.start(1000); // Collect data every second
      this.recordingStartTime = Date.now();

      // Set max duration timeout
      if (opts.maxDuration && opts.maxDuration > 0) {
        this.recordingTimeout = window.setTimeout(() => {
          this.stopVideoRecording();
        }, opts.maxDuration * 1000);
      }

      return true;
    } catch (err) {
      console.error('Failed to start video recording:', err);
      return false;
    }
  }

  /**
   * Stop video recording and return blob
   */
  async stopVideoRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.videoRecorder || this.videoRecorder.state !== 'recording') {
        resolve(null);
        return;
      }

      // Clear timeout
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      this.videoRecorder.onstop = () => {
        const format = this.recordingOptions?.format ?? 'webm';
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        const blob = new Blob(this.videoChunks, { type: mimeType });

        // Cleanup
        this.videoChunks = [];
        this.videoRecorder = null;
        this.recordingOptions = null;

        if (this.videoStream) {
          this.videoStream.getTracks().forEach(track => track.stop());
          this.videoStream = null;
        }

        resolve(blob);
      };

      this.videoRecorder.stop();
    });
  }

  /**
   * Get current recording status
   */
  getVideoRecordingStatus(): {
    isRecording: boolean;
    duration: number;
    format: VideoFormat | null;
    resolution: VideoResolution | null;
  } {
    const isRecording = this.videoRecorder?.state === 'recording';
    return {
      isRecording,
      duration: isRecording ? (Date.now() - this.recordingStartTime) / 1000 : 0,
      format: this.recordingOptions?.format ?? null,
      resolution: this.recordingOptions?.resolution ?? null,
    };
  }

  /**
   * Save enhanced video recording with options
   */
  async saveEnhancedVideo(
    canvas: HTMLCanvasElement,
    options: Partial<VideoRecordingOptions> = {}
  ): Promise<string | null> {
    const opts = { ...this.getDefaultRecordingOptions(), ...options };

    // Start recording
    const started = await this.startVideoRecording(canvas, opts);
    if (!started) return null;

    // Wait for duration
    const duration = (opts.maxDuration ?? 5) * 1000;
    await new Promise(resolve => setTimeout(resolve, duration));

    // Stop and get blob
    const blob = await this.stopVideoRecording();
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = opts.format === 'mp4' ? 'mp4' : 'webm';
    const defaultName = `recording-${opts.resolution}-${opts.fps}fps-${timestamp}.${extension}`;

    const path = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'Video',
          extensions: [extension],
        },
      ],
    });

    if (path) {
      await writeFile(path, new Uint8Array(arrayBuffer));
      return path;
    }

    return null;
  }

  /**
   * Quick download video (browser download)
   */
  downloadVideo(blob: Blob, filename?: string): void {
    const format = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename ?? `recording-${timestamp}.${format}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const screenCapture = new ScreenCaptureService();
