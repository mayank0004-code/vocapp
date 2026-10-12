import React, { useState, useEffect } from 'react';
import StoriesViewer from './StoriesViewer';

export function Stories({
  dueWords = [],
  savedWords = [],
  vaultSlips = [],
  anthologySentences = [],
  onStoryAction = () => {}
}) {
  const [seenSet, setSeenSet] = useState(() => {
    try {
      const stored = localStorage.getItem('vocapp.seenStories');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeStoryIdx, setActiveStoryIdx] = useState(null);

  // Mark story seen in localStorage
  const markSeen = (id) => {
    setSeenSet((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem('vocapp.seenStories', JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });
  };

  // Build dynamic story items
  const stories = [];

  // 1. Expiring / hot saved word
  const hotSaved = savedWords.find(w => w.expiresInDays <= 2) || savedWords[0];
  if (hotSaved) {
    stories.push({
      id: `saved-${hotSaved.word}`,
      label: hotSaved.word,
      kind: hotSaved.expiresInDays <= 2 ? `Saved · expires in ${hotSaved.expiresInDays}d` : 'Saved yesterday',
      title: hotSaved.word,
      definition: hotSaved.definition || hotSaved.short,
      example: hotSaved.example,
      cta: 'Practise now · 3 sentences',
      actionType: 'practice-word',
      data: hotSaved
    });
  }

  // 2. High priority due word
  const topDue = dueWords[0];
  if (topDue) {
    stories.push({
      id: `due-${topDue.word}`,
      label: topDue.word,
      kind: 'Due for review',
      title: topDue.word,
      definition: topDue.definition || topDue.short,
      example: topDue.example,
      cta: 'Review due words',
      actionType: 'reviews',
      data: topDue
    });
  }

  // 3. Vault slip
  const openSlip = vaultSlips.find(m => !m.isRedeemed && !m.fixed);
  if (openSlip) {
    stories.push({
      id: `slip-${openSlip.id || openSlip.word}`,
      label: 'Your slip',
      avatar: '!',
      kind: 'From your Mistake Vault',
      title: openSlip.word || 'Past slip',
      slip: {
        orig: openSlip.orig || openSlip.originalSentence || openSlip.sentence,
        better: openSlip.better || openSlip.correctedSentence || openSlip.fix
      },
      cta: 'Fix it',
      actionType: 'fix-slip',
      data: openSlip
    });
  }

  // 4. Anthology sentence
  const topAnth = anthologySentences[0];
  if (topAnth) {
    stories.push({
      id: `craft-${topAnth.id || topAnth.word}`,
      label: 'Crafted',
      avatar: '✓',
      kind: 'From your Anthology',
      title: topAnth.word || 'Anthology',
      example: topAnth.sentence || topAnth.text,
      cta: 'Open Anthology',
      actionType: 'anthology',
      data: topAnth
    });
  }

  if (stories.length === 0) return null;

  const handleRingClick = (idx) => {
    markSeen(stories[idx].id);
    setActiveStoryIdx(idx);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          padding: '14px 20px 4px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
        className="stories"
        aria-label="Quick look stories"
      >
        {stories.map((story, idx) => {
          const isSeen = seenSet.has(story.id);

          return (
            <button
              key={story.id}
              onClick={() => handleRingClick(idx)}
              style={{
                flexShrink: 0,
                width: '68px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                scrollSnapAlign: 'start',
                cursor: 'pointer'
              }}
              className="story-b press"
              aria-label={story.label}
            >
              {/* Outer Ring */}
              <div
                style={{
                  width: '66px',
                  height: '66px',
                  borderRadius: '50%',
                  padding: '2.5px',
                  background: isSeen
                    ? '#3A3A3F'
                    : 'conic-gradient(from 210deg, var(--acc), #C6A8FF, var(--warn), var(--acc))',
                  transition: 'background 0.3s ease'
                }}
              >
                {/* Dark Gap */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'var(--bg)',
                    padding: '3px'
                  }}
                >
                  {/* Center Circle */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: 'var(--card2)',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--serif)',
                      fontSize: '24px',
                      fontStyle: 'italic',
                      color: 'var(--fg)'
                    }}
                  >
                    {story.avatar || story.label[0]}
                  </div>
                </div>
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--fg2)',
                  maxWidth: '68px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {story.label}
              </span>
            </button>
          );
        })}
      </div>

      <StoriesViewer
        stories={stories}
        initialIndex={activeStoryIdx || 0}
        isOpen={activeStoryIdx !== null}
        onClose={() => setActiveStoryIdx(null)}
        onAction={onStoryAction}
      />
    </>
  );
}

export default Stories;
