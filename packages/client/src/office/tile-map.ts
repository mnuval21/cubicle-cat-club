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
   * 22x11 grid: desk zone (cols 1-9) + cat lounge (cols 11-20).
   * Col 10 is a plant divider (floor, furniture placed there separately).
   * Windows punched into top wall (row 0) and right wall (col 21).
   */
  static createDefault(): TileMap {
    const cols = 22;
    const rows = 11;
    const tiles: TileType[] = [];

    // Window positions on top wall
    const topWindows = new Set([3, 7, 13, 18]);
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

    return new TileMap(cols, rows, tiles);
  }
}
