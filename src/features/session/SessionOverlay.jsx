import React, { useState, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useWords, useData } from '../../data/DataProvider';
import {
  getDueWords,
  updateWordSRS,
  saveLearnedWord,
  recordReviewResult,
  getUserEnglishLevel,
  getWordBankQuestions,
  updateQuestionBankResult,
  recordTodayProgress
} from '../../services/db';
import Recall from './steps/Recall';
import Write from './steps/Write';
import Done from './steps/Done';
import WordDetailPage from '../words/WordDetailPage';
import { useLayout } from '../../motion/useLayout';
import { buildLocalQuestion, shuffleArray, nextReviewLabel } from './reviewQuestion';

// Fields DataProvider derives for display only; never persist them.
const DERIVED_FIELDS = ['expiresInDays', 'dueLabel'];

export function SessionOverlay({
  isOpen = false,
  mode = 'full', // 'full' | 'reviews' | 'practice-word' | 'weak'
  targetWordData = null,
  weakWords = [],
  onClose = () => {},
  onGoToWords = () => {}
}) {
  const { currentUser } = useData();
  const { allWords } = useWords();
  const { isLaptop, isTablet } = useLayout();

  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [activeWordDetail, setActiveWordDetail] = useState(null);
  // The review queue is snapshotted when the session opens (like the classic
  // Review page), so live Firestore updates can't reshuffle it mid-session.
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const bankIdRef = useRef(null);
  const userLevelRef = useRef(1);

  const targetWord = targetWordData?.word || '';

  useEffect(() => {
    if (!isOpen) {
      // Reset while closed so the next open never paints a stale session
      setStepIdx(0);
      setResults([]);
      setActiveWordDetail(null);
      setQueue([]);
      setQueueLoading(true);
      return;
    }

    const uid = currentUser?.uid;
    if (!uid) {
      setQueueLoading(false);
      return;
    }
    let cancelled = false;

    getUserEnglishLevel(uid).then(res => {
      if (res?.level) userLevelRef.current = res.level;
    }).catch(() => {});

    if (mode === 'reviews' || mode === 'full') {
      setQueueLoading(true);
      getDueWords(uid)
        .then(due => { if (!cancelled) setQueue(shuffleArray(due)); })
        .catch(err => console.error(err))
        .finally(() => { if (!cancelled) setQueueLoading(false); });
    } else if (mode === 'weak') {
      const wanted = new Set(weakWords.map(w => String(w?.word || w).toLowerCase()));
      setQueue(shuffleArray(allWords.filter(w => wanted.has((w.word || '').toLowerCase()))));
      setQueueLoading(false);
    } else {
      setQueueLoading(false);
    }

    return () => { cancelled = true; };
  }, [isOpen, mode, currentUser?.uid]);

  const steps = useMemo(() => {
    const list = queue.map(w => ({ kind: 'recall', wordData: w }));
    if ((mode === 'practice-word' || mode === 'full') && targetWord) {
      list.push({ kind: 'write', wordData: targetWordData });
    }
    list.push({ kind: 'done' });
    return list;
  }, [queue, mode, targetWord, targetWordData]);

  const currentStep = steps[stepIdx] || { kind: 'done' };
  const currentRecallWord = currentStep.kind === 'recall' ? currentStep.wordData : null;

  // Build the flashcard exactly like the classic Review page: instant local
  // question, upgraded to the user's question-bank flashcard when one exists.
  useEffect(() => {
    bankIdRef.current = null;
    if (!currentRecallWord) {
      setQuestion(null);
      return;
    }
    const local = buildLocalQuestion(currentRecallWord);
    setQuestion(local);
    if (!currentUser?.uid) return;
    let cancelled = false;
    getWordBankQuestions(currentUser.uid, currentRecallWord.word)
      .then(existing => {
        const bank = (existing || []).find(q => q.type === 'flashcard');
        if (bank && !cancelled) {
          bankIdRef.current = bank.id || null;
          setQuestion({ ...local, ...bank, type: 'flashcard' });
        }
      })
      .catch(err => console.warn('Question bank lookup failed:', err));
    return () => { cancelled = true; };
  }, [currentRecallWord?.id, currentRecallWord?.word, currentUser?.uid]);

  // Global Escape key to end session
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  // Grading persists in the background, exactly like the classic Review page.
  const handleRecallGrade = (isCorrect) => {
    const wordItem = currentRecallWord;
    if (!wordItem) return;
    setResults(prev => [...prev, {
      kind: 'recall',
      id: wordItem.id,
      word: wordItem.word,
      definition: wordItem.definition || '',
      interval: wordItem.interval || 1,
      ok: isCorrect
    }]);

    const uid = currentUser?.uid;
    if (!uid || !wordItem.id) return;
    updateWordSRS(uid, wordItem.id, isCorrect, wordItem.interval).catch(err => {
      console.warn('Background updateWordSRS deferred:', err);
    });
    recordReviewResult(uid, isCorrect, userLevelRef.current).catch(err => {
      console.warn('Background recordReviewResult deferred:', err);
    });
    // v2-only: feeds the Today card's daily ring (stats.today)
    recordTodayProgress(uid, 'review');
    if (bankIdRef.current) {
      updateQuestionBankResult(uid, bankIdRef.current, isCorrect).catch(err => {
        console.warn('updateQuestionBankResult error:', err);
      });
    }
  };

  const handleRecallNext = () => setStepIdx(prev => prev + 1);

  const handleWriteComplete = async (sentences) => {
    if (currentUser?.uid && targetWordData?.word) {
      const wordToSave = { ...targetWordData, ...sentences };
      DERIVED_FIELDS.forEach(k => delete wordToSave[k]);
      try {
        await saveLearnedWord(currentUser.uid, wordToSave);
        recordTodayProgress(currentUser.uid, 'word');
      } catch (err) {
        console.error('Failed to save learned word', err);
      }
    }
    setResults(prev => [...prev, { kind: 'write', word: targetWord, ok: true }]);
    setStepIdx(prev => prev + 1);
  };

  const handleReviewWeak = () => {
    const missedIds = new Set(results.filter(r => r.kind === 'recall' && !r.ok).map(r => r.id || r.word));
    const pool = allWords.length > 0 ? allWords : queue;
    const weak = pool.filter(w => missedIds.has(w.id) || missedIds.has(w.word));
    if (weak.length === 0) return;
    setQueue(shuffleArray(weak));
    setResults([]);
    setStepIdx(0);
  };

  if (!isOpen) return null;

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
        {queueLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spin" aria-label="Loading reviews" />
          </div>
        ) : (
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
                key={currentStep.wordData?.id || stepIdx}
                wordData={currentStep.wordData}
                question={(question?.word || '').toLowerCase() === (currentStep.wordData?.word || '').toLowerCase()
                  ? question
                  : buildLocalQuestion(currentStep.wordData)}
                reviewIndex={stepIdx + 1}
                totalReviews={steps.filter(s => s.kind === 'recall').length}
                onGrade={handleRecallGrade}
                onNext={handleRecallNext}
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
                wordData={currentStep.wordData}
                onComplete={handleWriteComplete}
                onOpenDetails={() => setActiveWordDetail(allWords.find(item => item.word === targetWord.toLowerCase()) || targetWordData)}
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
                mode={mode}
                targetWord={targetWord}
                nextReview={nextReviewLabel(allWords)}
                onClose={onClose}
                onReviewWeak={handleReviewWeak}
                onGoToWords={() => {
                  onClose();
                  onGoToWords();
                }}
              />
            </m.div>
          )}
        </AnimatePresence>
        )}
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
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>1</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Knew it</span>
            <span style={{ padding: '2px 6px', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '11px' }}>2</span>
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
