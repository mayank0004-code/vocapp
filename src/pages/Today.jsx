/**
 * Today.jsx — the daily lookup + practice screen (was Learn.jsx)
 * Tab label: "Today"
 */
import React, { useState, useEffect, useRef } from 'react';
import { fetchWordBreakdown, evaluateSentence } from '../services/ai';
import {
  checkWordExists, saveLearnedWord, savePendingWord,
  getUserMistakePatterns, savePracticeResult,
  listenToUserStats, listenToDueWords, listenToPendingWords, deletePendingWord,
} from '../services/db';
import WordSheet from '../components/WordSheet';
import { Loader2, CheckCircle, Info } from '../components/Icons';

/* ── Week Trail ──────────────────────────────────────────── */
/*
 * Connected week strip: active days glow, consecutive days linked
 * by a warm bar. Today pulses. No streak count (shown in header).
 */
function StreakStrip({ stats = {} }) {
  const now   = new Date();
  const today = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const days  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const activeDates = new Set(stats?.activeDates || []);
  if (stats?.lastPracticedDate) {
    activeDates.add(stats.lastPracticedDate);
  }

  // Calculate Sunday of current calendar week
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - today);

  const filled = days.map((_, i) => {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return activeDates.has(dateStr);
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: 'var(--sp-3) var(--sp-2)',
      background: 'rgba(120,120,128,0.06)',
      borderRadius: 'var(--radius-lg)',
    }}>
      {days.map((d, i) => {
        const isToday  = i === today;
        const isFilled = filled[i];
        const isFuture = i > today;
        const showConnector = i > 0 && filled[i] && filled[i - 1];

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', position: 'relative', height: 24,
            }}>
              {/* Connector bar linking consecutive active days */}
              {showConnector && (
                <div style={{
                  position: 'absolute',
                  left: 0, right: '50%', top: '50%',
                  height: 3, transform: 'translateY(-50%)',
                  background: 'var(--color-warning)',
                  opacity: 0.45, borderRadius: 2,
                }} />
              )}
              {/* Forward connector to next filled day */}
              {filled[i] && i < 6 && filled[i + 1] && (
                <div style={{
                  position: 'absolute',
                  left: '50%', right: 0, top: '50%',
                  height: 3, transform: 'translateY(-50%)',
                  background: 'var(--color-warning)',
                  opacity: 0.45, borderRadius: 2,
                }} />
              )}
              {/* Day dot */}
              <div style={{
                width: isToday ? 20 : 10,
                height: isToday ? 20 : 10,
                borderRadius: 'var(--radius-pill)',
                background: isFilled
                  ? 'var(--color-warning)'
                  : isToday
                    ? 'transparent'
                    : 'rgba(120,120,128,0.15)',
                border: isToday && !isFilled ? '2px solid rgba(255,149,0,0.35)' : 'none',
                boxShadow: isFilled ? '0 0 8px rgba(255,149,0,0.35)' : 'none',
                transition: 'all 300ms ease',
                position: 'relative', zIndex: 1,
                ...(isToday && isFilled ? { animation: 'streak-pulse 2s ease-in-out infinite' } : {}),
              }} />
            </div>
            <span style={{
              fontSize: 9, fontWeight: 600, marginTop: 3,
              color: isToday ? 'var(--color-warning)' : isFilled ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              letterSpacing: '0.04em',
              opacity: isFuture && !isFilled ? 0.4 : 1,
            }}>{d}</span>
          </div>
        );
      })}
      <style>{`
        @keyframes streak-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,149,0,0.35); }
          50% { box-shadow: 0 0 14px rgba(255,149,0,0.55); }
        }
      `}</style>
    </div>
  );
}

/* ── Practice Modal (steps 1-3) ─────────────────────────────── */
function PracticeModal({ wordData, onComplete, onClose, currentUser, onInfoClick }) {
  const [step, setStep]           = useState(1);
  const [input, setInput]         = useState('');
  const [grading, setGrading]     = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [sentences, setSentences] = useState({ factualSentence:'', personalSentence:'', questionSentence:'' });
  const [mistakePatterns, setMistakePatterns] = useState('');
  
  // 2-Step Active Coaching State
  const [coachingState, setCoachingState] = useState({
    phase: 'idle', // 'idle' | 'diagnosed' | 'success'
    coachData: null,
    attempt: 1,
    showModelFallback: false,
    lastSubmittedSentence: '',
  });

  const advanceTimerRef = useRef(null);

  useEffect(() => {
    getUserMistakePatterns(currentUser.uid).then(setMistakePatterns).catch(() => {});
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [currentUser.uid]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [onClose]);

  const stepConfig = [
    { label: 'Factual sentence', key: 'factualSentence',  hint: wordData?.practiceHints?.factual   || `State a fact using "${wordData?.word}"…` },
    { label: 'Personal sentence', key: 'personalSentence', hint: wordData?.practiceHints?.personal  || `Relate "${wordData?.word}" to your own life…` },
    { label: 'Ask a question',    key: 'questionSentence', hint: wordData?.practiceHints?.question  || `Ask a question containing "${wordData?.word}"…` },
  ];
  const cfg = stepConfig[step - 1];

  const handleAdvanceWithModel = async () => {
    const modelSentence = coachingState.coachData?.reframedSentence || input.trim();
    const newSentences = { ...sentences, [cfg.key]: modelSentence };
    setSentences(newSentences);
    setInput('');
    setFeedback(null);
    setCoachingState({ phase: 'idle', coachData: null, attempt: 1, showModelFallback: false, lastSubmittedSentence: '' });

    if (step < 3) {
      setStep(s => s + 1);
    } else {
      await saveLearnedWord(currentUser.uid, { ...wordData, ...newSentences });
      onComplete();
    }
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Phase 1.2 Deterministic Pre-Flight Validation
    // 1. Length check: Minimum 4 words
    const words = trimmedInput.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setFeedback({ type: 'error', message: 'Please write a complete sentence (at least 4 words).' });
      return;
    }

    // 2. Word presence check: Target word (or stem)
    const target = (wordData?.word || '').toLowerCase().trim();
    const stem = target.endsWith('e') && target.length > 3 ? target.slice(0, -1) : target;
    const wordRegex = new RegExp(`\\b${stem}`, 'i');
    if (target && !wordRegex.test(trimmedInput)) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setFeedback({ type: 'error', message: `Remember to include the word "${wordData.word}" in your sentence.` });
      return;
    }

    // 3. Question formatting check: If step === 3, ensure interrogative indicator
    if (step === 3 && !trimmedInput.includes('?')) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      setFeedback({ type: 'error', message: 'Questions must end with a question mark (?).' });
      return;
    }

    setGrading(true);
    setFeedback(null);

    const isRevision = coachingState.phase === 'diagnosed';
    const diagnosedHabit = coachingState.coachData?.habitKey || '';
    const types = ['Factual', 'Personal', 'Question'];

    try {
      const ev = await evaluateSentence(
        wordData.word,
        types[step - 1],
        trimmedInput,
        mistakePatterns,
        isRevision,
        diagnosedHabit
      );

      await savePracticeResult(currentUser.uid, ev.isCorrect, ev.errorTags, {
        word: wordData.word,
        originalSentence: trimmedInput,
        reframedSentence: ev.reframedSentence || '',
        structuralDiagnosis: ev.structuralDiagnosis || '',
        habitAlert: ev.habitAlert || '',
        ruleOfThumb: ev.ruleOfThumb || '',
        coachHint: ev.coachHint || '',
        habitKey: ev.habitKey || diagnosedHabit || 'other',
        isRevisionSuccess: isRevision && ev.isCorrect,
      });

      if (ev.isCorrect) {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        const newSentences = { ...sentences, [cfg.key]: trimmedInput };
        setSentences(newSentences);
        setFeedback({
          type: 'success',
          message: ev.feedback || (isRevision ? 'Structural issue resolved! Masterful revision.' : 'Well phrased!'),
          reframed: ev.reframedSentence,
        });
        setCoachingState({ phase: 'success', coachData: null, attempt: 1, showModelFallback: false, lastSubmittedSentence: '' });

        const delay = isRevision || ev.reframedSentence ? 1400 : 900;
        advanceTimerRef.current = setTimeout(async () => {
          advanceTimerRef.current = null;
          setInput('');
          setFeedback(null);
          setCoachingState({ phase: 'idle', coachData: null, attempt: 1, showModelFallback: false, lastSubmittedSentence: '' });

          if (step < 3) {
            setStep(s => s + 1);
          } else {
            await saveLearnedWord(currentUser.uid, { ...wordData, ...newSentences });
            onComplete();
          }
        }, delay);
      } else {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        // Phase 1: Diagnostic Spotlight
        setCoachingState({
          phase: 'diagnosed',
          coachData: ev,
          attempt: coachingState.attempt + 1,
          showModelFallback: false,
          lastSubmittedSentence: trimmedInput,
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to evaluate. Please try again.' });
    } finally {
      setGrading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        width: '100%',
        maxHeight: '85dvh',
        overflow: 'auto',
        padding: 'var(--sp-5)',
        paddingBottom: `calc(var(--sp-5) + var(--safe-bottom))`,
      }}
        role="dialog" aria-label={`Practice: ${cfg.label}`}
      >
        {/* Progress & Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <h3 className="t-title" style={{ margin: 0 }}>{cfg.label}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span className="t-label">{step} of 3</span>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(120,120,128,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close practice"
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border-color)', borderRadius: 3, marginBottom: 'var(--sp-5)' }}>
          <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: 'var(--accent-color)', borderRadius: 3, transition: 'width 400ms ease' }} />
        </div>

        <div style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'rgba(120,120,128,0.08)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-1)' }}>
            <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>{wordData.word}</span>
            {onInfoClick && (
              <button
                onClick={onInfoClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-color)',
                }}
                aria-label={`Info for ${wordData.word}`}
              >
                <Info size={20} />
              </button>
            )}
          </div>
          <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {wordData.definition}
          </p>
          {wordData.contextMeaning && (
            <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', margin: 'var(--sp-2) 0 0', fontStyle: 'italic', borderLeft: '2px solid var(--accent-color)', paddingLeft: 'var(--sp-2)' }}>
              {wordData.contextMeaning}
            </p>
          )}
        </div>

        {/* Sentence to rewrite prompt card */}
        {cfg.hint && (
          <div style={{
            marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'rgba(0,113,227,0.06)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--accent-color)',
          }}>
            <p className="t-label" style={{ marginBottom: 4, color: 'var(--accent-color)' }}>
              Rewrite this sentence using "{wordData.word}"
            </p>
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{cfg.hint}"
            </p>
          </div>
        )}

        {/* ── Diagnostic Spotlight Card (Active Coaching Arc) ── */}
        {coachingState.phase === 'diagnosed' && coachingState.coachData && (
          <div style={{
            marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 149, 0, 0.04)',
            border: '1px solid rgba(255, 149, 0, 0.25)',
          }}>
            {/* Habit Alert Banner */}
            {coachingState.coachData.habitAlert && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                background: 'rgba(255, 149, 0, 0.15)', border: '1px solid rgba(255, 149, 0, 0.35)',
                color: 'var(--color-warning)', fontSize: 'var(--type-xs)', fontWeight: 600,
                marginBottom: 'var(--sp-3)'
              }}>
                <span>⚡</span>
                <span>{coachingState.coachData.habitAlert}</span>
              </div>
            )}

            {/* What Feels Off */}
            <div style={{ marginBottom: 'var(--sp-3)' }}>
              <p className="t-label" style={{ color: 'var(--color-warning)', marginBottom: 4 }}>
                What Feels Off
              </p>
              <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {coachingState.coachData.structuralDiagnosis || coachingState.coachData.feedback}
              </p>
            </div>

            {/* Quick Tip */}
            {coachingState.coachData.ruleOfThumb && (
              <div style={{
                padding: 'var(--sp-3)',
                background: 'rgba(94, 92, 230, 0.08)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid #5e5ce6',
                marginBottom: 'var(--sp-3)'
              }}>
                <p className="t-label" style={{ color: '#5e5ce6', marginBottom: 4 }}>
                  💡 Quick Tip
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.45 }}>
                  {coachingState.coachData.ruleOfThumb}
                </p>
              </div>
            )}

            {/* How to Make It Natural */}
            {coachingState.coachData.coachHint && (
              <div style={{
                padding: 'var(--sp-3)',
                background: 'rgba(0, 113, 227, 0.06)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--accent-color)',
                marginBottom: 'var(--sp-3)'
              }}>
                <p className="t-label" style={{ color: 'var(--accent-color)', marginBottom: 4 }}>
                  🎯 How to Make It Natural
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {coachingState.coachData.coachHint}
                </p>
              </div>
            )}

            {/* Stuck Safety Valve */}
            {!coachingState.showModelFallback ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-2)' }}>
                <button
                  type="button"
                  onClick={() => setCoachingState(prev => ({ ...prev, showModelFallback: true }))}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    fontSize: 'var(--type-xs)', cursor: 'pointer', textDecoration: 'underline',
                    padding: '4px 8px'
                  }}
                >
                  I'm stuck — show coach's example
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: 'var(--sp-2)',
                padding: 'var(--sp-3)',
                background: 'rgba(52, 199, 89, 0.08)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--color-success)',
              }}>
                <p className="t-label" style={{ color: 'var(--color-success)', marginBottom: 4 }}>
                  ✨ Coach's Example
                </p>
                <p style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--type-sm)', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{coachingState.coachData.reframedSentence}"
                </p>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: 'var(--sp-2)', fontSize: 'var(--type-xs)' }}
                    onClick={() => {
                      setInput(coachingState.coachData.reframedSentence);
                    }}
                  >
                    Copy & Adapt
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: 'var(--sp-2)', fontSize: 'var(--type-xs)' }}
                    onClick={handleAdvanceWithModel}
                  >
                    Advance to Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <textarea
          id="practice-sentence-input"
          className="input"
          style={{
            minHeight: 90,
            resize: 'vertical',
            marginBottom: 'var(--sp-3)',
            border: coachingState.phase === 'diagnosed' ? '1.5px solid var(--accent-color)' : undefined,
            boxShadow: coachingState.phase === 'diagnosed' ? '0 0 0 3px rgba(0, 113, 227, 0.15)' : undefined,
          }}
          placeholder={coachingState.phase === 'diagnosed'
            ? `Apply the coach's nudge to restructure your sentence…`
            : `Type your rewrite containing "${wordData.word}"…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
        />

        {/* Success Feedback Banner (First-Try or Post-Revision) */}
        {feedback && feedback.type === 'success' && (
          <div id="practice-feedback-banner" aria-live="polite" style={{
            marginBottom: 'var(--sp-4)',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(52,199,89,0.08)',
            borderLeft: '3px solid var(--color-success)',
          }}>
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
              ✓ {feedback.message}
            </p>
            {feedback.reframed && (
              <div style={{ marginTop: 'var(--sp-2)', paddingTop: 'var(--sp-2)', borderTop: '1px solid rgba(52,199,89,0.15)' }}>
                <p className="t-label" style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
                  ✨ Master Stylist Comparison
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{feedback.reframed}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Pre-flight Banner */}
        {feedback && feedback.type === 'error' && (
          <div style={{
            marginBottom: 'var(--sp-4)',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,59,48,0.06)',
            borderLeft: '3px solid var(--color-error)',
          }}>
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--color-error)', lineHeight: 1.4 }}>
              {feedback.message}
            </p>
          </div>
        )}

        <button
          id="submit-practice-btn"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={grading || !input.trim()}
        >
          {grading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : coachingState.phase === 'diagnosed' ? (
            'Submit Revision →'
          ) : (
            'Submit to AI Tutor'
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function Today({ currentUser }) {
  const [wordInput, setWordInput]       = useState('');
  const [contextInput, setContextInput] = useState('');
  const [loading, setLoading]           = useState(false);
  const [searchMsg, setSearchMsg]       = useState(null);

  const [wordData, setWordData]         = useState(null);
  const [sheetOpen, setSheetOpen]       = useState(false);

  const [pendingWords, setPendingWords]           = useState([]);
  const [scheduledCount, setScheduledCount]       = useState(0);
  const [showPendingList, setShowPendingList]     = useState(false);
  const [practicing, setPracticing]              = useState(false);
  const [practiceWord, setPracticeWord]          = useState(null);
  const [completed, setCompleted]                = useState(false);

  const [stats, setStats]               = useState({ currentStreak: 0 });

  const lookupBtnRef  = useRef(null);  // trigger ref for sheet enter/exit origin

  // Subscribe to real-time pending words
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToPendingWords(currentUser.uid, (pending) => {
      setPendingWords(pending);
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to real-time due words count
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToDueWords(currentUser.uid, (due) => {
      setScheduledCount(due.length);
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to real-time stats for streak
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToUserStats(currentUser.uid, setStats);
    return () => unsub();
  }, [currentUser]);

  const handleLookup = async () => {
    if (!wordInput.trim() || loading) return;
    setLoading(true);
    setWordData(null);
    setSearchMsg(null);
    // Open sheet immediately with skeleton
    setSheetOpen(true);
    try {
      const inputWord = wordInput.trim();
      const exists = await checkWordExists(currentUser.uid, inputWord);
      if (exists) {
        setSheetOpen(false);
        setSearchMsg({ type: 'error', text: `"${inputWord}" is already in your Dictionary.` });
        setLoading(false);
        return;
      }
      const data = await fetchWordBreakdown(inputWord, contextInput.trim());
      if (!data.isValid) {
        setSheetOpen(false);
        setSearchMsg({ type: 'error', text: `"${inputWord}" doesn't seem to be a valid English word.` });
        setLoading(false);
        return;
      }
      if (data.word.toLowerCase() !== inputWord.toLowerCase()) {
        const correctedExists = await checkWordExists(currentUser.uid, data.word);
        if (correctedExists) {
          setSheetOpen(false);
          setSearchMsg({ type: 'error', text: `Corrected to "${data.word}", which is already in your Dictionary.` });
          setLoading(false);
          return;
        }
        setSearchMsg({ type: 'info', text: `Spelling corrected to "${data.word}".` });
        setWordInput(data.word);
      }
      setWordData(data);
    } catch (e) {
      setSheetOpen(false);
      setSearchMsg({ type: 'error', text: 'Failed to look up word. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!wordData) return;
    try {
      await savePendingWord(currentUser.uid, wordData);
      setSheetOpen(false);
      setWordData(null);
      setWordInput('');
      setContextInput('');
      setSearchMsg({ type: 'info', text: `"${wordData.word}" saved for later.` });
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } catch {
      setSearchMsg({ type: 'error', text: 'Failed to save.' });
    }
  };

  const handlePracticeNow = (wd = null) => {
    setPracticeWord(wd || wordData);
    setSheetOpen(false);
    setPracticing(true);
  };

  const handlePracticeComplete = async () => {
    setPracticing(false);
    setPracticeWord(null);
    setCompleted(true);
    setWordData(null);
    setWordInput('');
    setContextInput('');
    setTimeout(() => setCompleted(false), 4000);
  };

  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-5) 0' }}>

      {/* ── Streak Strip ─────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <StreakStrip stats={stats} />
      </div>

      {/* ── Queue Cards ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>

        {/* SRS Review queue */}
        {scheduledCount > 0 && (
          <div className="surface-raised" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p className="t-label" style={{ marginBottom: 'var(--sp-1)' }}>Due for review</p>
                <p style={{ fontSize: 'var(--type-title)', fontWeight: 600, margin: 0 }}>{scheduledCount}</p>
                <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', margin: 0 }}>scheduled words</p>
              </div>
              <button
                className="btn btn-primary"
                style={{ minWidth: 120 }}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'quiz' }));
                }}
              >
                Review {scheduledCount} words
              </button>
            </div>
          </div>
        )}

        {/* Pending Practice queue */}
        {pendingWords.length > 0 && (
          <div style={{
            padding: 'var(--sp-4) var(--sp-5)',
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
              <div>
                <p className="t-label" style={{ marginBottom: 'var(--sp-1)' }}>Saved for later</p>
                <p style={{ fontSize: 'var(--type-body)', fontWeight: 600, margin: 0 }}>{pendingWords.length} words to practice</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => handlePracticeNow(pendingWords[0])}
              >
                Practice
              </button>
            </div>

            {/* Optional word list disclosure */}
            <button
              onClick={() => setShowPendingList(s => !s)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 'var(--type-sm)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
              aria-expanded={showPendingList}
            >
              {showPendingList ? 'Hide words' : 'Show words'}
            </button>

            {showPendingList && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--sp-3)', background: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {pendingWords.map((pw, idx) => (
                  <div
                    key={pw.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--sp-3) var(--sp-4)',
                      borderBottom: idx < pendingWords.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                    }}
                  >
                    <button
                      onClick={() => handlePracticeNow(pw)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--type-body)',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        flex: 1,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--sp-2)',
                      }}
                    >
                      <span>{pw.word}</span>
                      {pw.isExpiringSoon && (
                        <span style={{
                          fontSize: 'var(--type-xs)',
                          color: 'var(--color-warning)',
                          background: 'rgba(255,149,0,0.12)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 600,
                        }}>
                          Expires soon
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setWordData(pw);
                        setSheetOpen(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-color)',
                      }}
                      aria-label={`Info for ${pw.word}`}
                    >
                      <Info size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lookup Field ─────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <input
            className="input"
            type="text"
            placeholder="Look up a word…"
            value={wordInput}
            onChange={e => setWordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            style={{ flex: 1 }}
          />
          {/* Button size is fixed — only contents change during loading */}
          <button
            ref={lookupBtnRef}
            className="btn btn-primary"
            onClick={handleLookup}
            disabled={loading || !wordInput.trim()}
            style={{ minWidth: 88, minHeight: 44 }}
            aria-label={loading ? `Looking up ${wordInput}` : 'Look up'}
          >
            {loading
              ? <Loader2 className="animate-spin" size={18} />
              : 'Look up'
            }
          </button>
        </div>

        <input
          className="input"
          type="text"
          placeholder="Optional: paste the sentence where you found this word…"
          value={contextInput}
          onChange={e => setContextInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          style={{ fontSize: 'var(--type-sm)' }}
        />
      </div>

      {/* Search message */}
      {searchMsg && (
        <div aria-live="polite" style={{
          padding: 'var(--sp-3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--sp-4)',
          fontSize: 'var(--type-sm)',
          color: searchMsg.type === 'error' ? 'var(--color-error)' : 'var(--accent-color)',
          background: searchMsg.type === 'error'
            ? 'rgba(255,59,48,0.05)' : 'rgba(0,113,227,0.05)',
        }}>
          {searchMsg.text}
        </div>
      )}

      {/* Completion flash */}
      {completed && (
        <div aria-live="polite" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-4)',
          background: 'rgba(52,199,89,0.08)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--sp-4)',
        }}>
          <CheckCircle size={24} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>Word mastered!</p>
            <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              Added to your dictionary and scheduled for review.
            </p>
          </div>
        </div>
      )}

      {/* WordSheet */}
      <WordSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setWordData(null); }}
        wordData={wordData}
        loading={loading}
        word={wordInput}
        onPractice={() => handlePracticeNow(null)}
        onSaveForLater={wordData?.id ? undefined : handleSaveForLater}
        onRemove={wordData?.status === 'pending' ? async () => {
          try {
            await deletePendingWord(currentUser.uid, wordData.id);
            setSheetOpen(false);
            setWordData(null);
          } catch (error) {
            console.error("Failed to remove word", error);
          }
        } : undefined}
        triggerRef={lookupBtnRef}
      />

      {/* Practice Modal */}
      {practicing && practiceWord && (
        <PracticeModal
          wordData={practiceWord}
          currentUser={currentUser}
          onComplete={handlePracticeComplete}
          onClose={() => {
            setPracticing(false);
            setPracticeWord(null);
          }}
          onInfoClick={() => {
            setWordData(practiceWord);
            setSheetOpen(true);
          }}
        />
      )}
    </div>
  );
}
