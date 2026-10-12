import React, { useState } from 'react';
import { useEdgeBack } from '../../motion/useEdgeBack';
import { useData, useVault } from '../../data/DataProvider';
import { recordCraftProgress, deductCraftXP, saveToAnthology } from '../../services/db';
import Button from '../../ui/Button';
import { triggerHaptic } from '../../motion/haptics';
import { showToast } from '../../ui/Toast';

const SKILLS = [
  { name: 'Grammar', desc: 'Subject-verb balance, parallel structures, tenses' },
  { name: 'Flow', desc: 'Transitions, clause lengths, rhythmic variety' },
  { name: 'Context', desc: 'Register match, tone, audience adaptation' },
  { name: 'Punctuation', desc: 'Em-dashes, semicolons, restrictive clauses' }
];

const DRILL_DATA = {
  0: { // Grammar
    tier1: {
      prompt: 'Keep past and present tenses in natural agreement.',
      options: [
        { text: 'She entered the room and immediately notices the painting.', correct: false, reason: 'Tense shift: “entered” is past, but “notices” is present.' },
        { text: 'She entered the room and immediately noticed the painting.', correct: true, reason: 'Consistent past tense throughout the clause.' }
      ]
    },
    tier2: {
      prompt: 'Eliminate clunky passive construction for dynamic agency.',
      sentenceParts: ['The decision ', 'was made by the board', ' after hours of debate.'],
      betterWord: 'the board decided',
      explanation: 'Active voice gives immediate narrative momentum.'
    },
    tier4: {
      prompt: 'Write a sentence with two parallel adjective clauses.',
      word: 'abstruse',
      nudge: 'Ensure both clauses begin with the same pronoun (“who…” or “which…”).',
      example: 'He enjoyed books which were abstruse in theory, but which offered practical wisdom.'
    }
  },
  1: { // Flow
    tier1: {
      prompt: 'Pick the transition that establishes clear contrast without stalling.',
      options: [
        { text: 'The experiment failed. Moreover, the team learned valuable insights.', correct: false, reason: '“Moreover” adds information; it does not indicate contrast.' },
        { text: 'The experiment failed. Nonetheless, the team learned valuable insights.', correct: true, reason: '“Nonetheless” creates smooth, economical contrast.' }
      ]
    },
    tier2: {
      prompt: 'Replace a heavy connective with a sharper transitional adverb.',
      sentenceParts: ['The revenue declined, ', 'in spite of the fact that', ' sales rose.'],
      betterWord: 'although',
      explanation: '“Although” cuts 5 redundant syllables with zero loss of meaning.'
    },
    tier4: {
      prompt: 'Vary rhythm by alternating a short punchy clause with an expansive one.',
      word: 'equivocal',
      nudge: 'Let the first clause be under 6 words, then unpack with “equivocal”.',
      example: 'Silence fell. Her reply had been equivocal, leaving the room divided.'
    }
  },
  2: { // Context
    tier1: {
      prompt: 'Select the sentence that maintains appropriate formal register.',
      options: [
        { text: 'The minister was totally stressed out by the parliamentary inquiry.', correct: false, reason: '“Totally stressed out” is colloquial slang.' },
        { text: 'The minister appeared visibly strained by the parliamentary inquiry.', correct: true, reason: '“Visibly strained” maintains precise, dignified register.' }
      ]
    },
    tier2: {
      prompt: 'Elevate an overly casual intensifier.',
      sentenceParts: ['The evidence was ', 'super obvious', ' to all observers.'],
      betterWord: 'unmistakable',
      explanation: '“Unmistakable” conveys unquestionable clarity without informal fluff.'
    },
    tier4: {
      prompt: 'Frame a formal critique with diplomatic understatement.',
      word: 'sanguine',
      nudge: 'Use “less than sanguine” or “hardly sanguine” to express restraint.',
      example: 'The committee remained less than sanguine regarding the proposed timetable.'
    }
  },
  3: { // Punctuation
    tier1: {
      prompt: 'Choose the proper use of the semicolon between independent clauses.',
      options: [
        { text: 'The bell chimed once; and everyone departed.', correct: false, reason: 'Do not use a semicolon before coordinating conjunctions like “and”.' },
        { text: 'The bell chimed once; everyone departed without a word.', correct: true, reason: 'Correctly joins two related independent clauses.' }
      ]
    },
    tier2: {
      prompt: 'Insert an em-dash for dramatic parenthetical emphasis.',
      sentenceParts: ['The result, ', 'a total surprise,', ' delighted the audience.'],
      betterWord: '— a total surprise —',
      explanation: 'Em-dashes bring vibrant visual and rhythmic punch to the interruption.'
    },
    tier4: {
      prompt: 'Use a colon to introduce an explanatory conclusion.',
      word: 'relic',
      nudge: 'Place your colon right before introducing the relic.',
      example: 'The mansion held one remaining secret: a gilded relic of the old empire.'
    }
  }
};

export function DrillPage({
  skillId = 0,
  initialTier = 1,
  mistake = null,
  onBack = () => {}
}) {
  const containerRef = useEdgeBack({ onPop: onBack, enabled: true });
  const { currentUser } = useData();
  const { openMistakes = [] } = useVault();

  const [activeTier, setActiveTier] = useState(initialTier);
  const [tier1Pick, setTier1Pick] = useState(null);
  const [tier2Swapped, setTier2Swapped] = useState(false);
  const [tier3Draft, setTier3Draft] = useState('');
  const [tier3Fixed, setTier3Fixed] = useState(false);
  const [tier3Error, setTier3Error] = useState('');
  const [tier4Draft, setTier4Draft] = useState('');
  const [tier4Phase, setTier4Phase] = useState('open'); // 'open' | 'nudge' | 'done'
  const [tier4Saved, setTier4Saved] = useState(false);
  const [tier4Error, setTier4Error] = useState('');

  const skill = SKILLS[skillId] || SKILLS[0];
  const data = DRILL_DATA[skillId] || DRILL_DATA[0];

  // Active slip for Tier 3
  const activeSlip = mistake || openMistakes[0] || {
    id: 'sample-slip',
    word: 'relic',
    orig: 'The old factory remained standingbecauseit was a silent relic of a bygone industrial era.',
    better: 'The old factory remained standing because it was a silent relic of a bygone industrial era.',
    tip: 'Check compound word spacing and clause cadence.'
  };

  // Tier 1 Answer Handler
  const handleTier1Answer = async (idx) => {
    if (tier1Pick !== null) return;
    setTier1Pick(idx);
    const isCorrect = data.tier1.options[idx].correct;
    triggerHaptic(isCorrect ? 'success' : 'error');

    if (currentUser?.uid) {
      if (isCorrect) {
        await recordCraftProgress(currentUser.uid, { pillar: skill.name.toLowerCase(), tier: 1, xpGained: 20 });
      } else {
        await deductCraftXP(currentUser.uid, { pillar: skill.name.toLowerCase(), xpLost: 5 });
      }
    }
  };

  // Tier 2 Swap Handler
  const handleTier2Swap = async () => {
    if (tier2Swapped) return;
    setTier2Swapped(true);
    triggerHaptic('success');
    if (currentUser?.uid) {
      await recordCraftProgress(currentUser.uid, { pillar: skill.name.toLowerCase(), tier: 2, xpGained: 20 });
    }
  };

  // Tier 3 Redeem Mistake Handler
  const handleTier3Redeem = async () => {
    const text = (tier3Draft || activeSlip.orig).trim();
    if (text === activeSlip.orig.trim()) {
      setTier3Error('Change the sentence first. The slip is still there.');
      triggerHaptic('error');
      return;
    }
    if (text.split(/\s+/).length < 4) {
      setTier3Error('Write the full sentence.');
      triggerHaptic('error');
      return;
    }

    setTier3Fixed(true);
    setTier3Error('');
    triggerHaptic('success');

    if (currentUser?.uid) {
      await recordCraftProgress(currentUser.uid, {
        pillar: skill.name.toLowerCase(),
        tier: 3,
        xpGained: 30,
        redeemedMistakeId: activeSlip.id
      });
    }
  };

  // Tier 4 Craft Handler
  const handleTier4Submit = async () => {
    const text = tier4Draft.trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      setTier4Error('Write a full sentence of at least 4 words.');
      triggerHaptic('error');
      return;
    }

    if (tier4Phase === 'open') {
      setTier4Phase('nudge');
      setTier4Error('');
      triggerHaptic('medium');
    } else if (tier4Phase === 'nudge') {
      setTier4Phase('done');
      setTier4Error('');
      triggerHaptic('success');
      if (currentUser?.uid) {
        await recordCraftProgress(currentUser.uid, {
          pillar: skill.name.toLowerCase(),
          tier: 4,
          xpGained: 40,
          wordUsed: data.tier4.word
        });
      }
    }
  };

  const handleSaveAnthology = async () => {
    if (!currentUser?.uid || tier4Saved) return;
    try {
      await saveToAnthology(currentUser.uid, {
        sentence: tier4Draft.trim(),
        word: data.tier4.word,
        pillar: skill.name
      });
      setTier4Saved(true);
      triggerHaptic('success');
      showToast('Saved to your Anthology');
    } catch (e) {
      console.error(e);
    }
  };

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
      {/* Top Header */}
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

        <span style={{ fontSize: '16px', fontWeight: 600 }}>{skill.name} drills</span>
        <div style={{ width: '60px' }} />
      </header>

      {/* Main Container */}
      <div style={{ padding: '16px 20px 0' }}>
        {/* Tier Selector Segments */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            padding: '4px',
            borderRadius: '14px',
            background: 'var(--card2)',
            marginBottom: '20px'
          }}
        >
          {['T1: Spot', 'T2: Polish', 'T3: Rehab', 'T4: Craft'].map((label, idx) => {
            const tierNum = idx + 1;
            const isSelected = activeTier === tierNum;
            return (
              <button
                key={tierNum}
                type="button"
                onClick={() => {
                  setActiveTier(tierNum);
                  triggerHaptic('light');
                }}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: isSelected ? 'var(--card)' : 'transparent',
                  color: isSelected ? 'var(--fg)' : 'var(--mute)',
                  border: isSelected ? '1px solid var(--line)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ================= TIER 1: SPOT & FIX ================= */}
        {activeTier === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 1 · Ear training
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>
                {data.tier1.prompt}
              </h2>
            </div>

            {/* Rhythm meter bar */}
            <div
              style={{
                background: 'var(--card2)',
                borderRadius: '12px',
                padding: '12px 14px',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--mute)' }}>Cadence &amp; rhythm</span>
                <span style={{ color: tier1Pick !== null ? (data.tier1.options[tier1Pick].correct ? 'var(--ok)' : 'var(--bad)') : 'var(--fg3)', fontWeight: 600 }}>
                  {tier1Pick !== null ? (data.tier1.options[tier1Pick].correct ? 'Smooth (92%)' : 'Uneven (50%)') : 'Testing…'}
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--well)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: tier1Pick !== null ? (data.tier1.options[tier1Pick].correct ? '92%' : '50%') : '25%',
                    background: tier1Pick !== null ? (data.tier1.options[tier1Pick].correct ? 'var(--ok)' : 'var(--bad)') : 'var(--acc)',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease, background 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* Option Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.tier1.options.map((opt, idx) => {
                const isSelected = tier1Pick === idx;
                const showResult = tier1Pick !== null;

                let border = '1px solid var(--line)';
                let bg = 'var(--card)';
                if (showResult && isSelected) {
                  border = opt.correct ? '1.5px solid var(--ok)' : '1.5px solid var(--bad)';
                  bg = opt.correct ? 'var(--okbg)' : 'var(--badbg)';
                } else if (showResult && opt.correct) {
                  border = '1px solid var(--ok)';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTier1Answer(idx)}
                    disabled={tier1Pick !== null}
                    style={{
                      textAlign: 'left',
                      padding: '16px 18px',
                      borderRadius: '16px',
                      background: bg,
                      border: border,
                      color: 'var(--fg)',
                      fontSize: '15.5px',
                      lineHeight: 1.45,
                      cursor: tier1Pick !== null ? 'default' : 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--acc2)', fontSize: '14px' }}>
                        {idx === 0 ? 'A' : 'B'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div>{opt.text}</div>
                        {showResult && isSelected && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: opt.correct ? 'var(--ok)' : 'var(--bad)' }}>
                            {opt.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {tier1Pick !== null && (
              <Button
                variant="light"
                size="default"
                onClick={() => {
                  setTier1Pick(null);
                  setActiveTier(2);
                }}
                style={{ marginTop: '8px' }}
              >
                Continue to Tier 2 (Polish)
              </Button>
            )}
          </div>
        )}

        {/* ================= TIER 2: POLISH ================= */}
        {activeTier === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 2 · Polish &amp; tap-to-swap
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>
                {data.tier2.prompt}
              </h2>
            </div>

            {/* Tap to swap interactive card */}
            <div
              style={{
                background: 'var(--card)',
                borderRadius: '20px',
                border: '1px solid var(--line)',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                className="serif"
                style={{
                  fontSize: '20px',
                  lineHeight: 1.6,
                  color: 'var(--fg2)'
                }}
              >
                {data.tier2.sentenceParts[0]}
                <button
                  type="button"
                  onClick={handleTier2Swap}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: tier2Swapped ? 'var(--okbg)' : 'var(--accbg)',
                    border: tier2Swapped ? '1.5px solid var(--ok)' : '1.5px dashed var(--acc2)',
                    color: tier2Swapped ? 'var(--ok)' : 'var(--acc2)',
                    fontFamily: 'inherit',
                    fontSize: '19px',
                    fontWeight: 600,
                    margin: '0 4px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                  }}
                >
                  {tier2Swapped ? data.tier2.betterWord : data.tier2.sentenceParts[1]}
                </button>
                {data.tier2.sentenceParts[2]}
              </div>

              {!tier2Swapped ? (
                <div style={{ fontSize: '13px', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Tap the highlighted token to swap in a sharper verb
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--okbg)', color: 'var(--ok)', fontSize: '13.5px' }}>
                  ✓ Swapped! {data.tier2.explanation} (+20 XP)
                </div>
              )}
            </div>

            {tier2Swapped && (
              <Button
                variant="light"
                size="default"
                onClick={() => setActiveTier(3)}
              >
                Continue to Tier 3 (Vault rehab)
              </Button>
            )}
          </div>
        )}

        {/* ================= TIER 3: VAULT REHAB ================= */}
        {activeTier === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--org2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 3 · Mistake Vault rehab
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>
                Rewrite your past writing slip
              </h2>
            </div>

            {/* Original slip card */}
            <div
              style={{
                background: 'var(--card)',
                borderRadius: '18px',
                border: '1px solid var(--line)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bad)' }}>
                ✗ Original slip
              </span>
              <p className="serif" style={{ margin: 0, fontSize: '17px', fontStyle: 'italic', color: 'var(--fg2)' }}>
                “{activeSlip.orig}”
              </p>
              {activeSlip.tip && (
                <div style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '4px' }}>
                  Tip: {activeSlip.tip}
                </div>
              )}
            </div>

            {/* Rewrite textarea */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Your repaired version
              </label>
              <textarea
                value={tier3Draft}
                onChange={(e) => {
                  setTier3Draft(e.target.value);
                  if (tier3Error) setTier3Error('');
                }}
                disabled={tier3Fixed}
                placeholder={activeSlip.orig}
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  background: 'var(--well)',
                  border: tier3Fixed ? '1px solid var(--ok)' : '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '14px 16px',
                  fontSize: '16px',
                  color: 'var(--fg)',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {tier3Error && (
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--badbg)', color: 'var(--bad)', fontSize: '13.5px' }}>
                {tier3Error}
              </div>
            )}

            {tier3Fixed ? (
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--okbg)', color: 'var(--ok)', fontSize: '14px', textAlign: 'center' }}>
                ✓ Slip repaired! Moved to fixed in your Mistake Vault (+30 XP)
              </div>
            ) : (
              <Button
                variant="primary"
                size="default"
                onClick={handleTier3Redeem}
              >
                Redeem sentence
              </Button>
            )}

            {tier3Fixed && (
              <Button
                variant="light"
                size="default"
                onClick={() => setActiveTier(4)}
              >
                Continue to Tier 4 (Craft)
              </Button>
            )}
          </div>
        )}

        {/* ================= TIER 4: CRAFT ================= */}
        {activeTier === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--acc2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 4 · Original craft
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>
                {data.tier4.prompt}
              </h2>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Use target word: <strong style={{ color: 'var(--acc3)' }}>{data.tier4.word}</strong>
              </label>
              <textarea
                value={tier4Draft}
                onChange={(e) => {
                  setTier4Draft(e.target.value);
                  if (tier4Error) setTier4Error('');
                }}
                disabled={tier4Phase === 'done'}
                placeholder="Compose your sentence here…"
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  background: 'var(--well)',
                  border: tier4Phase === 'done' ? '1px solid var(--ok)' : '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '14px 16px',
                  fontSize: '16px',
                  color: 'var(--fg)',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {tier4Error && (
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--badbg)', color: 'var(--bad)', fontSize: '13.5px' }}>
                {tier4Error}
              </div>
            )}

            {tier4Phase === 'nudge' && (
              <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--orgbg)', border: '1px solid rgba(255, 159, 46, 0.25)', color: 'var(--fg2)', fontSize: '14px' }}>
                <strong style={{ color: 'var(--org2)', display: 'block', marginBottom: '4px' }}>Spotlight Nudge:</strong>
                {data.tier4.nudge}
              </div>
            )}

            {tier4Phase === 'done' && (
              <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--okbg)', border: '1px solid rgba(91, 214, 155, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: '14px' }}>
                    ✓ Natural and well paced · +40 XP
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAnthology}
                    disabled={tier4Saved}
                    style={{
                      fontSize: '12px',
                      color: tier4Saved ? 'var(--ok)' : 'var(--acc2)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      cursor: tier4Saved ? 'default' : 'pointer'
                    }}
                  >
                    {tier4Saved ? '✓ Saved to Anthology' : '+ Save to Anthology'}
                  </button>
                </div>
                <div className="serif" style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--fg2)' }}>
                  “{data.tier4.example}”
                </div>
              </div>
            )}

            {tier4Phase === 'open' ? (
              <Button
                variant="primary"
                size="default"
                onClick={handleTier4Submit}
              >
                Check with AI tutor
              </Button>
            ) : tier4Phase === 'nudge' ? (
              <Button
                variant="primary"
                size="default"
                onClick={handleTier4Submit}
              >
                Submit attempt 2
              </Button>
            ) : (
              <Button
                variant="light"
                size="default"
                onClick={onBack}
              >
                Finish drills
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DrillPage;
