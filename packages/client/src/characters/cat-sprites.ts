import { CharacterState, Direction } from '@cubicle-cat-club/shared';
import type { LoadedAssets } from '../engine/asset-loader';

// ─── Kittens pack sprite sheet layout ────────────────────────────────────────
//
// All cat sheets (e.g. cat4.png) share this layout:
//   • Frame size:   32×32 px
//   • Sheet size:   352×1696 px  (11 cols × 53 rows)
//
// Palette → cat sheet:
//   [0] cat4  — Claude (orange tabby)
//   [1] cat6  — Gerald (dark / tuxedo-ish)
//   [2] cat3  — dark tabby
//   [3] cat9  — gray and white
//   [4] cat11 — cream
//   [5] cat13 — white / silver

const SPRITE_W = 32;
const SPRITE_H = 32;

interface AnimInfo {
  row: number;
  frames: number;
}

// ─── Animation row definitions ───────────────────────────────────────────────
// States with multiple rows pick one randomly via the character's animVariant.

const IDLE_ROWS: AnimInfo[] = [
  { row: 36, frames: 9 },
  { row: 38, frames: 7 },
  { row: 39, frames: 11 },
  { row: 40, frames: 11 },
  //{ row: 28, frames: 3 },
  //{ row: 30, frames: 3 },
  //{ row: 31, frames: 3 },
  // { row: 33, frames: 8 },
  //{ row: 34, frames: 8 },
];

const TYPE_ROWS: AnimInfo[] = [
  { row: 0, frames: 6 },   // only frame index 1 is used (cat facing away)
  { row: 1, frames: 8 },
];

const NAP_ROWS: AnimInfo[] = [
  { row: 16, frames: 2 },
  { row: 17, frames: 2 },
  { row: 18, frames: 2 },
  { row: 19, frames: 2 },
];

const STRETCH_ROWS: AnimInfo[] = [
  { row: 41, frames: 2 },
  { row: 42, frames: 2 },
];

const KNOCK_ROWS: AnimInfo[] = [
  { row: 44, frames: 9 },
  { row: 48, frames: 9 },
  { row: 49, frames: 9 },
];

const WALK = {
  DOWN: { row: 4, frames: 4 } as AnimInfo,
  UP: { row: 5, frames: 4 } as AnimInfo,
  RIGHT: { row: 6, frames: 8 } as AnimInfo,
  LEFT: { row: 7, frames: 8 } as AnimInfo,
};

const ZOOMIES_DOWN: AnimInfo[] = [
  { row: 8, frames: 4 },
  { row: 9, frames: 4 },
];

const ZOOMIES_UP: AnimInfo[] = [
  { row: 10, frames: 4 },
  { row: 11, frames: 4 },
];

const DANGLE: AnimInfo = { row: 43, frames: 1 };

function pickVariant(rows: AnimInfo[], variant: number): AnimInfo {
  return rows[Math.floor(variant * rows.length) % rows.length];
}

function getAnim(state: CharacterState, direction: Direction, animVariant: number): AnimInfo {
  switch (state) {
    case CharacterState.IDLE:
      return pickVariant(IDLE_ROWS, animVariant);
    case CharacterState.TYPE:
      return pickVariant(TYPE_ROWS, animVariant);
    case CharacterState.NAP:
      return pickVariant(NAP_ROWS, animVariant);
    case CharacterState.STRETCH:
      return pickVariant(STRETCH_ROWS, animVariant);
    case CharacterState.KNOCK:
      return pickVariant(KNOCK_ROWS, animVariant);
    case CharacterState.DANGLE:
      return DANGLE;
    case CharacterState.ZOOMIES:
      if (direction === Direction.DOWN) return pickVariant(ZOOMIES_DOWN, animVariant);
      if (direction === Direction.UP) return pickVariant(ZOOMIES_UP, animVariant);
      if (direction === Direction.LEFT) return WALK.LEFT;
      return WALK.RIGHT;
    case CharacterState.WALK:
      if (direction === Direction.DOWN) return WALK.DOWN;
      if (direction === Direction.UP) return WALK.UP;
      if (direction === Direction.LEFT) return WALK.LEFT;
      return WALK.RIGHT;
    default:
      return pickVariant(IDLE_ROWS, animVariant);
  }
}

/** Frame index within the animation, based on state and running animFrame counter. */
function getFrame(state: CharacterState, anim: AnimInfo, animFrame: number): number {
  switch (state) {
    case CharacterState.TYPE: return 1;  // fixed: cat facing away
    case CharacterState.DANGLE: return 0;
    case CharacterState.WALK: return Math.floor(animFrame / 6) % anim.frames;
    case CharacterState.ZOOMIES: return Math.floor(animFrame / 4) % anim.frames;
    case CharacterState.KNOCK: return Math.floor(animFrame / 6) % anim.frames;
    case CharacterState.NAP: return Math.floor(animFrame / 100) % anim.frames;
    case CharacterState.STRETCH: return Math.floor(animFrame / 20) % anim.frames;
    default: return 0;
  }
}

// ─── Main draw function ───────────────────────────────────────────────────────

/**
 * Draw a cat using the Kittens pack sprite sheets.
 * Sprites are 32×32 — drawn at tileSize*2 wide × tileSize*2 tall.
 * Falls back to a colored dot if assets aren't loaded yet.
 */
export function drawCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  paletteIndex: number,
  direction: Direction,
  state: CharacterState,
  animFrame: number,
  assets: LoadedAssets | null,
  animVariant: number = 0
): void {
  if (!assets) {
    // Placeholder colored dot while assets load
    const p = CAT_PALETTES[paletteIndex % CAT_PALETTES.length];
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x + tileSize / 2, y + tileSize, tileSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const sheet = assets.cats[paletteIndex % assets.cats.length];
  if (!sheet) return;

  const anim = getAnim(state, direction, animVariant);
  const frame = getFrame(state, anim, animFrame);
  const srcX = frame * SPRITE_W;
  const srcY = anim.row * SPRITE_H;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, srcX, srcY, SPRITE_W, SPRITE_H, x, y, tileSize * 2, tileSize * 2);
  ctx.restore();
}

// ─── Palette system (used as placeholder colors while assets load) ────────────

export interface CatPalette {
  color: string;  // representative dot color for loading fallback
}

export const CAT_PALETTES: CatPalette[] = [
  { color: '#E8923A' }, // 0: Claude — orange
  { color: '#2A2A2A' }, // 1: Gerald — dark
  { color: '#5A4030' }, // 2: dark tabby
  { color: '#8090A8' }, // 3: gray-white
  { color: '#E8D8B8' }, // 4: cream
  { color: '#E0E0E0' }, // 5: white/silver
];
