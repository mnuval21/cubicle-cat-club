import { Direction } from '@cubicle-cat-club/shared';

/**
 * Furniture represents a single piece of office furniture.
 */
export interface Furniture {
  id: string;
  type: 'desk' | 'chair' | 'computer' | 'plant' | 'cat-tree' | 'cat-bed' | 'food-bowl' | 'sofa' | 'bookshelf' | 'rug' | 'wall-art';
  col: number;
  row: number;
  /** Flip sprite vertically (for sofas facing toward the viewer instead of away) */
  flipY?: boolean;
  /** For wall-art: which poster index (0=ship_it, 1=cat_portrait, 2=git_force) */
  artIndex?: number;
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
        seatType: 'desk',
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

  // Wall art — small framed pictures hung on the wall (row 0).
  // Placed between windows (windows at cols 3, 7, 13, 18) to avoid overlap.
  furniture.push({ id: 'wall-art-0', type: 'wall-art', col: 5,  row: 1, artIndex: 0 }); // ship it!
  furniture.push({ id: 'wall-art-1', type: 'wall-art', col: 9,  row: 1, artIndex: 1 }); // cat portrait
  furniture.push({ id: 'wall-art-2', type: 'wall-art', col: 15, row: 1, artIndex: 2 }); // git force

  // Bookshelf against left wall between desk rows
  furniture.push({ id: 'bookshelf-desk', type: 'bookshelf', col: 1, row: 4 });

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  // Single plant at mid-divider
  furniture.push({ id: 'plant-div-5', type: 'plant', col: 10, row: 5 });

  // ── CAT LOUNGE ────────────────────────────────────────────────────────────

  // Cat tree — single item rendered as 2×4 tiles from base position
  furniture.push({ id: 'cat-tree', type: 'cat-tree', col: 16, row: 4 });

  // Bookshelf against top wall
  furniture.push({ id: 'bookshelf-lounge', type: 'bookshelf', col: 11, row: 1 });

  // Sofa — 4 tiles wide, facing viewer
  furniture.push({ id: 'sofa-lounge', type: 'sofa', col: 11, row: 3 });

  // Rug in center of lounge
  furniture.push({ id: 'rug-lounge', type: 'rug', col: 13, row: 5 });

  // Cat beds
  furniture.push({ id: 'cat-bed-0', type: 'cat-bed', col: 18, row: 4 });
  furniture.push({ id: 'cat-bed-1', type: 'cat-bed', col: 12, row: 7 });

  // Food & water bowls
  furniture.push({ id: 'food-bowl-0', type: 'food-bowl', col: 18, row: 7 });
  furniture.push({ id: 'food-bowl-1', type: 'food-bowl', col: 19, row: 7 });

  // Plants — corners
  const loungePlants = [
    { col: 20, row: 2 },
    { col: 20, row: 9 },
    { col: 12, row: 9 },
  ];
  for (const pos of loungePlants) {
    furniture.push({ id: `plant-cl-${pos.col}-${pos.row}`, type: 'plant', col: pos.col, row: pos.row });
  }

  // Gerald's lounge perch — at the cat tree top (col 16, row 2)
  // Filled last, so Gerald appears only when there are 7+ concurrent agents.
  seats.push({
    furnitureId: 'cat-tree',
    col: 16,
    row: 2,
    facingDir: Direction.DOWN,
    assignedAgentId: null,
    seatType: 'lounge',
  });

  return { furniture, seats };
}
