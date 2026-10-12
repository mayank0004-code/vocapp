import React, { useState } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useData, useSettings } from '../../data/DataProvider';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import Button from '../../ui/Button';

const LEVELS = [
  { n: 1, name: 'Foundations', words: '6–10 words', syntax: 'Short, simple sentences with one subject and verb.' },
  { n: 2, name: 'Compound sentences', words: '10–18 words', syntax: 'Two balanced thoughts linked with a coordinating conjunction.' },
  { n: 3, name: 'Complex sentences', words: '14–24 words', syntax: 'One main idea deepened by subordinate or relative clauses.' },
  { n: 4, name: 'Rhetorical variety', words: '18–30 words', syntax: 'Participial openers, em-dashes, and varied clause lengths.' },
  { n: 5, name: 'Stylistic mastery', words: '22–36 words', syntax: 'Inverted syntax, rhythmic cadence, and nuanced undertones.' }
];

const RESET_OPTIONS = [
  'Grammar XP',
  'Flow XP',
  'Context XP',
  'Punctuation XP',
  'All Practice progress',
  'Habits and slip history'
];

export function SettingsPage({ onBack = () => {}, onSignOut = () => {} }) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { currentUser } = useData();
  const { settings, updateSettings } = useSettings();

  const [pushReminders, setPushReminders] = useState(settings?.notificationsEnabled ?? false);
  const [timingMode, setTimingMode] = useState(settings?.timingMode ?? 'smart');
  const [customTime, setCustomTime] = useState(settings?.customTime ?? '18:00');
  const [autoAdjust, setAutoAdjust] = useState(settings?.autoAdjustLevel ?? true);
  const [level, setLevel] = useState(settings?.englishLevel ?? 2);

  const [downloadMsg, setDownloadMsg] = useState(null);
  const [activeResetDrawer, setActiveResetDrawer] = useState(null);
  const [resetsDone, setResetsDone] = useState(new Set());
  const [isSignOutArmed, setIsSignOutArmed] = useState(false);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Dev';
  const initial = (displayName[0] || 'D').toUpperCase();

  const handleTogglePush = () => {
    const next = !pushReminders;
    setPushReminders(next);
    triggerHaptic('light');
    updateSettings({ notificationsEnabled: next });
    showToast(next ? 'Daily practice reminders enabled' : 'Reminders disabled');
  };

  const handleTimingChange = (mode) => {
    if (mode === timingMode) return;
    setTimingMode(mode);
    triggerHaptic('light');
    updateSettings({ timingMode: mode });
  };

  const handleTimeInput = (val) => {
    setCustomTime(val);
    updateSettings({ customTime: val });
    showToast(`Reminder set for ${val}`);
  };

  const handleToggleAuto = () => {
    const next = !autoAdjust;
    setAutoAdjust(next);
    triggerHaptic('light');
    updateSettings({ autoAdjustLevel: next });
  };

  const handleSelectLevel = (n) => {
    setLevel(n);
    triggerHaptic('light');
    updateSettings({ englishLevel: n });
    showToast(`Level set to L${n}`);
  };

  const handleExport = (format) => {
    triggerHaptic('medium');
    setDownloadMsg(`vocapp-questions.${format} downloaded`);
    setTimeout(() => setDownloadMsg(null), 4000);
  };

  const handleConfirmReset = (name) => {
    setResetsDone(prev => new Set(prev).add(name));
    setActiveResetDrawer(null);
    triggerHaptic('error');
    showToast(`Reset ${name}`);
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '80px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(22, 22, 24, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid var(--line)'
        }}
      >
        <button
          onClick={onBack}
          className="press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--acc2)',
            fontSize: '16px',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.015em' }}>
          Settings
        </span>

        <button
          onClick={onBack}
          className="press"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--acc2)',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Large Title */}
        <div style={{ padding: '20px 20px 8px' }}>
          <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Settings
          </h1>
        </div>

        {/* User Account Profile Group */}
        <div className="sgroup">
          <div className="set">
            <div style={{ justifyContent: 'flex-start', gap: '14px' }}>
              <span
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '24px',
                  background: 'var(--accbg)',
                  color: 'var(--acc2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '20px',
                  fontWeight: 600,
                  flex: 'none'
                }}
              >
                {initial}
              </span>
              <div className="tx">
                <b style={{ fontSize: '17px' }}>{displayName}</b>
                <small>{currentUser?.email || 'Signed in with Google'}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders Group */}
        <div className="sgroup">
          <span className="lab">Reminders</span>
          <div className="set">
            <div>
              <div className="tx">
                <span>Daily practice reminders</span>
                <small>Push notifications on this device</small>
              </div>
              <button
                className="sw"
                role="switch"
                aria-checked={pushReminders}
                aria-label="Daily practice reminders"
                onClick={handleTogglePush}
              />
            </div>

            <div
              className="col"
              style={{
                gap: '12px',
                opacity: pushReminders ? 1 : 0.4,
                pointerEvents: pushReminders ? 'auto' : 'none',
                transition: 'opacity 0.3s'
              }}
            >
              <span>When to remind me</span>
              <div className={`segc ${timingMode === 'custom' ? 'r' : ''}`}>
                <span className="th" />
                <button
                  aria-pressed={timingMode === 'smart'}
                  onClick={() => handleTimingChange('smart')}
                >
                  Smart timing
                </button>
                <button
                  aria-pressed={timingMode === 'custom'}
                  onClick={() => handleTimingChange('custom')}
                >
                  Set a time
                </button>
              </div>

              {timingMode === 'smart' ? (
                <p className="note fadein" style={{ margin: '4px 0 0' }}>
                  We remind you at the hour you usually practise. Right now that's around 6 pm.
                </p>
              ) : (
                <label
                  className="fadein"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '15.5px',
                    marginTop: '4px'
                  }}
                >
                  <span>Time</span>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => handleTimeInput(e.target.value)}
                    style={{
                      width: '130px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--card2)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      padding: '0 10px',
                      fontSize: '15px'
                    }}
                    aria-label="Reminder time"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Sentence Difficulty Group */}
        <div className="sgroup">
          <span className="lab">Sentence difficulty</span>
          <div className="set">
            <div>
              <div className="tx">
                <span>Adjust automatically</span>
                <small>Steps up after 85%+ accuracy over 15 reviews; eases off below 55%.</small>
              </div>
              <button
                className="sw"
                role="switch"
                aria-checked={autoAdjust}
                aria-label="Adjust automatically"
                onClick={handleToggleAuto}
              />
            </div>
          </div>

          <div className="set" style={{ marginTop: '10px' }}>
            <ul className="lvls" role="radiogroup" aria-label="Sentence level">
              {LEVELS.map((l) => (
                <li key={l.n}>
                  <button
                    role="radio"
                    aria-checked={level === l.n}
                    onClick={() => handleSelectLevel(l.n)}
                  >
                    <span className="radio">
                      <i />
                    </span>
                    <div className="tx">
                      <b>
                        L{l.n} · {l.name} <span style={{ color: 'var(--fg3)', fontWeight: 500 }}>· {l.words}</span>
                      </b>
                      <small>{l.syntax}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="note">
            Brand-new words always start with short, simple sentences, whatever your level, so you learn the meaning first.
          </p>
        </div>

        {/* Question Bank Group */}
        <div className="sgroup">
          <span className="lab">Your question bank</span>
          <div className="set">
            <div>
              <span>Questions stored</span>
              <b className="num">214</b>
            </div>
            <div className="col" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExport('xls')}
                  style={{
                    flex: 1,
                    background: 'var(--card2)',
                    border: '1px solid var(--line)'
                  }}
                >
                  Export .xls
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExport('csv')}
                  style={{
                    flex: 1,
                    background: 'var(--card2)',
                    border: '1px solid var(--line)'
                  }}
                >
                  Export .csv
                </Button>
              </div>

              {downloadMsg && (
                <span className="msg fadein">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {downloadMsg}
                </span>
              )}
            </div>
          </div>

          <div className="set rq" style={{ marginTop: '10px' }}>
            <div>
              <em>perplexed</em>
              <span>Flashcard · Correct</span>
            </div>
            <div>
              <em>equivocal</em>
              <span>Flashcard · Missed</span>
            </div>
            <div>
              <em>provenance</em>
              <span>Flashcard · Missed</span>
            </div>
          </div>
        </div>

        {/* Reset Progress Group */}
        <div className="sgroup">
          <span className="lab">Reset progress</span>
          <div className="set rs">
            {RESET_OPTIONS.map((item) => {
              const isDone = resetsDone.has(item);
              const isOpen = activeResetDrawer === item;

              return (
                <div key={item} className="col">
                  <div className="rr">
                    <span>{item}</span>
                    <button
                      className={isDone ? 'dn' : ''}
                      onClick={() => {
                        if (isDone) return;
                        setActiveResetDrawer(isOpen ? null : item);
                        triggerHaptic('light');
                      }}
                    >
                      {isDone ? 'Reset done' : 'Reset'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="fadein" style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--fg2)' }}>
                        Permanently reset {item}? This can't be undone.
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveResetDrawer(null)}
                          style={{ flex: 1, background: 'var(--card2)' }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleConfirmReset(item)}
                          style={{ flex: 1 }}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="note">
            Your words and review schedule are never touched by these.
          </p>
        </div>

        {/* Sign Out Group */}
        <div className="sgroup" style={{ marginBottom: '24px' }}>
          {!isSignOutArmed ? (
            <Button
              variant="ghost"
              onClick={() => {
                triggerHaptic('medium');
                setIsSignOutArmed(true);
              }}
              style={{
                width: '100%',
                color: 'var(--bad)',
                background: 'var(--card)',
                border: '1px solid var(--line)'
              }}
            >
              Sign out
            </Button>
          ) : (
            <div
              className="fadein"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--badbg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--bad)', fontWeight: 500 }}>
                Sign out of Vocapp on this device?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSignOutArmed(false)}
                  style={{ flex: 1, background: 'var(--card)' }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={onSignOut}
                  style={{ flex: 1 }}
                >
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* About Section with Classic UI Fallback */}
        <div style={{ marginTop: '32px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--mute)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px'
            }}
          >
            About
          </div>
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '16px',
              border: '1px solid var(--line)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--fg)' }}>
                Vocapp v2
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--mute)' }}>
                Switch back to classic interface
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.setItem('vocapp.ui', 'v1');
                window.location.search = '?ui=v1';
              }}
              style={{
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                flexShrink: 0
              }}
            >
              Classic UI
            </Button>
          </div>
        </div>

        <p className="foot" style={{ marginBottom: '16px', marginTop: '24px' }}>
          Vocapp
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
