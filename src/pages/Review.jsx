/**
 * Review.jsx — SRS review queue with swipeable card stack.
 * (was Quiz.jsx — tab label "Review")
 *
 * Preserves all 6 question types from Quiz.jsx.
 * Adds: card stack, progress bar, swipe gestures with colour wash,
 * velocity-based commit, aria-live answer reveal, non-dead-end empty state.
 */
import React, { useEffect, useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  getDueWords,
  updateWordSRS,
  listenToAllWords,
  saveQuestionToBank,
  updateQuestionBankResult,
  getWordBankQuestions,
  exportQuestionBankToExcel,
  getUserEnglishLevel,
  recordReviewResult,
  listenToStyleProfile
} from '../services/db';
import { evaluateQuizAnswer, generateQuizQuestion } from '../services/ai';
import { CheckCircle, XCircle, Loader2, FileSpreadsheet, Target } from '../components/Icons';
import { springs, project } from '../motion/springs';

/* ── Question type label ─────────────────────────────────── */
function typeLabel() {
  return 'Active Recall · Flashcard';
}

/* ── Progress Bar ────────────────────────────────────────── */
function ProgressBar({ current, total }) {
  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
        <span className="t-label">Review</span>
        <span className="t-label">{current} of {total}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
        <m.div
          animate={{ width: `${(current / total) * 100}%` }}
          transition={springs.reveal}
          style={{ height: '100%', background: 'var(--accent-color)' }}
        />
      </div>
    </div>
  );
}

/* ── Session Summary & All Caught Up Screen ────────────────── */
function AllCaughtUp({ reviewedCount, allWords, currentUser, sessionResults = [], onPracticeWeakWords }) {
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const handleExport = async (format = 'xls') => {
    if (!currentUser) return;
    setExporting(true);
    setExportMsg('');
    try {
      const res = await exportQuestionBankToExcel(currentUser.uid, format);
      setExportMsg(`✓ Downloaded ${res.count} questions as ${res.filename}`);
    } catch (err) {
      setExportMsg(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const now = Date.now();

  // Find the actual soonest upcoming review from all words
  let soonest = null;
  if (allWords && allWords.length > 0) {
    for (const w of allWords) {
      if (w.nextReviewDate && w.nextReviewDate > now) {
        if (!soonest || w.nextReviewDate < soonest) {
          soonest = w.nextReviewDate;
        }
      }
    }
  }

  let timeLabel = '';
  if (soonest) {
    const msLeft = soonest - now;
    const hoursLeft = Math.ceil(msLeft / 3600000);
    if (hoursLeft < 1) {
      timeLabel = 'Next review in < 1h';
    } else if (hoursLeft < 24) {
      timeLabel = `Next review in ~${hoursLeft}h`;
    } else {
      const days = Math.round(msLeft / 86400000);
      timeLabel = `Next review in ~${days} day${days !== 1 ? 's' : ''}`;
    }
  }

  const totalTested = sessionResults.length;
  const correctTested = sessionResults.filter(r => r.isCorrect).length;
  const incorrectItems = sessionResults.filter(r => !r.isCorrect);
  const accuracyPct = totalTested > 0 ? Math.round((correctTested / totalTested) * 100) : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      minHeight: '60dvh', padding: 'var(--sp-6) var(--sp-4)',
      gap: 'var(--sp-4)', maxWidth: 420, margin: '0 auto'
    }}>
      {incorrectItems.length === 0 ? (
        <CheckCircle size={56} style={{ color: 'var(--color-success)' }} />
      ) : (
        <Target size={52} style={{ color: 'var(--accent-color)' }} />
      )}

      <div>
        <h2 className="t-title" style={{ marginBottom: 'var(--sp-1)' }}>
          {totalTested > 0 ? 'Session Complete' : 'All Caught Up'}
        </h2>
        <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)', margin: '0 0 var(--sp-1)' }}>
          {totalTested > 0
            ? `${correctTested} of ${totalTested} words answered correctly (${accuracyPct}%)`
            : reviewedCount > 0
              ? `You reviewed ${reviewedCount} word${reviewedCount !== 1 ? 's' : ''} today.`
              : 'No words are due for review right now.'}
        </p>
        {timeLabel && (
          <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
            {timeLabel}
          </p>
        )}
      </div>

      {/* Weak Words Spotlight */}
      {incorrectItems.length > 0 && (
        <div style={{
          width: '100%',
          background: 'rgba(255, 59, 48, 0.05)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--sp-4)',
          textAlign: 'left',
          border: '1px solid rgba(255, 59, 48, 0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
            <span style={{
              fontSize: 'var(--type-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-error)'
            }}>
              Needs Focus ({incorrectItems.length})
            </span>
            <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)' }}>
              Spaced repetition reset
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {incorrectItems.map((item, idx) => (
              <div key={idx} style={{ fontSize: 'var(--type-sm)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{item.word}</strong>
                {item.definition && (
                  <span style={{ color: 'var(--text-secondary)' }}> — {item.definition}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', width: '100%', marginTop: 'var(--sp-2)' }}>
        {incorrectItems.length > 0 && onPracticeWeakWords && (
          <button
            className="btn btn-primary"
            onClick={onPracticeWeakWords}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)' }}
          >
            <Target size={16} />
            Practice Weak Words ({incorrectItems.length})
          </button>
        )}

        <button
          className={incorrectItems.length > 0 ? "btn btn-secondary" : "btn btn-primary"}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'learn' }));
          }}
        >
          Look up a new word
        </button>

        <button
          className="btn btn-outline"
          disabled={exporting}
          onClick={() => handleExport('xls')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)' }}
        >
          {exporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
          Export Questions (.xls)
        </button>

        {exportMsg && (
          <p style={{ fontSize: 'var(--type-xs)', color: exportMsg.startsWith('✓') ? 'var(--color-success)' : 'var(--color-error)', margin: '4px 0 0' }}>
            {exportMsg}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Fisher-Yates Array Shuffler ─────────────────────────── */
function shuffleArray(arr) {
  if (!Array.isArray(arr) || arr.length <= 1) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ── Deterministic Word Hash Helper ────────────────────────── */
function getWordHash(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/* ── Main Card Content (Pure Active Recall Flashcard) ─────── */
function CardContent({
  question,
  word,
  onSubmit,
  evaluating,
  feedback,
  showHint,
  setShowHint,
  isFlipped,
  setIsFlipped
}) {
  const disabled = !!feedback || evaluating;

  // Masking helper for flashcards: ensures target word or root stem never leaks on front
  const maskTargetWord = (text, fallback = '') => {
    if (!text) return fallback;
    if (!word?.word) return text;
    const clean = word.word.toLowerCase().trim();
    const stem = clean.length > 4 ? clean.slice(0, -1) : clean;
    const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${esc}\\w*\\b`, 'gi');
    return text.replace(regex, '[the word]');
  };

  return (
    <div
      style={{ padding: 'var(--sp-5)', cursor: 'auto', userSelect: 'text' }}
      onClick={e => e.stopPropagation()} // don't let inner clicks start card drag
    >
      {/* Question type label & Domain badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
        <p className="t-label" style={{ margin: 0 }}>
          {typeLabel(question.type)}
        </p>
        {question.domainName && (
          <span style={{
            fontSize: 'var(--type-xs)',
            fontWeight: 600,
            letterSpacing: '0.03em',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(0, 113, 227, 0.08)',
            color: 'var(--accent-color)'
          }}>
            {question.domainName}
          </span>
        )}
      </div>

      {/* ── RICH DUAL-MEANING ACTIVE RECALL FLASHCARD ── */}
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <div
          className="flashcard-container"
          onClick={() => !isFlipped && !disabled && setIsFlipped(true)}
        >
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            {/* ── FLASHCARD FRONT (The Active Recall Challenge) ── */}
            <div className="flashcard-front">
              {/* Meaning & Domain Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 'var(--sp-2)', alignItems: 'center' }}>
                <span className="flashcard-meaning-badge">
                  {question.meaningLabel || (question.hasSecondaryMeaning && question.activeMeaning === 'secondary' ? 'Secondary Meaning' : 'Core Meaning')}
                  {question.hasSecondaryMeaning && (
                    <span style={{ opacity: 0.75, marginLeft: 5 }}>
                      ({question.activeMeaning === 'secondary' ? '2 of 2' : '1 of 2'})
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Active Recall
                </span>
              </div>

              {/* Target Definition Prompt */}
              <p className="flashcard-text flashcard-question">
                "{maskTargetWord(question.question || question.definition || word?.definition || '', 'Review this concept in your dictionary')}"
              </p>

              {/* Relates To ("Something that relates to the word") */}
              {question.relatesTo && (
                <div className="flashcard-relates-box">
                  <div className="flashcard-box-label">
                    <span>🌐 Relates to</span>
                  </div>
                  <p className="flashcard-box-text">
                    {maskTargetWord(question.relatesTo)}
                  </p>
                </div>
              )}

              {/* Memory Anchor ("Anything that reminds us of the word") */}
              {question.memoryTrigger && (
                <div className="flashcard-anchor-box">
                  <div className="flashcard-box-label">
                    <span>💡 Memory anchor</span>
                  </div>
                  <p className="flashcard-box-text">
                    {maskTargetWord(question.memoryTrigger)}
                  </p>
                </div>
              )}

              {/* First-Letter Hint & Tap to Flip Prompt */}
              {!isFlipped && (
                <div style={{ marginTop: 'auto', paddingTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', width: '100%' }}>
                  {showHint && word?.word && (
                    <span style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: 'var(--accent-color)', background: 'rgba(0,113,227,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                      Starts with: {word.word.slice(0, 1).toUpperCase()} {word.word.slice(1).replace(/./g, '•')}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    {!showHint && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 'var(--type-xs)', cursor: 'pointer', padding: '2px 4px' }}
                      >
                        💡 Hint (First Letter)
                      </button>
                    )}
                    <span className="t-label flashcard-cue" style={{ margin: 0 }}>Tap or Spacebar to reveal answer</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── FLASHCARD BACK (Reveal & Dual-Meaning Verification) ── */}
            <div className="flashcard-back">
              <div style={{ textAlign: 'center', marginBottom: 'var(--sp-2)', width: '100%' }}>
                <h3 className="t-title flashcard-word">{word.word}</h3>
                {word.phonetic && (
                  <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', display: 'block', marginBottom: '4px' }}>
                    {word.phonetic}
                  </span>
                )}
                <p className="flashcard-text flashcard-definition">
                  {question.definition || word.definition}
                </p>
              </div>

              {/* Example in Context */}
              {(question.example || word.example) && (
                <div style={{
                  marginTop: 'var(--sp-1)',
                  marginBottom: 'var(--sp-2)',
                  padding: 'var(--sp-2) var(--sp-3)',
                  background: 'rgba(0,113,227,0.05)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--accent-color)',
                  textAlign: 'left'
                }}>
                  <span style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--accent-color)',
                    marginBottom: '2px'
                  }}>
                    In Context
                  </span>
                  <p style={{
                    margin: 0,
                    fontSize: 'var(--type-xs)',
                    lineHeight: 1.45,
                    fontStyle: 'italic',
                    color: 'var(--text-primary)'
                  }}>
                    "{question.example || word.example}"
                  </p>
                </div>
              )}

              {/* Secondary Meaning Spotlight (if word has polysemy) */}
              {question.hasSecondaryMeaning && question.secondaryMeaning && (
                <div className="flashcard-secondary-spotlight" style={{ marginBottom: 'var(--sp-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-color)' }}>
                      💡 Also Remember ({question.activeMeaning === 'secondary' ? 'Core Meaning 1' : 'Alternate Meaning 2'}):
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--type-xs)', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                    {question.secondaryMeaning}
                  </p>
                </div>
              )}

              {/* Active Recall Self-Assessment */}
              <div style={{ width: '100%', marginTop: 'auto', paddingTop: 'var(--sp-2)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 'var(--sp-2)', letterSpacing: '0.03em' }}>
                  Did you recall the exact word before flipping?
                </p>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button
                    className="btn"
                    style={{
                      flex: 1,
                      background: 'rgba(255, 59, 48, 0.1)',
                      color: 'var(--color-error)',
                      border: '1px solid rgba(255, 59, 48, 0.25)',
                      fontWeight: 600,
                      fontSize: 'var(--type-sm)',
                      padding: 'var(--sp-3)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubmit("I don't know");
                    }}
                  >
                    🔴 Forgot it (1)
                  </button>
                  <button
                    className="btn"
                    style={{
                      flex: 1,
                      background: 'rgba(52, 199, 89, 0.15)',
                      color: 'var(--color-success)',
                      border: '1px solid rgba(52, 199, 89, 0.3)',
                      fontWeight: 600,
                      fontSize: 'var(--type-sm)',
                      padding: 'var(--sp-3)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubmit(word.word);
                    }}
                  >
                    🟢 Got it! (2)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Enriched Feedback & Coaching Moment ────────── */}
      {feedback && (
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            marginTop: 'var(--sp-4)',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            background: feedback.isCorrect ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.06)',
            borderLeft: `3px solid ${feedback.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            {feedback.isCorrect
              ? <CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              : <XCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
            }
            <span style={{
              fontSize: 'var(--type-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: feedback.isCorrect ? 'var(--color-success)' : 'var(--color-error)'
            }}>
              {feedback.isCorrect ? 'Excellent Recall' : 'Memory Anchor'}
            </span>
          </div>

          <p style={{ fontSize: 'var(--type-sm)', margin: 0, lineHeight: 1.5, color: 'var(--text-primary)' }}>
            {feedback.message}
          </p>

          {!feedback.isCorrect && word?.definition && (
            <div style={{
              marginTop: 'var(--sp-1)',
              paddingTop: 'var(--sp-2)',
              borderTop: '1px dashed rgba(255,59,48,0.2)',
              fontSize: 'var(--type-xs)',
              color: 'var(--text-secondary)',
              lineHeight: 1.4
            }}>
              💡 <strong>Remember:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{word.word}</span> means "{word.definition}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardVariants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, x: 0, transition: springs.reveal },
  exit: (dir) => ({
    opacity: 0,
    x: (dir !== 0 ? dir : 1) * 360,
    scale: 0.95,
    transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] }
  })
};

/* ── Main Component ─────────────────────────────────────── */
export default function Review({ currentUser, isActive }) {
  const [dueWords, setDueWords]         = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [allWords, setAllWords]         = useState([]);
  const [activeHabits, setActiveHabits] = useState([]);

  const [question, setQuestion]         = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);

  const [evaluating, setEvaluating]     = useState(false);
  const [feedback, setFeedback]         = useState(null);
  const [showHint, setShowHint]         = useState(false);
  const [isFlipped, setIsFlipped]       = useState(false);

  const [sessionResults, setSessionResults] = useState([]);

  // Drag / swipe state
  const [dragX, setDragX]               = useState(0);
  const [exitDir, setExitDir]           = useState(0); // -1 miss, +1 got it

  // Race condition guards & refs
  const advanceTimeoutRef = useRef(null);
  const isAdvancingRef    = useRef(false);
  const hasSubmittedRef   = useRef(false);
  const prefetchedMapRef  = useRef(new Map());
  const isFetchingRef     = useRef(new Set());
  const currentBankIdRef  = useRef(null);
  const recentTypesRef    = useRef([]);
  const userLevelRef      = useRef(1);

  // Practice weak words re-queue handler
  const handlePracticeWeakWords = () => {
    isAdvancingRef.current = false;
    hasSubmittedRef.current = false;
    const weakWordIds = new Set(sessionResults.filter(r => !r.isCorrect).map(r => r.id || r.word));
    const pool = (allWords && allWords.length > 0) ? allWords : dueWords;
    const weakDue = pool.filter(w => weakWordIds.has(w.id) || weakWordIds.has(w.word));
    if (weakDue.length > 0) {
      const shuffledWeak = shuffleArray(weakDue);
      setDueWords(shuffledWeak);
      setCurrentIndex(0);
      setReviewedCount(0);
      setSessionResults([]);
      prefetchedMapRef.current.clear();
      maintainPrefetchBuffer(0, shuffledWeak);
    }
  };

  // Real-time allWords listener for up-to-date countdown & stats
  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenToAllWords(currentUser.uid, (words) => {
      setAllWords(words);
    });
    return () => unsub();
  }, [currentUser]);

  // Load user English proficiency level silently for telemetry only (no UI level badge)
  useEffect(() => {
    if (!currentUser) return;
    getUserEnglishLevel(currentUser.uid).then(res => {
      if (res?.level) userLevelRef.current = res.level;
    });

    const unsubProfile = listenToStyleProfile(currentUser.uid, profile => {
      if (profile?.habits) {
        const flagged = Object.keys(profile.habits).filter(
          k => profile.habits[k]?.count > 0 || profile.habits[k]?.status === 'needs_attention'
        );
        setActiveHabits(flagged);
      }
    });

    return () => {
      if (unsubProfile) unsubProfile();
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, [currentUser]);

  // Initial load of due words
  useEffect(() => {
    async function load() {
      if (!currentUser) return;
      try {
        const due = await getDueWords(currentUser.uid);
        const shuffled = due.sort(() => 0.5 - Math.random());
        setDueWords(shuffled);
        if (shuffled.length > 0) {
          maintainPrefetchBuffer(0, shuffled);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  // Refresh queue when tab becomes active if currently finished or empty, and unlock state
  useEffect(() => {
    if (!isActive) {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      isAdvancingRef.current = false;
      hasSubmittedRef.current = false;
    } else {
      isAdvancingRef.current = false;
      hasSubmittedRef.current = false;
    }
    if (isActive && currentUser && (dueWords.length === 0 || currentIndex >= dueWords.length)) {
      getDueWords(currentUser.uid).then(due => {
        const shuffled = due.sort(() => 0.5 - Math.random());
        setDueWords(shuffled);
        setCurrentIndex(0);
        setReviewedCount(0);
        setQuestion(null);
        prefetchedMapRef.current.clear();
        if (shuffled.length > 0) {
          maintainPrefetchBuffer(0, shuffled);
        }
      });
    }
  }, [isActive]);

  /* ── Enhanced Local Fallback Engine (0ms Rich Instant Synthesis) ── */
  const buildLocalQuestion = (wordObj) => {
    if (!wordObj || !wordObj.word) return null;

    const sentences = [
      wordObj.example,
      wordObj.personalSentence,
      wordObj.factualSentence,
      wordObj.questionSentence
    ].filter(s => typeof s === 'string' && s.trim().length > 10);

    const cleanWord = wordObj.word.toLowerCase().trim();
    const hash = getWordHash(cleanWord);
    const hasPolysemy = !!(wordObj.contextMeaning && wordObj.contextMeaning.toLowerCase() !== (wordObj.definition || '').toLowerCase());
    const isSecondary = hasPolysemy && (hash % 2 === 0);

    return {
      type: 'flashcard',
      domain: 'local',
      domainName: 'Active Recall',
      word: wordObj.word,
      definition: (isSecondary ? wordObj.contextMeaning : wordObj.definition) || wordObj.definition || 'Review definition in dictionary.',
      relatesTo: wordObj.vibeCheck || (sentences[0] ? `Real-world context: "${sentences[0]}"` : `Common in everyday speech and thoughtful writing.`),
      memoryTrigger: (wordObj.collocations?.length > 0)
        ? `Common pairings: ${wordObj.collocations.slice(0, 3).join(', ')}`
        : `Anchor: Connect this concept to its real-world effect.`,
      example: sentences[0] || wordObj.example || '',
      hasSecondaryMeaning: hasPolysemy,
      secondaryMeaning: hasPolysemy ? (isSecondary ? wordObj.definition : wordObj.contextMeaning) : '',
      activeMeaning: isSecondary ? 'secondary' : 'primary',
      meaningLabel: isSecondary ? 'Secondary Meaning' : 'Core Meaning',
      question: (isSecondary ? wordObj.contextMeaning : wordObj.definition) || wordObj.definition || '',
      correctAnswer: wordObj.word,
      options: [],
      explanation: `"${wordObj.word}" means: ${wordObj.definition || 'the target word'}.`
    };
  };

  const currentWord = dueWords[currentIndex];

  // Active question is guaranteed ready in 0ms (from state, prefetch cache, or instant local synthesis)
  const activeQuestion = (question && question.word === currentWord?.word)
    ? question
    : (prefetchedMapRef.current.get(currentWord?.id)?.question || buildLocalQuestion(currentWord));

  useEffect(() => {
    if (currentWord) loadQuestion(currentWord, currentIndex);
  }, [currentIndex, currentWord?.id]);

  /* ── Continuous 2-3 Question Preloading Pipeline ── */
  const maintainPrefetchBuffer = async (fromIndex, wordsList = dueWords) => {
    if (!currentUser || !wordsList || wordsList.length === 0) return;

    // Buffer up to 3 upcoming questions ahead
    const targetIndices = [];
    for (let offset = 1; offset <= 3; offset++) {
      const idx = fromIndex + offset;
      if (idx < wordsList.length) targetIndices.push(idx);
    }

    for (const idx of targetIndices) {
      const targetWord = wordsList[idx];
      if (!targetWord || !targetWord.id) continue;
      if (prefetchedMapRef.current.has(targetWord.id) || isFetchingRef.current.has(targetWord.id)) {
        continue;
      }

      // Limit background AI generation to at most 1 in flight
      if (isFetchingRef.current.size >= 1) {
        break;
      }

      isFetchingRef.current.add(targetWord.id);

      try {
        // Tier 1: Check existing question bank (instant <50ms cache)
        const local = buildLocalQuestion(targetWord);
        const existing = await getWordBankQuestions(currentUser.uid, targetWord.word);
        const existingFlashcard = existing.find(q => q.type === 'flashcard');
        if (existingFlashcard) {
          const picked = { ...local, ...existingFlashcard, type: 'flashcard' };
          prefetchedMapRef.current.set(targetWord.id, { question: picked, bankId: picked.id });
          isFetchingRef.current.delete(targetWord.id);
          continue;
        }

        // Tier 2: Instant local active recall synthesis
        if (local) {
          prefetchedMapRef.current.set(targetWord.id, { question: local, bankId: null });
        }
      } catch (err) {
        console.warn("Background prefetch fallback:", err);
        const local = buildLocalQuestion(targetWord);
        if (local) {
          prefetchedMapRef.current.set(targetWord.id, { question: local, bankId: null });
        }
      } finally {
        isFetchingRef.current.delete(targetWord.id);
      }
    }
  };

  /* ── Load Question Handler (Instant 0ms Fast-Path) ── */
  const loadQuestion = (wordObj, index) => {
    setEvaluating(false);
    setFeedback(null);
    setShowHint(false);
    setIsFlipped(false);
    setDragX(0);
    hasSubmittedRef.current = false;

    if (!wordObj) return;

    let targetQuestion = null;
    let bankId = null;

    // Fast-path: Check in-memory prefetch cache (0ms instant render)
    if (prefetchedMapRef.current.has(wordObj.id)) {
      const cached = prefetchedMapRef.current.get(wordObj.id);
      prefetchedMapRef.current.delete(wordObj.id);
      targetQuestion = cached.question;
      bankId = cached.bankId || null;
    } else {
      // 0ms instant local question synthesis from dictionary data
      targetQuestion = buildLocalQuestion(wordObj);
      bankId = null;
    }

    currentBankIdRef.current = bankId;
    if (targetQuestion) {
      recentTypesRef.current = [...recentTypesRef.current.slice(-3), targetQuestion.type];
    }
    setQuestion(targetQuestion);
    setQuestionLoading(false);

    // Keep background prefetch pipeline flowing for upcoming words (1..3 ahead)
    maintainPrefetchBuffer(index);
  };

  const advanceCard = (dir) => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    hasSubmittedRef.current = false;

    // Synchronously reset interaction state to guarantee incoming card mounts on front face with zero feedback
    setIsFlipped(false);
    setFeedback(null);
    setShowHint(false);
    setEvaluating(false);

    const direction = dir ?? 1;
    setExitDir(direction);
    setReviewedCount(c => c + 1);
    setCurrentIndex(i => i + 1);
    setDragX(0);

    setTimeout(() => {
      isAdvancingRef.current = false;
    }, 280);
  };

  const handleSubmit = async (submittedGuess, isSwipe = false) => {
    const finalGuess = submittedGuess ?? '';
    if (!finalGuess.trim() || !currentWord || !activeQuestion) return;
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setEvaluating(true);
    setFeedback(null);

    try {
      let isCorrect = false;
      let message   = activeQuestion.explanation || '';

      if (finalGuess === "I don't know") {
        isCorrect = false;
        message   = `The correct word was: ${activeQuestion.correctAnswer || currentWord.word}. ${message}`;
      } else {
        isCorrect = finalGuess.toLowerCase().trim() === (activeQuestion.correctAnswer || currentWord.word).toLowerCase().trim();
        message = isCorrect ? 'Excellent active recall!' : `The target word was: ${currentWord.word}.`;
      }

      if (navigator.vibrate) navigator.vibrate(isCorrect ? [15, 50, 15] : [50, 50, 50]);
      setFeedback({ isCorrect, message });
      setSessionResults(prev => [
        ...prev,
        {
          word: currentWord.word,
          definition: currentWord.definition || '',
          isCorrect,
          interval: currentWord.interval || 1,
          id: currentWord.id
        }
      ]);

      // Fire-and-forget background persistence (0ms UI latency)
      updateWordSRS(currentUser.uid, currentWord.id, isCorrect, currentWord.interval).catch(err => {
        console.warn("Background updateWordSRS deferred:", err);
      });
      recordReviewResult(currentUser.uid, isCorrect, userLevelRef.current).catch(err => {
        console.warn("Background recordReviewResult deferred:", err);
      });

      if (currentBankIdRef.current) {
        updateQuestionBankResult(currentUser.uid, currentBankIdRef.current, isCorrect).catch(err => {
          console.warn("updateQuestionBankResult error:", err);
        });
      }

      if (isCorrect && !isAdvancingRef.current && !isSwipe) {
        // Snappy advance: 350ms for flashcards
        advanceTimeoutRef.current = setTimeout(() => advanceCard(1), 350);
      }
    } catch {
      setFeedback({ isCorrect: false, message: 'Failed to evaluate. Please try again.' });
    } finally {
      setEvaluating(false);
    }
  };

  // Keyboard Accelerators (GAP 14)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      if (currentIndex >= dueWords.length) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      // Enter or Spacebar: Advance card if feedback is showing
      if (feedback && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        advanceCard(feedback.isCorrect ? 1 : -1);
        return;
      }

      if (evaluating || !activeQuestion || questionLoading) return;

      // Spacebar: Flip flashcard
      if (e.code === 'Space' && !isFlipped) {
        e.preventDefault();
        setIsFlipped(true);
        return;
      }

      // Flashcard Flipped: 1 for Forgot, 2 for Got it
      if (isFlipped && !feedback) {
        if (e.key === '1') {
          e.preventDefault();
          handleSubmit("I don't know");
        } else if (e.key === '2') {
          e.preventDefault();
          handleSubmit(currentWord.word);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, isFlipped, feedback, evaluating, questionLoading, currentWord, currentIndex, dueWords.length, isActive]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  if (dueWords.length === 0 || currentIndex >= dueWords.length) {
    return (
      <AllCaughtUp
        reviewedCount={reviewedCount}
        allWords={allWords}
        currentUser={currentUser}
        sessionResults={sessionResults}
        onPracticeWeakWords={handlePracticeWeakWords}
      />
    );
  }

  // Colour wash intensity: 0→1 as card moves ±120px
  const washOpacity = Math.min(Math.abs(dragX) / 120, 1) * 0.35;
  const washColor   = dragX > 0 ? `rgba(52,199,89,${washOpacity})` : `rgba(255,59,48,${washOpacity})`;

  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-5) 0' }}>
      <ProgressBar current={currentIndex + 1} total={dueWords.length} />

      <div style={{ position: 'relative', minHeight: 420 }}>

        {/* Peeking next card */}
        {currentIndex + 1 < dueWords.length && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            transform: 'scale(0.96) translateY(8px)',
            transformOrigin: 'bottom center',
            zIndex: 0,
            overflow: 'hidden',
          }}>
            {/* Ghost of next card word */}
            <div style={{ padding: 'var(--sp-5)', opacity: 0.3 }}>
              <p className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>Up next</p>
              <p className="t-title" style={{ filter: 'blur(8px)', userSelect: 'none' }}>
                {dueWords[currentIndex + 1]?.word}
              </p>
            </div>
          </div>
        )}

        {/* Current card */}
        <AnimatePresence mode="popLayout" custom={exitDir}>
          <m.div
            key={currentWord?.id || currentIndex}
            custom={exitDir}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onPan={(_, info) => {
              if (feedback || evaluating || isAdvancingRef.current) return;
              setDragX(info.offset.x);
            }}
            onPanEnd={(_, info) => {
              if (feedback || evaluating || isAdvancingRef.current) return;
              const vel    = info.velocity.x;
              const offset = info.offset.x;
              const projected = offset + project(vel);

              // Guard: Lock swipe-to-commit when flashcard is unflipped
              if (!isFlipped) {
                setDragX(0);
                return;
              }

              if (projected > 100 || vel > 400) {
                // Swipe right — got it
                handleSubmit(currentWord.word, true);
                advanceCard(1);
              } else if (projected < -100 || vel < -400) {
                // Swipe left — missed
                handleSubmit("I don't know", true);
                advanceCard(-1);
              } else {
                setDragX(0);
              }
            }}
            style={{
              position: 'relative', zIndex: 1,
              x: dragX,
              background: 'var(--surface-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              cursor: feedback ? 'auto' : 'grab',
              touchAction: 'pan-y',
              userSelect: 'none',
              width: '100%',
            }}
          >
            {/* Colour wash overlay */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                background: dragX !== 0 ? washColor : 'transparent',
                borderRadius: 'var(--radius-lg)',
                pointerEvents: 'none',
                zIndex: 2,
                transition: 'background 50ms linear',
              }}
            />

            {/* Direction labels at swipe threshold */}
            {Math.abs(dragX) > 40 && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 'var(--sp-4)',
                  ...(dragX > 0 ? { left: 'var(--sp-5)' } : { right: 'var(--sp-5)' }),
                  zIndex: 3,
                  fontSize: 'var(--type-sm)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: dragX > 0 ? 'var(--color-success)' : 'var(--color-error)',
                  opacity: Math.min(Math.abs(dragX) / 60, 1),
                }}
              >
                {dragX > 0 ? 'GOT IT ✓' : '✕ MISSED'}
              </div>
            )}

            {/* Card content */}
            {!activeQuestion ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--sp-10) var(--sp-5)' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)', marginBottom: 'var(--sp-3)' }} />
                <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>Preparing your review card…</p>
              </div>
            ) : (
              <CardContent
                question={activeQuestion}
                word={currentWord}
                onSubmit={handleSubmit}
                evaluating={evaluating}
                feedback={feedback}
                showHint={showHint}
                setShowHint={setShowHint}
                isFlipped={isFlipped}
                setIsFlipped={setIsFlipped}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Manual Next button (fail-safe for all feedback states) */}
      {feedback && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.reveal}
          style={{ marginTop: 'var(--sp-4)' }}
        >
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => advanceCard(feedback.isCorrect ? 1 : -1)}
          >
            Next word →
          </button>
        </m.div>
      )}

      {/* Swipe hint on first card only */}
      {currentIndex === 0 && !feedback && (
        <p style={{
          textAlign: 'center', marginTop: 'var(--sp-4)',
          fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}>
          {!isFlipped
            ? 'TAP CARD OR PRESS SPACEBAR TO FLIP'
            : '← FORGOT (1) · SWIPE OR USE KEYS 1 & 2 · GOT IT (2) →'}
        </p>
      )}
    </div>
  );
}
