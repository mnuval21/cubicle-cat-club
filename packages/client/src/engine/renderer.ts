import { TileType, Direction, CharacterState } from '@cubicle-cat-club/shared';
import { OfficeState } from './office-state';
import { Camera } from './camera';
import { drawCat, CAT_PALETTES } from '../characters/cat-sprites';

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
 * Draws the tile map, furniture, characters (CATS!), and speech bubbles.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private officeState: OfficeState;
  private camera: Camera;
  private tileSize: number = 16;

  // Animation frame counter for sprite animations
  private animFrame: number = 0;

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

    // Draw tile map
    this.drawTileMap(activeRoom.tileMap);

    // Draw furniture
    for (const furniture of activeRoom.furniture) {
      this.drawFurniture(furniture);
    }

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
   * Draw the tile map (floor and walls).
   * Desk zone (cols 1-12): cool blue-grey.
   * Cat lounge (cols 14-26): warm cream/tan.
   * Col 13 divider + walls: neutral.
   */
  private drawTileMap(tileMap: any): void {
    for (let row = 0; row < tileMap.rows; row++) {
      for (let col = 0; col < tileMap.cols; col++) {
        const tileType = tileMap.getTile(col, row);
        const x = col * this.tileSize;
        const y = row * this.tileSize;
        const inLounge = col >= 11;

        if (tileType === TileType.WALL) {
          this.ctx.fillStyle = '#3a3a5a';
        } else if (tileType === TileType.WINDOW) {
          this.drawWindowTile(x, y);
          continue;
        } else if (tileType === TileType.FLOOR) {
          this.ctx.fillStyle = inLounge ? '#3d3020' : '#2a2a4a';
        } else {
          this.ctx.fillStyle = '#1a1a2e'; // VOID
        }

        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // Subtle grid lines
        this.ctx.strokeStyle = inLounge ? '#332818' : '#1a1a3a';
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
      }
    }
  }

  /**
   * Draw a window tile — wall with a bright light patch inside.
   */
  private drawWindowTile(x: number, y: number): void {
    const ts = this.tileSize;
    // Wall base
    this.ctx.fillStyle = '#3a3a5a';
    this.ctx.fillRect(x, y, ts, ts);
    // Window glass (warm sunlight)
    this.ctx.fillStyle = '#c8e8f0';
    this.ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    // Window pane divider
    this.ctx.strokeStyle = '#8ab8c8';
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x + ts / 2, y + 2);
    this.ctx.lineTo(x + ts / 2, y + ts - 2);
    this.ctx.moveTo(x + 2, y + ts / 2);
    this.ctx.lineTo(x + ts - 2, y + ts / 2);
    this.ctx.stroke();
    // Light glow spillover
    this.ctx.fillStyle = 'rgba(200, 232, 240, 0.15)';
    this.ctx.fillRect(x - 2, y, 4, ts);
  }

  /**
   * Draw a piece of furniture.
   */
  private drawFurniture(furniture: any): void {
    const x = furniture.col * this.tileSize;
    const y = furniture.row * this.tileSize;
    const ts = this.tileSize;

    switch (furniture.type) {
      case 'desk':
        // Wooden desk top
        this.ctx.fillStyle = '#6b5540';
        this.ctx.fillRect(x, y, ts, ts);
        // Desk surface highlight
        this.ctx.fillStyle = '#7d6350';
        this.ctx.fillRect(x + 1, y + 1, ts - 2, 3);
        break;

      case 'chair':
        // Chair seat
        this.ctx.fillStyle = '#3a5080';
        this.ctx.fillRect(x + 2, y + 4, ts - 4, ts - 6);
        // Chair back
        this.ctx.fillStyle = '#2a3860';
        this.ctx.fillRect(x + 3, y, ts - 6, 5);
        break;

      case 'computer':
        // Monitor (drawn on top of desk tile — same position)
        this.ctx.fillStyle = '#1a1a2a';
        this.ctx.fillRect(x + 3, y + 1, ts - 6, ts - 7);
        // Screen glow (blue tint for coding vibes)
        this.ctx.fillStyle = '#3060c0';
        this.ctx.fillRect(x + 4, y + 2, ts - 8, ts - 10);
        // Screen text lines
        this.ctx.fillStyle = '#80c0ff';
        for (let i = 0; i < 3; i++) {
          this.ctx.fillRect(x + 5, y + 3 + i * 2, ts - 12 - (i % 2) * 2, 1);
        }
        // Monitor stand
        this.ctx.fillStyle = '#2a2a3a';
        this.ctx.fillRect(x + ts / 2 - 1, y + ts - 6, 2, 3);
        break;

      case 'plant': {
        // Terracotta pot
        this.ctx.fillStyle = '#c06030';
        this.ctx.fillRect(x + 4, y + 10, ts - 8, ts - 11);
        // Leaves
        this.ctx.fillStyle = '#2d6e30';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + 6, 5, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#3d8e40';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2 - 3, y + 8, 3, 4, -0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2 + 3, y + 8, 3, 4, 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }

      case 'cat-tree': {
        // Vertical pole
        this.ctx.fillStyle = '#8B6914';
        this.ctx.fillRect(x + 6, y, 4, ts);
        // Platform (only on base and mid tiles — check id suffix)
        const isTop = furniture.id.endsWith('-top');
        const isMid = furniture.id.endsWith('-mid');
        if (isTop) {
          // Top platform — wider, maybe a little perch
          this.ctx.fillStyle = '#a07820';
          this.ctx.fillRect(x, y + 4, ts, 4);
          // Dangling toy
          this.ctx.strokeStyle = '#c04040';
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(x + ts / 2, y + 8);
          this.ctx.lineTo(x + ts / 2, y + 14);
          this.ctx.stroke();
          this.ctx.fillStyle = '#e05050';
          this.ctx.beginPath();
          this.ctx.arc(x + ts / 2, y + 14, 1.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (isMid) {
          // Mid platform — side shelf
          this.ctx.fillStyle = '#a07820';
          this.ctx.fillRect(x - 2, y + 8, ts - 2, 3);
        } else {
          // Base — wide and stable
          this.ctx.fillStyle = '#705010';
          this.ctx.fillRect(x - 1, y + 12, ts + 2, 4);
        }
        break;
      }

      case 'cat-bed': {
        // Round cushion
        this.ctx.fillStyle = '#c05080';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + ts / 2 + 2, ts / 2 - 1, ts / 2 - 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Inner cushion
        this.ctx.fillStyle = '#e080a0';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + ts / 2 + 2, ts / 2 - 3, ts / 2 - 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Rim
        this.ctx.strokeStyle = '#902050';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + ts / 2 + 2, ts / 2 - 1, ts / 2 - 3, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      }

      case 'food-bowl': {
        // Small bowl
        this.ctx.fillStyle = '#607090';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + ts - 4, 5, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Food/water inside
        const isWater = furniture.id.endsWith('-0');
        this.ctx.fillStyle = isWater ? '#4090d0' : '#c07030';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, y + ts - 5, 3, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
    }

    // Border for desks and chairs
    if (furniture.type === 'desk' || furniture.type === 'chair') {
      this.ctx.strokeStyle = '#1a1a2a';
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeRect(x, y, ts, ts);
    }
  }

  /**
   * Draw a character — it's a CAT! 🐱
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
  }): void {
    const palette = CAT_PALETTES[character.paletteIndex % CAT_PALETTES.length];

    // Use interpolated pixel position for smooth movement
    const drawX = character.x;
    const drawY = character.y;

    // Render cats at 1.5× tile size, centered horizontally and bottom-aligned
    const catSize = this.tileSize * 1.5;
    const catOffsetX = -(catSize - this.tileSize) / 2; // center on tile
    const catOffsetY = -(catSize - this.tileSize);     // align bottom to tile bottom

    drawCat(
      this.ctx,
      drawX + catOffsetX,
      drawY + catOffsetY,
      catSize,
      palette,
      character.direction,
      character.state,
      this.animFrame
    );

    // Draw speech bubble if tool is active
    if (character.currentTool) {
      this.drawSpeechBubble(drawX + catOffsetX, drawY + catOffsetY - 8, character.currentTool);
    }
  }

  /**
   * Draw a speech bubble above a character with emoji tool badge + color tint.
   */
  private drawSpeechBubble(x: number, y: number, text: string): void {
    const { emoji, tint } = getToolBadge(text);
    const padding = 2;
    const lineHeight = 3;
    const emojiWidth = 6; // emoji + gap
    const maxWidth = 36;

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

    const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => l.length * 2)));
    const bubbleWidth = textWidth + emojiWidth + padding * 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;

    // Draw white background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;

    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, y);
    this.ctx.lineTo(x + bubbleWidth - 2, y);
    this.ctx.quadraticCurveTo(x + bubbleWidth, y, x + bubbleWidth, y + 2);
    this.ctx.lineTo(x + bubbleWidth, y + bubbleHeight - 2);
    this.ctx.quadraticCurveTo(x + bubbleWidth, y + bubbleHeight, x + bubbleWidth - 2, y + bubbleHeight);
    this.ctx.lineTo(x + 4, y + bubbleHeight);
    this.ctx.lineTo(x + 2, y + bubbleHeight + 2);
    this.ctx.lineTo(x + 2, y + bubbleHeight);
    this.ctx.quadraticCurveTo(x, y + bubbleHeight, x, y + bubbleHeight - 2);
    this.ctx.lineTo(x, y + 2);
    this.ctx.quadraticCurveTo(x, y, x + 2, y);
    this.ctx.fill();

    // Subtle color tint overlay
    this.ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0.12)`;
    this.ctx.fill();

    this.ctx.stroke();

    // Draw emoji badge (left side)
    this.ctx.font = '5px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(emoji, x + padding, y + bubbleHeight / 2);

    // Draw tool name text
    this.ctx.font = '2px monospace';
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
