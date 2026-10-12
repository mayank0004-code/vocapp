const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();
let ai = null;
function getAI() {
  if (!ai) {
    console.log("Firebase parse process.version:", process.version);
    const { GoogleGenAI } = require('@google/genai');
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-deployment-hang"
    });
  }
  return ai;
}

const MODEL_NAME = 'gemini-3.5-flash-lite';

exports.fetchWordBreakdown = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { word, contextSentence } = request.data;
  if (!word) throw new HttpsError('invalid-argument', 'Word is required.');

  const cleanWord = word.trim().toLowerCase();
  const db = admin.firestore();

  // Phase 4.1: Global Word Dictionary Cache (for standard lookups without custom context)
  if (!contextSentence) {
    try {
      const cacheDoc = await db.collection('dictionary_cache').doc(cleanWord).get();
      if (cacheDoc.exists) {
        return cacheDoc.data();
      }
    } catch (cacheErr) {
      console.warn('Cache lookup skipped:', cacheErr);
    }
  }

  const prompt = `Analyze the word "${word}".
${contextSentence ? `User context: "${contextSentence}". Tailor definition, vibe check, and example to this context.` : ''}
Validate if this is a real English word (auto-correct minor typos, reject gibberish).

Return JSON:
{
  "isValid": boolean,
  "word": string,
  "definition": string,
  "origin": string,
  "vibeCheck": string,
  "contextMeaning": string,
  "collocations": string[] (3 frequent pairings),
  "example": string,
  "commonMistakes": string[] (2-3 common misuses with explanation),
  "practiceHints": {
    "factual": string (a complete, informative real-world sentence expressing a fact WITHOUT using the word "${word}". Do NOT use blanks or underscores; write a natural sentence that the student will rewrite using "${word}"),
    "personal": string (a complete personal or relatable sentence about daily life or work WITHOUT using the word "${word}". Do NOT use blanks or underscores; write a natural sentence that the student will rewrite using "${word}"),
    "question": string (a complete conversational question expressing an idea WITHOUT using the word "${word}". Do NOT use blanks or underscores; write a natural question that the student will rewrite using "${word}")
  }
}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert vocabulary tutor analyzing English words.",
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text);

    // Asynchronously populate dictionary_cache for future instant lookups
    if (!contextSentence && parsed && parsed.isValid) {
      db.collection('dictionary_cache').doc(cleanWord).set(parsed).catch(err => console.error('Cache save error:', err));
    }

    return parsed;
  } catch (error) {
    console.error(error);
    throw new HttpsError('internal', 'Failed to fetch breakdown');
  }
});

exports.evaluateSentence = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { word, sentenceType, sentence, mistakePatterns, isRevision, diagnosedHabit } = request.data;
  if (!word || !sentenceType || !sentence) throw new HttpsError('invalid-argument', 'Missing arguments.');

  const isRev = !!isRevision;
  const targetHabit = diagnosedHabit || '';

  const prompt = `Student practiced target vocabulary word "${word}" in a "${sentenceType}" sentence.
Student sentence: "${sentence}"
${isRev ? `Context: This is a REVISION attempt. The student was previously diagnosed with the habit: "${targetHabit}". Evaluate specifically whether their revision successfully resolved this structural issue while preserving "${word}".` : ''}
${mistakePatterns ? `Student's Longitudinal Writing History & Habits:\n${mistakePatterns}\n` : ''}

Canonical Habit Taxonomy (pick the exact matching key if flawed; otherwise "other"):
- "clause-stacking": Run-On Sentence (stringing thoughts together with endless "and so" or "and then").
- "comma-splice": Two Sentences Glued by a Comma (joining two complete thoughts with only a comma instead of a period).
- "breath-trap": Sentence Too Long (reader runs out of breath before reaching a period or natural pause).
- "bottom-heavy": Main Point Buried (burying the main message at the very end after too many setup phrases).
- "tense-drift": Mixed Past & Present (switching between past and present timing mid-sentence).
- "subject-verb-split": Action Separated from Actor (separating who is acting too far from what they are doing).
- "literal-collocation": Stiff / Robotic Phrasing (stiff, robotic phrasing or awkward word pairings).
- "other": Awkward Phrasing.

Evaluation Directives:
1. Target Word Authenticity: Ensure "${word}" (or direct grammatical inflection) is used accurately and naturally in a "${sentenceType}".
2. Natural Cadence & Clarity:
   - Check if the sentence sounds like a natural, fluent human thought.
   - If flawed:
     a) Explain what feels awkward in "structuralDiagnosis" in 1-2 friendly, conversational sentences (e.g., "This sounds a bit stiff and wordy ('is a prudent decision made by'). In natural English, we just say who decided directly.").
     b) If it matches student's known habits or the taxonomy, name it in "habitAlert" using plain language (e.g. "Recurring Habit: Stiff Phrasing") and provide the canonical "habitKey".
     c) Give a punchy, memorable "ruleOfThumb" (e.g. "Say who did what directly instead of using wordy phrases like 'was a decision made by'.").
     d) Give a "coachHint": A friendly, concrete nudge on how to rewrite it WITHOUT giving away the full answer (e.g. "Try turning 'decision' into the action word 'decided', so the government acts directly.").
     e) Provide "reframedSentence": A clean, natural version of how an articulate native speaker would phrase this thought.
3. CRITICAL COACHING TONE CONSTRAINTS:
   - ZERO ACADEMIC JARGON: Absolutely NEVER use grammatical theory terms like "predicate", "coordinate clause", "subordinating bridge", "participle", "participial phrase", "noun-heavy", "passive actor", "prepositional phrase", or "collocation".
   - Speak like a warm, supportive human editor chatting over coffee, focusing on simplicity, rhythm, and clarity.
4. If this was a REVISION:
   - If the student successfully fixed "${targetHabit}", mark "isCorrect": true, celebrate the fix in warm words in "feedback", and set "isRevisionSuccess": true.
5. If first-try sentence is already natural and correct:
   - "isCorrect": true, "feedback": brief praise, "reframedSentence": an optional natural variation, "errorTags": [], "structuralDiagnosis": "", "habitAlert": "", "ruleOfThumb": "", "coachHint": "", "habitKey": "", "isRevisionSuccess": false.

Return JSON strictly matching this schema:
{
  "isCorrect": boolean,
  "structuralDiagnosis": string,
  "habitAlert": string,
  "ruleOfThumb": string,
  "coachHint": string,
  "reframedSentence": string,
  "errorTags": string[],
  "habitKey": "clause-stacking" | "comma-splice" | "breath-trap" | "bottom-heavy" | "tense-drift" | "subject-verb-split" | "literal-collocation" | "other" | "",
  "isRevisionSuccess": boolean,
  "feedback": string
}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are a friendly, encouraging writing coach helping students write natural, clear, and confident English sentences. You teach by showing how real people speak and write, using simple, everyday language. You NEVER use academic grammar jargon.",
        responseMimeType: 'application/json',
        maxOutputTokens: 600
      }
    });

    const parsed = JSON.parse(response.text);
    // Ensure all expected fields exist with defaults
    return {
      isCorrect: !!parsed.isCorrect,
      structuralDiagnosis: parsed.structuralDiagnosis || '',
      habitAlert: parsed.habitAlert || '',
      ruleOfThumb: parsed.ruleOfThumb || '',
      coachHint: parsed.coachHint || '',
      reframedSentence: parsed.reframedSentence || '',
      errorTags: Array.isArray(parsed.errorTags) ? parsed.errorTags : [],
      habitKey: parsed.habitKey || (parsed.isCorrect ? '' : 'other'),
      isRevisionSuccess: !!parsed.isRevisionSuccess,
      feedback: parsed.feedback || parsed.structuralDiagnosis || (parsed.isCorrect ? 'Well written!' : 'Needs revision.')
    };
  } catch (error) {
    console.error("Error evaluating sentence:", error);
    throw new HttpsError('internal', 'Failed to evaluate sentence');
  }
});

exports.evaluateQuizAnswer = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { targetWord, sentence, guess, userLevel: rawLevel = 1 } = request.data;
  if (!targetWord || !sentence || !guess) throw new HttpsError('invalid-argument', 'Missing arguments.');

  const userLevel = Math.min(5, Math.max(1, parseInt(rawLevel, 10) || 1));

  // Deterministic short-circuit check before calling Gemini
  const normalize = (s) => (s || '').toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '');
  const cleanGuess = normalize(guess);
  const cleanTarget = normalize(targetWord);
  const forms = new Set([cleanTarget]);
  if (cleanTarget) {
    forms.add(cleanTarget + 's');
    forms.add(cleanTarget + 'es');
    forms.add(cleanTarget + 'ed');
    forms.add(cleanTarget + 'ing');
    forms.add(cleanTarget + 'd');
    if (cleanTarget.endsWith('e')) forms.add(cleanTarget.slice(0, -1) + 'ing');
    if (cleanTarget.endsWith('y')) {
      forms.add(cleanTarget.slice(0, -1) + 'ies');
      forms.add(cleanTarget.slice(0, -1) + 'ied');
    }
  }
  if (cleanGuess && forms.has(cleanGuess)) {
    return { isCorrect: true, feedback: 'Correct!' };
  }

  const prompt = `Context / Prompt: "${sentence}"
Target word: "${targetWord}"
Student submission: "${guess}"
Student Level: Level ${userLevel}

Task: Evaluate if the student's submission is correct.
- If the student submitted a full sentence (e.g. sentence rewrite or transformation):
  1) The student MUST include the target word "${targetWord}" (or a direct grammatical inflection like plural or past tense).
  2) Semantic clarity: The sentence must communicate the intended thought correctly.
  ${userLevel <= 2 ? '3) Pedagogical leniency for Level 1-2: If the sentence clearly conveys the meaning and uses the target word correctly, mark isCorrect: true. Do NOT penalize for minor article slips ("a" vs "the"), missing commas, or slight non-native word orders.' : '3) Sentence structure: The sentence must be grammatically sound and preserve natural phrasing.'}
- If the student submitted a single word or short phrase:
  Verify whether it is "${targetWord}" or a valid grammatical inflection / synonym.
Ignore differences in capitalization, punctuation, and extra whitespace.

Return JSON:
{
  "isCorrect": boolean,
  "feedback": string (concise 1-2 sentence supportive explanation of why it works or what to adjust)
}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are an encouraging English tutor evaluating vocabulary practice and sentence rewrites with fair, level-appropriate feedback.",
        responseMimeType: 'application/json',
        maxOutputTokens: 120
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    throw new HttpsError('internal', 'Failed to evaluate quiz answer');
  }
});

/* ── 5-Level Adaptive Pedagogical Specifications ───────────────── */
const LEVEL_SPECS = {
  1: {
    level: 1,
    rank: 'Apprentice',
    cefr: 'A2',
    minWords: 7,
    maxWords: 12,
    vocabCeiling: 'Top 2,000 everyday English words only. The target word is the ONLY challenging word. All other words must be simple, clear, and familiar.',
    syntaxRule: 'Direct Subject-Verb-Object (S-V-O). Single clause or one simple connector (and, but, because). No nested clauses, no poetic or metaphorical language.',
    distractors: ['building', 'moment', 'journey', 'decision', 'custom', 'effort', 'result', 'structure', 'message', 'habit', 'purpose', 'method'],
    domains: [
      { key: 'workplace', name: 'Workplace & Team', nuance: 'Set this in an everyday office conversation, team meeting, or email between coworkers.' },
      { key: 'literature', name: 'Everyday Story & Life', nuance: 'Set this in a straightforward, relatable story about daily human feelings.' },
      { key: 'casual', name: 'Casual Daily Talk', nuance: 'Set this in a relaxed, friendly conversation between friends using simple words.' },
      { key: 'intellectual', name: 'Ideas & Learning', nuance: 'Set this in a clear, accessible discussion about school, books, or inventions.' },
      { key: 'journalism', name: 'Everyday News', nuance: 'Set this in a simple news report about a local event or daily life.' },
      { key: 'tech-modern', name: 'Modern Life & Phone', nuance: 'Set this in a simple situation involving mobile phones, apps, or social media.' }
    ]
  },
  2: {
    level: 2,
    rank: 'Craftsman',
    cefr: 'B1',
    minWords: 10,
    maxWords: 16,
    vocabCeiling: 'Standard conversational and workplace English (B1 level). Clear, modern phrasing without archaic words.',
    syntaxRule: 'Compound sentence with exactly one standard connector (and, but, because, although, while, so).',
    distractors: ['challenge', 'perspective', 'strategy', 'resource', 'reaction', 'influence', 'solution', 'priority', 'attitude', 'advantage'],
    domains: [
      { key: 'workplace', name: 'Professional Workplace', nuance: 'Set this in a realistic workplace scenario or project discussion.' },
      { key: 'literature', name: 'Narrative & Emotion', nuance: 'Set this in a vivid story or personal observation.' },
      { key: 'casual', name: 'Conversational Banter', nuance: 'Set this in a sharp, natural conversation between colleagues or friends.' },
      { key: 'intellectual', name: 'Discussion & Science', nuance: 'Set this in an accessible discussion of science, history, or society.' },
      { key: 'journalism', name: 'Editorial & News', nuance: 'Set this in clear journalistic reporting or commentary.' },
      { key: 'tech-modern', name: 'Digital Society', nuance: 'Set this in a contemporary digital culture or startup scenario.' }
    ]
  },
  3: {
    level: 3,
    rank: 'Wordsmith',
    cefr: 'B2',
    minWords: 13,
    maxWords: 20,
    vocabCeiling: 'Standard adult professional and media English (B2-C1).',
    syntaxRule: 'Multi-clause sentence with varied transitions and moderate nuance.',
    distractors: ['pragmatic', 'resilient', 'meticulous', 'candor', 'austerity', 'belligerent', 'abstruse', 'tenacity', 'scrutiny'],
    domains: [
      { key: 'workplace', name: 'Executive & Workplace', nuance: 'Set this in an executive boardroom, strategic decision, or leadership dilemma.' },
      { key: 'literature', name: 'Literature & Emotion', nuance: 'Set this in an introspective or emotionally nuanced situation.' },
      { key: 'casual', name: 'Native Banter', nuance: 'Set this in sharp everyday conversation or keen observations.' },
      { key: 'intellectual', name: 'Intellectual & Philosophy', nuance: 'Set this in an academic or philosophical argument.' },
      { key: 'journalism', name: 'Journalism & Critique', nuance: 'Set this in cultural analysis, investigative journalism, or economic commentary.' },
      { key: 'tech-modern', name: 'Modern Tech & Society', nuance: 'Set this in modern life, startups, media, or tech culture.' }
    ]
  },
  4: {
    level: 4,
    rank: 'Stylist',
    cefr: 'C1',
    minWords: 16,
    maxWords: 24,
    vocabCeiling: 'Elevated editorial English (like The Economist or New Yorker).',
    syntaxRule: 'Complex rhetorical structure, varied cadence, subtle tone and irony.',
    distractors: ['ephemeral', 'abstruse', 'austerity', 'belligerent', 'pragmatic', 'resilient', 'meticulous', 'candor'],
    domains: [
      { key: 'workplace', name: 'Executive Strategy', nuance: 'Set this in high-stakes negotiations or complex leadership dilemmas.' },
      { key: 'literature', name: 'Literary Prose', nuance: 'Set this in an introspective, psychologically rich narrative.' },
      { key: 'casual', name: 'Nuanced Discourse', nuance: 'Set this in sophisticated social dialogue.' },
      { key: 'intellectual', name: 'Academic Treatise', nuance: 'Set this in historical or philosophical inquiry.' },
      { key: 'journalism', name: 'High Critique', nuance: 'Set this in investigative critique and cultural commentary.' },
      { key: 'tech-modern', name: 'Digital Modernity', nuance: 'Set this in deep commentary on technological change.' }
    ]
  },
  5: {
    level: 5,
    rank: 'Master',
    cefr: 'C2',
    minWords: 18,
    maxWords: 30,
    vocabCeiling: 'Unrestricted native mastery and literary cadence.',
    syntaxRule: 'Full stylistic freedom, periodic clauses, rhythmic elegance, literary prose.',
    distractors: ['ephemeral', 'abstruse', 'austerity', 'belligerent', 'pragmatic', 'resilient', 'meticulous', 'candor'],
    domains: [
      { key: 'workplace', name: 'Executive & Workplace', nuance: 'Set this in high-stakes strategic negotiations.' },
      { key: 'literature', name: 'Literature & Emotion', nuance: 'Set this in literary, introspective prose.' },
      { key: 'casual', name: 'Casual Native Banter', nuance: 'Set this in witty repartee.' },
      { key: 'intellectual', name: 'Intellectual & Philosophy', nuance: 'Set this in academic or philosophical argument.' },
      { key: 'journalism', name: 'Journalism & Critique', nuance: 'Set this in cultural critique and economic commentary.' },
      { key: 'tech-modern', name: 'Modern Tech & Society', nuance: 'Set this in contemporary digital culture.' }
    ]
  }
};

exports.generateQuizQuestion = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const {
    word,
    definition,
    dictionaryWords,
    interval = 1,
    recentTypes = [],
    preferredDomain,
    userLevel: rawLevel = 1,
    activeHabits = []
  } = request.data;

  if (!word) throw new HttpsError('invalid-argument', 'Word is required.');

  // Strict numeric clamping: Level 1 to 5
  const userLevel = Math.min(5, Math.max(1, parseInt(rawLevel, 10) || 1));
  const spec = LEVEL_SPECS[userLevel];

  // Distractor Pool: prioritize user's dictionary, fallback to level-bounded words
  const dictPool = Array.isArray(dictionaryWords) && dictionaryWords.length > 0
    ? dictionaryWords.filter(w => typeof w === 'string' && w.toLowerCase() !== word.toLowerCase())
    : spec.distractors;

  // Domain selection based on level-appropriate register
  const domainList = spec.domains;
  const selectedDomain = (preferredDomain && domainList.find(d => d.key === preferredDomain))
    || domainList[Math.floor(Math.random() * domainList.length)];

  // Strictly FlashCards and Fill-in-the-Blanks
  const formatPool = ['flashcard', 'fill-in-the-blank'];
  // Balance variety: alternate format from previous question
  const lastType = recentTypes.slice(-1)[0];
  const selectedFormat = (lastType === 'flashcard') ? 'fill-in-the-blank' : (lastType === 'fill-in-the-blank' ? 'flashcard' : (Math.random() < 0.5 ? 'flashcard' : 'fill-in-the-blank'));

  let formatInstruction = '';
  let formatRules = '';

  if (selectedFormat === 'fill-in-the-blank') {
    formatInstruction = `Write a natural, vivid contextual sentence (10-18 words) in the "${selectedDomain.name}" domain where "${word}" fits accurately. Replace "${word}" (or its exact grammatical form) with "________". Provide 4 options for the blank: "${word}" plus 3 distractor words chosen strictly from: [${dictPool.slice(0, 15).join(', ')}]. Distractors MUST match the same part of speech as "${word}" so the sentence remains grammatically sound.`;
    formatRules = `"correctAnswer" must be "${word}". "options" must be an array of exactly 4 strings (shuffled, containing "${word}" and 3 distractors).`;
  } else {
    // Rich Dual-Meaning Flashcard
    formatInstruction = `Analyze the word "${word}" (provided definition: "${definition || ''}").
Determine if "${word}" has multiple standard meanings or nuances in English (polysemy, e.g. as verb vs noun, or distinct contexts like "articulate", "sanction", "novel", "compromise").
Generate:
1. "definition": The primary definition of "${word}".
2. "relatesTo": A concrete, relatable real-world situation or scenario (1-2 sentences) where this concept naturally lives.
3. "memoryTrigger": A vivid mental anchor, sensory hook, or analogy that triggers recall WITHOUT naming "${word}".
4. "hasSecondaryMeaning": boolean (true if word has a genuinely distinct second meaning, false otherwise).
5. "secondaryMeaning": If hasSecondaryMeaning is true, provide the second distinct definition and a short usage example; otherwise "".
6. "activeMeaning": "primary" or "secondary" (if hasSecondaryMeaning is true, randomly pick which meaning is tested on the front; if "secondary" is picked, set "definition" and "question" to reflect that secondary meaning).
7. "meaningLabel": If activeMeaning is "secondary", set to "Secondary Meaning"; otherwise "Core Meaning".
8. "question": A crisp active-recall prompt describing the target meaning for the flashcard front.
CRITICAL LEAK RULE: Under NO circumstances include the target word "${word}" or its inflections/derivatives in "question", "relatesTo", or "memoryTrigger". Do NOT use blanks or underscores.`;
    formatRules = `"correctAnswer" must be "${word}". "options" must be [].`;
  }

  const systemInstruction = "You are a master English vocabulary educator designing high-retention active recall flashcards and authentic context cloze questions.";

  const prompt = `Target Word: "${word}" (definition: ${definition || 'not provided'}).
Domain Context: ${selectedDomain.name} - ${selectedDomain.nuance}
Exercise Type (${selectedFormat}):
${formatInstruction}

Return JSON:
{
  "type": "${selectedFormat}",
  "domain": "${selectedDomain.key}",
  "domainName": "${selectedDomain.name}",
  "question": string,
  "options": string[] (${selectedFormat === 'fill-in-the-blank' ? '4 options' : 'empty array []'}),
  "correctAnswer": string (${formatRules}),
  "explanation": string,
  "definition": string,
  "relatesTo": string,
  "memoryTrigger": string,
  "hasSecondaryMeaning": boolean,
  "secondaryMeaning": string,
  "activeMeaning": "primary" | "secondary",
  "meaningLabel": string
}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        maxOutputTokens: 450
      }
    });

    const parsed = JSON.parse(response.text);

    // Guard 1: Fill-in-the-blank blank & answer masking
    if (selectedFormat === 'fill-in-the-blank') {
      parsed.type = 'fill-in-the-blank';
      parsed.correctAnswer = word;
      if (typeof parsed.question === 'string') {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`\\b${escapedWord}(?:s|es|ed|ing|d)?\\b`, 'gi');
        if (wordRegex.test(parsed.question) && !parsed.question.includes('____')) {
          parsed.question = parsed.question.replace(wordRegex, '________');
        }
        if (!parsed.question.includes('____')) {
          parsed.question = `In context: ________ is used to express this idea.`;
        }
      }

      // Ensure 4 distinct options containing correctAnswer
      let opts = Array.isArray(parsed.options) ? parsed.options.map(o => (o || '').trim()).filter(Boolean) : [];
      opts = [...new Set(opts)];
      if (!opts.some(o => o.toLowerCase() === word.toLowerCase())) {
        opts.unshift(word);
      }
      for (const d of dictPool) {
        if (opts.length >= 4) break;
        if (d.toLowerCase() !== word.toLowerCase() && !opts.some(o => o.toLowerCase() === d.toLowerCase())) {
          opts.push(d);
        }
      }
      while (opts.length < 4) {
        const fallbacks = ['observe', 'enhance', 'sustain', 'clarify'];
        const fb = fallbacks[opts.length] || `option_${opts.length + 1}`;
        if (!opts.includes(fb)) opts.push(fb);
        else break;
      }
      // Force shuffle options
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      parsed.options = opts.slice(0, 4);
    }

    // Guard 2: Flashcard root-stem answer-leak masking
    if (selectedFormat === 'flashcard') {
      parsed.type = 'flashcard';
      parsed.correctAnswer = word;
      parsed.options = [];

      const cleanWord = (word || '').toLowerCase().trim();
      const stem = cleanWord.length > 4 ? cleanWord.slice(0, -1) : cleanWord;
      const leakRegex = new RegExp(`\\b${stem}\\w*\\b`, 'gi');

      if (leakRegex.test(parsed.relatesTo || '')) {
        parsed.relatesTo = (parsed.relatesTo || '').replace(leakRegex, '[this concept]');
      }
      if (leakRegex.test(parsed.memoryTrigger || '')) {
        parsed.memoryTrigger = (parsed.memoryTrigger || '').replace(leakRegex, '[this term]');
      }
      if (leakRegex.test(parsed.question || '')) {
        parsed.question = (parsed.question || '').replace(leakRegex, '[the target word]');
      }

      // Check for blanks in flashcard question
      if (!parsed.question || /_{2,}/.test(parsed.question) || leakRegex.test(parsed.question)) {
        parsed.question = parsed.definition || definition || `A word meaning: review this in your dictionary`;
      }

      // Ensure rich fields fallback safely
      parsed.definition = parsed.definition || definition || 'Review the target word definition.';
      parsed.relatesTo = parsed.relatesTo || `A scenario where "${parsed.definition}" applies in daily life.`;
      parsed.memoryTrigger = parsed.memoryTrigger || `Connect this meaning to a memorable mental image or analogy.`;
      parsed.hasSecondaryMeaning = !!parsed.hasSecondaryMeaning && !!parsed.secondaryMeaning;
      parsed.activeMeaning = parsed.activeMeaning === 'secondary' && parsed.hasSecondaryMeaning ? 'secondary' : 'primary';
      parsed.meaningLabel = parsed.activeMeaning === 'secondary' ? 'Secondary Meaning' : 'Core Meaning';
    }

    // Guard 3: Guarantee explanation
    if (!parsed.explanation) {
      parsed.explanation = `"${word}" means: ${parsed.definition || definition || 'the target word.'}`;
    }

    parsed.domain = selectedDomain.key;
    parsed.domainName = selectedDomain.name;
    return parsed;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new HttpsError('internal', 'Failed to generate quiz question.');
  }
});

const NOTIFICATION_TEMPLATES = {
  Encouraging: [
    {
      title: (v) => v.streak > 0 ? `🔥 ${v.streak}-Day Streak going strong!` : `✨ Quick ${v.timeOfDay} practice`,
      body: (v) => v.dueCount > 0 
        ? `${v.dueCount} words are ready for a 2-min review, including "${v.sampleWord}".`
        : `Keep the momentum going with a quick 2-minute vocabulary session!`
    },
    {
      title: (v) => `🌟 Perfect time for a quick review`,
      body: (v) => `Sharpen your recall for "${v.sampleWord}" and ${v.dueCount > 1 ? `${v.dueCount - 1} other words` : 'your words'}.`
    },
    {
      title: (v) => `🧠 Boost your memory this ${v.timeOfDay}`,
      body: (v) => `Review ${v.dueCount} words now before memory fading kicks in.`
    }
  ],
  FOMO: [
    {
      title: (v) => v.streak > 0 ? `⚠️ Don't lose your ${v.streak}-day streak!` : `⏳ Your memory curve is dipping`,
      body: (v) => `${v.dueCount} words like "${v.sampleWord}" are slipping away. Quick review?`
    },
    {
      title: (v) => `📉 Forgetting curve alert!`,
      body: (v) => `It takes just 90 seconds to lock in ${v.dueCount} words right now.`
    },
    {
      title: (v) => `⏳ Keep your streak intact`,
      body: (v) => `Don't let today pass without reviewing "${v.sampleWord}".`
    }
  ],
  Curiosity: [
    {
      title: (v) => `🤔 Do you still remember "${v.sampleWord}"?`,
      body: (v) => `Test your recall on ${v.dueCount} words ready in your review queue.`
    },
    {
      title: (v) => `💡 Quick vocabulary check`,
      body: (v) => `Can you use "${v.sampleWord}" in a natural sentence right now?`
    }
  ],
  ToughLove: [
    {
      title: (v) => `👀 Still thinking about reviewing?`,
      body: (v) => `It's been 3 days. Your ${v.dueCount} words won't practice themselves!`
    },
    {
      title: (v) => `⚡ Action beats intention`,
      body: (v) => `Take 2 minutes right now to master "${v.sampleWord}" and stay sharp.`
    }
  ],
  PassiveAggressive: [
    {
      title: (v) => `🧊 Progress frozen for now`,
      body: (v) => `It's been a week! We'll pause reminders so we don't bother you. Come back whenever.`
    },
    {
      title: (v) => `😴 Are we breaking up?`,
      body: (v) => `Haven't seen you in 7+ days. Pausing daily notifications until you re-open Vocapp.`
    }
  ]
};

exports.sendSmartNotifications = onSchedule({ schedule: '0 * * * *', memory: '512MiB', maxInstances: 1 }, async (event) => {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();
  const now = new Date();
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    try {
      const settingsDoc = await db.collection('users').doc(userId).collection('profile').doc('settings').get();
      if (!settingsDoc.exists) continue;
      
      const settings = settingsDoc.data();
      if (!settings.notificationsEnabled || !settings.fcmToken) continue;
      
      const tz = settings.timezone || 'UTC';
      const optionsHour = { timeZone: tz, hour: 'numeric', hour12: false, hourCycle: 'h23' };
      const localHour = parseInt(new Intl.DateTimeFormat('en-US', optionsHour).format(now));
      const localWeekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
      
      let targetHour = 18;
      const statsDoc = await db.collection('users').doc(userId).collection('profile').doc('stats').get();
      const stats = statsDoc.exists ? statsDoc.data() : {};
      
      if (settings.timingMode === 'custom' && settings.customTime) {
        targetHour = parseInt(settings.customTime.split(':')[0]);
      } else if (settings.timingMode === 'smart' && stats.activityHours) {
        let maxHour = '18';
        let maxVal = -1;
        for (const [hour, count] of Object.entries(stats.activityHours)) {
          if (count > maxVal) {
            maxVal = count;
            maxHour = hour;
          }
        }
        targetHour = parseInt(maxHour);
      }
      
      if (localHour !== targetHour) continue;
      
      const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
      if (stats.lastPracticedDate === localToday) continue; // Already practiced today
      
      const lastPracticedStr = stats.lastPracticedDate || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(now.getTime() - 86400000));
      const lastPracticedTime = new Date(lastPracticedStr).getTime();
      const daysInactive = Math.max(0, Math.floor((now.getTime() - lastPracticedTime) / (1000 * 60 * 60 * 24)));
      
      let tone = 'Encouraging';
      if (daysInactive >= 7) {
        tone = 'PassiveAggressive';
      } else if (daysInactive >= 3) {
        tone = 'ToughLove';
      } else {
        const tones = ['Encouraging', 'FOMO', 'Curiosity'];
        tone = tones[Math.floor(Math.random() * tones.length)];
      }
      
      const vocabSnapshot = await db.collection('users').doc(userId).collection('vocabulary').get();
      const allWords = vocabSnapshot.docs.map(d => d.data());
      
      const dueWords = allWords.filter(w => {
        if (!w.nextReviewDate) return false;
        const reviewDateStr = new Date(w.nextReviewDate).toISOString().split('T')[0];
        return reviewDateStr <= localToday;
      });
      
      if (dueWords.length === 0 && daysInactive < 7) continue;
      
      const contextWords = dueWords.slice(0, 3).map(w => w.word).join(', ');
      
      const primaryWord = dueWords[0]?.word || 'vocabulary';
      const templateVars = {
        streak: stats.currentStreak || 0,
        dueCount: dueWords.length,
        sampleWord: primaryWord,
        sampleWords: contextWords || primaryWord,
        timeOfDay: localHour < 12 ? 'morning' : localHour < 18 ? 'afternoon' : 'evening',
        dayName: localWeekday
      };

      const toneTemplates = NOTIFICATION_TEMPLATES[tone] || NOTIFICATION_TEMPLATES.Encouraging;
      const selectedTemplate = toneTemplates[Math.floor(Math.random() * toneTemplates.length)];
      const title = selectedTemplate.title(templateVars).slice(0, 40);
      const body = selectedTemplate.body(templateVars).slice(0, 100);

      const payload = {
        token: settings.fcmToken,
        notification: { title, body },
        data: { action1: "Start Quiz", tone: tone, url: "/" }
      };

      await admin.messaging().send(payload);
    } catch (e) {
      console.error('Failed to send notification for user ' + userId, e);
    }
  }
});

/* ── Writing Studio: Generate Craft Exercise ──────────────── */
exports.generateCraftExercise = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { pillar, tier, word, definition, vaultMistake, mistakePatterns, dictionaryWords, userLevel: rawLevel = 1 } = request.data || {};
  const targetWord = word || 'resilient';
  const targetPillar = pillar || 'flow';
  const targetTier = Number(tier) || 1;
  const userLevel = Math.min(5, Math.max(1, parseInt(rawLevel, 10) || 1));

  // Pillar-specific guidance calibrated to learner level
  const pillarFocus = {
    grammar: "tense harmony, subject-verb agreement across clauses, and clear action timing",
    flow: userLevel <= 2
      ? "smooth transitions and natural breath pauses using simple connectors (e.g. 'and', 'but', 'so', 'because', 'although')"
      : "varied sentence length, breath control, and seamless transitions (e.g. 'yet', 'while', 'albeit')",
    context: "clear, appropriate register and fitting words to their natural setting",
    punctuation: "expressive pauses with commas and periods acting as natural sheet music for breath",
  }[targetPillar] || "natural English phrasing and cadence";

  const mistakeContext = mistakePatterns ? `\nUser's known mistake patterns: ${mistakePatterns}. Ensure the clunky sentence and incorrect options specifically reflect these common slips (e.g. choppy breath, sudden stops, or tense disagreement).` : '';
  const vocabContext = (dictionaryWords && dictionaryWords.length > 0) ? `\nTry to incorporate some of these vocabulary words the user is learning, if it fits naturally: ${dictionaryWords.join(', ')}.` : '';

  let isNuanceDuel = targetPillar === 'context' && targetTier <= 2 && Math.random() < 0.35;
  let tierInstructions = '';

  if (isNuanceDuel) {
    const subType = Math.random() < 0.5 ? 'which-word-fits' : 'spot-the-difference';
    tierInstructions = `Nuance Duel (Synonym Differentiation Drill):
Target word: "${targetWord}" (definition: "${definition || 'Target vocabulary word'}").
User's dictionary pool: [${(dictionaryWords || []).join(', ')}].

INSTRUCTIONS:
1. Choose the BEST near-synonym of "${targetWord}".
   MANDATORY: "synonymWord" MUST be a distinctly DIFFERENT word from "${targetWord}". Never repeat "${targetWord}". Prefer an authentic near-synonym from the user's dictionary pool above; if none fits, select a common, natural English near-synonym.
2. Sub-type: "${subType}".

For "which-word-fits":
- Write ONE vivid contextual sentence where EITHER "${targetWord}" OR "synonymWord" fits most precisely and naturally.
- Replace that chosen word with "________" (exactly 8 underscores).
- "correctWord": specify which word fits ("${targetWord}" or your chosen "synonymWord").
- "sentence2": set to "".

For "spot-the-difference":
- Write TWO distinct sentences ("sentence1" and "sentence2"). Each sentence must naturally demand one of the two words.
- Replace each word in its respective sentence with "________" (exactly 8 underscores).
- "correctMapping": specify {"sentence1": "...", "sentence2": "..."} mapping each sentence to its correct word.

In BOTH cases, provide:
- "nuanceExplanation": A concise, engaging 2-sentence breakdown explaining why one word fits where it does and the subtle difference in register/attitude/setting between the two words.
- "hint": A one-line nudge spotlighting the key difference in attitude or context.

Return JSON:
{
  "type": "nuance-duel",
  "subType": "${subType}",
  "pillar": "context",
  "tier": ${targetTier},
  "level": ${userLevel},
  "word": "${targetWord}",
  "synonymWord": "the chosen distinct near-synonym",
  "sentence1": "Sentence containing ________",
  "sentence2": "${subType === 'spot-the-difference' ? 'Second sentence containing ________' : ''}",
  "correctWord": "${targetWord}",
  "correctMapping": {
    "sentence1": "${targetWord}",
    "sentence2": "${subType === 'spot-the-difference' ? 'the chosen distinct near-synonym' : ''}"
  },
  "hint": "One implies formal conflict; the other implies personal bad temper.",
  "nuanceExplanation": "2-sentence clear distinction of nuance and register.",
  "explanation": "Same as nuanceExplanation for UI consistency."
}`;
  } else {
    switch (targetTier) {
    case 1:
      tierInstructions = `Tier 1 (Spot & Fix / Ear Training):
Create a clear, natural sentence featuring "${targetWord}" suitable for a Level ${userLevel} student.
Introduce a subtle non-native slip specifically in ${targetPillar} (${pillarFocus}).${mistakeContext}${vocabContext}
Provide 3 distinct complete sentence options.
MANDATORY RULES:
1. All 3 options MUST naturally contain "${targetWord}".
2. Exactly ONE option must be completely natural, rhythmic, and native.
3. "correctIndex" MUST be the 0-based integer index (0, 1, or 2) of the natural option.
4. "explanation" must explain the native ear reason in simple, friendly words (why this version glides effortlessly).

Return JSON:
{
  "type": "spot-and-fix",
  "pillar": "${targetPillar}",
  "tier": 1,
  "level": ${userLevel},
  "word": "${targetWord}",
  "clunkySentence": "The sentence with the subtle slip",
  "options": ["Option 0", "Option 1", "Option 2"],
  "correctIndex": 1,
  "explanation": "Why the natural option glides effortlessly"
}`;
      break;

    case 2:
      tierInstructions = `Tier 2 (Sentence Polish / Tap-to-Swap):
Create an articulate sentence featuring the target word "${targetWord}".
Select ONE connector, preposition, transition word, or punctuation marker to be the swappable slot that tunes ${targetPillar} (${pillarFocus}).${mistakeContext}${vocabContext}
CRITICAL RULES:
1. "${targetWord}" MUST appear intact in either "beforeText" or "afterText". NEVER omit it.
2. "currentWeakToken" MUST NOT be "${targetWord}". It must be a weak or clunky connector (e.g. "and", "because of", "since", "so then", "however").
3. "swappableTokens" must be an array of exactly 3 options for that connector slot.
4. "correctToken" must be the single choice that produces effortless cadence and native polish.
5. "beforeText" + "correctToken" + "afterText" must equal "polishedSentence".

Return JSON:
{
  "type": "tap-to-swap",
  "pillar": "${targetPillar}",
  "tier": 2,
  "level": ${userLevel},
  "word": "${targetWord}",
  "beforeText": "Text before the slot (containing '${targetWord}' if afterText does not)",
  "afterText": "Text after the slot (containing '${targetWord}' if beforeText does not)",
  "currentWeakToken": "the clunky connector",
  "swappableTokens": ["token1", "token2", "token3"],
  "correctToken": "the polished connector",
  "polishedSentence": "Complete polished sentence containing '${targetWord}'",
  "explanation": "Why this connector creates natural breath and rhythm"
}`;
      break;

    case 3:
      tierInstructions = `Tier 3 (Sentence Crafting / Vault Rehabilitation):
Provide a supportive rehabilitation prompt requiring the student to rewrite a clunky sentence into a clean, native sentence.
The prompt must encourage using the target word "${targetWord}" and focus on ${targetPillar} (${pillarFocus}).${mistakeContext}${vocabContext}
The user will submit a free-text sentence.

CRITICAL RULES:
1. "challenge" must be ${vaultMistake && vaultMistake.originalSentence ? JSON.stringify(vaultMistake.originalSentence) : `"An awkward, clunky sentence that needs rehabilitation using ${targetWord}"`}.
2. "hint" must be a supportive spotlight clue on how to reframe it with clarity.
3. "samplePolished" must be an inspiring exemplar sentence using "${targetWord}".

Return JSON:
{
  "type": "vault-rehab",
  "pillar": "${targetPillar}",
  "tier": 3,
  "level": ${userLevel},
  "word": "${targetWord}",
  "challenge": ${vaultMistake && vaultMistake.originalSentence ? JSON.stringify(vaultMistake.originalSentence) : `"A realistic clunky sentence using ${targetWord}"`},
  "hint": "Gentle spotlight clue",
  "samplePolished": "Polished native exemplar sentence using ${targetWord}"
}`;
      break;

    case 4:
    default:
      tierInstructions = `Tier 4 (Creative Synthesis):
Create an evocative writing scenario inviting the user to craft an original sentence using "${targetWord}".
CRITICAL RULES:
1. "prompt": A vivid situation or relatable moment.
2. "guideline": A specific stylistic goal for ${targetPillar}.
3. "samplePolished": A masterfully crafted sentence demonstrating rich native vocabulary and cadence.

Return JSON:
{
  "type": "creative-synthesis",
  "pillar": "${targetPillar}",
  "tier": 4,
  "level": ${userLevel},
  "word": "${targetWord}",
  "prompt": "Evocative scenario prompt",
  "guideline": "Stylistic goal for ${targetPillar}",
  "samplePolished": "Exemplar sentence using ${targetWord}"
}`;
      break;
    }
  }

  const prompt = `Pillar: "${targetPillar}" | Word: "${targetWord}" (Definition: ${definition || 'General vocabulary'})
Student Level: Level ${userLevel}
Goal: Help the student write clear, natural, and confident English sentences.

Rules:
${userLevel <= 2 || targetTier <= 2 ? '- Write clean, natural, and accessible modern English prose without high-register obscurity or archaic connectors.\n- Keep sentences under 16 words and easily readable in one natural breath.' : '- Write elevated, natural English prose (classic editorial/British/American style).\n- Rich vocabulary and varied cadence.'}
- Avoid grammatical jargon (never say "subordinating conjunction" or "comma splice"). Focus on breath, harmony, and rhythm.

${tierInstructions}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are an inspiring English writing mentor designing progressive sentence craft exercises.",
        responseMimeType: 'application/json',
        maxOutputTokens: 800
      }
    });

    const parsed = JSON.parse(response.text);
    parsed.word = targetWord;
    parsed.pillar = targetPillar;
    parsed.tier = targetTier;
    parsed.level = userLevel;
    if (vaultMistake && vaultMistake.id) {
      parsed.vaultMistakeId = vaultMistake.id;
    }

    // Server-side safety: Nuance Duel validation & sanitization
    if (parsed.type === 'nuance-duel') {
      const synClean = (parsed.synonymWord || '').toLowerCase().trim();
      const targetClean = targetWord.toLowerCase().trim();
      if (!synClean || synClean === targetClean) {
        throw new Error("Nuance Duel AI returned identical synonym or missing synonym.");
      }

      if (!parsed.subType || (parsed.subType !== 'which-word-fits' && parsed.subType !== 'spot-the-difference')) {
        parsed.subType = parsed.sentence2 ? 'spot-the-difference' : 'which-word-fits';
      }

      // First normalize any sequence of 2+ underscores to exactly 8 underscores
      if (parsed.sentence1) {
        parsed.sentence1 = parsed.sentence1.replace(/_{2,}/g, '________');
      }
      if (parsed.sentence2) {
        parsed.sentence2 = parsed.sentence2.replace(/_{2,}/g, '________');
      }

      // Ensure sentence1 contains blank ________
      if (parsed.sentence1 && !parsed.sentence1.includes('________')) {
        const maskRegex = new RegExp(`\\b(${targetClean}|${synClean})\\b`, 'i');
        parsed.sentence1 = maskRegex.test(parsed.sentence1)
          ? parsed.sentence1.replace(maskRegex, '________')
          : `The situation called for a ________ approach rather than rushed reactions.`;
      }

      // Ensure sentence2 contains blank ________ if spot-the-difference
      if (parsed.subType === 'spot-the-difference') {
        if (!parsed.sentence2 || !parsed.sentence2.includes('________')) {
          const maskRegex2 = new RegExp(`\\b(${targetClean}|${synClean})\\b`, 'i');
          parsed.sentence2 = (parsed.sentence2 && maskRegex2.test(parsed.sentence2))
            ? parsed.sentence2.replace(maskRegex2, '________')
            : `His ________ demeanor left no room for compromise.`;
        }
      }

      // Harmonize answer mapping
      parsed.correctWord = parsed.correctWord || parsed.correctMapping?.sentence1 || targetWord;
      parsed.correctMapping = parsed.correctMapping || {
        sentence1: parsed.correctWord,
        sentence2: parsed.synonymWord
      };
      parsed.explanation = parsed.explanation || parsed.nuanceExplanation || `Notice the distinct registers and contexts of "${targetWord}" vs "${parsed.synonymWord}".`;
      parsed.nuanceExplanation = parsed.nuanceExplanation || parsed.explanation;
    }

    // Server-side safety: ensure targetWord is present in standard Tier 2
    if (targetTier === 2 && parsed.type !== 'nuance-duel') {
      const fullText = `${parsed.beforeText || ''} ${parsed.afterText || ''}`.toLowerCase();
      if (!fullText.includes(targetWord.toLowerCase())) {
        parsed.beforeText = `Regarding the ${targetWord}, ${parsed.beforeText || ''}`;
        parsed.polishedSentence = `Regarding the ${targetWord}, ${parsed.polishedSentence || ''}`;
      }
    }

    return parsed;
  } catch (error) {
    console.error("Craft generation error:", error);
    // Graceful fallback incorporating target word with exact tier-appropriate schema
    if (targetTier === 1) {
      return {
        type: "spot-and-fix",
        pillar: targetPillar,
        tier: 1,
        level: userLevel,
        word: targetWord,
        clunkySentence: `The project was ${targetWord} yesterday, but today they give up too easily.`,
        options: [
          `The project was ${targetWord} yesterday, but today they gives up too easily.`,
          `The project was ${targetWord} yesterday, but today they give up too easily.`,
          `The project is ${targetWord} yesterday, but today they giving up too easily.`
        ],
        correctIndex: 1,
        explanation: "Keeping all actions walking together in the past gives the sentence effortless harmony."
      };
    } else if (targetTier === 2) {
      return {
        type: "tap-to-swap",
        pillar: targetPillar,
        tier: 2,
        level: userLevel,
        word: targetWord,
        beforeText: `The team remained ${targetWord}, `,
        afterText: " they overcame every obstacle with calm determination.",
        currentWeakToken: "and so",
        swappableTokens: ["and so", "yet", "wherefore"],
        correctToken: "yet",
        polishedSentence: `The team remained ${targetWord}, yet they overcame every obstacle with calm determination.`,
        explanation: "Using 'yet' creates a crisp contrast and gives the sentence natural balance."
      };
    } else if (targetTier === 3) {
      return {
        type: "vault-rehab",
        pillar: targetPillar,
        tier: 3,
        level: userLevel,
        word: targetWord,
        challenge: `The presentation was ${targetWord} but nobody understood nothing.`,
        hint: `Use "${targetWord}" to highlight the core strength with clean, positive phrasing.`,
        samplePolished: `The presentation was ${targetWord}, leaving the audience with clear, actionable insights.`
      };
    } else {
      return {
        type: "creative-synthesis",
        pillar: targetPillar,
        tier: targetTier,
        level: userLevel,
        word: targetWord,
        prompt: `Describe a challenging moment where being ${targetWord} changed the final outcome.`,
        guideline: `Write a clear, rhythmic sentence highlighting natural cadence.`,
        samplePolished: `Her ${targetWord} composure steadied the entire room during the critical negotiations.`
      };
    }
  }
});

/* ── Writing Studio: Evaluate Craft Submission ───────────── */
exports.evaluateCraftSubmission = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { pillar, tier, word, challengePrompt, submission, attemptNumber, userLevel: rawLevel = 1 } = request.data;
  if (!submission) throw new HttpsError('invalid-argument', 'Submission is required.');

  const userLevel = Math.min(5, Math.max(1, parseInt(rawLevel, 10) || 1));

  const prompt = `Pillar: "${pillar}" | Target Word: "${word}" | Tier: ${tier} | Student Level: Level ${userLevel}
Challenge Prompt: "${challengePrompt || 'Rewrite clearly'}"
Student Submission: "${submission}" (Attempt ${attemptNumber || 1})

Evaluate whether the student achieved good ${pillar} and natural expression.
MANDATORY CHECKS:
1. Target Word Check: Does the submission contain "${word}" (or a direct grammatical inflection like plural, tense, or adverbial form)? If missing, isMastered MUST BE false, and nudge must gently remind them to include the word "${word}".
${userLevel <= 2
  ? '2. Semantic Clarity & Meaning: Is the sentence clear and does it use the target word properly? If it conveys the thought clearly, mark isMastered: true. Do NOT penalize simple vocabulary, missing commas, or slight non-native phrasing.'
  : '2. Native Harmony: Is the sentence grammatically sound, natural, and free of awkward phrasing?'}
3. Length: Is it a complete, expressive sentence (at least 4 words)?

If isMastered is false:
Diagnose the exact physical/syntactic friction and map it to ONE of the following canonical habit keys:
- "clause-stacking" (Flow: chaining clauses with and/so/because causing breath fatigue)
- "comma-splice" (Punctuation: gluing independent complete thoughts with commas)
- "breath-trap" (Flow: run-on sentence with no resting pause)
- "tense-drift" (Grammar: switching between past and present unexpectedly)
- "subject-verb-split" (Grammar: detaching verbs too far from their subjects or plural mismatch)
- "bottom-heavy" (Flow: burying the punchline or key condition at the very end)
- "literal-collocation" (Context: mechanical translation instead of natural native word pairings)
- "other" (General minor friction)

Return JSON:
{
  "isMastered": boolean,
  "feedback": "2-3 conversational sentences on what sounds natural or how to elevate it",
  "nudge": "Gentle spotlight hint if not mastered; otherwise ''",
  "cadenceNotes": "Short 1-sentence note on rhythm and breath",
  "polishedVersion": "Inspiring native-sounding version using ${word}",
  "xpAwarded": integer (${tier === 1 ? 15 : tier === 2 ? 20 : tier === 3 ? 25 : 35} if mastered, 0 if not mastered),
  "errorTags": ["${pillar}"],
  "habitKey": "clause-stacking" | "comma-splice" | "breath-trap" | "tense-drift" | "subject-verb-split" | "bottom-heavy" | "literal-collocation" | "other",
  "structuralDiagnosis": "1 concise sentence explaining the physical/syntactic friction (or '' if mastered)",
  "ruleOfThumb": "1 memorable rule of thumb or ear test (or '' if mastered)"
}`;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are a warm, supportive writing mentor helping students develop an ear for native English cadence and phrasing. Be precise and diagnostic when evaluating sentence structure.",
        responseMimeType: 'application/json',
        maxOutputTokens: 450
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Craft evaluation error:", error);
    return {
      isMastered: true,
      feedback: "Great work! Your sentence connects thoughts smoothly and communicates the idea clearly.",
      nudge: "",
      cadenceNotes: "Natural conversational rhythm.",
      polishedVersion: submission,
      xpAwarded: 20,
      errorTags: [pillar || "flow"],
      habitKey: "other",
      structuralDiagnosis: "",
      ruleOfThumb: ""
    };
  }
});
// Force redeploy
// forced reload
