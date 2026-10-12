import React, { useState, useMemo } from 'react';
import { useWords, useStats, useVault, useAnthology } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import { VaultPage } from '../practice/VaultPage';
import { AnthologyPage } from '../practice/AnthologyPage';
import { DrillPage } from '../practice/DrillPage';
import Button from '../../ui/Button';
import { triggerHaptic } from '../../motion/haptics';

const SPEC = [
  { name: 'Context', k: 2, count: 15, pct: 65, org: true },
  { name: 'Flow', k: 1, count: 6, pct: 26, org: false },
  { name: 'Grammar', k: 0, count: 2, pct: 9, org: false },
  { name: 'Punctuation', k: 3, count: 0, pct: 0, org: false }
];

const HABITS = [
  {
    title: 'Stiff, roundabout phrasing',
    tip: 'Say who did what: “we decided”, not “a decision was made by us”.',
    meta: 'Context · seen 15 times · last with “veil”',
    k: 2,
    tag: 'Coaching'
  },
  {
    title: 'Chaining with “and so”',
    tip: 'One thought per clause. Use a full stop or “because”.',
    meta: 'Flow · seen 3 times · last with “indifferent”',
    k: 1,
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
              skillId: m.skill || 0,
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
      } else if (dayOfMonth < todayDate && dayOfMonth > todayDate - currentStreak) {
        state = 'on';
      }
      cells.push({ index: i, state });
    }
    return cells;
  }, [currentStreak, stats?.activeDates]);

  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '124px',
        position: 'relative',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
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
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: topBarProgress > 0.1 ? 'auto' : 'none',
          background: `rgba(22, 22, 24, ${topBarProgress * 0.85})`,
          backdropFilter: topBarProgress > 0.05 ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: topBarProgress > 0.05 ? 'blur(16px)' : 'none',
          borderBottom: `${topBarProgress * 0.5}px solid var(--line)`,
          transition: 'border-bottom 0.2s ease'
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

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Large Title Header */}
        <header
          style={{
            padding: '16px 20px 8px'
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.1
            }}
          >
            Progress
          </h1>
        </header>

        {/* Streak & Monthly Calendar Card */}
        <section className="pcard streakc" aria-label="Streak">
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

        {/* Metric Tiles: Words & Drills */}
        <div className="tiles">
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
            <small>in Practice</small>
          </button>
        </div>

        {/* Writing Rank Card */}
        <section className="pcard rank" aria-label="Writing level">
          <div className="r1">
            <span>Writing rank {levelNum} of 5</span>
            <b>{rank}</b>
          </div>
          <span className="bar">
            <i style={{ width: `${Math.min(100, Math.round((xp / 300) * 100))}%` }} />
          </span>
          <small>{rankText}</small>

          <ul className="skl">
            {SKILLS_INFO.map((s, i) => (
              <li key={s.name}>
                <button
                  className="press"
                  onClick={() => handlePracticeSkill(i)}
                >
                  <div className="grow">
                    <div className="r">
                      <b style={{ fontWeight: 500 }}>{s.name}</b>
                      <span>Level {s.level}</span>
                    </div>
                    <span className="bar">
                      <i style={{ width: `${s.pct}%` }} />
                    </span>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Where Your Slips Happen Card */}
        <section className="pcard spec" aria-label="Where your slips happen">
          <div className="hd">
            <h2>Where your slips happen</h2>
            <span>{totalSlips} slips</span>
          </div>
          {SPEC.map((p) => (
            <button
              key={p.name}
              className="press"
              onClick={() => handlePracticeSkill(p.k)}
            >
              <div className="r">
                <span style={{ color: 'var(--fg)' }}>{p.name}</span>
                <span>{p.count} · {p.pct}%</span>
              </div>
              <span className={`bar ${p.org ? 'org' : ''}`} style={{ width: '100%' }}>
                <i style={{ width: `${p.pct}%` }} />
              </span>
            </button>
          ))}
        </section>

        {/* Focus Area Card: Context & Register */}
        <section className="pcard focus" aria-label="Focus area">
          <span className="lab">Focus area · Context &amp; register</span>
          <h2>Put each word where it feels at home</h2>
          <p>
            Most of your slips come from formal words in casual sentences, or stiff phrasing where plain words would do.
          </p>

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
            variant="primary"
            size="sm"
            onClick={() => handlePracticeSkill(2)}
            style={{ width: 'auto', alignSelf: 'flex-start', padding: '0 18px' }}
          >
            Practise Context
          </Button>
        </section>

        {/* Habits to Work On Card */}
        <section className="pcard habits" aria-label="Habits to work on">
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

        {/* Duo Launcher Cards: Mistake Vault & Anthology */}
        <div className="duo" style={{ marginTop: '12px' }}>
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
      </div>
    </div>
  );
}

export default ProgressScreen;
