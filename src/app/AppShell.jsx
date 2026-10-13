import React, { useState } from 'react';
import { LazyMotion, domMax } from 'framer-motion';
import { DataProvider } from '../data/DataProvider';
import NavStackProvider, { useNav, NavPagesLayer } from './NavStack';
import TabBar, { TABS } from './TabBar';
import TodayScreen from '../features/today/TodayScreen';
import WordsScreen from '../features/words/WordsScreen';
import PracticeHub from '../features/practice/PracticeHub';
import ProgressScreen from '../features/progress/ProgressScreen';
import SettingsPage from '../features/settings/SettingsPage';
import { ToastContainer } from '../ui/Toast';
import SessionOverlay from '../features/session/SessionOverlay';
import { useLayout } from '../motion/useLayout';
import '../styles/tokens.css';
import '../styles/base.css';

function ShellContent({ currentUser, logout }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Today, 1: Practice, 2: Words, 3: Progress
  const [sessionConfig, setSessionConfig] = useState({ isOpen: false, mode: 'full', payload: {} });
  const { isTabBarHidden, hasPushed, push } = useNav();
  const { isLaptop } = useLayout();

  const handleStartSession = (mode = 'full', payload = {}) => {
    // Drills live in the Practice tab (classic Studio engine), not in a session.
    if (mode === 'drills') {
      setActiveTab(1);
      return;
    }
    setSessionConfig({ isOpen: true, mode, payload });
  };

  const handleCloseSession = () => {
    setSessionConfig(prev => ({ ...prev, isOpen: false }));
  };

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
  const avatarLetter = (displayName[0] || '').toUpperCase();

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
    <div className="app">
      {/* Toast notifications layer */}
      <ToastContainer />

      {/* Laptop Left Sidebar (232px wide, >=1024px) */}
      {isLaptop && (
        <aside
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '232px',
            background: 'var(--well)',
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30
          }}
        >
          {/* Logo Brand Header */}
          <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
              Vocapp
            </span>
          </div>

          {/* 4 Navigation Tabs */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 }}>
            {TABS.map((tab, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--acc2)' : 'var(--mute)',
                    background: isActive ? 'rgba(124, 136, 255, 0.14)' : 'transparent',
                    transition: 'background 0.2s, color 0.2s',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Settings & User Profile at Sidebar Bottom */}
          <div
            style={{
              padding: '16px 12px calc(16px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <button
              onClick={() =>
                push({
                  id: 'settings-screen',
                  title: 'Settings',
                  component: SettingsPage,
                  props: { onSignOut: logout },
                  hideTab: true
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--mute)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'color 0.2s'
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
            {displayName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  background: 'var(--card3)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--fg)',
                  flexShrink: 0
                }}
              >
                {avatarLetter}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {displayName}
                </div>
              </div>
            </div>
            )}
          </div>
        </aside>
      )}

      {/* Tab Screens Layer: all 4 mounted simultaneously, inactive ones hidden + inert */}
      <div
        className="screens-stage"
        style={{
          position: 'absolute',
          left: isLaptop ? '232px' : 0,
          top: 0,
          bottom: 0,
          right: 0,
          transform: hasPushed ? 'scale(0.96) translate3d(-20px, 0, 0)' : 'none',
          opacity: hasPushed ? 0.6 : 1,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
          pointerEvents: hasPushed ? 'none' : 'auto'
        }}
      >
        {/* Tab 0: Today */}
        <div
          className={`screen ${activeTab === 0 ? 'on' : ''}`}
          inert={activeTab !== 0 ? true : undefined}
          aria-hidden={activeTab !== 0}
        >
          <TodayScreen
            isActive={activeTab === 0}
            onSwitchTab={setActiveTab}
            onStartSession={handleStartSession}
            onSignOut={logout}
          />
        </div>

        {/* Tab 1: Practice */}
        <div
          className={`screen ${activeTab === 1 ? 'on' : ''}`}
          inert={activeTab !== 1 ? true : undefined}
          aria-hidden={activeTab !== 1}
        >
          <PracticeHub
            isActive={activeTab === 1}
            onSwitchTab={setActiveTab}
          />
        </div>

        {/* Tab 2: Words */}
        <div
          className={`screen ${activeTab === 2 ? 'on' : ''}`}
          inert={activeTab !== 2 ? true : undefined}
          aria-hidden={activeTab !== 2}
        >
          <WordsScreen
            isActive={activeTab === 2}
            onStartSession={handleStartSession}
          />
        </div>

        {/* Tab 3: Progress */}
        <div
          className={`screen ${activeTab === 3 ? 'on' : ''}`}
          inert={activeTab !== 3 ? true : undefined}
          aria-hidden={activeTab !== 3}
        >
          <ProgressScreen
            isActive={activeTab === 3}
            onSwitchTab={setActiveTab}
          />
        </div>
      </div>

      {/* Floating Scrubbable TabBar (Phone and Tablet only) */}
      {!isLaptop && (
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isHidden={isTabBarHidden}
        />
      )}

      {/* Pushed Pages Layer (above tab screens, below session overlay) */}
      <div
        style={{
          position: 'absolute',
          left: isLaptop ? '232px' : 0,
          top: 0,
          bottom: 0,
          right: 0,
          pointerEvents: hasPushed ? 'auto' : 'none',
          zIndex: 35
        }}
      >
        <NavPagesLayer />
      </div>

      {/* Fullscreen Session Overlay */}
      <SessionOverlay
        isOpen={sessionConfig.isOpen}
        mode={sessionConfig.mode}
        targetWordData={sessionConfig.payload?.wordData || null}
        weakWords={sessionConfig.payload?.weak || []}
        onClose={handleCloseSession}
        onGoToWords={() => {
          handleCloseSession();
          setActiveTab(2);
        }}
      />
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
