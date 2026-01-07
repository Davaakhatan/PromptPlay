/**
 * Input Buffer
 * Handles input buffering and rollback for network games
 */

export interface InputFrame {
  frame: number;
  playerId: string;
  inputs: number; // Bitmask
  mouseX?: number;
  mouseY?: number;
  mouseButtons?: number;
  custom?: Record<string, unknown>;
  timestamp: number;
  acknowledged: boolean;
}

export class InputBuffer {
  private buffers: Map<string, InputFrame[]> = new Map();
  private bufferSize: number;
  private currentFrame = 0;

  constructor(options?: { bufferSize?: number }) {
    this.bufferSize = options?.bufferSize ?? 60;
  }

  /**
   * Add input for a player at a frame
   */
  addInput(playerId: string, frame: number, inputs: number, extra?: {
    mouseX?: number;
    mouseY?: number;
    mouseButtons?: number;
    custom?: Record<string, unknown>;
  }): void {
    if (!this.buffers.has(playerId)) {
      this.buffers.set(playerId, []);
    }

    const buffer = this.buffers.get(playerId)!;

    const inputFrame: InputFrame = {
      frame,
      playerId,
      inputs,
      mouseX: extra?.mouseX,
      mouseY: extra?.mouseY,
      mouseButtons: extra?.mouseButtons,
      custom: extra?.custom,
      timestamp: Date.now(),
      acknowledged: false,
    };

    // Insert in order
    const insertIndex = buffer.findIndex(f => f.frame > frame);
    if (insertIndex === -1) {
      buffer.push(inputFrame);
    } else {
      buffer.splice(insertIndex, 0, inputFrame);
    }

    // Trim old inputs
    while (buffer.length > this.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * Get input for a player at a frame
   */
  getInput(playerId: string, frame: number): InputFrame | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer) return null;

    return buffer.find(f => f.frame === frame) || null;
  }

  /**
   * Get latest input for a player
   */
  getLatestInput(playerId: string): InputFrame | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer || buffer.length === 0) return null;

    return buffer[buffer.length - 1];
  }

  /**
   * Get inputs for a range of frames
   */
  getInputRange(playerId: string, startFrame: number, endFrame: number): InputFrame[] {
    const buffer = this.buffers.get(playerId);
    if (!buffer) return [];

    return buffer.filter(f => f.frame >= startFrame && f.frame <= endFrame);
  }

  /**
   * Acknowledge inputs up to a frame
   */
  acknowledgeInputs(playerId: string, upToFrame: number): void {
    const buffer = this.buffers.get(playerId);
    if (!buffer) return;

    for (const frame of buffer) {
      if (frame.frame <= upToFrame) {
        frame.acknowledged = true;
      }
    }
  }

  /**
   * Get unacknowledged inputs
   */
  getUnacknowledgedInputs(playerId: string): InputFrame[] {
    const buffer = this.buffers.get(playerId);
    if (!buffer) return [];

    return buffer.filter(f => !f.acknowledged);
  }

  /**
   * Predict input for a missing frame (use last known input)
   */
  predictInput(playerId: string, frame: number): InputFrame | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer || buffer.length === 0) return null;

    // Find the most recent input before this frame
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (buffer[i].frame < frame) {
        return {
          ...buffer[i],
          frame,
          timestamp: Date.now(),
          acknowledged: false,
        };
      }
    }

    return null;
  }

  /**
   * Clear buffer for a player
   */
  clearPlayer(playerId: string): void {
    this.buffers.delete(playerId);
  }

  /**
   * Clear all buffers
   */
  clearAll(): void {
    this.buffers.clear();
  }

  /**
   * Get all player IDs with buffered inputs
   */
  getPlayerIds(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * Set current frame
   */
  setCurrentFrame(frame: number): void {
    this.currentFrame = frame;
  }

  /**
   * Get current frame
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get buffer stats
   */
  getStats(): { playerId: string; frameCount: number; oldestFrame: number; newestFrame: number }[] {
    const stats: { playerId: string; frameCount: number; oldestFrame: number; newestFrame: number }[] = [];

    for (const [playerId, buffer] of this.buffers) {
      if (buffer.length === 0) continue;

      stats.push({
        playerId,
        frameCount: buffer.length,
        oldestFrame: buffer[0].frame,
        newestFrame: buffer[buffer.length - 1].frame,
      });
    }

    return stats;
  }
}
