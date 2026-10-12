import React, { useState, useMemo } from 'react';
import { useWords, useStats, useVault, useAnthology, useData } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import Chip from '../../ui/Chip';
import BellPopover from './BellPopover';
import Stories from './Stories';
import SessionCard from './SessionCard';
import Capture from './Capture';
import SavedList from './SavedList';
import WordDetailPage from '../words/WordDetailPage';
import SettingsPage from '../settings/SettingsPage';
import { useLayout } from '../../motion/useLayout';
import { useTabActivation } from '../../motion/useTabActivation';

export function TodayScreen({
  isActive = true,
  onSwitchTab = () => {},
  onStartSession = () => {},
  onSignOut = () => {}
}) {
  const { activationKey } = useTabActivation(isActive);
  const { currentUser } = useData();
  const { dueWords, savedWords, allWords } = useWords();
  const { stats, todayPlan, currentStreak, highestStreak } = useStats();
  const isTodayDone = !!(todayPlan && todayPlan.itemsDone >= 12);
  const displayStreak = isTodayDone ? Math.max(2, currentStreak) : 1;
  const { openMistakes } = useVault();
  const { anthology } = useAnthology();
  const { push } = useNav();
  const { isLaptop, isTablet } = useLayout();

  const [isBellOpen, setIsBellOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  // Formatted date (e.g. "Monday, 12 October")
  const dateString = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }, []);

  // Expiring word for bell indicator (any saved word expiring within 2 days)
  const expiringWord = useMemo(() => {
    return savedWords.find(w => typeof w.expiresInDays === 'number' && w.expiresInDays <= 2) || null;
  }, [savedWords]);

  // Target word for writing practice card
  const targetWord = useMemo(() => {
    const unmastered = allWords.find(w => w.status !== 'mastered');
    return unmastered?.word || 'albeit';
  }, [allWords]);

  // User avatar letter
  const avatarLetter = (currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'D').toUpperCase();

  const handleOpenSettings = () => {
    push({
      id: 'settings-screen',
      title: 'Settings',
      component: SettingsPage,
      props: { onSignOut },
      hideTab: true
    });
  };

  const handleOpenWord = (word) => {
    push({
      id: `word-${word.word}`,
      title: word.word,
      component: WordDetailPage,
      props: { word },
      hideTab: false
    });
  };

  // Frosted topbar interpolation: clamp((scrollTop - 20) / 34, 0, 1)
  const topBarProgress = Math.min(1, Math.max(0, (scrollTop - 20) / 34));

  return (
    <div
      className="scroller"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)'
      }}
    >
      {/* Dynamic Frosted Topbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--topH, 56px)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: topBarProgress > 0.05 ? '0.5px solid var(--line)' : '0.5px solid transparent',
          background: `rgba(11, 11, 13, ${(0.85 * topBarProgress).toFixed(3)})`,
          backdropFilter: topBarProgress > 0.05 ? 'blur(22px) saturate(180%)' : 'none',
          WebkitBackdropFilter: topBarProgress > 0.05 ? 'blur(22px) saturate(180%)' : 'none',
          pointerEvents: 'none',
          transition: 'border-color 0.2s'
        }}
      >
        <div
          style={{
            fontSize: '17px',
            fontWeight: 600,
            opacity: topBarProgress,
            transform: `translateY(${(10 * (1 - topBarProgress)).toFixed(1)}px)`,
            transition: 'opacity 0.15s, transform 0.15s'
          }}
        >
          Today
        </div>
      </div>

      {/* Large Header Bar */}
      <header
        style={{
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: '10px var(--gutter, 20px) 4px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}
        className="lt"
      >
        <div className="t">
          <small
            style={{
              fontSize: '13px',
              color: 'var(--mute)',
              fontWeight: 500,
              display: 'block',
              marginBottom: '2px'
            }}
          >
            {dateString}
          </small>
          <h1
            style={{
              margin: 0,
              fontSize: isLaptop ? '40px' : '34px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.08
            }}
          >
            Today
          </h1>
        </div>

        {/* Action Buttons: Streak, Bell, Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '4px'
          }}
          className="acts"
        >
          {/* Streak Flame Chip */}
          <Chip
            variant="streak"
            onClick={() => onSwitchTab(3)}
            aria-label={`Current streak: ${displayStreak} ${displayStreak === 1 ? 'day' : 'days'}`}
          >
            <span className="num" style={{ fontWeight: 700 }}>
              {displayStreak}
            </span>
          </Chip>

          {/* Expiring Bell Button */}
          <button
            id="bellBtn"
            type="button"
            className="press"
            onClick={(e) => {
              e.stopPropagation();
              setIsBellOpen(prev => !prev);
            }}
            aria-expanded={isBellOpen}
            aria-label="Expiring saved words notification"
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              background: 'var(--card2)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg)',
              cursor: 'pointer'
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {/* Notification Dot */}
            {expiringWord && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--org)',
                  border: '1.5px solid var(--bg)'
                }}
              />
            )}
          </button>

          {/* User Avatar Button */}
          <button
            id="avatar"
            type="button"
            className="avatar press"
            onClick={handleOpenSettings}
            aria-label="Account and settings"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              background: 'var(--card3)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14.5px',
              color: 'var(--fg)',
              cursor: 'pointer'
            }}
          >
            {avatarLetter}
          </button>
        </div>
      </header>

      {/* Bell Popover */}
      <BellPopover
        isOpen={isBellOpen}
        onClose={() => setIsBellOpen(false)}
        expiringWord={expiringWord}
        onPractice={(word) => onStartSession('practice-word', { word })}
      />

      {/* Main Content Layout: 2 Columns on Tablet & Laptop, 1 Column on Phone */}
      {isTablet || isLaptop ? (
        <div
          style={{
            maxWidth: 'var(--content-max)',
            margin: '0 auto',
            padding: '0 var(--gutter, 20px)',
            display: 'grid',
            gridTemplateColumns: isLaptop ? '7fr 5fr' : '1fr 1fr',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          {/* Left Column: Session Card & Saved Shelf */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SessionCard
              dueWordsCount={dueWords.length}
              targetWord={targetWord}
              drillsRemaining={2}
              itemsDone={todayPlan.itemsDone}
              streak={currentStreak}
              highestStreak={highestStreak}
              activeDates={stats.activeDates || []}
              activationKey={activationKey}
              onStartSession={() => onStartSession('full', {})}
              onOnlyReviews={() => onStartSession('reviews', {})}
              onOnlyDrills={() => onStartSession('drills', {})}
            />

            <SavedList
              savedWords={savedWords}
              onPractice={(item) => onStartSession('practice-word', { word: item.word })}
              onOpenWord={(item) => handleOpenWord(item)}
            />
          </div>

          {/* Right Column: Word Stories & Quick Capture */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Stories
              dueWords={dueWords}
              savedWords={savedWords}
              vaultSlips={openMistakes}
              anthologySentences={anthology}
              activationKey={activationKey}
              onStoryAction={(actionType, data) => {
                if (actionType === 'practice-word') {
                  onStartSession('practice-word', { word: data.word });
                } else if (actionType === 'reviews') {
                  onStartSession('reviews', {});
                } else if (actionType === 'fix-slip') {
                  onSwitchTab(1);
                } else if (actionType === 'anthology') {
                  onSwitchTab(1);
                }
              }}
            />

            <Capture
              onPractice={(wordData) => onStartSession('practice-word', { word: wordData.word })}
              onOpenInWords={(wordData) => handleOpenWord(wordData)}
            />
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          {/* 1. Instagram Stories Word Rings */}
          <Stories
            dueWords={dueWords}
            savedWords={savedWords}
            vaultSlips={openMistakes}
            anthologySentences={anthology}
            activationKey={activationKey}
            onStoryAction={(actionType, data) => {
              if (actionType === 'practice-word') {
                onStartSession('practice-word', { word: data.word });
              } else if (actionType === 'reviews') {
                onStartSession('reviews', {});
              } else if (actionType === 'fix-slip') {
                onSwitchTab(1);
              } else if (actionType === 'anthology') {
                onSwitchTab(1);
              }
            }}
          />

          {/* 2. Unified Session Card */}
          <SessionCard
            dueWordsCount={dueWords.length}
            targetWord={targetWord}
            drillsRemaining={2}
            itemsDone={todayPlan.itemsDone}
            streak={currentStreak}
            highestStreak={highestStreak}
            activeDates={stats.activeDates || []}
            activationKey={activationKey}
            onStartSession={() => onStartSession('full', {})}
            onOnlyReviews={() => onStartSession('reviews', {})}
            onOnlyDrills={() => onStartSession('drills', {})}
          />

          {/* 3. Word Capture with Spell-Correction */}
          <Capture
            onPractice={(wordData) => onStartSession('practice-word', { word: wordData.word })}
            onOpenInWords={(wordData) => handleOpenWord(wordData)}
          />

          {/* 4. Saved for Later Shelf (7-Day Expiry) */}
          <SavedList
            savedWords={savedWords}
            onPractice={(item) => onStartSession('practice-word', { word: item.word })}
            onOpenWord={(item) => handleOpenWord(item)}
          />
        </div>
      )}
    </div>
  );
}

export default TodayScreen;
