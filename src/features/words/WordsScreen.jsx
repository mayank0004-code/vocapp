import React, { useState, useMemo } from 'react';
import { useWords } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import WordRow from './WordRow';
import WordDetailPage from './WordDetailPage';
import SwipeTabs from '../../ui/SwipeTabs';
import Button from '../../ui/Button';
import { Empty } from '../../ui/Feedback';

export function WordsScreen() {
  const { allWords, dueWords, savedWords, masteredWords } = useWords();
  const { push } = useNav();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const query = searchQuery.trim().toLowerCase();

  // Due-first, then alphabetical sorting for "All" tab
  const sortedAllWords = useMemo(() => {
    return [...allWords].sort((a, b) => {
      const aIsDue = typeof a.nextReviewDate === 'number' && a.nextReviewDate <= Date.now();
      const bIsDue = typeof b.nextReviewDate === 'number' && b.nextReviewDate <= Date.now();
      if (aIsDue && !bIsDue) return -1;
      if (!aIsDue && bIsDue) return 1;
      return (a.word || '').localeCompare(b.word || '');
    });
  }, [allWords]);

  const filterList = (list) => {
    if (!query) return list;
    return list.filter(w =>
      (w.word || '').toLowerCase().includes(query) ||
      (w.short || w.definition || '').toLowerCase().includes(query)
    );
  };

  const handleWordClick = (word) => {
    push({
      id: `word-${word.word}`,
      title: word.word,
      component: WordDetailPage,
      props: { word },
      hideTab: false
    });
  };

  const tabSets = [
    { id: 'all', label: 'All', count: allWords.length, list: filterList(sortedAllWords), emptyText: 'No words in your dictionary yet.' },
    { id: 'due', label: 'Due', count: dueWords.length, list: filterList(dueWords), emptyText: 'Nothing due right now. The next review is in about 1 hour.' },
    { id: 'saved', label: 'Saved', count: savedWords.length, list: filterList(savedWords), emptyText: 'No saved words. Use “Save for later” after a lookup.' },
    { id: 'mastered', label: 'Mastered', count: masteredWords.length, list: filterList(masteredWords), emptyText: 'No mastered words yet. Words reach Mastered after 14+ day intervals.' }
  ];

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '124px'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          padding: 'calc(var(--sb) + 14px) 20px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
      >
        <small style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 500 }}>
          {allWords.length} words
        </small>
        <h1
          style={{
            margin: 0,
            fontSize: '34px',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.08
          }}
        >
          Words
        </h1>
      </header>

      {/* Search Bar with Animated Cancel */}
      <div
        style={{
          margin: '14px 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div
          style={{
            flex: 1,
            height: '40px',
            borderRadius: '12px',
            padding: '0 12px',
            background: 'var(--card2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: isSearchFocused ? '1px solid rgba(124,136,255,0.5)' : '1px solid transparent',
            transition: 'border-color 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              if (!searchQuery) setIsSearchFocused(false);
            }}
            placeholder="Search your words"
            aria-label="Search your words"
            autoComplete="off"
            spellCheck="false"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'none',
              border: 0,
              outline: 0,
              fontSize: '16px',
              color: 'var(--fg)'
            }}
          />
        </div>
        {isSearchFocused && (
          <button
            onClick={() => {
              setSearchQuery('');
              setIsSearchFocused(false);
            }}
            style={{
              color: 'var(--acc2)',
              fontSize: '16px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Due Banner Shortcut */}
      {dueWords.length > 0 && (
        <div style={{ margin: '12px 16px 0' }}>
          <Button
            variant="pri"
            size="sm"
            onClick={() => {
              // Switches to Today or opens review session
              window.dispatchEvent(new CustomEvent('vocapp:open-session', { detail: { mode: 'reviews' } }));
            }}
          >
            Review the {dueWords.length} due {dueWords.length === 1 ? 'word' : 'words'}
          </Button>
        </div>
      )}

      {/* 4 Swipeable Segmented Tabs */}
      <div style={{ marginTop: '12px' }}>
        <SwipeTabs
          tabs={tabSets.map(t => ({ id: t.id, label: t.label, count: t.count }))}
          activeIndex={activeTab}
          onChange={setActiveTab}
        >
          {tabSets.map((tab) => (
            <div key={tab.id} style={{ padding: '14px 16px 8px' }}>
              {tab.list.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--card)',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1px solid var(--line)'
                  }}
                  className="wlist"
                >
                  {tab.list.map((wordItem) => (
                    <WordRow
                      key={wordItem.word || wordItem.id}
                      word={wordItem}
                      onClick={() => handleWordClick(wordItem)}
                    />
                  ))}
                </div>
              ) : (
                <Empty message={query ? 'No words match your search.' : tab.emptyText}>
                  {query && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        marginTop: '10px',
                        color: 'var(--acc2)',
                        fontSize: '14.5px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Show all words
                    </button>
                  )}
                </Empty>
              )}
            </div>
          ))}
        </SwipeTabs>
      </div>
    </div>
  );
}

export default WordsScreen;
