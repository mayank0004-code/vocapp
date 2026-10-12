import React, { useState } from 'react';
import { LazyMotion, domMax } from 'framer-motion';
import { DataProvider } from '../data/DataProvider';
import NavStackProvider, { useNav } from './NavStack';
import TabBar from './TabBar';
import TodayScreen from '../features/today/TodayScreen';
import WordsScreen from '../features/words/WordsScreen';
import PracticeHub from '../features/practice/PracticeHub';
import ProgressScreen from '../features/progress/ProgressScreen';
import Kit from '../pages/Kit';
import { ToastContainer, showToast } from '../ui/Toast';
import SessionOverlay from '../features/session/SessionOverlay';
import '../styles/tokens.css';
import '../styles/base.css';

function ShellContent({ currentUser, logout }) {
  const [activeTab, setActiveTab] = useState(0); // Default to Today
  const [sessionConfig, setSessionConfig] = useState({ isOpen: false, mode: 'full', payload: {} });
  const { isTabBarHidden } = useNav();

  const handleStartSession = (mode = 'full', payload = {}) => {
    setSessionConfig({ isOpen: true, mode, payload });
  };

  const handleCloseSession = () => {
    setSessionConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Global keyboard shortcuts: 1-4 for tabs
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && /^(INPUT|TEXTAREA|SELECT)$/i.test(activeEl.tagName);
      if (isInput) return;

      if (/^[1-4]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !sessionConfig.isOpen) {
        setActiveTab(parseInt(e.key, 10) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionConfig.isOpen]);

  return (
    <div className="stagewrap">
      {/* Desktop Legend Sidebar (visible on viewports > 980px) */}
      <aside className="legend">
        <h1>Vocapp, <em>in motion</em></h1>
        <p>The approved redesign with its motion layer. Everything springs from where it is, follows your finger and can be grabbed mid-flight.</p>
        <ol>
          <li><b>1</b><span>Press on the tab bar and slide your finger along it to scrub between tabs. A tap works too.</span></li>
          <li><b>2</b><span>On Words, swipe the All · Due · Saved · Mastered tabs left and right.</span></li>
          <li><b>3</b><span>Open a word, drill or Settings, then drag from the left edge to go back.</span></li>
          <li><b>4</b><span>Look up any word in Today, then Save for later or Practise now. Swipe a saved word left to remove it.</span></li>
          <li><b>5</b><span>Start a session: tap a card to flip it, then swipe right if you knew it, left if not. Keys: <kbd>Space</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>1</kbd>–<kbd>4</kbd> <kbd>Esc</kbd></span></li>
          <li><b>6</b><span>Scroll any page: the title folds into a frosted bar and the tab bar steps aside.</span></li>
        </ol>
      </aside>

      {/* Centered Phone Canvas */}
      <div className="phone">
        {/* Dynamic Island Statusbar */}
        <div className="statusbar">
          <span className="num">9:41</span>
          <div className="isl" />
          <svg width="62" height="12" viewBox="0 0 62 12" fill="#F4F3F0" aria-hidden="true">
            <rect x="0" y="7" width="3" height="5" rx="1" />
            <rect x="5" y="5" width="3" height="7" rx="1" />
            <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
            <rect x="34" y="1" width="23" height="10" rx="3" fill="none" stroke="#F4F3F0" opacity=".5" />
            <rect x="36" y="3" width="17" height="6" rx="1.5" />
            <rect x="58.5" y="4" width="1.8" height="4" rx=".9" opacity=".5" />
          </svg>
        </div>

        {/* Homebar Indicator */}
        <div className="homebar" />

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: 'var(--bg)',
            color: 'var(--fg)'
          }}
        >
          <ToastContainer />

          {/* Fullscreen Session Overlay */}
          <SessionOverlay
            isOpen={sessionConfig.isOpen}
            mode={sessionConfig.mode}
            targetWord={sessionConfig.payload?.word || 'albeit'}
            weakWords={sessionConfig.payload?.weak || []}
            onClose={handleCloseSession}
            onGoToWords={() => {
              handleCloseSession();
              setActiveTab(2);
            }}
          />

          {/* Top Testing Control Bar */}
          <header
            style={{
              position: 'absolute',
              top: '40px', // below status bar
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'rgba(22, 22, 24, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--line)',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
          >
            <span style={{ color: 'var(--acc2)', fontWeight: 600 }}>
              Vocapp v2 · Redesign Active
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
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '11.5px',
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
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
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
              top: '74px', // offset for statusbar + test bar
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {activeTab === 0 && (
              <TodayScreen
                onSwitchTab={setActiveTab}
                onStartSession={handleStartSession}
              />
            )}

            {activeTab === 1 && (
              <PracticeHub onSwitchTab={setActiveTab} />
            )}

            {activeTab === 2 && (
              <WordsScreen />
            )}

            {activeTab === 3 && (
              <ProgressScreen onSwitchTab={setActiveTab} />
            )}
          </main>

          {/* Floating Scrubbable TabBar */}
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isHidden={isTabBarHidden}
          />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ currentUser, logout }) {
  return (
    <LazyMotion features={domMax}>
      <DataProvider currentUser={currentUser}>
        <NavStackProvider>
          <ShellContent currentUser={currentUser} logout={logout} />
        </NavStackProvider>
      </DataProvider>
    </LazyMotion>
  );
}

