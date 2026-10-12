/**
 * Studio.jsx — Writing Studio & Error Rehabilitation
 *
 * Progressive 4-Pillar Craft Engine:
 * 1. Grammar & Harmony (actions & timing in sync)
 * 2. Rhythm & Flow (transitions & one-breath readability)
 * 3. Context & Register (putting words in natural habitat)
 * 4. Punctuation & Cadence (sheet music for reading)
 *
 * Apple Design UI/UX:
 * - Concentric Activity Rings (SVG animated)
 * - Visual Breath Meter (sentence rhythm waveform)
 * - Audio Cadence Playback (Web Speech API)
 * - Tap-to-Swap Chips (no typing fatigue on mobile)
 * - 2-Step Coaching Arc (spotlight nudges, no punitive red)
 * - Zero-state seed bank (0ms initial load, brand-new user safe)
 * - Spaced repetition isolation (zero impact on vocabulary review frequency)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  listenToCraftStats,
  recordCraftProgress,
  deductCraftXP,
  saveToAnthology,
  deleteFromAnthology,
  listenToAnthology,
  listenToMistakeVault,
  listenToAllWords,
  calcCraftLevel,
  getUserMistakePatterns,
  getUserEnglishLevel,
  recordStudioSlip,
  recordStudioHabitSuccess,
} from '../services/db';
import { generateCraftExercise, evaluateCraftSubmission } from '../services/ai';
import {
  Volume2,
  CheckCircle,
  XCircle,
  Loader2,
  Bookmark,
  Target,
  Flame,
  ChevronDown,
  Trash,
  Lock,
} from '../components/Icons';
import { springs } from '../motion/springs';


/* ── Pillar Theme Tokens ─────────────────────────────────── */
const PILLARS = {
  grammar: {
    id: 'grammar',
    label: 'Grammar',
    fullTitle: 'Grammar & Harmony',
    color: 'var(--color-warning)', // warm amber #ff9500
    bgTint: 'rgba(255, 149, 0, 0.1)',
    borderTint: 'rgba(255, 149, 0, 0.3)',
    icon: '⚡',
    corePrinciple: 'Keep actions and timing in sync across past and present.',
  },
  flow: {
    id: 'flow',
    label: 'Flow',
    fullTitle: 'Rhythm & Flow',
    color: '#00c7be', // Apple Teal
    bgTint: 'rgba(0, 199, 190, 0.1)',
    borderTint: 'rgba(0, 199, 190, 0.3)',
    icon: '🌊',
    corePrinciple: 'Help your thoughts glide from one breath to the next.',
  },
  context: {
    id: 'context',
    label: 'Context',
    fullTitle: 'Context & Register',
    color: '#af52de', // Apple Violet
    bgTint: 'rgba(175, 82, 222, 0.1)',
    borderTint: 'rgba(175, 82, 222, 0.3)',
    icon: '🎯',
    corePrinciple: 'Put the word where it feels at home in conversation.',
  },
  punctuation: {
    id: 'punctuation',
    label: 'Punctuation',
    fullTitle: 'Punctuation & Cadence',
    color: 'var(--color-success)', // Apple Green #34c759
    bgTint: 'rgba(52, 199, 89, 0.1)',
    borderTint: 'rgba(52, 199, 89, 0.3)',
    icon: '✍️',
    corePrinciple: 'Punctuation is sheet music for your reader’s breath.',
  },
};

const TIERS = [
  { id: 1, label: '1 · Spot & Fix', sub: 'Ear training' },
  { id: 2, label: '2 · Polish', sub: 'Tap-to-swap' },
  { id: 3, label: '3 · Vault', sub: 'Rehabilitation' },
  { id: 4, label: '4 · Craft', sub: 'Original writing' },
];

/* ── Curated Offline Seed Bank (Zero-Latency / 0ms Load) ─── */
/* ── Fisher-Yates Shuffler ────────────────────────────────── */
function shuffleArray(arr) {
  if (!Array.isArray(arr) || arr.length <= 1) return arr ? [...arr] : [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SEED_BANK = {
  grammar: {
    1: [
      {
        type: 'spot-and-fix',
        word: 'resilient',
        clunkySentence: 'The team was resilient yesterday, but today they gives up too easily.',
        options: [
          'The team was resilient yesterday, but today they gives up too easily.',
          'The team was resilient yesterday, but today they give up too easily.',
          'The team is resilient yesterday, but today they giving up too easily.',
        ],
        correctIndex: 1,
        explanation: 'When talking about a group in the present ("they"), the action word drops the "s" sound: "they give up".',
      },
      {
        type: 'spot-and-fix',
        word: 'meticulous',
        clunkySentence: 'She was always meticulous with her sketches, and carefully plan each stroke.',
        options: [
          'She was always meticulous with her sketches, and carefully plan each stroke.',
          'She was always meticulous with her sketches, and carefully planned each stroke.',
          'She was always meticulous with her sketches, and carefully plans each stroke.',
        ],
        correctIndex: 1,
        explanation: 'Once your sentence begins in the past ("she was"), keep the subsequent actions walking in the past ("planned").',
      },
      {
        type: 'spot-and-fix',
        word: 'diligent',
        clunkySentence: 'The student was diligent yesterday, and complete all his assignments.',
        options: [
          'The student was diligent yesterday, and complete all his assignments.',
          'The student was diligent yesterday, and completed all his assignments.',
          'The student is diligent yesterday, and completing all his assignments.',
        ],
        correctIndex: 1,
        explanation: 'Once your sentence begins in the past ("was diligent"), keep the next action in the past ("completed").',
      },
    ],
    2: [
      {
        type: 'tap-to-swap',
        word: 'articulate',
        beforeText: 'During the debate, the speaker ',
        afterText: ' her perspective with unmistakable clarity.',
        currentWeakToken: 'articulate',
        swappableTokens: ['articulate', 'articulated', 'was articulate to'],
        correctToken: 'articulated',
        polishedSentence: 'During the debate, the speaker articulated her perspective with unmistakable clarity.',
        explanation: 'The past event calls for the finished past action ("articulated"), keeping the scene in calm harmony.',
      },
      {
        type: 'tap-to-swap',
        word: 'candid',
        beforeText: 'In his recent interviews, he ',
        afterText: ' candid reflections about the lessons he learned.',
        currentWeakToken: 'shares',
        swappableTokens: ['share', 'shares', 'is shared'],
        correctToken: 'shares',
        polishedSentence: 'In his recent interviews, he shares candid reflections about the lessons he learned.',
        explanation: 'A solo person in the present ("he") takes the s-sound action word: "he shares".',
      },
    ],
    3: [
      {
        type: 'vault-rehab',
        word: 'persistent',
        challenge: 'Yesterday he decide to stay persistent even when the rain starts.',
        hint: 'Whisper "Yesterday..." before each action. Both "decide" and "starts" need to walk in the past.',
        samplePolished: 'Yesterday he decided to stay persistent even when the rain started.',
      },
    ],
    4: [
      {
        type: 'creative-synthesis',
        word: 'diligent',
        prompt: 'Describe how someone tackled a daunting project from start to finish.',
        guideline: 'Keep all past actions unified in the past tense without slipping back into the present.',
        samplePolished: 'She remained diligent through months of quiet research, never wavering until the final draft was complete.',
      },
    ],
  },
  flow: {
    1: [
      {
        type: 'spot-and-fix',
        word: 'manoeuvre',
        clunkySentence: 'The road was narrow. The driver had to manoeuvre. He parked safely.',
        options: [
          'The road was narrow. The driver had to manoeuvre. He parked safely.',
          'Although the road was narrow, the driver manoeuvred carefully and parked safely.',
          'The road was narrow because he had to manoeuvre so he parked safely.',
        ],
        correctIndex: 1,
        explanation: 'Connecting the obstacle with "Although..." helps the sentence flow in one smooth breath.',
      },
      {
        type: 'spot-and-fix',
        word: 'ephemeral',
        clunkySentence: 'The rain was ephemeral. It stopped quickly. We walked outside.',
        options: [
          'The rain was ephemeral. It stopped quickly. We walked outside.',
          'The rain was ephemeral, so we were soon able to walk outside.',
          'The rain was ephemeral because it stopped so we walked outside.',
        ],
        correctIndex: 1,
        explanation: 'Using a simple connector like "so" gives the sentence an easy, natural rhythm.',
      },
      {
        type: 'spot-and-fix',
        word: 'resilient',
        clunkySentence: 'The team lost the first game. They stayed resilient. They won the championship.',
        options: [
          'The team lost the first game. They stayed resilient. They won the championship.',
          'Even though they lost the first game, the team stayed resilient and won the championship.',
          'The team lost the first game and they stayed resilient and they won.',
        ],
        correctIndex: 1,
        explanation: '"Even though..." bridges the early setback to the final win without choppy pauses.',
      },
    ],
    2: [
      {
        type: 'tap-to-swap',
        word: 'lucid',
        beforeText: 'Her explanation was completely lucid, ',
        afterText: ' the underlying concepts were notoriously complex.',
        currentWeakToken: 'and',
        swappableTokens: ['and', 'even though', 'because'],
        correctToken: 'even though',
        polishedSentence: 'Her explanation was completely lucid, even though the underlying concepts were notoriously complex.',
        explanation: '"Even though" bridges the contrast smoothly, showing how clarity triumphed over complexity.',
      },
      {
        type: 'tap-to-swap',
        word: 'faction',
        beforeText: 'Disagreements broke out between each rival faction, ',
        afterText: ' a quiet compromise was forged behind closed doors.',
        currentWeakToken: 'and so',
        swappableTokens: ['and so', 'yet', 'because'],
        correctToken: 'yet',
        polishedSentence: 'Disagreements broke out between each rival faction, yet a quiet compromise was forged behind closed doors.',
        explanation: '"Yet" provides a crisp pivot that balances the tension against the eventual resolution.',
      },
    ],
    3: [
      {
        type: 'vault-rehab',
        word: 'vivid',
        challenge: 'The memories were vivid. I closed my eyes. I felt like I was back there again.',
        hint: 'Use a connector like "as soon as" or "the moment" to combine the thoughts into a single fluid breath.',
        samplePolished: 'The memories were so vivid that the moment I closed my eyes, I felt like I was standing there again.',
      },
      {
        type: 'vault-rehab',
        word: 'manoeuvre',
        challenge: 'She strategically manoeuvred the trick to win.',
        hint: 'Clarify the path of the action by adding "her way through" or "the conversation toward".',
        samplePolished: 'She strategically manoeuvred her way through the complex challenge to secure the victory.',
      },
    ],
    4: [
      {
        type: 'creative-synthesis',
        word: 'serendipitous',
        prompt: 'Write about an unexpected, lucky encounter that changed the direction of your day.',
        guideline: 'Read it aloud in one breath: connect cause and effect with a smooth transition word.',
        samplePolished: 'A serendipitous detour through the old library led me straight to the exact volume I had spent years searching for.',
      },
    ],
  },
  context: {
    1: [
      {
        type: 'spot-and-fix',
        word: 'profound',
        clunkySentence: 'I had a profound desire to grab some potato chips from the kitchen.',
        options: [
          'I had a profound desire to grab some potato chips from the kitchen.',
          'Her quiet speech had a profound influence on how our team approached the crisis.',
          'The recipe called for a profound amount of black pepper.',
        ],
        correctIndex: 1,
        explanation: '"Profound" naturally attaches to transformative emotions or wisdom, rather than everyday snack cravings.',
      },
      {
        type: 'nuance-duel',
        subType: 'which-word-fits',
        pillar: 'context',
        tier: 1,
        word: 'belligerent',
        synonymWord: 'truculent',
        sentence1: "The ambassador condemned the neighbouring regime's ________ stance toward international peace talks.",
        correctMapping: {
          sentence1: 'belligerent',
        },
        correctWord: 'belligerent',
        hint: 'One implies organized hostility/warfare in conflict; the other implies sullen, defiant bad temper.',
        nuanceExplanation: '"Belligerent" emphasizes open hostility or warlike aggression in formal conflicts. "Truculent" emphasizes a bad-tempered, defiant attitude and readiness to fight.',
        explanation: '"Belligerent" fits best here because it describes overt hostility in diplomatic or warlike conflicts.',
      },
    ],
    2: [
      {
        type: 'tap-to-swap',
        word: 'pragmatic',
        beforeText: 'Faced with tight deadlines, they adopted a pragmatic approach ',
        afterText: ' rushing out an untested prototype.',
        currentWeakToken: 'in spite of',
        swappableTokens: ['instead of', 'in spite of', 'because of'],
        correctToken: 'instead of',
        polishedSentence: 'Faced with tight deadlines, they adopted a pragmatic approach instead of rushing out an untested prototype.',
        explanation: '"Instead of" cleanly contrasts the pragmatic choice against the risky alternative.',
      },
      {
        type: 'nuance-duel',
        subType: 'spot-the-difference',
        pillar: 'context',
        tier: 2,
        word: 'meticulous',
        synonymWord: 'scrupulous',
        sentence1: 'She was ________ about cross-checking every single data point before publishing the findings.',
        sentence2: 'He was ________ about following the ethics rules and declared every possible conflict of interest.',
        correctMapping: {
          sentence1: 'meticulous',
          sentence2: 'scrupulous',
        },
        hint: 'One is about painstaking technical precision; the other is about strict moral and ethical integrity.',
        nuanceExplanation: '"Meticulous" focuses on extreme care with small technical details. "Scrupulous" focuses on strict moral and ethical conscientiousness.',
        explanation: '"Meticulous" governs precise craft or data, while "scrupulous" governs moral and ethical adherence.',
      },
    ],
    3: [
      {
        type: 'vault-rehab',
        word: 'scrutinize',
        challenge: 'I quickly scrutinized the lunch menu in two seconds.',
        hint: '"Scrutinize" means careful, detailed examination. Pair it with something that demands close inspection.',
        samplePolished: 'The auditor scrutinized every line of the financial ledger before signing the approval.',
      },
    ],
    4: [
      {
        type: 'creative-synthesis',
        word: 'meticulous',
        prompt: 'Describe a craftsman, scientist, or artist immersed in their work.',
        guideline: 'Use "meticulous" to highlight close, dedicated attention to small details.',
        samplePolished: 'With meticulous care, the restorer matched the centuries-old pigments stroke by patient stroke.',
      },
    ],
  },
  punctuation: {
    1: [
      {
        type: 'spot-and-fix',
        word: 'inevitable',
        clunkySentence: 'Change was inevitable we embraced it with open arms.',
        options: [
          'Change was inevitable we embraced it with open arms.',
          'Change was inevitable, so we embraced it with open arms.',
          'Change was inevitable, we embraced it with open arms.',
        ],
        correctIndex: 1,
        explanation: 'Two complete thoughts need more than a comma: adding "so" bridges the cause to the effect effortlessly.',
      },
    ],
    2: [
      {
        type: 'tap-to-swap',
        word: 'tentative',
        beforeText: 'They took a ',
        afterText: ' step forward, and the crowd held its breath.',
        currentWeakToken: 'tentative;',
        swappableTokens: ['tentative,', 'tentative', 'tentative —'],
        correctToken: 'tentative',
        polishedSentence: 'They took a tentative step forward, and the crowd held its breath.',
        explanation: 'No pause is needed between the adjective ("tentative") and the noun it describes ("step").',
      },
    ],
    3: [
      {
        type: 'vault-rehab',
        word: 'lucid',
        challenge: 'His thoughts were lucid however he was too tired to explain.',
        hint: 'Use a semicolon or period before "however", followed by a soft comma: "...lucid; however, he was..."',
        samplePolished: 'His thoughts were lucid; however, he was too exhausted to explain them aloud.',
      },
    ],
    4: [
      {
        type: 'creative-synthesis',
        word: 'pivotal',
        prompt: 'Describe a turning point in a journey or career.',
        guideline: 'Use a single well-placed comma to let the turning point land with impact.',
        samplePolished: 'Standing at the quiet crossroads, she made the pivotal decision to begin again.',
      },
    ],
  },
};

/* ── Apple-Style Concentric Activity Rings ───────────────── */
function ConcentricCraftRings({ stats, activePillar, onSelectPillar }) {
  const size = 160;
  const strokeWidth = 10;

  const rings = [
    { id: 'grammar',     color: PILLARS.grammar.color,     radius: 65, xp: stats?.grammar?.xp || 0 },
    { id: 'flow',        color: PILLARS.flow.color,        radius: 52, xp: stats?.flow?.xp || 0 },
    { id: 'context',     color: PILLARS.context.color,     radius: 39, xp: stats?.context?.xp || 0 },
    { id: 'punctuation', color: PILLARS.punctuation.color, radius: 26, xp: stats?.punctuation?.xp || 0 },
  ];

  const totalXp = (stats?.grammar?.xp || 0) + (stats?.flow?.xp || 0) + (stats?.context?.xp || 0) + (stats?.punctuation?.xp || 0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: size,
      height: size,
      margin: '0 auto',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map(r => {
          const circumference = 2 * Math.PI * r.radius;
          // Progress inside current level bracket (100, 300, 600, 1000)
          const lvl = calcCraftLevel(r.xp, stats?.[r.id]?.tierCompletions);
          const span = lvl.nextThreshold - lvl.currentBase;
          const progress = Math.max(0, r.xp - lvl.currentBase);
          const pct = lvl.level >= 5 || lvl.isCapped ? 1 : Math.min(1, Math.max(0.06, span > 0 ? progress / span : 1));
          const offset = circumference - (pct * circumference);
          const isSelected = activePillar === r.id;

          return (
            <g key={r.id} onClick={() => onSelectPillar(r.id)} style={{ cursor: 'pointer' }}>
              {/* Background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r.radius}
                fill="none"
                stroke={r.color}
                strokeWidth={strokeWidth}
                opacity={isSelected ? 0.28 : 0.15}
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r.radius}
                fill="none"
                stroke={r.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2, 0.9, 0.3, 1)',
                  filter: isSelected ? `drop-shadow(0 0 6px ${r.color})` : 'none',
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Center XP Badge */}
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          Craft XP
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {totalXp}
        </span>
      </div>
    </div>
  );
}

/* ── Visual Breath Meter / Cadence Wave ──────────────────── */
function BreathMeter({ sentence }) {
  if (!sentence) return null;

  // Split into natural breath segments by commas, periods, semicolons
  const segments = sentence.split(/([,;.—\n])/g).filter(s => s.trim().length > 0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: 'var(--sp-2) 0',
      overflowX: 'auto',
    }} aria-label="Visual sentence cadence">
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
        Cadence:
      </span>
      {segments.map((seg, i) => {
        const isPause = [',', ';', '.', '—', '-'].includes(seg.trim());
        if (isPause) {
          return (
            <span key={i} style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'rgba(0, 199, 190, 0.15)',
              color: '#00c7be',
              fontSize: 10,
              fontWeight: 700,
            }} title="Natural pause">
              ~
            </span>
          );
        }
        const width = Math.min(60, Math.max(16, seg.length * 2.2));
        return (
          <span
            key={i}
            style={{
              height: 4,
              width: width,
              background: 'rgba(120, 120, 128, 0.18)',
              borderRadius: 2,
              display: 'inline-block',
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Audio Speech Synthesis Hook ─────────────────────────── */
function playSentenceCadence(text) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel(); // Stop any pending audio

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.90; // Measured pace to clearly demonstrate rhythm and pauses
  utterance.pitch = 1.0;

  try {
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      (v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Google UK') || v.name.includes('Google US') || v.name.includes('Natural')) && 
      (v.lang.startsWith('en'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (naturalVoice) utterance.voice = naturalVoice;
  } catch {
    // Fallback to browser default
  }

  window.speechSynthesis.speak(utterance);
}

/* ── Main Studio Component ───────────────────────────────── */
export default function Studio({ currentUser, targetPillar, targetTier, targetMistake }) {
  const [loading, setLoading]           = useState(true);
  const [craftStats, setCraftStats]     = useState(null);
  const [vault, setVault]               = useState([]);
  const [allWords, setAllWords]         = useState([]);
  const [anthology, setAnthology]       = useState([]);
  const [xpDelta, setXpDelta]           = useState(null); // { amount: number, key: number }
  const [userEnglishLevel, setUserEnglishLevel] = useState(1);

  // Auto-clear XP delta indicator
  useEffect(() => {
    if (!xpDelta) return;
    const t = setTimeout(() => setXpDelta(null), 2500);
    return () => clearTimeout(t);
  }, [xpDelta]);

  // Active pillar & tier
  const [selectedPillar, setSelectedPillar] = useState('flow'); // Default to flow, users' top focus
  const [selectedTier, setSelectedTier]     = useState(1);
  const userSelectedPillarRef               = useRef(false);
  const recentWordsRef                      = useRef([]);
  const hasLoadedRealWordsRef               = useRef(false);
  const targetMistakeRef                    = useRef(null);
  const hasRecordedSlipForSessionRef        = useRef(false);

  // Sync pillar when navigated from Insights habit card or mistake vault
  useEffect(() => {
    if (targetPillar && PILLARS[targetPillar]) {
      userSelectedPillarRef.current = true;
      setSelectedPillar(targetPillar);
    }
  }, [targetPillar]);

  // Sync tier and target mistake when navigated directly from Insights
  useEffect(() => {
    if (targetTier && [1, 2, 3, 4].includes(Number(targetTier))) {
      setSelectedTier(Number(targetTier));
    }
    if (targetMistake) {
      targetMistakeRef.current = targetMistake;
    }
  }, [targetTier, targetMistake]);

  // Exercise Deck State
  const [currentExercise, setCurrentExercise]   = useState(null);
  const [deckLoading, setDeckLoading]           = useState(false);
  const [selectedOption, setSelectedOption]     = useState(null);
  const [swappedToken, setSwappedToken]         = useState(null);
  const [userSubmission, setUserSubmission]     = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [feedback, setFeedback]                 = useState(null);
  const [attemptCount, setAttemptCount]         = useState(1);
  const [savedToAnthologyToast, setSavedToast]  = useState(false);
  const [tierLockMessage, setTierLockMessage]   = useState(null);
  const [nuanceSelection, setNuanceSelection]   = useState(null);
  const [nuanceActiveChip, setNuanceActiveChip] = useState(null);

  // Stable shuffled chips for Nuance Duel
  const duelChips = useMemo(() => {
    if (currentExercise?.type !== 'nuance-duel') return [];
    const pool = [currentExercise.word, currentExercise.synonymWord].filter(Boolean);
    return shuffleArray(pool);
  }, [currentExercise?.word, currentExercise?.synonymWord, currentExercise?.sentence1, currentExercise?.type]);

  // Auto-scroll and visual indicator for Tune Up
  const deckRef = useRef(null);
  const [tuneUpActive, setTuneUpActive] = useState(false);

  // Find recommended pillar based on user's vault mistakes
  const recommendedPillar = useMemo(() => {
    if (!vault || vault.length === 0) return 'flow';
    const tagCounts = {};
    vault.forEach(m => {
      m.errorTags?.forEach(t => {
        const lower = t.toLowerCase();
        if (lower.includes('flow')) tagCounts.flow = (tagCounts.flow || 0) + 1;
        else if (lower.includes('grammar')) tagCounts.grammar = (tagCounts.grammar || 0) + 1;
        else if (lower.includes('context') || lower.includes('vocab')) tagCounts.context = (tagCounts.context || 0) + 1;
        else if (lower.includes('punct')) tagCounts.punctuation = (tagCounts.punctuation || 0) + 1;
      });
    });
    const sorted = Object.entries(tagCounts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || 'flow';
  }, [vault]);

  // If user hasn't explicitly clicked a pillar, auto-align with their top recommended pillar
  useEffect(() => {
    if (!userSelectedPillarRef.current && recommendedPillar && selectedPillar !== recommendedPillar) {
      setSelectedPillar(recommendedPillar);
    }
  }, [recommendedPillar]);

  const handleTuneUp = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setTuneUpActive(true);
    userSelectedPillarRef.current = true;
    setSelectedPillar(recommendedPillar);
    setSelectedTier(1);
    loadNextExercise(recommendedPillar, 1);

    setTimeout(() => {
      deckRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);

    setTimeout(() => {
      setTuneUpActive(false);
    }, 2000);
  };

  // Subscribe to craft stats, vault, all words, and anthology
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const u1 = listenToCraftStats(currentUser.uid, s => {
      setCraftStats(s);
      setLoading(false);
    });

    const u2 = listenToMistakeVault(currentUser.uid, v => {
      setVault(v || []);
    });

    const u3 = listenToAllWords(currentUser.uid, ws => {
      const wordsList = ws || [];
      setAllWords(wordsList);
      // If initial exercise was loaded with mock fallback, re-trigger with real dictionary words
      if (!hasLoadedRealWordsRef.current && wordsList.length > 0) {
        hasLoadedRealWordsRef.current = true;
        loadNextExercise(selectedPillar, selectedTier, wordsList, vault);
      }
    });

    const u4 = listenToAnthology(currentUser.uid, a => {
      setAnthology(a || []);
    });

    getUserEnglishLevel(currentUser.uid).then(cfg => {
      if (cfg?.level) setUserEnglishLevel(cfg.level);
    }).catch(err => console.warn('Could not load English level in Studio:', err));

    const handleSettingsUpdate = () => {
      getUserEnglishLevel(currentUser.uid).then(cfg => {
        if (cfg?.level) setUserEnglishLevel(cfg.level);
      }).catch(err => console.warn('Could not load English level in Studio:', err));
    };
    window.addEventListener('vocapp:settings-updated', handleSettingsUpdate);

    return () => {
      u1();
      u2();
      u3();
      u4();
      window.removeEventListener('vocapp:settings-updated', handleSettingsUpdate);
    };
  }, [currentUser]);

  // Progressive Tier Unlock Status per pillar
  const tierUnlockStatus = useMemo(() => {
    const pillarData = craftStats?.[selectedPillar] || {};
    const completions = pillarData.tierCompletions || {};
    const totalPillarSolved = pillarData.solved || 0;

    return {
      1: { unlocked: true, reason: '' },
      2: {
        unlocked: (completions[1] || 0) >= 3 || totalPillarSolved >= 3,
        reason: `Complete ${Math.max(0, 3 - (completions[1] || 0))} more Spot & Fix drills to unlock Sentence Polish`,
        needed: Math.max(0, 3 - (completions[1] || 0)),
      },
      3: {
        unlocked: (completions[2] || 0) >= 3 || (vault && vault.length > 0) || totalPillarSolved >= 6,
        reason: `Complete ${Math.max(0, 3 - (completions[2] || 0))} more Polish drills to unlock Vault Rehabilitation`,
        needed: Math.max(0, 3 - (completions[2] || 0)),
      },
      4: {
        unlocked: (completions[3] || 0) >= 2 || totalPillarSolved >= 8,
        reason: `Complete ${Math.max(0, 2 - (completions[3] || 0))} more Vault Rehab drills to unlock Creative Writing`,
        needed: Math.max(0, 2 - (completions[3] || 0)),
      },
    };
  }, [craftStats, selectedPillar, vault]);

  // Load an exercise whenever pillar or tier changes
  useEffect(() => {
    loadNextExercise(selectedPillar, selectedTier);
  }, [selectedPillar, selectedTier]);

  const loadNextExercise = async (pillar, tier, wordsListOverride = null, vaultListOverride = null) => {
    setDeckLoading(true);
    setSelectedOption(null);
    setSwappedToken(null);
    setUserSubmission('');
    setFeedback(null);
    setAttemptCount(1);
    setSavedToast(false);
    setNuanceSelection(null);
    setNuanceActiveChip(null);

    const wordsPool = wordsListOverride || allWords;
    const vaultPool = vaultListOverride || vault;
    hasRecordedSlipForSessionRef.current = false;

    // 1. Check for targeted vault mistake passed from Insights
    let targetedMistake = null;
    if (tier === 3 && targetMistakeRef.current) {
      targetedMistake = targetMistakeRef.current;
      targetMistakeRef.current = null;
    }

    // 2. Intelligent Word Picker prioritizing Mistake Vault & Due Words with Anti-Repetition
    let chosenWordObj = null;
    if (targetedMistake?.word) {
      chosenWordObj = { word: targetedMistake.word, definition: '' };
    } else if (wordsPool && wordsPool.length > 0) {
      // Exclude recently seen words in this session
      let candidateWords = wordsPool.filter(w => !recentWordsRef.current.includes(w.word));
      if (candidateWords.length === 0) {
        recentWordsRef.current = [];
        candidateWords = wordsPool;
      }

      // Priority 1: Words from vault that exist in candidates (target user's logged mistakes)
      const vaultCandidateWords = candidateWords.filter(w =>
        vaultPool.some(v => v.word?.toLowerCase() === w.word?.toLowerCase())
      );
      // Priority 2: Words that are due or learning
      const dueCandidateWords = candidateWords.filter(w => w.status !== 'mastered');

      if (vaultCandidateWords.length > 0 && Math.random() < 0.7) {
        chosenWordObj = vaultCandidateWords[Math.floor(Math.random() * vaultCandidateWords.length)];
      } else if (dueCandidateWords.length > 0) {
        chosenWordObj = dueCandidateWords[Math.floor(Math.random() * dueCandidateWords.length)];
      } else {
        chosenWordObj = candidateWords[Math.floor(Math.random() * candidateWords.length)];
      }

      // Track in rolling session queue
      recentWordsRef.current.push(chosenWordObj.word);
      if (recentWordsRef.current.length > 8) {
        recentWordsRef.current.shift();
      }
    } else {
      chosenWordObj = { word: 'resilient', definition: 'able to recover quickly' };
    }

    // 3. Pick a vault mistake if tier is 3
    const vaultMistake = targetedMistake || vaultPool.find(m =>
      m.errorTags?.some(t => t.toLowerCase().includes(pillar)) && !m.isRedeemed
    ) || vaultPool.find(m => !m.isRedeemed) || vaultPool[0] || null;

    // Check offline seed bank first for instant response
    const seeds = SEED_BANK[pillar]?.[tier];
    const localSeed = seeds ? seeds[Math.floor(Math.random() * seeds.length)] : null;

    try {
      const mistakePatterns = await getUserMistakePatterns(currentUser.uid);
      const dictPool = (wordsPool || [])
        .map(w => (typeof w === 'string' ? w : w?.word || ''))
        .filter(w => Boolean(w) && w.toLowerCase() !== chosenWordObj.word.toLowerCase());
      const dictionaryWords = shuffleArray(dictPool).slice(0, 25);

      // Background synthesis with Cloud Function
      const aiExercise = await generateCraftExercise(
        pillar,
        tier,
        chosenWordObj.word,
        chosenWordObj.definition || '',
        vaultMistake,
        mistakePatterns,
        dictionaryWords,
        userEnglishLevel
      );
      if (aiExercise) {
        setCurrentExercise({
          ...aiExercise,
          vaultMistakeId: vaultMistake?.id || null,
        });
      } else if (localSeed) {
        setCurrentExercise({
          ...localSeed,
          vaultMistakeId: vaultMistake?.id || null,
        });
      } else {
        // Fallback default calibrated to selected tier
        if (tier === 1) {
          setCurrentExercise({
            type: 'spot-and-fix',
            pillar,
            tier: 1,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            clunkySentence: `The project was ${chosenWordObj.word} yesterday, but today they gives up too easily.`,
            options: [
              `The project was ${chosenWordObj.word} yesterday, but today they gives up too easily.`,
              `The project was ${chosenWordObj.word} yesterday, but today they give up too easily.`,
              `The project is ${chosenWordObj.word} yesterday, and they giving up too easily.`,
            ],
            correctIndex: 1,
            explanation: `When speaking about a group ("they"), use "give up" instead of "gives up".`,
          });
        } else if (tier === 2) {
          setCurrentExercise({
            type: 'tap-to-swap',
            pillar,
            tier: 2,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            beforeText: `The team remained ${chosenWordObj.word}, `,
            afterText: ' they overcame every obstacle with calm determination.',
            currentWeakToken: 'and so',
            swappableTokens: ['and so', 'yet', 'wherefore'],
            correctToken: 'yet',
            polishedSentence: `The team remained ${chosenWordObj.word}, yet they overcame every obstacle with calm determination.`,
            explanation: `Using 'yet' creates a crisp contrast and gives the sentence natural balance.`,
          });
        } else if (tier === 3) {
          setCurrentExercise({
            type: 'vault-rehab',
            pillar,
            tier: 3,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            challenge: `The presentation was ${chosenWordObj.word} but nobody understood nothing.`,
            hint: `Use "${chosenWordObj.word}" to highlight the core strength with clean, positive phrasing.`,
            samplePolished: `The presentation was ${chosenWordObj.word}, leaving the audience with clear, actionable insights.`,
          });
        } else {
          setCurrentExercise({
            type: 'creative-synthesis',
            pillar,
            tier,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            prompt: `Describe a challenging moment where being ${chosenWordObj.word} changed the final outcome.`,
            guideline: `Write a clear, rhythmic sentence highlighting natural cadence.`,
            samplePolished: `Her ${chosenWordObj.word} composure steadied the entire room during the critical negotiations.`,
          });
        }
      }
    } catch {
      // Offline / fallback to seed bank
      if (localSeed) {
        setCurrentExercise({
          ...localSeed,
          vaultMistakeId: vaultMistake?.id || null,
        });
      } else {
        if (tier === 1) {
          setCurrentExercise({
            type: 'spot-and-fix',
            pillar,
            tier: 1,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            clunkySentence: `The team was ${chosenWordObj.word} yesterday, but today they gives up too easily.`,
            options: [
              `The team was ${chosenWordObj.word} yesterday, but today they gives up too easily.`,
              `The team was ${chosenWordObj.word} yesterday, but today they give up too easily.`,
              `The team is ${chosenWordObj.word} yesterday, and they giving up too easily.`,
            ],
            correctIndex: 1,
            explanation: `When speaking about a group ("they"), use "give up" instead of "gives up".`,
          });
        } else if (tier === 2) {
          setCurrentExercise({
            type: 'tap-to-swap',
            pillar,
            tier: 2,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            beforeText: `The team remained ${chosenWordObj.word}, `,
            afterText: ' they overcame every obstacle with calm determination.',
            currentWeakToken: 'and so',
            swappableTokens: ['and so', 'yet', 'wherefore'],
            correctToken: 'yet',
            polishedSentence: `The team remained ${chosenWordObj.word}, yet they overcame every obstacle with calm determination.`,
            explanation: `Using 'yet' creates a crisp contrast and gives the sentence natural balance.`,
          });
        } else if (tier === 3) {
          setCurrentExercise({
            type: 'vault-rehab',
            pillar,
            tier: 3,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            challenge: `The presentation was ${chosenWordObj.word} but nobody understood nothing.`,
            hint: `Use "${chosenWordObj.word}" to highlight the core strength with clean, positive phrasing.`,
            samplePolished: `The presentation was ${chosenWordObj.word}, leaving the audience with clear, actionable insights.`,
          });
        } else {
          setCurrentExercise({
            type: 'creative-synthesis',
            pillar,
            tier,
            level: userEnglishLevel || 1,
            word: chosenWordObj.word,
            prompt: `Describe a challenging moment where being ${chosenWordObj.word} changed the final outcome.`,
            guideline: `Write a clear, rhythmic sentence highlighting natural cadence.`,
            samplePolished: `Her ${chosenWordObj.word} composure steadied the entire room during the critical negotiations.`,
          });
        }
      }
    } finally {
      setDeckLoading(false);
    }
  };

  // Handle Option selection in Tier 1 (One-Shot drill)
  const handleSelectOption = async (index) => {
    if (selectedOption !== null || feedback) return; // Locked on single attempt!
    if (navigator.vibrate) navigator.vibrate(10);
    setSelectedOption(index);

    const isCorrect = index === currentExercise.correctIndex;
    if (isCorrect) {
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
      setFeedback({
        isMastered: true,
        feedback: currentExercise.explanation,
        xpAwarded: 15,
        polishedVersion: currentExercise.options[index],
      });
      setXpDelta({ amount: 15, key: Date.now() });

      // Synchronous optimistic update to local state
      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = p.xp + 15;
        const nextTiers = { ...p.tierCompletions, 1: (p.tierCompletions?.[1] || 0) + 1 };
        const calculated = calcCraftLevel(nextXp, nextTiers);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            solved: (p.solved || 0) + 1,
            level: calculated.level,
            rank: calculated.rank,
            tierCompletions: nextTiers,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      // Background persistence
      recordCraftProgress(currentUser.uid, {
        pillar: selectedPillar,
        tier: 1,
        xpGained: 15,
        wordUsed: currentExercise.word,
      }).catch(err => console.error("Error persisting craft progress:", err));
    } else {
      if (navigator.vibrate) navigator.vibrate([30]);
      setXpDelta({ amount: -5, key: Date.now() });

      // Synchronous optimistic deduction to local state
      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = Math.max(0, p.xp - 5);
        const calculated = calcCraftLevel(nextXp, p.tierCompletions);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            level: calculated.level,
            rank: calculated.rank,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.explanation || 'Notice how the actions sound together out loud. Keeping them aligned gives the sentence effortless harmony.',
        polishedVersion: currentExercise.options[currentExercise.correctIndex],
        xpDeducted: 5,
      });

      // Background deduction
      deductCraftXP(currentUser.uid, {
        pillar: selectedPillar,
        xpLost: 5,
      }).catch(err => console.error("Error deducting craft XP:", err));

      // Ingest authentic ear-training slip into Insights
      recordStudioSlip(currentUser.uid, {
        pillar: selectedPillar,
        tier: 1,
        word: currentExercise.word,
        originalSentence: currentExercise.options[index],
        reframedSentence: currentExercise.options[currentExercise.correctIndex],
        structuralDiagnosis: currentExercise.explanation || 'Awkward syntax selected in spot-and-fix drill.',
        ruleOfThumb: currentExercise.explanation || '',
      }).catch(err => console.error("Error recording Tier 1 Studio slip:", err));
    }
  };

  // Handle Token Swap in Tier 2 (One-Shot drill)
  const handleSwapToken = async (token) => {
    if (swappedToken !== null || feedback) return; // Locked on single attempt!
    if (navigator.vibrate) navigator.vibrate(10);
    setSwappedToken(token);

    const isCorrect = token.toLowerCase() === currentExercise.correctToken.toLowerCase();
    if (isCorrect) {
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
      setFeedback({
        isMastered: true,
        feedback: currentExercise.explanation,
        xpAwarded: 20,
        polishedVersion: currentExercise.polishedSentence,
      });
      setXpDelta({ amount: 20, key: Date.now() });

      // Synchronous optimistic update
      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = p.xp + 20;
        const nextTiers = { ...p.tierCompletions, 2: (p.tierCompletions?.[2] || 0) + 1 };
        const calculated = calcCraftLevel(nextXp, nextTiers);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            solved: (p.solved || 0) + 1,
            level: calculated.level,
            rank: calculated.rank,
            tierCompletions: nextTiers,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      recordCraftProgress(currentUser.uid, {
        pillar: selectedPillar,
        tier: 2,
        xpGained: 20,
        wordUsed: currentExercise.word,
      }).catch(err => console.error("Error persisting craft progress:", err));
    } else {
      if (navigator.vibrate) navigator.vibrate([30]);
      setXpDelta({ amount: -5, key: Date.now() });

      // Synchronous optimistic deduction
      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = Math.max(0, p.xp - 5);
        const calculated = calcCraftLevel(nextXp, p.tierCompletions);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            level: calculated.level,
            rank: calculated.rank,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.explanation || 'Listen closely to the breath: the natural connector provides smooth transition between the two clauses.',
        polishedVersion: currentExercise.polishedSentence,
        xpDeducted: 5,
      });

      deductCraftXP(currentUser.uid, {
        pillar: selectedPillar,
        xpLost: 5,
      }).catch(err => console.error("Error deducting craft XP:", err));

      // Ingest authentic connector slip into Insights
      recordStudioSlip(currentUser.uid, {
        pillar: selectedPillar,
        tier: 2,
        word: currentExercise.word,
        originalSentence: `${currentExercise.beforeText || ''}${token}${currentExercise.afterText || ''}`,
        reframedSentence: currentExercise.polishedSentence || '',
        structuralDiagnosis: currentExercise.explanation || 'Weak connector chosen during polish drill.',
        ruleOfThumb: currentExercise.explanation || '',
      }).catch(err => console.error("Error recording Tier 2 Studio slip:", err));
    }
  };

  // ── Nuance Duel Handler: Sub-type A ("Which Word Fits?") ──────
  const handleNuanceDuelSelect = async (chosenWord) => {
    if (nuanceSelection !== null || feedback) return; // Locked on single attempt!
    if (navigator.vibrate) navigator.vibrate(10);
    setNuanceSelection(chosenWord);

    const norm = s => (s || '').toLowerCase().trim();
    const correctTarget = norm(currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word);
    const isCorrect = norm(chosenWord) === correctTarget;

    const resolvedSentence = currentExercise.sentence1
      ? currentExercise.sentence1.replace(/_{2,}/g, currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word)
      : undefined;

    if (isCorrect) {
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
      setFeedback({
        isMastered: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        xpAwarded: 15,
        polishedVersion: resolvedSentence,
      });
      setXpDelta({ amount: 15, key: Date.now() });

      // Optimistic XP update
      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = p.xp + 15;
        const nextTiers = { ...p.tierCompletions, [selectedTier]: (p.tierCompletions?.[selectedTier] || 0) + 1 };
        const calculated = calcCraftLevel(nextXp, nextTiers);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            solved: (p.solved || 0) + 1,
            level: calculated.level,
            rank: calculated.rank,
            tierCompletions: nextTiers,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      recordCraftProgress(currentUser.uid, {
        pillar: selectedPillar,
        tier: selectedTier,
        xpGained: 15,
        wordUsed: currentExercise.word,
      }).catch(err => console.error("Error recording Nuance Duel progress:", err));
    } else {
      if (navigator.vibrate) navigator.vibrate([30]);
      setXpDelta({ amount: -5, key: Date.now() });

      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = Math.max(0, p.xp - 5);
        const calculated = calcCraftLevel(nextXp, p.tierCompletions);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            level: calculated.level,
            rank: calculated.rank,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        polishedVersion: resolvedSentence,
        xpDeducted: 5,
      });

      deductCraftXP(currentUser.uid, {
        pillar: selectedPillar,
        xpLost: 5,
      }).catch(err => console.error("Error deducting craft XP:", err));

      // Log near-synonym slip to Mistake Vault
      recordStudioSlip(currentUser.uid, {
        pillar: 'context',
        tier: selectedTier,
        word: currentExercise.word,
        originalSentence: currentExercise.sentence1 ? currentExercise.sentence1.replace(/_{2,}/g, chosenWord) : '',
        reframedSentence: resolvedSentence || '',
        structuralDiagnosis: `Near-synonym confusion between "${currentExercise.word}" and "${currentExercise.synonymWord}". ${currentExercise.nuanceExplanation || ''}`,
        ruleOfThumb: currentExercise.hint || currentExercise.nuanceExplanation || '',
      }).catch(err => console.error("Error recording Nuance Duel slip:", err));
    }
  };

  // ── Nuance Duel Handler: Sub-type B ("Spot the Difference") ──
  const handleNuanceDuelMatch = async () => {
    if (feedback || !nuanceSelection?.sentence1 || !nuanceSelection?.sentence2) return;
    if (navigator.vibrate) navigator.vibrate(10);

    const norm = s => (s || '').toLowerCase().trim();
    const s1Target = norm(currentExercise.correctMapping?.sentence1 || currentExercise.word);
    const s2Target = norm(currentExercise.correctMapping?.sentence2 || currentExercise.synonymWord);

    const s1Correct = norm(nuanceSelection.sentence1) === s1Target;
    const s2Correct = norm(nuanceSelection.sentence2) === s2Target;
    const isCorrect = s1Correct && s2Correct;

    const resolvedSentence = currentExercise.sentence1
      ? `${currentExercise.sentence1.replace(/_{2,}/g, s1Target)} | ${(currentExercise.sentence2 || '').replace(/_{2,}/g, s2Target)}`
      : undefined;

    if (isCorrect) {
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
      setFeedback({
        isMastered: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        xpAwarded: 20,
        polishedVersion: resolvedSentence,
      });
      setXpDelta({ amount: 20, key: Date.now() });

      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = p.xp + 20;
        const nextTiers = { ...p.tierCompletions, [selectedTier]: (p.tierCompletions?.[selectedTier] || 0) + 1 };
        const calculated = calcCraftLevel(nextXp, nextTiers);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            solved: (p.solved || 0) + 1,
            level: calculated.level,
            rank: calculated.rank,
            tierCompletions: nextTiers,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      recordCraftProgress(currentUser.uid, {
        pillar: selectedPillar,
        tier: selectedTier,
        xpGained: 20,
        wordUsed: currentExercise.word,
      }).catch(err => console.error("Error recording Nuance Duel progress:", err));
    } else {
      if (navigator.vibrate) navigator.vibrate([30]);
      setXpDelta({ amount: -5, key: Date.now() });

      setCraftStats(prev => {
        if (!prev) return prev;
        const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
        const nextXp = Math.max(0, p.xp - 5);
        const calculated = calcCraftLevel(nextXp, p.tierCompletions);
        return {
          ...prev,
          [selectedPillar]: {
            ...p,
            xp: nextXp,
            level: calculated.level,
            rank: calculated.rank,
            nextRequirement: calculated.nextRequirement,
            isCapped: calculated.isCapped,
          }
        };
      });

      setFeedback({
        isMastered: false,
        isConcluded: true,
        feedback: currentExercise.nuanceExplanation || currentExercise.explanation,
        polishedVersion: resolvedSentence,
        xpDeducted: 5,
      });

      deductCraftXP(currentUser.uid, {
        pillar: selectedPillar,
        xpLost: 5,
      }).catch(err => console.error("Error deducting craft XP:", err));

      recordStudioSlip(currentUser.uid, {
        pillar: 'context',
        tier: selectedTier,
        word: currentExercise.word,
        originalSentence: `${nuanceSelection.sentence1} vs ${nuanceSelection.sentence2}`,
        reframedSentence: resolvedSentence || '',
        structuralDiagnosis: `Mismatched synonym contexts: "${currentExercise.word}" and "${currentExercise.synonymWord}".`,
        ruleOfThumb: currentExercise.hint || currentExercise.nuanceExplanation || '',
      }).catch(err => console.error("Error recording Nuance Duel slip:", err));
    }
  };

  // Handle Text Submission in Tier 3 & 4
  const handleSubmitWriting = async (e) => {
    e?.preventDefault();
    if (!userSubmission.trim() || isSubmitting) return;

    // Client-side pre-flight: Minimum length check
    const words = userSubmission.trim().split(/\s+/);
    if (words.length < 4) {
      setFeedback({
        isMastered: false,
        nudge: 'Please compose a complete, expressive thought (at least 4 words).',
      });
      return;
    }

    // Client-side pre-flight: Verify target word presence
    if (currentExercise?.word) {
      const cleanWord = currentExercise.word.toLowerCase().replace(/[^a-z]/g, '');
      const cleanSub = userSubmission.toLowerCase().replace(/[^a-z\s]/g, '');
      const rootStem = cleanWord.length > 4 ? cleanWord.slice(0, cleanWord.length - 2) : cleanWord;
      const hasTarget = cleanSub.includes(cleanWord) || cleanSub.includes(rootStem);

      if (!hasTarget) {
        setFeedback({
          isMastered: false,
          nudge: `Remember to weave the target word "${currentExercise.word}" into your sentence.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await evaluateCraftSubmission(
        selectedPillar,
        selectedTier,
        currentExercise.word,
        currentExercise.challenge || currentExercise.prompt,
        userSubmission,
        attemptCount,
        userEnglishLevel
      );

      setFeedback(res);

      if (res.isMastered) {
        if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
        const xpEarned = res.xpAwarded || (selectedTier === 3 ? 25 : 35);
        setXpDelta({ amount: xpEarned, key: Date.now() });

        // Synchronous optimistic update
        setCraftStats(prev => {
          if (!prev) return prev;
          const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
          const nextXp = p.xp + xpEarned;
          const nextTiers = { ...p.tierCompletions, [selectedTier]: (p.tierCompletions?.[selectedTier] || 0) + 1 };
          const calculated = calcCraftLevel(nextXp, nextTiers);
          return {
            ...prev,
            [selectedPillar]: {
              ...p,
              xp: nextXp,
              solved: (p.solved || 0) + 1,
              level: calculated.level,
              rank: calculated.rank,
              tierCompletions: nextTiers,
              nextRequirement: calculated.nextRequirement,
              isCapped: calculated.isCapped,
            }
          };
        });

        recordCraftProgress(currentUser.uid, {
          pillar: selectedPillar,
          tier: selectedTier,
          xpGained: xpEarned,
          redeemedMistakeId: selectedTier === 3 ? (currentExercise.vaultMistakeId || currentExercise.id) : null,
          wordUsed: currentExercise.word,
        }).catch(err => console.error(err));

        // Advance habit mastery status on authentic Studio success
        recordStudioHabitSuccess(currentUser.uid, {
          pillar: selectedPillar,
          habitKey: res.habitKey || null,
        }).catch(err => console.error(err));
      } else {
        if (navigator.vibrate) navigator.vibrate([30]);
        setAttemptCount(a => a + 1);
        setXpDelta({ amount: -5, key: Date.now() });

        // Synchronous optimistic deduction
        setCraftStats(prev => {
          if (!prev) return prev;
          const p = prev[selectedPillar] || { xp: 0, solved: 0, level: 1, tierCompletions: {} };
          const nextXp = Math.max(0, p.xp - 5);
          const calculated = calcCraftLevel(nextXp, p.tierCompletions);
          return {
            ...prev,
            [selectedPillar]: {
              ...p,
              xp: nextXp,
              level: calculated.level,
              rank: calculated.rank,
              nextRequirement: calculated.nextRequirement,
              isCapped: calculated.isCapped,
            }
          };
        });

        deductCraftXP(currentUser.uid, {
          pillar: selectedPillar,
          xpLost: 5,
        }).catch(err => console.error(err));

        // In Tier 4 (Creative Synthesis), record the authentic writing slip into Insights
        // Deduplicated per exercise session so retries on the same exercise don't duplicate slips
        if (selectedTier === 4 && !hasRecordedSlipForSessionRef.current) {
          hasRecordedSlipForSessionRef.current = true;
          recordStudioSlip(currentUser.uid, {
            pillar: selectedPillar,
            tier: 4,
            word: currentExercise.word,
            originalSentence: userSubmission,
            reframedSentence: res.polishedVersion || '',
            structuralDiagnosis: res.structuralDiagnosis || res.feedback || 'Awkward phrasing in creative synthesis drill.',
            ruleOfThumb: res.ruleOfThumb || res.cadenceNotes || '',
            habitKey: res.habitKey || null,
            errorTags: res.errorTags || [selectedPillar],
          }).catch(err => console.error("Error recording Tier 4 Studio slip:", err));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToAnthology = async () => {
    const textToSave = feedback?.polishedVersion || userSubmission;
    if (!textToSave) return;
    try {
      await saveToAnthology(currentUser.uid, {
        sentence: textToSave,
        word: currentExercise?.word || 'Practice Word',
        pillar: selectedPillar,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFromAnthology = async (itemId) => {
    if (!itemId || !currentUser) return;
    if (navigator.vibrate) navigator.vibrate(15);
    setAnthology(prev => prev.filter(i => i.id !== itemId));
    try {
      await deleteFromAnthology(currentUser.uid, itemId);
    } catch (e) {
      console.error("Error deleting from anthology:", e);
    }
  };

  const activePillarMeta = PILLARS[selectedPillar];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sp-4) var(--sp-4) 0', maxWidth: 640, margin: '0 auto' }}>

      {/* ── Smart Daily Prescription ────────────────────── */}
      <div
        className="surface-raised"
        style={{
          padding: 'var(--sp-4)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--sp-5)',
          background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(0, 199, 190, 0.05) 100%), var(--surface-color)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--sp-3)',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-warning)', textTransform: 'uppercase' }}>
            Daily Tune-Up
          </span>
          <h3 style={{ margin: 'var(--sp-1) 0 2px', fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Focus on {PILLARS[recommendedPillar].fullTitle}
          </h3>
          <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)' }}>
            {PILLARS[recommendedPillar].corePrinciple}
          </p>
        </div>
        <button
          onClick={handleTuneUp}
          className="btn btn-primary"
          style={{
            padding: 'var(--sp-2) var(--sp-3)',
            fontSize: 'var(--type-xs)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.2s ease',
          }}
        >
          <span>{tuneUpActive ? 'Starting drill... ↓' : 'Tune up →'}</span>
        </button>
      </div>

      {/* ── Concentric Activity Rings & Level Overview ──── */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <ConcentricCraftRings
          stats={craftStats}
          activePillar={selectedPillar}
          onSelectPillar={(pId) => {
            userSelectedPillarRef.current = true;
            setSelectedPillar(pId);
          }}
        />

        {/* Pillar Selector Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--sp-2)',
          marginTop: 'var(--sp-4)',
        }}>
          {Object.values(PILLARS).map(p => {
            const isSelected = selectedPillar === p.id;
            const pStats = craftStats?.[p.id];
            const lvl = calcCraftLevel(pStats?.xp || 0, pStats?.tierCompletions);

            return (
              <button
                key={p.id}
                onClick={() => {
                  userSelectedPillarRef.current = true;
                  setSelectedPillar(p.id);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 'var(--sp-2) var(--sp-1)',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? p.bgTint : 'rgba(120,120,128,0.06)',
                  border: isSelected ? `1.5px solid ${p.color}` : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-family)',
                }}
              >
                <span style={{ fontSize: 16, marginBottom: 2 }}>{p.icon}</span>
                <span style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: isSelected ? p.color : 'var(--text-primary)' }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 9, color: lvl.isCapped ? 'var(--color-warning)' : 'var(--text-tertiary)', marginTop: 1, fontWeight: lvl.isCapped ? 600 : 400 }}>
                  Lvl {lvl.level} {lvl.isCapped && '🔒'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Pillar Mastery & Next Rank Banner */}
        {(() => {
          const activeStats = craftStats?.[selectedPillar];
          const lvl = calcCraftLevel(activeStats?.xp || 0, activeStats?.tierCompletions);
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--sp-2) var(--sp-3)',
              marginTop: 'var(--sp-3)',
              background: lvl.isCapped ? 'rgba(255, 149, 0, 0.08)' : 'rgba(120, 120, 128, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: lvl.isCapped ? '1px solid rgba(255, 149, 0, 0.3)' : '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13 }}>{lvl.isCapped ? '🔒' : '🎯'}</span>
                <span style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: lvl.isCapped ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                  {lvl.rank} (Lvl {lvl.level})
                </span>
              </div>
              <span style={{ fontSize: 'var(--type-xs)', color: lvl.isCapped ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                {lvl.nextRequirement}
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── Progressive Tier Ladder Selector ─────────────── */}
      <div style={{
        display: 'flex',
        gap: 'var(--sp-1)',
        padding: 3,
        background: 'rgba(120, 120, 128, 0.1)',
        borderRadius: 'var(--radius-pill)',
        marginBottom: tierLockMessage ? 'var(--sp-2)' : 'var(--sp-5)',
      }}>
        {TIERS.map(t => {
          const isSelected = selectedTier === t.id;
          const status = tierUnlockStatus[t.id];
          const isLocked = !status?.unlocked;

          return (
            <button
              key={t.id}
              onClick={() => {
                if (isLocked) {
                  if (navigator.vibrate) navigator.vibrate(20);
                  setTierLockMessage(status.reason);
                  setTimeout(() => setTierLockMessage(null), 3500);
                  return;
                }
                setSelectedTier(t.id);
              }}
              style={{
                flex: 1,
                padding: 'var(--sp-2) var(--sp-1)',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: isSelected ? 'var(--surface-color)' : 'transparent',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                color: isSelected
                  ? 'var(--text-primary)'
                  : isLocked
                  ? 'var(--text-tertiary)'
                  : 'var(--text-secondary)',
                fontWeight: isSelected ? 600 : 400,
                fontSize: 'var(--type-xs)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-family)',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                opacity: isLocked ? 0.6 : 1,
              }}
              title={isLocked ? status.reason : t.label}
            >
              <span>{t.label}</span>
              {isLocked && <Lock size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Floating Tier Lock Requirement Nudge */}
      <AnimatePresence>
        {tierLockMessage && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              fontSize: 'var(--type-xs)',
              color: 'var(--color-warning)',
              background: 'rgba(255, 149, 0, 0.1)',
              border: '1px solid rgba(255, 149, 0, 0.25)',
              padding: 'var(--sp-1) var(--sp-3)',
              borderRadius: 'var(--radius-pill)',
              textAlign: 'center',
              marginBottom: 'var(--sp-4)',
              fontWeight: 500,
            }}
          >
            🔒 {tierLockMessage}
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Exercise Deck Card ───────────────────────────── */}
      <div ref={deckRef} style={{ scrollMarginTop: '80px' }}>
        <AnimatePresence mode="wait">
          <m.div
            key={`${selectedPillar}-${selectedTier}-${currentExercise?.word || 'card'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: tuneUpActive
                ? `0 0 0 2px ${activePillarMeta.color}, 0 8px 32px rgba(255, 149, 0, 0.2)`
                : 'var(--shadow-sm)',
            }}
            exit={{ opacity: 0, y: -8 }}
            transition={springs.reveal}
            className="surface-raised"
            style={{
              padding: 'var(--sp-5)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${activePillarMeta.borderTint}`,
              position: 'relative',
              marginBottom: 'var(--sp-6)',
              transition: 'box-shadow 0.3s ease',
            }}
          >
          {/* Card Header: Contextual Drill Badge + Animated XP Delta + Audio Listen */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span style={{
                fontSize: 'var(--type-xs)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: activePillarMeta.color,
                background: activePillarMeta.bgTint,
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
              }}>
                {currentExercise?.type === 'nuance-duel'
                  ? `Nuance Duel · ${currentExercise.word} vs ${currentExercise.synonymWord}`
                  : (
                    <>
                      {selectedTier === 1 && `Drill · Spot & Fix`}
                      {selectedTier === 2 && `Drill · Polish & Cadence`}
                      {selectedTier === 3 && `Rehabilitate · "${currentExercise?.word || 'Practice Word'}"`}
                      {selectedTier === 4 && `Craft With · "${currentExercise?.word || 'Practice Word'}"`}
                    </>
                  )}
              </span>

              {/* Floating XP Delta indicator */}
              <AnimatePresence>
                {xpDelta && (
                  <m.span
                    key={xpDelta.key}
                    initial={{ opacity: 0, y: -4, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      fontSize: 'var(--type-xs)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: xpDelta.amount > 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                      color: xpDelta.amount > 0 ? 'var(--color-success)' : 'var(--color-error)',
                    }}
                  >
                    {xpDelta.amount > 0 ? `+${xpDelta.amount} XP` : `${xpDelta.amount} XP`}
                  </m.span>
                )}
              </AnimatePresence>
            </div>

            {/* Audio Cadence Listen Button */}
            <button
              onClick={() => {
                let text = '';
                if (currentExercise?.type === 'nuance-duel') {
                  const s1Word = currentExercise.correctMapping?.sentence1 || currentExercise.correctWord || currentExercise.word;
                  const s2Word = currentExercise.correctMapping?.sentence2 || currentExercise.synonymWord;
                  const s1Resolved = (currentExercise.sentence1 || '').replace(/_{2,}/g, s1Word);
                  if (currentExercise.subType === 'spot-the-difference' && currentExercise.sentence2) {
                    const s2Resolved = currentExercise.sentence2.replace(/_{2,}/g, s2Word);
                    text = `${s1Resolved}. ... ${s2Resolved}.`;
                  } else {
                    text = s1Resolved;
                  }
                } else {
                  text = currentExercise?.polishedSentence || currentExercise?.clunkySentence || currentExercise?.challenge || currentExercise?.samplePolished || '';
                }
                playSentenceCadence(text);
              }}
              aria-label="Listen to sentence cadence"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 'var(--type-xs)',
                padding: 'var(--sp-1) var(--sp-2)',
                borderRadius: 'var(--radius-pill)',
                transition: 'color 0.15s ease',
              }}
            >
              <Volume2 size={16} />
              <span>Listen</span>
            </button>
          </div>

          {deckLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8) 0' }}>
              <Loader2 className="animate-spin" size={24} style={{ color: activePillarMeta.color }} />
            </div>
          ) : (
            <div>
              {/* ── TIER 1: Spot & Fix (Options) ── */}
              {selectedTier === 1 && currentExercise?.type !== 'nuance-duel' && (
                <div>
                  <p style={{ fontSize: 'var(--type-lead)', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 var(--sp-2)' }}>
                    Which version flows most naturally?
                  </p>

                  <div style={{ marginBottom: 'var(--sp-3)' }}>
                    <BreathMeter sentence={currentExercise?.clunkySentence} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {currentExercise?.options?.map((opt, i) => {
                      const isChosen = selectedOption === i;
                      const hasAnswered = selectedOption !== null;
                      const isCorrectChoice = isChosen && i === currentExercise.correctIndex;
                      const isWrongChoice = isChosen && i !== currentExercise.correctIndex;
                      const isRevealedCorrect = hasAnswered && !isChosen && i === currentExercise.correctIndex;

                      return (
                        <button
                          key={i}
                          disabled={hasAnswered}
                          onClick={() => handleSelectOption(i)}
                          style={{
                            textAlign: 'left',
                            padding: 'var(--sp-3)',
                            borderRadius: 'var(--radius-md)',
                            border: isCorrectChoice || isRevealedCorrect
                              ? '1.5px solid var(--color-success)'
                              : isWrongChoice
                              ? '1.5px solid var(--color-warning)'
                              : '1px solid var(--border-color)',
                            background: isCorrectChoice || isRevealedCorrect
                              ? 'rgba(52, 199, 89, 0.08)'
                              : isWrongChoice
                              ? 'rgba(255, 149, 0, 0.08)'
                              : 'var(--surface-color)',
                            cursor: hasAnswered ? 'default' : 'pointer',
                            fontSize: 'var(--type-sm)',
                            lineHeight: 1.45,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-family)',
                            transition: 'all 0.15s ease',
                            opacity: hasAnswered && !isChosen && !isRevealedCorrect ? 0.5 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
                            <span>{opt}</span>
                            {(isCorrectChoice || isRevealedCorrect) && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }}>
                                ✓ Natural
                              </span>
                            )}
                            {isWrongChoice && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }}>
                                ✗ Clunky
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TIER 2: Sentence Polish (Tap-to-Swap) ── */}
              {selectedTier === 2 && currentExercise?.type !== 'nuance-duel' && (
                <div>
                  <p style={{ fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>
                    Tap a token to polish the cadence:
                  </p>

                  <div style={{
                    fontSize: 'var(--type-lead)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                    padding: 'var(--sp-3)',
                    background: 'rgba(120, 120, 128, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--sp-3)',
                  }}>
                    {currentExercise?.beforeText}
                    <span style={{
                      display: 'inline-block',
                      margin: '0 4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: swappedToken
                        ? (swappedToken.toLowerCase() === currentExercise.correctToken.toLowerCase() ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 149, 0, 0.15)')
                        : activePillarMeta.bgTint,
                      color: swappedToken
                        ? (swappedToken.toLowerCase() === currentExercise.correctToken.toLowerCase() ? 'var(--color-success)' : 'var(--color-warning)')
                        : activePillarMeta.color,
                      border: `1px solid ${activePillarMeta.borderTint}`,
                      fontWeight: 600,
                    }}>
                      {swappedToken || currentExercise?.currentWeakToken || '______'}
                    </span>
                    {currentExercise?.afterText}
                  </div>

                  <BreathMeter sentence={
                    swappedToken
                      ? `${currentExercise?.beforeText}${swappedToken}${currentExercise?.afterText}`
                      : currentExercise?.polishedSentence
                  } />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
                    {currentExercise?.swappableTokens?.map((tok, i) => {
                      const isChosen = swappedToken === tok;
                      const hasSwapped = swappedToken !== null;
                      const isCorrectTok = tok.toLowerCase() === currentExercise.correctToken.toLowerCase();
                      const isCorrectChoice = isChosen && isCorrectTok;
                      const isWrongChoice = isChosen && !isCorrectTok;
                      const isRevealedCorrect = hasSwapped && !isChosen && isCorrectTok;

                      return (
                        <button
                          key={i}
                          disabled={hasSwapped}
                          onClick={() => handleSwapToken(tok)}
                          style={{
                            padding: 'var(--sp-2) var(--sp-4)',
                            borderRadius: 'var(--radius-pill)',
                            border: isCorrectChoice || isRevealedCorrect
                              ? '1.5px solid var(--color-success)'
                              : isWrongChoice
                              ? '1.5px solid var(--color-warning)'
                              : '1px solid var(--border-color)',
                            background: isCorrectChoice || isRevealedCorrect
                              ? 'rgba(52, 199, 89, 0.12)'
                              : isWrongChoice
                              ? 'rgba(255, 149, 0, 0.12)'
                              : 'rgba(120, 120, 128, 0.08)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            fontSize: 'var(--type-sm)',
                            cursor: hasSwapped ? 'default' : 'pointer',
                            fontFamily: 'var(--font-family)',
                            transition: 'all 0.15s ease',
                            opacity: hasSwapped && !isChosen && !isRevealedCorrect ? 0.45 : 1,
                          }}
                        >
                          {tok} {isCorrectChoice && '✓'} {isWrongChoice && '✗'} {isRevealedCorrect && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── NUANCE DUEL (Context & Register Synonym Drill) ── */}
              {currentExercise?.type === 'nuance-duel' && (
                <div className="nuance-card-container">
                  {currentExercise.subType === 'which-word-fits' ? (
                    <div>
                      <p style={{ fontSize: 'var(--type-lead)', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 var(--sp-3)' }}>
                        Which word fits the tone and register most naturally?
                      </p>

                      {/* Sentence with blank */}
                      <div style={{
                        padding: 'var(--sp-4)',
                        background: 'rgba(120, 120, 128, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--type-body)',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--sp-4)',
                      }}>
                        {(() => {
                          const text = currentExercise.sentence1 || '';
                          const parts = text.split(/_{2,}/);
                          const targetWord = currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word;
                          const isMatch = (nuanceSelection || '').toLowerCase().trim() === (targetWord || '').toLowerCase().trim();
                          const blankEl = (
                            <span style={{
                              display: 'inline-block',
                              minWidth: 80,
                              textAlign: 'center',
                              padding: '2px 10px',
                              margin: '0 4px',
                              borderRadius: 'var(--radius-sm)',
                              borderBottom: '2px solid var(--accent-color)',
                              fontWeight: 700,
                              color: nuanceSelection
                                ? (isMatch ? 'var(--color-success)' : 'var(--color-warning)')
                                : 'var(--accent-color)',
                              background: nuanceSelection
                                ? (isMatch ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 149, 0, 0.12)')
                                : 'rgba(0, 113, 227, 0.08)',
                            }}>
                              {nuanceSelection || '________'}
                            </span>
                          );

                          if (parts.length <= 1) {
                            return <>{text} {blankEl}</>;
                          }

                          return parts.map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part}
                              {idx < arr.length - 1 && blankEl}
                            </React.Fragment>
                          ));
                        })()}
                      </div>

                      {/* Word Choice Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                        {duelChips.map((w, idx) => {
                          const isChosen = nuanceSelection === w;
                          const hasAnswered = nuanceSelection !== null;
                          const norm = s => (s || '').toLowerCase().trim();
                          const correctTarget = norm(currentExercise.correctWord || currentExercise.correctMapping?.sentence1 || currentExercise.word);
                          const isTarget = norm(w) === correctTarget;
                          const isCorrectChoice = isChosen && isTarget;
                          const isWrongChoice = isChosen && !isTarget;
                          const isRevealedCorrect = hasAnswered && !isChosen && isTarget;

                          return (
                            <button
                              key={idx}
                              disabled={hasAnswered}
                              onClick={() => handleNuanceDuelSelect(w)}
                              className="nuance-word-chip"
                              style={{
                                padding: 'var(--sp-3) var(--sp-4)',
                                borderRadius: 'var(--radius-md)',
                                border: isCorrectChoice || isRevealedCorrect
                                  ? '1.5px solid var(--color-success)'
                                  : isWrongChoice
                                  ? '1.5px solid var(--color-warning)'
                                  : '1px solid var(--border-color)',
                                background: isCorrectChoice || isRevealedCorrect
                                  ? 'rgba(52, 199, 89, 0.12)'
                                  : isWrongChoice
                                  ? 'rgba(255, 149, 0, 0.12)'
                                  : 'var(--surface-color)',
                                color: 'var(--text-primary)',
                                fontSize: 'var(--type-body)',
                                fontWeight: 600,
                                textAlign: 'center',
                                cursor: hasAnswered ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                opacity: hasAnswered && !isChosen && !isRevealedCorrect ? 0.45 : 1,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <span>{w}</span>
                                {(isCorrectChoice || isRevealedCorrect) && <span style={{ color: 'var(--color-success)', fontSize: 13 }}>✓</span>}
                                {isWrongChoice && <span style={{ color: 'var(--color-warning)', fontSize: 13 }}>✗</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Hint */}
                      {currentExercise.hint && (
                        <p style={{ fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                          💡 Hint: {currentExercise.hint}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Sub-type B: Spot the Difference (Tap to Assign) */
                    <div>
                      <p style={{ fontSize: 'var(--type-lead)', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 var(--sp-2)' }}>
                        Match each near-synonym to its natural context:
                      </p>

                      {/* Available Word Chips */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--sp-3)',
                        padding: 'var(--sp-3)',
                        background: 'rgba(120, 120, 128, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--sp-4)',
                      }}>
                        <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          TAP TO ASSIGN:
                        </span>
                        {duelChips.map((w, idx) => {
                          const isAssigned = nuanceSelection?.sentence1 === w || nuanceSelection?.sentence2 === w;
                          const isActive = nuanceActiveChip === w;
                          return (
                            <button
                              key={idx}
                              disabled={feedback !== null}
                              onClick={() => {
                                if (isAssigned) {
                                  // Clear assignment
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
                                padding: '4px 14px',
                                borderRadius: 'var(--radius-pill)',
                                border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                background: isActive ? 'rgba(0, 113, 227, 0.12)' : isAssigned ? 'rgba(120, 120, 128, 0.08)' : 'var(--surface-color)',
                                color: isAssigned ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                fontWeight: 600,
                                fontSize: 'var(--type-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                              }}
                            >
                              {w} {isAssigned && '✓'}
                            </button>
                          );
                        })}
                      </div>

                      {/* Sentence 1 Slot */}
                      <div style={{
                        padding: 'var(--sp-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        marginBottom: 'var(--sp-3)',
                        lineHeight: 1.6,
                        fontSize: 'var(--type-sm)',
                      }}>
                        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>
                          SENTENCE 1
                        </div>
                        {(() => {
                          const text = currentExercise.sentence1 || '';
                          const parts = text.split(/_{2,}/);
                          const btnEl = (
                            <button
                              type="button"
                              disabled={feedback !== null}
                              onClick={() => {
                                if (nuanceActiveChip) {
                                  setNuanceSelection(prev => ({
                                    sentence1: nuanceActiveChip,
                                    sentence2: prev?.sentence2 === nuanceActiveChip ? null : prev?.sentence2,
                                  }));
                                  setNuanceActiveChip(null);
                                } else if (nuanceSelection?.sentence1) {
                                  setNuanceSelection(prev => ({ ...prev, sentence1: null }));
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 10px',
                                margin: '0 4px',
                                borderRadius: 'var(--radius-pill)',
                                border: nuanceSelection?.sentence1 ? '1.5px solid var(--accent-color)' : '1.5px dashed var(--border-color)',
                                background: nuanceSelection?.sentence1 ? 'rgba(0, 113, 227, 0.1)' : 'transparent',
                                color: nuanceSelection?.sentence1 ? 'var(--accent-color)' : 'var(--text-tertiary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 'var(--type-xs)',
                              }}
                            >
                              {nuanceSelection?.sentence1 ? `${nuanceSelection.sentence1} ✕` : (nuanceActiveChip ? `Place "${nuanceActiveChip}"` : 'Tap to place')}
                            </button>
                          );

                          if (parts.length <= 1) {
                            return <>{text} {btnEl}</>;
                          }

                          return parts.map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part}
                              {idx < arr.length - 1 && btnEl}
                            </React.Fragment>
                          ));
                        })()}
                      </div>

                      {/* Sentence 2 Slot */}
                      <div style={{
                        padding: 'var(--sp-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        marginBottom: 'var(--sp-4)',
                        lineHeight: 1.6,
                        fontSize: 'var(--type-sm)',
                      }}>
                        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>
                          SENTENCE 2
                        </div>
                        {(() => {
                          const text = currentExercise.sentence2 || '';
                          const parts = text.split(/_{2,}/);
                          const btnEl = (
                            <button
                              type="button"
                              disabled={feedback !== null}
                              onClick={() => {
                                if (nuanceActiveChip) {
                                  setNuanceSelection(prev => ({
                                    sentence2: nuanceActiveChip,
                                    sentence1: prev?.sentence1 === nuanceActiveChip ? null : prev?.sentence1,
                                  }));
                                  setNuanceActiveChip(null);
                                } else if (nuanceSelection?.sentence2) {
                                  setNuanceSelection(prev => ({ ...prev, sentence2: null }));
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 10px',
                                margin: '0 4px',
                                borderRadius: 'var(--radius-pill)',
                                border: nuanceSelection?.sentence2 ? '1.5px solid var(--accent-color)' : '1.5px dashed var(--border-color)',
                                background: nuanceSelection?.sentence2 ? 'rgba(0, 113, 227, 0.1)' : 'transparent',
                                color: nuanceSelection?.sentence2 ? 'var(--accent-color)' : 'var(--text-tertiary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 'var(--type-xs)',
                              }}
                            >
                              {nuanceSelection?.sentence2 ? `${nuanceSelection.sentence2} ✕` : (nuanceActiveChip ? `Place "${nuanceActiveChip}"` : 'Tap to place')}
                            </button>
                          );

                          if (parts.length <= 1) {
                            return <>{text} {btnEl}</>;
                          }

                          return parts.map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part}
                              {idx < arr.length - 1 && btnEl}
                            </React.Fragment>
                          ));
                        })()}
                      </div>

                      {/* Check Match Button */}
                      {!feedback && (
                        <button
                          disabled={!nuanceSelection?.sentence1 || !nuanceSelection?.sentence2}
                          onClick={handleNuanceDuelMatch}
                          className="btn btn-primary"
                          style={{ width: '100%', marginBottom: 'var(--sp-2)' }}
                        >
                          {!nuanceSelection?.sentence1 || !nuanceSelection?.sentence2 ? 'Assign both words to check' : 'Check Nuances →'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recovery UI if exercise is somehow null */}
              {!currentExercise && !deckLoading && (
                <div style={{ textAlign: 'center', padding: 'var(--sp-8) var(--sp-4)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
                    Exercise took longer than expected to prepare.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => loadNextExercise(selectedPillar, selectedTier)}
                  >
                    Try Next Exercise →
                  </button>
                </div>
              )}

              {/* ── TIER 3: Vault Rehabilitation ── */}
              {selectedTier === 3 && (
                <div>
                  <div style={{
                    padding: 'var(--sp-3)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${activePillarMeta.color}`,
                    background: activePillarMeta.bgTint,
                    marginBottom: 'var(--sp-3)',
                  }}>
                    <p className="t-label" style={{ color: activePillarMeta.color, marginBottom: 4 }}>
                      {currentExercise?.vaultMistakeId ? 'Rehabilitate past slip:' : 'Clunky thought to rehabilitate:'}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: 'var(--type-body)',
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                      lineHeight: 1.45,
                    }}>
                      "{currentExercise?.challenge}"
                    </p>
                  </div>

                  {currentExercise?.hint && (
                    <p style={{ fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
                      💡 Hint: {currentExercise.hint}
                    </p>
                  )}

                  <form onSubmit={handleSubmitWriting}>
                    <textarea
                      rows={3}
                      value={userSubmission}
                      onChange={e => setUserSubmission(e.target.value)}
                      placeholder="Rewrite with natural harmony..."
                      style={{
                        width: '100%',
                        padding: 'var(--sp-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--type-body)',
                        fontFamily: 'var(--font-family)',
                        lineHeight: 1.5,
                        resize: 'none',
                        boxSizing: 'border-box',
                        marginBottom: 'var(--sp-3)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !userSubmission.trim()}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      {isSubmitting ? 'Evaluating...' : 'Redeem Sentence'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── TIER 4: Creative Synthesis ── */}
              {selectedTier === 4 && (
                <div>
                  <p style={{ fontSize: 'var(--type-lead)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 var(--sp-2)' }}>
                    {currentExercise?.prompt}
                  </p>

                  <p style={{ fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--sp-3)' }}>
                    Goal: {currentExercise?.guideline}
                  </p>

                  <form onSubmit={handleSubmitWriting}>
                    <textarea
                      rows={3}
                      value={userSubmission}
                      onChange={e => setUserSubmission(e.target.value)}
                      placeholder={`Compose a sentence using "${currentExercise?.word}"...`}
                      style={{
                        width: '100%',
                        padding: 'var(--sp-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--type-body)',
                        fontFamily: 'var(--font-family)',
                        lineHeight: 1.5,
                        resize: 'none',
                        boxSizing: 'border-box',
                        marginBottom: 'var(--sp-3)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !userSubmission.trim()}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      {isSubmitting ? 'Crafting...' : 'Submit Sentence'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── 2-Step Coaching Arc / Feedback Drawer ── */}
          <AnimatePresence>
            {feedback && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={springs.reveal}
                style={{
                  marginTop: 'var(--sp-4)',
                  paddingTop: 'var(--sp-3)',
                  borderTop: '0.5px solid var(--border-color)',
                }}
              >
                {feedback.isMastered ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                      <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: 'var(--color-success)' }}>
                        Mastered · +{feedback.xpAwarded || 20} XP
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {feedback.feedback}
                    </p>

                    {feedback.polishedVersion && (
                      <div style={{
                        padding: 'var(--sp-2) var(--sp-3)',
                        background: 'rgba(52, 199, 89, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--type-sm)',
                        color: 'var(--text-primary)',
                      }}>
                        ✨ {feedback.polishedVersion}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                      <button
                        onClick={() => loadNextExercise(selectedPillar, selectedTier)}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        Next Exercise →
                      </button>

                      <button
                        onClick={handleSaveToAnthology}
                        className="btn-ghost"
                        title="Save to Anthology"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 'var(--sp-2) var(--sp-3)',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <Bookmark size={16} color={savedToAnthologyToast ? 'var(--color-success)' : 'currentColor'} />
                        <span style={{ fontSize: 'var(--type-xs)' }}>
                          {savedToAnthologyToast ? 'Saved!' : 'Save'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : feedback.isConcluded ? (
                  /* Single Attempt Concluded with Needs Polish */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <XCircle size={20} style={{ color: 'var(--color-warning)' }} />
                      <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                        Needs Polish · -{feedback.xpDeducted || 5} XP
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {feedback.feedback}
                    </p>

                    {feedback.polishedVersion && (
                      <div style={{
                        padding: 'var(--sp-2) var(--sp-3)',
                        background: 'rgba(52, 199, 89, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--type-sm)',
                        color: 'var(--text-primary)',
                      }}>
                        ✨ Natural Cadence: {feedback.polishedVersion}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                      <button
                        onClick={() => loadNextExercise(selectedPillar, selectedTier)}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        Next Exercise →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Nudge for Freeform Attempt (Tier 3 & 4) */
                  <div style={{
                    padding: 'var(--sp-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 149, 0, 0.08)',
                    borderLeft: '3px solid var(--color-warning)',
                  }}>
                    <p style={{ margin: '0 0 var(--sp-1)', fontSize: 'var(--type-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                      Spotlight Nudge (Attempt {attemptCount})
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {feedback.nudge}
                    </p>
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </AnimatePresence>
      </div>

      {/* ── Your Anthology of Standout Sentences ─────────── */}
      {anthology && anthology.length > 0 && (
        <div style={{ marginTop: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
            <h3 style={{
              fontSize: 'var(--type-body)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Bookmark size={16} style={{ color: 'var(--color-warning)' }} />
              <span>Your Anthology</span>
              <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', fontWeight: 400 }}>({anthology.length})</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {anthology.slice(0, 10).map(item => (
              <div
                key={item.id}
                className="surface-raised"
                style={{
                  padding: 'var(--sp-3) var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 'var(--type-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: PILLARS[item.pillar]?.color || 'var(--color-warning)',
                    letterSpacing: '0.06em',
                  }}>
                    {item.word} · {PILLARS[item.pillar]?.label || 'Craft'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <button
                      onClick={() => playSentenceCadence(item.sentence)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--type-xs)',
                        padding: 2,
                      }}
                      title="Listen to native cadence"
                    >
                      <Volume2 size={13} />
                      <span>Listen</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFromAnthology(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 2,
                        borderRadius: 'var(--radius-pill)',
                        transition: 'color 0.15s ease',
                      }}
                      title="Delete from Anthology"
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-error)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 'var(--type-sm)',
                  lineHeight: 1.45,
                  color: 'var(--text-primary)',
                  fontStyle: 'italic',
                }}>
                  "{item.sentence}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom pad */}
      <div style={{ height: 'var(--sp-8)' }} />
    </div>
  );
}
