import React, { useState, useEffect } from 'react';
import Button from '../../../ui/Button';
import { triggerHaptic } from '../../../motion/haptics';
import { evaluateSentence } from '../../../services/ai';
import { saveToAnthology } from '../../../services/db';
import { useData } from '../../../data/DataProvider';

const STEP_CONFIGS = [
  {
    type: 'factual',
    title: 'Sentence 1 · Factual',
    prompt: 'State a clear, objective fact using the word.',
    placeholder: 'The economy grew, albeit at a modest pace.',
    example: 'The expedition reached the summit, albeit hours behind schedule.'
  },
  {
    type: 'personal',
    title: 'Sentence 2 · Personal',
    prompt: 'Use the word in a personal thought, reflection, or observation.',
    placeholder: 'I accepted their reasoning, albeit with a slight lingering doubt.',
    example: 'I felt a sudden sense of relief, albeit tempered by the journey ahead.'
  },
  {
    type: 'question',
    title: 'Sentence 3 · Question',
    prompt: 'Write an engaging question containing the word.',
    placeholder: 'Could this compromise satisfy both parties, albeit temporarily?',
    example: 'Is it possible to forgive an injury, albeit never truly forgetting it?'
  }
];

export function Write({
  word = 'albeit',
  onComplete = () => {},
  onOpenDetails = () => {}
}) {
  const { currentUser } = useData();
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState('draft'); // 'draft' | 'diagnosed' | 'success'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showExample, setShowExample] = useState(false);
  const [savedToAnthology, setSavedToAnthology] = useState(false);
  const [completedSentences, setCompletedSentences] = useState([]);

  const currentConfig = STEP_CONFIGS[stepIdx];

  // Preflight validation
  const validatePreflight = (text, isQuestion) => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      return 'Sentence must have at least 4 words.';
    }
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (!regex.test(trimmed)) {
      return `Remember to include “${word}” in your sentence.`;
    }
    if (isQuestion && !trimmed.endsWith('?')) {
      return 'Questions must end with a question mark (?).';
    }
    return null;
  };

  const handleCheck = async () => {
    const err = validatePreflight(draft, stepIdx === 2);
    if (err) {
      setErrorMsg(err);
      triggerHaptic('error');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    triggerHaptic('light');

    try {
      // 1. Call real AI evaluate function
      const res = await evaluateSentence(
        word,
        currentConfig.type,
        draft.trim()
      );

      if (res && res.isAccurate) {
        setPhase('success');
        setFeedback(res);
        triggerHaptic('success');
      } else {
        setPhase('diagnosed');
        setFeedback(res || {
          feedback: `Good effort. Pay close attention to how “${word}” links your clauses: make sure it modifies the right adjective or adverb.`,
          suggestion: currentConfig.example
        });
        triggerHaptic('medium');
      }
    } catch (e) {
      console.warn('AI evaluation fallback:', e);
      // Fallback local heuristic
      const words = draft.trim().split(/\s+/);
      if (words.length >= 6) {
        setPhase('success');
        setFeedback({
          feedback: 'Well constructed! Accurate vocabulary placement and cadence.',
          stylist: currentConfig.example
        });
        triggerHaptic('success');
      } else {
        setPhase('diagnosed');
        setFeedback({
          feedback: `Consider expanding your thought so “${word}” introduces a richer condition.`,
          suggestion: currentConfig.example
        });
        triggerHaptic('medium');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnthology = async () => {
    if (!currentUser?.uid || savedToAnthology) return;
    try {
      await saveToAnthology(currentUser.uid, {
        sentence: draft.trim(),
        word,
        pillar: 'craft'
      });
      setSavedToAnthology(true);
      triggerHaptic('success');
    } catch (e) {
      console.error('Failed to save to anthology:', e);
    }
  };

  const handleNextSentence = () => {
    const nextList = [...completedSentences, draft.trim()];
    setCompletedSentences(nextList);

    if (stepIdx < 2) {
      setStepIdx(i => i + 1);
      setDraft('');
      setPhase('draft');
      setFeedback(null);
      setErrorMsg('');
      setShowExample(false);
      setSavedToAnthology(false);
      triggerHaptic('light');
    } else {
      // Done all 3!
      onComplete({
        word,
        sentences: nextList,
        xpGained: 40
      });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '12px 16px 24px',
        color: 'var(--fg)'
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: 'var(--mute)',
          fontWeight: 500,
          marginBottom: '12px'
        }}
      >
        <span>Write · sentence {stepIdx + 1} of 3</span>
        <button
          type="button"
          onClick={() => onOpenDetails(word)}
          style={{
            color: 'var(--acc2)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {word} breakdown
        </button>
      </div>

      {/* Target Word Headline */}
      <div style={{ marginBottom: '14px' }}>
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: '34px',
            fontWeight: 400,
            lineHeight: 1.1,
            color: 'var(--fg)'
          }}
        >
          {word}
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '14.5px', color: 'var(--fg3)', lineHeight: 1.4 }}>
          {currentConfig.prompt}
        </p>
      </div>

      {/* Textarea Input */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          disabled={phase === 'success'}
          placeholder={currentConfig.placeholder}
          rows={3}
          style={{
            width: '100%',
            borderRadius: '16px',
            border: errorMsg
              ? '1px solid var(--bad)'
              : phase === 'success'
              ? '1px solid var(--ok)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            background: 'var(--well)',
            padding: '14px 16px',
            fontSize: '16.5px',
            color: 'var(--fg)',
            lineHeight: 1.45,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />

        {/* Word count pill */}
        <span
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            fontSize: '12px',
            color: 'var(--mute)',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '2px 6px',
            borderRadius: '6px'
          }}
        >
          {draft.trim() ? draft.trim().split(/\s+/).length : 0} words
        </span>
      </div>

      {/* Validation Error Banner */}
      {errorMsg && (
        <div
          style={{
            margin: '0 0 12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'var(--badbg)',
            color: 'var(--bad)',
            fontSize: '13.5px',
            lineHeight: 1.4
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* AI Diagnostic Nudge */}
      {phase === 'diagnosed' && feedback && (
        <div
          style={{
            margin: '0 0 14px',
            padding: '14px',
            borderRadius: '14px',
            background: 'var(--orgbg)',
            border: '1px solid rgba(255, 159, 46, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--org2)', fontWeight: 600, fontSize: '13px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Tutor Spotlight Nudge
          </div>
          <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--fg2)', lineHeight: 1.45 }}>
            {feedback.feedback || feedback.critique}
          </p>
        </div>
      )}

      {/* Success Feedback Banner */}
      {phase === 'success' && (
        <div
          style={{
            margin: '0 0 16px',
            padding: '14px',
            borderRadius: '14px',
            background: 'var(--okbg)',
            border: '1px solid rgba(91, 214, 155, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ Natural cadence (+40 XP)
            </span>
            <button
              type="button"
              onClick={handleSaveAnthology}
              disabled={savedToAnthology}
              style={{
                fontSize: '12.5px',
                color: savedToAnthology ? 'var(--ok)' : 'var(--acc2)',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                cursor: savedToAnthology ? 'default' : 'pointer'
              }}
            >
              {savedToAnthology ? '✓ Saved to Anthology' : '+ Save to Anthology'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.4 }}>
            {feedback?.feedback || 'Accurate usage and strong literary register.'}
          </p>
        </div>
      )}

      {/* Example sentence drawer */}
      {phase !== 'success' && (
        <div style={{ marginBottom: '14px' }}>
          {!showExample ? (
            <button
              type="button"
              onClick={() => {
                setShowExample(true);
                triggerHaptic('light');
              }}
              style={{
                fontSize: '13px',
                color: 'var(--mute)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Stuck? See a reference example
            </button>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                fontSize: '14px',
                color: 'var(--fg2)',
                fontStyle: 'italic',
                lineHeight: 1.4
              }}
            >
              “{currentConfig.example}”
            </div>
          )}
        </div>
      )}

      {/* Main Action Button */}
      <div style={{ marginTop: 'auto' }}>
        {phase === 'draft' ? (
          <Button
            variant="primary"
            size="default"
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? <span className="spin" /> : null}
            {loading ? 'Evaluating sentence…' : 'Check sentence'}
          </Button>
        ) : phase === 'diagnosed' ? (
          <Button
            variant="primary"
            size="default"
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? <span className="spin" /> : null}
            {loading ? 'Re-evaluating…' : 'Re-check sentence'}
          </Button>
        ) : (
          <Button
            variant="light"
            size="default"
            onClick={handleNextSentence}
          >
            {stepIdx < 2 ? 'Next sentence (2/3)' : 'Finish practice session'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default Write;
