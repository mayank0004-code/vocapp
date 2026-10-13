import React, { useState } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useVault } from '../../data/DataProvider';
import SwipeTabs from '../../ui/SwipeTabs';
import Button from '../../ui/Button';
import { PILLARS, pillarOfMistake } from './craft';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today" / "yesterday" / "3d ago" / "12 Mar" from an epoch-ms (or Firestore Timestamp) value. */
function formatWhen(value) {
  const ms = typeof value === 'number' ? value : value?.toMillis?.() ?? (value ? new Date(value).getTime() : NaN);
  if (!Number.isFinite(ms)) return '';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (ms >= startOfToday.getTime()) return 'today';
  const days = Math.ceil((startOfToday.getTime() - ms) / DAY_MS);
  if (days <= 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const EMPTY_COPY = [
  'No slips yet. Mistakes from your Practice drills land here.',
  'Nothing to fix. Every slip is fixed.',
  'No fixed slips yet. Fix one to see it here.'
];

export function VaultPage({ onBack, onFixMistake = () => {} }) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { allMistakes = [], openMistakes = [], fixedMistakes = [] } = useVault();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 'all', label: 'All', count: allMistakes.length },
    { id: 'to-fix', label: 'To fix', count: openMistakes.length },
    { id: 'fixed', label: 'Fixed', count: fixedMistakes.length }
  ];

  const currentList = activeTab === 0
    ? allMistakes
    : activeTab === 1
    ? openMistakes
    : fixedMistakes;

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '80px'
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(11, 11, 13, 0.85)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          borderBottom: '0.5px solid var(--line)',
          height: 'var(--topH, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--acc2)',
            fontSize: '15px',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Practice
        </button>

        <span style={{ fontSize: '16px', fontWeight: 600 }}>Mistake Vault</span>
        <div style={{ width: '60px' }} />
      </header>

      {/* Main Content */}
      <div style={{ padding: '20px 20px 0' }}>
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em'
          }}
        >
          Mistake Vault
        </h1>
        <p style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--fg3)', lineHeight: 1.45 }}>
          Every slip from your Practice drills, with a better version. Fix them to rank up.
        </p>

        {/* Tab Selector */}
        <div style={{ marginBottom: '18px' }}>
          <SwipeTabs
            tabs={tabs}
            activeIndex={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Slips List */}
        {currentList.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--mute)',
              fontSize: '15px',
              lineHeight: 1.5,
              background: 'var(--card)',
              borderRadius: '20px',
              border: '1px solid var(--line)'
            }}
          >
            {EMPTY_COPY[activeTab]}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentList.map((slip, idx) => {
              const isFixed = slip.fixed || slip.isRedeemed;
              const originalSentence = slip.originalSentence || slip.orig || slip.sentence || '';
              const betterSentence = slip.reframedSentence || slip.better || slip.correctedSentence || '';
              const pillarKey = pillarOfMistake(slip);
              const tag = pillarKey ? PILLARS[pillarKey].label : (slip.errorTags?.[0] || '');
              const diagnosis = slip.structuralDiagnosis || '';
              const tip = slip.ruleOfThumb && slip.ruleOfThumb !== diagnosis ? slip.ruleOfThumb : '';
              const loggedWhen = formatWhen(slip.timestamp);
              const fixedWhen = formatWhen(slip.redeemedAt);

              return (
                <div
                  key={slip.id || idx}
                  style={{
                    background: 'var(--card)',
                    borderRadius: '20px',
                    border: '1px solid var(--line)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top Word & Tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="serif"
                        style={{ fontSize: '22px', fontStyle: 'italic', fontWeight: 500, color: 'var(--fg)' }}
                      >
                        {slip.word || 'Writing slip'}
                      </span>
                      {tag && (
                        <span style={{ fontSize: '12.5px', color: 'var(--mute)', fontWeight: 500 }}>
                          · {tag}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--card2)',
                        color: isFixed ? 'var(--ok)' : 'var(--org2)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {isFixed ? 'Fixed' : 'To fix'}
                    </span>
                  </div>

                  {/* Original slip with red X */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '15px', lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--bad)', fontWeight: 700 }}>✗</span>
                    <span style={{ color: 'var(--fg2)' }}>{originalSentence}</span>
                  </div>

                  {/* Better version with green checkmark */}
                  {betterSentence && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '15px', lineHeight: 1.45 }}>
                      <span style={{ color: 'var(--ok)', fontWeight: 700 }}>✓</span>
                      <span style={{ color: 'var(--fg)' }}>{betterSentence}</span>
                    </div>
                  )}

                  {/* What to fix & Tip */}
                  {diagnosis && (
                    <div style={{ fontSize: '13.5px', color: 'var(--fg3)', lineHeight: 1.45 }}>
                      {diagnosis}
                    </div>
                  )}
                  {tip && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--card2)',
                        fontSize: '13px',
                        color: 'var(--fg3)',
                        lineHeight: 1.4
                      }}
                    >
                      <strong style={{ color: 'var(--fg2)' }}>Tip: </strong>
                      {tip}
                    </div>
                  )}

                  {/* Action / Fixed Footer */}
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--mute)' }}>
                      {loggedWhen ? `Logged ${loggedWhen}` : ''}
                    </span>
                    {isFixed ? (
                      <span style={{ fontSize: '13px', color: 'var(--ok)', fontWeight: 500 }}>
                        ✓ Fixed{fixedWhen ? ` ${fixedWhen}` : ''}
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => onFixMistake(slip)}
                        style={{ height: '34px', padding: '0 16px', fontSize: '13.5px' }}
                      >
                        Fix it
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VaultPage;
