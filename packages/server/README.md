# @cubicle-club/server

The WebSocket server for Cubicle Club. Watches Claude Code JSONL transcript files and agent adapters, then broadcasts real-time agent events to browser clients.

## Architecture

```
┌─────────────────────────────────────┐
│  Adapters (watch agent sources)     │
├─────────────────────────────────────┤
│  MockAdapter      (testing)         │
│  ClaudeAdapter    (JSONL files)     │
│  (future: Cursor, Antigravity)      │
└────────────┬────────────────────────┘
             │ AgentEvent stream
             ▼
┌─────────────────────────────────────┐
│  Express + HTTP Server              │
│  + WebSocket Broadcast              │
└─────────────────────────────────────┘
             │ WebSocket
             ▼
┌─────────────────────────────────────┐
│  Browser Clients (Cubicle Club UI)  │
└─────────────────────────────────────┘
```

## Quick Start

### Development (Mock Adapter)

```bash
npm run dev
# or
npm run mock
```

This starts the server with the **MockAdapter**, which simulates realistic agent behavior with cycling states and tool usage. Perfect for testing the UI without real Claude Code sessions.

The server will:
1. Auto-detect a random port (or use `--port <number>`)
2. Print the Cubicle Club banner with the server URL
3. Auto-open your browser (unless `--no-open` is set)
4. Broadcast simulated agent events over WebSocket

### Production

```bash
npm run build
npm start
```

Builds TypeScript and runs the compiled CLI.

## Command-Line Options

```
cubicle-club [options]

Options:
  --port <number>        Port to listen on (default: 0 = random)
  --mock                 Use mock adapter (demo mode, default if no real sessions)
  --replay <path>        Replay a saved session file (TODO)
  --speed <multiplier>   Replay speed (default: 1)
  --no-open              Don't auto-open browser
  --help                 Show help
  --version              Show version
```

### Examples

```bash
# Start on port 3000 with mock adapter
npm run mock -- --port 3000

# Start without auto-opening browser
npm run mock -- --no-open

# Start with Claude Code adapter (if sessions exist in ~/.claude/projects)
npm start
```

## Adapters

### EditorAdapter Interface

All adapters implement this interface:

```typescript
export interface EditorAdapter {
  id: string;                                    // 'mock', 'claude-code', etc
  displayName: string;                           // 'Mock Adapter', etc
  start(): Promise<void>;                        // Begin monitoring
  stop(): Promise<void>;                         // Stop monitoring
  onEvent(callback: (event: AgentEvent) => void): void;
  getRooms(): Room[];                            // Tracked projects/workspaces
  getAgents(): AgentInfo[];                      // Tracked agents
}
```

### MockAdapter

**File:** `src/adapters/mock-adapter.ts`

Simulates realistic agent behavior for development and testing.

**Features:**
- Creates 2 rooms: "cubicle-club" and "my-saas-app"
- Spawns 3 initial agents
- Cycles through agent states: spawning → active → tool → done → idle → (repeat)
- Randomly spawns tools from: Read, Bash, Edit, Write, Grep, Glob
- Periodically spawns new agents
- 30% chance of spawning a subagent
- ~3-5 second state transitions (realistic timing)

**Example events emitted:**
```json
{ "type": "agent:created", "id": "agent-xxx", "name": "Agent Uno", "roomId": "cubicle-club", "adapterId": "mock" }
{ "type": "agent:active", "id": "agent-xxx" }
{ "type": "agent:tool:start", "id": "agent-xxx", "toolName": "Read", "toolStatus": "running" }
{ "type": "agent:tool:done", "id": "agent-xxx", "toolId": "agent-xxx-tool-1" }
{ "type": "agent:idle", "id": "agent-xxx" }
```

### ClaudeAdapter

**File:** `src/adapters/claude-adapter.ts` (Skeleton — TODO markers for full implementation)

Watches `~/.claude/projects/` for JSONL transcript files and parses agent events.

**TODOs:**
- [ ] Integrate parser.ts to extract events from transcript lines
- [ ] Track file offsets for efficient incremental parsing
- [ ] Emit agent:created on first sighting
- [ ] Emit agent:active when assistant sends tool_use
- [ ] Emit agent:tool:done when user sends tool_result
- [ ] Map session IDs to rooms via RoomManager

**How it works (when complete):**
1. Scans `~/.claude/projects/` for recent `.jsonl` files (modified in last 30 minutes)
2. Watches for new files to appear
3. For each file, maintains a read offset
4. Incrementally reads new JSONL lines and parses them
5. Emits AgentEvents based on message types and tool info
6. Cleans up agents when transcripts are deleted

## Core Components

### src/index.ts

Express HTTP server + WebSocket server. Serves static client files and manages real-time client connections.

**Key functions:**
- `startServer(adapter, port)` — Start the server and return port + broadcast function
- `broadcast(event)` — Send an event to all connected clients

**WebSocket messages:**
- **Client → Server:** `client:ready`, `client:switch-room`, `client:ping`
- **Server → Client:** All AgentEvents (room:discovered, agent:created, agent:active, etc.)

### src/cli.ts

Command-line interface. Parses arguments, selects adapter, prints banner, handles browser auto-open.

### src/adapters/

**types.ts** — EditorAdapter interface (used by all adapters)

**mock-adapter.ts** — Full implementation for testing

**claude-adapter.ts** — Skeleton adapter (needs TODO implementation)

### src/parser.ts

JSONL transcript parser. Converts Claude Code message types to AgentEvents:

- **`"assistant"` + `tool_use`** → `agent:tool:start`
- **`"user"` + `tool_result`** → `agent:tool:done`
- **`"system"` + `turn_duration`** → `agent:idle`

Tool names are automatically formatted: `mcp__<uuid>__read_file` → `Read`

### src/watcher.ts

File watching utilities using chokidar:

- `scanForSessions(basePath)` — Find recent `.jsonl` files (modified in last 30 min)
- `watchForNewSessions(basePath, callback)` — Watch for new `.jsonl` files

Used by ClaudeAdapter to discover and monitor sessions.

### src/room-manager.ts

Maps projects to rooms and manages room↔agent relationships.

```typescript
const manager = new RoomManager();

// Add a session (creates a room if needed)
const room = manager.addSession('/home/user/.claude/projects/proj-123', 'session-abc');

// Track agents
manager.addAgent({ id: 'agent-1', roomId: room.id, ... });

// Query
manager.getRooms();              // All rooms
manager.getAgentsInRoom(roomId); // Agents in a specific room
```

## Event Flow

```
1. Adapter starts monitoring
   ↓
2. Adapter detects agent activity
   ↓
3. Adapter calls onEvent(event)
   ↓
4. CLI calls adapter.onEvent() callback
   ↓
5. Callback calls broadcast(event)
   ↓
6. broadcast() sends event to all connected WebSocket clients
   ↓
7. Client receives event and updates UI
```

## Dependencies

**Production:**
- `express` — HTTP server
- `ws` — WebSocket library
- `chokidar` — File watching
- `open` — Auto-open browser
- `commander` — CLI parsing
- `@cubicle-club/shared` — Shared types (AgentEvent, ServerMessage, etc.)

**Development:**
- `typescript` — Type checking
- `@types/node`, `@types/express`, `@types/ws` — Type definitions
- `tsx` — TypeScript executor (for dev hot reload)

## Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/`. Output is ES2022 modules.

## Testing Locally

### Mock Mode (Recommended)

```bash
npm run mock
```

Open http://localhost:3001 (or whatever port is printed).

The mock adapter will continuously spawn agents and cycle through states, giving you a realistic preview of the UI.

### With Real Claude Code Sessions

```bash
# Start a Claude Code session and create a file
~/.claude/projects/<hash>/session.jsonl

# Run the server (uses ClaudeAdapter)
npm start
```

## Troubleshooting

### "Port already in use"

Use `--port 0` (default) for a random free port, or specify a different port:

```bash
npm run mock -- --port 3002
```

### "Could not auto-open browser"

Use `--no-open` and manually visit the printed URL:

```bash
npm run mock -- --no-open
# Visit http://localhost:<port> manually
```

### No agents showing up

- For mock: run `npm run mock` (it auto-simulates agents)
- For Claude Code: ensure you have active sessions in `~/.claude/projects/`
- Check the console for error messages

## Architecture Decisions

### Why MockAdapter First?

The mock adapter lets you develop and test the UI without needing real Claude Code sessions running. It simulates realistic timings and state transitions, so you can see how the UI behaves under "live" conditions.

### Why Separate Adapters?

Different AI systems (Cursor, Antigravity, Claude Code) store agent info in different places. By using adapters, we can support them all with a unified event stream. Plus, adapters can run simultaneously (e.g., track both Cursor's native agents AND Claude Code running inside Cursor).

### Why EventEmitter Over Callbacks?

Multiple clients can subscribe to events. EventEmitter makes this clean and familiar to Node.js developers. Adapters don't need to know about the server; they just emit events.

## Future Enhancements

- [ ] ReplayAdapter for debugging with saved session files
- [ ] CursorAdapter using Hooks API
- [ ] AntigravityAdapter using file watching
- [ ] Agent persistence (save/load agent state)
- [ ] Rate limiting and backpressure handling
- [ ] Multi-room agent visualization
- [ ] Agent collaboration detection

---

**Created:** 2026-03-12
**Status:** MVP (MockAdapter + ClaudeAdapter skeleton complete, ready for testing)
