import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Button from '../../ui/Button';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import { deletePendingWord, savePendingWord } from '../../services/db';
import { useData } from '../../data/DataProvider';

function SavedRow({ item, onPractice, onOpenDetails, onRemove }) {
  const [dragOffset, setDragOffset] = useState(0);
  const isExpiring = (item.expiresInDays && item.expiresInDays <= 2) || item.hot;

  const dueLabel = item.dueLabel || (
    item.expiresInDays
      ? (item.expiresInDays <= 2 ? `Expires in ${item.expiresInDays}d` : `Expires in ${item.expiresInDays}d`)
      : 'Saved for later'
  );

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#E5484D'
      }}
      className="srow"
    >
      {/* Background Red Delete Action */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#E5484D',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '20px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '14.5px',
          cursor: 'pointer'
        }}
        onClick={() => onRemove(item)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginRight: '6px' }}
        >
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        <span>Remove</span>
      </div>

      {/* Foreground Draggable Surface */}
      <m.div
        drag="x"
        dragConstraints={{ left: -112, right: 0 }}
        dragElastic={{ left: 0.25, right: 0.05 }}
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -140 || info.velocity.x < -600) {
            triggerHaptic('medium');
            onRemove(item);
          } else if (info.offset.x < -50) {
            triggerHaptic('light');
          }
        }}
        style={{
          position: 'relative',
          background: '#1B1B1E',
          borderRadius: '16px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        className="srow-fg"
        onClick={() => {
          if (dragOffset > -10) {
            onOpenDetails(item);
          }
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            className="serif"
            style={{
              fontSize: '20px',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--fg)',
              letterSpacing: '-0.01em'
            }}
          >
            {item.word}
          </span>
          <span
            style={{
              fontSize: '13px',
              color: isExpiring ? 'var(--org2)' : 'var(--mute)',
              fontWeight: isExpiring ? 500 : 400
            }}
          >
            {dueLabel}
          </span>
        </div>

        <Button
          variant="grey"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onPractice(item);
          }}
          style={{ flex: 'none', height: '32px', padding: '0 12px', fontSize: '13px' }}
        >
          Practise
        </Button>
      </m.div>
    </div>
  );
}

export function SavedList({
  savedWords = [],
  onPractice = () => {},
  onOpenWord = () => {}
}) {
  const { currentUser } = useData();
  const [removedIds, setRemovedIds] = useState(new Set());

  const handleRemove = async (item) => {
    if (!currentUser?.uid) return;
    const wordKey = item.id || item.word;

    // Optimistically hide
    setRemovedIds(prev => new Set(prev).add(wordKey));
    triggerHaptic('success');

    try {
      await deletePendingWord(currentUser.uid, wordKey);
      showToast(
        <span>Removed <em className="serif">{item.word}</em> from saved</span>,
        'Undo',
        async () => {
          setRemovedIds(prev => {
            const next = new Set(prev);
            next.delete(wordKey);
            return next;
          });
          await savePendingWord(currentUser.uid, item);
          triggerHaptic('light');
        }
      );
    } catch (err) {
      console.error('Failed to remove saved word:', err);
      // Revert optimistic removal
      setRemovedIds(prev => {
        const next = new Set(prev);
        next.delete(wordKey);
        return next;
      });
    }
  };

  const visibleList = savedWords.filter(w => !removedIds.has(w.id || w.word));

  return (
    <section
      style={{
        margin: '12px 16px 0',
        borderRadius: '20px',
        padding: '6px 6px 12px',
        background: 'var(--card)',
        border: '1px solid var(--line)'
      }}
      className="card savedc"
      aria-label="Saved for later"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '12px 14px 8px'
        }}
        className="hd"
      >
        <b style={{ fontSize: '15px', fontWeight: 600 }}>
          Saved for later · {visibleList.length}
        </b>
        <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
          kept for 7 days
        </span>
      </div>

      {/* List items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
        className="slist"
      >
        {visibleList.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--mute)',
              fontSize: '14px',
              lineHeight: 1.5
            }}
          >
            No saved words. Use “Save for later” after looking up a word.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleList.map((item) => (
              <m.div
                key={item.id || item.word}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: -6 }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <SavedRow
                  item={item}
                  onPractice={() => onPractice(item)}
                  onOpenDetails={() => onOpenWord(item)}
                  onRemove={handleRemove}
                />
              </m.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Swipe Hint */}
      {visibleList.length > 0 && (
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--mute)',
            padding: '10px 14px 2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          className="hint"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M19 12H5m6-6-6 6 6 6" />
          </svg>
          Swipe a word left to remove it
        </div>
      )}
    </section>
  );
}

export default SavedList;
