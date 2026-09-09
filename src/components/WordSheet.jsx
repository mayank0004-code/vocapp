/**
 * WordSheet — shared bottom sheet for displaying a word breakdown.
 *
 * Used by Today (lookup) and Dictionary (row expand).
 * Opens immediately with a skeleton inside. Enter/exit symmetrically
 * from/to the trigger element. Drag with momentum projection to dismiss.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { springs, project } from '../motion/springs';

/* ── Icons ─────────────────────────────────────────────────── */
const Icon = ({ path, size = 20, color = 'currentColor', fill = 'none' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    {Array.isArray(path)
      ? path.map((d, i) => <path key={i} d={d} />)
      : <path d={path} />}
  </svg>
);

const ICONS = {
  audio:    ['M11 5 6 9H2v6h4l5 4V5z', 'M19.07 4.93a10 10 0 0 1 0 14.14', 'M15.54 8.46a5 5 0 0 1 0 7.07'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  x:        ['M18 6 6 18', 'M6 6l12 12'],
};

/* ── Skeleton ─────────────────────────────────────────────── */
function Skel({ w = '100%', h = 16, style = {} }) {
  return (
    <div className="skeleton" style={{ width: w, height: h, borderRadius: 6, ...style }} />
  );
}

function SheetSkeleton({ word }) {
  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--sp-4)' }}>
        Looking up "{word}"…
      </p>
      {/* Word */}
      <Skel w="55%" h={34} style={{ marginBottom: 'var(--sp-2)' }} />
      {/* Definition lead */}
      <Skel w="100%" h={20} style={{ marginBottom: 'var(--sp-2)' }} />
      <Skel w="85%"  h={20} style={{ marginBottom: 'var(--sp-6)' }} />
      {/* Secondary rows */}
      {['Register', 'Origin', 'Collocations', 'Example'].map(label => (
        <div key={label} style={{ marginBottom: 'var(--sp-5)' }}>
          <Skel w={70} h={11} style={{ marginBottom: 'var(--sp-2)' }} />
          <Skel w="90%" h={16} />
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function WordSheet({
  isOpen,
  onClose,
  wordData,      // null while loading
  loading,
  word,          // the word being looked up (for skeleton label)
  onPractice,
  onSaveForLater,
  triggerRef,    // ref to the element that opened the sheet (for enter/exit origin)
}) {
  const sheetRef    = useRef(null);
  const firstFocusRef = useRef(null);
  const previousFocus = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement;
      // Small delay so the sheet is in DOM before focusing
      requestAnimationFrame(() => {
        firstFocusRef.current?.focus();
      });
    } else {
      // Return focus to trigger on close
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab' || !sheetRef.current) return;

    const focusable = sheetRef.current.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
    }
  }, [onClose]);

  const playAudio = () => {
    if (!wordData?.word) return;
    const u = new SpeechSynthesisUtterance(wordData.word);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  // Compute transform-origin from trigger element position
  const getOriginStyle = () => {
    if (!triggerRef?.current) return {};
    const r = triggerRef.current.getBoundingClientRect();
    return {
      transformOrigin: `${r.left + r.width / 2}px ${r.bottom}px`,
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200,
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <m.div
            key="sheet-panel"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-word-heading"
            onKeyDown={handleKeyDown}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.08, bottom: 0 }}
            onDragEnd={(_, info) => {
              const vel = info.velocity.y;
              const offset = info.offset.y;
              // Commit dismiss if projected endpoint > 160px below OR fast downward flick
              const projected = offset + project(vel);
              if (projected > 160 || vel > 500) {
                onClose();
              }
            }}
            initial={{ y: '100%', ...getOriginStyle() }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.sheet}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 201,
              background: 'var(--surface-color)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              maxHeight: '90dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
              cursor: 'grab',
              touchAction: 'none',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-3) 0 0' }}>
              <div style={{
                width: 36, height: 4,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--border-color)',
              }} />
            </div>

            {/* Close button */}
            <button
              ref={firstFocusRef}
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-4)',
                minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(120,120,128,0.16)',
                border: 'none', borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', color: 'var(--text-secondary)',
                transition: 'transform 100ms ease-out',
              }}
            >
              <Icon path={ICONS.x} size={16} />
            </button>

            {/* Scrollable content */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                cursor: 'auto',
                paddingBottom: `calc(88px + var(--safe-bottom))`, // room for sticky footer
              }}
            >
              {/* Live region for screen readers */}
              <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                {wordData && !loading ? `Word loaded: ${wordData.word}` : ''}
              </div>

              {loading || !wordData
                ? <SheetSkeleton word={word} />
                : <WordContent wordData={wordData} playAudio={playAudio} />
              }
            </div>

            {/* Sticky action footer */}
            {!loading && wordData && (
              <div style={{
                position: 'sticky', bottom: 0,
                padding: `var(--sp-4) var(--sp-5) calc(var(--sp-4) + var(--safe-bottom))`,
                background: 'var(--surface-color)',
                borderTop: '0.5px solid var(--border-color)',
                display: 'flex', gap: 'var(--sp-3)',
              }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={onPractice}
                >
                  Practice now
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)' }}
                  onClick={onSaveForLater}
                >
                  <Icon path={ICONS.bookmark} size={16} />
                  Save for later
                </button>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Word Content ────────────────────────────────────────────── */
function WordContent({ wordData, playAudio }) {
  return (
    <div style={{ padding: 'var(--sp-4) var(--sp-5) 0', cursor: 'auto' }}>

      {/* 1. Word + audio */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', paddingRight: 48 }}>
        <h2
          id="sheet-word-heading"
          className="t-display"
          style={{ margin: 0 }}
        >
          {wordData.word}
        </h2>
        <button
          onClick={playAudio}
          aria-label={`Hear pronunciation of ${wordData.word}`}
          style={{
            minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(120,120,128,0.12)',
            border: 'none', borderRadius: 'var(--radius-pill)',
            cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'transform 100ms ease-out',
            flexShrink: 0,
          }}
        >
          <Icon path={ICONS.audio} size={18} />
        </button>
      </div>

      {/* 2. Context Meaning — shown first when present (most personalised) */}
      {wordData.contextMeaning && (
        <div style={{
          marginBottom: 'var(--sp-5)',
          padding: 'var(--sp-3) var(--sp-4)',
          borderLeft: '3px solid var(--accent-color)',
          background: 'rgba(0,113,227,0.05)',
          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        }}>
          <p className="t-label" style={{ marginBottom: 'var(--sp-1)', color: 'var(--accent-color)' }}>
            In your context
          </p>
          <p style={{ fontSize: 'var(--type-body)', margin: 0, color: 'var(--text-secondary)', lineHeight: 'var(--type-body-lh)' }}>
            {wordData.contextMeaning}
          </p>
        </div>
      )}

      {/* 3. Definition — the lead, no label */}
      <p style={{
        fontSize: 'var(--type-lead)',
        lineHeight: 'var(--type-lead-lh)',
        letterSpacing: 'var(--type-lead-ls)',
        color: 'var(--text-primary)',
        marginBottom: 'var(--sp-6)',
        maxWidth: '65ch',
      }}>
        {wordData.definition}
      </p>

      {/* 4. Secondary sections — separated by space and weight, no boxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

        {/* Register */}
        {wordData.vibeCheck && (
          <div>
            <p className="t-label" style={{ marginBottom: 'var(--sp-1)' }}>Register</p>
            <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)', margin: 0 }}>
              {wordData.vibeCheck}
            </p>
          </div>
        )}

        {/* Origin */}
        {wordData.origin && (
          <div>
            <p className="t-label" style={{ marginBottom: 'var(--sp-1)' }}>Origin</p>
            <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
              {wordData.origin}
            </p>
          </div>
        )}

        {/* Collocations */}
        {wordData.collocations?.length > 0 && (
          <div>
            <p className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>Collocations</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {wordData.collocations.map((col, i) => (
                <span key={i} style={{
                  fontSize: 'var(--type-sm)',
                  fontWeight: 500,
                  padding: '4px var(--sp-3)',
                  background: 'rgba(120,120,128,0.1)',
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--text-primary)',
                }}>
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Example */}
        {wordData.example && (
          <div>
            <p className="t-label" style={{ marginBottom: 'var(--sp-1)' }}>Example</p>
            <p style={{
              fontSize: 'var(--type-body)',
              color: 'var(--text-secondary)',
              margin: 0,
              fontStyle: 'italic',
              paddingLeft: 'var(--sp-3)',
              borderLeft: '2px solid var(--border-color)',
            }}>
              "{wordData.example}"
            </p>
          </div>
        )}

        {/* Common traps — one inline block, one signal (warning border-left) */}
        {wordData.commonMistakes?.length > 0 && (
          <div>
            <p className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>Common traps</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {wordData.commonMistakes.map((m, i) => (
                <p key={i} style={{
                  fontSize: 'var(--type-sm)',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  paddingLeft: 'var(--sp-3)',
                  borderLeft: `2px solid var(--color-warning)`,
                  lineHeight: 1.5,
                }}>
                  {m}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom padding before sticky footer */}
      <div style={{ height: 'var(--sp-6)' }} />
    </div>
  );
}
