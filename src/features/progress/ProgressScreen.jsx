import React, { useState, useMemo } from 'react';
import { useWords, useStats, useVault, useAnthology } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import { triggerHaptic } from '../../motion/haptics';
import Button from '../../ui/Button';
import { VaultPage } from '../practice/VaultPage';
import { AnthologyPage } from '../practice/AnthologyPage';
import { DrillPage } from '../practice/DrillPage';
import { useLayout } from '../../motion/useLayout';
import { useTabActivation } from '../../motion/useTabActivation';
import { useCountUp } from '../../motion/useCountUp';

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

const SPEC_DATA = [
  { name: 'Context', k: 2, count: 15, pct: 65, org: true },
  { name: 'Flow', k: 1, count: 6, pct: 26 },
  { name: 'Grammar', k: 0, count: 2, pct: 9 },
  { name: 'Punctuation', k: 3, count: 0, pct: 0 }
];

export function ProgressScreen({ isActive = true, onSwitchTab = () => {} }) {
  const { activationKey } = useTabActivation(isActive);
  const { allWords = [], masteredWords = [] } = useWords();
  const { stats, todayPlan, currentStreak = 1, highestStreak = 30, craftLevelInfo } = useStats();
  const { openMistakes = [], fixedMistakes = [], allMistakes = [] } = useVault();
  const { anthology = [] } = useAnthology();
  const { push } = useNav();
  const { isLaptop, isTablet } = useLayout();

  const isTodayDone = !!(todayPlan && todayPlan.itemsDone >= 12);
  const effectiveStreak = isTodayDone ? Math.max(2, currentStreak) : 1;

  const [scrollTop, setScrollTop] = useState(0);
  const [xpBarFilled, setXpBarFilled] = useState(false);

  // Animated counters on tab activation
  const animatedWordsCount = useCountUp(allWords.length || 84, { enabled: isActive, duration: 700 });
  const animatedMasteredCount = useCountUp(masteredWords.length || 12, { enabled: isActive, duration: 700 });
  const animatedDrillsSolved = useCountUp(stats?.drillsDone || stats?.drills || 12, { enabled: isActive, duration: 700 });
  const animatedAccuracy = useCountUp(82, { enabled: isActive, duration: 750 });
  const animatedVaultSlips = useCountUp(openMistakes.length || 3, { enabled: isActive, duration: 700 });
  const animatedFixedSlips = useCountUp(fixedMistakes.length || 5, { enabled: isActive, duration: 700 });
  const animatedStreak = useCountUp(effectiveStreak, { enabled: isActive, duration: 600, startValue: 0 });

  // XP bar animation trigger
  React.useEffect(() => {
    setXpBarFilled(false);
    const timer = setTimeout(() => {
      setXpBarFilled(true);
    }, 60);
    return () => clearTimeout(timer);
  }, [activationKey]);

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
      } else if (dayOfMonth === 11 || dayOfMonth === 12 || (stats?.activeDates && stats.activeDates.includes(dayOfMonth))) {
        state = 'on';
      } else if (dayOfMonth === todayDate) {
        state = isTodayDone ? 'on' : 'today';
      }
      cells.push({ index: i, state });
    }
    return cells;
  }, [stats?.activeDates, isTodayDone]);

  // Sub-components for flexible multi-column rendering
  const StreakCard = (
    <section key={`streak-${activationKey}`} className="pcard streakc card-cascade" aria-label="Streak" style={{ margin: 0, '--i': 0 }}>
      <div className="r1">
        <div>
          <span className="lab">Streak</span>
          <span className="big num">
            {animatedStreak} {animatedStreak === 1 ? 'day' : 'days'}
          </span>
          <small>Best: {highestStreak} days · 1 streak freeze ready</small>
        </div>
        <span style={{ color: 'var(--warn)', marginTop: '4px' }}>
          <svg
            className="flame"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{
              filter: 'drop-shadow(0 2px 8px rgba(255, 110, 0, 0.45))'
            }}
          >
            <defs>
              <linearGradient id="streakFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FF4500" />
                <stop offset="55%" stopColor="#FF9500" />
                <stop offset="100%" stopColor="#FFD000" />
              </linearGradient>
            </defs>
            <path
              fill="url(#streakFlameGrad)"
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            />
          </svg>
        </span>
      </div>

      <div className="calh" aria-hidden="true">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
      <div key={`cal-${activationKey}`} className="cal go" role="img" aria-label="Activity calendar">
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
    <div key={`tiles-${activationKey}`} className="tiles" style={{ margin: 0 }}>
      <button
        className="tile press card-cascade"
        style={{ '--i': 0 }}
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(2);
        }}
      >
        <span>Words</span>
        <b className="num">{animatedWordsCount}</b>
        <small>{animatedMasteredCount} mastered</small>
      </button>

      <button
        className="tile press card-cascade"
        style={{ '--i': 1 }}
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(1);
        }}
      >
        <span>Drills solved</span>
        <b className="num">{animatedDrillsSolved}</b>
        <small>across 4 skills</small>
      </button>

      <button
        className="tile press card-cascade"
        style={{ '--i': 2 }}
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(1);
        }}
      >
        <span>Accuracy</span>
        <b className="num">{animatedAccuracy}%</b>
        <small>last 30 days</small>
      </button>

      <button
        className="tile press card-cascade"
        style={{ '--i': 3 }}
        onClick={handleOpenVault}
      >
        <span>Vault slips</span>
        <b className="num">{animatedVaultSlips}</b>
        <small>{animatedFixedSlips} fixed</small>
      </button>
    </div>
  );

  const RankCard = (
    <section key={`rank-${activationKey}`} className="pcard rank card-cascade" aria-label="Writing level" style={{ margin: 0, '--i': 1 }}>
      <div className="r1">
        <span>Writing rank 2 of 5</span>
        <b>{rank}</b>
      </div>
      <span className="bar">
        <i
          style={{
            width: xpBarFilled ? `${Math.min(100, Math.max(10, (xp / 300) * 100))}%` : '0%',
            transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      </span>
      <small>{rankText}</small>
      <ul className="skl">
        {SKILLS_INFO.map((s, i) => (
          <li key={s.name}>
            <button className="press" onClick={() => handlePracticeSkill(i)}>
              <div className="grow">
                <div className="r">
                  <b style={{ fontWeight: 500 }}>{s.name}</b>
                  <span>Level {s.level}</span>
                </div>
                <span className="bar">
                  <i style={{ width: xpBarFilled ? `${s.pct}%` : '0%', transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--mute)', flexShrink: 0, marginLeft: '6px' }}>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const SlipsCard = (
    <section key={`slips-${activationKey}`} className="pcard spec card-cascade" aria-label="Where your slips happen" style={{ margin: 0, '--i': 2 }}>
      <div className="hd">
        <h2>Where your slips happen</h2>
        <span>{totalSlips} total</span>
      </div>
      <div className="sbar" aria-hidden="true">
        <span style={{ width: '42%', background: '#7C88FF' }} title="Grammar 42%" />
        <span style={{ width: '28%', background: '#FF9F2E' }} title="Context 28%" />
        <span style={{ width: '18%', background: '#5BD69B' }} title="Flow 18%" />
        <span style={{ width: '12%', background: '#B9C0FF' }} title="Punctuation 12%" />
      </div>
      <div className="leg">
        <span><i style={{ background: '#7C88FF' }} />Grammar 42%</span>
        <span><i style={{ background: '#FF9F2E' }} />Context 28%</span>
        <span><i style={{ background: '#5BD69B' }} />Flow 18%</span>
        <span><i style={{ background: '#B9C0FF' }} />Punctuation 12%</span>
      </div>
      <div style={{ marginTop: '14px', borderTop: '0.5px solid var(--line)', paddingTop: '6px' }}>
        {SPEC_DATA.map((p) => (
          <button key={p.name} className="press" onClick={() => handlePracticeSkill(p.k)}>
            <div className="r">
              <span style={{ color: 'var(--fg)' }}>{p.name}</span>
              <span>{p.count} · {p.pct}%</span>
            </div>
            <span className={`bar ${p.org ? 'org' : ''}`} style={{ width: '100%' }}>
              <i style={{ width: xpBarFilled ? `${p.pct}%` : '0%', transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const FocusCard = (
    <section key={`focus-${activationKey}`} className="pcard focus card-cascade" aria-label="Focus area" style={{ margin: 0, '--i': 3 }}>
      <span className="lab">Focus area · Context &amp; register</span>
      <h2>Put each word where it feels at home</h2>
      <p>Most of your slips come from formal words in casual sentences, or stiff phrasing where plain words would do.</p>
      <div className="two">
        <div>
          <b>Say who did it</b>
          <span>“We decided”, not “a decision was made”.</span>
        </div>
        <div>
          <b>Match the room</b>
          <span>Formal words for formal writing.</span>
        </div>
      </div>
      <div className="ex">
        <span>From your practice with “veil”</span>
        <span className="o">✗ A veil of secrecy was put by the company on the deal.</span>
        <span className="b">✓ The company drew a veil of secrecy over the deal.</span>
      </div>
      <Button
        variant="pri"
        size="sm"
        onClick={() => handlePracticeSkill(2)}
        style={{
          alignSelf: 'flex-start',
          width: 'auto',
          padding: '0 20px',
          marginTop: '4px'
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
