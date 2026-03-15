import { CharacterState, Direction } from '@cubicle-cat-club/shared';
import { updateCharacterState } from './state-machine';
import { findPath } from './pathfinding';
import { TileMap } from '../office/tile-map';

/**
 * Character represents a single agent in the virtual world.
 * Manages position, animation state, and movement.
 */
export class Character {
  // Identity
  public id: string;
  public name: string;
  public roomId: string;
  public adapterId: string;

  // Position
  public tileCol: number;
  public tileRow: number;
  public x: number; // pixel position
  public y: number; // pixel position

  // Animation state
  public state: CharacterState = CharacterState.IDLE;
  public direction: Direction = Direction.DOWN;

  // Movement
  public path: Array<{ col: number; row: number }> = [];
  public moveProgress: number = 0; // 0-1 between tiles
  public moveSpeed: number = 48; // pixels per second (3 tiles/sec at 16px)

  // Appearance
  public paletteIndex: number;
  public hueShift: number = 0;

  // Tools/interaction
  public currentTool: string | null = null;

  // Hierarchy
  public isSubagent: boolean = false;
  public parentId: string | null = null;

  // Seat assignment
  public seatCol: number;
  public seatRow: number;

  // Behavior
  public wanderTimer: number = 0;
  private wanderRange: number = 3;

  // New behavior timers
  public stretchTimer: number = 0;   // countdown for STRETCH animation
  public zoomiesTimer: number = 0;   // countdown for ZOOMIES animation
  public knockTimer: number = 0;     // countdown for KNOCK animation
  public preZoomiesState: CharacterState = CharacterState.IDLE; // state to restore after zoomies
  public isDragging: boolean = false;

  // Animation variant — random value [0,1) used to pick from multi-row animation sets.
  // Re-rolled on state transitions to give each cat a unique pose per state.
  public animVariant: number = Math.random();

  constructor(
    id: string,
    name: string,
    roomId: string,
    adapterId: string,
    paletteIndex: number,
    startCol: number,
    startRow: number,
    seatCol: number,
    seatRow: number
  ) {
    this.id = id;
    this.name = name;
    this.roomId = roomId;
    this.adapterId = adapterId;
    this.paletteIndex = paletteIndex;
    this.tileCol = startCol;
    this.tileRow = startRow;
    this.seatCol = seatCol;
    this.seatRow = seatRow;
    this.x = startCol * 16;
    this.y = startRow * 16;
    this.wanderTimer = Math.random() * 10 + 5; // 5-15 seconds
  }

  /**
   * Update character each frame.
   */
  update(dt: number, tileMap: TileMap): void {
    // Update state machine (handles transitions)
    updateCharacterState(this, dt, tileMap);

    // Update movement based on current state
    if (this.state === CharacterState.WALK && this.path.length > 0) {
      this.updateWalk(dt);
    } else if (this.state === CharacterState.TYPE) {
      // Blinking animation for typing - handled in render
    }
  }

  /**
   * Update walk animation.
   * Moves character smoothly along the path.
   */
  private updateWalk(dt: number): void {
    const tilesPerSec = this.moveSpeed / 16;
    const progressPerFrame = tilesPerSec * dt;
    this.moveProgress += progressPerFrame;

    if (this.moveProgress >= 1) {
      // Advance to next tile
      if (this.path.length > 0) {
        const nextTile = this.path.shift();
        if (nextTile) {
          this.tileCol = nextTile.col;
          this.tileRow = nextTile.row;
          this.x = this.tileCol * 16;
          this.y = this.tileRow * 16;
          this.moveProgress = 0;

          // Determine direction based on movement
          if (this.path.length > 0) {
            const nextPos = this.path[0];
            if (nextPos.col > this.tileCol) {
              this.direction = Direction.RIGHT;
            } else if (nextPos.col < this.tileCol) {
              this.direction = Direction.LEFT;
            } else if (nextPos.row > this.tileRow) {
              this.direction = Direction.DOWN;
            } else if (nextPos.row < this.tileRow) {
              this.direction = Direction.UP;
            }
          }
        }
      }

      // Path exhausted — let handleWalkState decide the next state (TYPE or IDLE)
    }

    // Smooth interpolation between tiles for rendering
    if (this.path.length > 0) {
      const nextTile = this.path[0];
      const interpolation = this.moveProgress;
      this.x = (this.tileCol + (nextTile.col - this.tileCol) * interpolation) * 16;
      this.y = (this.tileRow + (nextTile.row - this.tileRow) * interpolation) * 16;
    }
  }

  /**
   * Set a destination and calculate path.
   */
  public setPath(destCol: number, destRow: number, tileMap: TileMap): void {
    const path = findPath(this.tileCol, this.tileRow, destCol, destRow, tileMap);
    this.path = path;
    this.moveProgress = 0;

    // Set initial direction
    if (path.length > 0) {
      const firstStep = path[0];
      if (firstStep.col > this.tileCol) {
        this.direction = Direction.RIGHT;
      } else if (firstStep.col < this.tileCol) {
        this.direction = Direction.LEFT;
      } else if (firstStep.row > this.tileRow) {
        this.direction = Direction.DOWN;
      } else if (firstStep.row < this.tileRow) {
        this.direction = Direction.UP;
      }
    }
  }

  /**
   * Get wander range limits.
   */
  public getWanderBounds(): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  } {
    return {
      minCol: Math.max(1, this.seatCol - this.wanderRange),
      maxCol: Math.min(20, this.seatCol + this.wanderRange),
      minRow: Math.max(1, this.seatRow - this.wanderRange),
      maxRow: Math.min(9, this.seatRow + this.wanderRange),
    };
  }

  /**
   * Wander bounds expanded to the full interior — used when napping/idle
   * so cats can drift into the cat lounge.
   */
  public getFullWanderBounds(): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  } {
    return { minCol: 1, maxCol: 20, minRow: 1, maxRow: 9 };
  }
}
