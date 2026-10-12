import React, { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useWords, useData } from '../../data/DataProvider';
import { updateWordSRS, saveLearnedWord, recordDailyActivity } from '../../services/db';
import Recall from './steps/Recall';
import Write from './steps/Write';
import Done from './steps/Done';
import WordDetailPage from '../words/WordDetailPage';

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

  if (!isOpen) return null;

  const currentStep = steps[stepIdx] || steps[steps.length - 1];

  // Calculate weighted progress
  const weights = steps.map(s => s.kind === 'write' ? 3 : s.kind === 'done' ? 0 : 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const completedWeight = weights.slice(0, stepIdx).reduce((a, b) => a + b, 0);

  // Recall grade handler
  const handleRecallGrade = async (isCorrect) => {
    const wordItem = currentStep.wordData;
    const wordKey = wordItem?.id || wordItem?.word;

    // Record result
    setResults(prev => [...prev, { id: wordKey, word: wordItem?.word, ok: isCorrect }]);

    // Persist SRS to Firestore
    if (currentUser?.uid && wordKey) {
      try {
        await updateWordSRS(currentUser.uid, wordKey, isCorrect, wordItem?.interval || 1);
        await recordDailyActivity(currentUser.uid);
      } catch (e) {
        console.error('Failed to update SRS:', e);
      }
    }

    // Advance to next step
    setStepIdx(i => Math.min(steps.length - 1, i + 1));
  };

  // Writing step complete handler
  const handleWriteComplete = async ({ word, sentences, xpGained }) => {
    if (currentUser?.uid) {
      try {
        await saveLearnedWord(currentUser.uid, {
          word,
          factualSentence: sentences[0] || '',
          personalSentence: sentences[1] || '',
          questionSentence: sentences[2] || '',
          status: 'learning',
          interval: 1,
          createdAt: Date.now()
        });
        await recordDailyActivity(currentUser.uid);
      } catch (e) {
        console.error('Failed to save learned word:', e);
      }
    }

    // Advance to done
    setStepIdx(i => Math.min(steps.length - 1, i + 1));
  };

  const modeTitle = mode === 'reviews'
    ? 'Reviews only'
    : mode === 'practice-word'
    ? `Practise ${targetWord}`
    : mode === 'weak'
    ? 'Weak words'
    : 'Today’s session';

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
      {/* Top Header Chrome */}
      <header
        style={{
          padding: 'calc(var(--sb, 44px) + 6px) 16px 12px',
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
          padding: '8px 16px',
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
                  const weak = results.filter(r => !r.ok).map(r => r.word);
                  // Relaunch in weak mode
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
    </m.div>
  );
}

export default SessionOverlay;
