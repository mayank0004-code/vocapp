import React, { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import Button from '../../../ui/Button';
import { triggerHaptic } from '../../../motion/haptics';
import { maskTargetWord } from '../reviewQuestion';

export function Recall({
  wordData,
  question,
  reviewIndex = 1,
  totalReviews = 1,
  onGrade = () => {},
  onNext = () => {}
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isCommitted, setIsCommitted] = useState(false);
  const [feedback, setFeedback] = useState(null); // { isCorrect, message }
  const [speaking, setSpeaking] = useState(false);
  const advanceTimeoutRef = useRef(null);
  const hasAdvancedRef = useRef(false);

  const headword = wordData?.word || '';
  const q = question || {};
  const mask = (text, fallback) => maskTargetWord(text, headword, fallback);
  const pos = wordData?.partOfSpeech || wordData?.pos || '';
  // Mirrors updateWordSRS in services/db.js exactly
  const currentInterval = wordData?.interval;
  const nextInterval = currentInterval === 1 ? 3 : currentInterval === 3 ? 7 : currentInterval === 7 ? 14 : (currentInterval || 0) * 2;
  const nextInLabel = Number.isFinite(nextInterval) && nextInterval > 0 ? `in ${nextInterval} days` : 'moves up';

  useEffect(() => () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
  }, []);

  const advance = () => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    onNext();
  };

  const handleSpeak = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(true);
      const u = new SpeechSynthesisUtterance(headword);
      u.lang = 'en-GB';
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  };

  // One-way flip, as in the classic review card
  const handleFlip = () => {
    if (isCommitted || isFlipped) return;
    setIsFlipped(true);
    triggerHaptic('light');
  };

  const handleCommit = (isCorrect, isSwipe = false) => {
    if (isCommitted || !isFlipped) return;
    setIsCommitted(true);
    triggerHaptic(isCorrect ? 'success' : 'error');
    onGrade(isCorrect);

    if (isSwipe) {
      advance();
      return;
    }
    setFeedback({
      isCorrect,
      message: isCorrect ? 'Excellent active recall!' : `The target word was: ${headword}.`
    });
    if (isCorrect) {
      advanceTimeoutRef.current = setTimeout(advance, 350);
    }
  };

  // Keyboard: Space flips, 1 = forgot, 2 = got it, Enter/Space = next after feedback
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (feedback && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        advance();
        return;
      }
      if (e.code === 'Space' && !isFlipped) {
        e.preventDefault();
        handleFlip();
        return;
      }
      if (isFlipped && !feedback) {
        if (e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handleCommit(false);
        } else if (e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleCommit(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isCommitted, feedback]);

  // Stamp opacities based on dragX
  const missOpacity = Math.min(1, Math.max(0, -dragX / 80));
  const gotOpacity = Math.min(1, Math.max(0, dragX / 80));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        padding: '12px 16px 20px',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {/* Step Sub-label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: 'var(--mute)',
          fontWeight: 500,
          marginBottom: '14px'
        }}
      >
        <span>Recall · review {reviewIndex} of {totalReviews}</span>
        <span>{q.meaningLabel || 'Core Meaning'}{q.hasSecondaryMeaning ? ` (${q.activeMeaning === 'secondary' ? '2 of 2' : '1 of 2'})` : ''}</span>
      </div>

      {/* 3D Flashcard Deck Stage */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: '380px',
          perspective: '1200px',
          cursor: 'grab'
        }}
      >
        <m.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDrag={(_, info) => setDragX(info.offset.x)}
          onDragEnd={(_, info) => {
            setDragX(0);
            if (!isFlipped) {
              if (Math.abs(info.offset.x) < 10) handleFlip();
              return;
            }
            if (isCommitted) return;
            if (info.offset.x < -100 || info.velocity.x < -400) {
              handleCommit(false, true);
            } else if (info.offset.x > 100 || info.velocity.x > 400) {
              handleCommit(true, true);
            }
          }}
          onClick={() => {
            if (Math.abs(dragX) < 8) handleFlip();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '28px',
            transformStyle: 'preserve-3d',
            rotate: dragX / 18,
            x: dragX,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)'
          }}
          className="fc"
        >
          {/* Card Inner Container with 3D Flip */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
            className="fc-in"
          >
            {/* FRONT FACE */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '28px',
                background: 'linear-gradient(180deg, #1E1E22 0%, #161618 100%)',
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflow: 'hidden'
              }}
              className="face front"
            >
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Which word means…
              </span>

              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: 'var(--fg)',
                  textWrap: 'pretty'
                }}
                className="q"
              >
                “{mask(q.question || q.definition || wordData?.definition || '', 'Review this concept in your dictionary')}”
              </div>

              {q.relatesTo && (
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Relates to</div>
                <div style={{ fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.45 }}>{mask(q.relatesTo)}</div>
              </div>
              )}

              {q.memoryTrigger && (
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Memory anchor</div>
                <div style={{ fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.45 }}>{mask(q.memoryTrigger)}</div>
              </div>
              )}

              {/* Hint Button */}
              <div style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(true);
                    triggerHaptic('light');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    background: 'var(--card2)',
                    border: '1px solid var(--line)',
                    fontSize: '13px',
                    color: showHint ? 'var(--warn)' : 'var(--fg3)',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  {showHint ? `Starts with: ${headword.slice(0, 1).toUpperCase()} ${headword.slice(1).replace(/./g, '•')}` : 'Hint: first letter'}
                </button>
              </div>

              {/* Tap to flip prompt */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--mute)',
                  fontSize: '13px',
                  marginTop: '8px'
                }}
                className="tapn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                </svg>
                Tap the card to see the answer
              </div>
            </div>

            {/* BACK FACE */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '28px',
                background: 'linear-gradient(180deg, #1E1E22 0%, #161618 100%)',
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                overflow: 'hidden'
              }}
              className="face back"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
                className="bw"
              >
                <h3
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: '40px',
                    fontWeight: 400,
                    lineHeight: 1.05,
                    color: 'var(--fg)'
                  }}
                >
                  {headword}
                </h3>

                <button
                  type="button"
                  className={`speak press ${speaking ? 'on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak();
                  }}
                  aria-label={`Pronounce ${headword}`}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '21px',
                    background: 'var(--card2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2.5px',
                    flex: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <i style={{ width: '3px', height: '6px', borderRadius: '2px', background: 'var(--acc2)' }} />
                  <i style={{ width: '3px', height: '12px', borderRadius: '2px', background: 'var(--acc2)' }} />
                  <i style={{ width: '3px', height: '16px', borderRadius: '2px', background: 'var(--acc2)' }} />
                  <i style={{ width: '3px', height: '8px', borderRadius: '2px', background: 'var(--acc2)' }} />
                </button>
              </div>

              {pos && (
                <span style={{ fontSize: '14px', color: 'var(--fg3)', textTransform: 'lowercase' }}>
                  {pos}
                </span>
              )}

              <div style={{ fontSize: '17px', lineHeight: 1.45, color: 'var(--fg)' }}>
                {q.definition || wordData?.definition}
              </div>

              {(q.example || wordData?.example) && (
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>In context</div>
                <div style={{ fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.45 }}>“{q.example || wordData?.example}”</div>
              </div>
              )}

              {q.hasSecondaryMeaning && q.secondaryMeaning && (
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{`Also remember (${q.activeMeaning === 'secondary' ? 'core meaning' : 'alternate meaning'})`}</div>
                <div style={{ fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.45 }}>{q.secondaryMeaning}</div>
              </div>
              )}
            </div>
          </div>

          {/* DRAG STAMPS */}
          <div
            className="stamp again"
            style={{
              position: 'absolute',
              top: '26px',
              right: '22px',
              padding: '6px 14px',
              borderRadius: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              fontSize: '14px',
              border: '2.5px solid var(--org)',
              color: 'var(--org)',
              background: 'rgba(42, 33, 26, 0.85)',
              transform: 'rotate(12deg)',
              opacity: missOpacity,
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            DIDN’T KNOW
          </div>

          <div
            className="stamp got"
            style={{
              position: 'absolute',
              top: '26px',
              left: '22px',
              padding: '6px 14px',
              borderRadius: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              fontSize: '14px',
              border: '2.5px solid var(--acc2)',
              color: 'var(--acc2)',
              background: 'rgba(28, 31, 61, 0.85)',
              transform: 'rotate(-12deg)',
              opacity: gotOpacity,
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            KNEW IT
          </div>
        </m.div>
      </div>

      {/* ACTION CONTROLS */}
      <div style={{ marginTop: '18px' }}>
        {feedback ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: feedback.isCorrect ? 'var(--okbg)' : 'var(--orgbg)',
                color: feedback.isCorrect ? 'var(--ok)' : 'var(--org2)',
                fontSize: '14px',
                lineHeight: 1.45
              }}
            >
              <b style={{ fontWeight: 600 }}>{feedback.message}</b>
              {!feedback.isCorrect && (q.definition || wordData?.definition) && (
                <div style={{ marginTop: '4px', color: 'var(--fg2)' }}>
                  Remember: <b style={{ fontWeight: 600 }}>{headword}</b> means {q.definition || wordData?.definition}
                </div>
              )}
            </div>
            <Button variant="light" size="default" onClick={advance}>
              Next word →
            </Button>
          </div>
        ) : !isFlipped ? (
          <Button
            variant="light"
            size="default"
            onClick={handleFlip}
          >
            Show answer
          </Button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Button
              variant="off"
              size="default"
              onClick={() => handleCommit(false)}
              style={{
                background: 'var(--orgbg)',
                color: 'var(--org2)',
                border: '1px solid rgba(255, 159, 46, 0.25)',
                flexDirection: 'column',
                gap: '2px',
                height: '56px'
              }}
            >
              <span style={{ fontSize: '15px' }}>Didn't know</span>
              <small style={{ fontSize: '11.5px', color: 'var(--org)', opacity: 0.85 }}>back to day 1</small>
            </Button>

            <Button
              variant="primary"
              size="default"
              onClick={() => handleCommit(true)}
              style={{
                background: 'var(--accbg)',
                color: 'var(--acc3)',
                border: '1px solid rgba(124, 136, 255, 0.3)',
                flexDirection: 'column',
                gap: '2px',
                height: '56px'
              }}
            >
              <span style={{ fontSize: '15px' }}>Knew it</span>
              <small style={{ fontSize: '11.5px', color: 'var(--acc2)', opacity: 0.85 }}>{nextInLabel}</small>
            </Button>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '12.5px',
          color: 'var(--mute)',
          marginTop: '10px',
          opacity: isFlipped && !feedback ? 1 : 0,
          transition: 'opacity 0.25s'
        }}
      >
        Swipe left or right to grade · Keys: <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--card2)' }}>1</kbd> forgot · <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--card2)' }}>2</kbd> got it
      </div>
    </div>
  );
}

export default Recall;
