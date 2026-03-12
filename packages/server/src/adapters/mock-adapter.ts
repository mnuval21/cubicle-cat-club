/**
 * Mock adapter for development and testing.
 * Simulates realistic agent behavior with state transitions and tool usage.
 */

import { EventEmitter } from 'events';
import type { EditorAdapter } from './types.js';
import { AgentStatus } from '@cubicle-cat-club/shared';
import type { AgentEvent, Room, AgentInfo } from '@cubicle-cat-club/shared';

interface MockAgent {
  id: string;
  name: string;
  roomId: string;
  status: AgentStatus;
  currentTool?: string;
  state: 'spawning' | 'active' | 'tool' | 'idle' | 'despawning';
  toolIndex: number;
  subagentSpawned: boolean;
  paletteIndex?: number;
  permanent?: boolean; // never despawns (Gerald)
}

const TOOLS = ['Read', 'Bash', 'Edit', 'Write', 'Grep', 'Glob'];

export class MockAdapter implements EditorAdapter {
  id = 'mock';
  displayName = 'Mock Adapter';

  private emitter = new EventEmitter();
  private agents: Map<string, MockAgent> = new Map();
  private rooms: Map<string, Room> = new Map();
  private intervals: NodeJS.Timeout[] = [];
  private running = false;

  constructor() {
    this.setupRooms();
  }

  private setupRooms(): void {
    // Create two rooms
    this.rooms.set('cubicle-cat-club', {
      id: 'cubicle-cat-club',
      projectName: 'Cubicle Cat Club',
      agentIds: [],
    });

    this.rooms.set('my-saas-app', {
      id: 'my-saas-app',
      projectName: 'My SaaS App',
      agentIds: [],
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Spawn initial agents
    this.spawnAgent('cubicle-cat-club', 'Agent Uno');
    this.spawnAgent('cubicle-cat-club', 'Agent Dos');
    this.spawnAgent('my-saas-app', 'Agent Tres');

    // Start state machine loop
    const interval = setInterval(() => {
      this.updateAgentStates();
    }, 3000 + Math.random() * 2000); // 3-5 seconds

    this.intervals.push(interval);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    // Clear all intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    // Despawn all agents
    for (const agent of this.agents.values()) {
      this.emitter.emit('event', {
        type: 'agent:closed',
        id: agent.id,
      } as AgentEvent);
    }
    this.agents.clear();
  }

  onEvent(callback: (event: AgentEvent) => void): void {
    this.emitter.on('event', callback);
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      roomId: agent.roomId,
      adapterId: this.id,
      status: agent.status,
      currentTool: agent.currentTool,
      isSubagent: false,
      paletteIndex: agent.paletteIndex,
    }));
  }

  private spawnAgent(
    roomId: string,
    name: string,
    fixedId?: string,
    paletteIndex?: number,
    permanent?: boolean
  ): void {
    const id = fixedId ?? `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const agent: MockAgent = {
      id,
      name,
      roomId,
      status: AgentStatus.ACTIVE,
      state: 'spawning',
      toolIndex: 0,
      subagentSpawned: false,
      paletteIndex,
      permanent,
    };

    this.agents.set(id, agent);

    const room = this.rooms.get(roomId);
    if (room) {
      room.agentIds.push(id);
    }

    // Emit creation event
    this.emitter.emit('event', {
      type: 'agent:created',
      id,
      name,
      roomId,
      adapterId: this.id,
    } as AgentEvent);

    // Emit active event after short delay
    setTimeout(() => {
      if (this.agents.has(id)) {
        this.emitter.emit('event', {
          type: 'agent:active',
          id,
        } as AgentEvent);
      }
    }, 500);
  }

  private updateAgentStates(): void {
    if (!this.running) return;

    for (const agent of this.agents.values()) {
      if (!this.running) break;

      switch (agent.state) {
        case 'spawning':
          agent.state = 'active';
          break;

        case 'active':
          // Randomly decide: start tool or go idle
          if (Math.random() > 0.3) {
            agent.state = 'tool';
            const tool = TOOLS[agent.toolIndex % TOOLS.length];
            agent.currentTool = tool;
            this.emitter.emit('event', {
              type: 'agent:tool:start',
              id: agent.id,
              toolName: tool,
              toolStatus: 'running',
            } as AgentEvent);

            // Spawn subagent 30% of the time
            if (
              !agent.subagentSpawned &&
              Math.random() > 0.7 &&
              agent.roomId === 'cubicle-cat-club'
            ) {
              agent.subagentSpawned = true;
              const subagentId = `subagent-${agent.id}-${Math.random().toString(36).slice(2, 9)}`;
              this.emitter.emit('event', {
                type: 'agent:subagent:spawn',
                id: subagentId,
                parentId: agent.id,
              } as AgentEvent);
            }
          } else {
            agent.state = 'idle';
            agent.status = AgentStatus.IDLE;
            this.emitter.emit('event', {
              type: 'agent:idle',
              id: agent.id,
            } as AgentEvent);
          }
          break;

        case 'tool':
          // Complete tool execution
          agent.state = 'active';
          agent.status = AgentStatus.ACTIVE;
          agent.toolIndex++;
          this.emitter.emit('event', {
            type: 'agent:tool:done',
            id: agent.id,
            toolId: `${agent.id}-tool-${agent.toolIndex}`,
          } as AgentEvent);
          break;

        case 'idle':
          // 40% chance to wake up and continue
          if (Math.random() > 0.6) {
            agent.state = 'active';
            agent.status = AgentStatus.ACTIVE;
            this.emitter.emit('event', {
              type: 'agent:active',
              id: agent.id,
            } as AgentEvent);
          }
          break;

        case 'despawning':
          // Permanent agents (Gerald) never despawn
          if (agent.permanent) break;
          // Final cleanup
          this.agents.delete(agent.id);
          const room = this.rooms.get(agent.roomId);
          if (room) {
            room.agentIds = room.agentIds.filter((id) => id !== agent.id);
          }
          break;
      }
    }

    // Occasionally spawn new agents (20% chance per cycle)
    if (this.running && Math.random() > 0.8) {
      const roomId = Array.from(this.rooms.keys())[
        Math.floor(Math.random() * this.rooms.size)
      ];
      const names = [
        'Agent Nova',
        'Agent Pulse',
        'Agent Zenith',
        'Agent Quantum',
        'Agent Nexus',
      ];
      const name = names[Math.floor(Math.random() * names.length)];
      this.spawnAgent(roomId, name);
    }
  }
}
