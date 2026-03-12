# Cubicle Club - Client Package

A React + Canvas 2D browser application that renders an animated pixel art office with characters representing AI agents.

## Architecture

### Core Systems

#### Engine (`src/engine/`)
- **OfficeState**: Imperative game state manager. Maintains all rooms, characters, and dispatches updates. Core nexus for all game logic.
- **GameLoop**: requestAnimationFrame loop coordinator. Manages frame timing, delta calculations (capped at 100ms), and orchestrates state updates and rendering.
- **Renderer**: Canvas drawing system. Renders tile map, furniture, characters, and UI elements with camera transformation.
- **Camera**: Viewport management. Handles zoom (1-10x), smooth following, and coordinate space conversions (screen ↔ world).

#### Characters (`src/characters/`)
- **Character**: Agent representation. Tracks position, animation state, direction, movement path, and behavior timers.
- **State Machine**: Character behavior controller. Manages transitions between IDLE (wandering), WALK (pathfinding), and TYPE (tool use) states.
- **Pathfinding**: BFS pathfinding algorithm. Finds shortest routes on walkable tiles, respects obstacles.

#### Office (`src/office/`)
- **TileMap**: 20x11 grid spatial data. Supports WALL, FLOOR, VOID tile types.
- **Furniture & Seats**: Desk/chair combos and plant decorations. Seats represent agent workstations.
- **Layout**: Default office generator. Creates walls, floor, furniture grid, and seating.

#### UI (`src/ui/`)
- **RoomTabs**: Room switcher overlay. Displays tabs for each project room, shows agent count.
- **Toolbar**: Agent status display. Lists all agents with real-time status (active/idle/using-tool).
- **ConnectionStatus**: WebSocket connection indicator. Shows connection state with auto-reconnect UI.

### Data Flow

1. **WebSocket → App.tsx**: Server sends `ServerMessage` events
2. **App.tsx → OfficeState**: Messages dispatched to state manager
3. **OfficeState → Character**: State changes propagate to characters
4. **GameLoop**: Each frame updates state, then renders
5. **Character.update()**: Runs state machine, path following, animations
6. **Renderer.render()**: Canvas drawing with camera transforms

### Character Behavior

Characters cycle through states:
- **IDLE**: Stand at workstation, wander in 3-6 tile radius, 5-15s between wanders
- **WALK**: Follow BFS-calculated path to wander destination at 48px/sec (3 tiles/sec)
- **TYPE**: Sit at desk with speech bubble showing active tool name

## Key Features

- **Multi-room support**: Clients can switch between project rooms via tab UI
- **Real-time updates**: WebSocket-driven agent lifecycle (create, active, idle, tool:start/done, closed)
- **Subagent tracking**: Parent-child agent relationships displayed consistently
- **Smooth animations**: Delta-time based movement with 16px tile grid
- **Pixel art rendering**: Simple colored rectangles with direction indicators
- **Camera system**: Smooth follow + zoom for future camera focus
- **Full viewport**: Dark theme (#1a1a2e background), no scrollbars

## Build & Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext
- **JSX**: react-jsx
- **Strict Mode**: Enabled
- **Composite**: True (workspace support via monorepo)

## Dependencies

- **React 19**: UI framework
- **React DOM 19**: DOM rendering
- **@cubicle-club/shared**: Type definitions and constants

## Environment

- **Vite 5**: Fast build tool and dev server
- **TypeScript 5.3**: Static type checking
- **@vitejs/plugin-react 4.2**: React fast refresh

## File Structure

```
client/
├── index.html              # Vite entry point, dark background
├── tsconfig.json          # TypeScript config with composite=true
├── vite.config.ts         # Vite React configuration
├── package.json           # Dependencies and scripts
├── src/
│   ├── main.tsx          # React 19 createRoot entry
│   ├── App.tsx           # Root component, WebSocket management
│   ├── engine/
│   │   ├── office-state.ts       # Game state manager (imperative)
│   │   ├── game-loop.ts          # requestAnimationFrame loop
│   │   ├── renderer.ts           # Canvas drawing engine
│   │   └── camera.ts             # Viewport management
│   ├── characters/
│   │   ├── character.ts          # Agent representation
│   │   ├── state-machine.ts      # Behavior FSM
│   │   └── pathfinding.ts        # BFS path algorithm
│   ├── office/
│   │   ├── tile-map.ts           # Grid spatial data
│   │   ├── furniture.ts          # Furniture & seating
│   │   └── layout.ts             # Office generator
│   └── ui/
│       ├── room-tabs.tsx         # Room switcher
│       ├── toolbar.tsx           # Agent status list
│       └── connection.tsx        # WebSocket indicator
```

## Message Protocol

### Client → Server (ClientMessage)
```typescript
{ type: 'client:ready' }                    // Initial handshake
{ type: 'client:switch-room', roomId }     // Change active room
{ type: 'client:ping' }                     // Keep-alive
```

### Server → Client (ServerMessage / AgentEvent)
```typescript
{ type: 'room:discovered', roomId, projectName }
{ type: 'agent:created', id, name, roomId, adapterId }
{ type: 'agent:active', id }
{ type: 'agent:idle', id }
{ type: 'agent:waiting', id }
{ type: 'agent:tool:start', id, toolName, toolStatus }
{ type: 'agent:tool:done', id, toolId }
{ type: 'agent:closed', id }
{ type: 'agent:subagent:spawn', id, parentId }
{ type: 'agent:subagent:despawn', id }
```

## Next Steps

- Implement sprite-based rendering instead of colored rectangles
- Add mouse interaction (camera pan/zoom controls)
- Add animation frames for different character poses
- Implement speech bubble text wrapping and sizing
- Add particle effects for tool interactions
- Optimize rendering for 100+ agents
