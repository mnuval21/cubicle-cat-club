import { TileMap } from '../office/tile-map';

/**
 * Breadth-first search pathfinding algorithm.
 * Finds shortest path between two tiles on walkable terrain.
 *
 * Returns array of {col, row} tiles from start (exclusive) to end (inclusive).
 * Returns empty array if no path exists.
 */
export function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  tileMap: TileMap
): Array<{ col: number; row: number }> {
  // Quick check: is destination walkable?
  if (!tileMap.isWalkable(endCol, endRow)) {
    return [];
  }

  // Same tile - no path needed
  if (startCol === endCol && startRow === endRow) {
    return [];
  }

  // BFS
  const queue: Array<{ col: number; row: number }> = [{ col: startCol, row: startRow }];
  const visited = new Set<string>();
  const parent = new Map<string, string>();

  visited.add(`${startCol},${startRow}`);

  const directions = [
    { col: 0, row: 1 }, // DOWN
    { col: -1, row: 0 }, // LEFT
    { col: 1, row: 0 }, // RIGHT
    { col: 0, row: -1 }, // UP
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Found destination?
    if (current.col === endCol && current.row === endRow) {
      // Reconstruct path
      return reconstructPath(parent, `${endCol},${endRow}`, `${startCol},${startRow}`);
    }

    // Explore neighbors
    for (const dir of directions) {
      const newCol = current.col + dir.col;
      const newRow = current.row + dir.row;
      const key = `${newCol},${newRow}`;

      // Check bounds and if walkable
      if (
        newCol >= 0 &&
        newCol < tileMap.cols &&
        newRow >= 0 &&
        newRow < tileMap.rows &&
        tileMap.isWalkable(newCol, newRow) &&
        !visited.has(key)
      ) {
        visited.add(key);
        parent.set(key, `${current.col},${current.row}`);
        queue.push({ col: newCol, row: newRow });
      }
    }
  }

  // No path found
  return [];
}

/**
 * Reconstruct path from parent map.
 */
function reconstructPath(
  parent: Map<string, string>,
  end: string,
  start: string
): Array<{ col: number; row: number }> {
  const path: Array<{ col: number; row: number }> = [];
  let current: string | undefined = end;

  while (current !== start && current !== undefined) {
    const [col, row] = current.split(',').map(Number);
    path.unshift({ col, row });
    current = parent.get(current);
  }

  return path;
}
