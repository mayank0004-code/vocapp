import React from 'react';
import ProgressRing from '../../ui/ProgressRing';
import Button from '../../ui/Button';

export function SessionCard({
  dueWordsCount = 0,
  targetWord = '',
  drillsRemaining = 2,
  tuneUpLabel = 'Flow',
  itemsDone = 0,
  streak = 0,
  highestStreak = 0,
  activeDates = [],
  activationKey = 0,
  onStartSession = () => {},
  onOnlyReviews = () => {},
  onOnlyDrills = () => {}
}) {
  const isSessionDone = itemsDone >= 12;

  // Week days calculation
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayDayIdx = new Date().getDay();
  // Real activity for each day of the current week (activeDates are 'YYYY-MM-DD')
  const activeSet = new Set(activeDates || []);
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const weekKeys = dayNames.map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + (idx - todayDayIdx));
    return dateKey(d);
  });
  const todayActive = activeSet.has(weekKeys[todayDayIdx]);
  const bestStreak = Math.max(highestStreak || 0, streak || 0);

  return (
    <section
      key={activationKey}
      style={{
        margin: '12px 16px 0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'var(--card)',
        border: '1px solid var(--line)'
      }}
      className="card sess card-cascade"
      aria-label="Today's session"
    >
      {/* Background Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40%',
          right: '-20%',
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, rgba(124,136,255,0.16), transparent 65%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Header with Progress Ring */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1, '--i': 0 }}
        className="card-cascade"
      >
        <ProgressRing current={itemsDone} total={12} size={64} animate={true} activationKey={activationKey} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {isSessionDone ? 'Session complete' : "Today's session"}
          </h2>
          <span style={{ fontSize: '14.5px', color: 'var(--fg3)' }}>
            {isSessionDone
              ? '12 of 12 items done · nice work'
              : itemsDone > 0
              ? `${itemsDone} of 12 items done`
              : '12 items · about 8 minutes'}
          </span>
        </div>
      </div>

      {/* Plan Breakdown Items */}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '15px',
          color: 'var(--fg2)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <li
          className="card-cascade"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: dueWordsCount === 0 || isSessionDone ? 'line-through' : 'none',
            color: dueWordsCount === 0 || isSessionDone ? 'var(--mute)' : 'var(--fg2)',
            '--i': 1
          }}
        >
          <i style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#7C88FF', flexShrink: 0 }} />
          <span>
            {dueWordsCount > 0 ? `${dueWordsCount} words due for review` : 'Reviews done for today'}
          </span>
        </li>

        <li
          className="card-cascade"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: isSessionDone ? 'line-through' : 'none',
            color: isSessionDone ? 'var(--mute)' : 'var(--fg2)',
            '--i': 2
          }}
        >
          <i style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#B9C0FF', flexShrink: 0 }} />
          <span>
            {targetWord
              ? <>Write 3 sentences with <em className="serif" style={{ fontSize: '17px' }}>{targetWord}</em></>
              : 'Save a word to practise writing with it'}
          </span>
        </li>

        <li
          className="card-cascade"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: drillsRemaining <= 0 || isSessionDone ? 'line-through' : 'none',
            color: drillsRemaining <= 0 || isSessionDone ? 'var(--mute)' : 'var(--fg2)',
            '--i': 3
          }}
        >
          <i style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#FFB054', flexShrink: 0 }} />
          <span>
            {drillsRemaining > 0 ? `Daily tune-up: ${drillsRemaining} ${tuneUpLabel} drill${drillsRemaining === 1 ? '' : 's'}` : 'Daily tune-up complete'}
          </span>
        </li>
      </ul>

      {/* Main Action Button with Shimmer Highlight */}
      <div
        className="card-cascade shimmer-sweep"
        style={{ position: 'relative', zIndex: 1, borderRadius: '14px', '--i': 4 }}
      >
        <Button variant="pri" onClick={onStartSession}>
          {isSessionDone ? 'Run it again' : 'Start session'}
        </Button>
      </div>

      {/* Mini Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', position: 'relative', zIndex: 1 }}>
        <Button variant="grey" size="sm" onClick={onOnlyReviews}>
          Only reviews ({dueWordsCount})
        </Button>
        <Button variant="grey" size="sm" onClick={onOnlyDrills}>
          Only drills
        </Button>
      </div>

      {/* Week Day Strip */}
      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', color: 'var(--mute)' }}>
          {dayNames.map((name, idx) => {
            const isToday = idx === todayDayIdx;
            const isCompleted = activeSet.has(weekKeys[idx]);

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '14px',
                    background: isCompleted ? 'var(--org)' : '#222225',
                    border: isToday && !isCompleted ? '2px dashed var(--org)' : 'none',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#1A1206'
                  }}
                >
                  {isCompleted && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span style={{ fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--fg)' : 'var(--mute)' }}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--fg3)', textAlign: 'center' }}>
          {isSessionDone
            ? `${streak}-day streak · best ${bestStreak}. See you tomorrow.`
            : todayActive
            ? `${streak}-day streak · best ${bestStreak}`
            : `Practise today to make it a ${(streak || 0) + 1}-day streak · best ${bestStreak}`}
        </p>
      </div>
    </section>
  );
}

export default SessionCard;
