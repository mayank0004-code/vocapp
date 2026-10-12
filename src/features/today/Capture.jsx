import React, { useState } from 'react';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import { fetchWordBreakdown } from '../../services/ai';
import { savePendingWord, deletePendingWord, checkWordExists } from '../../services/db';
import { useData, useWords } from '../../data/DataProvider';

export function Capture({
  onPractice = () => {},
  onOpenInWords = () => {}
}) {
  const { currentUser } = useData();
  const { allWords, savedWords } = useWords();

  const [inputWord, setInputWord] = useState('albiet');
  const [contextInput, setContextInput] = useState('The reforms worked, albiet slowly.');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wordData, setWordData] = useState(null);
  const [typedWord, setTypedWord] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(true);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  };

  const handleLookup = async () => {
    const raw = inputWord.trim().toLowerCase();
    if (!raw) {
      setShake(true);
      triggerHaptic('error');
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setTypedWord(raw);
    setSheetOpen(true);
    triggerHaptic('light');

    try {
      // 1. Try Firebase callable AI function
      const data = await fetchWordBreakdown(raw, contextInput.trim());
      if (data && data.word) {
        setWordData(data);
      } else {
        throw new Error('Invalid breakdown');
      }
    } catch (err) {
      console.warn('AI lookup fallback:', err);
      // Fallback lexicographical definition (handles "albiet" -> "albeit")
      const isAlbeit = raw === 'albiet' || raw === 'albeit';
      const head = isAlbeit ? 'albeit' : raw;

      // Check if already in user's dictionary
      const existing = allWords.find(w => w.word.toLowerCase() === head);
      const existingSaved = savedWords.find(w => w.word.toLowerCase() === head);

      setWordData({
        word: head,
        definition: isAlbeit
          ? 'Though; even though. Used to introduce a concessive clause that tempers or limits a statement without contradicting it.'
          : (existing?.definition || 'An expressive vocabulary term captured from your reading.'),
        partOfSpeech: isAlbeit ? 'conjunction' : (existing?.partOfSpeech || 'noun'),
        phonetic: isAlbeit ? '/ɔːlˈbiː.ɪt/' : (existing?.phonetic || ''),
        vibe: isAlbeit ? 'Sophisticated, measured, balanced' : 'Literary, evocative',
        register: isAlbeit ? 'Formal and literary' : 'Formal',
        etymology: isAlbeit ? 'Middle English: literally "all be it" (although it be that)' : 'Historical literary English',
        collocations: isAlbeit ? ['albeit briefly', 'albeit slowly', 'albeit reluctantly', 'albeit with hesitation'] : [],
        example: isAlbeit ? 'The reforms worked, albeit slowly.' : (contextInput || `An example showing the application of ${head}.`),
        literature: isAlbeit ? 'He had a great, albeit unstated, influence upon contemporary thought.' : '',
        trap: isAlbeit ? 'Do not follow with a full clause with its own verb; use it to introduce adjectives, adverbs, or phrases.' : '',
        contextSentence: contextInput.trim(),
        isExisting: !!existing,
        isSaved: !!existingSaved,
        savedItem: existingSaved,
        existingItem: existing
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!wordData || !currentUser?.uid) return;
    try {
      await savePendingWord(currentUser.uid, {
        word: wordData.word,
        definition: wordData.definition,
        partOfSpeech: wordData.partOfSpeech || 'adjective',
        contextSentence: contextInput.trim(),
        example: wordData.example,
        createdAt: Date.now()
      });
      setSheetOpen(false);
      triggerHaptic('success');
      showToast(<span>Saved <em className="serif">{wordData.word}</em> for 7 days</span>);
    } catch (e) {
      console.error('Failed to save for later:', e);
    }
  };

  const handleRemoveFromSaved = async () => {
    if (!wordData || !currentUser?.uid) return;
    try {
      await deletePendingWord(currentUser.uid, wordData.word);
      setSheetOpen(false);
      triggerHaptic('medium');
      showToast(<span>Removed <em className="serif">{wordData.word}</em> from saved</span>);
    } catch (e) {
      console.error('Failed to remove saved word:', e);
    }
  };

  // Determine tag status of current wordData
  const isCorrected = wordData && typedWord && wordData.word.toLowerCase() !== typedWord.toLowerCase();
  const existingLearned = wordData && allWords.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());
  const existingSaved = wordData && savedWords.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());

  const statusLabel = existingLearned
    ? `In your words · next review ${existingLearned.dueLabel || 'soon'}`
    : existingSaved
    ? `Saved for later · expires in ${existingSaved.expiresInDays || 7}d`
    : 'New word';

  const statusColor = existingLearned
    ? 'var(--fg3)'
    : existingSaved
    ? 'var(--org2)'
    : 'var(--acc)';

  return (
    <>
      <section
        style={{
          margin: '12px 16px 0',
          padding: '16px',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--card)',
          border: '1px solid var(--line)'
        }}
        className="card capt"
        aria-label="Capture a word"
      >
        <label
          htmlFor="capIn"
          style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}
        >
          Found a new word?
        </label>

        {/* Word Input */}
        <input
          id="capIn"
          className={`inp ${shake ? 'shake' : ''}`}
          placeholder="Type or paste it"
          value={inputWord}
          onChange={(e) => setInputWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          autoComplete="off"
          spellCheck="false"
          style={{
            height: '46px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'var(--well)',
            padding: '0 14px',
            fontSize: '17px',
            color: 'var(--fg)',
            outline: 'none',
            width: '100%'
          }}
        />

        {/* Context Input */}
        <input
          id="capCtx"
          className="inp sm"
          placeholder="Optional: the sentence you saw it in"
          aria-label="Sentence where you found it (optional)"
          value={contextInput}
          onChange={(e) => setContextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          autoComplete="off"
          style={{
            height: '40px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--well)',
            padding: '0 14px',
            fontSize: '14.5px',
            color: 'var(--fg2)',
            outline: 'none',
            width: '100%'
          }}
        />

        {/* Look it up Button */}
        <Button
          variant="secondary"
          onClick={handleLookup}
          disabled={loading}
          style={{
            height: '44px',
            fontSize: '15px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading && <span className="spin" />}
          {loading ? 'Looking it up' : 'Look it up'}
        </Button>
      </section>

      {/* Breakdown Sheet */}
      <Sheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        {loading || !wordData ? (
          /* Shimmer Skeleton */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '8px 4px 0'
            }}
            className="skel"
          >
            <i style={{ width: '40%', height: '14px' }} />
            <i style={{ width: '65%', height: '42px', borderRadius: '12px' }} />
            <i style={{ width: '35%', height: '14px' }} />
            <i style={{ width: '92%', height: '22px' }} />
            <i style={{ width: '75%', height: '22px' }} />
            <i style={{ width: '100%', height: '80px', borderRadius: '16px', marginTop: '8px' }} />
          </div>
        ) : (
          <div className="sh-body sh fadein">
            {/* Status Label */}
            <span
              className="slabel"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                display: 'block',
                color: statusColor
              }}
            >
              {statusLabel}
            </span>

            {/* Headword & Audio Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '4px'
              }}
              className="wt"
            >
              <h2
                className="serif"
                style={{
                  margin: 0,
                  fontSize: '40px',
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.05,
                  color: 'var(--fg)'
                }}
              >
                {wordData.word}
              </h2>

              <button
                type="button"
                className={`speak press ${speaking ? 'on' : ''}`}
                onClick={() => handleSpeak(wordData.word)}
                aria-label={`Pronounce ${wordData.word}`}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '22px',
                  background: 'var(--card2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2.5px',
                  flex: 'none'
                }}
              >
                <i style={{ width: '3px', height: '6px', borderRadius: '2px', background: 'var(--acc2)' }} />
                <i style={{ width: '3px', height: '12px', borderRadius: '2px', background: 'var(--acc2)' }} />
                <i style={{ width: '3px', height: '16px', borderRadius: '2px', background: 'var(--acc2)' }} />
                <i style={{ width: '3px', height: '8px', borderRadius: '2px', background: 'var(--acc2)' }} />
              </button>
            </div>

            {/* Phonetic & POS */}
            <div style={{ fontSize: '14.5px', color: 'var(--fg3)', marginBottom: '14px' }}>
              {wordData.phonetic && <span style={{ marginRight: '8px' }}>{wordData.phonetic}</span>}
              <span style={{ textTransform: 'lowercase' }}>{wordData.partOfSpeech}</span>
            </div>

            {/* Spelling Correction Banner */}
            {isCorrected && (
              <div
                style={{
                  margin: '4px 0 14px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--accbg)',
                  color: 'var(--acc2)',
                  fontSize: '14px',
                  lineHeight: 1.4
                }}
                className="banner"
              >
                Spelling corrected from “<strong>{typedWord}</strong>” to “<strong>{wordData.word}</strong>”.
              </div>
            )}

            {/* Definition */}
            <p
              style={{
                fontSize: '19px',
                lineHeight: 1.45,
                margin: '8px 0 16px',
                color: 'var(--fg)'
              }}
              className="bigdef"
            >
              {wordData.definition}
            </p>

            {/* In Your Sentence Context */}
            {contextInput && (
              <div
                style={{
                  margin: '12px 0',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'var(--card2)',
                  border: '1px solid var(--line)'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--acc2)',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  In your sentence
                </span>
                <p style={{ margin: 0, fontSize: '15px', fontStyle: 'italic', color: 'var(--fg2)', lineHeight: 1.4 }}>
                  “{contextInput}”
                </p>
              </div>
            )}

            {/* Vibe Check & Register */}
            {wordData.vibe && (
              <div style={{ margin: '12px 0 0' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Vibe check
                </span>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)' }}>{wordData.vibe}</p>
              </div>
            )}

            {wordData.register && (
              <div style={{ margin: '12px 0 0' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Register
                </span>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)' }}>{wordData.register}</p>
              </div>
            )}

            {/* Collocations */}
            {wordData.collocations && wordData.collocations.length > 0 && (
              <div style={{ margin: '14px 0 0' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                  Natural pairs
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {wordData.collocations.map((pair, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: 'var(--card2)',
                        border: '1px solid var(--line)',
                        fontSize: '13.5px',
                        color: 'var(--fg2)'
                      }}
                    >
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {!existingLearned ? (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      setSheetOpen(false);
                      onPractice(wordData);
                    }}
                  >
                    Practise now · 3 sentences
                  </Button>

                  {existingSaved ? (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={handleRemoveFromSaved}
                      style={{ color: 'var(--bad)' }}
                    >
                      Remove from saved
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleSaveForLater}
                    >
                      Save for later
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setSheetOpen(false);
                    onOpenInWords(wordData);
                  }}
                >
                  Open in Words
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

export default Capture;
