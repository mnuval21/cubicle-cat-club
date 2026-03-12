import { Direction } from '@cubicle-cat-club/shared';

/**
 * Furniture represents a single piece of office furniture.
 */
export interface Furniture {
  id: string;
  type: 'desk' | 'chair' | 'computer' | 'plant' | 'cat-tree' | 'cat-bed' | 'food-bowl';
  col: number;
  row: number;
}

/**
 * Seat represents a position where an agent can sit and work.
 * Associated with a desk in the desk zone (cols 1-12).
 */
export interface Seat {
  furnitureId: string;
  col: number;
  row: number;
  facingDir: Direction;
  assignedAgentId: string | null;
}

/**
 * Create default furniture for the two-zone office (28×14 grid).
 *
 * LEFT ZONE  (cols 1–9):   6 desks in a 3×2 grid, computers, plants
 * DIVIDER    (col 10):     column of plants
 * RIGHT ZONE (cols 11–20): cat lounge — cat tree, beds, food bowls, plants
 */
export function createDefaultFurniture(): { furniture: Furniture[]; seats: Seat[] } {
  const furniture: Furniture[] = [];
  const seats: Seat[] = [];

  // ── DESK ZONE ────────────────────────────────────────────────────────────
  // 3 columns × 2 rows of desks.  Chairs sit one row below each desk.
  // Desk cols: 2, 5, 8   Desk rows: 2, 6
  const deskCols = [2, 5, 8];
  const deskRows = [2, 6];
  let deskIdx = 0;

  for (const deskRow of deskRows) {
    for (const deskCol of deskCols) {
      const deskId  = `desk-${deskIdx}`;
      const chairId = `chair-${deskIdx}`;
      const compId  = `computer-${deskIdx}`;

      furniture.push({ id: deskId,  type: 'desk',     col: deskCol, row: deskRow });
      furniture.push({ id: chairId, type: 'chair',    col: deskCol, row: deskRow + 1 });
      furniture.push({ id: compId,  type: 'computer', col: deskCol, row: deskRow });

      seats.push({
        furnitureId: chairId,
        col: deskCol,
        row: deskRow + 1,
        facingDir: Direction.UP,
        assignedAgentId: null,
      });

      deskIdx++;
    }
  }

  // Plants along left wall — just top and bottom corners
  const deskZonePlants = [
    { col: 1, row: 1 },
    { col: 1, row: 9 },
  ];
  for (const pos of deskZonePlants) {
    furniture.push({ id: `plant-dz-${pos.col}-${pos.row}`, type: 'plant', col: pos.col, row: pos.row });
  }

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  // Single plant at mid-divider
  furniture.push({ id: 'plant-div-5', type: 'plant', col: 10, row: 5 });

  // ── CAT LOUNGE ────────────────────────────────────────────────────────────

  // Cat tree — prominent centerpiece at col 16, rows 2–4
  furniture.push({ id: 'cat-tree-base', type: 'cat-tree', col: 16, row: 4 });
  furniture.push({ id: 'cat-tree-mid',  type: 'cat-tree', col: 16, row: 3 });
  furniture.push({ id: 'cat-tree-top',  type: 'cat-tree', col: 16, row: 2 });

  // Cat beds
  furniture.push({ id: 'cat-bed-0', type: 'cat-bed', col: 12, row: 3 });
  furniture.push({ id: 'cat-bed-1', type: 'cat-bed', col: 19, row: 7 });

  // Food bowls (water + food side by side)
  furniture.push({ id: 'food-bowl-0', type: 'food-bowl', col: 14, row: 8 });
  furniture.push({ id: 'food-bowl-1', type: 'food-bowl', col: 15, row: 8 });

  // Plants in the cat lounge — just a couple of corners
  const loungePlants = [
    { col: 20, row: 2 },
    { col: 20, row: 9 },
    { col: 12, row: 9 },
  ];
  for (const pos of loungePlants) {
    furniture.push({ id: `plant-cl-${pos.col}-${pos.row}`, type: 'plant', col: pos.col, row: pos.row });
  }

  return { furniture, seats };
}
