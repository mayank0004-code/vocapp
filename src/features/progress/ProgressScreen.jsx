import React, { useState, useMemo } from 'react';
import { useWords, useStats, useVault, useAnthology } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import { triggerHaptic } from '../../motion/haptics';
import Button from '../../ui/Button';
import { VaultPage } from '../practice/VaultPage';
import { AnthologyPage } from '../practice/AnthologyPage';
import { DrillPage } from '../practice/DrillPage';
import { useLayout } from '../../motion/useLayout';

const HABITS = [
  {
    title: 'Repeating the same sentence openers',
    tip: 'Start with a prepositional phrase or a gerund.',
    meta: 'Flow · seen 4 times · last with “avail”',
    k: 1,
    tag: 'Coaching'
  },
  {
    title: 'Using “very” or “extremely”',
    tip: 'Reach for a stronger verb or adjective instead.',
    meta: 'Context · seen 3 times · last with “abstruse”',
    k: 2,
    tag: 'Needs work'
  },
  {
    title: 'Mixing past and present',
    tip: 'Pick one time frame and stay in it.',
    meta: 'Grammar · seen 2 times · last with “relic”',
    k: 0,
    tag: 'Needs work'
  },
  {
    title: 'Over-complicated wording',
    tip: 'Choose the plainest way to say it.',
    meta: 'Flow · seen 3 times · last with “patronage”',
    k: 1,
    tag: 'Coaching'
  }
];

const SKILLS_INFO = [
  { name: 'Grammar', level: 2, pct: 55 },
  { name: 'Flow', level: 1, pct: 40 },
  { name: 'Context', level: 1, pct: 30 },
  { name: 'Punctuation', level: 1, pct: 15 }
];

export function ProgressScreen({ onSwitchTab = () => {} }) {
  const { allWords = [], masteredWords = [] } = useWords();
  const { stats, currentStreak = 1, highestStreak = 30, craftLevelInfo } = useStats();
  const { openMistakes = [], fixedMistakes = [], allMistakes = [] } = useVault();
  const { anthology = [] } = useAnthology();
  const { push } = useNav();
  const { isLaptop, isTablet } = useLayout();

  const [scrollTop, setScrollTop] = useState(0);

  // Frosted topbar interpolation
  const topBarProgress = Math.min(1, Math.max(0, (scrollTop - 20) / 34));

  const xp = stats?.xp || stats?.totalPracticed || 180;
  const drillsSolved = stats?.drillsDone || stats?.drills || 12;
  const rank = craftLevelInfo?.rank || 'Craftsman';
  const levelNum = craftLevelInfo?.level || 2;

  const rankText = xp >= 300
    ? 'Wordsmith unlocked'
    : `Wordsmith needs ${Math.max(0, 300 - xp)} more XP and ${Math.max(0, 3 - fixedMistakes.length)} Vault fixes`;

  const totalSlips = allMistakes.length || 23;

  const handleOpenVault = () => {
    triggerHaptic('light');
    push({
      id: 'mistake-vault',
      title: 'Mistake Vault',
      component: VaultPage,
      props: {
        onFixMistake: (m) => {
          push({
            id: `drill-fix-${m.id}`,
            title: 'Drill',
            component: DrillPage,
            props: {
              skillId: m.skillId || 0,
              initialTier: 3,
              mistake: m
            },
            hideTab: true
          });
        }
      },
      hideTab: true
    });
  };

  const handleOpenAnthology = () => {
    triggerHaptic('light');
    push({
      id: 'anthology',
      title: 'Anthology',
      component: AnthologyPage,
      hideTab: true
    });
  };

  const handlePracticeSkill = (k) => {
    triggerHaptic('light');
    onSwitchTab(1);
  };

  // 35 Calendar Cells for month heatmap
  const calendarCells = useMemo(() => {
    const cells = [];
    const todayDate = new Date().getDate();
    for (let i = 0; i < 35; i++) {
      const dayOfMonth = i - 2; // Offset for Monday start
      let state = '';
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        state = 'x'; // outside month
      } else if (dayOfMonth === 11 || (stats?.activeDates && stats.activeDates.includes(dayOfMonth))) {
        state = 'on';
      } else if (dayOfMonth === todayDate) {
        state = currentStreak >= 2 ? 'on' : 'today';
      }
      cells.push({ index: i, state });
    }
    return cells;
  }, [stats?.activeDates, currentStreak]);

  // Sub-components for flexible multi-column rendering
  const StreakCard = (
    <section className="pcard streakc" aria-label="Streak" style={{ margin: 0 }}>
      <div className="r1">
        <div>
          <span className="lab">Streak</span>
          <span className="big num">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </span>
          <small>Best: {highestStreak} days · 1 streak freeze ready</small>
        </div>
        <span style={{ color: 'var(--warn)', marginTop: '4px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </span>
      </div>

      <div className="calh" aria-hidden="true">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
      <div className="cal go" role="img" aria-label="Activity calendar">
        {calendarCells.map((c) => (
          <i
            key={c.index}
            className={c.state}
            style={{ '--i': c.index }}
          />
        ))}
      </div>
    </section>
  );

  const MetricTiles = (
    <div className="tiles" style={{ margin: 0 }}>
      <button
        className="tile press"
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(2);
        }}
      >
        <span>Words</span>
        <b className="num">{allWords.length || 84}</b>
        <small>{masteredWords.length || 12} mastered</small>
      </button>

      <button
        className="tile press"
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(1);
        }}
      >
        <span>Drills solved</span>
        <b className="num">{drillsSolved}</b>
        <small>across 4 skills</small>
      </button>

      <button
        className="tile press"
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(1);
        }}
      >
        <span>Accuracy</span>
        <b className="num">82%</b>
        <small>last 30 days</small>
      </button>

      <button
        className="tile press"
        onClick={handleOpenVault}
      >
        <span>Vault slips</span>
        <b className="num">{openMistakes.length || 3}</b>
        <small>{fixedMistakes.length || 5} fixed</small>
      </button>
    </div>
  );

  const RankCard = (
    <section className="pcard rankc" aria-label="Writing level" style={{ margin: 0 }}>
      <div className="hd">
        <h2>Writing level · {rank}</h2>
        <span>L{levelNum}</span>
      </div>
      <p className="rsub">{rankText}</p>
      <div className="xpbar">
        <i style={{ width: `${Math.min(100, Math.max(10, (xp / 600) * 100))}%` }} />
      </div>

      <div className="lgrid">
        {SKILLS_INFO.map((s) => (
          <div key={s.name} className="c">
            <span className="nm">{s.name}</span>
            <span className="lv">L{s.level}</span>
            <span className="bar">
              <i style={{ width: `${s.pct}%` }} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const SlipsCard = (
    <section className="pcard slips" aria-label="Where your slips happen" style={{ margin: 0 }}>
      <div className="hd">
        <h2>Where your slips happen</h2>
        <span>{totalSlips} total</span>
      </div>
      <div className="sbar" aria-hidden="true">
        <span style={{ width: '42%' }} className="g" title="Grammar 42%" />
        <span style={{ width: '28%' }} className="c" title="Context 28%" />
        <span style={{ width: '18%' }} className="f" title="Flow 18%" />
        <span style={{ width: '12%' }} className="p" title="Punctuation 12%" />
      </div>
      <div className="leg">
        <span><i className="g" />Grammar 42%</span>
        <span><i className="c" />Context 28%</span>
        <span><i className="f" />Flow 18%</span>
        <span><i className="p" />Punctuation 12%</span>
      </div>
    </section>
  );

  const FocusCard = (
    <section className="focusc" aria-label="Focus area" style={{ margin: 0 }}>
      <span className="lab">Focus area</span>
      <h2>Context · collocation mismatches</h2>
      <p>You know what the words mean; the trap is using them where a native ear expects a different verb.</p>
      <Button
        variant="primary"
        size="sm"
        onClick={() => handlePracticeSkill(2)}
        style={{
          alignSelf: 'flex-start',
          width: 'auto',
          padding: '0 20px',
          marginTop: '6px'
        }}
      >
        Practise Context
      </Button>
    </section>
  );

  const HabitsCard = (
    <section className="pcard habits" aria-label="Habits to work on" style={{ margin: 0 }}>
      <div className="hd">
        <h2>Habits to work on</h2>
        <span>4 tracked</span>
      </div>
      <ul>
        {HABITS.map((h, idx) => (
          <li key={idx}>
            <button
              className="press"
              onClick={() => handlePracticeSkill(h.k)}
            >
              <div className="grow">
                <b>{h.title}</b>
                <span className="tp">{h.tip}</span>
                <span className="mt">{h.meta}</span>
              </div>
              <span
                className="htag"
                style={{
                  background: h.tag === 'Coaching' ? 'var(--accbg)' : 'var(--orgbg)',
                  color: h.tag === 'Coaching' ? 'var(--acc2)' : 'var(--org2)'
                }}
              >
                {h.tag}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const DuoCard = (
    <div className="duo" style={{ margin: 0 }}>
      <button
        onClick={handleOpenVault}
        className="press"
        style={{ border: '1px solid var(--line)' }}
      >
        <b>Mistake Vault</b>
        <span>{openMistakes.length} to fix · {fixedMistakes.length} fixed</span>
      </button>

      <button
        onClick={handleOpenAnthology}
        className="press"
        style={{ border: '1px solid var(--line)' }}
      >
        <b>Anthology</b>
        <span>{anthology.length} saved sentences</span>
      </button>
    </div>
  );

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
      {/* Frosted Topbar Interpolation */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: '48px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(11, 11, 13, ${(topBarProgress * 0.85).toFixed(2)})`,
          backdropFilter: topBarProgress > 0.05 ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: topBarProgress > 0.05 ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: topBarProgress > 0.05 ? '0.5px solid var(--line)' : '0.5px solid transparent',
          transition: 'border 0.2s',
          pointerEvents: 'none'
        }}
      >
        <span
          style={{
            fontSize: '17px',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            opacity: topBarProgress,
            transform: `translate3d(0, ${(1 - topBarProgress) * 6}px, 0)`,
            transition: 'opacity 0.2s var(--ease), transform 0.2s var(--ease)'
          }}
        >
          Progress
        </span>
      </div>

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--gutter, 16px)' }}>
        {/* Large Title Header */}
        <header style={{ padding: '16px 4px 12px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: isLaptop ? '40px' : '34px',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1
            }}
          >
            Progress
          </h1>
        </header>

        {/* 3 Columns on Laptop, 2 Columns on Tablet, 1 Column on Phone */}
        {isLaptop ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              alignItems: 'start'
            }}
          >
            {/* Col 1: Streak & Writing Level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {StreakCard}
              {RankCard}
            </div>

            {/* Col 2: Metrics, Slips Breakdown & Focus Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {MetricTiles}
              {SlipsCard}
              {FocusCard}
            </div>

            {/* Col 3: Habits & Duo Launchers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {HabitsCard}
              {DuoCard}
            </div>
          </div>
        ) : isTablet ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              alignItems: 'start'
            }}
          >
            {/* Col 1: Streak, Metrics & Level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {StreakCard}
              {MetricTiles}
              {RankCard}
            </div>

            {/* Col 2: Slips, Focus, Habits & Duo Launchers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {SlipsCard}
              {FocusCard}
              {HabitsCard}
              {DuoCard}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {StreakCard}
            {MetricTiles}
            {RankCard}
            {SlipsCard}
            {FocusCard}
            {HabitsCard}
            {DuoCard}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressScreen;
