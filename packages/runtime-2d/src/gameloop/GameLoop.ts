export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private animationFrameId?: number;
  private accumulator = 0;
  private readonly fixedDeltaTime = 1 / 60; // 60 FPS

  start(updateCallback: (deltaTime: number) => void, renderCallback: () => void): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;

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
        updateCallback(this.fixedDeltaTime);
        this.accumulator -= this.fixedDeltaTime;
      }

      // Render (can interpolate here if needed)
      renderCallback();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  pause(): void {
    this.isRunning = false;
  }

  resume(): void {
    if (!this.isRunning) {
      this.lastTime = performance.now();
      this.start(() => {}, () => {});
    }
  }

  isPlaying(): boolean {
    return this.isRunning;
  }
}
