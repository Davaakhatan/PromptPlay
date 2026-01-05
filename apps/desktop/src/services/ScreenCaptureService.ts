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
}

// Singleton instance
export const screenCapture = new ScreenCaptureService();
