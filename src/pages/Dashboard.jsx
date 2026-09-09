import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { LazyMotion, domMax, m } from 'framer-motion';
import Today from './Today';
import Review from './Review';
import Dictionary from './Dictionary';
import Insights from './Insights';
import Settings from './Settings';
import { listenToUserStats } from '../services/db';
import { springs } from '../motion/springs';

/* ── Icons ────────────────────────────────────────────────── */
const Icon = ({ path, size = 24, color = 'currentColor', fill = 'none', label }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill={fill} stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={!label}
    aria-label={label}
  >
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

const ICONS = {
  today:      { path: ['M3 9h18', 'M8 2v4', 'M16 2v4', 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'] },
  review:     { path: ['M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5'] },
  dictionary: { path: ['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20', 'M8 7h8', 'M8 11h8'] },
  insights:   { path: ['M22 12h-4l-3 9L9 3l-3 9H2'] },
  flame:      { path: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'] },
  gear:       { path: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'] },
};

const NAV_ITEMS = [
  { id: 'learn',      label: 'Today',      icon: ICONS.today },
  { id: 'quiz',       label: 'Review',     icon: ICONS.review },
  { id: 'dictionary', label: 'Dictionary', icon: ICONS.dictionary },
  { id: 'insights',   label: 'Insights',   icon: ICONS.insights },
];

const HEADER_HEIGHT = 56; // px, excluding safe-area

export default function Dashboard({ currentUser, logout }) {
  const [activeTab, setActiveTab]     = useState('learn');
  const [showSettings, setShowSettings] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [stats, setStats]             = useState({ currentStreak: 0, highestStreak: 0 });
  const [scrolled, setScrolled]       = useState(false);

  // Nav pill indicator position/width
  const [pillStyle, setPillStyle]     = useState({ x: 0, width: 0 });
  const tabRefs                       = useRef({});
  const navRef                        = useRef(null);
  const scrollRef                     = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToUserStats(currentUser.uid, setStats);
    return () => unsub();
  }, [currentUser]);

  // Allow child screens (e.g. AllCaughtUp) to switch tabs
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    window.addEventListener('vocapp:switch-tab', handler);
    return () => window.removeEventListener('vocapp:switch-tab', handler);
  }, []);

  // Measure nav tab positions for the sliding pill indicator
  // Uses direct x/width spring — NOT layoutId (backdrop-filter + layout-projection flickers in Safari)
  const measurePill = () => {
    const activeEl = tabRefs.current[activeTab];
    const navEl    = navRef.current;
    if (!activeEl || !navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    setPillStyle({
      x:     tabRect.left - navRect.left,
      width: tabRect.width,
    });
  };

  useLayoutEffect(() => {
    measurePill();
  }, [activeTab]);

  useEffect(() => {
    window.addEventListener('resize', measurePill);
    return () => window.removeEventListener('resize', measurePill);
  }, [activeTab]);

  // IntersectionObserver sentinel — show gradient mask on scroll
  useEffect(() => {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [activeTab]);

  if (showSettings) {
    return (
      <LazyMotion features={domMax}>
        <Settings currentUser={currentUser} closeSettings={() => setShowSettings(false)} logout={logout} />
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domMax}>
      <div className="app-shell">

        {/* ── Fixed Header ───────────────────────────────── */}
        <header
          className="app-header"
          style={{
            height: `calc(${HEADER_HEIGHT}px + var(--safe-top))`,
            display: 'flex',
            alignItems: 'flex-end',
            paddingBottom: 'var(--sp-3)',
            paddingLeft: 'var(--sp-5)',
            paddingRight: 'var(--sp-4)',
            justifyContent: 'space-between',
            // Gradient mask on ::after via a data attribute + CSS trick — applied below via inline style
            // The mask-image lives on a sibling div to avoid the backdrop-filter conflict
          }}
        >
          {/* Wordmark */}
          <span style={{ fontSize: 'var(--type-body)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Vocapp
          </span>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {/* Streak — tappable to explain itself */}
            {stats.currentStreak > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStreakInfo(s => !s)}
                  aria-label={`${stats.currentStreak}-day streak. Tap for details.`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--sp-1)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-warning)', fontWeight: 700,
                    fontSize: 'var(--type-body)', padding: 'var(--sp-2)',
                    transition: 'transform 100ms ease-out',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <Icon path={ICONS.flame.path} size={18} color="var(--color-warning)" fill="var(--color-warning)" />
                  {stats.currentStreak}
                </button>
                {showStreakInfo && (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + var(--sp-2))', right: 0,
                      background: 'var(--surface-color)', borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)', padding: 'var(--sp-3) var(--sp-4)',
                      fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', zIndex: 200,
                      border: '1px solid var(--border-color)',
                    }}
                    role="tooltip"
                  >
                    <strong>{stats.currentStreak}-day streak 🔥</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 'var(--sp-1)' }}>
                      Best: {stats.highestStreak || stats.currentStreak} days
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(true)}
              className="btn-ghost"
              aria-label="Settings"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon path={ICONS.gear.path} size={20} />
            </button>
          </div>
        </header>

        {/* Gradient fade mask — separate element so backdrop-filter on .app-header is unaffected */}
        {scrolled && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: `calc(${HEADER_HEIGHT}px + var(--safe-top))`,
              left: 0, right: 0,
              height: 24,
              background: 'linear-gradient(to bottom, var(--bg-color), transparent)',
              zIndex: 99,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Scroll Container ───────────────────────────── */}
        <main
          ref={scrollRef}
          className="app-scroll"
          style={{
            paddingTop: `calc(${HEADER_HEIGHT}px + var(--safe-top))`,
            paddingBottom: `calc(96px + var(--safe-bottom))`,
          }}
        >
          {/* Sentinel for IntersectionObserver */}
          <div id="scroll-sentinel" style={{ height: 1, marginTop: -1 }} />

          {/* Tab content — kept mounted, visibility toggled */}
          <div style={{ display: activeTab === 'learn' ? 'block' : 'none' }}>
          <Today currentUser={currentUser} />
          </div>
          <div style={{ display: activeTab === 'quiz' ? 'block' : 'none' }}>
            <Review currentUser={currentUser} />
          </div>
          <div style={{ display: activeTab === 'dictionary' ? 'block' : 'none' }}>
            <Dictionary currentUser={currentUser} />
          </div>
          <div style={{ display: activeTab === 'insights' ? 'block' : 'none' }}>
            <Insights currentUser={currentUser} />
          </div>
        </main>

        {/* ── Nav Pill ───────────────────────────────────── */}
        <nav
          ref={navRef}
          className="nav-pill"
          role="tablist"
          aria-label="Main navigation"
          style={{
            display: 'flex',
            gap: 'var(--sp-1)',
            padding: 'var(--sp-2)',
            borderRadius: 'var(--radius-pill)',
            width: 'calc(100% - var(--sp-12))',
            maxWidth: 420,
            left: '50%',
            transform: 'translateX(-50%)',
            // Desktop: sidebar handled via media query in CSS
          }}
        >
          {/* Sliding pill indicator — direct x/width spring */}
          {pillStyle.width > 0 && (
            <m.div
              animate={{ x: pillStyle.x, width: pillStyle.width }}
              transition={springs.indicator}
              style={{
                position: 'absolute',
                top: 'var(--sp-2)',
                left: 0,
                height: `calc(100% - var(--sp-2) * 2)`,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface-color)',
                boxShadow: 'var(--shadow-md)',
              }}
              aria-hidden="true"
            />
          )}

          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <m.button
                key={item.id}
                ref={el => { tabRefs.current[item.id] = el; }}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  setActiveTab(item.id);
                }}
                whileTap={{ scale: 0.94, transition: { duration: 0.1, ease: 'easeOut' } }}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 'var(--sp-1)',
                  padding: 'var(--sp-2) 0',
                  minHeight: 44, minWidth: 44,
                  background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                  position: 'relative', zIndex: 1,
                  transition: 'color 150ms ease',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                <Icon path={item.icon.path} size={22} />
                <span style={{
                  fontSize: 'var(--type-xs)',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.01em',
                }}>
                  {item.label}
                </span>
              </m.button>
            );
          })}
        </nav>
      </div>
    </LazyMotion>
  );
}
