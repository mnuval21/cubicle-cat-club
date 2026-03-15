import { Direction } from '@cubicle-cat-club/shared';

/**
 * Furniture represents a single piece of office furniture.
 * With the SVG background, furniture items are only used for seat/collision data —
 * the SVG handles all visual rendering.
 */
export interface Furniture {
  id: string;
  type: 'desk' | 'chair' | 'cat-tree';
  col: number;
  row: number;
}

/**
 * Seat represents a position where an agent can sit and work.
 * 'desk' seats are in the work zone; 'lounge' seats are in the cat lounge.
 */
export interface Seat {
  furnitureId: string;
  col: number;
  row: number;
  facingDir: Direction;
  assignedAgentId: string | null;
  seatType?: 'desk' | 'lounge';
}

/**
 * Create furniture and seat data matching Gerald's SVG office (17×12 grid, 40px tiles).
 *
 * The SVG background (680×490) draws all furniture visually.
 * This function only defines seat positions so cats know where to sit.
 *
 * SVG desk layout: 2 columns × 2 rows of desks.
 *   Top row:    cols ~3, ~6   row ~3
 *   Bottom row: cols ~3, ~6   row ~8
 * Cat tree:     col ~15       row ~6
 */
export function createDefaultFurniture(): { furniture: Furniture[]; seats: Seat[] } {
  const furniture: Furniture[] = [];
  const seats: Seat[] = [];

  // ── DESK ZONE ────────────────────────────────────────────────────────────
  // 2 columns × 2 rows of desks matching SVG positions.
  // Chairs sit one row below each desk.
  const deskCols = [3, 6];
  const deskRows = [3, 8];
  let deskIdx = 0;

  for (const deskRow of deskRows) {
    for (const deskCol of deskCols) {
      const deskId  = `desk-${deskIdx}`;
      const chairId = `chair-${deskIdx}`;

      furniture.push({ id: deskId,  type: 'desk',  col: deskCol, row: deskRow });
      furniture.push({ id: chairId, type: 'chair', col: deskCol, row: deskRow + 1 });

      seats.push({
        furnitureId: chairId,
        col: deskCol,
        row: deskRow + 1,
        facingDir: Direction.UP,
        assignedAgentId: null,
        seatType: 'desk',
      });

      deskIdx++;
    }
  }

  // ── CAT LOUNGE ────────────────────────────────────────────────────────────
  // Cat tree — drawn by SVG, but we need a seat for Gerald
  furniture.push({ id: 'cat-tree', type: 'cat-tree', col: 15, row: 6 });

  // Gerald's lounge perch — at the cat tree top
  // Filled last, so Gerald appears only when there are 5+ concurrent agents.
  seats.push({
    furnitureId: 'cat-tree',
    col: 15,
    row: 5,
    facingDir: Direction.DOWN,
    assignedAgentId: null,
    seatType: 'lounge',
  });

  return { furniture, seats };
}
