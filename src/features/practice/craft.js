/**
 * craft.js — shared Writing Studio engine data for the v2 practice screens.
 * Ported verbatim from src/pages/Studio.jsx (classic UI is the source of truth).
 */

export const PILLAR_KEYS = ['grammar', 'flow', 'context', 'punctuation'];

export const PILLARS = {
  grammar: { id: 'grammar', label: 'Grammar', fullTitle: 'Grammar & Harmony', corePrinciple: 'Keep actions and timing in sync across past and present.' },
  flow: { id: 'flow', label: 'Flow', fullTitle: 'Rhythm & Flow', corePrinciple: 'Help your thoughts glide from one breath to the next.' },
  context: { id: 'context', label: 'Context', fullTitle: 'Context & Register', corePrinciple: 'Put the word where it feels at home in conversation.' },
  punctuation: { id: 'punctuation', label: 'Punctuation', fullTitle: 'Punctuation & Cadence', corePrinciple: 'Punctuation is sheet music for your reader’s breath.' },
};

/** Resolve a stored pillar value (any case) to a pillar key, or null. */
export function normalizePillar(p) {
  const key = typeof p === 'string' ? p.toLowerCase().trim() : '';
  return PILLARS[key] ? key : null;
}

/** Map a single error tag to a pillar the same way Studio's recommendedPillar does. */
function pillarFromTag(t) {
  const lower = (t || '').toLowerCase();
  if (lower.includes('flow')) return 'flow';
  if (lower.includes('grammar')) return 'grammar';
  if (lower.includes('context') || lower.includes('vocab')) return 'context';
  if (lower.includes('punct')) return 'punctuation';
  return null;
}

/** Pillar of a vault mistake: explicit `pillar` field first, then its error tags. */
export function pillarOfMistake(m) {
  if (!m) return null;
  const direct = normalizePillar(m.pillar);
  if (direct) return direct;
  for (const t of m.errorTags || []) {
    const p = pillarFromTag(t);
    if (p) return p;
  }
  return null;
}

/** Studio.jsx recommendedPillar: most frequent pillar across all vault error tags, default 'flow'. */
export function getRecommendedPillar(vault) {
  if (!vault || vault.length === 0) return 'flow';
  const tagCounts = {};
  vault.forEach(m => {
    m.errorTags?.forEach(t => {
      const p = pillarFromTag(t);
      if (p) tagCounts[p] = (tagCounts[p] || 0) + 1;
    });
  });
  const sorted = Object.entries(tagCounts).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || 'flow';
}

/** True when at least one vault error tag maps to a pillar, i.e. getRecommendedPillar used real slips. */
export function hasPillarTaggedSlips(vault) {
  return (vault || []).some(m => m.errorTags?.some(t => pillarFromTag(t)));
}

/** Studio.jsx tierUnlockStatus (v1 unlock math). `vault` is ALL mistakes (open + redeemed). */
export function getTierUnlockStatus(pillarData = {}, vault = []) {
  const completions = pillarData?.tierCompletions || {};
  const totalPillarSolved = pillarData?.solved || 0;
  return {
    1: { unlocked: true, reason: '' },
    2: {
      unlocked: (completions[1] || 0) >= 3 || totalPillarSolved >= 3,
      reason: `Complete ${Math.max(0, 3 - (completions[1] || 0))} more Spot & Fix drills to unlock Sentence Polish`,
    },
    3: {
      unlocked: (completions[2] || 0) >= 3 || (vault && vault.length > 0) || totalPillarSolved >= 6,
      reason: `Complete ${Math.max(0, 3 - (completions[2] || 0))} more Polish drills to unlock Vault Rehabilitation`,
    },
    4: {
      unlocked: (completions[3] || 0) >= 2 || totalPillarSolved >= 8,
      reason: `Complete ${Math.max(0, 2 - (completions[3] || 0))} more Vault Rehab drills to unlock Creative Writing`,
    },
  };
}

/* ── Audio Speech Synthesis (Studio.jsx playSentenceCadence) ── */
export function playSentenceCadence(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.90;
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

/* ── Fisher-Yates Shuffler ── */
export function shuffleArray(arr) {
  if (!Array.isArray(arr) || arr.length <= 1) return arr ? [...arr] : [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ── Curated Offline Seed Bank (verbatim from Studio.jsx) ── */
export const SEED_BANK = {
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
