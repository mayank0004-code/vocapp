import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../ui/Button';
import { triggerHaptic } from '../../../motion/haptics';
import { evaluateSentence } from '../../../services/ai';
import { getUserMistakePatterns, savePracticeResult } from '../../../services/db';
import { useData } from '../../../data/DataProvider';

// Behaviour mirrors the classic PracticeModal (src/pages/Today.jsx) exactly:
// same pre-flight checks, AI evaluation args, practice-result logging,
// two-step coaching arc and auto-advance timing.

const IDLE_COACHING = { phase: 'idle', coachData: null, attempt: 1, showModelFallback: false, lastSubmittedSentence: '' };

const panel = (bg, border) => ({
  padding: '12px 14px',
  borderRadius: '14px',
  background: bg,
  border: `1px solid ${border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
});
const label = (color) => ({ fontSize: '11.5px', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.04em' });
const body = { margin: 0, fontSize: '14.5px', color: 'var(--fg2)', lineHeight: 1.45 };

export function Write({
  wordData,
  onComplete = () => {},
  onOpenDetails = () => {}
}) {
  const { currentUser } = useData();
  const word = wordData?.word || '';
  const [step, setStep] = useState(1);
  const [input, setInput] = useState('');
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message, reframed? }
  const [sentences, setSentences] = useState({ factualSentence: '', personalSentence: '', questionSentence: '' });
  const [mistakePatterns, setMistakePatterns] = useState('');
  const [coachingState, setCoachingState] = useState(IDLE_COACHING);
  const advanceTimerRef = useRef(null);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserMistakePatterns(currentUser.uid).then(setMistakePatterns).catch(() => {});
    }
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [currentUser?.uid]);

  // `hint` is the word's own AI rewrite prompt; `task` is the generic instruction used when none exists.
  const stepConfig = [
    { label: 'Factual sentence', key: 'factualSentence', hint: wordData?.practiceHints?.factual || '', task: `State a fact using "${word}".` },
    { label: 'Personal sentence', key: 'personalSentence', hint: wordData?.practiceHints?.personal || '', task: `Relate "${word}" to your own life.` },
    { label: 'Ask a question', key: 'questionSentence', hint: wordData?.practiceHints?.question || '', task: `Ask a question containing "${word}".` }
  ];
  const cfg = stepConfig[step - 1];

  const goToNextStep = (newSentences) => {
    setInput('');
    setFeedback(null);
    setCoachingState(IDLE_COACHING);
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      onComplete(newSentences);
    }
  };

  const handleAdvanceWithModel = () => {
    const modelSentence = coachingState.coachData?.reframedSentence || input.trim();
    const newSentences = { ...sentences, [cfg.key]: modelSentence };
    setSentences(newSentences);
    goToNextStep(newSentences);
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || grading) return;

    // Deterministic pre-flight validation
    const words = trimmedInput.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      triggerHaptic('error');
      setFeedback({ type: 'error', message: 'Please write a complete sentence (at least 4 words).' });
      return;
    }
    const target = word.toLowerCase().trim();
    const stem = target.endsWith('e') && target.length > 3 ? target.slice(0, -1) : target;
    const wordRegex = new RegExp(`\\b${stem}`, 'i');
    if (target && !wordRegex.test(trimmedInput)) {
      triggerHaptic('error');
      setFeedback({ type: 'error', message: `Remember to include the word "${word}" in your sentence.` });
      return;
    }
    if (step === 3 && !trimmedInput.includes('?')) {
      triggerHaptic('error');
      setFeedback({ type: 'error', message: 'Questions must end with a question mark (?).' });
      return;
    }

    setGrading(true);
    setFeedback(null);

    const isRevision = coachingState.phase === 'diagnosed';
    const diagnosedHabit = coachingState.coachData?.habitKey || '';
    const types = ['Factual', 'Personal', 'Question'];

    try {
      const ev = await evaluateSentence(word, types[step - 1], trimmedInput, mistakePatterns, isRevision, diagnosedHabit);

      await savePracticeResult(currentUser.uid, ev.isCorrect, ev.errorTags, {
        word,
        originalSentence: trimmedInput,
        reframedSentence: ev.reframedSentence || '',
        structuralDiagnosis: ev.structuralDiagnosis || '',
        habitAlert: ev.habitAlert || '',
        ruleOfThumb: ev.ruleOfThumb || '',
        coachHint: ev.coachHint || '',
        habitKey: ev.habitKey || diagnosedHabit || 'other',
        isRevisionSuccess: isRevision && ev.isCorrect
      });

      if (ev.isCorrect) {
        triggerHaptic('success');
        const newSentences = { ...sentences, [cfg.key]: trimmedInput };
        setSentences(newSentences);
        setFeedback({
          type: 'success',
          message: ev.feedback || (isRevision ? 'Structural issue resolved! Masterful revision.' : 'Well phrased!'),
          reframed: ev.reframedSentence
        });
        setCoachingState({ ...IDLE_COACHING, phase: 'success' });

        const delay = isRevision || ev.reframedSentence ? 1400 : 900;
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          goToNextStep(newSentences);
        }, delay);
      } else {
        triggerHaptic('error');
        setCoachingState({
          phase: 'diagnosed',
          coachData: ev,
          attempt: coachingState.attempt + 1,
          showModelFallback: false,
          lastSubmittedSentence: trimmedInput
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to evaluate. Please try again.' });
    } finally {
      setGrading(false);
    }
  };

  const coach = coachingState.coachData;
  const isSuccess = coachingState.phase === 'success';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
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
          fontWeight: 500
        }}
      >
        <span>{cfg.label} · {step} of 3</span>
        <button
          type="button"
          onClick={() => onOpenDetails(wordData)}
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

      {/* Target Word + Meaning */}
      <div>
        <h2 className="serif" style={{ margin: 0, fontSize: '34px', fontWeight: 400, lineHeight: 1.1, color: 'var(--fg)' }}>
          {word}
        </h2>
        {wordData?.definition && (
          <p style={{ margin: '6px 0 0', fontSize: '14.5px', color: 'var(--fg3)', lineHeight: 1.4 }}>
            {wordData.definition}
          </p>
        )}
        {wordData?.contextMeaning && (
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--fg3)', fontStyle: 'italic', borderLeft: '2px solid var(--acc)', paddingLeft: '8px', lineHeight: 1.4 }}>
            {wordData.contextMeaning}
          </p>
        )}
      </div>

      {/* Sentence-to-rewrite prompt */}
      {cfg.hint ? (
        <div style={panel('var(--accbg)', 'rgba(124, 136, 255, 0.25)')}>
          <span style={label('var(--acc2)')}>Rewrite this sentence using “{word}”</span>
          <p style={{ ...body, fontStyle: 'italic', color: 'var(--fg)' }}>“{cfg.hint}”</p>
        </div>
      ) : (
        <div style={panel('var(--accbg)', 'rgba(124, 136, 255, 0.25)')}>
          <span style={label('var(--acc2)')}>Your task</span>
          <p style={{ ...body, color: 'var(--fg)' }}>{cfg.task}</p>
        </div>
      )}

      {/* Diagnostic Spotlight (active coaching arc) */}
      {coachingState.phase === 'diagnosed' && coach && (
        <div style={panel('var(--orgbg)', 'rgba(255, 159, 46, 0.25)')}>
          {coach.habitAlert && (
            <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255, 159, 46, 0.15)', color: 'var(--org2)', fontSize: '12px', fontWeight: 600 }}>
              ⚡ {coach.habitAlert}
            </span>
          )}
          <span style={label('var(--org2)')}>What feels off</span>
          <p style={body}>{coach.structuralDiagnosis || coach.feedback}</p>

          {coach.ruleOfThumb && (
            <>
              <span style={{ ...label('var(--acc2)'), marginTop: '4px' }}>Quick tip</span>
              <p style={body}>{coach.ruleOfThumb}</p>
            </>
          )}
          {coach.coachHint && (
            <>
              <span style={{ ...label('var(--acc2)'), marginTop: '4px' }}>How to make it natural</span>
              <p style={body}>{coach.coachHint}</p>
            </>
          )}

          {!coachingState.showModelFallback ? (
            <button
              type="button"
              onClick={() => setCoachingState(prev => ({ ...prev, showModelFallback: true }))}
              style={{ alignSelf: 'center', marginTop: '4px', fontSize: '13px', color: 'var(--mute)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              I'm stuck — show coach's example
            </button>
          ) : (
            <div style={{ ...panel('var(--okbg)', 'rgba(91, 214, 155, 0.3)'), marginTop: '4px' }}>
              <span style={label('var(--ok)')}>✨ Coach's example</span>
              <p style={{ ...body, fontStyle: 'italic', color: 'var(--fg)' }}>“{coach.reframedSentence}”</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <Button
                  variant="off"
                  size="sm"
                  onClick={() => {
                    setInput(coach.reframedSentence || '');
                    setCoachingState(prev => ({ ...prev, showModelFallback: false }));
                  }}
                >
                  Copy &amp; adapt
                </Button>
                <Button variant="light" size="sm" onClick={handleAdvanceWithModel}>
                  Advance to next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Textarea Input */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSuccess}
          autoFocus
          placeholder={coachingState.phase === 'diagnosed'
            ? 'Apply the coach’s nudge to restructure your sentence…'
            : cfg.hint ? `Type your rewrite containing "${word}"…` : `Write your sentence containing "${word}"…`}
          rows={3}
          style={{
            width: '100%',
            borderRadius: '16px',
            border: feedback?.type === 'error'
              ? '1px solid var(--bad)'
              : isSuccess
              ? '1px solid var(--ok)'
              : coachingState.phase === 'diagnosed'
              ? '1px solid var(--acc)'
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
          {input.trim() ? input.trim().split(/\s+/).length : 0} words
        </span>
      </div>

      {/* Success banner (first try or after revision) */}
      {feedback?.type === 'success' && (
        <div style={panel('var(--okbg)', 'rgba(91, 214, 155, 0.3)')}>
          <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: '14px' }}>✓ {feedback.message}</span>
          {feedback.reframed && (
            <>
              <span style={label('var(--acc2)')}>✨ Master stylist comparison</span>
              <p style={{ ...body, fontStyle: 'italic' }}>“{feedback.reframed}”</p>
            </>
          )}
        </div>
      )}

      {/* Pre-flight / evaluation error */}
      {feedback?.type === 'error' && (
        <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--badbg)', color: 'var(--bad)', fontSize: '13.5px', lineHeight: 1.4 }}>
          {feedback.message}
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <Button
          variant="pri"
          size="default"
          onClick={handleSubmit}
          disabled={grading || isSuccess || !input.trim()}
        >
          {grading ? <span className="spin" /> : null}
          {grading
            ? 'Evaluating sentence…'
            : coachingState.phase === 'diagnosed'
            ? 'Submit revision →'
            : 'Submit to AI tutor'}
        </Button>
      </div>
    </div>
  );
}

export default Write;
