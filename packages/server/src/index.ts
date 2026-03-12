/**
 * Express + WebSocket server for Cubicle Club.
 * Watches agent sources via adapters and broadcasts events to browser clients.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage } from 'http';
import type { EditorAdapter } from './adapters/types.js';
import type { AgentEvent, ServerMessage, ClientMessage } from '@cubicle-cat-club/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Represents a connected WebSocket client.
 */
interface ClientConnection {
  id: string;
  currentRoomId?: string;
}

/**
 * Start the Cubicle Club server.
 *
 * Returns an object containing the port and broadcast function.
 */
export async function startServer(
  adapter: EditorAdapter,
  port: number = 0
): Promise<{ port: number; broadcast: (event: ServerMessage) => void }> {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const clients = new Map<any, ClientConnection>();

  // Serve static client files
  const clientDistPath = resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  // Fallback to index.html for SPA routing
  app.get('/', (req, res) => {
    res.sendFile(resolve(clientDistPath, 'index.html'));
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', adapter: adapter.displayName });
  });

  /**
   * Broadcast an event to all connected clients.
   */
  const broadcast = (event: ServerMessage): void => {
    const message = JSON.stringify(event);
    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  };

  // WebSocket connection handling
  wss.on('connection', (ws, req: IncomingMessage) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const client: ClientConnection = { id: clientId };

    clients.set(ws, client);

    console.log(`[WS] Client connected: ${clientId}`);

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;

        switch (message.type) {
          case 'client:ready':
            console.log(`[WS] Client ${clientId} ready — sending current state`);

            // Send ALL rooms and agents to the newly connected client
            for (const room of adapter.getRooms()) {
              ws.send(JSON.stringify({
                type: 'room:discovered',
                roomId: room.id,
                projectName: room.projectName,
              }));
            }

            for (const agent of adapter.getAgents()) {
              // Send agent:created
              ws.send(JSON.stringify({
                type: 'agent:created',
                id: agent.id,
                name: agent.name,
                roomId: agent.roomId,
                adapterId: agent.adapterId,
                paletteIndex: agent.paletteIndex,
              }));

              // Send current status
              if (agent.currentTool) {
                ws.send(JSON.stringify({
                  type: 'agent:tool:start',
                  id: agent.id,
                  toolName: agent.currentTool,
                  toolStatus: 'running',
                }));
              } else if (agent.status === 'active') {
                ws.send(JSON.stringify({
                  type: 'agent:active',
                  id: agent.id,
                }));
              }
            }

            // Claude is always in the office — inject into the first room
            const rooms = adapter.getRooms();
            if (rooms.length > 0) {
              const firstRoom = rooms[0];
              const existingIds = new Set(adapter.getAgents().map(a => a.id));
              if (!existingIds.has('claude')) {
                ws.send(JSON.stringify({
                  type: 'agent:created',
                  id: 'claude',
                  name: 'Claude',
                  roomId: firstRoom.id,
                  adapterId: 'mascot',
                  paletteIndex: 0,
                }));
                ws.send(JSON.stringify({ type: 'agent:active', id: 'claude' }));
              }
            }

            // If Gerald is currently visiting, catch new client up
            if (gerald.present && gerald.roomId) {
              ws.send(JSON.stringify({
                type: 'agent:created',
                id: 'gerald',
                name: 'Gerald',
                roomId: gerald.roomId,
                adapterId: 'mascot',
                paletteIndex: 1,
              }));
              ws.send(JSON.stringify({ type: 'agent:active', id: 'gerald' }));
            }
            break;

          case 'client:switch-room':
            client.currentRoomId = message.roomId;
            console.log(`[WS] Client ${clientId} switched to room ${message.roomId}`);
            break;

          case 'client:ping':
            // Respond with pong (implicit keep-alive)
            break;
        }
      } catch (error) {
        console.error('[WS] Message parse error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WS] Client error (${clientId}):`, error.message);
    });
  });

  // Subscribe to adapter events and broadcast them
  adapter.onEvent((event: AgentEvent) => {
    broadcast(event);
  });

  // Gerald — surprise visitor. Shows up uninvited. Stays a while. Leaves.
  const gerald = { present: false, roomId: null as string | null };

  const scheduleGeraldVisit = (delayMs: number) => {
    setTimeout(() => {
      const rooms = adapter.getRooms();
      if (rooms.length === 0) {
        scheduleGeraldVisit(60_000); // no rooms yet, check again in 1min
        return;
      }

      gerald.roomId = rooms[0].id;
      gerald.present = true;
      console.log(`[Gerald] 🐱 Gerald has entered the building`);

      broadcast({ type: 'agent:created', id: 'gerald', name: 'Gerald', roomId: gerald.roomId, adapterId: 'mascot', paletteIndex: 1 } as any);
      broadcast({ type: 'agent:active', id: 'gerald' } as any);

      // Gerald stays for 5–10 minutes
      const stayMs = Math.random() * 5 * 60_000 + 5 * 60_000;
      setTimeout(() => {
        gerald.present = false;
        gerald.roomId = null;
        console.log(`[Gerald] 🐱 Gerald has left the building`);
        broadcast({ type: 'agent:closed', id: 'gerald' } as any);

        // Come back in 10–20 minutes
        scheduleGeraldVisit(Math.random() * 10 * 60_000 + 10 * 60_000);
      }, stayMs);
    }, delayMs);
  };

  // First visit: 3–8 minutes after server starts
  scheduleGeraldVisit(Math.random() * 5 * 60_000 + 3 * 60_000);

  // Start the server
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });

  // Get actual port (useful when port=0 for random assignment)
  const addr = server.address();
  const actualPort = addr && typeof addr === 'object' ? addr.port : port;

  console.log(`[Server] Listening on port ${actualPort}`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    wss.close();
    await adapter.stop();
    server.close(() => {
      process.exit(0);
    });
  });

  return { port: actualPort, broadcast };
}
