/**
 * Adapter interface for agent event sources
 */

import type { AgentEvent, Room, AgentInfo } from '@cubicle-cat-club/shared';

/**
 * EditorAdapter is the core abstraction for different agent tracking sources.
 * Each implementation (Claude Code, Cursor, Antigravity) extends this interface.
 */
export interface EditorAdapter {
  /** Unique identifier for this adapter (e.g., 'claude-code', 'cursor', 'antigravity') */
  id: string;

  /** Human-readable name of the adapter */
  displayName: string;

  /**
   * Start monitoring for agent activity.
   * Called when the server is starting up.
   */
  start(): Promise<void>;

  /**
   * Stop monitoring for agent activity.
   * Called when the server is shutting down.
   */
  stop(): Promise<void>;

  /**
   * Subscribe to agent events from this adapter.
   * The callback will be called whenever an event occurs.
   */
  onEvent(callback: (event: AgentEvent) => void): void;

  /**
   * Get all currently tracked rooms from this adapter.
   * A room represents a project or workspace.
   */
  getRooms(): Room[];

  /**
   * Get all currently tracked agents from this adapter.
   */
  getAgents(): AgentInfo[];
}
