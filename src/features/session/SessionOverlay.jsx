import React, { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useWords, useData } from '../../data/DataProvider';
import { updateWordSRS, saveLearnedWord, recordDailyActivity } from '../../services/db';
import Recall from './steps/Recall';
import Write from './steps/Write';
import Done from './steps/Done';
import WordDetailPage from '../words/WordDetailPage';
import { useLayout } from '../../motion/useLayout';

export function SessionOverlay({
  isOpen = false,
  mode = 'full', // 'full' | 'reviews' | 'practice-word' | 'weak'
  targetWord = 'albeit',
  weakWords = [],
  onClose = () => {},
  onGoToWords = () => {}
}) {
  if (!isOpen) return null;

  const { currentUser } = useData();
  const { dueWords, allWords } = useWords();
  const { isLaptop, isTablet } = useLayout();

  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [activeWordDetail, setActiveWordDetail] = useState(null);

  // Build steps list based on mode
  const steps = useMemo(() => {
    const list = [];

    if (mode === 'reviews') {
      const wordsToReview = dueWords.length > 0 ? dueWords : allWords.slice(0, 5);
      wordsToReview.forEach(w => list.push({ kind: 'recall', wordData: w }));
    } else if (mode === 'weak') {
      const weakList = weakWords.length > 0
        ? weakWords.map(w => allWords.find(item => item.word === w) || { word: w })
        : allWords.slice(0, 3);
      weakList.forEach(w => list.push({ kind: 'recall', wordData: w }));
    } else if (mode === 'practice-word') {
      list.push({ kind: 'write', word: targetWord });
    } else {
      // Full session
      const reviewSlice = dueWords.length > 0 ? dueWords.slice(0, 5) : allWords.slice(0, 5);
      reviewSlice.forEach(w => list.push({ kind: 'recall', wordData: w }));
      list.push({ kind: 'write', word: targetWord || 'albeit' });
    }

    list.push({ kind: 'done' });
    return list;
  }, [mode, dueWords, allWords, targetWord, weakWords]);

  // Reset steps when opened
  useEffect(() => {
    if (isOpen) {
      setStepIdx(0);
      setResults([]);
      setActiveWordDetail(null);
    }
  }, [isOpen, mode]);

  // Global Escape key to end session
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentStep = steps[stepIdx] || { kind: 'done' };

  // Calculate session weights
  const totalWeight = useMemo(() => {
    return steps.reduce((acc, s) => {
      if (s.kind === 'recall') return acc + 1;
      if (s.kind === 'write') return acc + 3;
      return acc;
    }, 0);
  }, [steps]);

  const completedWeight = useMemo(() => {
    return steps.slice(0, stepIdx).reduce((acc, s) => {
      if (s.kind === 'recall') return acc + 1;
      if (s.kind === 'write') return acc + 3;
      return acc;
    }, 0);
  }, [steps, stepIdx]);

  const handleRecallGrade = async (isCorrect, wordItem) => {
    setResults(prev => [...prev, { kind: 'recall', word: wordItem.word, ok: isCorrect }]);

    if (currentUser?.uid && wordItem.word) {
      try {
        await updateWordSRS(currentUser.uid, wordItem.word, isCorrect);
        await recordDailyActivity(currentUser.uid);
      } catch (err) {
        console.error('Failed to update SRS progress', err);
      }
    }

    setStepIdx(prev => prev + 1);
  };

  const handleWriteComplete = async (payload) => {
    setResults(prev => [...prev, { kind: 'write', word: targetWord, ok: true, payload }]);

    if (currentUser?.uid && targetWord) {
      try {
        await saveLearnedWord(currentUser.uid, {
          word: targetWord,
          factualSentence: payload.sentences[0] || '',
          personalSentence: payload.sentences[1] || '',
          questionSentence: payload.sentences[2] || '',
          contextSentence: payload.contextSentence || '',
          interval: 1,
          repetition: 1,
          easeFactor: 2.5
        });
        await recordDailyActivity(currentUser.uid);
      } catch (err) {
        console.error('Failed to save learned word', err);
      }
    }

    setStepIdx(prev => prev + 1);
  };

  const modeTitle = mode === 'reviews'
    ? 'Reviews only'
    : mode === 'practice-word'
    ? 'Practise word'
    : mode === 'weak'
    ? 'Weak words'
    : 'Today’s session';

  const renderSessionContent = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Header Chrome */}
      <header
        style={{
          padding: isLaptop ? '16px 20px 12px' : 'calc(var(--sb, 0px) + 12px) 16px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(6, 6, 7, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid var(--line)',
          zIndex: 10
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="End session"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '18px',
            background: 'var(--card2)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg)',
            cursor: 'pointer',
            flex: 'none'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Segmented Progress Track */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '4px',
            height: '4px'
          }}
          role="progressbar"
          aria-valuemax={totalWeight}
          aria-valuenow={completedWeight}
        >
          {Array.from({ length: totalWeight }).map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                borderRadius: '2px',
                background: idx < completedWeight
                  ? 'var(--acc2)'
                  : idx === completedWeight
                  ? 'var(--acc)'
                  : 'rgba(255, 255, 255, 0.12)',
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>

        {/* Counter */}
        <span
          className="num"
          style={{
            fontSize: '13.5px',
            color: 'var(--fg3)',
            fontWeight: 600,
            minWidth: '38px',
            textAlign: 'right'
          }}
        >
          {completedWeight}/{totalWeight}
        </span>
      </header>

      {/* Mode Sub-header */}
      <div
        style={{
          padding: '8px 20px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--acc2)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}
      >
        {modeTitle}
      </div>

      {/* Active Stage Body */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <AnimatePresence mode="wait">
          {currentStep.kind === 'recall' && (
            <m.div
              key={`recall-${stepIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Recall
                wordData={currentStep.wordData}
                reviewIndex={stepIdx + 1}
                totalReviews={steps.filter(s => s.kind === 'recall').length}
                onGrade={handleRecallGrade}
              />
            </m.div>
          )}

          {currentStep.kind === 'write' && (
            <m.div
              key={`write-${stepIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Write
                word={currentStep.word || targetWord}
                onComplete={handleWriteComplete}
                onOpenDetails={(w) => setActiveWordDetail(allWords.find(item => item.word === w) || { word: w })}
              />
            </m.div>
          )}

          {currentStep.kind === 'done' && (
            <m.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Done
                results={results}
                xpGained={30}
                mode={mode}
                targetWord={targetWord}
                onClose={onClose}
                onReviewWeak={() => {
                  setResults([]);
                  setStepIdx(0);
                }}
                onGoToWords={() => {
                  onClose();
                  onGoToWords();
                }}
              />
            </m.div>
          )}
        </AnimatePresence>
      </main>

      {/* Embedded Word Detail Sub-Sheet if opened from Write */}
      {activeWordDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--bg)' }}>
          <WordDetailPage
            word={activeWordDetail}
            onBack={() => setActiveWordDetail(null)}
          />
        </div>
      )}
    </div>
  );

  if (isLaptop) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '24px'
        }}
        role="dialog"
        aria-label="Session"
      >
        {/* Centered Session Panel 640px wide */}
        <m.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            width: '640px',
            height: 'min(760px, 90vh)',
            background: 'var(--stage)',
            borderRadius: '24px',
            border: '1px solid var(--line)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {renderSessionContent()}
        </m.div>

        {/* Laptop Keyboard Shortcuts Card Beside */}
        <aside
          style={{
            width: '200px',
            background: 'rgba(22, 22, 24, 0.8)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            color: 'var(--fg2)',
            fontSize: '13px'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--mute)' }}>
            Shortcuts
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Flip card</span>
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>Space</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Didn't know</span>
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>←</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Knew it</span>
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>→</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>End session</span>
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>Esc</span>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'var(--stage)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      role="dialog"
      aria-label="Session"
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: isTablet ? '560px' : '100%',
          margin: '0 auto'
        }}
      >
        {renderSessionContent()}
      </div>
    </m.div>
  );
}

export default SessionOverlay;
