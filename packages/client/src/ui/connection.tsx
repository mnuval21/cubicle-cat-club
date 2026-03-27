import React from 'react';

interface ConnectionProps {
  isConnected: boolean;
}

/**
 * Connection status indicator overlay.
 */
export const ConnectionStatus: React.FC<ConnectionProps> = ({ isConnected }) => {
  const label = isConnected ? 'Connected' : 'Reconnecting...';

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#4ade80' : '#ef4444',
          animation: !isConnected ? 'pulse 1s infinite' : 'none',
        }}
      />
      <span style={{ color: isConnected ? '#4ade80' : '#ef4444' }}>
        {label}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
