import { CharacterState, Direction } from '@cubicle-cat-club/shared';

/**
 * Cat fur palettes — each agent gets a unique coat.
 * Colors: fur (main), accent (belly/face), ears (inner ear pink), nose
 */
export interface CatPalette {
  fur: string;
  accent: string;
  earInner: string;
  nose: string;
  eyes: string;
  outline: string; // dark edge color (~50% darker than fur)
}

export const CAT_PALETTES: CatPalette[] = [
  // 0: Orange tabby — Claude's exclusive coat
  { fur: '#E8923A', accent: '#F5D4A0', earInner: '#E87D7D', nose: '#E87D7D', eyes: '#5A8F3A', outline: '#7a3e10' },
  // 1: Tuxedo — Gerald's exclusive coat (grey nose, no pink)
  { fur: '#2A2A2A', accent: '#F0F0F0', earInner: '#cccccc', nose: '#888888', eyes: '#7BBF4A', outline: '#111111' },
  // 2: Russian Blue — cool silver-grey with golden eyes
  { fur: '#6B7B8A', accent: '#A0B0C0', earInner: '#D4A0B0', nose: '#8A6B7B', eyes: '#FFD700', outline: '#2e3840' },
  // 3: Silver Tabby — cool grey with soft teal eyes
  { fur: '#9BA8B0', accent: '#D0DCE8', earInner: '#E0A8B8', nose: '#B07888', eyes: '#70BFA0', outline: '#48565e' },
  // 4: Siamese — cream with warm brown points
  { fur: '#F0E8D8', accent: '#8B7355', earInner: '#D4A0B0', nose: '#8B7355', eyes: '#4A8BE0', outline: '#7a6040' },
  // 5: Chocolate Brown — rich warm brown with green eyes
  { fur: '#7B5030', accent: '#C89870', earInner: '#D49080', nose: '#C07868', eyes: '#80AF40', outline: '#3a2010' },
];

/**
 * Pixel-art cat renderer.
 * Draws 16x16 tile-sized cats with direction and state awareness.
 * Each "pixel" in the sprite grid = 1 canvas pixel at base zoom.
 */
export function drawCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  palette: CatPalette,
  direction: Direction,
  state: CharacterState,
  animFrame: number
): void {
  // Scale factor: our sprite data is 16x16, tileSize might differ
  const s = tileSize / 16;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Mirror horizontally for LEFT direction
  if (direction === Direction.LEFT) {
    ctx.translate(16, 0);
    ctx.scale(-1, 1);
    // Draw as RIGHT (which is the default facing)
    drawCatSprite(ctx, palette, Direction.RIGHT, state, animFrame);
  } else {
    drawCatSprite(ctx, palette, direction, state, animFrame);
  }

  ctx.restore();
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCatSprite(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  direction: Direction,
  state: CharacterState,
  animFrame: number
): void {
  if (state === CharacterState.TYPE) {
    drawCatTyping(ctx, p, animFrame);
  } else if (state === CharacterState.WALK || state === CharacterState.ZOOMIES) {
    drawCatWalking(ctx, p, direction, animFrame);
  } else if (state === CharacterState.STRETCH) {
    drawCatStretching(ctx, p, animFrame);
  } else if (state === CharacterState.NAP) {
    drawCatNapping(ctx, p, animFrame);
  } else if (state === CharacterState.KNOCK) {
    drawCatKnocking(ctx, p, animFrame);
  } else if (state === CharacterState.DANGLE) {
    drawCatDangling(ctx, p, animFrame);
  } else {
    drawCatIdle(ctx, p, direction, animFrame);
  }
}

/**
 * IDLE cat — sitting, facing a direction, occasional tail flick.
 * 16x16 grid. Cat sits in bottom ~12 rows, ears poke up.
 */
function drawCatIdle(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  direction: Direction,
  animFrame: number
): void {
  const tailFlick = animFrame % 60 < 30;

  if (direction === Direction.DOWN || direction === Direction.RIGHT) {
    // Front/side-facing idle sit

    // Ears (row 2-4)
    px(ctx, 3, 2, 2, 2, p.fur);
    px(ctx, 4, 3, 1, 1, p.earInner);
    px(ctx, 11, 2, 2, 2, p.fur);
    px(ctx, 11, 3, 1, 1, p.earInner);
    // Ear outlines (bottom edge)
    px(ctx, 3, 4, 2, 1, p.outline);
    px(ctx, 11, 4, 2, 1, p.outline);

    // Head (row 4-8) with top highlight + bottom outline
    px(ctx, 4, 4, 8, 5, p.fur);
    px(ctx, 5, 5, 6, 3, p.accent);
    px(ctx, 5, 4, 6, 1, p.accent);   // head top highlight
    px(ctx, 4, 9, 8, 1, p.outline);  // head bottom outline

    // Better eyes: white → iris → pupil (bottom-right = relaxed gaze)
    px(ctx, 5, 5, 1, 1, '#e8f4f0');  // L eye white
    px(ctx, 6, 5, 1, 1, p.eyes);     // L iris
    px(ctx, 6, 6, 1, 1, '#111');     // L pupil
    px(ctx, 5, 5, 1, 1, '#ffffff');  // L highlight dot (overdrawn top-left)
    px(ctx, 9, 5, 1, 1, '#e8f4f0');  // R eye white
    px(ctx, 10, 5, 1, 1, p.eyes);    // R iris
    px(ctx, 10, 6, 1, 1, '#111');    // R pupil
    px(ctx, 9, 5, 1, 1, '#ffffff');  // R highlight dot

    // Nose
    px(ctx, 7, 7, 2, 1, p.nose);
    // Mouth: neutral smile (two upturn dots)
    px(ctx, 6, 8, 1, 1, p.nose);
    px(ctx, 9, 8, 1, 1, p.nose);

    // Body (row 9-14) with bottom shadow
    px(ctx, 3, 9, 10, 5, p.fur);
    px(ctx, 5, 10, 6, 3, p.accent);
    px(ctx, 3, 13, 1, 1, p.outline); // body bottom shadow left
    px(ctx, 12, 13, 1, 1, p.outline);

    // Front paws with underside outline
    px(ctx, 3, 13, 3, 1, p.accent);
    px(ctx, 10, 13, 3, 1, p.accent);
    px(ctx, 3, 14, 3, 1, p.outline);  // L paw underside
    px(ctx, 10, 14, 3, 1, p.outline); // R paw underside

    // Tail with tip outline
    if (tailFlick) {
      px(ctx, 13, 10, 2, 1, p.fur);
      px(ctx, 14, 9, 1, 1, p.fur);
      px(ctx, 15, 9, 1, 1, p.outline); // tail tip
    } else {
      px(ctx, 13, 11, 2, 1, p.fur);
      px(ctx, 14, 10, 1, 1, p.fur);
      px(ctx, 15, 10, 1, 1, p.outline);
    }
  } else {
    // Back-facing idle (UP)
    px(ctx, 3, 2, 2, 2, p.fur);
    px(ctx, 4, 3, 1, 1, p.earInner);
    px(ctx, 11, 2, 2, 2, p.fur);
    px(ctx, 11, 3, 1, 1, p.earInner);
    px(ctx, 3, 4, 2, 1, p.outline);
    px(ctx, 11, 4, 2, 1, p.outline);

    // Head (back)
    px(ctx, 4, 4, 8, 5, p.fur);
    px(ctx, 4, 9, 8, 1, p.outline);

    // Body
    px(ctx, 3, 9, 10, 5, p.fur);

    // Tail (curling up from behind)
    if (tailFlick) {
      px(ctx, 7, 7, 2, 2, p.fur);
      px(ctx, 8, 6, 1, 1, p.fur);
      px(ctx, 8, 5, 1, 1, p.outline);
    } else {
      px(ctx, 7, 8, 2, 1, p.fur);
      px(ctx, 8, 7, 1, 1, p.fur);
      px(ctx, 8, 6, 1, 1, p.outline);
    }

    // Back paws
    px(ctx, 3, 13, 3, 1, p.accent);
    px(ctx, 10, 13, 3, 1, p.accent);
    px(ctx, 3, 14, 3, 1, p.outline);
    px(ctx, 10, 14, 3, 1, p.outline);
  }
}

/**
 * WALKING cat — side profile with proper stride animation.
 * 24-frame cycle: two full steps. Front and back legs are in opposite phase,
 * each shifting horizontally to sell the stride (not just bouncing vertically).
 */
function drawCatWalking(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  _direction: Direction,
  animFrame: number
): void {
  const walkCycle = animFrame % 24;

  // Body dips at mid-stride (between each footfall at frames 6 and 18)
  const bobY = (walkCycle >= 4 && walkCycle < 8) || (walkCycle >= 16 && walkCycle < 20) ? 1 : 0;

  // Step 1 (0-11): front leg swings forward, back leg pushes back
  // Step 2 (12-23): legs swap — proper alternating stride
  const step1 = walkCycle < 12;
  const frontLegX = step1 ? 11 : 9; // front paw shifts forward/back by 2px
  const backLegX  = step1 ? 3  : 5; // back paw is opposite phase

  // Tail swishes up on step 1, down on step 2
  const tailUp = step1;

  // Body (horizontal walking pose) — solid fur, no belly patch in side view
  px(ctx, 3, 5 + bobY, 9, 5, p.fur);
  px(ctx, 3, 10 + bobY, 9, 1, p.outline); // body bottom shadow

  // Ears
  px(ctx, 9,  1 + bobY, 2, 2, p.fur);
  px(ctx, 10, 2 + bobY, 1, 1, p.earInner);
  px(ctx, 12, 1 + bobY, 2, 2, p.fur);
  px(ctx, 12, 2 + bobY, 1, 1, p.earInner);
  px(ctx, 9,  3 + bobY, 2, 1, p.outline);
  px(ctx, 12, 3 + bobY, 2, 1, p.outline);

  // Head — solid fur in side view
  px(ctx, 9,  3 + bobY, 5, 4, p.fur);

  // Eye: forward-looking alert gaze
  px(ctx, 12, 4 + bobY, 1, 1, '#e8f4f0');
  px(ctx, 13, 4 + bobY, 1, 1, p.eyes);
  px(ctx, 13, 4 + bobY, 1, 1, '#111');
  px(ctx, 12, 4 + bobY, 1, 1, '#ffffff');

  // Nose + focused mouth
  px(ctx, 13, 5 + bobY, 1, 1, p.nose);
  px(ctx, 13, 6 + bobY, 2, 1, p.nose);

  // Front leg — strides forward/back via x position
  px(ctx, frontLegX, 10 + bobY, 2, 4, p.fur);
  px(ctx, frontLegX, 14 + bobY, 2, 1, p.outline);

  // Back leg — opposite phase
  px(ctx, backLegX, 10 + bobY, 2, 4, p.fur);
  px(ctx, backLegX, 14 + bobY, 2, 1, p.outline);

  // Tail swishes up/down with each step
  if (tailUp) {
    px(ctx, 1, 3 + bobY, 3, 1, p.fur);
    px(ctx, 0, 2 + bobY, 1, 1, p.fur);
    px(ctx, 0, 1 + bobY, 1, 1, p.outline);
  } else {
    px(ctx, 1, 5 + bobY, 3, 1, p.fur);
    px(ctx, 0, 6 + bobY, 1, 1, p.fur);
    px(ctx, 0, 7 + bobY, 1, 1, p.outline);
  }
}

/**
 * STRETCHING cat — front paws extended forward, back arched.
 * 2-frame animation: full stretch → release.
 */
function drawCatStretching(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  animFrame: number
): void {
  const fullyStretched = animFrame % 60 < 40; // hold stretch longer than release

  // Ears
  px(ctx, 3, 2, 2, 2, p.fur);
  px(ctx, 4, 3, 1, 1, p.earInner);
  px(ctx, 11, 2, 2, 2, p.fur);
  px(ctx, 11, 3, 1, 1, p.earInner);

  if (fullyStretched) {
    // Head dipped down during stretch
    px(ctx, 4, 6, 8, 4, p.fur);
    px(ctx, 5, 7, 6, 2, p.accent);
    // Better eyes
    px(ctx, 5, 7, 1, 1, '#e8f4f0'); px(ctx, 6, 7, 1, 1, p.eyes); px(ctx, 6, 8, 1, 1, '#111'); px(ctx, 5, 7, 1, 1, '#ffffff');
    px(ctx, 9, 7, 1, 1, '#e8f4f0'); px(ctx, 10, 7, 1, 1, p.eyes); px(ctx, 10, 8, 1, 1, '#111'); px(ctx, 9, 7, 1, 1, '#ffffff');
    // Yawn mouth (open, 3px wide with dark center)
    px(ctx, 6, 9, 3, 1, p.nose);
    px(ctx, 7, 9, 1, 1, '#333');

    // Body: butt high, front low — classic cat stretch
    px(ctx, 3, 10, 10, 3, p.fur);
    px(ctx, 5, 11, 5, 2, p.accent);
    px(ctx, 3, 13, 10, 1, p.outline); // body bottom shadow

    // Front paws stretched waaay out
    px(ctx, 0, 11, 4, 1, p.fur);
    px(ctx, 0, 12, 3, 1, p.accent);
    px(ctx, 0, 13, 3, 1, p.outline); // paw underside

    // Back elevated
    px(ctx, 12, 8, 2, 3, p.fur);
  } else {
    // Coming back to sit
    px(ctx, 4, 5, 8, 4, p.fur);
    px(ctx, 5, 6, 6, 2, p.accent);
    px(ctx, 5, 6, 1, 1, '#e8f4f0'); px(ctx, 6, 6, 1, 1, p.eyes); px(ctx, 6, 7, 1, 1, '#111'); px(ctx, 5, 6, 1, 1, '#ffffff');
    px(ctx, 9, 6, 1, 1, '#e8f4f0'); px(ctx, 10, 6, 1, 1, p.eyes); px(ctx, 10, 7, 1, 1, '#111'); px(ctx, 9, 6, 1, 1, '#ffffff');
    // Relaxed yawn (smaller)
    px(ctx, 6, 9, 3, 1, p.nose);
    px(ctx, 7, 9, 1, 1, '#333');

    px(ctx, 3, 9, 10, 5, p.fur);
    px(ctx, 5, 10, 6, 3, p.accent);
    px(ctx, 3, 13, 3, 1, p.accent);
    px(ctx, 10, 13, 3, 1, p.accent);
    px(ctx, 3, 14, 3, 1, p.outline);
    px(ctx, 10, 14, 3, 1, p.outline);
  }

  // Tail up
  px(ctx, 13, 9, 1, 3, p.fur);
  px(ctx, 14, 8, 1, 1, p.fur);
}

/**
 * NAPPING cat — curled into a tight ball on the floor.
 * Subtle breathing pulse animation.
 */
function drawCatNapping(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  animFrame: number
): void {
  const breathe = Math.sin(animFrame * 0.04) > 0; // slow breathing cycle

  // Cat curled into a ball — mostly just a round shape
  // Outer body curl
  px(ctx, 3,  7, 10, 6, p.fur);
  px(ctx, 4,  6,  8, 1, p.fur);  // top of ball
  px(ctx, 4, 13,  8, 1, p.fur);  // bottom
  px(ctx, 5,  8,  7, 4, p.accent); // inner belly

  // Head tucked in (just ears and nose visible)
  px(ctx, 5,  7, 2, 2, p.fur);    // left ear
  px(ctx, 6,  8, 1, 1, p.earInner);
  px(ctx, 9,  7, 2, 2, p.fur);    // right ear
  px(ctx, 9,  8, 1, 1, p.earInner);

  // Tiny closed eyes (sleeping — curved lines)
  px(ctx, 6,  9, 2, 1, '#333');
  px(ctx, 9,  9, 2, 1, '#333');

  // Nose
  px(ctx, 7, 10, 2, 1, p.nose);
  // Sleeping mouth (tight closed, 2px)
  px(ctx, 7, 11, 2, 1, '#333');

  // Tail wrapped around body with tip outline
  px(ctx, 2,  9, 2, 3, p.fur);
  px(ctx, 2,  8, 1, 1, p.fur);
  px(ctx, 1,  8, 1, 1, p.outline); // tail tip

  // Breathing: subtle belly rise
  if (breathe) {
    px(ctx, 6, 11, 5, 1, p.accent);
  }
}

/**
 * KNOCK cat — swipes a paw sideways off the desk.
 * Two phases: wind-up → swipe.
 */
function drawCatKnocking(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  animFrame: number
): void {
  const swiping = animFrame % 24 < 14; // brief swipe phase

  // Ears
  px(ctx, 3, 2, 2, 2, p.fur);
  px(ctx, 4, 3, 1, 1, p.earInner);
  px(ctx, 11, 2, 2, 2, p.fur);
  px(ctx, 11, 3, 1, 1, p.earInner);
  // Ear outlines
  px(ctx, 3, 4, 2, 1, p.outline);
  px(ctx, 11, 4, 2, 1, p.outline);

  // Head — turned slightly sideways (eyes wide)
  px(ctx, 4, 4, 8, 5, p.fur);
  px(ctx, 5, 5, 6, 3, p.accent);
  px(ctx, 4, 9, 8, 1, p.outline); // head bottom outline

  // Wide eyes: pupils split to outer corners = mischief
  px(ctx, 5, 5, 1, 1, '#e8f4f0'); px(ctx, 6, 5, 1, 1, p.eyes); px(ctx, 5, 6, 1, 1, '#111'); px(ctx, 5, 5, 1, 1, '#ffffff');
  px(ctx, 9, 5, 1, 1, '#e8f4f0'); px(ctx, 10, 5, 1, 1, p.eyes); px(ctx, 10, 6, 1, 1, '#111'); px(ctx, 9, 5, 1, 1, '#ffffff');

  px(ctx, 7, 7, 2, 1, p.nose);
  // Wide grin (W-shape smirk)
  px(ctx, 5, 8, 1, 1, p.nose);
  px(ctx, 7, 7, 1, 1, p.nose);
  px(ctx, 9, 8, 1, 1, p.nose);

  // Body
  px(ctx, 3, 9, 10, 5, p.fur);
  px(ctx, 5, 10, 6, 3, p.accent);
  px(ctx, 3, 13, 3, 1, p.accent);  // left paw planted
  px(ctx, 10, 13, 3, 1, p.accent); // right paw planted
  px(ctx, 3, 14, 3, 1, p.outline);  // L paw underside
  px(ctx, 10, 14, 3, 1, p.outline); // R paw underside

  if (swiping) {
    // Right paw fully extended sideways — the swipe!
    px(ctx, 13, 9, 3, 1, p.fur);
    px(ctx, 15, 9, 1, 1, p.accent);
    px(ctx, 15, 10, 1, 1, p.outline); // swipe paw outline
  } else {
    // Paw pulled back, wind-up pose
    px(ctx, 12, 10, 2, 1, p.fur);
    px(ctx, 13, 10, 1, 1, p.accent);
  }

  // Tail flicking with excitement + tip outline
  px(ctx, 13, 11, 2, 1, p.fur);
  px(ctx, 14, 10, 1, 1, p.fur);
  px(ctx, 15, 10, 1, 1, p.outline);
}

/**
 * TYPING cat — sitting at desk, paws moving on keyboard.
 * Viewed from behind (facing away).
 */
function drawCatTyping(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  animFrame: number
): void {
  const typingHand = animFrame % 16 < 8; // Alternate paws

  // Ears
  px(ctx, 4, 2, 2, 2, p.fur);
  px(ctx, 5, 3, 1, 1, p.earInner);
  px(ctx, 10, 2, 2, 2, p.fur);
  px(ctx, 10, 3, 1, 1, p.earInner);

  // Head (back of head) with outline
  px(ctx, 4, 4, 8, 4, p.fur);
  px(ctx, 4, 8, 8, 1, p.outline);

  // Body
  px(ctx, 3, 8, 10, 5, p.fur);

  // Arms reaching forward to type
  if (typingHand) {
    px(ctx, 2, 9, 2, 1, p.fur);     // Left arm extended
    px(ctx, 1, 9, 1, 1, p.accent);  // Left paw (typing!)
    px(ctx, 12, 10, 2, 1, p.fur);   // Right arm resting
    px(ctx, 13, 10, 1, 1, p.accent);
  } else {
    px(ctx, 2, 10, 2, 1, p.fur);    // Left arm resting
    px(ctx, 1, 10, 1, 1, p.accent);
    px(ctx, 12, 9, 2, 1, p.fur);    // Right arm extended
    px(ctx, 13, 9, 1, 1, p.accent); // Right paw (typing!)
  }

  // Tail curled around body
  px(ctx, 13, 10, 1, 2, p.fur);
  px(ctx, 14, 9, 1, 1, p.fur);
  px(ctx, 14, 8, 1, 1, p.fur);
}

/**
 * DANGLE cat — being held by scruff, paws hanging, subtle sway.
 */
function drawCatDangling(
  ctx: CanvasRenderingContext2D,
  p: CatPalette,
  animFrame: number
): void {
  const sway = Math.round(Math.sin(animFrame * 0.1) * 1);

  // Ears
  px(ctx, 3 + sway, 0, 2, 2, p.fur);
  px(ctx, 4 + sway, 1, 1, 1, p.earInner);
  px(ctx, 11 + sway, 0, 2, 2, p.fur);
  px(ctx, 11 + sway, 1, 1, 1, p.earInner);
  px(ctx, 3 + sway, 2, 2, 1, p.outline);
  px(ctx, 11 + sway, 2, 2, 1, p.outline);

  // Head
  px(ctx, 4 + sway, 2, 8, 4, p.fur);
  px(ctx, 5 + sway, 3, 6, 2, p.accent);
  px(ctx, 4 + sway, 6, 8, 1, p.outline);

  // Wide surprised eyes (pupils centered = alert/startled)
  px(ctx, 5 + sway, 3, 1, 1, '#e8f4f0'); px(ctx, 6 + sway, 3, 1, 1, p.eyes); px(ctx, 6 + sway, 4, 1, 1, '#111'); px(ctx, 5 + sway, 3, 1, 1, '#ffffff');
  px(ctx, 9 + sway, 3, 1, 1, '#e8f4f0'); px(ctx, 10 + sway, 3, 1, 1, p.eyes); px(ctx, 10 + sway, 4, 1, 1, '#111'); px(ctx, 9 + sway, 3, 1, 1, '#ffffff');

  // Nose + tiny open mouth
  px(ctx, 7 + sway, 5, 2, 1, p.nose);
  px(ctx, 8 + sway, 6, 1, 1, '#333'); // open "o"

  // Body elongated by gravity
  px(ctx, 5 + sway, 6, 6, 5, p.fur);
  px(ctx, 6 + sway, 7, 4, 3, p.accent);
  px(ctx, 5 + sway, 11, 6, 1, p.outline);

  // Front paws splayed wide (held-cat pose)
  px(ctx, 1, 8, 3, 1, p.fur);
  px(ctx, 1, 9, 3, 1, p.accent);
  px(ctx, 1, 10, 3, 1, p.outline);
  px(ctx, 12, 8, 3, 1, p.fur);
  px(ctx, 12, 9, 3, 1, p.accent);
  px(ctx, 12, 10, 3, 1, p.outline);

  // Back legs hanging
  px(ctx, 5 + sway, 11, 2, 3, p.fur);
  px(ctx, 5 + sway, 14, 2, 1, p.accent);
  px(ctx, 5 + sway, 15, 2, 1, p.outline);
  px(ctx, 9 + sway, 11, 2, 3, p.fur);
  px(ctx, 9 + sway, 14, 2, 1, p.accent);
  px(ctx, 9 + sway, 15, 2, 1, p.outline);

  // Tail hanging limp
  px(ctx, 7 + sway, 11, 2, 3, p.fur);
  px(ctx, 7 + sway, 14, 2, 1, p.outline);
}
