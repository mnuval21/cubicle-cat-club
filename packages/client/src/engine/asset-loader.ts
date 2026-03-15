/**
 * Asset loader — preloads cat sprite sheets and the SVG office background.
 * Call loadAssets() once at startup; pass the result to Renderer.setAssets().
 */

export interface LoadedAssets {
  /**
   * Kittens pack cat sprite sheets (32×32 sprites).
   * [0] = cat4  (Claude — orange tabby)
   * [1] = cat6  (Gerald — dark tuxedo-ish)
   * [2] = cat3  (dark tabby)
   * [3] = cat9  (gray and white)
   * [4] = cat11 (cream)
   * [5] = cat13 (white/silver)
   */
  cats: HTMLImageElement[];
  /** Gerald's SVG office background (680×490) */
  officeBg: HTMLImageElement;
}

const CAT_FILES = [
  '/assets/cats/cat4.png',   // 0: Claude — orange tabby
  '/assets/cats/cat6.png',   // 1: Gerald — dark / tuxedo-ish
  '/assets/cats/cat3.png',   // 2: dark tabby
  '/assets/cats/cat9.png',   // 3: gray and white
  '/assets/cats/cat11.png',  // 4: cream
  '/assets/cats/cat13.png',  // 5: white/silver
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
  const [cats, officeBg] = await Promise.all([
    Promise.all(CAT_FILES.map(src => loadImage(src))),
    loadImage('/assets/office/cubicle_cat_club_office_v4.svg'),
  ]);

  return { cats, officeBg };
}
