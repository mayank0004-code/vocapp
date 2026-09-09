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
import { getDueWords, updateWordSRS } from '../services/db';
import { evaluateQuizAnswer, generateQuizQuestion } from '../services/ai';
import { CheckCircle, XCircle, Loader2 } from '../components/Icons';
import { springs, project } from '../motion/springs';

/* ── Question type label ─────────────────────────────────── */
function typeLabel(type, word) {
  const map = {
    'fill-in-the-blank':       'Fill in the missing word',
    'flashcard':               'What word does this describe?',
    'sentence-scramble':       'Unscramble the sentence',
    'sentence-transformation': `Rewrite using "${word}"`,
    'multiple-choice':         'Select the correct answer',
    'true-false':              'Is this usage correct?',
  };
  return map[type] || '';
}

/* ── Progress Bar ─────────────────────────────────────────── */
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
          style={{ height: '100%', background: 'var(--accent-color)', borderRadius: 3 }}
        />
      </div>
    </div>
  );
}

/* ── Empty / All Caught Up ────────────────────────────────── */
function AllCaughtUp({ reviewedCount }) {
  const now = new Date();
  // Estimate next review: tomorrow at the same time
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const hoursUntil = Math.round((tomorrow - now) / 3600000);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      minHeight: '60dvh', padding: 'var(--sp-8)',
      gap: 'var(--sp-4)',
    }}>
      <CheckCircle size={56} style={{ color: 'var(--color-success)' }} />
      <div>
        <h2 className="t-title" style={{ marginBottom: 'var(--sp-2)' }}>All caught up</h2>
        <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-1)' }}>
          {reviewedCount > 0
            ? `You reviewed ${reviewedCount} word${reviewedCount !== 1 ? 's' : ''} today.`
            : 'No words are due for review right now.'}
        </p>
        <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-tertiary)' }}>
          Next review in ~{hoursUntil}h
        </p>
      </div>
      <button
        className="btn btn-primary"
        style={{ marginTop: 'var(--sp-2)' }}
        onClick={() => {
          // Switch to Today tab — bubble up via custom event
          window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'learn' }));
        }}
      >
        Look up a new word
      </button>
    </div>
  );
}

/* ── Answer Input (shared across text-entry question types) ── */
function TextInput({ guess, setGuess, onSubmit, disabled, evaluating }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
      <input
        type="text"
        className="input"
        placeholder="Type your answer…"
        value={guess}
        onChange={e => setGuess(e.target.value)}
        disabled={disabled}
        onKeyDown={e => e.key === 'Enter' && !disabled && onSubmit(guess)}
        autoComplete="off"
      />
      <button
        className="btn btn-primary"
        style={{ minWidth: 72 }}
        onClick={() => onSubmit(guess)}
        disabled={evaluating || !guess.trim() || disabled}
      >
        {evaluating ? <Loader2 className="animate-spin" size={18} /> : 'Check'}
      </button>
    </div>
  );
}

/* ── Main Card Content ────────────────────────────────────── */
function CardContent({ question, word, guess, setGuess, onSubmit, evaluating, feedback, showHint, setShowHint, shuffledWords, setShuffledWords, selectedWords, setSelectedWords, isFlipped, setIsFlipped }) {
  const disabled = !!feedback?.isCorrect || evaluating;

  return (
    <div style={{ padding: 'var(--sp-5)', cursor: 'auto', userSelect: 'text' }}
      onClick={e => e.stopPropagation()} // don't let inner clicks start card drag
    >
      {/* Question type label */}
      <p className="t-label" style={{ marginBottom: 'var(--sp-3)' }}>
        {typeLabel(question.type, word.word)}
      </p>

      {/* Question body */}
      <p style={{
        fontSize: 'var(--type-body)',
        lineHeight: 1.6,
        fontStyle: 'italic',
        marginBottom: 'var(--sp-5)',
        color: 'var(--text-primary)',
      }}>
        {question.question}
      </p>

      {/* ── Multiple choice ───────────────────────────── */}
      {question.type === 'multiple-choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
          {question.options?.map((opt, i) => (
            <m.button
              key={i}
              className="btn btn-outline"
              style={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
              disabled={disabled}
              whileTap={disabled ? {} : { scale: 0.98, transition: { duration: 0.1, ease: 'easeOut' } }}
              onClick={() => { setGuess(opt); onSubmit(opt); }}
            >
              {opt}
            </m.button>
          ))}
        </div>
      )}

      {/* ── True / False ─────────────────────────────── */}
      {question.type === 'true-false' && (
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
          {['True', 'False'].map(v => (
            <m.button
              key={v}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={disabled}
              whileTap={disabled ? {} : { scale: 0.97, transition: { duration: 0.1, ease: 'easeOut' } }}
              onClick={() => { setGuess(v.toLowerCase()); onSubmit(v.toLowerCase()); }}
            >
              {v}
            </m.button>
          ))}
        </div>
      )}

      {/* ── Fill / Transformation ─────────────────── */}
      {['fill-in-the-blank', 'sentence-transformation'].includes(question.type) && (
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <TextInput guess={guess} setGuess={setGuess} onSubmit={onSubmit} disabled={disabled} evaluating={evaluating} />
        </div>
      )}

      {/* ── Sentence Scramble ────────────────────────── */}
      {question.type === 'sentence-scramble' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', marginBottom: 'var(--sp-3)' }}>
          {/* Drop zone */}
          <div style={{
            minHeight: 56, padding: 'var(--sp-3)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--border-color)',
            display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)',
            alignItems: 'center',
            background: selectedWords.length > 0 ? 'var(--surface-color)' : 'transparent',
          }}>
            {selectedWords.length === 0 && (
              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: 'var(--type-sm)' }}>
                Tap words to build the sentence
              </span>
            )}
            {selectedWords.map((w, i) => (
              <button key={i} disabled={disabled}
                onClick={() => {
                  const ns = [...selectedWords]; ns.splice(i, 1);
                  setSelectedWords(ns); setShuffledWords([...shuffledWords, w]);
                }}
                style={{
                  padding: '4px var(--sp-3)', background: 'var(--accent-color)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer', fontSize: 'var(--type-sm)', fontWeight: 500,
                  transition: 'transform 100ms ease-out',
                }}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Word bank */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', justifyContent: 'center', minHeight: 56 }}>
            {shuffledWords.map((w, i) => (
              <button key={i} disabled={disabled}
                onClick={() => {
                  const ns = [...shuffledWords]; ns.splice(i, 1);
                  setShuffledWords(ns); setSelectedWords([...selectedWords, w]);
                }}
                style={{
                  padding: '6px var(--sp-3)', background: 'rgba(120,120,128,0.12)',
                  border: 'none', borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer', fontSize: 'var(--type-sm)', fontWeight: 500,
                  color: 'var(--text-primary)',
                  transition: 'transform 100ms ease-out',
                }}
              >
                {w}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onSubmit(selectedWords.join(' '))}
            disabled={evaluating || selectedWords.length === 0 || disabled}
          >
            {evaluating ? <Loader2 className="animate-spin" size={18} /> : 'Check'}
          </button>
        </div>
      )}

      {/* ── Flashcard ─────────────────────────────────── */}
      {question.type === 'flashcard' && (
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <div
            className="flashcard-container"
            onClick={() => !isFlipped && !disabled && setIsFlipped(true)}
          >
            <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
              <div className="flashcard-front">
                <p style={{ fontStyle: 'italic', fontSize: 'var(--type-lead)', lineHeight: 1.4, color: 'var(--accent-color)' }}>
                  "{question.question}"
                </p>
                {!isFlipped && (
                  <p className="t-label" style={{ marginTop: 'var(--sp-5)' }}>Tap to reveal</p>
                )}
              </div>
              <div className="flashcard-back">
                <h3 className="t-title" style={{ marginBottom: 'var(--sp-2)' }}>{word.word}</h3>
                <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)' }}>{word.definition}</p>
              </div>
            </div>
          </div>

          {isFlipped && !disabled && (
            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
              <button
                className="btn"
                style={{ flex: 1, background: 'rgba(255,59,48,0.1)', color: 'var(--color-error)' }}
                onClick={() => onSubmit("I don't know")}
              >
                Forgot it
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'rgba(52,199,89,0.15)', color: 'var(--color-success)' }}
                onClick={() => onSubmit(word.word)}
              >
                Got it!
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Hint + Skip row (for all non-flashcard types) ─── */}
      {question.type !== 'flashcard' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
          <button
            onClick={() => setShowHint(h => !h)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 'var(--type-sm)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
          >
            {showHint ? 'Hide hint' : '💡 Hint'}
          </button>
          <button
            onClick={() => onSubmit("I don't know")}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 'var(--type-sm)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            disabled={disabled}
          >
            I don't know
          </button>
        </div>
      )}

      {showHint && (
        <div style={{
          marginTop: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)',
          background: 'rgba(0,113,227,0.05)', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--type-sm)', color: 'var(--text-secondary)',
        }}>
          <strong>Definition:</strong> {word.definition}
        </div>
      )}

      {/* ── Feedback ─────────────────────────────────── */}
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
            display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)',
          }}
        >
          {feedback.isCorrect
            ? <CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
            : <XCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
          }
          <p style={{ fontSize: 'var(--type-sm)', margin: 0, lineHeight: 1.5, color: 'var(--text-primary)' }}>
            {feedback.message}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function Review({ currentUser }) {
  const [dueWords, setDueWords]         = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);

  const [question, setQuestion]         = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);

  const [guess, setGuess]               = useState('');
  const [evaluating, setEvaluating]     = useState(false);
  const [feedback, setFeedback]         = useState(null);
  const [showHint, setShowHint]         = useState(false);
  const [isFlipped, setIsFlipped]       = useState(false);

  const [shuffledWords, setShuffledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);

  // Drag / swipe state
  const [dragX, setDragX]               = useState(0);
  const [exitDir, setExitDir]           = useState(0); // -1 miss, +1 got it

  // Listen for tab-switch event from AllCaughtUp
  useEffect(() => {
    const handler = e => {
      window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: e.detail }));
    };
    return () => {};
  }, []);

  useEffect(() => {
    async function load() {
      if (!currentUser) return;
      try {
        const words = await getDueWords(currentUser.uid);
        setDueWords(words.sort(() => 0.5 - Math.random()));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const currentWord = dueWords[currentIndex];

  useEffect(() => {
    if (currentWord) loadQuestion(currentWord);
  }, [currentIndex, currentWord?.id]);

  const loadQuestion = async (wordObj) => {
    setQuestionLoading(true);
    setGuess('');
    setFeedback(null);
    setShowHint(false);
    setIsFlipped(false);
    setSelectedWords([]);
    setShuffledWords([]);
    setDragX(0);
    try {
      const q = await generateQuizQuestion(wordObj.word, wordObj.definition);
      if (q.type === 'sentence-scramble' && q.correctAnswer) {
        const ws = q.correctAnswer.split(' ').filter(w => w.trim());
        setShuffledWords([...ws].sort(() => 0.5 - Math.random()));
      }
      setQuestion(q);
    } catch {
      setQuestion({
        type: 'fill-in-the-blank',
        question: wordObj.personalSentence
          ? wordObj.personalSentence.replace(new RegExp(wordObj.word, 'gi'), '________')
          : `Use ________ in context.`,
        correctAnswer: wordObj.word,
        explanation: 'Fallback question.',
      });
    } finally {
      setQuestionLoading(false);
    }
  };

  const advanceCard = (dir) => {
    setExitDir(dir);
    setReviewedCount(c => c + 1);
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      setExitDir(0);
      setDragX(0);
    }, 300);
  };

  const handleSubmit = async (submittedGuess) => {
    const isScramble = question?.type === 'sentence-scramble';
    const finalGuess = isScramble ? selectedWords.join(' ') : (submittedGuess ?? guess);
    if (!finalGuess.trim() || !currentWord || !question) return;

    setEvaluating(true);
    setFeedback(null);

    try {
      let isCorrect = false;
      let message   = question.explanation;

      if (finalGuess === "I don't know") {
        isCorrect = false;
        message   = `The correct answer was: ${question.correctAnswer}. ${message}`;
      } else if (question.type === 'fill-in-the-blank') {
        const ev = await evaluateQuizAnswer(currentWord.word, question.question, finalGuess.trim());
        isCorrect = ev.isCorrect;
        message   = ev.feedback + ' — ' + message;
      } else {
        isCorrect = finalGuess.trim().toLowerCase() === question.correctAnswer?.toLowerCase();
        message   = isCorrect
          ? 'Correct! ' + message
          : `Incorrect. The answer was: ${question.correctAnswer}. ${message}`;
      }

      if (navigator.vibrate) navigator.vibrate(isCorrect ? [15, 50, 15] : [50, 50, 50]);
      setFeedback({ isCorrect, message });
      await updateWordSRS(currentUser.uid, currentWord.id, isCorrect, currentWord.interval);

      if (isCorrect) {
        setTimeout(() => advanceCard(1), 1800);
      }
    } catch {
      setFeedback({ isCorrect: false, message: 'Failed to evaluate. Please try again.' });
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  if (dueWords.length === 0 || currentIndex >= dueWords.length) {
    return <AllCaughtUp reviewedCount={reviewedCount} />;
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
              <p className="t-title">{dueWords[currentIndex + 1].word}</p>
            </div>
          </div>
        )}

        {/* Current card */}
        <AnimatePresence mode="wait">
          <m.div
            key={currentWord.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDrag={(_, info) => setDragX(info.offset.x)}
            onDragEnd={(_, info) => {
              const vel    = info.velocity.x;
              const offset = info.offset.x;
              // Momentum projection to decide commit vs reverse
              const projected = offset + project(vel);
              if (projected > 100 || vel > 400) {
                // Swipe right — got it
                handleSubmit(question?.type === 'flashcard' ? currentWord.word : (question?.correctAnswer || guess));
                advanceCard(1);
              } else if (projected < -100 || vel < -400) {
                // Swipe left — missed
                handleSubmit("I don't know");
                advanceCard(-1);
              } else {
                // Snap back
                setDragX(0);
              }
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, x: exitDir !== 0 ? exitDir * 300 : 0 }}
            exit={{ opacity: 0, x: exitDir * 300 }}
            transition={exitDir !== 0 ? springs.thrown : springs.reveal}
            style={{
              position: 'relative', zIndex: 1,
              background: 'var(--surface-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              cursor: feedback ? 'auto' : 'grab',
              touchAction: 'pan-y',
              userSelect: 'none',
            }}
          >
            {/* Colour wash overlay — telegraphs outcome before release */}
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

            {/* Direction labels that appear at swipe threshold */}
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
            {questionLoading || !question ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--sp-10) var(--sp-5)' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)', marginBottom: 'var(--sp-3)' }} />
                <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>Generating question…</p>
              </div>
            ) : (
              <CardContent
                question={question}
                word={currentWord}
                guess={guess}
                setGuess={setGuess}
                onSubmit={handleSubmit}
                evaluating={evaluating}
                feedback={feedback}
                showHint={showHint}
                setShowHint={setShowHint}
                shuffledWords={shuffledWords}
                setShuffledWords={setShuffledWords}
                selectedWords={selectedWords}
                setSelectedWords={setSelectedWords}
                isFlipped={isFlipped}
                setIsFlipped={setIsFlipped}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Manual Next button (when incorrect) */}
      {feedback && !feedback.isCorrect && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.reveal}
          style={{ marginTop: 'var(--sp-4)' }}
        >
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => advanceCard(-1)}
          >
            Next word →
          </button>
        </m.div>
      )}

      {/* Swipe hint (first card only, disappears after interaction) */}
      {currentIndex === 0 && !feedback && !questionLoading && (
        <p style={{
          textAlign: 'center', marginTop: 'var(--sp-4)',
          fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}>
          ← MISSED &nbsp;·&nbsp; SWIPE &nbsp;·&nbsp; GOT IT →
        </p>
      )}
    </div>
  );
}
