import React from 'react';

export default function AppShell({ currentUser, logout }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0B0D',
      color: '#F4F3F0',
      fontFamily: 'Geist, system-ui, sans-serif',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>Vocapp v2</h1>
      <p style={{ color: '#8E8E93', fontSize: '15px', maxWidth: '320px', margin: '0 0 24px' }}>
        Foundations &amp; Redesign shell in progress.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => {
            localStorage.setItem('vocapp.ui', 'v1');
            window.location.search = '?ui=v1';
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            background: '#1F1F22',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F4F3F0',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Return to Classic UI
        </button>
        <button
          onClick={logout}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'rgba(255,107,107,0.15)',
            border: 'none',
            color: '#FF8A80',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
