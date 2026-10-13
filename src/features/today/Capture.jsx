import React, { useState } from 'react';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import { fetchWordBreakdown } from '../../services/ai';
import { savePendingWord, checkWordExists } from '../../services/db';
import { useData } from '../../data/DataProvider';
import { safeStr, toCollocations, toCommonMistakes, renderMistake } from '../words/wordFormat';

const sectionLabel = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--fg3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: '6px'
};

export function Capture({
  onPractice = () => {},
  onOpenInWords = () => {}
}) {
  const { currentUser } = useData();

  const [inputWord, setInputWord] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchMsg, setSearchMsg] = useState(null); // { type: 'error' | 'info', text }
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wordData, setWordData] = useState(null);
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

  // Same flow as the classic Today page lookup.
  const handleLookup = async () => {
    if (!inputWord.trim() || loading || !currentUser?.uid) return;
    setLoading(true);
    setWordData(null);
    setSearchMsg(null);
    setSheetOpen(true);
    triggerHaptic('light');
    try {
      const typed = inputWord.trim();
      const exists = await checkWordExists(currentUser.uid, typed);
      if (exists) {
        setSheetOpen(false);
        setSearchMsg({ type: 'error', text: `"${typed}" is already in your Dictionary.` });
        return;
      }
      const data = await fetchWordBreakdown(typed, contextInput.trim());
      if (!data?.isValid) {
        setSheetOpen(false);
        setSearchMsg({ type: 'error', text: `"${typed}" doesn't seem to be a valid English word.` });
        return;
      }
      if (data.word.toLowerCase() !== typed.toLowerCase()) {
        const correctedExists = await checkWordExists(currentUser.uid, data.word);
        if (correctedExists) {
          setSheetOpen(false);
          setSearchMsg({ type: 'error', text: `Corrected to "${data.word}", which is already in your Dictionary.` });
          return;
        }
        setSearchMsg({ type: 'info', text: `Spelling corrected to "${data.word}".` });
        setInputWord(data.word);
      }
      setWordData(data);
    } catch {
      setSheetOpen(false);
      setSearchMsg({ type: 'error', text: 'Failed to look up word. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetCapture = () => {
    setSheetOpen(false);
    setWordData(null);
    setInputWord('');
    setContextInput('');
  };

  const handleSaveForLater = async () => {
    if (!wordData || !currentUser?.uid) return;
    try {
      await savePendingWord(currentUser.uid, wordData);
      const saved = wordData.word;
      resetCapture();
      setSearchMsg({ type: 'info', text: `"${saved}" saved for later.` });
      triggerHaptic('success');
      showToast(<span>Saved <em className="serif">{saved}</em> for 7 days</span>);
    } catch {
      setSearchMsg({ type: 'error', text: 'Failed to save.' });
    }
  };

  const handlePracticeNow = () => {
    const data = wordData;
    resetCapture();
    onPractice(data);
  };

  const collocations = toCollocations(wordData?.collocations);
  const commonMistakes = toCommonMistakes(wordData?.commonMistakes);
  const contextMeaning = safeStr(wordData?.contextMeaning);
  const vibeCheck = safeStr(wordData?.vibeCheck);
  const origin = safeStr(wordData?.origin);
  const example = safeStr(wordData?.example);

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
          className="inp"
          placeholder="Type or paste a word"
          value={inputWord}
          onChange={(e) => { setInputWord(e.target.value); if (searchMsg) setSearchMsg(null); }}
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
          placeholder="Sentence where you saw it (optional)"
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
          disabled={loading || !inputWord.trim()}
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

        {searchMsg && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '14px',
              lineHeight: 1.4,
              background: searchMsg.type === 'error' ? 'var(--badbg)' : 'var(--accbg)',
              color: searchMsg.type === 'error' ? 'var(--bad)' : 'var(--acc2)'
            }}
          >
            {searchMsg.text}
          </div>
        )}
      </section>

      {/* Breakdown Sheet */}
      <Sheet isOpen={sheetOpen} onClose={() => { setSheetOpen(false); setWordData(null); }}>
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
            <span
              className="slabel"
              style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--acc)' }}
            >
              New word
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

            {/* In your context (shown first, as in classic) */}
            {contextMeaning && (
              <div
                style={{
                  margin: '10px 0 14px',
                  padding: '12px 14px',
                  borderRadius: '0 14px 14px 0',
                  borderLeft: '3px solid var(--acc)',
                  background: 'var(--accbg)'
                }}
              >
                <span style={{ ...sectionLabel, color: 'var(--acc2)' }}>In your context</span>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)', lineHeight: 1.45 }}>{contextMeaning}</p>
              </div>
            )}

            {/* Definition */}
            <p
              style={{ fontSize: '19px', lineHeight: 1.45, margin: '8px 0 18px', color: 'var(--fg)' }}
              className="bigdef"
            >
              {safeStr(wordData.definition)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {vibeCheck && (
                <div>
                  <span style={sectionLabel}>Register</span>
                  <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)', lineHeight: 1.45 }}>{vibeCheck}</p>
                </div>
              )}

              {origin && (
                <div>
                  <span style={sectionLabel}>Origin</span>
                  <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)', fontStyle: 'italic', lineHeight: 1.45 }}>{origin}</p>
                </div>
              )}

              {collocations.length > 0 && (
                <div>
                  <span style={sectionLabel}>Collocations</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {collocations.map((pair, idx) => (
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

              {example && (
                <div>
                  <span style={sectionLabel}>Example</span>
                  <p style={{ margin: 0, fontSize: '15px', color: 'var(--fg2)', fontStyle: 'italic', paddingLeft: '10px', borderLeft: '2px solid var(--line)', lineHeight: 1.45 }}>
                    “{example}”
                  </p>
                </div>
              )}

              {commonMistakes.length > 0 && (
                <div>
                  <span style={sectionLabel}>Common traps</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {commonMistakes.map((m, i) => (
                      <p
                        key={i}
                        style={{ margin: 0, fontSize: '14px', color: 'var(--fg2)', paddingLeft: '10px', borderLeft: '2px solid var(--warn)', lineHeight: 1.5 }}
                      >
                        {renderMistake(m)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <Button variant="pri" onClick={handlePracticeNow}>
                Practise now · 3 sentences
              </Button>
              <Button variant="grey" onClick={handleSaveForLater}>
                Save for later
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

export default Capture;
