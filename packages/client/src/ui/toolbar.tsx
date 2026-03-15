import React, { useState } from 'react';
import { RoomState } from '../engine/office-state';

interface ToolbarProps {
  activeRoom: RoomState | null;
}

/**
 * Agent list toolbar overlay.
 * Shows all agents in the active room with their status and current tool.
 * Click the header to collapse/expand.
 */
export const Toolbar: React.FC<ToolbarProps> = ({ activeRoom }) => {
  const [collapsed, setCollapsed] = useState(false);

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
      onClick={() => setCollapsed(!collapsed)}
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        right: 10,
        maxHeight: collapsed ? undefined : '150px',
        overflowY: collapsed ? 'hidden' : 'auto',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#e2e8f0',
        zIndex: 999,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          marginBottom: collapsed ? 0 : '8px',
          opacity: 0.7,
          display: 'flex',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <span>Agents ({agents.length})</span>
        <span>{collapsed ? '\u25B2' : '\u25BC'}</span>
      </div>
      {!collapsed && agents.map((character) => (
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
