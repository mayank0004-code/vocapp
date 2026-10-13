import React, { useState, useMemo } from 'react';
import { useData, useWords, useStats, useVault, useAnthology } from '../../data/DataProvider';
import { CANONICAL_HABITS } from '../../services/db';
import { pillarOfMistake } from '../practice/craft';
import { useNav } from '../../app/NavStack';
import { triggerHaptic } from '../../motion/haptics';
import Button from '../../ui/Button';
import { VaultPage } from '../practice/VaultPage';
import { AnthologyPage } from '../practice/AnthologyPage';
import { DrillPage } from '../practice/DrillPage';
import { useLayout } from '../../motion/useLayout';
import { useTabActivation } from '../../motion/useTabActivation';
import CountUp from '../../ui/CountUp';
import {
  COACHING_GUIDES,
  buildMonthCells,
  findRelevantMistake,
  pillarSkill,
  rankProgressPct,
  reviewAccuracy,
  sortedPillarSlips
} from './insights';

const PILLAR_UI = {
  grammar: { name: 'Grammar', color: '#7C88FF' },
  flow: { name: 'Flow', color: '#5BD69B' },
  context: { name: 'Context', color: '#FF9F2E' },
  punctuation: { name: 'Punctuation', color: '#B9C0FF' }
};
// Skill index order used by Practice (PracticeHub SKILLS): 0 grammar, 1 flow, 2 context, 3 punctuation
const SKILL_KEYS = ['grammar', 'flow', 'context', 'punctuation'];

const HABIT_TAGS = {
  mastering: { label: 'Mastering', bg: 'var(--okbg)', color: 'var(--ok)' },
  under_coaching: { label: 'Coaching', bg: 'var(--accbg)', color: 'var(--acc2)' },
  needs_attention: { label: 'Needs work', bg: 'var(--orgbg)', color: 'var(--org2)' }
};

export function ProgressScreen({ isActive = true, onSwitchTab = () => {} }) {
  const { activationKey } = useTabActivation(isActive);
  const { allWords = [], masteredWords = [] } = useWords();
  const { stats, craft, totalCraftXp = 0, totalCraftSolved = 0, craftLevelInfo } = useStats();
  const { allMistakes = [], openMistakes = [], fixedMistakes = [], mistakeCounts } = useVault();
  const { styleProfile } = useData();
  const { anthology = [] } = useAnthology();
  const { push } = useNav();
  const { isLaptop, isTablet } = useLayout();

  const currentStreak = stats?.currentStreak || 0;
  const highestStreak = stats?.highestStreak || 0;

  const [scrollTop, setScrollTop] = useState(0);
  const [xpBarFilled, setXpBarFilled] = useState(false);

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

  // Rank (Insights.jsx hero card): calcCraftLevel over total craft XP + combined tier completions
  const rankInfo = craftLevelInfo || { level: 1, rank: 'Apprentice', currentBase: 0, nextThreshold: 100 };
  const rankPct = rankProgressPct(totalCraftXp, rankInfo);

  // Per-pillar skill levels (Studio / PracticeHub formula)
  const skills = useMemo(
    () => SKILL_KEYS.map((key) => ({ key, name: PILLAR_UI[key].name, ...pillarSkill(craft?.[key]) })),
    [craft]
  );
  const skillsPractised = SKILL_KEYS.filter((key) => (craft?.[key]?.solved || 0) > 0).length;

  const accuracy = useMemo(() => reviewAccuracy(stats), [stats]);

  // Vault counts: same open / fixed split the Vault page shows
  const unredeemedCount = openMistakes.length;
  const redeemedCount = fixedMistakes.length;

  // Writing spectrum (Insights.jsx sortedTags / totalMistakes / topTag)
  const sortedTags = useMemo(() => sortedPillarSlips(mistakeCounts), [mistakeCounts]);
  const totalSlips = sortedTags.reduce((sum, [, c]) => sum + c, 0);
  const maxSlips = sortedTags[0]?.[1] || 1;
  const topTag = sortedTags[0]?.[1] > 0 ? sortedTags[0][0] : null;
  const guide = topTag ? COACHING_GUIDES[topTag] : null;
  const relevantMistake = useMemo(() => findRelevantMistake(allMistakes, topTag), [allMistakes, topTag]);
  const slipPct = (c) => (totalSlips > 0 ? Math.round((c / totalSlips) * 100) : 0);

  // Habits (Insights.jsx HabitsUnderCoachingSection)
  const habits = useMemo(
    () =>
      Object.values(styleProfile?.habits || {})
        .filter((h) => h && (h.count > 0 || h.status === 'mastering'))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .map((h) => {
          const def = CANONICAL_HABITS[h.key || 'other'] || CANONICAL_HABITS.other;
          const pillar = SKILL_KEYS.includes(h.pillar) ? h.pillar : def.pillar || 'flow';
          const count = h.count || 0;
          return {
            key: h.key || def.key,
            pillar,
            title: h.title || def.title,
            tip: def.ruleOfThumb,
            meta: `${PILLAR_UI[pillar].name} · seen ${count} ${count === 1 ? 'time' : 'times'}${h.lastWord ? ` · last with “${h.lastWord}”` : ''}`,
            tag: HABIT_TAGS[h.status] || HABIT_TAGS.needs_attention
          };
        }),
    [styleProfile]
  );

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
              pillar: pillarOfMistake(m),
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

  // Open a drill for the given pillar (falls back to the Practice tab when none).
  const handlePracticeSkill = (pillar) => {
    triggerHaptic('light');
    if (!SKILL_KEYS.includes(pillar)) {
      onSwitchTab(1);
      return;
    }
    push({
      id: `drill-${SKILL_KEYS.indexOf(pillar)}-1`,
      title: PILLAR_UI[pillar].name,
      component: DrillPage,
      props: { skillId: SKILL_KEYS.indexOf(pillar), pillar, initialTier: 1 },
      hideTab: true
    });
  };

  // Current month, Monday first, from stats.activeDates ('YYYY-MM-DD')
  const calendarCells = useMemo(() => buildMonthCells(stats?.activeDates), [stats?.activeDates]);

  // Sub-components for flexible multi-column rendering
  const StreakCard = (
    <section key={`streak-${activationKey}`} className="pcard streakc card-cascade" aria-label="Streak" style={{ margin: 0, '--i': 0 }}>
      <div className="r1">
        <div>
          <span className="lab">Streak</span>
          <span className="big num">
            <CountUp value={currentStreak} enabled={isActive} duration={600} /> {currentStreak === 1 ? 'day' : 'days'}
          </span>
          <small>Best: {highestStreak} {highestStreak === 1 ? 'day' : 'days'}</small>
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
            title={c.date || undefined}
            style={{ '--i': c.index }}
          />
        ))}
      </div>
    </section>
  );

  const MetricTiles = (
    <div
      key={`tiles-${activationKey}`}
      className="tiles"
      style={isLaptop ? { margin: 0, gridColumn: '1 / -1', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px' } : { margin: 0 }}
    >
      <button
        className="tile press card-cascade"
        style={{ '--i': 0 }}
        onClick={() => {
          triggerHaptic('light');
          onSwitchTab(2);
        }}
      >
        <span>Words</span>
        <b className="num">
          <CountUp value={allWords.length} enabled={isActive} duration={700} />
        </b>
        <small>
          <CountUp value={masteredWords.length} enabled={isActive} duration={700} /> mastered
        </small>
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
        <b className="num">
          <CountUp value={totalCraftSolved} enabled={isActive} duration={700} />
        </b>
        <small>{skillsPractised > 0 ? `across ${skillsPractised} ${skillsPractised === 1 ? 'skill' : 'skills'}` : 'none yet'}</small>
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
        <b className="num">
          {accuracy ? <CountUp value={accuracy.pct} suffix="%" enabled={isActive} duration={750} /> : '–'}
        </b>
        <small>{accuracy ? accuracy.label : 'no reviews yet'}</small>
      </button>

      <button
        className="tile press card-cascade"
        style={{ '--i': 3 }}
        onClick={handleOpenVault}
      >
        <span>Vault slips</span>
        <b className="num">
          <CountUp value={unredeemedCount} enabled={isActive} duration={700} />
        </b>
        <small>
          <CountUp value={redeemedCount} enabled={isActive} duration={700} /> fixed
        </small>
      </button>
    </div>
  );

  const RankCard = (
    <section key={`rank-${activationKey}`} className="pcard rank card-cascade" aria-label="Writing level" style={{ margin: 0, '--i': 1 }}>
      <div className="r1">
        <span>Writing rank {rankInfo.level} of 5</span>
        <b>{rankInfo.rank}</b>
      </div>
      <span className="bar">
        <i
          style={{
            width: xpBarFilled ? `${rankPct}%` : '0%',
            transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      </span>
      <small>{totalCraftXp} craft XP{rankInfo.nextRequirement ? ` · ${rankInfo.nextRequirement}` : ''}</small>
      <ul className="skl">
        {skills.map((s) => (
          <li key={s.key}>
            <button className="press" onClick={() => handlePracticeSkill(s.key)}>
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
      {totalSlips === 0 ? (
        <p style={{ margin: '12px 0 0', fontSize: '14px', color: 'var(--fg3)', lineHeight: 1.5 }}>
          No unassisted slips logged yet. As you finish drills in Practice, your grammar, flow, context and punctuation profile builds up here.
        </p>
      ) : (
        <>
          <div className="sbar" aria-hidden="true">
            {sortedTags.filter(([, c]) => c > 0).map(([key, c]) => (
              <span key={key} style={{ width: `${(c / totalSlips) * 100}%`, background: PILLAR_UI[key].color }} title={`${PILLAR_UI[key].name} ${slipPct(c)}%`} />
            ))}
          </div>
          <div className="leg">
            {sortedTags.map(([key, c]) => (
              <span key={key}><i style={{ background: PILLAR_UI[key].color }} />{PILLAR_UI[key].name} {slipPct(c)}%</span>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: '14px', borderTop: '0.5px solid var(--line)', paddingTop: '6px' }}>
        {sortedTags.map(([key, c]) => (
          <button key={key} className="press" onClick={() => handlePracticeSkill(key)}>
            <div className="r">
              <span style={{ color: 'var(--fg)' }}>{PILLAR_UI[key].name}</span>
              <span>{c} · {slipPct(c)}%</span>
            </div>
            <span className={`bar ${key === topTag ? 'org' : ''}`} style={{ width: '100%' }}>
              <i style={{ width: xpBarFilled && totalSlips > 0 ? `${(c / maxSlips) * 100}%` : '0%', transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const FocusCard = (
    <section key={`focus-${activationKey}`} className="pcard focus card-cascade" aria-label="Focus area" style={{ margin: 0, '--i': 3 }}>
      {guide ? (
        <>
          <span className="lab">Focus area · {guide.category}</span>
          <h2>{guide.headline}</h2>
          <p>{guide.explanation}</p>
          <div className="two">
            {guide.checks.map((c) => (
              <div key={c.title}>
                <b>{c.title}</b>
                <span>{c.desc}</span>
              </div>
            ))}
          </div>
          {relevantMistake?.originalSentence && (
            <div className="ex">
              <span>{relevantMistake.word ? `From your practice with “${relevantMistake.word}”` : 'From your practice'}</span>
              <span className="o">✗ {relevantMistake.originalSentence}</span>
              {relevantMistake.reframedSentence && <span className="b">✓ {relevantMistake.reframedSentence}</span>}
            </div>
          )}
        </>
      ) : (
        <>
          <span className="lab">Focus area</span>
          <h2>No focus area yet</h2>
          <p>Once you log a few slips in Practice drills, the skill that trips you up most will show here with rules of thumb to try.</p>
        </>
      )}
      <Button
        variant="pri"
        size="sm"
        onClick={() => handlePracticeSkill(topTag)}
        style={{
          alignSelf: 'flex-start',
          width: 'auto',
          padding: '0 20px',
          marginTop: '4px'
        }}
      >
        {topTag ? `Practise ${PILLAR_UI[topTag].name}` : 'Start practising'}
      </Button>
    </section>
  );

  const HabitsCard = (
    <section className="pcard habits" aria-label="Habits to work on" style={{ margin: 0 }}>
      <div className="hd">
        <h2>Habits to work on</h2>
        <span>{habits.length} tracked</span>
      </div>
      <ul>
        {habits.length === 0 ? (
          <li>
            <p style={{ margin: 0, padding: '12px 0', fontSize: '14px', color: 'var(--fg3)', lineHeight: 1.5 }}>
              No recurring habits flagged yet. As you practise drills, your writing coach will track patterns like run-on sentences, comma splices or tense drift here.
            </p>
          </li>
        ) : (
          habits.map((h) => (
            <li key={h.key}>
              <button className="press" onClick={() => handlePracticeSkill(h.pillar)}>
                <div className="grow">
                  <b>{h.title}</b>
                  {h.tip && <span className="tp">{h.tip}</span>}
                  <span className="mt">{h.meta}</span>
                </div>
                <span className="htag" style={{ background: h.tag.bg, color: h.tag.color }}>
                  {h.tag.label}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );

  const DuoCard = (
    <div className="duo" style={isLaptop ? { margin: 0, gridTemplateColumns: '1fr', gridAutoRows: '1fr', gap: '20px' } : { margin: 0 }}>
      <button
        onClick={handleOpenVault}
        className="press"
        style={{ border: '1px solid var(--line)', justifyContent: isLaptop ? 'center' : undefined }}
      >
        <b>Mistake Vault</b>
        <span>{unredeemedCount} to fix · {redeemedCount} fixed</span>
      </button>

      <button
        onClick={handleOpenAnthology}
        className="press"
        style={{ border: '1px solid var(--line)', justifyContent: isLaptop ? 'center' : undefined }}
      >
        <b>Anthology</b>
        <span>{anthology.length} saved {anthology.length === 1 ? 'sentence' : 'sentences'}</span>
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

        {/* Laptop: metric strip on top, then row-aligned card pairs so both columns end evenly.
            Tablet: 2 columns. Phone: 1 column. */}
        {isLaptop ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '20px',
              alignItems: 'stretch',
              paddingBottom: '32px'
            }}
          >
            {MetricTiles}
            {StreakCard}
            {RankCard}
            {SlipsCard}
            {FocusCard}
            {HabitsCard}
            {DuoCard}
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
