/**
 * Today.jsx — the daily lookup + practice screen (was Learn.jsx)
 * Tab label: "Today"
 */
import React, { useState, useEffect, useRef } from 'react';
import { fetchWordBreakdown, evaluateSentence } from '../services/ai';
import {
  checkWordExists, saveLearnedWord, getPendingWords, savePendingWord,
  getScheduledReviewCount, getUserMistakePatterns, savePracticeResult,
} from '../services/db';
import WordSheet from '../components/WordSheet';
import { Loader2, CheckCircle } from '../components/Icons';

/* ── Streak Strip ─────────────────────────────────────────── */
function StreakStrip({ currentStreak }) {
  const today = new Date().getDay(); // 0=Sun
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center' }}>
      {days.map((d, i) => {
        // Fill backward from today for streak length
        const daysAgo = (today - i + 7) % 7;
        const filled  = currentStreak > 0 && daysAgo < currentStreak && daysAgo <= 6;
        const isToday = i === today;
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 'var(--radius-pill)',
              background: filled
                ? 'var(--color-warning)'
                : isToday
                  ? 'rgba(120,120,128,0.2)'
                  : 'rgba(120,120,128,0.08)',
              border: isToday ? '1.5px solid var(--color-warning)' : 'none',
              transition: 'background 300ms ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: isToday ? 'var(--color-warning)' : 'var(--text-tertiary)',
              letterSpacing: '0.04em',
            }}>{d}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Practice Modal (steps 1-3) ─────────────────────────────── */
function PracticeModal({ wordData, onComplete, onClose, currentUser }) {
  const [step, setStep]           = useState(1);
  const [input, setInput]         = useState('');
  const [grading, setGrading]     = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [showWhy, setShowWhy]     = useState(false);
  const [sentences, setSentences] = useState({ factualSentence:'', personalSentence:'', questionSentence:'' });
  const [mistakePatterns, setMistakePatterns] = useState('');

  useEffect(() => {
    getUserMistakePatterns(currentUser.uid).then(setMistakePatterns).catch(() => {});
  }, [currentUser.uid]);

  const stepConfig = [
    { label: 'Factual sentence', key: 'factualSentence',  hint: wordData?.practiceHints?.factual   || `State a fact using "${wordData?.word}"…` },
    { label: 'Personal sentence', key: 'personalSentence', hint: wordData?.practiceHints?.personal  || `Relate "${wordData?.word}" to your own life…` },
    { label: 'Ask a question',    key: 'questionSentence', hint: wordData?.practiceHints?.question  || `Ask a question containing "${wordData?.word}"…` },
  ];
  const cfg = stepConfig[step - 1];

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setGrading(true);
    setFeedback(null);
    const types = ['Factual', 'Personal', 'Question'];
    try {
      const ev = await evaluateSentence(wordData.word, types[step - 1], input.trim(), mistakePatterns);
      await savePracticeResult(currentUser.uid, ev.isCorrect, ev.errorTags, {
        word: wordData.word,
        originalSentence: input.trim(),
        reframedSentence: ev.reframedSentence || '',
      });

      const newSentences = { ...sentences, [cfg.key]: input.trim() };
      setSentences(newSentences);

      if (ev.isCorrect) {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        setFeedback({ type: 'success', message: ev.feedback, reframed: ev.reframedSentence });
        setInput('');
        if (step < 3) {
          setTimeout(() => { setStep(s => s + 1); setFeedback(null); setShowWhy(false); }, 900);
        } else {
          await saveLearnedWord(currentUser.uid, { ...wordData, ...newSentences });
          setTimeout(() => onComplete(), 900);
        }
      } else {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setFeedback({ type: 'error', message: ev.feedback, reframed: ev.reframedSentence });
        setShowWhy(false);
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
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <h3 className="t-title" style={{ margin: 0 }}>{cfg.label}</h3>
          <span className="t-label">{step} of 3</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border-color)', borderRadius: 3, marginBottom: 'var(--sp-5)' }}>
          <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: 'var(--accent-color)', borderRadius: 3, transition: 'width 400ms ease' }} />
        </div>

        <p className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>Practicing: {wordData.word}</p>

        <textarea
          className="input"
          style={{ minHeight: 100, resize: 'vertical', marginBottom: 'var(--sp-3)' }}
          placeholder={cfg.hint}
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
        />

        {/* Feedback */}
        {feedback && (
          <div aria-live="polite" style={{
            marginBottom: 'var(--sp-4)',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success'
              ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.05)',
            borderLeft: `3px solid ${feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
          }}>
            {feedback.reframed && (
              <div style={{ marginBottom: 'var(--sp-3)' }}>
                <p className="t-label" style={{ marginBottom: 'var(--sp-1)', color: 'var(--accent-color)' }}>
                  ✨ How a native speaker might say it
                </p>
                <p style={{ fontSize: 'var(--type-body)', fontStyle: 'italic', margin: 0 }}>
                  "{feedback.reframed}"
                </p>
                <button
                  onClick={() => setShowWhy(w => !w)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 'var(--type-sm)', cursor: 'pointer', padding: 'var(--sp-2) 0', fontWeight: 500 }}
                >
                  {showWhy ? 'Hide explanation' : 'Why?'}
                </button>
              </div>
            )}
            {(!feedback.reframed || showWhy) && (
              <p style={{
                fontSize: 'var(--type-sm)', margin: 0,
                color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                lineHeight: 1.5,
              }}>
                {feedback.message}
              </p>
            )}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={grading || !input.trim()}
        >
          {grading
            ? <Loader2 className="animate-spin" size={18} />
            : 'Submit to AI Tutor'
          }
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

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [pending, scheduled] = await Promise.all([
        getPendingWords(currentUser.uid),
        getScheduledReviewCount ? getScheduledReviewCount(currentUser.uid) : Promise.resolve(0),
      ]);
      setPendingWords(pending);
      setScheduledCount(scheduled || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, [currentUser]);

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
      loadData();
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
    setCompleted(true);
    setWordData(null);
    setWordInput('');
    setContextInput('');
    await loadData();
    setTimeout(() => setCompleted(false), 4000);
  };

  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-5) 0' }}>

      {/* ── Streak Strip ─────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <StreakStrip currentStreak={stats.currentStreak} />
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
              <button className="btn btn-primary" style={{ minWidth: 120 }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
                {pendingWords.map(pw => (
                  <button
                    key={pw.id}
                    onClick={() => handlePracticeNow(pw)}
                    style={{
                      padding: '4px var(--sp-3)',
                      background: 'rgba(120,120,128,0.1)',
                      border: 'none', borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontSize: 'var(--type-sm)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      transition: 'transform 100ms ease-out',
                    }}
                  >
                    {pw.word}
                  </button>
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
        onSaveForLater={handleSaveForLater}
        triggerRef={lookupBtnRef}
      />

      {/* Practice Modal */}
      {practicing && practiceWord && (
        <PracticeModal
          wordData={practiceWord}
          currentUser={currentUser}
          onComplete={handlePracticeComplete}
          onClose={() => setPracticing(false)}
        />
      )}
    </div>
  );
}
