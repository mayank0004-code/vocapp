import React from 'react';
import { DataProvider } from '../data/DataProvider';
import Kit from '../pages/Kit';
import '../styles/tokens.css';
import '../styles/base.css';

export default function AppShell({ currentUser, logout }) {
  return (
    <DataProvider currentUser={currentUser}>
      <div style={{ position: 'relative' }}>
        {/* Top Control Bar for Phase 1 Testing */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(22, 22, 24, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--line)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}
        >
          <span style={{ color: 'var(--acc2)', fontWeight: 600 }}>
            Vocapp v2 · Phase 1 Kit
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                localStorage.setItem('vocapp.ui', 'v1');
                window.location.search = '?ui=v1';
              }}
              style={{
                background: 'var(--card2)',
                color: 'var(--fg)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Classic UI
            </button>
            <button
              onClick={logout}
              style={{
                background: 'var(--badbg)',
                color: 'var(--bad)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Phase 1 Foundations & Component Kit */}
        <Kit />
      </div>
    </DataProvider>
  );
}
