import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useData, useStats, useVault, useAnthology } from '../../data/DataProvider';
import { useNav } from '../../app/NavStack';
import Button from '../../ui/Button';
import { showToast } from '../../ui/Toast';
import { triggerHaptic } from '../../motion/haptics';
import { springs } from '../../motion/springs';
import { DrillPage } from './DrillPage';
import { VaultPage } from './VaultPage';
import { AnthologyPage } from './AnthologyPage';
import { useLayout } from '../../motion/useLayout';
import { useTabActivation } from '../../motion/useTabActivation';

const SKILLS = [
  { name: 'Grammar', level: 2, pct: 55, desc: 'Keep actions and timing in sync.' },
  { name: 'Flow', level: 1, pct: 40, desc: 'Let thoughts glide clause to clause.' },
  { name: 'Context', level: 1, pct: 30, desc: 'Put words where they feel at home.' },
  { name: 'Punctuation', level: 1, pct: 15, desc: 'Commas as breath marks.' }
];

const TIER_NAMES = ['Spot & fix', 'Polish', 'Vault rehab', 'Craft'];
const TIER_SUBS = [
  'Ear training · pick the natural version',
  'Tap the clunky word, swap in a better one',
  'Rewrite one of your own past slips',
  'Write an original sentence with one of your words'
];

export function PracticeHub({ isActive = true, onSwitchTab = () => {} }) {
  const { activationKey } = useTabActivation(isActive);
  const { push } = useNav();
  const { stats, craftLevelInfo } = useStats();
  const { openMistakes = [] } = useVault();
  const { anthology = [] } = useAnthology();
  const { isLaptop } = useLayout();

  const [selectedSkill, setSelectedSkill] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [wigglingTier, setWigglingTier] = useState(null);
  const [barsFilled, setBarsFilled] = useState(false);

  // Trigger skill progress bar fill and stagger on tab activation
  React.useEffect(() => {
    setBarsFilled(false);
    const timer = setTimeout(() => {
      setBarsFilled(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [activationKey, selectedSkill]);

  // Frosted topbar interpolation: clamp((scrollTop - 20) / 34, 0, 1)
  const topBarProgress = Math.min(1, Math.max(0, (scrollTop - 20) / 34));

  const xp = stats?.xp || stats?.totalPracticed || 180;
  const rank = craftLevelInfo?.rank || 'Craftsman';

  // Completed tier counts for selected skill
  const skillKey = SKILLS[selectedSkill]?.name.toLowerCase();
  const pillarStats = stats?.[skillKey] || {};
  const completedTiers = useMemo(() => {
    const raw = pillarStats.tierCompletions || {};
    return [raw[1] || 0, raw[2] || 0, raw[3] || 0, raw[4] || 0];
  }, [pillarStats]);

  // Unlocked status for tiers
  const unlocked = useMemo(() => {
    const d = completedTiers;
    const total = d[0] + d[1] + d[2];
    return [
      true, // Tier 1 always unlocked
      d[0] >= 3 || total >= 3,
      d[1] >= 3 || openMistakes.length > 0 || total >= 6,
      d[2] >= 2 || total >= 8
    ];
  }, [completedTiers, openMistakes.length]);

  const getLockReason = (tierIdx) => {
    const d = completedTiers;
    return [
      '',
      `Finish ${Math.max(0, 3 - d[0])} more Spot & fix drills to unlock Polish.`,
      `Finish ${Math.max(0, 3 - d[1])} more Polish drills to unlock Vault rehab.`,
      `Finish ${Math.max(0, 2 - d[2])} more Vault rehab drills to unlock Craft.`
    ][tierIdx];
  };

  const handleSelectSkill = (idx) => {
    if (idx !== selectedSkill) {
      setSelectedSkill(idx);
      triggerHaptic('light');
    }
  };

  const handleStartDrill = (tierNum) => {
    triggerHaptic('medium');
    push({
      id: `drill-${selectedSkill}-${tierNum}`,
      title: SKILLS[selectedSkill].name,
      component: DrillPage,
      props: {
        skillId: selectedSkill,
        initialTier: tierNum,
        mistake: openMistakes[0] || null
      },
      hideTab: true
    });
  };

  const handleLockedClick = (tierIdx) => {
    setWigglingTier(tierIdx);
    setTimeout(() => setWigglingTier(null), 600);
    triggerHaptic('error');
    showToast(getLockReason(tierIdx));
  };

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
              skillId: m.skill || selectedSkill,
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
          Practice
        </span>
      </div>

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--gutter, 16px)' }}>
        {/* Large Title Header */}
        <header
          style={{
            padding: '16px 4px 8px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--acc2)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}
            >
              Writing practice
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: isLaptop ? '40px' : '34px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.1
              }}
            >
              Practice
            </h1>
          </div>

          <button
            onClick={() => onSwitchTab(3)}
            className="press"
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'var(--accbg)',
              color: 'var(--acc2)',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(124, 136, 255, 0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {xp} XP · {rank}
          </button>
        </header>

        {/* Daily Tune-Up Banner */}
        <section
          className="tune shimmer-sweep"
          aria-label="Daily tune-up"
          style={{ marginTop: '12px' }}
        >
          <span className="lab">Daily tune-up · picked from your slips</span>
          <h2>Grammar: keep past and present in sync</h2>
          <p>Short drills · about 3 minutes · also part of today's session</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleStartDrill(1)}
            style={{
              alignSelf: 'flex-start',
              width: 'auto',
              padding: '0 20px',
              marginTop: '4px'
            }}
          >
            Tune up now
          </Button>
        </section>

        {/* Section Heading: Choose a Skill */}
        <h2
          style={{
            margin: '24px 20px 10px',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.01em'
          }}
        >
          Choose a skill
        </h2>

        {/* 4-Skill Grid with Glide Highlight */}
        <div key={`skills-${activationKey}`} className="skgrid" role="tablist" aria-label="Skill">
          {SKILLS.map((s, i) => {
            const isSelected = selectedSkill === i;
            return (
              <button
                key={s.name}
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectSkill(i)}
                className="skc press card-cascade"
                style={{
                  position: 'relative',
                  border: isSelected ? '1px solid var(--acc)' : '1px solid var(--card2)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(124,136,255,0.12)' : 'none',
                  transition: 'border 0.25s, box-shadow 0.25s',
                  '--i': i
                }}
              >
                {isSelected && (
                  <m.span
                    layoutId="skhl"
                    transition={springs.indicator}
                    className="skhl"
                    style={{ inset: -2 }}
                  />
                )}
                <div className="r1">
                  <b>{s.name}</b>
                  <span className="lv">Lvl {s.level}</span>
                </div>
                <span className="ds">{s.desc}</span>
                <span className="bar">
                  <i
                    style={{
                      width: barsFilled ? `${s.pct}%` : '0%',
                      transition: 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Heading: Tiers */}
        <h2
          style={{
            margin: '24px 20px 10px',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.01em'
          }}
        >
          {SKILLS[selectedSkill].name} drills
        </h2>

        {/* 4 Drill Tiers List */}
        <ul key={`tiers-${activationKey}-${selectedSkill}`} className="tiers">
          {TIER_NAMES.map((name, idx) => {
            const isUnlocked = unlocked[idx];
            const isWiggling = wigglingTier === idx;

            return (
              <li
                key={name}
                className={`${isUnlocked ? '' : 'lk'} ${isWiggling ? 'shake' : ''} card-cascade`}
                onClick={!isUnlocked ? () => handleLockedClick(idx) : undefined}
                style={{
                  cursor: isUnlocked ? 'default' : 'pointer',
                  userSelect: 'none',
                  '--i': idx
                }}
              >
                <span className="n">{idx + 1}</span>
                <div className="grow">
                  <b>{name}</b>
                  <span>
                    {isUnlocked ? TIER_SUBS[idx] : `Locked · ${getLockReason(idx)}`}
                  </span>
                </div>

                {isUnlocked ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartDrill(idx + 1);
                    }}
                    style={{
                      background: 'var(--card2)',
                      color: 'var(--fg)',
                      border: '1px solid var(--line)',
                      flex: 'none'
                    }}
                  >
                    Start
                  </Button>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.5, flex: 'none' }}
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>

        {/* Duo Launcher Cards: Mistake Vault & Anthology */}
        <div className="duo">
          <button
            onClick={handleOpenVault}
            className="press"
            style={{
              border: '1px solid var(--line)'
            }}
          >
            <b>Mistake Vault</b>
            <span>
              {openMistakes.length > 0
                ? `${openMistakes.length} slips to fix`
                : 'All slips fixed'}
            </span>
          </button>

          <button
            onClick={handleOpenAnthology}
            className="press"
            style={{
              border: '1px solid var(--line)'
            }}
          >
            <b>Anthology</b>
            <span>{anthology.length} saved sentences</span>
          </button>
        </div>

        {/* Footnote */}
        <p className="foot">
          Right answers earn XP, wrong ones cost a little. Difficulty follows your sentence level in Settings.
        </p>
      </div>
    </div>
  );
}

export default PracticeHub;
