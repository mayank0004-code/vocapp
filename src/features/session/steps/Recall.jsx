import React, { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import Button from '../../../ui/Button';
import { triggerHaptic } from '../../../motion/haptics';

export function Recall({
  wordData,
  reviewIndex = 1,
  totalReviews = 1,
  onGrade = () => {}
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isCommitted, setIsCommitted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const headword = wordData?.word || '';
  const definition = wordData?.def || wordData?.definition || wordData?.short || '';
  const pos = wordData?.pos || wordData?.partOfSpeech || 'adjective';
  const example = wordData?.example || wordData?.sentence || '';
  const pairs = wordData?.pairs || wordData?.collocations || [];
  const currentInterval = wordData?.interval || 1;
  const nextInterval = currentInterval <= 1 ? 3 : currentInterval <= 3 ? 7 : currentInterval <= 7 ? 14 : currentInterval * 2;
  const nextInLabel = `in ${nextInterval} days`;

  // Parse context sentence with blank
  const renderBlankContext = () => {
    if (!example) return `“A sentence illustrating the meaning of this word.”`;
    const regex = new RegExp(`\\b${headword}\\b`, 'i');
    if (regex.test(example)) {
      const parts = example.split(regex);
      return (
        <>
          “{parts[0]}
          <span
            style={{
              display: 'inline-block',
              width: `${Math.max(60, headword.length * 10)}px`,
              borderBottom: '2px solid var(--acc2)',
              margin: '0 4px',
              verticalAlign: 'baseline'
            }}
          />
          {parts[1]}”
        </>
      );
    }
    return `“${example}”`;
  };

  const renderFilledContext = () => {
    if (!example) return `“A sentence using ${headword}.”`;
    const regex = new RegExp(`\\b${headword}\\b`, 'i');
    if (regex.test(example)) {
      const parts = example.split(regex);
      return (
        <>
          “{parts[0]}
          <b style={{ fontStyle: 'normal', color: 'var(--acc3)', fontWeight: 600 }}>
            {headword}
          </b>
          {parts[1]}”
        </>
      );
    }
    return `“${example}”`;
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

  const handleFlip = () => {
    if (isCommitted) return;
    setIsFlipped(prev => !prev);
    setIsRevealed(true);
    triggerHaptic('light');
  };

  const handleCommit = (isCorrect) => {
    if (isCommitted) return;
    setIsCommitted(true);
    triggerHaptic(isCorrect ? 'success' : 'error');
    onGrade(isCorrect);
  };

  // Keyboard navigation: Space/Enter = flip, ArrowLeft = miss, ArrowRight = got
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isRevealed) handleCommit(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isRevealed) handleCommit(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, isCommitted]);

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
        <span>{wordData?.interval ? `SRS step ${wordData.interval}` : 'Fresh recall'}</span>
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
            if (!isRevealed) {
              if (Math.abs(info.offset.x) < 10) handleFlip();
              return;
            }
            if (info.offset.x < -100 || info.velocity.x < -500) {
              handleCommit(false);
            } else if (info.offset.x > 100 || info.velocity.x > 500) {
              handleCommit(true);
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
                {definition}
              </div>

              <div
                className="serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: '18px',
                  lineHeight: 1.5,
                  color: 'var(--fg2)',
                  marginTop: '6px'
                }}
              >
                {renderBlankContext()}
              </div>

              {/* Hint Button */}
              <div style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(prev => !prev);
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
                  {showHint ? `Starts with “${headword[0]}…”` : 'Hint: first letter'}
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

              <span style={{ fontSize: '14px', color: 'var(--fg3)', textTransform: 'lowercase' }}>
                {pos}
              </span>

              <div
                className="serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: '18px',
                  lineHeight: 1.5,
                  color: 'var(--fg2)',
                  marginTop: '4px'
                }}
              >
                {renderFilledContext()}
              </div>

              {/* Collocations */}
              {pairs.length > 0 && (
                <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pairs.map((p, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--line)',
                        fontSize: '12.5px',
                        color: 'var(--fg2)'
                      }}
                    >
                      {p}
                    </span>
                  ))}
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
        {!isRevealed ? (
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
          opacity: isRevealed ? 1 : 0,
          transition: 'opacity 0.25s'
        }}
      >
        Swipe left or right to grade · Keys: <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--card2)' }}>←</kbd> <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--card2)' }}>→</kbd> <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--card2)' }}>Space</kbd>
      </div>
    </div>
  );
}

export default Recall;
