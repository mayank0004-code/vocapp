import React, { useState, useEffect } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useData, useSettings, useStats } from '../../data/DataProvider';
import {
  enablePushNotifications,
  getUserSettings,
  resetCraftStats,
  resetMistakeInsights,
  getQuestionBank,
  exportQuestionBankToExcel
} from '../../services/db';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import Button from '../../ui/Button';

// Mirrors the level profiles the sentence generator uses (functions/index.js).
const LEVELS = [
  { n: 1, name: 'Apprentice', words: '7–12 words', syntax: 'Direct subject–verb–object sentences without nested clauses.' },
  { n: 2, name: 'Craftsman', words: '10–16 words', syntax: 'Compound sentences with one common connector (and, but, so, because).' },
  { n: 3, name: 'Wordsmith', words: '13–20 words', syntax: 'Multi-clause sentences with varied transitions and moderate nuance.' },
  { n: 4, name: 'Stylist', words: '16–24 words', syntax: 'Complex rhetorical structure, varied cadence, subtle tone.' },
  { n: 5, name: 'Master', words: '18–30 words', syntax: 'Periodic clauses, rhythmic elegance, literary prose.' }
];

// Same targets as classic Settings → Studio Progress.
const RESET_OPTIONS = [
  { label: 'Grammar XP', target: 'grammar' },
  { label: 'Flow XP', target: 'flow' },
  { label: 'Context XP', target: 'context' },
  { label: 'Punctuation XP', target: 'punctuation' },
  { label: 'All Practice XP', target: 'all' },
  { label: 'Habits and mistake counts', target: 'insights' }
];

const QUESTION_BANK_LIMIT = 500;

const clampLevel = (lvl) => Math.min(5, Math.max(1, parseInt(lvl, 10) || 1));

const formatHour = (h) => {
  const hour = ((h % 24) + 24) % 24;
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
};

// Same peak-hour pick as the reminder scheduler (functions/index.js).
const peakActivityHour = (activityHours) => {
  if (!activityHours || typeof activityHours !== 'object') return null;
  let best = null;
  let bestCount = 0;
  for (const [hour, count] of Object.entries(activityHours)) {
    if (typeof count === 'number' && count > bestCount) {
      bestCount = count;
      best = parseInt(hour, 10);
    }
  }
  return Number.isFinite(best) ? best : null;
};

const QUESTION_TYPE_LABELS = {
  flashcard: 'Flashcard',
  'fill-in-the-blank': 'Fill in the blank'
};

export function SettingsPage({ onBack = () => {}, onSignOut = () => {} }) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { currentUser } = useData();
  const { settings, updateSettings } = useSettings();
  const { stats } = useStats();

  const [pushReminders, setPushReminders] = useState(!!settings?.notificationsEnabled);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [timingMode, setTimingMode] = useState(settings?.timingMode || 'smart');
  const [customTime, setCustomTime] = useState(settings?.customTime || '18:00');
  const [autoAdjust, setAutoAdjust] = useState(settings?.autoAdjustLevel !== false);
  const [level, setLevel] = useState(clampLevel(settings?.englishLevel));

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(!!currentUser?.uid);
  const [exporting, setExporting] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);
  const [activeResetDrawer, setActiveResetDrawer] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetsDone, setResetsDone] = useState(new Set());
  const [isSignOutArmed, setIsSignOutArmed] = useState(false);

  const uid = currentUser?.uid;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Your account';
  const initial = (displayName[0] || '?').toUpperCase();

  // Re-read settings from Firestore on open: auto-adjust can change
  // englishLevel during reviews after the app loaded them.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getUserSettings(uid).then((data) => {
      if (cancelled || !data) return;
      setPushReminders(!!data.notificationsEnabled);
      setTimingMode(data.timingMode || 'smart');
      setCustomTime(data.customTime || '18:00');
      setAutoAdjust(data.autoAdjustLevel !== false);
      setLevel(clampLevel(data.englishLevel));
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getQuestionBank(uid, QUESTION_BANK_LIMIT).then((list) => {
      if (!cancelled) setQuestions(list || []);
    }).finally(() => {
      if (!cancelled) setQuestionsLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid]);

  const notifySettingsChanged = () => {
    window.dispatchEvent(new CustomEvent('vocapp:settings-updated'));
  };

  const peakHour = peakActivityHour(stats?.activityHours);

  const handleTogglePush = async () => {
    if (pushBusy || !uid) return;
    triggerHaptic('light');
    setPushError('');
    if (pushReminders) {
      setPushReminders(false);
      await updateSettings({ notificationsEnabled: false });
      showToast('Reminders turned off');
      return;
    }
    // Same flow as classic: ask for permission and register the FCM token.
    setPushBusy(true);
    const token = await enablePushNotifications(uid);
    setPushBusy(false);
    if (token) {
      setPushReminders(true);
      await updateSettings({ notificationsEnabled: true });
      showToast('Daily practice reminders on');
    } else {
      setPushError('Permission denied or notifications aren’t supported in this browser. On iOS, add Vocapp to your Home Screen first.');
    }
  };

  const handleTimingChange = (mode) => {
    if (mode === timingMode) return;
    setTimingMode(mode);
    triggerHaptic('light');
    updateSettings({ timingMode: mode });
  };

  const handleTimeInput = (val) => {
    if (!val) return;
    setCustomTime(val);
    updateSettings({ customTime: val });
    showToast(`Reminder set for ${val}`);
  };

  const handleToggleAuto = () => {
    const next = !autoAdjust;
    setAutoAdjust(next);
    triggerHaptic('light');
    Promise.resolve(updateSettings({ autoAdjustLevel: next })).then(notifySettingsChanged);
    showToast(next ? 'Auto-adjust on' : `Locked to L${level}`);
  };

  const handleSelectLevel = (n) => {
    setLevel(n);
    triggerHaptic('light');
    Promise.resolve(updateSettings({ englishLevel: n })).then(notifySettingsChanged);
    showToast(`Level set to L${n} · ${LEVELS.find(l => l.n === n)?.name}`);
  };

  const handleExport = async (format) => {
    if (!uid || exporting) return;
    triggerHaptic('medium');
    setExporting(true);
    try {
      const res = await exportQuestionBankToExcel(uid, format);
      setDownloadMsg(`${res.count} questions saved as ${res.filename}`);
      setTimeout(() => setDownloadMsg(null), 4000);
    } catch (err) {
      showToast(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmReset = async (option) => {
    if (!uid || resetBusy) return;
    setResetBusy(true);
    try {
      if (option.target === 'insights') {
        await resetMistakeInsights(uid);
      } else {
        await resetCraftStats(uid, option.target);
      }
      setResetsDone(prev => new Set(prev).add(option.label));
      setActiveResetDrawer(null);
      triggerHaptic('error');
      showToast(`${option.label} reset`);
    } catch (err) {
      console.error('Reset failed:', err);
      showToast('Couldn’t reset. Please try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const questionCount = questions.length >= QUESTION_BANK_LIMIT ? `${QUESTION_BANK_LIMIT}+` : String(questions.length);

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
                {currentUser?.email && <small>{currentUser.email}</small>}
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
                aria-busy={pushBusy}
                disabled={pushBusy}
                onClick={handleTogglePush}
              />
            </div>
            {pushError && (
              <p className="note fadein" style={{ margin: '4px 0 0', color: 'var(--bad)' }}>
                {pushError}
              </p>
            )}

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
                  We remind you at the hour you usually practise.{' '}
                  {peakHour !== null
                    ? `Right now that's around ${formatHour(peakHour)}.`
                    : 'Until we learn your rhythm, that’s around 6 pm.'}
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
            Sets the sentence length and complexity of your Practice drills.
          </p>
        </div>

        {/* Question Bank Group */}
        <div className="sgroup">
          <span className="lab">Your question bank</span>
          <div className="set">
            <div>
              <span>Questions stored</span>
              <b className="num">{questionsLoading ? '…' : questionCount}</b>
            </div>
            <div className="col" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExport('xls')}
                  disabled={exporting || questionsLoading || questions.length === 0}
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
                  disabled={exporting || questionsLoading || questions.length === 0}
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

          {questions.length > 0 ? (
            <div className="set rq" style={{ marginTop: '10px' }}>
              {questions.slice(0, 3).map((q, i) => (
                <div key={q.id || i}>
                  <em>{q.word}</em>
                  <span>
                    {QUESTION_TYPE_LABELS[q.type] || q.domainName || q.type || 'Question'}
                    {q.result ? ` · ${q.result === 'correct' ? 'Correct' : 'Missed'}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (!questionsLoading && (
            <p className="note">Questions appear here as you complete reviews.</p>
          ))}
        </div>

        {/* Reset Progress Group */}
        <div className="sgroup">
          <span className="lab">Reset progress</span>
          <div className="set rs">
            {RESET_OPTIONS.map((option) => {
              const item = option.label;
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
                          onClick={() => handleConfirmReset(option)}
                          disabled={resetBusy}
                          style={{ flex: 1 }}
                        >
                          {resetBusy ? 'Resetting…' : 'Reset'}
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
                if (window.confirm('Switch back to the classic interface? You can return anytime with the "Updated UI" button.')) {
                  localStorage.setItem('vocapp.ui', 'v1');
                  window.location.search = '?ui=v1';
                }
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
