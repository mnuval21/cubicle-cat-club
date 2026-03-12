import { TileMap } from './tile-map';
import { Furniture, Seat, createDefaultFurniture } from './furniture';

/**
 * Default office layout with tile map, furniture, and seats.
 */
export function createDefaultLayout(): {
  tileMap: TileMap;
  furniture: Furniture[];
  seats: Seat[];
} {
  const tileMap = TileMap.createDefault();
  const { furniture, seats } = createDefaultFurniture();

  return { tileMap, furniture, seats };
}
