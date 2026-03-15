import { Direction, CharacterState } from '@cubicle-cat-club/shared';
import { OfficeState } from './office-state';
import { Camera } from './camera';
import { drawCat } from '../characters/cat-sprites';
import type { LoadedAssets } from './asset-loader';

/**
 * Tool badge map: emoji + tint color for each tool category.
 * Matched case-insensitively against currentTool string.
 */
const TOOL_BADGES: Array<{ keywords: string[]; emoji: string; tint: [number, number, number] }> = [
  { keywords: ['read', 'glob', 'ls', 'grep'],        emoji: '📖', tint: [32,  64,  160] },
  { keywords: ['bash'],                               emoji: '⚡', tint: [160, 64,  0]   },
  { keywords: ['edit', 'write', 'notebookedit'],      emoji: '✏️', tint: [32,  96,  32]  },
  { keywords: ['task', 'agent'],                      emoji: '🤖', tint: [96,  32,  144] },
  { keywords: ['webfetch', 'websearch'],              emoji: '🌐', tint: [16,  112, 112] },
  { keywords: ['todowrite', 'todoread'],              emoji: '📋', tint: [128, 96,  16]  },
];

function getToolBadge(tool: string): { emoji: string; tint: [number, number, number] } {
  const lower = tool.toLowerCase().replace(/\s+/g, '');
  for (const badge of TOOL_BADGES) {
    if (badge.keywords.some(k => lower.includes(k))) {
      return { emoji: badge.emoji, tint: badge.tint };
    }
  }
  return { emoji: '🔧', tint: [64, 64, 64] };
}

/**
 * Renderer handles all canvas drawing.
 * Draws Gerald's SVG office background, then characters (CATS!) and speech bubbles on top.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private officeState: OfficeState;
  private camera: Camera;
  private tileSize: number = 40;

  // Animation frame counter for sprite animations
  private animFrame: number = 0;
  // Loaded assets (null until preloaded)
  private assets: LoadedAssets | null = null;

  constructor(canvas: HTMLCanvasElement, officeState: OfficeState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.officeState = officeState;
    this.camera = new Camera();
  }

  /** Called once assets finish loading. */
  setAssets(assets: LoadedAssets): void {
    this.assets = assets;
  }

  /**
   * Main render function called each frame.
   */
  render(): void {
    // Tick animation frame
    this.animFrame++;

    // Update camera
    this.camera.update(1 / 60);

    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get active room
    const activeRoom = this.officeState.getActiveRoom();
    if (!activeRoom) return;

    // Save context state
    this.ctx.save();

    // Apply camera transform
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw SVG office background (replaces tile map + furniture rendering)
    this.drawBackground();

    // Draw characters
    for (const character of activeRoom.characters.values()) {
      this.drawCharacter(character);
    }

    // Restore context state
    this.ctx.restore();

    // Draw UI overlays (not affected by camera)
    this.drawDebugInfo();
  }

  /**
   * Draw Gerald's SVG office as the full background.
   * The SVG is 680×490 and covers the entire game world.
   */
  private drawBackground(): void {
    if (this.assets?.officeBg) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.drawImage(this.assets.officeBg, 0, 0, 680, 490);
    } else {
      // Fallback: simple colored floor until SVG loads
      this.ctx.fillStyle = '#d4b896';
      this.ctx.fillRect(0, 0, 680, 490);
    }
  }

  /**
   * Draw a character — it's a CAT!
   */
  private drawCharacter(character: {
    tileCol: number;
    tileRow: number;
    x: number;
    y: number;
    name: string;
    paletteIndex: number;
    direction: Direction;
    state: CharacterState;
    currentTool: string | null;
    animVariant: number;
  }): void {
    // Use interpolated pixel position for smooth movement
    const drawX = character.x;
    const drawY = character.y;

    // Kittens pack sprites are 32×32 — drawn at tileSize*2 × tileSize*2.
    // Center horizontally on the tile; feet land on the tile, head extends upward.
    const catOffsetX = -this.tileSize / 2;
    const catOffsetY = -this.tileSize;

    drawCat(
      this.ctx,
      drawX + catOffsetX,
      drawY + catOffsetY,
      this.tileSize,
      character.paletteIndex,
      character.direction,
      character.state,
      this.animFrame,
      this.assets,
      character.animVariant
    );

    // Draw speech bubble above the cat's head (cat top = drawY + catOffsetY)
    if (character.currentTool) {
      this.drawSpeechBubble(drawX + catOffsetX, drawY + catOffsetY - 25, character.currentTool);
    }
  }

  /**
   * Draw a speech bubble above a character with emoji tool badge + color tint.
   */
  private drawSpeechBubble(x: number, y: number, text: string): void {
    const { emoji, tint } = getToolBadge(text);
    const padding = 5;
    const lineHeight = 8;
    const emojiWidth = 14; // emoji + gap
    const maxWidth = 90;

    // Wrap text
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > 10) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => l.length * 5)));
    const bubbleWidth = textWidth + emojiWidth + padding * 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const r = 4; // corner radius

    // Draw white background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + bubbleWidth - r, y);
    this.ctx.quadraticCurveTo(x + bubbleWidth, y, x + bubbleWidth, y + r);
    this.ctx.lineTo(x + bubbleWidth, y + bubbleHeight - r);
    this.ctx.quadraticCurveTo(x + bubbleWidth, y + bubbleHeight, x + bubbleWidth - r, y + bubbleHeight);
    this.ctx.lineTo(x + 8, y + bubbleHeight);
    this.ctx.lineTo(x + 4, y + bubbleHeight + 5);
    this.ctx.lineTo(x + 4, y + bubbleHeight);
    this.ctx.quadraticCurveTo(x, y + bubbleHeight, x, y + bubbleHeight - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.fill();

    // Subtle color tint overlay
    this.ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0.12)`;
    this.ctx.fill();

    this.ctx.stroke();

    // Draw emoji badge (left side)
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(emoji, x + padding, y + bubbleHeight / 2);

    // Draw tool name text
    this.ctx.font = '6px monospace';
    this.ctx.textBaseline = 'top';

    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], x + padding + emojiWidth, y + padding + i * lineHeight);
    }
  }

  /**
   * Draw debug info (FPS, etc).
   */
  private drawDebugInfo(): void {
    const gameLoop = (window as any).__gameLoop;
    if (gameLoop) {
      this.ctx.fillStyle = '#0f0';
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`FPS: ${gameLoop.getFps()}`, 10, 20);
      this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(1)}x`, 10, 35);
    }
  }

  /**
   * Get camera reference for external control.
   */
  getCamera(): Camera {
    return this.camera;
  }
}
