/**
 * Asset loader — preloads sprite sheets for cats and office tileset.
 * Call loadAssets() once at startup; pass the result to Renderer.setAssets().
 */

export interface LoadedAssets {
  /**
   * Kittens pack cat sprite sheets (16×32 sprites, 16px-wide frames).
   * [0] = cat4  (Claude — orange tabby)
   * [1] = cat6  (Gerald — dark tuxedo-ish)
   * [2] = cat3  (dark tabby)
   * [3] = cat9  (gray and white)
   * [4] = cat11 (cream)
   * [5] = cat13 (white/silver)
   */
  cats: HTMLImageElement[];
  /** Penzilla office tileset */
  office: {
    floors: HTMLImageElement;
    furniture: HTMLImageElement;
  };
  /** Toffee Craft pet furniture (cat tree, bowls) */
  petFurniture: HTMLImageElement;
  /** Wall art posters (32×32 pixel art) */
  wallArt: HTMLImageElement[];
}

const CAT_FILES = [
  '/assets/cats/cat4.png',   // 0: Claude — orange tabby
  '/assets/cats/cat6.png',   // 1: Gerald — dark / tuxedo-ish
  '/assets/cats/cat3.png',   // 2: dark tabby
  '/assets/cats/cat9.png',   // 3: gray and white
  '/assets/cats/cat11.png',  // 4: cream
  '/assets/cats/cat13.png',  // 5: white/silver
];

const WALL_ART_FILES = [
  '/assets/01_ship_it_32.png',
  '/assets/02_cat_portrait_32.png',
  '/assets/03_git_force_32.png',
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<LoadedAssets> {
  const [cats, floors, furniture, petFurniture, wallArt] = await Promise.all([
    Promise.all(CAT_FILES.map(src => loadImage(src))),
    loadImage('/assets/office/floors.png'),
    loadImage('/assets/office/furniture.png'),
    loadImage('/assets/pet-furniture.png'),
    Promise.all(WALL_ART_FILES.map(src => loadImage(src))),
  ]);

  return {
    cats,
    office: { floors, furniture },
    petFurniture,
    wallArt,
  };
}
