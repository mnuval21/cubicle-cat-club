/**
 * Room manager for tracking sessions and their associated agents.
 * Maps project directories to rooms and manages the Room↔Agent relationship.
 */

import { basename } from 'path';
import type { Room, AgentInfo } from '@cubicle-cat-club/shared';

/**
 * Manages the set of active rooms and their agents.
 */
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private sessionToRoomId: Map<string, string> = new Map();
  private agents: Map<string, AgentInfo> = new Map();

  /**
   * Add or get a room for a session's project.
   * Room IDs are derived from the project directory name.
   * Optional displayName overrides the derived project name (useful when
   * the directory is a hash like -Users-melissanuval-my-app).
   */
  addSession(projectDir: string, sessionId: string, displayName?: string): Room {
    // Create room ID from project name
    const projectName = displayName || basename(projectDir);
    const roomId = this.sanitizeRoomId(projectName);

    // Check if room already exists
    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        projectName,
        agentIds: [],
      };
      this.rooms.set(roomId, room);
    }

    // Track session → room mapping
    this.sessionToRoomId.set(sessionId, roomId);

    return room;
  }

  /**
   * Remove a session and clean up its agents.
   */
  removeSession(sessionId: string): void {
    const roomId = this.sessionToRoomId.get(sessionId);
    if (!roomId) return;

    this.sessionToRoomId.delete(sessionId);

    // Remove agents for this session
    const agentsToRemove: string[] = [];
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.roomId === roomId) {
        agentsToRemove.push(agentId);
      }
    }

    for (const agentId of agentsToRemove) {
      this.agents.delete(agentId);
    }

    // Remove empty rooms immediately
    const room = this.rooms.get(roomId);
    if (room && room.agentIds.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  /**
   * Get all rooms.
   */
  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get a specific room by ID.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add an agent to a room.
   */
  addAgent(agent: AgentInfo): void {
    this.agents.set(agent.id, agent);

    const room = this.rooms.get(agent.roomId);
    if (room && !room.agentIds.includes(agent.id)) {
      room.agentIds.push(agent.id);
    }
  }

  /**
   * Remove an agent from a room.
   */
  removeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    this.agents.delete(agentId);

    const room = this.rooms.get(agent.roomId);
    if (room) {
      room.agentIds = room.agentIds.filter((id) => id !== agentId);
    }
  }

  /**
   * Get all agents.
   */
  getAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents in a specific room.
   */
  getAgentsInRoom(roomId: string): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.roomId === roomId
    );
  }

  /**
   * Sanitize a project name into a valid room ID.
   */
  private sanitizeRoomId(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
