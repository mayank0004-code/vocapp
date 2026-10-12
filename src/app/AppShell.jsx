import React, { useState } from 'react';
import { LazyMotion, domMax } from 'framer-motion';
import { DataProvider } from '../data/DataProvider';
import NavStackProvider, { useNav, NavPagesLayer } from './NavStack';
import TabBar from './TabBar';
import TodayScreen from '../features/today/TodayScreen';
import WordsScreen from '../features/words/WordsScreen';
import PracticeHub from '../features/practice/PracticeHub';
import ProgressScreen from '../features/progress/ProgressScreen';
import { ToastContainer } from '../ui/Toast';
import SessionOverlay from '../features/session/SessionOverlay';
import '../styles/tokens.css';
import '../styles/base.css';

function ShellContent({ currentUser, logout }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Today, 1: Practice, 2: Words, 3: Progress
  const [sessionConfig, setSessionConfig] = useState({ isOpen: false, mode: 'full', payload: {} });
  const { isTabBarHidden, hasPushed } = useNav();

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
    <div className="app">
      {/* Toast notifications layer */}
      <ToastContainer />

      {/* Tab Screens Layer: all 4 mounted simultaneously, inactive ones hidden + inert */}
      <div
        className="screens-stage"
        style={{
          position: 'absolute',
          inset: 0,
          transform: hasPushed ? 'scale(0.96) translate3d(-20px, 0, 0)' : 'none',
          opacity: hasPushed ? 0.6 : 1,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
          pointerEvents: hasPushed ? 'none' : 'auto'
        }}
      >
        {/* Tab 0: Today */}
        <div
          className={`screen ${activeTab === 0 ? 'on' : ''}`}
          inert={activeTab !== 0 ? '' : undefined}
          aria-hidden={activeTab !== 0}
        >
          <TodayScreen
            onSwitchTab={setActiveTab}
            onStartSession={handleStartSession}
            onSignOut={logout}
          />
        </div>

        {/* Tab 1: Practice */}
        <div
          className={`screen ${activeTab === 1 ? 'on' : ''}`}
          inert={activeTab !== 1 ? '' : undefined}
          aria-hidden={activeTab !== 1}
        >
          <PracticeHub onSwitchTab={setActiveTab} />
        </div>

        {/* Tab 2: Words */}
        <div
          className={`screen ${activeTab === 2 ? 'on' : ''}`}
          inert={activeTab !== 2 ? '' : undefined}
          aria-hidden={activeTab !== 2}
        >
          <WordsScreen />
        </div>

        {/* Tab 3: Progress */}
        <div
          className={`screen ${activeTab === 3 ? 'on' : ''}`}
          inert={activeTab !== 3 ? '' : undefined}
          aria-hidden={activeTab !== 3}
        >
          <ProgressScreen onSwitchTab={setActiveTab} />
        </div>
      </div>

      {/* Floating Scrubbable TabBar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isHidden={isTabBarHidden}
      />

      {/* Pushed Pages Layer (above tab screens, below session overlay) */}
      <NavPagesLayer />

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
