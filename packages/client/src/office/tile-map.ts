import { TileType } from '@cubicle-cat-club/shared';

/**
 * TileMap represents the spatial grid of the office.
 * Each tile can be WALL, FLOOR, or VOID.
 */
export class TileMap {
  public cols: number;
  public rows: number;
  private tiles: TileType[];

  constructor(cols: number, rows: number, tiles?: TileType[]) {
    this.cols = cols;
    this.rows = rows;
    if (tiles && tiles.length === cols * rows) {
      this.tiles = [...tiles];
    } else {
      this.tiles = new Array(cols * rows).fill(TileType.VOID);
    }
  }

  /**
   * Get tile at grid position.
   */
  getTile(col: number, row: number): TileType {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return TileType.VOID;
    }
    return this.tiles[row * this.cols + col];
  }

  /**
   * Set tile at grid position.
   */
  setTile(col: number, row: number, type: TileType): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return;
    }
    this.tiles[row * this.cols + col] = type;
  }

  /**
   * Check if tile is walkable (FLOOR only).
   */
  isWalkable(col: number, row: number): boolean {
    return this.getTile(col, row) === TileType.FLOOR;
  }

  /**
   * Create a default office layout.
   * 17x12 grid (680×480 at 40px tiles) matching Gerald's SVG background.
   * Desk zone (cols 1-7) + cat lounge (cols 9-15).
   * Col 8 is the divider area.
   * Windows punched into top wall (row 0) and right wall (col 16).
   */
  static createDefault(): TileMap {
    const cols = 17;
    const rows = 12;
    const tiles: TileType[] = [];

    // Window positions on top wall (matching SVG)
    const topWindows = new Set([3, 6, 10, 14]);
    // Window positions on right wall
    const rightWindows = new Set([3, 6, 8]);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isTopWall    = row === 0;
        const isBottomWall = row === rows - 1;  // row 10
        const isLeftWall   = col === 0;
        const isRightWall  = col === cols - 1;  // col 21

        if (isTopWall) {
          tiles.push(topWindows.has(col) ? TileType.WINDOW : TileType.WALL);
        } else if (isBottomWall || isLeftWall) {
          tiles.push(TileType.WALL);
        } else if (isRightWall) {
          tiles.push(rightWindows.has(row) ? TileType.WINDOW : TileType.WALL);
        } else {
          tiles.push(TileType.FLOOR);
        }
      }
    }

    const tileMap = new TileMap(cols, rows, tiles);

    // ── Furniture collision tiles ─────────────────────────────────────────────
    // Block tiles where SVG furniture is drawn so cats path around them.
    // Chair/seat tiles are left walkable so cats can reach their seats.

    // Desks (top row: row 3, bottom row: row 7)
    for (const col of [2, 3, 4, 5, 6, 7]) {
      tileMap.setTile(col, 3, TileType.WALL);  // top desk row
      tileMap.setTile(col, 7, TileType.WALL);  // bottom desk row
    }

    // Sofa (cols 9-12, row 8)
    for (let col = 9; col <= 12; col++) {
      tileMap.setTile(col, 8, TileType.WALL);
    }

    // Cat tree trunk/platforms (cols 15-16, rows 6-9)
    for (let row = 6; row <= 9; row++) {
      tileMap.setTile(15, row, TileType.WALL);
      tileMap.setTile(16, row, TileType.WALL);
    }

    // Bookshelf (against top wall area)
    tileMap.setTile(9, 2, TileType.WALL);

    return tileMap;
  }
}
