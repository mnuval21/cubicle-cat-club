import { CharacterState } from '@cubicle-cat-club/shared';
import { Character } from './character';
import { TileMap } from '../office/tile-map';

const STRETCH_DURATION = 1.0;   // seconds
const ZOOMIES_DURATION = 2.2;   // seconds
const KNOCK_DURATION   = 0.8;   // seconds

/** Re-roll the animation variant so the cat picks a new random pose. */
function rerollVariant(character: Character): void {
  character.animVariant = Math.random();
}

/**
 * State machine for character behavior.
 * Handles transitions between all CharacterStates.
 */
export function updateCharacterState(
  character: Character,
  dt: number,
  tileMap: TileMap
): void {
  switch (character.state) {
    case CharacterState.IDLE:
      handleIdleState(character, dt, tileMap);
      break;
    case CharacterState.WALK:
      handleWalkState(character);
      break;
    case CharacterState.TYPE:
      handleTypeState(character);
      break;
    case CharacterState.STRETCH:
      handleStretchState(character, dt);
      break;
    case CharacterState.NAP:
      handleNapState(character);
      break;
    case CharacterState.ZOOMIES:
      handleZoomiesState(character, dt, tileMap);
      break;
    case CharacterState.KNOCK:
      handleKnockState(character, dt);
      break;
    case CharacterState.DANGLE:
      // Controlled entirely by drag — no state transitions
      break;
  }
}

// ── State handlers ────────────────────────────────────────────────────────

function handleIdleState(character: Character, dt: number, tileMap: TileMap): void {
  character.wanderTimer -= dt;

  if (character.wanderTimer <= 0) {
    // 15% chance of a lounge visit; otherwise stay near the desk
    const goToLounge = Math.random() < 0.15;
    const bounds = goToLounge ? character.getFullWanderBounds() : character.getWanderBounds();
    const destCol = Math.floor(Math.random() * (bounds.maxCol - bounds.minCol + 1) + bounds.minCol);
    const destRow = Math.floor(Math.random() * (bounds.maxRow - bounds.minRow + 1) + bounds.minRow);

    character.setPath(destCol, destRow, tileMap);

    if (character.path.length > 0) {
      character.state = CharacterState.WALK;
    } else {
      character.wanderTimer = Math.random() * 8 + 4;
    }
  }
}

function handleWalkState(character: Character): void {
  if (character.path.length === 0) {
    // If cat was walking to its seat to type, start typing on arrival
    const atSeat =
      character.tileCol === character.seatCol &&
      character.tileRow === character.seatRow;
    if (character.currentTool && atSeat) {
      rerollVariant(character);
      character.state = CharacterState.TYPE;
    } else {
      rerollVariant(character);
      character.state = CharacterState.IDLE;
      character.wanderTimer = Math.random() * 10 + 5;
    }
  }
}

function handleTypeState(character: Character): void {
  if (!character.currentTool) {
    // Trigger stretch when typing ends
    rerollVariant(character);
    character.state = CharacterState.STRETCH;
    character.stretchTimer = STRETCH_DURATION;
  }
}

function handleStretchState(character: Character, dt: number): void {
  character.stretchTimer -= dt;
  if (character.stretchTimer <= 0) {
    rerollVariant(character);
    character.state = CharacterState.IDLE;
    character.wanderTimer = Math.random() * 5 + 2;
  }
}

function handleNapState(_character: Character): void {
  // Stays in NAP until office-state receives agent:active and calls wakeUp()
  // Nothing to tick here — the animation loop handles the sprite
}

function handleZoomiesState(character: Character, dt: number, tileMap: TileMap): void {
  character.zoomiesTimer -= dt;

  // During zoomies, sprint in a straight line (horizontal or vertical)
  if (character.path.length === 0 && character.zoomiesTimer > 0) {
    let col = character.tileCol;
    let row = character.tileRow;
    if (Math.random() > 0.5) {
      // Horizontal sprint — dash to opposite side
      col = character.tileCol < 8 ? Math.min(15, character.tileCol + 6) : Math.max(1, character.tileCol - 6);
    } else {
      // Vertical sprint — dash up or down
      row = character.tileRow < 5 ? Math.min(10, character.tileRow + 5) : Math.max(1, character.tileRow - 5);
    }
    character.setPath(col, row, tileMap);
  }

  if (character.zoomiesTimer <= 0 && character.path.length === 0) {
    rerollVariant(character);
    character.state = character.preZoomiesState;
    character.moveSpeed = 120; // restore normal speed
    if (character.state === CharacterState.IDLE) {
      character.wanderTimer = Math.random() * 3 + 1;
    }
  }
}

function handleKnockState(character: Character, dt: number): void {
  character.knockTimer -= dt;
  if (character.knockTimer <= 0) {
    rerollVariant(character);
    character.state = CharacterState.IDLE;
    character.wanderTimer = Math.random() * 5 + 3;
  }
}

// ── External triggers (called by office-state on incoming events) ─────────

/**
 * Trigger ZOOMIES on a character (called when its subagent spawns).
 */
export function triggerZoomies(character: Character): void {
  character.preZoomiesState = character.state;
  character.zoomiesTimer = ZOOMIES_DURATION;
  character.moveSpeed = 300; // 2.5× normal speed
  character.state = CharacterState.ZOOMIES;
}

/**
 * Trigger KNOCK animation (called on tool error).
 */
export function triggerKnock(character: Character): void {
  rerollVariant(character);
  character.knockTimer = KNOCK_DURATION;
  character.state = CharacterState.KNOCK;
}

/**
 * Put cat to sleep (called on agent:idle event).
 */
export function triggerNap(character: Character): void {
  rerollVariant(character);
  character.path = [];
  character.state = CharacterState.NAP;
}

/**
 * Wake cat up from nap (called on agent:active event).
 */
export function wakeUp(character: Character): void {
  if (character.state === CharacterState.NAP) {
    rerollVariant(character);
    character.state = CharacterState.STRETCH;
    character.stretchTimer = STRETCH_DURATION;
  }
}

/**
 * Make a character start wandering immediately (used on click toggle).
 */
export function startWandering(character: Character, tileMap: TileMap): void {
  const bounds = character.getWanderBounds();
  const destCol = Math.floor(Math.random() * (bounds.maxCol - bounds.minCol + 1) + bounds.minCol);
  const destRow = Math.floor(Math.random() * (bounds.maxRow - bounds.minRow + 1) + bounds.minRow);
  character.setPath(destCol, destRow, tileMap);
  if (character.path.length > 0) {
    character.state = CharacterState.WALK;
  }
}
