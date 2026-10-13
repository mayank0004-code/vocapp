import React, { useState, useMemo } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import StrengthBars from '../../ui/StrengthBars';
import Button from '../../ui/Button';
import { showToast } from '../../ui/Toast';
import { deleteLearnedWord, deletePendingWord, restorePendingWord } from '../../services/db';
import { useData } from '../../data/DataProvider';
import { safeStr, toCollocations, toCommonMistakes, renderMistake } from './wordFormat';
import { getWordStrength, nextReviewLabel, savedLabel, restoreLearnedWord, STRENGTH_LABELS } from './wordStatus';

export function WordDetailPage({ word, onBack = () => {}, isInline = false }) {
  const { currentUser, craft } = useData();
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useEdgeBack({ onPop: onBack, enabled: !isInline });

  const isSaved = word.status === 'pending';
  const headword = word.word || '';
  const definition = safeStr(word.definition);
  const pos = safeStr(word.partOfSpeech || word.pos);
  const example = safeStr(word.example);
  const pairs = toCollocations(word.collocations);
  const origin = safeStr(word.origin);
  const vibe = safeStr(word.contextMeaning);
  const traps = toCommonMistakes(word.commonMistakes);
  const contextSentence = safeStr(word.contextSentence);
  const register = safeStr(word.vibeCheck);
  // Keep each sentence paired with its own label even when one is missing.
  const sentences = [
    { label: 'A fact', text: safeStr(word.factualSentence) },
    { label: 'About you', text: safeStr(word.personalSentence) },
    { label: 'A question', text: safeStr(word.questionSentence) }
  ].filter(sn => sn.text);

  const strength = getWordStrength(word);
  const isCrafted = useMemo(
    () => (craft?.craftedWords || []).some(w => String(w).toLowerCase() === headword.toLowerCase()),
    [craft, headword]
  );

  const handleSpeak = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(headword);
      u.lang = 'en-GB';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const handleRemove = async () => {
    if (!currentUser?.uid) return;
    try {
      if (isSaved) {
        await deletePendingWord(currentUser.uid, word.id || headword.toLowerCase());
      } else {
        await deleteLearnedWord(currentUser.uid, word.id || headword.toLowerCase());
      }
      onBack();
      showToast(
        `“${headword}” removed`,
        'Undo',
        async () => {
          try {
            if (isSaved) {
              await restorePendingWord(currentUser.uid, word);
            } else {
              await restoreLearnedWord(currentUser.uid, word);
            }
          } catch (err) {
            console.error('Error restoring word:', err);
            showToast(`Couldn’t restore “${headword}”`);
          }
        }
      );
    } catch (err) {
      console.error('Error removing word:', err);
      showToast(`Couldn’t remove “${headword}”. Try again.`);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '60px'
      }}
    >
      {/* Top Header Bar with Back Button */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(11, 11, 13, 0.84)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          borderBottom: '0.5px solid var(--line)',
          height: 'var(--topH)',
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: '8px',
          paddingLeft: '12px',
          paddingRight: '16px',
          justifyContent: 'space-between'
        }}
      >
        {!isInline ? (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--acc2)',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Words
          </button>
        ) : (
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Word Detail
          </div>
        )}
        <button
          onClick={handleSpeak}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '18px',
            background: 'var(--card2)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer'
          }}
          aria-label="Hear pronunciation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          </svg>
        </button>
      </header>

      {/* Hero Title & Pronunciation */}
      <div style={{ padding: '16px 20px 4px' }}>
        <small style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 500 }}>
          {typeof word.createdAt === 'number' ? `Added ${new Date(word.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: new Date(word.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}` : (isSaved ? 'Saved for later' : 'In your words')}
        </small>
        <h1
          className="serif"
          style={{
            fontSize: '44px',
            fontWeight: 400,
            margin: '2px 0 4px',
            letterSpacing: '-0.01em',
            lineHeight: 1.05
          }}
        >
          {headword}
        </h1>
        {pos && (
          <span style={{ fontSize: '14.5px', color: 'var(--fg3)', display: 'block' }}>
            {pos}
          </span>
        )}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 20px 0' }}>
        {isCrafted && (
          <span style={{ fontSize: '12.5px', fontWeight: 600, padding: '5px 10px', borderRadius: '9px', background: 'var(--accbg)', color: 'var(--acc2)' }}>
            Crafted · used in your writing
          </span>
        )}
        {isSaved && (
          <span style={{ fontSize: '12.5px', fontWeight: 600, padding: '5px 10px', borderRadius: '9px', background: 'var(--orgbg)', color: 'var(--org2)' }}>
            Saved for later · {savedLabel(word).toLowerCase()}
          </span>
        )}
        {register && (
          <span style={{ fontSize: '12.5px', fontWeight: 600, padding: '5px 10px', borderRadius: '9px', background: 'var(--card2)', color: 'var(--fg2)' }}>
            {register}
          </span>
        )}
      </div>

      {/* Main Definition */}
      <p style={{ fontSize: '20px', lineHeight: 1.45, margin: '16px 20px 0', color: 'var(--fg)' }}>
        {definition}
      </p>

      {/* Memory Strength Block */}
      {!isSaved && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', margin: '18px 20px 0' }}>
          <StrengthBars strength={strength} big={true} />
          <div>
            <b style={{ fontSize: '15px', display: 'block' }}>
              {STRENGTH_LABELS[strength]}
              {typeof word.interval === 'number' && (
                <span style={{ fontWeight: 400, color: 'var(--mute)' }}> · {word.interval}-day interval</span>
              )}
            </b>
            <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
              {nextReviewLabel(word.nextReviewDate)}
            </span>
          </div>
        </div>
      )}

      {/* Detailed Lexical Sections */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {contextSentence && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Where you saw it
            </span>
            <p className="serif" style={{ fontSize: '18px', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.45 }}>
              “{contextSentence}”
            </p>
          </div>
        )}

        {vibe && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              In your context
            </span>
            <p style={{ fontSize: '15.5px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--fg2)' }}>
              {vibe}
            </p>
          </div>
        )}

        {example && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Example
            </span>
            <p className="serif" style={{ fontSize: '18px', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.45 }}>
              “{example}”
            </p>
          </div>
        )}

        {pairs.length > 0 && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Often paired with
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {pairs.map((p, i) => (
                <span
                  key={i}
                  style={{
                    padding: '6px 11px',
                    borderRadius: '10px',
                    background: 'var(--card2)',
                    fontSize: '14px',
                    color: 'var(--fg2)'
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {origin && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Origin
            </span>
            <p style={{ fontSize: '15px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--fg2)' }}>
              {origin}
            </p>
          </div>
        )}

        {traps.length > 0 && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Common trap
            </span>
            {traps.map((t, i) => (
              <p key={i} style={{ fontSize: '15px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--fg2)' }}>
                {renderMistake(t)}
              </p>
            ))}
          </div>
        )}

        {sentences.length > 0 && (
          <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your sentences
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {sentences.map((sent, i) => (
                <div key={sent.label} style={{ borderTop: i > 0 ? '0.5px solid var(--line)' : 'none', paddingTop: i > 0 ? '8px' : 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {sent.label}
                  </span>
                  <p className="serif" style={{ fontSize: '17px', margin: '2px 0 0', color: 'var(--fg)' }}>
                    “{sent.text}”
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete / Remove Action */}
        <div style={{ marginTop: '14px' }}>
          {!isDeleting ? (
            <Button
              variant="ghost"
              onClick={() => setIsDeleting(true)}
              style={{ color: 'var(--bad)', borderColor: 'rgba(255,107,107,0.2)' }}
            >
              {isSaved ? 'Remove from saved' : 'Remove from my words'}
            </Button>
          ) : (
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--badbg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.45, color: 'var(--bad)' }}>
                {isSaved
                  ? `Remove “${headword}” from saved words?`
                  : `Remove “${headword}”? Its review history and your sentences will be cleared.`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Button variant="grey" size="sm" onClick={() => setIsDeleting(false)}>
                  Keep it
                </Button>
                <Button variant="danger" size="sm" onClick={handleRemove}>
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WordDetailPage;
