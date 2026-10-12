import React, { useState } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useAnthology, useData } from '../../data/DataProvider';
import { deleteFromAnthology, saveToAnthology } from '../../services/db';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';

export function AnthologyPage({ onBack }) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { currentUser } = useData();
  const { anthology = [] } = useAnthology();
  const [removedIds, setRemovedIds] = useState(new Set());
  const [speakingIdx, setSpeakingIdx] = useState(null);

  const handleSpeak = (text, idx) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(idx);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      u.onend = () => setSpeakingIdx(null);
      u.onerror = () => setSpeakingIdx(null);
      window.speechSynthesis.speak(u);
    }
  };

  const handleDelete = async (item) => {
    if (!currentUser?.uid) return;
    const itemKey = item.id || item.sentence;

    setRemovedIds(prev => new Set(prev).add(itemKey));
    triggerHaptic('medium');

    try {
      await deleteFromAnthology(currentUser.uid, item.id);
      showToast(
        <span>Removed sentence from Anthology</span>,
        'Undo',
        async () => {
          setRemovedIds(prev => {
            const next = new Set(prev);
            next.delete(itemKey);
            return next;
          });
          await saveToAnthology(currentUser.uid, {
            sentence: item.sentence || item.text,
            word: item.word,
            pillar: item.pillar || item.skill
          });
          triggerHaptic('light');
        }
      );
    } catch (e) {
      console.error('Failed to delete anthology sentence:', e);
      setRemovedIds(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const visibleList = anthology.filter(item => !removedIds.has(item.id || item.sentence));

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
      {/* Top Header Navigation */}
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

        <span style={{ fontSize: '16px', fontWeight: 600 }}>Anthology</span>
        <div style={{ width: '60px' }} />
      </header>

      {/* Main Content */}
      <div style={{ padding: '20px 20px 0' }}>
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em'
          }}
        >
          Anthology
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '15px', color: 'var(--fg3)', lineHeight: 1.45 }}>
          Sentences you were proud of, saved from Craft drills. {visibleList.length} saved.
        </p>

        {/* Sentences List */}
        {visibleList.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--mute)',
              fontSize: '15px',
              lineHeight: 1.5,
              background: 'var(--card)',
              borderRadius: '20px',
              border: '1px solid var(--line)'
            }}
          >
            No sentences saved yet. Finish a Craft drill or look up a word to save your best sentences.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {visibleList.map((item, idx) => {
              const sentenceText = item.sentence || item.text || '';
              return (
                <div
                  key={item.id || idx}
                  style={{
                    background: 'var(--card)',
                    borderRadius: '20px',
                    border: '1px solid var(--line)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="serif"
                        style={{ fontSize: '24px', fontWeight: 500, fontStyle: 'italic', color: 'var(--fg)' }}
                      >
                        {item.word || 'Craft'}
                      </span>
                      {item.pillar && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--card2)',
                            color: 'var(--acc2)',
                            textTransform: 'uppercase'
                          }}
                        >
                          {item.pillar}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Audio Speak */}
                      <button
                        type="button"
                        onClick={() => handleSpeak(sentenceText, idx)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '17px',
                          background: 'var(--card2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: speakingIdx === idx ? 'var(--acc2)' : 'var(--fg3)',
                          border: '1px solid var(--line)',
                          cursor: 'pointer'
                        }}
                        aria-label="Listen to sentence"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '17px',
                          background: 'var(--card2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--mute)',
                          border: '1px solid var(--line)',
                          cursor: 'pointer'
                        }}
                        aria-label="Delete sentence"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Sentence Quote */}
                  <blockquote
                    className="serif"
                    style={{
                      margin: 0,
                      fontSize: '17.5px',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                      color: 'var(--fg2)'
                    }}
                  >
                    “{sentenceText}”
                  </blockquote>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnthologyPage;
