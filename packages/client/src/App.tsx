import { useRef, useEffect, useState } from 'react';
import { ServerMessage, ClientMessage, AgentStatus } from '@cubicle-cat-club/shared';
import { OfficeState } from './engine/office-state';
import { GameLoop } from './engine/game-loop';
import { loadAssets } from './engine/asset-loader';
import { createDefaultLayout } from './office/layout';
import { RoomTabs } from './ui/room-tabs';
import { Toolbar } from './ui/toolbar';
import { ConnectionStatus } from './ui/connection';

/**
 * Root App component.
 * Manages WebSocket connection, game loop, and UI overlays.
 */
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const officeStateRef = useRef<OfficeState>(new OfficeState());
  const gameLoopRef = useRef<GameLoop | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000);
  const isFirstConnectRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const dragCharRef = useRef<any>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Setup game loop and load assets
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameLoop = new GameLoop(canvas, officeStateRef.current);
    gameLoop.start();
    gameLoopRef.current = gameLoop;

    // Make gameLoop available globally for debugging
    (window as any).__gameLoop = gameLoop;

    // Load sprite assets in the background — game renders placeholders until ready
    loadAssets()
      .then(assets => {
        gameLoop.setAssets(assets);
        console.log('[Assets] Sprite sheets loaded ✓');
      })
      .catch(err => {
        console.warn('[Assets] Failed to load some sprites:', err);
      });

    return () => {
      gameLoop.stop();
    };
  }, []);

  // Update active room state
  useEffect(() => {
    const updateRoomState = () => {
      const activeRoomData = officeStateRef.current.getActiveRoom();
      setActiveRoom(activeRoomData);
      setRooms(officeStateRef.current.getRooms());
    };

    const interval = setInterval(updateRoomState, 100);
    return () => clearInterval(interval);
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        const ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setReconnectAttempt(0);
          reconnectDelayRef.current = 1000; // Reset reconnect delay

          // On reconnect (not first connect), clear stale state before replaying
          // server snapshot — prevents duplicate cats from agent:created replays
          if (!isFirstConnectRef.current) {
            console.log('Reconnected — clearing stale office state');
            officeStateRef.current.clearAll();
          }
          isFirstConnectRef.current = false;

          // Send ready message — server responds with full current state
          const readyMsg: ClientMessage = { type: 'client:ready' };
          ws.send(JSON.stringify(readyMsg));
        });

        ws.addEventListener('message', (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            handleServerMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        });

        ws.addEventListener('close', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          wsRef.current = null;

          const attempt = (reconnectAttemptRef.current += 1);
          setReconnectAttempt(attempt);

          // Attempt reconnect with exponential backoff
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (attempt ${attempt})...`);
            connectWebSocket();
          }, reconnectDelayRef.current);

          // Increase reconnect delay up to 30 seconds
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, 30000);
        });

        ws.addEventListener('error', (event) => {
          console.error('WebSocket error:', event);
        });

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * Handle incoming server messages.
   */
  const handleServerMessage = (message: ServerMessage) => {
    const officeState = officeStateRef.current;

    switch (message.type) {
      case 'room:discovered':
        console.log(`Room discovered: ${message.roomId} (${message.projectName})`);
        const layout = createDefaultLayout();
        officeState.addRoom(message.roomId, message.projectName, layout);
        break;

      case 'agent:created':
        console.log(`Agent created: ${message.id} (${message.name})`);
        officeState.addAgent({
          id: message.id,
          name: message.name,
          roomId: message.roomId,
          adapterId: message.adapterId,
          status: AgentStatus.IDLE,
          isSubagent: false,
          paletteIndex: message.paletteIndex,
        });
        break;

      case 'agent:active':
        officeState.updateAgentStatus(message.id, 'active');
        break;

      case 'agent:idle':
        officeState.updateAgentStatus(message.id, 'idle');
        break;

      case 'agent:waiting':
        officeState.updateAgentStatus(message.id, 'waiting');
        break;

      case 'agent:tool:start':
        officeState.setToolActive(message.id, message.toolName);
        break;

      case 'agent:tool:done':
        officeState.clearTool(message.id);
        if (message.isError) {
          officeState.triggerBehavior(message.id, 'knock');
        }
        break;

      case 'agent:closed':
        console.log(`Agent closed: ${message.id}`);
        officeState.removeAgent(message.id);
        break;

      case 'agent:subagent:spawn':
        console.log(`Subagent spawned: ${message.id} (parent: ${message.parentId})`);
        // Trigger zoomies on the parent cat
        officeState.triggerBehavior(message.parentId, 'zoomies');
        break;

      case 'agent:subagent:despawn':
        console.log(`Subagent despawned: ${message.id}`);
        officeState.removeAgent(message.id);
        break;
    }
  };

  const getWorldCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const gameLoop = gameLoopRef.current;
    if (!canvas || !gameLoop) return null;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const camera = gameLoop.getRenderer().getCamera();
    return {
      worldX: (screenX + camera.x) / camera.zoom,
      worldY: (screenY + camera.y) / camera.zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getWorldCoords(e);
    if (!coords) return;
    const { worldX, worldY } = coords;
    mouseDownPosRef.current = { x: worldX, y: worldY };
    dragMovedRef.current = false;

    const character = officeStateRef.current.findCharacterAt(worldX, worldY);
    if (character) {
      dragCharRef.current = character;
      dragOffsetRef.current = { x: worldX - character.x, y: worldY - character.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragCharRef.current || !mouseDownPosRef.current) return;
    const coords = getWorldCoords(e);
    if (!coords) return;
    const { worldX, worldY } = coords;

    const dx = worldX - mouseDownPosRef.current.x;
    const dy = worldY - mouseDownPosRef.current.y;
    if (!dragMovedRef.current && dx * dx + dy * dy > 25) {
      dragMovedRef.current = true;
      officeStateRef.current.startDrag(dragCharRef.current);
    }

    if (dragMovedRef.current) {
      officeStateRef.current.updateDrag(
        dragCharRef.current,
        worldX,
        worldY,
        dragOffsetRef.current.x,
        dragOffsetRef.current.y
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getWorldCoords(e);
    if (!coords) return;
    const { worldX, worldY } = coords;

    if (dragCharRef.current) {
      if (dragMovedRef.current) {
        officeStateRef.current.endDrag(dragCharRef.current, worldX, worldY);
      } else {
        // It was a click, not a drag
        const activeRoom = officeStateRef.current.getActiveRoom();
        if (activeRoom) {
          officeStateRef.current.handleClick(worldX, worldY, activeRoom.tileMap);
        }
      }
    }

    dragCharRef.current = null;
    dragMovedRef.current = false;
    mouseDownPosRef.current = null;
  };

  /**
   * Handle room switch from UI.
   */
  const handleSwitchRoom = (roomId: string) => {
    officeStateRef.current.switchRoom(roomId);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: 'client:switch-room', roomId };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: 'block',
          backgroundColor: '#1a1a2e',
          cursor: 'pointer',
        }}
      />

      <RoomTabs
        rooms={rooms}
        activeRoomId={officeStateRef.current.activeRoomId}
        onSwitchRoom={handleSwitchRoom}
      />

      <Toolbar activeRoom={activeRoom} />

      <ConnectionStatus isConnected={isConnected} reconnectAttempt={reconnectAttempt} />
    </div>
  );
}

export default App;
