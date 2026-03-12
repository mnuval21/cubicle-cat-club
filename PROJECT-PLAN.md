# Cubicle Club — Project Plan

> Your AI agents deserve an office. 🏢
>
> An animated pixel art agent visualizer for Cursor, Google Antigravity, and beyond.

**Created:** 2026-03-11
**Authors:** Melissa & Gerald

---

## 1. Vision

**Cubicle Club** is a VS Code extension that brings AI coding agents to life as animated pixel characters in a virtual office. Inspired by [pixel-agents](https://github.com/pablodelucca/pixel-agents) (which only supports Claude Code), Cubicle Club targets the editors people actually use daily — **Cursor** and **Google Antigravity** — with a modular adapter architecture that makes adding new editors trivial.

### What Makes This Different from Pixel Agents

| Aspect | Pixel Agents | Cubicle Club (Ours) |
|--------|-------------|---------------------|
| Editor support | Claude Code only | Cursor, Antigravity, Claude Code (extensible) |
| Agent detection | JSONL file polling only | Adapter pattern: Hooks API, file watching, Artifact inspection |
| Architecture | Tightly coupled to Claude Code | Modular — swap adapters per editor |
| Art style | Fixed 6 characters | TBD — our own style, more characters |
| Office system | Full editor (complex) | MVP: simple, functional, not over-engineered |

---

## 2. Research Summary

### 2.1 Pixel Agents Architecture (What We're Borrowing)

The original pixel-agents extension is a **game engine + IDE integration hybrid**:

- **Extension backend** (TypeScript, esbuild): Monitors Claude Code's JSONL transcript files at `~/.claude/projects/<hash>/<session>.jsonl` using a triple-redundancy file watcher (fs.watch + fs.watchFile + setInterval polling)
- **Webview UI** (React 19, Vite, Canvas 2D): Imperative game loop at 60fps, separate from React's render cycle. React handles UI overlays (toolbar, modals); Canvas handles characters, office, animations
- **Character system**: 6 sprite palettes, 16×32px frames, BFS pathfinding on tile grid, state machine (IDLE → WALK → TYPE), hue shifting for duplicates
- **Office system**: Tile-based layout (up to 64×64), furniture catalog, HSB colorization per tile, persistent layouts at `~/.pixel-agents/layout.json`
- **Communication**: VS Code webview message passing (postMessage / onDidReceiveMessage)

**Patterns we'll adopt:**
- Imperative game loop separate from React state (critical for 60fps Canvas)
- Message-based IPC between extension and webview
- BFS pathfinding on tile grid
- Character state machine architecture
- Sprite caching per zoom level

**Patterns we'll improve:**
- Agent detection (adapter pattern instead of hardcoded JSONL parsing)
- File watching (their triple-redundancy approach is defensive but messy)
- Layout persistence (simpler, workspace-scoped by default)
- Sub-agent visualization (more intuitive than matrix rain spawn)

### 2.2 Cursor Agent System

**How agents work internally:**
- Cursor 2.0 uses a proprietary Composer model with MoE architecture
- Multi-agent: up to 8 simultaneous agents (Architect, Planner, Implementation agents)
- Uses Git worktrees for workspace isolation

**How we can track agents:**

| Method | Viability | Notes |
|--------|-----------|-------|
| **Hooks API** (v1.7+) | Best option | `afterFileEdit`, `beforeMCPExecution`, `stop` callbacks |
| **Transcript files** | Possible but fragile | `.cursor/projects/` — format is proprietary/undocumented |
| **Cloud Agent REST API** | For cloud agents only | Webhook support for status changes (ERROR, FINISHED) |
| **MCP Extension API** | Indirect | Register MCP servers programmatically |

**Recommended approach:** Primary: Hooks API for real-time callbacks. Fallback: file watching on `.cursor/` directories with format reverse-engineering.

**Extension compatibility:** Cursor uses Open VSX Registry, not Microsoft Marketplace. VS Code extensions work with minor caveats.

### 2.3 Google Antigravity Agent System

Google Antigravity is Google's VS Code fork, announced November 2025 alongside Gemini 3. It's a full agentic development platform powered by Gemini 3.1 Pro and Gemini 3 Flash, with support for Claude Sonnet 4.5 and GPT-OSS.

**How the Agent Manager works:**
- Dedicated "Mission Control" interface for spawning/orchestrating multiple agents asynchronously
- Agents work across 3 surfaces: Editor, Terminal, and Browser (headless Chromium via Chrome extension)
- Artifacts system: agents produce task lists, implementation plans, code diffs, screenshots, and browser recordings
- "Google Docs-style" feedback directly on artifacts — agents incorporate feedback without halting
- Knowledge base: agents save useful context and code snippets for future tasks
- Execution policies: granular permissions for terminal ("always proceed" / "request review"), review policy, and JS execution

**Configuration & file locations:**
- Rules: `~/.gemini/GEMINI.md` (global) or `.agents/rules/` (per-workspace)
- Skills: `~/.gemini/antigravity/skills/` (global) or `.agents/skills/` (per-workspace)
- Browser allowlist: `~/.gemini/antigravity/browserAllowlist.txt`
- Security: allow lists (whitelist) and deny lists (blocklist) for commands

**How we can track agents:**

| Method | Viability | Notes |
|--------|-----------|-------|
| **File watching** (`~/.gemini/antigravity/`) | Most promising | Agent state, brain data, artifacts stored here |
| **Artifact inspection** | Good for status | Agents produce task lists, screenshots, diffs — we can watch for these |
| **MCP Protocol** | Possible | Antigravity added MCP Servers support (Dec 2025) |
| **Extension API** | Unknown | No public extension API docs for agent lifecycle yet |

**Recommended approach:** Primary: file watching on `~/.gemini/antigravity/` directories for agent state changes and artifact creation. Secondary: MCP integration once documented. This is the riskiest adapter — Antigravity's internals are the least documented of our targets.

**Extension compatibility:** VS Code extensions work. Uses Open VSX Registry (not Microsoft Marketplace). Key Microsoft-proprietary extensions (Pylance, C# Dev Kit) are blocked.

### 2.4 The Key Insight

None of these editors expose a clean, standardized agent transcript format like Claude Code's JSONL. This means we need an **adapter layer** that normalizes different tracking mechanisms into a unified agent event stream.

### 2.5 Multi-Adapter Stacking (Our Killer Feature)

Here's something pixel-agents can't do: **run multiple adapters simultaneously**.

Both Cursor and Antigravity support installing VS Code extensions, and Claude Code can run as a terminal inside either editor. When it does, it still writes JSONL transcripts to `~/.claude/projects/`. This means:

- In **Cursor**: you could have Composer agents (tracked via Cursor adapter) AND Claude Code agents (tracked via Claude adapter) running at the same time
- In **Antigravity**: you could have Agent Manager agents (tracked via Antigravity adapter) AND Claude Code agents (tracked via Claude adapter) simultaneously
- Each agent gets its own pixel character, regardless of which AI system spawned it

This is a genuine differentiator. Pixel-agents only sees Claude Code. **We see everything.**

The architecture supports this naturally — the Agent Event Bus merges events from all active adapters. The editor detection logic activates the appropriate native adapter (Cursor or Antigravity), and the Claude Code adapter activates independently if it detects Claude Code terminals. All agents flow into the same office.

```
┌─────────────────────────────────────────────┐
│  Running inside Cursor                       │
│                                              │
│  ┌──────────────┐   ┌───────────────────┐   │
│  │ Cursor       │   │ Claude Code       │   │
│  │ Adapter      │   │ Adapter           │   │
│  │ (Composer)   │   │ (JSONL watcher)   │   │
│  └──────┬───────┘   └────────┬──────────┘   │
│         │                    │               │
│         ▼                    ▼               │
│  ┌──────────────────────────────────────┐   │
│  │        Agent Event Bus               │   │
│  │  Cursor Agent #1  ← typing           │   │
│  │  Cursor Agent #2  ← reading files    │   │
│  │  Claude Agent #1  ← running bash     │   │
│  └──────────────────────────────────────┘   │
│         │                                    │
│         ▼                                    │
│  ┌──────────────────────────────────────┐   │
│  │   🖥️ Office: 3 characters working    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Visual differentiation:** Characters from different adapters could have distinct visual cues — different desk areas, name badge colors, or subtle sprite variations — so you can tell at a glance which AI system each character represents.

---

## 3. Architecture

### 3.1 High-Level Design

```
┌─────────────────────────────────────────────────┐
│                  VS Code Extension               │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │            Agent Event Bus                   │ │
│  │  (Normalized: created/active/tool/idle/done) │ │
│  └──────────────┬──────────────────────────────┘ │
│                 │                                 │
│    ┌────────────┼────────────┐                   │
│    ▼            ▼            ▼                   │
│ ┌────────┐ ┌────────┐ ┌──────────┐              │
│ │Cursor  │ │Anti-   │ │Claude    │  ...more     │
│ │Adapter │ │gravity │ │Code      │  adapters    │
│ │        │ │Adapter │ │Adapter   │              │
│ └────────┘ └────────┘ └──────────┘              │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         Webview (React + Canvas 2D)          │ │
│  │                                               │ │
│  │  ┌───────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │ Game Loop │  │Character │  │  Office   │ │ │
│  │  │ (60fps)   │  │ System   │  │  Renderer │ │ │
│  │  └───────────┘  └──────────┘  └───────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.2 Adapter Interface

Every editor adapter implements this interface:

```typescript
// src/adapters/types.ts

interface AgentEvent {
  type: 'agent:created' | 'agent:active' | 'agent:idle'
      | 'agent:tool:start' | 'agent:tool:done'
      | 'agent:waiting' | 'agent:closed'
      | 'agent:subagent:spawn' | 'agent:subagent:despawn';
  agentId: string;
  adapterId: string;       // Which adapter produced this event
  timestamp: number;
  payload?: {
    toolName?: string;
    toolStatus?: string;
    parentAgentId?: string;
    metadata?: Record<string, unknown>;
  };
}

interface EditorAdapter {
  /** Unique adapter identifier */
  readonly id: string;

  /** Human-readable name */
  readonly displayName: string;

  /** Detect if this adapter should activate in current environment */
  canActivate(): boolean;

  /** Start monitoring for agent activity */
  activate(context: vscode.ExtensionContext): Promise<void>;

  /** Stop monitoring */
  deactivate(): Promise<void>;

  /** Subscribe to normalized agent events */
  onAgentEvent(callback: (event: AgentEvent) => void): vscode.Disposable;

  /** Get currently tracked agents */
  getActiveAgents(): AgentInfo[];

  /** Optional: launch a new agent (if editor supports it) */
  launchAgent?(options?: LaunchOptions): Promise<string>;
}

interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'waiting';
  currentTool?: string;
  isSubagent: boolean;
  parentId?: string;
}
```

### 3.3 Editor Detection & Adapter Stacking

Unlike pixel-agents (which activates exactly one detection method), we activate **all applicable adapters** simultaneously. The Claude Code adapter is always eligible as a secondary adapter since Claude Code can run inside any VS Code fork.

```typescript
// src/adapters/detect.ts

interface DetectionResult {
  primary: 'cursor' | 'antigravity' | 'vscode';
  secondary: ('claude-code')[];  // Adapters that can run alongside primary
}

function detectAdapters(): DetectionResult {
  const appName = vscode.env.appName.toLowerCase();

  // Determine primary adapter based on which editor we're running in
  let primary: DetectionResult['primary'] = 'vscode';
  if (appName.includes('cursor')) primary = 'cursor';
  else if (appName.includes('antigravity')) primary = 'antigravity';

  // Claude Code adapter is always eligible as secondary —
  // it activates independently when it detects Claude Code terminals
  const secondary: DetectionResult['secondary'] = ['claude-code'];

  return { primary, secondary };
}
```

### 3.4 Cursor Adapter (Hooks API)

```typescript
// src/adapters/cursor-adapter.ts

class CursorAdapter implements EditorAdapter {
  readonly id = 'cursor';
  readonly displayName = 'Cursor';

  canActivate(): boolean {
    return vscode.env.appName.toLowerCase().includes('cursor');
  }

  async activate(context: vscode.ExtensionContext): Promise<void> {
    // Strategy 1: Listen for Cursor Hooks events
    // afterFileEdit → agent:active + tool info
    // stop → agent:idle
    // beforeMCPExecution → agent:tool:start

    // Strategy 2: Watch .cursor/projects/ for transcript changes
    // (Fallback — format needs reverse engineering)

    // Strategy 3: Poll Cloud Agent REST API (if configured)
  }
}
```

### 3.5 Antigravity Adapter (File Watching + Artifacts)

```typescript
// src/adapters/antigravity-adapter.ts

class AntigravityAdapter implements EditorAdapter {
  readonly id = 'antigravity';
  readonly displayName = 'Google Antigravity';

  canActivate(): boolean {
    return vscode.env.appName.toLowerCase().includes('antigravity');
  }

  async activate(context: vscode.ExtensionContext): Promise<void> {
    // Strategy 1: Watch ~/.gemini/antigravity/ for agent state changes
    // Brain data, artifacts, task lists → detect active/idle/waiting

    // Strategy 2: Monitor .agents/ workspace directory
    // Rules and skills changes can indicate agent activity

    // Strategy 3: Artifact inspection
    // Watch for new screenshots, diffs, task lists → agent:active
    // Artifact completion → agent:idle

    // Strategy 4: MCP integration (once documented)
  }
}
```

### 3.6 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Extension | TypeScript + esbuild | Same as pixel-agents, proven pattern |
| Webview | React 19 + TypeScript + Vite | Modern, fast HMR in dev |
| Rendering | Canvas 2D | Imperative control for 60fps game loop |
| State | Imperative refs (not React state) | Canvas needs frame-by-frame updates |
| Pathfinding | BFS on tile grid | Simple, fast for small grids |
| Sprites | PNG sprite sheets | Standard pixel art pipeline |
| Testing | Vitest | Fast, TypeScript-native |

### 3.7 Project Structure

```
cubicle-club/
├── src/                           # Extension backend
│   ├── extension.ts              # Entry point, adapter selection
│   ├── adapters/
│   │   ├── types.ts              # EditorAdapter interface, AgentEvent
│   │   ├── detect.ts             # Editor detection logic
│   │   ├── cursor-adapter.ts     # Cursor Hooks + file watching
│   │   ├── antigravity-adapter.ts # File watching + artifact inspection
│   │   ├── claude-adapter.ts     # JSONL transcript parser (from pixel-agents)
│   │   └── mock-adapter.ts       # For development/testing
│   ├── agent-manager.ts          # Manages agent lifecycle via adapter
│   ├── webview-provider.ts       # VS Code webview lifecycle
│   ├── layout-persistence.ts     # Office layout save/load
│   └── types.ts                  # Shared types
│
├── webview-ui/                    # React webview
│   ├── src/
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # Mount point
│   │   ├── engine/
│   │   │   ├── game-loop.ts      # RAF-based 60fps loop
│   │   │   ├── office-state.ts   # Mutable game state
│   │   │   ├── renderer.ts       # Canvas drawing pipeline
│   │   │   └── camera.ts         # Zoom, pan, follow
│   │   ├── characters/
│   │   │   ├── character.ts      # Character entity
│   │   │   ├── state-machine.ts  # IDLE/WALK/TYPE transitions
│   │   │   ├── pathfinding.ts    # BFS on tile grid
│   │   │   ├── sprite-sheet.ts   # Sprite frame extraction
│   │   │   └── sprite-cache.ts   # Per-zoom-level caching
│   │   ├── office/
│   │   │   ├── tile-map.ts       # Grid, walls, walkability
│   │   │   ├── furniture.ts      # Desk, chair, decorations
│   │   │   └── layout.ts         # Serialization
│   │   ├── ui/
│   │   │   ├── toolbar.tsx       # Agent list, controls
│   │   │   ├── speech-bubble.tsx # Tool status overlays
│   │   │   └── status-bar.tsx    # Editor info display
│   │   └── hooks/
│   │       └── use-extension-messages.ts
│   │
│   ├── public/
│   │   └── assets/               # Sprites, layouts
│   │
│   └── vite.config.ts
│
├── scripts/                       # Build utilities
├── package.json                   # Extension manifest
├── esbuild.js                     # Extension bundler
├── tsconfig.json
└── README.md
```

---

## 4. MVP Scope (v0.1)

### 4.1 What's In

The MVP gets agents visible with basic states. No fancy office editor.

| Feature | Description |
|---------|-------------|
| **Editor detection** | Auto-detect Cursor vs Antigravity vs Claude Code |
| **Adapter stacking** | Run native + Claude Code adapters simultaneously — see ALL agents |
| **Agent tracking** | Detect when agents start/stop, track basic state |
| **Character rendering** | Animated pixel characters on a Canvas |
| **Basic states** | Idle, active (typing), waiting |
| **Speech bubbles** | Show current tool/action name |
| **Adapter badges** | Visual indicator of which AI system spawned each character |
| **Default office** | Pre-built layout, no editor yet |
| **Agent list** | Toolbar showing active agents (grouped by adapter) |
| **Zoom/pan** | Navigate the office view |

### 4.2 What's Out (Post-MVP)

- Office layout editor
- Custom furniture catalog
- Sub-agent visualization
- Custom sprite/character creation
- Sound effects
- Multi-workspace support
- Settings UI
- Layout import/export
- Performance stats overlay

### 4.3 MVP User Flow

1. Install extension in Cursor or Antigravity
2. Open the Cubicle Club panel (sidebar or bottom panel)
3. Start using your AI agent (Composer in Cursor, Agent Manager in Antigravity)
4. A pixel character appears and walks to a desk
5. Character animates based on agent state (typing when active, idle when waiting)
6. Speech bubble shows what tool the agent is using
7. When agent session ends, character walks away (or despawns)

---

## 5. Roadmap

### Phase 1: Foundation (Weeks 1–2)

- [ ] Scaffold project (extension + webview + build pipeline)
- [ ] Implement `EditorAdapter` interface and detection logic
- [ ] Build mock adapter for development (simulates agent events)
- [ ] Set up Canvas game loop + basic rendering
- [ ] Fork pixel-agents sprite sheet format, begin reskinning characters
- [ ] Character entity with sprite sheet loading
- [ ] Basic state machine (IDLE ↔ TYPE)
- [ ] BFS pathfinding on simple grid
- [ ] Default office layout (hardcoded)
- [ ] Adapter badge system (visual cues per AI system)

### Phase 2: Cursor Integration (Weeks 3–4)

- [ ] Implement Cursor adapter using Hooks API
- [ ] Reverse-engineer Cursor transcript file format (if needed)
- [ ] Map Cursor agent lifecycle to our event system
- [ ] Test with real Composer/Agent sessions
- [ ] Handle multi-agent (up to 8 simultaneous)

### Phase 3: Antigravity Integration (Weeks 5–6)

- [ ] Implement Antigravity adapter using file watching on `~/.gemini/antigravity/`
- [ ] Reverse-engineer agent state file format and artifact structure
- [ ] Map Agent Manager lifecycle to our event system
- [ ] Test with real Antigravity agent sessions
- [ ] Handle multi-agent (Antigravity supports parallel agents)

### Phase 4: Polish & Ship MVP (Weeks 7–8)

- [ ] Speech bubble system for tool status
- [ ] Agent list toolbar
- [ ] Zoom/pan controls
- [ ] Error handling and edge cases
- [ ] Extension marketplace packaging (Open VSX)
- [ ] README, screenshots, demo GIF
- [ ] Publish v0.1

### Future: Post-MVP

- Office layout editor
- Claude Code adapter (port from pixel-agents)
- VS Code adapters (Continue, Cline, Aider, Copilot)
- Premium character skin packs + office themes
- Agent collaboration visualization
- Performance dashboard overlay
- Sound effects
- Community skin marketplace

---

## 6. Key Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cursor Hooks API is beta and may change | Breaks adapter | Version-pin hooks config, maintain fallback (file watching) |
| Antigravity agent internals are undocumented | Slow integration, fragile adapter | Start with file-based detection, reverse-engineer formats, upgrade as Google publishes extension APIs |
| Transcript file formats are proprietary | Can't parse agent actions | Focus on lifecycle events (start/stop) rather than detailed tool tracking |
| Cross-editor webview differences | Rendering bugs | Test on all three editors in CI, use standard webview API only |
| Performance at 60fps in extension panel | Laggy office | Sprite caching, dirty-rect rendering, throttle to 30fps if needed |
| Editor updates break detection | Agents disappear | Graceful degradation — show "no agents detected" with troubleshooting |

---

## 7. Decisions (Resolved)

### Art Style: Fork + Reskin

We'll use the pixel-agents sprite structure as a foundation (MIT licensed) — same 16×32px frame dimensions, same animation frame layout (2 typing, 2 walking, 3 idle) — but **redraw all characters in our own style**. This gives us the fastest path to a working MVP while building a unique visual identity.

The sprite sheet format stays compatible, so we can swap in new art incrementally without touching animation code.

### Name: Cubicle Club

Repository: `cubicle-club`
Extension ID: `cubicle-club`
Marketplace name: **Cubicle Club**

### License & Monetization: Open Source + Premium Skins

- **Core extension**: MIT licensed, free forever, open to community contributions
- **Premium content**: Paid character packs, office themes, and seasonal skins (holiday office, cyberpunk theme, etc.)
- **Revenue model**: Extension marketplace or Gumroad for skin packs
- This mirrors successful models like VS Code themes — free tool, paid cosmetics

### VS Code Support: Yes, Post-MVP

- **MVP**: Cursor + Antigravity + Claude Code (via adapter stacking)
- **Post-MVP**: Add adapters for vanilla VS Code AI extensions (Continue, Cline, Aider, Copilot)
- This is a huge potential audience but each adapter is real engineering work, so we ship the core first

### Architecture: Mono-repo

Single extension with all adapters bundled. Tree-shaking ensures unused adapters don't bloat the final package. Simpler to develop, test, and publish.

---

## 8. Getting Started (Dev Setup)

```bash
# Prerequisites
node >= 20
npm >= 10

# Clone & scaffold
mkdir cubicle-club && cd cubicle-club
npm init -y
npm install -D typescript esbuild @types/vscode

# Webview
mkdir webview-ui && cd webview-ui
npm create vite@latest . -- --template react-ts
npm install
cd ..

# Development
npm run watch    # Extension + webview hot reload
# Press F5 in VS Code to launch Extension Development Host
```

---

*Welcome to the club.* 🏢🎮
