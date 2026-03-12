import React from 'react';
import { RoomState } from '../engine/office-state';

interface RoomTabsProps {
  rooms: RoomState[];
  activeRoomId: string | null;
  onSwitchRoom: (roomId: string) => void;
}

/**
 * Room tab switcher overlay.
 * Shows tabs at top for each room and allows switching between them.
 */
export const RoomTabs: React.FC<RoomTabsProps> = ({
  rooms,
  activeRoomId,
  onSwitchRoom,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        display: 'flex',
        gap: '4px',
        zIndex: 999,
      }}
    >
      {rooms.map((room) => (
        <button
          key={room.roomId}
          onClick={() => onSwitchRoom(room.roomId)}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: activeRoomId === room.roomId ? '#3b82f6' : '#1f2937',
            color: '#e5e7eb',
            border: '1px solid #4b5563',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            if (activeRoomId !== room.roomId) {
              target.style.backgroundColor = '#374151';
            }
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            if (activeRoomId !== room.roomId) {
              target.style.backgroundColor = '#1f2937';
            }
          }}
        >
          {room.projectName}
          <span style={{ marginLeft: '6px', opacity: 0.7 }}>
            ({room.characters.size})
          </span>
        </button>
      ))}
    </div>
  );
};
