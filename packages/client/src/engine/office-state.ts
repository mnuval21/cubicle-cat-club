import { AgentInfo, CharacterState } from '@cubicle-cat-club/shared';
import { Character } from '../characters/character';
import { TileMap } from '../office/tile-map';
import { Furniture, Seat } from '../office/furniture';
import { triggerZoomies, triggerKnock, triggerNap, wakeUp, startWandering } from '../characters/state-machine';

/**
 * Represents the complete state of a single room in the office.
 * Contains the spatial layout, furniture, and all characters in the room.
 */
export interface RoomState {
  roomId: string;
  projectName: string;
  tileMap: TileMap;
  furniture: Furniture[];
  seats: Seat[];
  characters: Map<string, Character>;
}

/**
 * OfficeState is the core game state manager.
 * It maintains all rooms, characters, and dispatches updates to the game loop.
 * This is an imperative (non-React) state container.
 */
export class OfficeState {
  private rooms: Map<string, RoomState> = new Map();
  public activeRoomId: string | null = null;

  /**
   * Add a new room to the office.
   */
  addRoom(roomId: string, projectName: string, layout: {
    tileMap: TileMap;
    furniture: Furniture[];
    seats: Seat[];
  }): void {
    const roomState: RoomState = {
      roomId,
      projectName,
      tileMap: layout.tileMap,
      furniture: layout.furniture,
      seats: layout.seats,
      characters: new Map(),
    };
    this.rooms.set(roomId, roomState);

    // Auto-activate the first room
    if (this.activeRoomId === null) {
      this.activeRoomId = roomId;
    }
  }

  /**
   * Add an agent to a room.
   * Creates a Character and assigns it a seat if available.
   */
  addAgent(agentInfo: AgentInfo): void {
    const room = this.rooms.get(agentInfo.roomId);
    if (!room) {
      console.warn(`Room ${agentInfo.roomId} not found`);
      return;
    }

    // Find an unassigned seat
    let assignedSeat: Seat | null = null;
    for (const seat of room.seats) {
      if (seat.assignedAgentId === null) {
        seat.assignedAgentId = agentInfo.id;
        assignedSeat = seat;
        break;
      }
    }

    // Use fixed palette if provided (e.g. Gerald), otherwise random
    const paletteIndex = agentInfo.paletteIndex ?? Math.floor(Math.random() * 6);
    const character = new Character(
      agentInfo.id,
      agentInfo.name,
      agentInfo.roomId,
      agentInfo.adapterId,
      paletteIndex,
      assignedSeat?.col || 10,
      assignedSeat?.row || 5,
      assignedSeat?.col || 10,
      assignedSeat?.row || 5
    );

    character.isSubagent = agentInfo.isSubagent;
    if (agentInfo.parentId) {
      character.parentId = agentInfo.parentId;
    }

    room.characters.set(agentInfo.id, character);
  }

  /**
   * Remove an agent from the office.
   */
  removeAgent(id: string): void {
    for (const room of this.rooms.values()) {
      const character = room.characters.get(id);
      if (character) {
        // Free up the seat
        for (const seat of room.seats) {
          if (seat.assignedAgentId === id) {
            seat.assignedAgentId = null;
          }
        }
        room.characters.delete(id);
        break;
      }
    }
  }

  /**
   * Update an agent's status.
   * Maps AgentStatus to CharacterState for animation.
   */
  updateAgentStatus(id: string, status: string): void {
    for (const room of this.rooms.values()) {
      const character = room.characters.get(id);
      if (character) {
        if (status === 'active') {
          wakeUp(character); // no-op if not napping; wakes if napping
          if (character.state !== CharacterState.NAP) {
            character.state = CharacterState.WALK;
          }
        } else if (status === 'idle') {
          triggerNap(character);
        } else if (status === 'waiting') {
          character.state = CharacterState.IDLE;
        }
        break;
      }
    }
  }

  /**
   * Trigger a behavior event on a character (error → KNOCK, subagent spawn → ZOOMIES).
   */
  triggerBehavior(id: string, behavior: 'knock' | 'zoomies'): void {
    for (const room of this.rooms.values()) {
      const character = room.characters.get(id);
      if (character) {
        if (behavior === 'knock') triggerKnock(character);
        if (behavior === 'zoomies') triggerZoomies(character);
        break;
      }
    }
  }

  /**
   * Set a tool/speech bubble for an agent.
   * If the cat is already at its seat, start typing immediately.
   * If not, walk there first — TYPE starts on arrival (see state-machine.ts).
   */
  setToolActive(id: string, toolName: string): void {
    for (const room of this.rooms.values()) {
      const character = room.characters.get(id);
      if (character) {
        character.currentTool = toolName;
        const atSeat =
          character.tileCol === character.seatCol &&
          character.tileRow === character.seatRow;
        if (atSeat) {
          character.state = CharacterState.TYPE;
        } else {
          character.setPath(character.seatCol, character.seatRow, room.tileMap);
          character.state = CharacterState.WALK;
        }
        break;
      }
    }
  }

  /**
   * Clear the tool/speech bubble for an agent.
   */
  clearTool(id: string): void {
    for (const room of this.rooms.values()) {
      const character = room.characters.get(id);
      if (character) {
        character.currentTool = null;
        character.state = CharacterState.IDLE;
        break;
      }
    }
  }

  /**
   * States where a cat cannot be interacted with.
   */
  private isWorking(character: Character): boolean {
    return (
      character.state === CharacterState.TYPE ||
      character.state === CharacterState.KNOCK ||
      character.state === CharacterState.ZOOMIES ||
      character.state === CharacterState.STRETCH
    );
  }

  /**
   * Find an interactable character near world coords. Returns null if none or working.
   */
  findCharacterAt(worldX: number, worldY: number): Character | null {
    const activeRoom = this.getActiveRoom();
    if (!activeRoom) return null;
    const hitRadius = 14;
    for (const character of activeRoom.characters.values()) {
      const cx = character.x + 8;
      const cy = character.y + 8;
      const dx = worldX - cx;
      const dy = worldY - cy;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return this.isWorking(character) ? null : character;
      }
    }
    return null;
  }

  /**
   * Toggle a character between sitting (IDLE) and wandering (WALK) on click.
   */
  handleClick(worldX: number, worldY: number, tileMap: TileMap): void {
    const character = this.findCharacterAt(worldX, worldY);
    if (!character) return;
    if (character.state === CharacterState.IDLE) {
      startWandering(character, tileMap);
    } else if (character.state === CharacterState.WALK && !character.currentTool) {
      character.path = [];
      character.state = CharacterState.IDLE;
      character.wanderTimer = Math.random() * 10 + 5;
    } else if (character.state === CharacterState.NAP) {
      wakeUp(character);
      character.wanderTimer = 1;
    }
  }

  /**
   * Start dragging a character — sets state to DANGLE.
   */
  startDrag(character: Character): void {
    character.isDragging = true;
    character.path = [];
    character.state = CharacterState.DANGLE;
  }

  /**
   * Update drag position directly in pixel space.
   */
  updateDrag(character: Character, worldX: number, worldY: number, offsetX: number, offsetY: number): void {
    character.x = worldX - offsetX;
    character.y = worldY - offsetY;
  }

  /**
   * End drag — snap to nearest walkable tile.
   */
  endDrag(character: Character, worldX: number, worldY: number): void {
    const activeRoom = this.getActiveRoom();
    if (!activeRoom) return;

    const tileMap = activeRoom.tileMap;
    const targetCol = Math.round((worldX - 8) / 16);
    const targetRow = Math.round((worldY - 8) / 16);

    // Spiral outward from target until we find a walkable tile
    let snapCol = targetCol;
    let snapRow = targetRow;
    outer: for (let r = 0; r <= 3; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          if (tileMap.isWalkable(targetCol + dc, targetRow + dr)) {
            snapCol = targetCol + dc;
            snapRow = targetRow + dr;
            break outer;
          }
        }
      }
    }

    character.isDragging = false;
    character.tileCol = snapCol;
    character.tileRow = snapRow;
    character.x = snapCol * 16;
    character.y = snapRow * 16;
    character.path = [];
    character.state = CharacterState.IDLE;
    character.wanderTimer = Math.random() * 8 + 3;
  }

  /**
   * Switch the active room.
   */
  switchRoom(roomId: string): void {
    if (this.rooms.has(roomId)) {
      this.activeRoomId = roomId;
    }
  }

  /**
   * Get the active room state.
   */
  getActiveRoom(): RoomState | null {
    if (!this.activeRoomId) return null;
    return this.rooms.get(this.activeRoomId) || null;
  }

  /**
   * Get all rooms.
   */
  getRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Update all characters in the active room.
   * Called once per frame by the game loop.
   */
  update(dt: number): void {
    const activeRoom = this.getActiveRoom();
    if (!activeRoom) return;

    for (const character of activeRoom.characters.values()) {
      character.update(dt, activeRoom.tileMap);
    }
  }
}
