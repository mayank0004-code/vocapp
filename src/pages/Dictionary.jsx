/**
 * Dictionary.jsx — all learned words in surface-grouped list.
 * Features: search, Due/All/Mastered filter, maturity indicator,
 * relative interval, expand via WordSheet, delete.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { getAllWords, deleteLearnedWord } from '../services/db';
import { Loader2, Trash, ChevronDown } from '../components/Icons';
import WordSheet from '../components/WordSheet';
import { springs } from '../motion/springs';

/* ── Maturity dot ────────────────────────────────────────── */
const MATURITY_COLORS = [
  'var(--color-error)',   // 0: new
  'var(--color-warning)', // 1-2
  'var(--color-warning)',
  'var(--color-success)', // 3-5
  'var(--color-success)',
  'var(--color-success)',
  'var(--accent-color)',  // 6+: mastered
];

function MaturityDot({ interval }) {
  const level = Math.min(Math.floor(interval || 0), MATURITY_COLORS.length - 1);
  return (
    <div
      aria-label={interval >= 21 ? 'Mastered' : interval >= 7 ? 'Learning' : 'New'}
      title={`Interval: ${interval || 0} days`}
      style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: MATURITY_COLORS[level],
        flexShrink: 0,
      }}
    />
  );
}

/* ── Relative interval label ─────────────────────────────── */
function nextReviewLabel(nextReviewDate) {
  if (!nextReviewDate) return '';
  const diff = Math.round((nextReviewDate - Date.now()) / 86400000);
  if (diff <= 0) return 'Due now';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

/* ── Confirm delete button (two-step safety) ─────────────── */
function DeleteBtn({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
      <button
        className="btn btn-secondary"
        style={{ flex: 1 }}
        onClick={() => setArmed(false)}
      >
        Cancel
      </button>
      <button
        className="btn"
        style={{ flex: 1, background: 'rgba(255,59,48,0.1)', color: 'var(--color-error)' }}
        onClick={onConfirm}
      >
        Delete
      </button>
    </div>
  ) : (
    <button
      className="btn btn-ghost"
      style={{ marginTop: 'var(--sp-3)', color: 'var(--color-error)', width: '100%' }}
      onClick={() => setArmed(true)}
    >
      <Trash size={15} style={{ marginRight: 'var(--sp-2)' }} />
      Remove word
    </button>
  );
}

/* ── Main Component ─────────────────────────────────────── */
const FILTERS = ['All', 'Due', 'Mastered'];

export default function Dictionary({ currentUser }) {
  const [words, setWords]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError]       = useState(null);

  // WordSheet state — open expanded word in the shared sheet
  const [sheetWord, setSheetWord] = useState(null);

  useEffect(() => {
    async function load() {
      if (!currentUser) return;
      try {
        const all = await getAllWords(currentUser.uid);
        // Sort: due-first, then alphabetical
        all.sort((a, b) => {
          const aDue = (a.nextReviewDate || 0) - Date.now();
          const bDue = (b.nextReviewDate || 0) - Date.now();
          if (aDue <= 0 && bDue > 0) return -1;
          if (bDue <= 0 && aDue > 0) return 1;
          return a.word.localeCompare(b.word);
        });
        setWords(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const now = Date.now();

  const filtered = useMemo(() => {
    return words.filter(w => {
      const matchSearch = !search || w.word.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All'
        || (filter === 'Due' && (w.nextReviewDate || 0) <= now)
        || (filter === 'Mastered' && (w.interval || 0) >= 21);
      return matchSearch && matchFilter;
    });
  }, [words, search, filter, now]);

  const handleDelete = async (wordId) => {
    try {
      await deleteLearnedWord(currentUser.uid, wordId);
      setWords(ws => ws.filter(w => w.id !== wordId));
      setExpandedId(null);
      setError(null);
    } catch {
      setError('Failed to delete. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-5) 0' }}>

      {/* Search */}
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <input
          className="input"
          type="search"
          placeholder="Search words…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div
        role="group"
        aria-label="Filter words"
        style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}
      >
        {FILTERS.map(f => (
          <button
            key={f}
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px var(--sp-3)',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--type-sm)',
              fontWeight: filter === f ? 600 : 400,
              background: filter === f ? 'var(--accent-color)' : 'rgba(120,120,128,0.1)',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--type-sm)', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
          {filtered.length} word{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div aria-live="polite" style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)', background: 'rgba(255,59,48,0.06)', color: 'var(--color-error)', fontSize: 'var(--type-sm)' }}>
          {error}
        </div>
      )}

      {/* Word List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-12) var(--sp-6)' }}>
          <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)' }}>
            {words.length === 0
              ? 'Your dictionary is empty. Look up your first word!'
              : 'No words match this filter.'}
          </p>
        </div>
      ) : (
        <div className="surface-grouped">
          {filtered.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isDue      = (item.nextReviewDate || 0) <= now;
            return (
              <div key={item.id}>
                {/* Row */}
                <button
                  aria-expanded={isExpanded}
                  aria-controls={`dict-detail-${item.id}`}
                  onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--sp-4)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                    color: 'var(--text-primary)',
                    gap: 'var(--sp-3)',
                    minHeight: 60,
                    textAlign: 'left',
                  }}
                >
                  <MaturityDot interval={item.interval} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--type-body)', margin: 0, textTransform: 'capitalize' }}>
                      {item.word}
                    </p>
                    <p style={{ fontSize: 'var(--type-xs)', color: isDue ? 'var(--color-warning)' : 'var(--text-tertiary)', margin: 0, marginTop: 2 }}>
                      {nextReviewLabel(item.nextReviewDate)}
                    </p>
                  </div>

                  <m.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={springs.reveal}
                    style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                  >
                    <ChevronDown size={18} />
                  </m.div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <m.div
                      id={`dict-detail-${item.id}`}
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={springs.reveal}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: 'var(--sp-2) var(--sp-4) var(--sp-4)',
                        borderTop: '0.5px solid var(--border-color)',
                      }}>
                        {/* Definition */}
                        <p style={{ fontSize: 'var(--type-body)', margin: '0 0 var(--sp-4)', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                          {item.definition}
                        </p>

                        {/* Your sentences */}
                        {(item.factualSentence || item.personalSentence || item.questionSentence) && (
                          <div style={{ marginBottom: 'var(--sp-4)' }}>
                            <p className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>Your sentences</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                              {item.factualSentence && <p style={{ fontSize: 'var(--type-sm)', margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{item.factualSentence}"</p>}
                              {item.personalSentence && <p style={{ fontSize: 'var(--type-sm)', margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{item.personalSentence}"</p>}
                              {item.questionSentence && <p style={{ fontSize: 'var(--type-sm)', margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{item.questionSentence}"</p>}
                            </div>
                          </div>
                        )}

                        {/* Full breakdown sheet trigger */}
                        <button
                          className="btn btn-secondary"
                          style={{ width: '100%', marginBottom: 'var(--sp-2)' }}
                          onClick={() => setSheetWord(item)}
                        >
                          View full breakdown
                        </button>

                        <DeleteBtn onConfirm={() => handleDelete(item.id)} />
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom pad */}
      <div style={{ height: 'var(--sp-6)' }} />

      {/* WordSheet for full breakdown — no Practice/Save footer in Dictionary context */}
      <WordSheet
        isOpen={!!sheetWord}
        onClose={() => setSheetWord(null)}
        wordData={sheetWord}
        loading={false}
        word={sheetWord?.word}
        onPractice={() => setSheetWord(null)}
        onSaveForLater={() => setSheetWord(null)}
      />
    </div>
  );
}
