import { OfficeState } from './office-state';
import { Renderer } from './renderer';
import type { LoadedAssets } from './asset-loader';

/**
 * GameLoop manages the render loop and frame timing.
 * Coordinates state updates and rendering each frame.
 */
export class GameLoop {
  private officeState: OfficeState;
  private renderer: Renderer;
  private running: boolean = false;
  private frameId: number | null = null;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsSampleTime: number = 0;

  constructor(canvas: HTMLCanvasElement, officeState: OfficeState) {
    this.officeState = officeState;
    this.renderer = new Renderer(canvas, officeState);
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.fpsSampleTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /**
   * Get current FPS for debugging.
   */
  getFps(): number {
    return this.fps;
  }

  /**
   * Get the renderer (for camera access).
   */
  getRenderer(): Renderer {
    return this.renderer;
  }

  /** Pass loaded assets to the renderer so sprite-sheet drawing is enabled. */
  setAssets(assets: LoadedAssets): void {
    this.renderer.setAssets(assets);
  }

  /**
   * Main loop: called each frame via requestAnimationFrame.
   */
  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = now;

    // Cap delta time at 100ms to prevent jumps
    if (dt > 0.1) {
      dt = 0.1;
    }

    // Update game state
    this.officeState.update(dt);

    // Render
    this.renderer.render();

    // FPS calculation
    this.frameCount++;
    if (now - this.fpsSampleTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsSampleTime = now;
    }

    this.frameId = requestAnimationFrame(this.loop);
  };
}
