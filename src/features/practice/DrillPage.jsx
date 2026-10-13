import React, { useState, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useData, useStats, useVault, useWords } from '../../data/DataProvider';
import {
  recordCraftProgress,
  deductCraftXP,
  saveToAnthology,
  calcCraftLevel,
  getUserMistakePatterns,
  getUserEnglishLevel,
  recordStudioSlip,
  recordStudioHabitSuccess,
  recordTodayProgress,
} from '../../services/db';
import { generateCraftExercise, evaluateCraftSubmission } from '../../services/ai';
import Button from '../../ui/Button';
import { triggerHaptic } from '../../motion/haptics';
import { showToast } from '../../ui/Toast';
import { springs } from '../../motion/springs';
import {
  PILLAR_KEYS,
  PILLARS,
  SEED_BANK,
  shuffleArray,
  normalizePillar,
  pillarOfMistake,
  getTierUnlockStatus,
  playSentenceCadence,
} from './craft';

const TIER_TABS = ['T1: Spot', 'T2: Polish', 'T3: Rehab', 'T4: Craft'];
const TIER_EYEBROWS = ['Tier 1 · Ear training', 'Tier 2 · Polish & tap-to-swap', 'Tier 3 · Mistake Vault rehab', 'Tier 4 · Original craft'];

const norm = s => (s || '').toLowerCase().trim();

/* ── Visual Breath Meter / Cadence Wave (Studio.jsx BreathMeter) ── */
function BreathMeter({ sentence }) {
  if (!sentence) return null;
  const segments = sentence.split(/([,;.—\n])/g).filter(s => s.trim().length > 0);
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0', overflowX: 'auto' }}
      aria-label="Visual sentence cadence"
    >
      <span style={{ fontSize: '11px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>
        Cadence
      </span>
      {segments.map((seg, i) => {
        const isPause = [',', ';', '.', '—', '-'].includes(seg.trim());
        if (isPause) {
          return (
            <span
              key={i}
              title="Natural pause"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'var(--accbg)',
                color: 'var(--acc2)',
                fontSize: '10px',
                fontWeight: 700,
                flex: 'none'
              }}
            >
              ~
            </span>
          );
        }
        const width = Math.min(60, Math.max(16, seg.length * 2.2));
        return (
          <span
            key={i}
            style={{ height: '4px', width: `${width}px`, background: 'var(--card3)', borderRadius: '2px', display: 'inline-block', flex: 'none' }}
          />
        );
      })}
    </div>
  );
}

/** Render a sentence with `__` blanks replaced by the given element. */
function withBlank(text, el) {
  const parts = (text || '').split(/_{2,}/);
  if (parts.length <= 1) return <>{text} {el}</>;
  return parts.map((part, idx, arr) => (
    <React.Fragment key={idx}>
      {part}
      {idx < arr.length - 1 && el}
    </React.Fragment>
  ));
}

const textareaStyle = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: '16px',
  background: 'var(--well)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  padding: '14px 16px',
  fontSize: '16px',
  color: 'var(--fg)',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.5
};

const eyebrowStyle = { fontSize: '12.5px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const promptStyle = { margin: '4px 0 0', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 };

export function DrillPage({
  skillId = 0,
  pillar: pillarProp = null,
  initialTier = 1,
  mistake = null,
  onBack = () => {}
}) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { currentUser, loaded } = useData();
  const { craft } = useStats();
  const { allMistakes: vault = [] } = useVault();
  const { allWords = [] } = useWords();
  const uid = currentUser?.uid;

  // Pillar key = lowercase skill name. An explicit pillar or the mistake's own pillar wins over skillId.
  const pillar = normalizePillar(pillarProp) || pillarOfMistake(mistake) || PILLAR_KEYS[skillId] || 'grammar';
  const pillarMeta = PILLARS[pillar];

  // Local craft stats with optimistic updates (mirrors Studio's craftStats state)
  const [craftStats, setCraftStats] = useState(craft || {});
  useEffect(() => { setCraftStats(craft || {}); }, [craft]);

  const [userEnglishLevel, setUserEnglishLevel] = useState(1);
  const levelRef = useRef(null);
  const [xpDelta, setXpDelta] = useState(null); // { amount, key }

  const [selectedTier, setSelectedTier] = useState([1, 2, 3, 4].includes(Number(initialTier)) ? Number(initialTier) : 1);
  const recentWordsRef = useRef([]);
  const targetMistakeRef = useRef(mistake || null);
  const hasRecordedSlipForSessionRef = useRef(false);
  const loadSeqRef = useRef(0);

  // Exercise deck state
  const [currentExercise, setCurrentExercise] = useState(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [swappedToken, setSwappedToken] = useState(null);
  const [userSubmission, setUserSubmission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [attemptCount, setAttemptCount] = useState(1);
  const [savedToAnthology, setSavedToAnthology] = useState(false);
  const [nuanceSelection, setNuanceSelection] = useState(null);
  const [nuanceActiveChip, setNuanceActiveChip] = useState(null);

  // Auto-clear XP delta indicator
  useEffect(() => {
    if (!xpDelta) return;
    const t = setTimeout(() => setXpDelta(null), 2500);
    return () => clearTimeout(t);
  }, [xpDelta]);

  // English level (re-read when Settings change, like Studio)
  useEffect(() => {
    if (!uid) return;
    const load = () => getUserEnglishLevel(uid).then(cfg => {
      if (cfg?.level) {
        levelRef.current = cfg.level;
        setUserEnglishLevel(cfg.level);
      }
    }).catch(err => console.warn('Could not load English level in Drill:', err));
    load();
    window.addEventListener('vocapp:settings-updated', load);
    return () => window.removeEventListener('vocapp:settings-updated', load);
  }, [uid]);

  // Stable shuffled chips for Nuance Duel
  const duelChips = useMemo(() => {
    if (currentExercise?.type !== 'nuance-duel') return [];
    return shuffleArray([currentExercise.word, currentExercise.synonymWord].filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.word, currentExercise?.synonymWord, currentExercise?.sentence1, currentExercise?.type]);

  const tierUnlockStatus = useMemo(
    () => getTierUnlockStatus(craftStats?.[pillar], vault),
    [craftStats, pillar, vault]
  );

  const pillarLevel = calcCraftLevel(craftStats?.[pillar]?.xp || 0, craftStats?.[pillar]?.tierCompletions);

  const fallbackExercise = (tier, word, level) => {
    if (tier === 1) {
      return {
        type: 'spot-and-fix', pillar, tier: 1, level, word,
        clunkySentence: `The team was ${word} yesterday, but today they gives up too easily.`,
        options: [
          `The team was ${word} yesterday, but today they gives up too easily.`,
          `The team was ${word} yesterday, but today they give up too easily.`,
          `The team is ${word} yesterday, and they giving up too easily.`,
        ],
        correctIndex: 1,
        explanation: `When speaking about a group ("they"), use "give up" instead of "gives up".`,
      };
    }
    if (tier === 2) {
      return {
        type: 'tap-to-swap', pillar, tier: 2, level, word,
        beforeText: `The team remained ${word}, `,
        afterText: ' they overcame every obstacle with calm determination.',
        currentWeakToken: 'and so',
        swappableTokens: ['and so', 'yet', 'wherefore'],
        correctToken: 'yet',
        polishedSentence: `The team remained ${word}, yet they overcame every obstacle with calm determination.`,
        explanation: `Using 'yet' creates a crisp contrast and gives the sentence natural balance.`,
      };
    }
    if (tier === 3) {
      return {
        type: 'vault-rehab', pillar, tier: 3, level, word,
        challenge: `The presentation was ${word} but nobody understood nothing.`,
        hint: `Use "${word}" to highlight the core strength with clean, positive phrasing.`,
        samplePolished: `The presentation was ${word}, leaving the audience with clear, actionable insights.`,
      };
    }
    return {
      type: 'creative-synthesis', pillar, tier, level, word,
      prompt: `Describe a challenging moment where being ${word} changed the final outcome.`,
      guideline: `Write a clear, rhythmic sentence highlighting natural cadence.`,
      samplePolished: `Her ${word} composure steadied the entire room during the critical negotiations.`,
    };
  };

  /** Offline exercise for a real vault slip (tier 3) so the user always rewrites their own sentence. */
  const vaultRehabFromMistake = (vm, level) => {
    if (!vm?.originalSentence) return null;
    return {
      type: 'vault-rehab',
      pillar,
      tier: 3,
      level,
      word: vm.word || '',
      challenge: vm.originalSentence,
      hint: vm.ruleOfThumb || vm.structuralDiagnosis || '',
      samplePolished: vm.reframedSentence || '',
      vaultMistakeId: vm.id || null,
    };
  };

  // Port of Studio.jsx loadNextExercise
  const loadNextExercise = async (tier) => {
    const seq = ++loadSeqRef.current;
    setDeckLoading(true);
    setSelectedOption(null);
    setSwappedToken(null);
    setUserSubmission('');
    setFeedback(null);
    setAttemptCount(1);
    setSavedToAnthology(false);
    setNuanceSelection(null);
    setNuanceActiveChip(null);

    const wordsPool = allWords;
    const vaultPool = vault;
    hasRecordedSlipForSessionRef.current = false;

    // 1. Targeted vault mistake (from the Vault "Fix it" button)
    let targetedMistake = null;
    if (tier === 3 && targetMistakeRef.current) {
      targetedMistake = targetMistakeRef.current;
      targetMistakeRef.current = null;
    }

    // 2. Word picker: vault words first (70%), then non-mastered, anti-repetition over last 8
    let chosenWordObj = null;
    if (targetedMistake?.word) {
      chosenWordObj = { word: targetedMistake.word, definition: '' };
    } else if (wordsPool && wordsPool.length > 0) {
      let candidateWords = wordsPool.filter(w => !recentWordsRef.current.includes(w.word));
      if (candidateWords.length === 0) {
        recentWordsRef.current = [];
        candidateWords = wordsPool;
      }
      const vaultCandidateWords = candidateWords.filter(w =>
        vaultPool.some(v => v.word?.toLowerCase() === w.word?.toLowerCase())
      );
      const dueCandidateWords = candidateWords.filter(w => w.status !== 'mastered');

      if (vaultCandidateWords.length > 0 && Math.random() < 0.7) {
        chosenWordObj = vaultCandidateWords[Math.floor(Math.random() * vaultCandidateWords.length)];
      } else if (dueCandidateWords.length > 0) {
        chosenWordObj = dueCandidateWords[Math.floor(Math.random() * dueCandidateWords.length)];
      } else {
        chosenWordObj = candidateWords[Math.floor(Math.random() * candidateWords.length)];
      }

      recentWordsRef.current.push(chosenWordObj.word);
      if (recentWordsRef.current.length > 8) recentWordsRef.current.shift();
    } else {
      chosenWordObj = { word: 'resilient', definition: 'able to recover quickly' };
    }

    // 3. Vault mistake for this pillar
    const vaultMistake = targetedMistake || vaultPool.find(mk =>
      mk.errorTags?.some(t => t.toLowerCase().includes(pillar)) && !mk.isRedeemed
    ) || vaultPool.find(mk => !mk.isRedeemed) || vaultPool[0] || null;

    const seeds = SEED_BANK[pillar]?.[tier];
    const localSeed = seeds ? seeds[Math.floor(Math.random() * seeds.length)] : null;

    let level = levelRef.current;
    if (level == null && uid) {
      try {
        level = (await getUserEnglishLevel(uid))?.level || 1;
        levelRef.current = level;
      } catch {
        level = 1;
      }
    }
    level = level || 1;

    let next = null;
    try {
      const mistakePatterns = await getUserMistakePatterns(uid);
      const dictPool = (wordsPool || [])
        .map(w => (typeof w === 'string' ? w : w?.word || ''))
        .filter(w => Boolean(w) && w.toLowerCase() !== chosenWordObj.word.toLowerCase());
      const dictionaryWords = shuffleArray(dictPool).slice(0, 25);

      const aiExercise = await generateCraftExercise(
        pillar,
        tier,
        chosenWordObj.word,
        chosenWordObj.definition || '',
        vaultMistake,
        mistakePatterns,
        dictionaryWords,
        level
      );
      if (aiExercise) {
        next = { ...aiExercise, vaultMistakeId: vaultMistake?.id || null };
      }
    } catch {
      // Offline: fall through to the seed bank
    }

    if (seq !== loadSeqRef.current) return; // a newer load superseded this one

    if (!next) {
      const ownSlip = tier === 3 ? vaultRehabFromMistake(vaultMistake, level) : null;
      if (ownSlip) {
        next = ownSlip;
      } else if (localSeed) {
        // Seed sentences aren't the user's own slip: never label them "past slip"
        // or redeem an unrelated vault mistake when they're solved.
        next = { ...localSeed, vaultMistakeId: null };
      } else {
        next = fallbackExercise(tier, chosenWordObj.word, level);
      }
    }

    setCurrentExercise(next);
    setDeckLoading(false);
  };

  // Load whenever the tier changes, once the user's data is in
  useEffect(() => {
    if (!loaded) return;
    loadNextExercise(selectedTier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier, loaded]);

  // Optimistic local craft update (Studio's synchronous setCraftStats blocks)
  const applyOptimistic = (delta, completedTier = null) => {
    setCraftStats(prev => {
      const p = prev?.[pillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
      const nextXp = Math.max(0, (p.xp || 0) + delta);
      const nextTiers = completedTier
        ? { ...p.tierCompletions, [completedTier]: (p.tierCompletions?.[completedTier] || 0) + 1 }
        : p.tierCompletions;
      const calculated = calcCraftLevel(nextXp, nextTiers);
      return {
        ...prev,
        [pillar]: {
          ...p,
          xp: nextXp,
          solved: completedTier ? (p.solved || 0) + 1 : p.solved,
          level: calculated.level,
          rank: calculated.rank,
          tierCompletions: nextTiers,
          nextRequirement: calculated.nextRequirement,
          isCapped: calculated.isCapped,
        }
      };
    });
  };

  const award = (xp, tier, extra = {}) => {
    triggerHaptic('success');
    setXpDelta({ amount: xp, key: Date.now() });
    applyOptimistic(xp, tier);
    if (!uid) return;
    recordCraftProgress(uid, {
      pillar,
      tier,
      xpGained: xp,
      wordUsed: currentExercise.word,
      ...extra,
    }).catch(err => console.error('Error persisting craft progress:', err));
    // v2-only: feeds the Today card's daily ring (stats.today)
    recordTodayProgress(uid, 'drill');
  };

  const penalize = () => {
    triggerHaptic('error');
    setXpDelta({ amount: -5, key: Date.now() });
    applyOptimistic(-5);
    if (!uid) return;
    deductCraftXP(uid, { pillar, xpLost: 5 }).catch(err => console.error('Error deducting craft XP:', err));
  };

  const slip = (payload, label) => {
    if (!uid) return;
    recordStudioSlip(uid, payload).catch(err => console.error(`Error recording ${label} Studio slip:`, err));
  };

  // Tier 1 (one-shot)
  const handleSelectOption = (index) => {
    if (selectedOption !== null || feedback) return;
    triggerHaptic('light');
    setSelectedOption(index);
    const isCorrect = index === currentExercise.correctIndex;
    if (isCorrect) {
      setFeedback({
        isMastered: true,
        feedback: currentExercise.explanation,
        xpAwarded: 15,
        polishedVersion: currentExercise.options[index],
      });
      award(15, 1);
    } else {
      penalize();
      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.explanation || 'Notice how the actions sound together out loud. Keeping them aligned gives the sentence effortless harmony.',
        polishedVersion: currentExercise.options[currentExercise.correctIndex],
        xpDeducted: 5,
      });
      slip({
        pillar,
        tier: 1,
        word: currentExercise.word,
        originalSentence: currentExercise.options[index],
        reframedSentence: currentExercise.options[currentExercise.correctIndex],
        structuralDiagnosis: currentExercise.explanation || 'Awkward syntax selected in spot-and-fix drill.',
        ruleOfThumb: currentExercise.explanation || '',
      }, 'Tier 1');
    }
  };

  // Tier 2 (one-shot)
  const handleSwapToken = (token) => {
    if (swappedToken !== null || feedback) return;
    triggerHaptic('light');
    setSwappedToken(token);
    const isCorrect = token.toLowerCase() === (currentExercise.correctToken || '').toLowerCase();
    if (isCorrect) {
      setFeedback({
        isMastered: true,
        feedback: currentExercise.explanation,
        xpAwarded: 20,
        polishedVersion: currentExercise.polishedSentence,
      });
      award(20, 2);
    } else {
      penalize();
      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.explanation || 'Listen closely to the breath: the natural connector provides smooth transition between the two clauses.',
        polishedVersion: currentExercise.polishedSentence,
        xpDeducted: 5,
      });
      slip({
        pillar,
        tier: 2,
        word: currentExercise.word,
        originalSentence: `${currentExercise.beforeText || ''}${token}${currentExercise.afterText || ''}`,
        reframedSentence: currentExercise.polishedSentence || '',
        structuralDiagnosis: currentExercise.explanation || 'Weak connector chosen during polish drill.',
        ruleOfThumb: currentExercise.explanation || '',
      }, 'Tier 2');
    }
  };

  // Nuance Duel A: "Which word fits?"
  const handleNuanceDuelSelect = (chosenWord) => {
    if (nuanceSelection !== null || feedback) return;
    triggerHaptic('light');
    setNuanceSelection(chosenWord);

    const target = currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word;
    const isCorrect = norm(chosenWord) === norm(target);
    const resolvedSentence = currentExercise.sentence1
      ? currentExercise.sentence1.replace(/_{2,}/g, target)
      : undefined;

    if (isCorrect) {
      setFeedback({
        isMastered: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        xpAwarded: 15,
        polishedVersion: resolvedSentence,
      });
      award(15, selectedTier);
    } else {
      penalize();
      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        polishedVersion: resolvedSentence,
        xpDeducted: 5,
      });
      slip({
        pillar: 'context',
        tier: selectedTier,
        word: currentExercise.word,
        originalSentence: currentExercise.sentence1 ? currentExercise.sentence1.replace(/_{2,}/g, chosenWord) : '',
        reframedSentence: resolvedSentence || '',
        structuralDiagnosis: `Near-synonym confusion between "${currentExercise.word}" and "${currentExercise.synonymWord}". ${currentExercise.nuanceExplanation || ''}`,
        ruleOfThumb: currentExercise.hint || currentExercise.nuanceExplanation || '',
      }, 'Nuance Duel');
    }
  };

  // Nuance Duel B: "Spot the difference"
  const handleNuanceDuelMatch = () => {
    if (feedback || !nuanceSelection?.sentence1 || !nuanceSelection?.sentence2) return;
    triggerHaptic('light');

    const s1Target = norm(currentExercise.correctMapping?.sentence1 || currentExercise.word);
    const s2Target = norm(currentExercise.correctMapping?.sentence2 || currentExercise.synonymWord);
    const isCorrect = norm(nuanceSelection.sentence1) === s1Target && norm(nuanceSelection.sentence2) === s2Target;
    const resolvedSentence = currentExercise.sentence1
      ? `${currentExercise.sentence1.replace(/_{2,}/g, s1Target)} | ${(currentExercise.sentence2 || '').replace(/_{2,}/g, s2Target)}`
      : undefined;

    if (isCorrect) {
      setFeedback({
        isMastered: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        xpAwarded: 20,
        polishedVersion: resolvedSentence,
      });
      award(20, selectedTier);
    } else {
      penalize();
      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        polishedVersion: resolvedSentence,
        xpDeducted: 5,
      });
      slip({
        pillar: 'context',
        tier: selectedTier,
        word: currentExercise.word,
        originalSentence: `${nuanceSelection.sentence1} vs ${nuanceSelection.sentence2}`,
        reframedSentence: resolvedSentence || '',
        structuralDiagnosis: `Mismatched synonym contexts: "${currentExercise.word}" and "${currentExercise.synonymWord}".`,
        ruleOfThumb: currentExercise.hint || currentExercise.nuanceExplanation || '',
      }, 'Nuance Duel');
    }
  };

  // Tier 3 & 4 free writing
  const handleSubmitWriting = async (e) => {
    e?.preventDefault();
    if (!userSubmission.trim() || isSubmitting || feedback?.isMastered) return;

    const words = userSubmission.trim().split(/\s+/);
    if (words.length < 4) {
      triggerHaptic('error');
      setFeedback({ isMastered: false, nudge: 'Please compose a complete, expressive thought (at least 4 words).' });
      return;
    }

    if (currentExercise?.word) {
      const cleanWord = currentExercise.word.toLowerCase().replace(/[^a-z]/g, '');
      const cleanSub = userSubmission.toLowerCase().replace(/[^a-z\s]/g, '');
      const rootStem = cleanWord.length > 4 ? cleanWord.slice(0, cleanWord.length - 2) : cleanWord;
      const hasTarget = cleanSub.includes(cleanWord) || cleanSub.includes(rootStem);
      if (!hasTarget) {
        triggerHaptic('error');
        setFeedback({ isMastered: false, nudge: `Remember to weave the target word "${currentExercise.word}" into your sentence.` });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await evaluateCraftSubmission(
        pillar,
        selectedTier,
        currentExercise.word,
        currentExercise.challenge || currentExercise.prompt,
        userSubmission,
        attemptCount,
        userEnglishLevel
      );

      if (res.isMastered) {
        const xpEarned = res.xpAwarded || (selectedTier === 3 ? 25 : 35);
        setFeedback({ ...res, xpAwarded: xpEarned });
        award(xpEarned, selectedTier, {
          redeemedMistakeId: selectedTier === 3 ? (currentExercise.vaultMistakeId || currentExercise.id || null) : null,
        });
        if (uid) {
          recordStudioHabitSuccess(uid, { pillar, habitKey: res.habitKey || null }).catch(err => console.error(err));
        }
      } else {
        setFeedback(res);
        setAttemptCount(a => a + 1);
        penalize();
        // Tier 4: record the writing slip once per exercise
        if (selectedTier === 4 && !hasRecordedSlipForSessionRef.current) {
          hasRecordedSlipForSessionRef.current = true;
          slip({
            pillar,
            tier: 4,
            word: currentExercise.word,
            originalSentence: userSubmission,
            reframedSentence: res.polishedVersion || '',
            structuralDiagnosis: res.structuralDiagnosis || res.feedback || 'Awkward phrasing in creative synthesis drill.',
            ruleOfThumb: res.ruleOfThumb || res.cadenceNotes || '',
            habitKey: res.habitKey || null,
            errorTags: res.errorTags || [pillar],
          }, 'Tier 4');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Could not reach the writing coach. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToAnthology = async () => {
    const textToSave = feedback?.polishedVersion || userSubmission;
    if (!textToSave || !uid || savedToAnthology) return;
    try {
      await saveToAnthology(uid, {
        sentence: textToSave,
        word: currentExercise?.word || '',
        pillar,
      });
      setSavedToAnthology(true);
      triggerHaptic('success');
      showToast('Saved to your Anthology');
    } catch (err) {
      console.error(err);
      showToast('Could not save. Try again.');
    }
  };

  const handleSelectTier = (tierNum) => {
    const status = tierUnlockStatus[tierNum];
    if (!status?.unlocked) {
      triggerHaptic('error');
      showToast(status.reason);
      return;
    }
    triggerHaptic('light');
    setSelectedTier(tierNum);
  };

  const handleListen = () => {
    let text = '';
    if (currentExercise?.type === 'nuance-duel') {
      const s1Word = currentExercise.correctMapping?.sentence1 || currentExercise.correctWord || currentExercise.word;
      const s2Word = currentExercise.correctMapping?.sentence2 || currentExercise.synonymWord;
      const s1Resolved = (currentExercise.sentence1 || '').replace(/_{2,}/g, s1Word);
      if (currentExercise.subType === 'spot-the-difference' && currentExercise.sentence2) {
        text = `${s1Resolved}. ... ${currentExercise.sentence2.replace(/_{2,}/g, s2Word)}.`;
      } else {
        text = s1Resolved;
      }
    } else {
      text = currentExercise?.polishedSentence || currentExercise?.clunkySentence || currentExercise?.challenge || currentExercise?.samplePolished || '';
    }
    triggerHaptic('light');
    playSentenceCadence(text);
  };

  const isDuel = currentExercise?.type === 'nuance-duel';
  const badgeText = isDuel
    ? `Nuance Duel · ${currentExercise.word} vs ${currentExercise.synonymWord}`
    : selectedTier === 1 ? 'Drill · Spot & Fix'
    : selectedTier === 2 ? 'Drill · Polish & Cadence'
    : selectedTier === 3 ? (currentExercise?.word ? `Rehabilitate · “${currentExercise.word}”` : 'Rehabilitate')
    : (currentExercise?.word ? `Craft With · “${currentExercise.word}”` : 'Craft');

  const choiceStyle = (state, answered) => {
    // state: 'ok' | 'bad' | 'idle'
    let border = '1px solid var(--line)';
    let bg = 'var(--card)';
    if (state === 'ok') { border = '1.5px solid var(--ok)'; bg = 'var(--okbg)'; }
    if (state === 'bad') { border = '1.5px solid var(--bad)'; bg = 'var(--badbg)'; }
    return {
      border,
      background: bg,
      color: 'var(--fg)',
      cursor: answered ? 'default' : 'pointer',
      opacity: answered && state === 'idle' ? 0.5 : 1,
      transition: 'all 0.15s ease',
      fontFamily: 'inherit'
    };
  };

  const slotButton = (key) => {
    const placed = nuanceSelection?.[key];
    const other = key === 'sentence1' ? 'sentence2' : 'sentence1';
    return (
      <button
        type="button"
        disabled={feedback !== null}
        onClick={() => {
          if (nuanceActiveChip) {
            setNuanceSelection(prev => ({
              [key]: nuanceActiveChip,
              [other]: prev?.[other] === nuanceActiveChip ? null : prev?.[other],
            }));
            setNuanceActiveChip(null);
            triggerHaptic('light');
          } else if (placed) {
            setNuanceSelection(prev => ({ ...prev, [key]: null }));
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          margin: '0 4px',
          borderRadius: '999px',
          border: placed ? '1.5px solid var(--acc2)' : '1.5px dashed var(--line)',
          background: placed ? 'var(--accbg)' : 'transparent',
          color: placed ? 'var(--acc2)' : 'var(--mute)',
          fontWeight: 600,
          fontSize: '13px',
          fontFamily: 'inherit',
          cursor: 'pointer'
        }}
      >
        {placed ? `${placed} ✕` : (nuanceActiveChip ? `Place “${nuanceActiveChip}”` : 'Tap to place')}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '80px'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(11, 11, 13, 0.85)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          borderBottom: '0.5px solid var(--line)',
          height: 'var(--topH, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--acc2)',
            fontSize: '15px',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Practice
        </button>

        <span style={{ fontSize: '16px', fontWeight: 600 }}>{pillarMeta.label} drills</span>
        <div style={{ width: '60px' }} />
      </header>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Tier Selector Segments (v1 unlock rules) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            padding: '4px',
            borderRadius: '14px',
            background: 'var(--card2)',
            marginBottom: '10px'
          }}
        >
          {TIER_TABS.map((label, idx) => {
            const tierNum = idx + 1;
            const isSelected = selectedTier === tierNum;
            const isLocked = !tierUnlockStatus[tierNum]?.unlocked;
            return (
              <button
                key={tierNum}
                type="button"
                onClick={() => handleSelectTier(tierNum)}
                title={isLocked ? tierUnlockStatus[tierNum].reason : label}
                aria-disabled={isLocked}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: isSelected ? 'var(--card)' : 'transparent',
                  color: isSelected ? 'var(--fg)' : 'var(--mute)',
                  border: isSelected ? '1px solid var(--line)' : 'none',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.55 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                {label}
                {isLocked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Pillar rank & next requirement (real craft stats) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '12.5px',
            padding: '0 4px',
            marginBottom: '18px',
            color: pillarLevel.isCapped ? 'var(--org2)' : 'var(--mute)'
          }}
        >
          <span style={{ fontWeight: 600, color: pillarLevel.isCapped ? 'var(--org2)' : 'var(--fg2)', flex: 'none' }}>
            {pillarLevel.rank} · Lvl {pillarLevel.level}
          </span>
          <span style={{ textAlign: 'right' }}>{pillarLevel.nextRequirement}</span>
        </div>

        {/* Eyebrow + XP delta + Listen */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
            <span style={selectedTier === 3 ? { ...eyebrowStyle, color: 'var(--org2)' } : eyebrowStyle}>
              {TIER_EYEBROWS[selectedTier - 1]}
            </span>
            <AnimatePresence>
              {xpDelta && (
                <m.span
                  key={xpDelta.key}
                  initial={{ opacity: 0, y: -4, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.8 }}
                  transition={springs.pop}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: xpDelta.amount > 0 ? 'var(--okbg)' : 'var(--badbg)',
                    color: xpDelta.amount > 0 ? 'var(--ok)' : 'var(--bad)'
                  }}
                >
                  {xpDelta.amount > 0 ? `+${xpDelta.amount} XP` : `${xpDelta.amount} XP`}
                </m.span>
              )}
            </AnimatePresence>
          </div>

          {currentExercise && !deckLoading && (
            <button
              type="button"
              onClick={handleListen}
              aria-label="Listen to sentence cadence"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                borderRadius: '999px',
                padding: '4px 10px',
                color: 'var(--fg3)',
                fontSize: '12.5px',
                cursor: 'pointer',
                flex: 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Listen
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={deckLoading ? 'loading' : `${pillar}-${selectedTier}-${currentExercise?.word || 'card'}-${loadSeqRef.current}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springs.reveal}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {deckLoading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '48px 0',
                  color: 'var(--mute)',
                  fontSize: '14px'
                }}
              >
                <span className="spin" style={{ width: '24px', height: '24px', borderColor: 'var(--line)', borderTopColor: 'var(--acc2)' }} />
                Preparing your drill…
              </div>
            ) : !currentExercise ? (
              /* Recovery UI */
              <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                <p style={{ margin: 0, color: 'var(--fg3)', fontSize: '15px' }}>
                  Exercise took longer than expected to prepare.
                </p>
                <Button variant="primary" size="sm" onClick={() => loadNextExercise(selectedTier)}>
                  Try Next Exercise
                </Button>
              </div>
            ) : (
              <>
                <span
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--card2)',
                    color: 'var(--acc2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {badgeText}
                </span>

                {/* ===== TIER 1: SPOT & FIX ===== */}
                {selectedTier === 1 && !isDuel && (
                  <>
                    <h2 style={promptStyle}>Which version flows most naturally?</h2>
                    <BreathMeter sentence={currentExercise.clunkySentence} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentExercise.options?.map((opt, idx) => {
                        const answered = selectedOption !== null;
                        const isChosen = selectedOption === idx;
                        const isCorrect = idx === currentExercise.correctIndex;
                        const state = answered && isCorrect ? 'ok' : answered && isChosen ? 'bad' : 'idle';
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectOption(idx)}
                            disabled={answered}
                            style={{
                              textAlign: 'left',
                              padding: '16px 18px',
                              borderRadius: '16px',
                              fontSize: '15.5px',
                              lineHeight: 1.45,
                              ...choiceStyle(state, answered)
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--acc2)', fontSize: '14px' }}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <div style={{ flex: 1 }}>{opt}</div>
                              {answered && isCorrect && (
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ok)', flex: 'none', marginTop: '2px' }}>✓ Natural</span>
                              )}
                              {answered && isChosen && !isCorrect && (
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bad)', flex: 'none', marginTop: '2px' }}>✗ Clunky</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ===== TIER 2: POLISH (tap-to-swap) ===== */}
                {selectedTier === 2 && !isDuel && (
                  <>
                    <h2 style={promptStyle}>Tap a token to polish the cadence</h2>
                    <div
                      style={{
                        background: 'var(--card)',
                        borderRadius: '20px',
                        border: '1px solid var(--line)',
                        padding: '24px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      <div className="serif" style={{ fontSize: '20px', lineHeight: 1.6, color: 'var(--fg2)' }}>
                        {currentExercise.beforeText}
                        {(() => {
                          const ok = swappedToken && swappedToken.toLowerCase() === (currentExercise.correctToken || '').toLowerCase();
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 10px',
                                borderRadius: '8px',
                                background: swappedToken ? (ok ? 'var(--okbg)' : 'var(--badbg)') : 'var(--accbg)',
                                border: swappedToken ? `1.5px solid ${ok ? 'var(--ok)' : 'var(--bad)'}` : '1.5px dashed var(--acc2)',
                                color: swappedToken ? (ok ? 'var(--ok)' : 'var(--bad)') : 'var(--acc2)',
                                fontWeight: 600,
                                margin: '0 4px'
                              }}
                            >
                              {swappedToken || currentExercise.currentWeakToken || '______'}
                            </span>
                          );
                        })()}
                        {currentExercise.afterText}
                      </div>
                      <BreathMeter
                        sentence={swappedToken
                          ? `${currentExercise.beforeText || ''}${swappedToken}${currentExercise.afterText || ''}`
                          : currentExercise.polishedSentence}
                      />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {currentExercise.swappableTokens?.map((tok, i) => {
                        const answered = swappedToken !== null;
                        const isChosen = swappedToken === tok;
                        const isCorrect = tok.toLowerCase() === (currentExercise.correctToken || '').toLowerCase();
                        const state = answered && isCorrect ? 'ok' : answered && isChosen ? 'bad' : 'idle';
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={answered}
                            onClick={() => handleSwapToken(tok)}
                            style={{
                              padding: '9px 16px',
                              borderRadius: '999px',
                              fontSize: '15px',
                              fontWeight: 500,
                              ...choiceStyle(state, answered),
                              background: state === 'idle' ? 'var(--card2)' : choiceStyle(state, answered).background
                            }}
                          >
                            {tok} {state === 'ok' && '✓'} {state === 'bad' && '✗'}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ===== NUANCE DUEL (context pillar) ===== */}
                {isDuel && currentExercise.subType === 'which-word-fits' && (
                  <>
                    <h2 style={promptStyle}>Which word fits the tone and register most naturally?</h2>
                    <div
                      className="serif"
                      style={{
                        padding: '18px 20px',
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '18px',
                        fontSize: '18px',
                        lineHeight: 1.6,
                        color: 'var(--fg2)'
                      }}
                    >
                      {(() => {
                        const target = currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word;
                        const isMatch = norm(nuanceSelection) === norm(target);
                        return withBlank(
                          currentExercise.sentence1,
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: '80px',
                              textAlign: 'center',
                              padding: '1px 10px',
                              margin: '0 4px',
                              borderRadius: '8px',
                              borderBottom: '2px solid var(--acc2)',
                              fontWeight: 700,
                              color: nuanceSelection ? (isMatch ? 'var(--ok)' : 'var(--bad)') : 'var(--acc2)',
                              background: nuanceSelection ? (isMatch ? 'var(--okbg)' : 'var(--badbg)') : 'var(--accbg)'
                            }}
                          >
                            {nuanceSelection || '________'}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {duelChips.map((w, idx) => {
                        const answered = nuanceSelection !== null;
                        const isChosen = nuanceSelection === w;
                        const isTarget = norm(w) === norm(currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word);
                        const state = answered && isTarget ? 'ok' : answered && isChosen ? 'bad' : 'idle';
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={answered}
                            onClick={() => handleNuanceDuelSelect(w)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '16px',
                              fontSize: '16px',
                              fontWeight: 600,
                              textAlign: 'center',
                              ...choiceStyle(state, answered)
                            }}
                          >
                            {w} {state === 'ok' && '✓'} {state === 'bad' && '✗'}
                          </button>
                        );
                      })}
                    </div>
                    {currentExercise.hint && (
                      <div style={{ fontSize: '13px', color: 'var(--mute)' }}>Hint: {currentExercise.hint}</div>
                    )}
                  </>
                )}

                {isDuel && currentExercise.subType !== 'which-word-fits' && (
                  <>
                    <h2 style={promptStyle}>Match each near-synonym to its natural context</h2>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                        padding: '12px',
                        background: 'var(--card2)',
                        borderRadius: '14px'
                      }}
                    >
                      <span style={{ fontSize: '11.5px', color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.04em' }}>TAP TO ASSIGN</span>
                      {duelChips.map((w, idx) => {
                        const isAssigned = nuanceSelection?.sentence1 === w || nuanceSelection?.sentence2 === w;
                        const isActive = nuanceActiveChip === w;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={feedback !== null}
                            onClick={() => {
                              triggerHaptic('light');
                              if (isAssigned) {
                                setNuanceSelection(prev => ({
                                  sentence1: prev?.sentence1 === w ? null : prev?.sentence1,
                                  sentence2: prev?.sentence2 === w ? null : prev?.sentence2,
                                }));
                                setNuanceActiveChip(null);
                              } else {
                                setNuanceActiveChip(isActive ? null : w);
                              }
                            }}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '999px',
                              border: isActive ? '2px solid var(--acc2)' : '1px solid var(--line)',
                              background: isActive ? 'var(--accbg)' : 'var(--card)',
                              color: isAssigned ? 'var(--mute)' : 'var(--fg)',
                              fontWeight: 600,
                              fontSize: '14px',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {w} {isAssigned && '✓'}
                          </button>
                        );
                      })}
                    </div>
                    {['sentence1', 'sentence2'].map((key, i) => (
                      <div
                        key={key}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '16px',
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          lineHeight: 1.7,
                          fontSize: '15px'
                        }}
                      >
                        <div style={{ fontSize: '11.5px', color: 'var(--mute)', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.04em' }}>
                          SENTENCE {i + 1}
                        </div>
                        {withBlank(currentExercise[key] || '', slotButton(key))}
                      </div>
                    ))}
                    {!feedback && (
                      <Button
                        variant={nuanceSelection?.sentence1 && nuanceSelection?.sentence2 ? 'primary' : 'off'}
                        disabled={!nuanceSelection?.sentence1 || !nuanceSelection?.sentence2}
                        onClick={handleNuanceDuelMatch}
                      >
                        {!nuanceSelection?.sentence1 || !nuanceSelection?.sentence2 ? 'Assign both words to check' : 'Check nuances'}
                      </Button>
                    )}
                  </>
                )}

                {/* ===== TIER 3: VAULT REHAB ===== */}
                {selectedTier === 3 && !isDuel && (
                  <>
                    <h2 style={promptStyle}>
                      {currentExercise.vaultMistakeId ? 'Rewrite your past writing slip' : 'Rehabilitate this clunky thought'}
                    </h2>
                    <div
                      style={{
                        background: 'var(--card)',
                        borderRadius: '18px',
                        border: '1px solid var(--line)',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bad)' }}>
                        ✗ {currentExercise.vaultMistakeId ? 'Past slip' : 'Clunky thought'}
                      </span>
                      <p className="serif" style={{ margin: 0, fontSize: '17px', fontStyle: 'italic', color: 'var(--fg2)' }}>
                        “{currentExercise.challenge}”
                      </p>
                      {currentExercise.hint && (
                        <div style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '4px' }}>
                          Hint: {currentExercise.hint}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ===== TIER 4: CRAFT ===== */}
                {selectedTier === 4 && !isDuel && (
                  <>
                    <h2 style={promptStyle}>{currentExercise.prompt}</h2>
                    {currentExercise.guideline && (
                      <div style={{ fontSize: '14px', color: 'var(--fg3)' }}>
                        Goal: {currentExercise.guideline}
                      </div>
                    )}
                  </>
                )}

                {/* Shared free-writing form for tiers 3 & 4 */}
                {(selectedTier === 3 || selectedTier === 4) && !isDuel && (
                  <form onSubmit={handleSubmitWriting} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>
                      {selectedTier === 3 ? 'Your repaired version' : (
                        <>Use target word: <strong style={{ color: 'var(--acc3)' }}>{currentExercise.word}</strong></>
                      )}
                    </label>
                    <textarea
                      rows={3}
                      value={userSubmission}
                      onChange={e => setUserSubmission(e.target.value)}
                      disabled={!!feedback?.isMastered}
                      placeholder={selectedTier === 3 ? 'Rewrite with natural harmony…' : `Compose a sentence using “${currentExercise.word}”…`}
                      style={{
                        ...textareaStyle,
                        border: feedback?.isMastered ? '1px solid var(--ok)' : textareaStyle.border
                      }}
                    />
                    {!feedback?.isMastered && (
                      <Button
                        type="submit"
                        variant={isSubmitting || !userSubmission.trim() ? 'off' : 'primary'}
                        disabled={isSubmitting || !userSubmission.trim()}
                      >
                        {isSubmitting
                          ? (selectedTier === 3 ? 'Evaluating…' : 'Crafting…')
                          : (selectedTier === 3 ? 'Redeem sentence' : 'Submit sentence')}
                      </Button>
                    )}
                  </form>
                )}

                {/* ===== Feedback / 2-step coaching arc ===== */}
                <AnimatePresence>
                  {feedback && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={springs.reveal}
                      style={{ overflow: 'hidden' }}
                    >
                      {feedback.isMastered || feedback.isConcluded ? (
                        <div
                          style={{
                            padding: '16px',
                            borderRadius: '16px',
                            background: feedback.isMastered ? 'var(--okbg)' : 'var(--orgbg)',
                            border: feedback.isMastered ? '1px solid rgba(91, 214, 155, 0.3)' : '1px solid rgba(255, 159, 46, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <span style={{ color: feedback.isMastered ? 'var(--ok)' : 'var(--org2)', fontWeight: 600, fontSize: '14px' }}>
                            {feedback.isMastered
                              ? `✓ Mastered · +${feedback.xpAwarded || 20} XP`
                              : `Needs polish · −${feedback.xpDeducted || 5} XP`}
                          </span>
                          {feedback.feedback && (
                            <div style={{ fontSize: '14px', color: 'var(--fg2)', lineHeight: 1.5 }}>{feedback.feedback}</div>
                          )}
                          {feedback.polishedVersion && (
                            <div className="serif" style={{ fontSize: '15.5px', fontStyle: 'italic', color: 'var(--fg)', lineHeight: 1.5 }}>
                              {feedback.isMastered ? '' : 'Natural cadence: '}“{feedback.polishedVersion}”
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <Button variant="light" size="sm" onClick={() => loadNextExercise(selectedTier)} style={{ flex: 1 }}>
                              Next exercise
                            </Button>
                            {feedback.isMastered && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveToAnthology}
                                disabled={savedToAnthology}
                                style={{ width: 'auto', flex: 'none', color: savedToAnthology ? 'var(--ok)' : 'var(--acc2)' }}
                              >
                                {savedToAnthology ? '✓ Saved' : '+ Anthology'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '14px',
                            borderRadius: '14px',
                            background: 'var(--orgbg)',
                            border: '1px solid rgba(255, 159, 46, 0.25)',
                            color: 'var(--fg2)',
                            fontSize: '14px',
                            lineHeight: 1.45
                          }}
                        >
                          <strong style={{ color: 'var(--org2)', display: 'block', marginBottom: '4px' }}>
                            Spotlight nudge (attempt {attemptCount})
                          </strong>
                          {feedback.nudge || feedback.feedback}
                        </div>
                      )}
                    </m.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DrillPage;
