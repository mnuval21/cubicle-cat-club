import { TileType, Direction, CharacterState } from '@cubicle-cat-club/shared';
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

// ─── Sprite sources ──────────────────────────────────────────────────────────
//
// floors.png     288×144  (18 cols × 9 rows,  16×16 per tile)
// Furniture is drawn procedurally — no sprite sheet needed.

/** Floor sprite coords in floors.png for each zone. */
const FLOOR_SPRITE = {
  deskZone: { sx: 160, sy: 32, sw: 16, sh: 16 }, // light cream vertical-plank
  lounge:   { sx: 160, sy: 32, sw: 16, sh: 16 }, // same light cream plank throughout
};

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
  // Loaded sprite sheet images (null until assets are preloaded)
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

  /** Called once assets finish loading — enables sprite-sheet rendering. */
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
          this.ctx.fillStyle = '#4a3a28';
          this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        } else if (tileType === TileType.WINDOW) {
          this.drawWindowTile(x, y);
          continue;
        } else if (tileType === TileType.FLOOR) {
          if (this.assets) {
            const { sx, sy, sw, sh } = inLounge ? FLOOR_SPRITE.lounge : FLOOR_SPRITE.deskZone;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(this.assets.office.floors, sx, sy, sw, sh, x, y, this.tileSize, this.tileSize);
          } else {
            this.ctx.fillStyle = inLounge ? '#3d3020' : '#2a2a4a';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
          }
        } else {
          this.ctx.fillStyle = '#1a1a2e'; // VOID
          this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }

        // Subtle grid lines (skip for sprite floor — texture provides visual rhythm)
        if (tileType !== TileType.FLOOR || !this.assets) {
          this.ctx.strokeStyle = inLounge ? '#332818' : '#1a1a3a';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        }
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
   * Draw a piece of furniture — all procedural pixel art (no sprite sheets).
   */
  private drawFurniture(furniture: any): void {
    const x = furniture.col * this.tileSize;
    const y = furniture.row * this.tileSize;
    const ts = this.tileSize;

    switch (furniture.type) {
      case 'desk':
        // Wooden desk surface
        this.ctx.fillStyle = '#6b5540';
        this.ctx.fillRect(x, y, ts, ts);
        this.ctx.fillStyle = '#7d6350';
        this.ctx.fillRect(x + 1, y + 1, ts - 2, 3);
        break;

      case 'chair':
        // Office chair — seat cushion and backrest
        this.ctx.fillStyle = '#3a5080';
        this.ctx.fillRect(x + 2, y + 4, ts - 4, ts - 6);
        this.ctx.fillStyle = '#2a3860';
        this.ctx.fillRect(x + 3, y, ts - 6, 5);
        break;

      case 'computer':
        // Monitor on desk tile
        this.ctx.fillStyle = '#1a1a2a';
        this.ctx.fillRect(x + 3, y + 1, ts - 6, ts - 7);
        // Screen glow
        this.ctx.fillStyle = '#3060c0';
        this.ctx.fillRect(x + 4, y + 2, ts - 8, ts - 10);
        // Code lines
        this.ctx.fillStyle = '#80c0ff';
        for (let i = 0; i < 3; i++) {
          this.ctx.fillRect(x + 5, y + 3 + i * 2, ts - 12 - (i % 2) * 2, 1);
        }
        // Stand
        this.ctx.fillStyle = '#2a2a3a';
        this.ctx.fillRect(x + ts / 2 - 1, y + ts - 6, 2, 3);
        break;

      case 'plant':
        // Terracotta pot
        this.ctx.fillStyle = '#c06030';
        this.ctx.fillRect(x + 4, y + 10, ts - 8, ts - 11);
        // Foliage
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

      case 'cat-tree': {
        // Cat tree — extends 1 tile left and 3 tiles up from anchor
        const tx = x - ts;
        const ty = y - ts * 3;
        const tw = ts * 2;
        const th = ts * 4;
        const cx = tx + tw / 2;
        // Main post (sisal-wrapped)
        this.ctx.fillStyle = '#B08830';
        this.ctx.fillRect(cx - 2, ty + 6, 5, th - 6);
        // Base platform
        this.ctx.fillStyle = '#8B6914';
        this.ctx.fillRect(tx + 2, ty + th - 4, tw - 4, 4);
        // Middle-low platform (extends right)
        this.ctx.fillRect(cx - 1, Math.floor(ty + th * 0.65), tw / 2 + 2, 3);
        // Middle-high platform (extends left)
        this.ctx.fillRect(tx + 3, Math.floor(ty + th * 0.38), tw / 2 + 2, 3);
        // Top platform
        this.ctx.fillRect(tx + 3, ty + 6, tw - 6, 3);
        // Top cushion
        this.ctx.fillStyle = '#D0A850';
        this.ctx.fillRect(tx + 4, ty + 3, tw - 8, 4);
        break;
      }

      case 'cat-bed': {
        // Cushioned cat bed — 2×2 tiles centered on position
        const bx = x - ts / 2;
        const by = y - ts / 2;
        const bw = ts * 2;
        const bh = ts * 2;
        // Outer rim
        this.ctx.fillStyle = '#5080A0';
        this.ctx.beginPath();
        this.ctx.ellipse(bx + bw / 2, by + bh / 2 + 2, bw / 2 - 2, bh / 2 - 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Inner cushion
        this.ctx.fillStyle = '#B0D0E0';
        this.ctx.beginPath();
        this.ctx.ellipse(bx + bw / 2, by + bh / 2 + 2, bw / 2 - 5, bh / 2 - 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }

      case 'food-bowl': {
        // Water + food bowls side by side — only render from bowl-0
        if (furniture.id.endsWith('-1')) break;
        const bowlY = y + ts - 5;
        // Water bowl (left)
        this.ctx.fillStyle = '#607090';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, bowlY, 5, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#4090d0';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts / 2, bowlY - 1, 3, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Food bowl (right)
        this.ctx.fillStyle = '#607090';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts + ts / 2, bowlY, 5, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#a07040';
        this.ctx.beginPath();
        this.ctx.ellipse(x + ts + ts / 2, bowlY - 1, 3, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }

      case 'sofa': {
        // Sofa — 4 tiles wide, 2 tiles tall
        const sw = ts * 4;
        const sh = ts * 2;
        // Back
        this.ctx.fillStyle = '#6B4820';
        this.ctx.fillRect(x, y, sw, 5);
        // Main body
        this.ctx.fillStyle = '#8B6838';
        this.ctx.fillRect(x + 2, y + 3, sw - 4, sh - 4);
        // Armrests
        this.ctx.fillStyle = '#7A5828';
        this.ctx.fillRect(x, y + 3, 4, sh - 3);
        this.ctx.fillRect(x + sw - 4, y + 3, 4, sh - 3);
        // Seat cushions (3 sections)
        this.ctx.fillStyle = '#A08048';
        const cushW = Math.floor((sw - 14) / 3);
        for (let i = 0; i < 3; i++) {
          this.ctx.fillRect(x + 5 + i * (cushW + 1), y + 5, cushW, sh - 8);
        }
        break;
      }

      case 'bookshelf': {
        // Bookshelf — 2×2 tiles
        const bw = ts * 2;
        const bh = ts * 2;
        // Frame
        this.ctx.fillStyle = '#5a3a20';
        this.ctx.fillRect(x, y, bw, bh);
        // Back panel
        this.ctx.fillStyle = '#6b4a30';
        this.ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        // Shelves
        this.ctx.fillStyle = '#5a3a20';
        const shelfH = Math.floor(bh / 4);
        for (let i = 1; i <= 3; i++) {
          this.ctx.fillRect(x + 1, y + i * shelfH, bw - 2, 2);
        }
        // Books (fixed pattern — no randomness)
        const bookColors = ['#c04040', '#4060c0', '#40a040', '#c0a020', '#8040a0'];
        const widths = [3, 2, 3, 2, 2, 3, 2];
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = y + shelf * shelfH + 3;
          const sHeight = shelfH - 4;
          let bx = x + 3;
          for (let b = 0; b < widths.length && bx < x + bw - 4; b++) {
            this.ctx.fillStyle = bookColors[(shelf * 3 + b) % bookColors.length];
            this.ctx.fillRect(bx, sy, widths[b], sHeight);
            bx += widths[b] + 1;
          }
        }
        break;
      }

      case 'rug': {
        // Rug — 3×2 tiles
        const rw = ts * 3;
        const rh = ts * 2;
        // Base
        this.ctx.fillStyle = '#8B6838';
        this.ctx.fillRect(x, y, rw, rh);
        // Border
        this.ctx.strokeStyle = '#6B4820';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, rw - 2, rh - 2);
        this.ctx.strokeRect(x + 3, y + 3, rw - 6, rh - 6);
        // Diamond pattern
        this.ctx.fillStyle = '#A08048';
        this.ctx.beginPath();
        this.ctx.moveTo(x + rw / 2, y + 5);
        this.ctx.lineTo(x + rw / 2 + 8, y + rh / 2);
        this.ctx.lineTo(x + rw / 2, y + rh - 5);
        this.ctx.lineTo(x + rw / 2 - 8, y + rh / 2);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      }

      case 'wall-art': {
        // Small framed picture — fits within the wall tile (1×1)
        const artIdx = furniture.artIndex ?? 0;
        const artImg = this.assets?.wallArt[artIdx];
        const artX = x + 2;
        const artY = y - ts + 2;
        const artW = ts - 4;
        const artH = ts - 4;
        // Frame
        this.ctx.fillStyle = '#443322';
        this.ctx.fillRect(artX - 1, artY - 1, artW + 2, artH + 2);
        if (artImg) {
          this.ctx.imageSmoothingEnabled = false;
          this.ctx.drawImage(artImg, 0, 0, 32, 32, artX, artY, artW, artH);
        } else {
          // Colored placeholder
          const colors = ['#406040', '#c08040', '#a04040'];
          this.ctx.fillStyle = colors[artIdx % colors.length];
          this.ctx.fillRect(artX, artY, artW, artH);
        }
        break;
      }
    }

    // Subtle border for desk/chair grid
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
      this.drawSpeechBubble(drawX + catOffsetX, drawY + catOffsetY - 10, character.currentTool);
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
