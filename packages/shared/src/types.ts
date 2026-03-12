/**
 * Cubicle Club - Shared Types
 *
 * Core type definitions for the Cubicle Club project, shared across
 * client, server, and agent packages.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Represents the current animation state of a character in the virtual world.
 */
export enum CharacterState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  TYPE = 'TYPE',
  STRETCH = 'STRETCH',  // transitional: TYPE→IDLE, ~1s
  NAP = 'NAP',          // triggered by agent:idle event
  ZOOMIES = 'ZOOMIES',  // triggered by agent:subagent:spawn (on parent)
  KNOCK = 'KNOCK',      // triggered by tool error
  DANGLE = 'DANGLE',    // being held/dragged by user
}

/**
 * Cardinal directions in the virtual world.
 * Used for movement and spatial calculations.
 */
export enum Direction {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
}

/**
 * Tile types that make up the virtual world map.
 */
export enum TileType {
  WALL = 0,
  FLOOR = 1,
  VOID = 2,
  WINDOW = 3,  // decorative wall variant, rendered with light
}

/**
 * Agent operational status.
 */
export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  WAITING = 'waiting',
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Time window in milliseconds for discovering active sessions.
 * Used by clients to scan for available rooms/agents.
 */
export const SCAN_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Time after which an idle agent is considered to have timed out.
 * Used to clean up stale agent instances.
 */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Time after which an agent is considered dead and should be removed.
 * Used for final cleanup of disconnected agents.
 */
export const DEAD_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// EVENT TYPES - Discriminated Union
// ============================================================================

/**
 * Base event structure for all agent events.
 * Uses discriminated union pattern with 'type' field.
 */
export type AgentEvent =
  | {
      type: 'room:discovered';
      roomId: string;
      projectName: string;
    }
  | {
      type: 'agent:created';
      id: string;
      name: string;
      roomId: string;
      adapterId: string;
      paletteIndex?: number;
    }
  | {
      type: 'agent:active';
      id: string;
    }
  | {
      type: 'agent:idle';
      id: string;
    }
  | {
      type: 'agent:tool:start';
      id: string;
      toolName: string;
      toolStatus: string;
    }
  | {
      type: 'agent:tool:done';
      id: string;
      toolId: string;
      isError?: boolean;
    }
  | {
      type: 'agent:waiting';
      id: string;
    }
  | {
      type: 'agent:closed';
      id: string;
    }
  | {
      type: 'agent:subagent:spawn';
      id: string;
      parentId: string;
    }
  | {
      type: 'agent:subagent:despawn';
      id: string;
    };

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Messages sent from the client to the server.
 * Uses discriminated union pattern with 'type' field.
 */
export type ClientMessage =
  | {
      type: 'client:ready';
    }
  | {
      type: 'client:switch-room';
      roomId: string;
    }
  | {
      type: 'client:ping';
    };

/**
 * Messages sent from the server to the client.
 * Alias for AgentEvent for clarity in communication semantics.
 */
export type ServerMessage = AgentEvent;

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a virtual room/session where agents operate.
 * Rooms group agents by project and serve as the primary namespace.
 */
export interface Room {
  /** Unique identifier for the room */
  id: string;

  /** Name of the project this room belongs to */
  projectName: string;

  /** List of agent IDs currently in this room */
  agentIds: string[];
}

/**
 * Complete information about an agent.
 * Describes the agent's identity, state, and hierarchy.
 */
export interface AgentInfo {
  /** Unique identifier for the agent */
  id: string;

  /** Human-readable name of the agent */
  name: string;

  /** ID of the room this agent belongs to */
  roomId: string;

  /** Identifier for the adapter/integration this agent uses */
  adapterId: string;

  /** Current operational status */
  status: AgentStatus;

  /** Name of the tool currently being executed, if any */
  currentTool?: string;

  /** Whether this agent is a subagent (spawned by another agent) */
  isSubagent: boolean;

  /** ID of the parent agent, if this is a subagent */
  parentId?: string;

  /** Fixed palette index (0-5). If omitted, palette is chosen randomly. */
  paletteIndex?: number;
}
