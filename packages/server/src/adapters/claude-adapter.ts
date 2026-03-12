/**
 * Claude Code adapter — the real deal.
 *
 * Watches ~/.claude/projects/ for active JSONL transcript files,
 * tails them in real time, and emits AgentEvents so cats appear
 * in the office doing exactly what your Claude Code agents are doing.
 *
 * Directory structure:
 *   ~/.claude/projects/<project-hash>/<session-id>.jsonl
 *
 * Each .jsonl file = one session = one cat in the office.
 */

import { EventEmitter } from 'events';
import { homedir } from 'os';
import { join, dirname, basename } from 'path';
import { open, stat, readFile } from 'fs/promises';
import type { FileHandle } from 'fs/promises';
import type { EditorAdapter } from './types.js';
import type { AgentEvent, Room, AgentInfo } from '@cubicle-cat-club/shared';
import { AgentStatus, IDLE_TIMEOUT_MS, DEAD_TIMEOUT_MS } from '@cubicle-cat-club/shared';
import { scanForSessions, watchForNewSessions } from '../watcher.js';
import { parseTranscriptLine, formatToolName } from '../parser.js';
import { RoomManager } from '../room-manager.js';

// ============================================================================
// TYPES
// ============================================================================

/** Tracks a single JSONL session file being tailed. */
interface SessionTracker {
  filePath: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  roomId: string;
  projectName: string;
  offset: number;
  partialLine: string; // Buffer for incomplete last line
  lastActivityMs: number;
  created: boolean; // Whether we've emitted agent:created
  currentTool: string | null;
  status: AgentStatus;
  isSubagent: boolean;
  parentAgentId: string | undefined;
}

// Cat-themed agent names because... well, you know why 🐱
const CAT_NAMES = [
  'Whiskers', 'Mittens', 'Shadow', 'Luna', 'Mochi',
  'Biscuit', 'Pepper', 'Cleo', 'Nimbus', 'Pixel',
  'Byte', 'Kernel', 'Sudo', 'Regex', 'Mutex',
  'Socket', 'Daemon', 'Serde', 'Tokio', 'Rusty',
];

// ============================================================================
// ADAPTER
// ============================================================================

export class ClaudeAdapter implements EditorAdapter {
  id = 'claude-code';
  displayName = 'Claude Code';

  private emitter = new EventEmitter();
  private roomManager = new RoomManager();
  private sessions: Map<string, SessionTracker> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private watcher: ReturnType<typeof watchForNewSessions> | null = null;
  private running = false;
  private nameIndex = 0;
  private claudePath: string;

  constructor(claudePath?: string) {
    this.claudePath = claudePath ?? join(homedir(), '.claude', 'projects');
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`[Claude] Scanning ${this.claudePath} for sessions...`);

    // Initial scan for existing sessions
    try {
      const sessions = await scanForSessions(this.claudePath);
      console.log(`[Claude] Found ${sessions.length} recent session(s)`);

      for (const session of sessions) {
        await this.registerSession(session.path, session.projectName, session.isSubagent, session.parentSessionId);
      }
    } catch (err) {
      console.log(`[Claude] No sessions directory found (this is fine on first run)`);
    }

    // Watch for new sessions appearing
    try {
      this.watcher = watchForNewSessions(this.claudePath, async (session) => {
        console.log(`[Claude] New session detected: ${session.projectName}${session.isSubagent ? ' (subagent)' : ''}`);
        await this.registerSession(session.path, session.projectName, session.isSubagent, session.parentSessionId);
      });
    } catch {
      // Silently handle watch setup errors
    }

    // Poll active sessions for new content (every 1 second for snappy cats)
    this.scanInterval = setInterval(() => {
      this.tailAllSessions();
    }, 1000);

    // Periodic cleanup of dead sessions (every 30 seconds)
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadSessions();
    }, 30_000);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  onEvent(callback: (event: AgentEvent) => void): void {
    this.emitter.on('event', callback);
  }

  getRooms(): Room[] {
    return this.roomManager.getRooms();
  }

  getAgents(): AgentInfo[] {
    return this.roomManager.getAgents();
  }

  // ==========================================================================
  // SESSION REGISTRATION
  // ==========================================================================

  /**
   * Register a new session file and set up tracking.
   * Each session = one cat agent in the office.
   */
  private async registerSession(
    filePath: string,
    projectName: string,
    isSubagent = false,
    parentSessionId?: string
  ): Promise<void> {
    if (this.sessions.has(filePath)) return;

    const projectDir = isSubagent
      ? dirname(dirname(dirname(filePath)))  // walk up past subagents/<session-id>/
      : dirname(filePath);
    const sessionFileName = basename(filePath, '.jsonl');
    const agentId = `claude-${sessionFileName}`;
    const agentName = this.pickCatName();

    // Derive parent agent ID from parent session UUID if this is a sub-agent
    const parentAgentId = parentSessionId ? `claude-${parentSessionId}` : undefined;

    // Create/get room for this project (pass clean name from watcher)
    const room = this.roomManager.addSession(projectDir, agentId, projectName);
    const roomId = room.id;

    const tracker: SessionTracker = {
      filePath,
      sessionId: sessionFileName,
      agentId,
      agentName,
      roomId,
      projectName: room.projectName,
      offset: 0,
      partialLine: '',
      lastActivityMs: Date.now(),
      created: false,
      currentTool: null,
      status: AgentStatus.IDLE,
      isSubagent,
      parentAgentId,
    };

    this.sessions.set(filePath, tracker);

    // Emit room discovery
    this.emit({
      type: 'room:discovered',
      roomId,
      projectName: room.projectName,
    });

    // Read existing content to catch up, but only emit the last few events
    // (we don't want to replay the entire history)
    await this.catchUpSession(tracker);
  }

  /**
   * Read existing file content to establish current agent state.
   * We scan the whole file but only care about the latest state.
   */
  private async catchUpSession(tracker: SessionTracker): Promise<void> {
    try {
      const content = await readFile(tracker.filePath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());

      if (lines.length === 0) return;

      // Create the agent
      this.createAgent(tracker);

      // Parse all lines to find current state
      let lastToolName: string | null = null;
      let isActive = false;

      for (const line of lines) {
        const event = parseTranscriptLine(line, tracker.agentId);
        if (!event) continue;

        if (event.type === 'agent:tool:start') {
          lastToolName = (event as any).toolName;
          isActive = true;
        } else if (event.type === 'agent:tool:done') {
          lastToolName = null;
          isActive = true;
        } else if (event.type === 'agent:idle') {
          isActive = false;
          lastToolName = null;
        } else if (event.type === 'agent:active') {
          isActive = true;
        }
      }

      // Set offset to end of file so we only tail new content
      tracker.offset = Buffer.byteLength(content, 'utf-8');

      // Emit current state
      if (lastToolName) {
        tracker.currentTool = lastToolName;
        tracker.status = AgentStatus.ACTIVE;
        this.emit({
          type: 'agent:tool:start',
          id: tracker.agentId,
          toolName: lastToolName,
          toolStatus: 'running',
        });
      } else if (isActive) {
        tracker.status = AgentStatus.ACTIVE;
        this.emit({ type: 'agent:active', id: tracker.agentId });
      } else {
        tracker.status = AgentStatus.IDLE;
        this.emit({ type: 'agent:idle', id: tracker.agentId });
      }

      // Sync state to room manager
      this.syncAgentState(tracker);
      tracker.lastActivityMs = Date.now();
    } catch {
      // File might have been deleted between scan and read
    }
  }

  // ==========================================================================
  // FILE TAILING
  // ==========================================================================

  /**
   * Tail all active sessions for new content.
   * Called every ~1 second by the scan interval.
   */
  private async tailAllSessions(): Promise<void> {
    if (!this.running) return;

    const promises = Array.from(this.sessions.values()).map((tracker) =>
      this.tailSession(tracker).catch(() => {
        // Ignore individual session errors
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Tail a single session file from its last known offset.
   * Reads new bytes, splits into lines, and emits events.
   */
  private async tailSession(tracker: SessionTracker): Promise<void> {
    let fh: FileHandle | null = null;

    try {
      // Check if file still exists and get its size
      const stats = await stat(tracker.filePath);
      const fileSize = stats.size;

      // Nothing new to read
      if (fileSize <= tracker.offset) return;

      // Open file and read new bytes
      fh = await open(tracker.filePath, 'r');
      const bytesToRead = fileSize - tracker.offset;
      const buffer = Buffer.alloc(bytesToRead);
      await fh.read(buffer, 0, bytesToRead, tracker.offset);

      // Convert to string and prepend any partial line from last read
      const newContent = tracker.partialLine + buffer.toString('utf-8');

      // Split into lines — the last element might be incomplete
      const lines = newContent.split('\n');
      tracker.partialLine = lines.pop() || ''; // Save incomplete last line

      // Update offset
      tracker.offset = fileSize - Buffer.byteLength(tracker.partialLine, 'utf-8');

      // Process complete lines
      for (const line of lines) {
        if (!line.trim()) continue;
        this.processLine(tracker, line);
      }
    } catch (err: any) {
      // File was deleted → agent left the office
      if (err.code === 'ENOENT') {
        this.closeSession(tracker);
      }
    } finally {
      if (fh) {
        await fh.close().catch(() => {});
      }
    }
  }

  /**
   * Process a single JSONL line and emit the corresponding event.
   */
  private processLine(tracker: SessionTracker, line: string): void {
    // Ensure agent is created before emitting activity events
    if (!tracker.created) {
      this.createAgent(tracker);
    }

    const event = parseTranscriptLine(line, tracker.agentId);
    if (!event) return;

    // Update tracker state
    tracker.lastActivityMs = Date.now();

    switch (event.type) {
      case 'agent:tool:start':
        tracker.currentTool = (event as any).toolName;
        tracker.status = AgentStatus.ACTIVE;
        break;

      case 'agent:tool:done':
        tracker.currentTool = null;
        tracker.status = AgentStatus.ACTIVE;
        break;

      case 'agent:idle':
        tracker.currentTool = null;
        tracker.status = AgentStatus.IDLE;
        break;

      case 'agent:active':
        tracker.status = AgentStatus.ACTIVE;
        break;

      case 'agent:subagent:spawn':
        // Subagent spawned — the subagent gets its own cat!
        // (If it creates a new JSONL file, the watcher will pick it up)
        break;
    }

    // Sync state back to room manager so getAgents() returns current info
    this.syncAgentState(tracker);

    this.emit(event);
  }

  // ==========================================================================
  // AGENT LIFECYCLE
  // ==========================================================================

  /** Create an agent (cat!) and register it. */
  private createAgent(tracker: SessionTracker): void {
    if (tracker.created) return;
    tracker.created = true;

    const agentInfo: AgentInfo = {
      id: tracker.agentId,
      name: tracker.agentName,
      roomId: tracker.roomId,
      adapterId: this.id,
      status: AgentStatus.IDLE,
      isSubagent: tracker.isSubagent,
      parentId: tracker.parentAgentId,
    };

    this.roomManager.addAgent(agentInfo);

    this.emit({
      type: 'agent:created',
      id: tracker.agentId,
      name: tracker.agentName,
      roomId: tracker.roomId,
      adapterId: this.id,
    });

    console.log(
      `[Claude] 🐱 ${tracker.agentName} joined room "${tracker.projectName}" (${tracker.sessionId})`
    );
  }

  /** Close a session and remove the agent. */
  private closeSession(tracker: SessionTracker): void {
    if (tracker.created) {
      this.emit({ type: 'agent:closed', id: tracker.agentId });
      this.roomManager.removeAgent(tracker.agentId);
      console.log(`[Claude] 🐱 ${tracker.agentName} left the office`);
    }

    this.sessions.delete(tracker.filePath);
  }

  /**
   * Clean up sessions that haven't had activity in a while.
   * IDLE_TIMEOUT_MS (5min) → mark as idle
   * DEAD_TIMEOUT_MS (30min) → remove entirely
   */
  private cleanupDeadSessions(): void {
    const now = Date.now();

    for (const tracker of this.sessions.values()) {
      const idleFor = now - tracker.lastActivityMs;

      if (idleFor > DEAD_TIMEOUT_MS) {
        console.log(
          `[Claude] ${tracker.agentName} timed out after ${Math.round(idleFor / 60000)}min`
        );
        this.closeSession(tracker);
      } else if (idleFor > IDLE_TIMEOUT_MS && tracker.status !== AgentStatus.IDLE) {
        tracker.status = AgentStatus.IDLE;
        tracker.currentTool = null;
        this.emit({ type: 'agent:idle', id: tracker.agentId });
      }
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /** Sync tracker state into the room manager's AgentInfo for getAgents(). */
  private syncAgentState(tracker: SessionTracker): void {
    const agents = this.roomManager.getAgents();
    const agent = agents.find((a) => a.id === tracker.agentId);
    if (agent) {
      agent.status = tracker.status;
      agent.currentTool = tracker.currentTool ?? undefined;
    }
  }

  private emit(event: AgentEvent): void {
    this.emitter.emit('event', event);
  }

  private pickCatName(): string {
    const name = CAT_NAMES[this.nameIndex % CAT_NAMES.length];
    this.nameIndex++;
    return name;
  }
}
