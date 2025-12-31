export type UpdateCallback = (deltaTime: number) => void;
export type RenderCallback = () => void;

export class GameLoop {
  private isRunning = false;
  private isPaused = false;
  private lastTime = 0;
  private animationFrameId?: number;
  private accumulator = 0;
  private readonly fixedDeltaTime = 1 / 60; // 60 FPS

  // Store callbacks for resume functionality
  private updateCallback: UpdateCallback | null = null;
  private renderCallback: RenderCallback | null = null;

  // Performance tracking
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private currentFps = 0;

  start(updateCallback: UpdateCallback, renderCallback: RenderCallback): void {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fpsUpdateTime = this.lastTime;
    this.frameCount = 0;

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      // Calculate frame time
      let frameTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Cap frame time to prevent spiral of death
      if (frameTime > 0.25) {
        frameTime = 0.25;
      }

      this.accumulator += frameTime;

      // Fixed timestep update
      while (this.accumulator >= this.fixedDeltaTime) {
        if (this.updateCallback) {
          this.updateCallback(this.fixedDeltaTime);
        }
        this.accumulator -= this.fixedDeltaTime;
      }

      // Render (can interpolate here if needed)
      if (this.renderCallback) {
        this.renderCallback();
      }

      // Update FPS counter every second
      this.frameCount++;
      if (currentTime - this.fpsUpdateTime >= 1000) {
        this.currentFps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = currentTime;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  pause(): void {
    this.isRunning = false;
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  resume(): void {
    if (this.isPaused && this.updateCallback && this.renderCallback) {
      this.lastTime = performance.now();
      this.isRunning = true;
      this.isPaused = false;

      const loop = (currentTime: number) => {
        if (!this.isRunning) return;

        let frameTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (frameTime > 0.25) {
          frameTime = 0.25;
        }

        this.accumulator += frameTime;

        while (this.accumulator >= this.fixedDeltaTime) {
          if (this.updateCallback) {
            this.updateCallback(this.fixedDeltaTime);
          }
          this.accumulator -= this.fixedDeltaTime;
        }

        if (this.renderCallback) {
          this.renderCallback();
        }

        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
          this.currentFps = this.frameCount;
          this.frameCount = 0;
          this.fpsUpdateTime = currentTime;
        }

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
    }
  }

  isPlaying(): boolean {
    return this.isRunning;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getFps(): number {
    return this.currentFps;
  }

  getFixedDeltaTime(): number {
    return this.fixedDeltaTime;
  }
}
