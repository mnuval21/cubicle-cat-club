/**
 * Camera manages viewport offset and zoom level.
 * Converts between screen coordinates and world coordinates.
 */
export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 3;
  public targetX: number = 0;
  public targetY: number = 0;
  private lerpSpeed: number = 5;

  /**
   * Update camera position via smooth lerp to target.
   */
  update(dt: number): void {
    // Lerp towards target
    const moveX = this.targetX - this.x;
    const moveY = this.targetY - this.y;
    const distance = Math.sqrt(moveX * moveX + moveY * moveY);

    if (distance > 1) {
      const speed = this.lerpSpeed;
      this.x += (moveX / distance) * speed * dt * 60;
      this.y += (moveY / distance) * speed * dt * 60;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX + this.x) / this.zoom,
      y: (screenY + this.y) / this.zoom,
    };
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom - this.x,
      y: worldY * this.zoom - this.y,
    };
  }

  /**
   * Set the camera target to follow.
   */
  setTarget(targetX: number, targetY: number): void {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  /**
   * Zoom in.
   */
  zoomIn(): void {
    this.zoom = Math.min(this.zoom + 1, 10);
  }

  /**
   * Zoom out.
   */
  zoomOut(): void {
    this.zoom = Math.max(this.zoom - 1, 1);
  }
}
