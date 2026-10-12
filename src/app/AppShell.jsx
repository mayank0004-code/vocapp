import React, { useState } from 'react';
import { DataProvider } from '../data/DataProvider';
import NavStackProvider, { useNav } from './NavStack';
import TabBar from './TabBar';
import WordsScreen from '../features/words/WordsScreen';
import Kit from '../pages/Kit';
import { ToastContainer } from '../ui/Toast';
import '../styles/tokens.css';
import '../styles/base.css';

function ShellContent({ currentUser, logout }) {
  const [activeTab, setActiveTab] = useState(2); // default to Words in Phase 2
  const { isTabBarHidden } = useNav();

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
        color: 'var(--fg)'
      }}
    >
      <ToastContainer />

      {/* Top Testing Control Bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
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
          Vocapp v2 · Phase 2 (Shell &amp; Words)
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

      {/* Tab Screen Containers (each has its own independent scroll) */}
      <main
        style={{
          position: 'absolute',
          inset: 0,
          top: '38px', // offset for top control bar
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {activeTab === 0 && (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px' }}>Today</h2>
            <p style={{ color: 'var(--mute)' }}>Today screen with Stories &amp; Unified Session lands in Phase 3.</p>
          </div>
        )}

        {activeTab === 1 && (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px' }}>Practice</h2>
            <p style={{ color: 'var(--mute)' }}>Practice Hub with 4 Drill Tiers lands in Phase 5.</p>
          </div>
        )}

        {activeTab === 2 && (
          <WordsScreen />
        )}

        {activeTab === 3 && (
          <div style={{ padding: '20px 0' }}>
            <Kit />
          </div>
        )}
      </main>

      {/* Floating Scrubbable TabBar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isHidden={isTabBarHidden}
      />
    </div>
  );
}

export default function AppShell({ currentUser, logout }) {
  return (
    <DataProvider currentUser={currentUser}>
      <NavStackProvider>
        <ShellContent currentUser={currentUser} logout={logout} />
      </NavStackProvider>
    </DataProvider>
  );
}
