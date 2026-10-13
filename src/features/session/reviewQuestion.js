// Ported 1:1 from the classic Review page (src/pages/Review.jsx) so both UIs
// build identical flashcards and mask the answer the same way.

export function shuffleArray(arr = []) {
  return [...arr].sort(() => 0.5 - Math.random());
}

function getWordHash(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildLocalQuestion(wordObj) {
  if (!wordObj || !wordObj.word) return null;

  const sentences = [
    wordObj.example,
    wordObj.personalSentence,
    wordObj.factualSentence,
    wordObj.questionSentence
  ].filter(s => typeof s === 'string' && s.trim().length > 10);

  const cleanWord = wordObj.word.toLowerCase().trim();
  const hash = getWordHash(cleanWord);
  const hasPolysemy = !!(wordObj.contextMeaning && wordObj.contextMeaning.toLowerCase() !== (wordObj.definition || '').toLowerCase());
  const isSecondary = hasPolysemy && (hash % 2 === 0);

  return {
    type: 'flashcard',
    domain: 'local',
    domainName: 'Active Recall',
    word: wordObj.word,
    definition: (isSecondary ? wordObj.contextMeaning : wordObj.definition) || wordObj.definition || 'Review definition in dictionary.',
    relatesTo: wordObj.vibeCheck || (sentences[0] ? `Real-world context: "${sentences[0]}"` : `Common in everyday speech and thoughtful writing.`),
    memoryTrigger: (wordObj.collocations?.length > 0)
      ? `Common pairings: ${wordObj.collocations.slice(0, 3).join(', ')}`
      : `Anchor: Connect this concept to its real-world effect.`,
    example: sentences[0] || wordObj.example || '',
    hasSecondaryMeaning: hasPolysemy,
    secondaryMeaning: hasPolysemy ? (isSecondary ? wordObj.definition : wordObj.contextMeaning) : '',
    activeMeaning: isSecondary ? 'secondary' : 'primary',
    meaningLabel: isSecondary ? 'Secondary Meaning' : 'Core Meaning',
    question: (isSecondary ? wordObj.contextMeaning : wordObj.definition) || wordObj.definition || '',
    correctAnswer: wordObj.word,
    options: [],
    explanation: `"${wordObj.word}" means: ${wordObj.definition || 'the target word'}.`
  };
}

// Ensures the target word or its stem never leaks on the card front.
export function maskTargetWord(text, word, fallback = '') {
  if (!text) return fallback;
  if (!word) return text;
  const clean = word.toLowerCase().trim();
  const stem = clean.length > 4 ? clean.slice(0, -1) : clean;
  const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${esc}\\w*\\b`, 'gi');
  return text.replace(regex, '[the word]');
}

// Same countdown wording as the classic "All Caught Up" screen.
export function nextReviewLabel(allWords = []) {
  const now = Date.now();
  let soonest = null;
  for (const w of allWords) {
    if (w.nextReviewDate && w.nextReviewDate > now) {
      if (!soonest || w.nextReviewDate < soonest) soonest = w.nextReviewDate;
    }
  }
  if (!soonest) return '';
  const msLeft = soonest - now;
  const hoursLeft = Math.ceil(msLeft / 3600000);
  if (hoursLeft < 1) return 'Next review in < 1h';
  if (hoursLeft < 24) return `Next review in ~${hoursLeft}h`;
  const days = Math.round(msLeft / 86400000);
  return `Next review in ~${days} day${days !== 1 ? 's' : ''}`;
}
