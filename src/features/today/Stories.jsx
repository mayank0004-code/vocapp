import React, { useState } from 'react';
import StoriesViewer from './StoriesViewer';
import { formatWhen, expiryPhrase } from './when';
import { safeStr } from '../words/wordFormat';

export function Stories({
  dueWords = [],
  savedWords = [],
  vaultSlips = [],
  anthologySentences = [],
  activationKey = 0,
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
      } catch { /* storage unavailable */ }
      return next;
    });
  };

  // Build dynamic story items
  const stories = [];

  // 1. Saved word closest to expiring (oldest createdAt)
  const hotSaved = [...savedWords].sort(
    (a, b) => (a.expiresInDays ?? 99) - (b.expiresInDays ?? 99) || (a.createdAt || 0) - (b.createdAt || 0)
  )[0];
  if (hotSaved) {
    const savedWhen = formatWhen(hotSaved.createdAt);
    const expiring = typeof hotSaved.expiresInDays === 'number' && hotSaved.expiresInDays <= 2;
    stories.push({
      id: `saved-${hotSaved.word}`,
      label: hotSaved.word,
      kind: expiring
        ? `Saved · ${expiryPhrase(hotSaved.expiresInDays)}`
        : savedWhen ? `Saved ${savedWhen}` : 'Saved for later',
      when: savedWhen ? `saved ${savedWhen}` : '',
      title: hotSaved.word,
      definition: safeStr(hotSaved.definition || hotSaved.short),
      example: safeStr(hotSaved.example),
      cta: 'Practise now · 3 sentences',
      actionType: 'practice-word',
      data: hotSaved
    });
  }

  // 2. Most overdue due word (smallest nextReviewDate)
  const topDue = dueWords.reduce(
    (best, w) => (!best || (w.nextReviewDate || Infinity) < (best.nextReviewDate || Infinity) ? w : best),
    null
  );
  if (topDue) {
    const dueWhen = formatWhen(topDue.nextReviewDate);
    stories.push({
      id: `due-${topDue.word}`,
      label: topDue.word,
      kind: dueWords.length > 1 ? `Due for review · ${dueWords.length} words` : 'Due for review',
      when: dueWhen ? `due ${dueWhen}` : '',
      title: topDue.word,
      definition: safeStr(topDue.definition || topDue.short),
      example: safeStr(topDue.example),
      cta: 'Review due words',
      actionType: 'reviews',
      data: topDue
    });
  }

  // 3. Vault slip (vault is ordered newest first)
  const openSlip = vaultSlips.find(m => !m.isRedeemed && !m.fixed);
  if (openSlip) {
    const slipWhen = formatWhen(openSlip.timestamp);
    stories.push({
      id: `slip-${openSlip.id || openSlip.word}`,
      label: 'Your slip',
      avatar: '!',
      kind: 'From your Mistake Vault',
      when: slipWhen ? `logged ${slipWhen}` : '',
      title: openSlip.word || 'Past slip',
      slip: {
        orig: safeStr(openSlip.originalSentence || openSlip.orig || openSlip.sentence),
        better: safeStr(openSlip.reframedSentence || openSlip.better || openSlip.correctedSentence || openSlip.fix),
        rule: safeStr(openSlip.ruleOfThumb)
      },
      cta: 'Fix it',
      actionType: 'fix-slip',
      data: openSlip
    });
  }

  // 4. Anthology sentence (newest first)
  const topAnth = anthologySentences[0];
  if (topAnth) {
    const anthWhen = formatWhen(topAnth.timestamp);
    stories.push({
      id: `craft-${topAnth.id || topAnth.word}`,
      label: 'Crafted',
      avatar: '✓',
      kind: 'From your Anthology',
      when: anthWhen ? `saved ${anthWhen}` : '',
      title: topAnth.word || 'Anthology',
      example: safeStr(topAnth.sentence || topAnth.text),
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
              key={`${story.id}-${activationKey}`}
              onClick={() => handleRingClick(idx)}
              style={{
                flexShrink: 0,
                width: '68px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                scrollSnapAlign: 'start',
                cursor: 'pointer',
                '--i': idx
              }}
              className="story-b press card-cascade"
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
