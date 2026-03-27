# Cubicle Cat Club

> Your AI agents as cats in an office

Cubicle Cat Club turns your AI coding agents into animated pixel cats working in a virtual office. Watch them walk to their desks, type away, take naps, and sprint around in zoomies — all in real time as they execute tools and spawn subagents.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)

## Features

- **Real-time agent visualization** — AI agents appear as cats that walk, type, stretch, nap, and more based on their actual activity
- **Multiple agent support** — Cursor, Claude Code, Google Antigravity (via pluggable adapter architecture)
- **Multi-room offices** — Agents grouped by project workspace, switch between rooms with tabs
- **Character behavior system** — 8-state finite state machine with BFS pathfinding, idle wandering, speech bubbles showing current tools
- **6 cat palettes** — Orange (Claude), tuxedo (Gerald), and 4 more randomly assigned to agents
- **60fps Canvas rendering** — Imperative game loop with React UI overlays for buttery-smooth animation

## Install

Open a terminal and paste one line:

**Mac / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/mnuva21/cubicle-cat-club/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/mnuva21/cubicle-cat-club/main/install.ps1 | iex
```

That's it. It handles everything — Node.js, dependencies, building, and setting up the command.

### Launch anytime

```bash
cubicle-cats
```

Open a new terminal, type `cubicle-cats`, and your AI agents show up as cats. It automatically detects running Claude Code sessions.

> **To stop it:** Press **Ctrl+C** in the terminal.
>
> **Demo mode:** Run `cubicle-cats --mock` to see simulated cats without any real agents.

---

## Quick Start

```bash
# Prerequisites: Node.js >= 20

# Install dependencies
npm install

# Run with simulated agents (great for demo/development)
npm run mock

# Your browser opens automatically to the office
```

## Usage

| Command | Description |
|---------|-------------|
| `npm run mock` | Start with simulated agents (MockAdapter) |
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Build all packages |
| `npm run live` | Build and start in one command |
| `npm run typecheck` | Type-check the entire monorepo |

### CLI Options

```bash
npm run mock -- --port 3000    # Custom port (default: auto-selected)
npm run mock -- --no-open      # Don't auto-open browser
```

## How It Works

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Server     │ ◄──────────────► │   Client     │
│              │                   │              │
│  Adapters:   │   Agent events    │  Canvas:     │
│  - Mock      │ ──────────────► │  - Cats!     │
│  - Claude    │                   │  - Office    │
│  - Cursor    │                   │  - Furniture │
│  - ...       │                   │              │
└─────────────┘                   └─────────────┘
```

**Adapters** detect AI agent activity (file watching, hooks, etc.) and emit events. The **server** broadcasts these over WebSocket to the **client**, which renders cats in a tile-based office with pathfinding, animations, and speech bubbles.

### Cat States

| State | Trigger | Behavior |
|-------|---------|----------|
| Idle | No activity | Stands at desk or wanders nearby |
| Walk | New destination | Pathfinds via BFS at 3 tiles/sec |
| Type | Tool execution | Sits at desk, speech bubble shows tool |
| Stretch | Tool complete | Brief stretch animation |
| Nap | Extended idle | Sleeps at desk |
| Zoomies | Subagent spawned | Frantic sprint around the office |
| Knock | Tool error | Knocks on desk |

## Project Structure

```
cubicle-cat-club/
├── packages/
│   ├── shared/          # TypeScript types for client-server protocol
│   ├── server/          # Express + WebSocket server, adapter system
│   │   └── adapters/    # Mock, Claude Code, (Cursor, Antigravity planned)
│   └── client/          # React + Canvas game
│       ├── engine/      # Game loop, renderer, camera
│       ├── characters/  # Cat entities, state machine, pathfinding
│       ├── office/      # Tile map, furniture, layout
│       └── ui/          # React overlays (tabs, toolbar, connection)
└── install.sh           # One-line installer
```

## Architecture

This is a **TypeScript monorepo** (npm workspaces) with three packages:

- **`@cubicle-cat-club/shared`** — Discriminated union types for type-safe WebSocket messages
- **`@cubicle-cat-club/server`** — Express server with pluggable `EditorAdapter` interface for agent detection
- **`@cubicle-cat-club/client`** — React 19 app with an imperative Canvas 2D game loop (separate from React's render cycle for 60fps performance)

### Adding a New Adapter

Implement the `EditorAdapter` interface to support a new AI tool:

```typescript
interface EditorAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: AgentEvent) => void): void;
}
```

## Authors

**Melissa & Gerald**

## License

MIT
