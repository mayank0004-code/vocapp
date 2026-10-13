import React, { useState } from 'react';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Card from '../ui/Card';
import ProgressRing from '../ui/ProgressRing';
import StrengthBars from '../ui/StrengthBars';
import SwipeTabs from '../ui/SwipeTabs';
import Sheet from '../ui/Sheet';
import { ToastContainer, showToast } from '../ui/Toast';
import TabBar from '../app/TabBar';
import { Skeleton, Empty, LargeTitle } from '../ui/Feedback';

export default function Kit() {
  const [activeTab, setActiveTab] = useState(0);
  const [swipeTabIndex, setSwipeTabIndex] = useState(0);
  const [ringProgress, setRingProgress] = useState(5);
  const [strengthLevel, setStrengthLevel] = useState(2);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const testSpeech = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--sans)',
        paddingBottom: '140px',
        overflowX: 'hidden'
      }}
    >
      <ToastContainer />

      <LargeTitle
        kicker="Design System & Motion Showcase"
        title="Foundations Kit"
        rightElement={
          <Chip variant="streak">
            <span>1</span>
          </Chip>
        }
      />

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Typography & Brand */}
        <Card>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Typography &amp; Tokens
          </span>
          <h2 style={{ margin: '8px 0', fontSize: '24px', fontWeight: 700 }}>
            Geist Display &amp; Interface
          </h2>
          <p className="serif" style={{ fontSize: '20px', fontStyle: 'italic', color: 'var(--fg2)', margin: '4px 0 12px', lineHeight: 1.45 }}>
            “She stayed sanguine despite the delays, her curiosity undimmed.”
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--accbg)', color: 'var(--acc2)', fontSize: '13px', fontWeight: 600 }}>
              Primary Accent
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--okbg)', color: 'var(--ok)', fontSize: '13px', fontWeight: 600 }}>
              Correct · +20 XP
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--orgbg)', color: 'var(--org2)', fontSize: '13px', fontWeight: 600 }}>
              Needs Attention
            </span>
          </div>
        </Card>

        {/* Section 2: Buttons & Interactive Tap */}
        <Card>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Buttons &amp; Tap Physics
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <Button variant="pri" onClick={() => showToast('Primary action tapped')}>
              Start session · 12 items
            </Button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Button variant="grey" size="sm" onClick={() => showToast('Reviews only selected')}>
                Only reviews (5)
              </Button>
              <Button variant="ghost" size="sm" onClick={() => showToast('Drills only selected')}>
                Only drills
              </Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <Button variant="light" size="xs" onClick={() => showToast('Next drill')}>
                Next drill
              </Button>
              <Button variant="okb" size="xs" onClick={() => showToast('Item marked learned')}>
                ✓ Learned
              </Button>
              <Button variant="danger" size="xs" onClick={() => showToast('Removed word', 'Undo', () => showToast('Action undone'))}>
                Remove
              </Button>
            </div>
          </div>
        </Card>

        {/* Section 3: Progress Ring & Strength Bars */}
        <Card>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Progress &amp; Memory Strength
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <ProgressRing current={ringProgress} total={12} size={68} />
              <div>
                <b style={{ fontSize: '17px', display: 'block' }}>Daily Session</b>
                <span style={{ fontSize: '13.5px', color: 'var(--fg3)' }}>{ringProgress} of 12 items complete</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setRingProgress(p => Math.max(0, p - 1))}
                style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'var(--card2)', color: 'var(--fg)', fontSize: '16px' }}
              >
                -
              </button>
              <button
                onClick={() => setRingProgress(p => Math.min(12, p + 1))}
                style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'var(--card2)', color: 'var(--fg)', fontSize: '16px' }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ borderTop: '0.5px solid var(--line)', marginTop: '16px', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <b style={{ fontSize: '15px', display: 'block' }}>Memory Interval</b>
              <span style={{ fontSize: '13px', color: 'var(--mute)' }}>Level {strengthLevel} of 4</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <StrengthBars strength={strengthLevel} big={true} />
              <button
                onClick={() => setStrengthLevel(l => (l + 1) % 5)}
                style={{ fontSize: '13px', color: 'var(--acc2)', fontWeight: 600 }}
              >
                Cycle
              </button>
            </div>
          </div>
        </Card>

        {/* Section 4: Instagram-style Swipe Tabs */}
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 4px 8px', display: 'block' }}>
            Swipeable Segmented Tabs
          </span>
          <SwipeTabs
            tabs={[
              { id: 'all', label: 'All', count: 84 },
              { id: 'due', label: 'Due', count: 5 },
              { id: 'saved', label: 'Saved', count: 2 },
              { id: 'mastered', label: 'Mastered' }
            ]}
            activeIndex={swipeTabIndex}
            onChange={setSwipeTabIndex}
          >
            <div style={{ padding: '16px 4px' }}>
              <p style={{ margin: 0, color: 'var(--fg2)', fontSize: '15px' }}>
                All 84 words in dictionary. Due-first sorting then alphabetical.
              </p>
            </div>
            <div style={{ padding: '16px 4px' }}>
              <p style={{ margin: 0, color: 'var(--warn)', fontSize: '15px' }}>
                5 words due for review right now.
              </p>
            </div>
            <div style={{ padding: '16px 4px' }}>
              <p style={{ margin: 0, color: 'var(--org2)', fontSize: '15px' }}>
                2 saved words kept for up to 7 days.
              </p>
            </div>
            <div style={{ padding: '16px 4px' }}>
              <p style={{ margin: 0, color: 'var(--ok)', fontSize: '15px' }}>
                12 words fully mastered with 30-day+ intervals.
              </p>
            </div>
          </SwipeTabs>
        </div>

        {/* Section 5: Draggable Bottom Sheet & TTS */}
        <Card>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interactive Bottom Sheet &amp; Audio
          </span>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <Button variant="pri" onClick={() => setIsSheetOpen(true)}>
              Open Word Breakdown Sheet
            </Button>
            <Button variant="grey" onClick={() => testSpeech('albeit')}>
              🔊 Pronounce
            </Button>
          </div>
        </Card>

        {/* Section 6: Skeletons & Empty States */}
        <Card>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Skeletons &amp; Feedback States
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <Skeleton width="45%" height="16px" />
            <Skeleton width="85%" height="24px" />
            <Skeleton width="100%" height="48px" borderRadius="14px" />
          </div>
        </Card>
      </div>

      {/* Interactive Bottom Sheet Demonstration */}
      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        <div style={{ padding: '8px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Word Breakdown
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <h2 className="serif" style={{ fontSize: '42px', fontWeight: 400, margin: 0 }}>
              albeit
            </h2>
            <button
              onClick={() => testSpeech('albeit')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                background: 'var(--card2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '18px'
              }}
            >
              🔊
            </button>
          </div>
          <span style={{ color: 'var(--fg3)', fontSize: '14.5px', display: 'block', marginTop: '4px' }}>
            conjunction · /ɔːlˈbiː.ɪt/ · formal
          </span>
          <p style={{ fontSize: '18px', lineHeight: 1.45, margin: '14px 0 10px', color: 'var(--fg)' }}>
            Although; even though.
          </p>
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '14px', margin: '12px 0' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase' }}>
              Example sentence
            </span>
            <p className="serif" style={{ fontSize: '17px', fontStyle: 'italic', margin: '4px 0 0', color: 'var(--fg)' }}>
              “The reform was effective, albeit slow to show results.”
            </p>
          </div>
          <Button variant="pri" onClick={() => { setIsSheetOpen(false); showToast('Practice session launched for albeit'); }}>
            Practise now · 3 sentences
          </Button>
        </div>
      </Sheet>

      {/* Scrubbable TabBar Prototype Test */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
