import React from 'react';
import { RoomState } from '../engine/office-state';

interface ToolbarProps {
  activeRoom: RoomState | null;
}

/**
 * Agent list toolbar overlay.
 * Shows all agents in the active room with their status and current tool.
 */
export const Toolbar: React.FC<ToolbarProps> = ({ activeRoom }) => {
  if (!activeRoom) {
    return null;
  }

  const agents = Array.from(activeRoom.characters.values());

  const getStatusEmoji = (character: any) => {
    if (character.paletteIndex === 1) return '🎩';
    if (character.state === 'KNOCK') return '🤬';
    if (character.state === 'ZOOMIES') return '😼😼';
    if (character.currentTool || character.state === 'WALK' || character.state === 'TYPE') {
      return '💻';
    }
    if (character.state === 'NAP') return '💤';
    return '🐱';
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        right: 10,
        maxHeight: '150px',
        overflowY: 'auto',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#e2e8f0',
        zIndex: 999,
      }}
    >
      <div style={{ marginBottom: '8px', opacity: 0.7 }}>
        Agents ({agents.length})
      </div>
      {agents.map((character) => (
        <div
          key={character.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 0',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <span>{getStatusEmoji(character)}</span>
          <span style={{ flex: 1 }}>
            <strong>{character.name}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};
