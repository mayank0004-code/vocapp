/**
 * Insights.jsx — stats, mistake chart, and The Mistake Vault.
 *
 * Mistake chart: horizontal bars with categorical palette + text labels
 * (survives greyscale). No donut — bars are better for this n.
 * Vault: grouped by word, collapsed, count shown.
 * Diff: "You wrote / More natural" — soft strike + green, no shouting.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  listenToUserStats,
  listenToMistakeVault,
  listenToMistakeCounts,
  listenToStyleProfile,
  listenToCraftStats,
  calcCraftLevel,
  CANONICAL_HABITS,
} from '../services/db';
import { Loader2, Flame, TrendingUp, Target } from '../components/Icons';
import { springs } from '../motion/springs';

/* ── Studio Pillar Metadata & Categorical Colours ─────────── */
const PILLAR_META = {
  flow: { label: 'Rhythm & Flow', shortLabel: 'Flow', color: '#00c7be', bgTint: 'rgba(0, 199, 190, 0.1)', borderTint: 'rgba(0, 199, 190, 0.25)', icon: '🌊' },
  grammar: { label: 'Grammar & Harmony', shortLabel: 'Grammar', color: 'var(--color-warning)', bgTint: 'rgba(255, 149, 0, 0.1)', borderTint: 'rgba(255, 149, 0, 0.25)', icon: '⚡' },
  context: { label: 'Context & Register', shortLabel: 'Context', color: '#af52de', bgTint: 'rgba(175, 82, 222, 0.1)', borderTint: 'rgba(175, 82, 222, 0.25)', icon: '🎯' },
  punctuation: { label: 'Punctuation & Cadence', shortLabel: 'Punctuation', color: 'var(--color-success)', bgTint: 'rgba(52, 199, 89, 0.1)', borderTint: 'rgba(52, 199, 89, 0.25)', icon: '✍️' },
};

/* ── Stat Tile (Fluid 50/50 Grid, Overflow-Proof & Tactile) ─── */
function StatTile({ value, label, sub, accent, icon, bgGradient, borderColor }) {
  return (
    <m.div
      whileTap={{ scale: 0.97 }}
      transition={springs.indicator}
      className="surface-raised"
      style={{
        flex: 1,
        minWidth: 0,
        padding: 'clamp(12px, 3.5vw, 18px)',
        borderRadius: 'var(--radius-lg)',
        background: bgGradient || 'var(--surface-color)',
        border: `1px solid ${borderColor || 'var(--border-color)'}`,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </p>
        {icon && <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>}
      </div>

      <p style={{
        fontSize: 'clamp(24px, 7vw, 34px)',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        margin: '2px 0 0',
        color: accent || 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {value}
      </p>

      {sub && (
        <p style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: 500,
        }}>
          {sub}
        </p>
      )}
    </m.div>
  );
}

/* ── Mistake Spectrum Breakdown (Segmented Bar + Responsive Cards) ── */
function MistakeSpectrumChart({ sortedTags, total }) {
  const maxCount = sortedTags[0]?.[1] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {/* Segmented Distribution Bar (iOS Battery / Storage Style) */}
      {total > 0 && (
        <div style={{
          height: 8,
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(120, 120, 128, 0.12)',
          display: 'flex',
          overflow: 'hidden',
          gap: 1.5,
          padding: 1,
        }}>
          {sortedTags.map(([tag, count]) => {
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const meta = PILLAR_META[tag] || { color: 'var(--accent-color)' };
            return (
              <m.div
                key={tag}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={springs.reveal}
                style={{
                  height: '100%',
                  background: meta.color,
                  borderRadius: 2,
                }}
                title={`${meta.label || tag}: ${count} slips (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* 4 Pillar Grid Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {sortedTags.map(([tag, count], i) => {
          const meta = PILLAR_META[tag] || { label: tag, shortLabel: tag, color: 'var(--accent-color)', icon: '•' };
          const pct = total > 0 ? (count / total) * 100 : 0;
          const barPct = total > 0 ? (count / maxCount) * 100 : 0;

          return (
            <m.div
              key={tag}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                window.dispatchEvent(new CustomEvent('vocapp:switch-tab', {
                  detail: { tab: 'studio', pillar: tag, tier: 1 }
                }));
              }}
              className="surface-raised"
              style={{
                padding: 'var(--sp-3) var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-2)',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                transition: 'background-color 150ms ease',
              }}
            >
              {/* Row info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
                  <span style={{ fontSize: 16 }} aria-hidden="true">{meta.icon}</span>
                  <span style={{
                    fontSize: 'var(--type-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: count > 0 ? meta.bgTint : 'rgba(120, 120, 128, 0.08)',
                    color: count > 0 ? meta.color : 'var(--text-tertiary)',
                  }}>
                    {count} {count === 1 ? 'slip' : 'slips'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'rgba(120, 120, 128, 0.12)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ ...springs.reveal, delay: i * 0.05 }}
                  style={{ height: '100%', background: meta.color, borderRadius: 'var(--radius-pill)' }}
                />
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vault entry — shows word as header, mistakes collapsed ─ */
function VaultGroup({ word, entries }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '0.5px solid var(--border-color)', paddingBottom: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
      <button
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 'var(--sp-2) 0',
          fontFamily: 'var(--font-family)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--type-body)', color: 'var(--accent-color)' }}>
          {word}
        </span>
        <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', marginLeft: 'auto', marginRight: 'var(--sp-3)' }}>
          {entries.length} mistake{entries.length !== 1 ? 's' : ''}
        </span>
        <m.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={springs.indicator}
          style={{ display: 'inline-flex', color: 'var(--text-tertiary)' }}
          aria-hidden="true"
        >
          ▾
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.reveal}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 'var(--sp-2)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {entries.map((e, i) => (
                <div key={i} style={{ background: 'rgba(120,120,128,0.04)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-3)' }}>
                  {/* Tier and Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'rgba(120, 120, 128, 0.1)',
                      color: 'var(--text-secondary)'
                    }}>
                      {e.tier ? `Tier ${e.tier} · ${e.tier === 1 ? 'Ear Slip' : e.tier === 2 ? 'Connector Choice' : e.tier === 3 ? 'Rehab Attempt' : 'Original Writing'}` : 'Studio Slip'}
                    </span>
                    {e.isRedeemed ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        ✓ Rehabilitated in Studio
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-warning)' }}>
                        Unredeemed
                      </span>
                    )}
                  </div>

                  {/* You wrote — soft strikethrough */}
                  <p style={{
                    fontSize: 'var(--type-sm)',
                    color: 'var(--text-tertiary)',
                    textDecoration: 'line-through',
                    margin: '0 0 var(--sp-1)',
                    lineHeight: 1.5,
                  }}>
                    {e.originalSentence}
                  </p>
                  {/* More natural — no shouting, plain green tint */}
                  {e.reframedSentence && (
                    <p style={{
                      fontSize: 'var(--type-sm)',
                      color: 'var(--text-primary)',
                      margin: 0,
                      paddingLeft: 'var(--sp-3)',
                      borderLeft: '2px solid var(--color-success)',
                      lineHeight: 1.5,
                    }}>
                      {e.reframedSentence}
                    </p>
                  )}

                  {/* Structural Diagnosis & Rule of Thumb */}
                  {(e.structuralDiagnosis || e.ruleOfThumb) && (
                    <div style={{
                      margin: 'var(--sp-2) 0',
                      padding: 'var(--sp-2) var(--sp-3)',
                      background: 'rgba(255, 149, 0, 0.05)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '2px solid var(--color-warning)',
                    }}>
                      {e.structuralDiagnosis && (
                        <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>What to fix: </span>
                          {e.structuralDiagnosis}
                        </p>
                      )}
                      {e.ruleOfThumb && (
                        <p style={{ margin: e.structuralDiagnosis ? '4px 0 0' : 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                          <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#5e5ce6' }}>Tip: </span>
                          {e.ruleOfThumb}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error tags & Rehabilitation Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
                      {e.errorTags?.length > 0 && e.errorTags.map((t, ti) => (
                        <span key={ti} style={{
                          fontSize: 9, fontWeight: 600,
                          padding: '2px var(--sp-2)',
                          background: 'rgba(120,120,128,0.1)',
                          borderRadius: 'var(--radius-pill)',
                          color: 'var(--text-tertiary)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {!e.isRedeemed && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          window.dispatchEvent(new CustomEvent('vocapp:switch-tab', {
                            detail: {
                              tab: 'studio',
                              pillar: e.pillar || (e.errorTags?.[0] || 'flow'),
                              tier: 3,
                              mistake: e,
                            }
                          }));
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '3px var(--sp-3)',
                          fontSize: 'var(--type-xs)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer'
                        }}
                      >
                        <span>Rehabilitate in Studio Tier 3</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Focus Area Coaching Guide (Rich, Actionable, Jargon-Free) ─ */
const COACHING_GUIDES = {
  grammar: {
    category: 'Grammar & Harmony',
    headline: 'Keeping your actions and timing in sync',
    explanation:
      'Most writing slips happen when actions get mixed up across time (accidentally jumping between past and present) or when a single person gets matched with an action word meant for a group. It is not about memorizing textbook formulas — it is about making sure the actions in your sentence walk together naturally.',
    checks: [
      {
        title: "The 'Yesterday' Whisper",
        desc: "If you are describing an event that already finished, mentally whisper 'Yesterday...' before each action. If any action word still sounds like it's happening right now, switch it to the past.",
      },
      {
        title: "The 'Solo Person' Rule",
        desc: "When one person or thing is taking action in the present (she, he, the company), the action word almost always ends with an 's' sound (she notices, the team delivers).",
      },
    ],
    comparison: {
      off: "Yesterday she decide to call him, but he doesn't answer.",
      natural: "Yesterday she decided to call him, but he didn't answer.",
      why: 'Once your sentence sets foot in the past, all the actions stay in the past together.',
    },
  },
  flow: {
    category: 'Rhythm & Sentence Flow',
    headline: 'Helping your thoughts glide from one to the next',
    explanation:
      'When a sentence feels bumpy, thoughts are usually either chopped into too many abrupt stops, or stretched so long that the reader runs out of breath. Good flow sounds like a calm, confident conversation.',
    checks: [
      {
        title: 'The One-Breath Test',
        desc: 'Read your sentence quietly out loud. If you run out of air before the period, split it into two sentences. If your voice keeps stopping abruptly every few words, connect them with words like "because", "while", or "and".',
      },
      {
        title: 'Vary Your Sentence Rhythm',
        desc: 'Follow a longer, detailed sentence with a short, punchy one. This gives your writing a musical cadence rather than feeling repetitive.',
      },
    ],
    comparison: {
      off: 'The project was difficult. I worked late every night. I learned a lot.',
      natural: 'The project was difficult and kept me up late every night, but I learned a lot from the challenge.',
      why: 'Connecting the struggle to the payoff guides your reader naturally through your thought.',
    },
  },
  context: {
    category: 'Natural Word Usage',
    headline: 'Putting the word in its natural habitat',
    explanation:
      'A word can match a dictionary definition and still sound out of place. Words carry an emotional weight and social setting — using a grand, formal word in a casual setting (or vice versa) can make a sentence feel stiff.',
    checks: [
      {
        title: 'The Setting Check',
        desc: 'Picture where this sentence is spoken. Would you say it to a friend over coffee, or in a thoughtful reflection? Match the energy of your sentence to the weight of the word.',
      },
      {
        title: 'Notice Natural Word Pairs',
        desc: 'Words usually travel in set phrases. Notice the words that frequently surround it in books and articles (for example, "profound impact" rather than "profound hunger").',
      },
    ],
    comparison: {
      off: 'I experienced a profound craving for some cold water.',
      natural: 'Reading her memoirs had a profound impact on how I approach my own work.',
      why: '"Profound" carries deep emotional resonance, so it feels at home with transformative moments.',
    },
  },
  punctuation: {
    category: 'Pauses & Punctuation',
    headline: 'Giving your reader room to breathe',
    explanation:
      'Punctuation is sheet music for reading. It guides where the reader should take a breath, when an idea has landed, and how two thoughts connect.',
    checks: [
      {
        title: 'The Natural Pause Test',
        desc: 'Speak the sentence aloud at a relaxed pace. Wherever your voice naturally dips or pauses for a half-beat, a comma usually belongs there.',
      },
      {
        title: 'Connecting Two Full Thoughts',
        desc: 'If you have two complete thoughts that could each stand alone as their own sentence, do not glue them with just a comma. Use a period, or add words like "and", "but", or "so".',
      },
    ],
    comparison: {
      off: 'The sun came out we decided to take a walk.',
      natural: 'The sun came out, so we decided to take a walk.',
      why: 'The comma and "so" clarify the cause and effect immediately.',
    },
  },
  format: {
    category: 'Sentence Style',
    headline: 'Matching the challenge prompt',
    explanation:
      'Each prompt type strengthens a different communication muscle: Factual sentences make objective observations, Personal sentences tell your story, and Questions spark inquiry.',
    checks: [
      {
        title: 'Factual Observations',
        desc: 'State a clear truth or observation about how something works in the world, without talking about yourself.',
      },
      {
        title: 'Personal Reflections',
        desc: 'Connect the word directly to your real life, feelings, or memories using "I" or "my".',
      },
      {
        title: 'Genuine Questions',
        desc: 'Ask an open question that invites reflection or an explanation, ending with a question mark.',
      },
    ],
    comparison: {
      off: 'Prompt: Question — "I wonder why people are so stubborn."',
      natural: 'Prompt: Question — "Why do we find it so difficult to change our minds when presented with new facts?"',
      why: 'An authentic question invites the reader to think, rather than stating what you were wondering.',
    },
  },
};

function getCoachingGuide(tag) {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (t.includes('grammar')) return COACHING_GUIDES.grammar;
  if (t.includes('flow')) return COACHING_GUIDES.flow;
  if (t.includes('context') || t.includes('vocab')) return COACHING_GUIDES.context;
  if (t.includes('punct')) return COACHING_GUIDES.punctuation;
  if (t.includes('format') || t.includes('type')) return COACHING_GUIDES.format;

  return {
    category: tag.charAt(0).toUpperCase() + tag.slice(1),
    headline: 'Expressing your idea clearly and naturally',
    explanation:
      'Focus on expressing one vivid idea at a time. When the core thought is clear in your own mind, the words fall into place effortlessly.',
    checks: [
      {
        title: 'Strip to the Core',
        desc: 'Ask yourself: "Who did what?" Once that core action is crystal clear, add the details around it.',
      },
      {
        title: 'Read It Aloud Once',
        desc: 'Your ear is your best editor. If a phrase trips your tongue while speaking, it will trip the reader.',
      },
    ],
    comparison: {
      off: 'Having been there before it was known to me.',
      natural: 'Because I had visited the city before, the winding streets felt familiar.',
      why: 'Putting a real person at the center makes the sentence warm and effortless to read.',
    },
  };
}

/* ── Focus Area Card ─────────────────────────────────────── */
function FocusAreaCard({ tag, relevantMistake }) {
  const guide = getCoachingGuide(tag);
  if (!guide) return null;

  return (
    <section style={{ marginBottom: 'var(--sp-6)' }}>
      <div
        className="surface-raised"
        style={{
          padding: 'var(--sp-5)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 149, 0, 0.25)',
          background: 'linear-gradient(180deg, rgba(255, 149, 0, 0.05) 0%, rgba(255, 149, 0, 0.01) 100%), var(--surface-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--type-xs)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-warning)',
                background: 'rgba(255, 149, 0, 0.12)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <Target size={12} color="var(--color-warning)" />
              Focus area · {guide.category}
            </span>
          </div>

          <h3
            style={{
              margin: '0 0 var(--sp-2)',
              fontSize: 'var(--type-lead)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {guide.headline}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: 'var(--type-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {guide.explanation}
          </p>
        </div>

        {/* Actionable checks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <p className="t-label" style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>
            Rules of thumb to try
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-2)' }}>
            {guide.checks.map((c, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(120, 120, 128, 0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--sp-3)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 var(--sp-1)',
                    fontSize: 'var(--type-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  💡 {c.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--type-xs)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Before & After comparison */}
        <div
          style={{
            background: 'rgba(120, 120, 128, 0.04)',
            borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--border-color)',
            padding: 'var(--sp-3)',
          }}
        >
          <p className="t-label" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-2)' }}>
            How it looks in practice
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>❌</span>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--type-sm)',
                  color: 'var(--text-tertiary)',
                  textDecoration: 'line-through',
                  lineHeight: 1.4,
                }}
              >
                {guide.comparison.off}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>✨</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--type-sm)',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {guide.comparison.natural}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 'var(--type-xs)',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                  }}
                >
                  {guide.comparison.why}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personalized note from user's vault if they have an error under this tag */}
        {relevantMistake && (
          <div
            style={{
              padding: 'var(--sp-3)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--color-warning)',
              background: 'rgba(255, 159, 10, 0.08)',
            }}
          >
            <p className="t-label" style={{ color: 'var(--color-warning)', marginBottom: 'var(--sp-1)' }}>
              From your recent practice with &ldquo;{relevantMistake.word}&rdquo;
            </p>
            <p
              style={{
                margin: '0 0 var(--sp-1)',
                fontSize: 'var(--type-sm)',
                color: 'var(--text-tertiary)',
                textDecoration: 'line-through',
                lineHeight: 1.4,
              }}
            >
              {relevantMistake.originalSentence}
            </p>
            {relevantMistake.reframedSentence && (
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--type-sm)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                ✨ {relevantMistake.reframedSentence}
              </p>
            )}
          </div>
        )}

        {/* Practice in Studio CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--sp-2)' }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'studio' }))}
            className="btn btn-primary"
            style={{
              padding: 'var(--sp-2) var(--sp-4)',
              fontSize: 'var(--type-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Practice in Studio</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Habits Under Active Coaching Section ────────────────── */
function HabitsUnderCoachingSection({ styleProfile }) {
  const habits = Object.values(styleProfile?.habits || {})
    .filter(h => h && (h.count > 0 || h.status === 'mastering'))
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  if (habits.length === 0) {
    return (
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="t-title" style={{ margin: '0 0 var(--sp-2)' }}>Habits Under Active Coaching</h2>
        <div className="surface-raised" style={{ padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            🌱 No recurring syntactic habits flagged yet. As you practice drills in the <strong>Studio</strong> tab, your AI writing coach will actively profile recurring patterns (such as clause stacking, comma splices, or tense drift) here.
          </p>
        </div>
      </section>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'mastering':
        return {
          label: 'Mastering',
          bg: 'rgba(52, 199, 89, 0.12)',
          border: '1px solid rgba(52, 199, 89, 0.3)',
          color: 'var(--color-success)',
          icon: '✓'
        };
      case 'under_coaching':
        return {
          label: 'Under Coaching',
          bg: 'rgba(0, 113, 227, 0.1)',
          border: '1px solid rgba(0, 113, 227, 0.25)',
          color: 'var(--accent-color)',
          icon: '🎯'
        };
      case 'needs_attention':
      default:
        return {
          label: 'Needs Attention',
          bg: 'rgba(255, 149, 0, 0.12)',
          border: '1px solid rgba(255, 149, 0, 0.3)',
          color: 'var(--color-warning)',
          icon: '⚡'
        };
    }
  };

  return (
    <section style={{ marginBottom: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)' }}>
        <h2 className="t-title" style={{ margin: 0 }}>Habits Under Active Coaching</h2>
        <span className="t-label" style={{ color: 'var(--text-tertiary)' }}>{habits.length} tracked</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {habits.map((h) => {
          const badge = getStatusBadge(h.status);
          const rawKey = h.key || 'other';
          const habitDef = CANONICAL_HABITS[rawKey] || CANONICAL_HABITS['other'];
          const pillar = h.pillar || habitDef.pillar || 'flow';
          const rule = habitDef.ruleOfThumb;

          return (
            <div key={h.key} className="surface-raised" style={{ padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {h.title || habitDef.title}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)' }}>
                    Targeted in {pillar.toUpperCase()} · Observed {h.count} time{h.count !== 1 ? 's' : ''}
                    {h.lastWord ? ` · Recent slip on "${h.lastWord}"` : ''}
                  </p>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                  background: badge.bg, border: badge.border,
                  color: badge.color, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  flexShrink: 0
                }}>
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              </div>

              {rule && (
                <div style={{
                  padding: 'var(--sp-2) var(--sp-3)',
                  background: 'rgba(120, 120, 128, 0.06)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--sp-3)',
                  borderLeft: '2.5px solid var(--accent-color)'
                }}>
                  <p style={{ margin: 0, fontSize: 'var(--type-xs)', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {rule}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    window.dispatchEvent(new CustomEvent('vocapp:switch-tab', {
                      detail: { tab: 'studio', pillar }
                    }));
                  }}
                  style={{
                    padding: 'var(--sp-1) var(--sp-3)',
                    fontSize: 'var(--type-xs)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>Drill in Studio ({pillar})</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function Insights({ currentUser }) {
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState(null);
  const [craftStats, setCraftStats]       = useState(null);
  const [mistakeCounts, setMistakeCounts] = useState({});
  const [vault, setVault]                 = useState([]);
  const [styleProfile, setStyleProfile]   = useState({ habits: {} });

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    let n = 0;
    const done = () => { n++; if (n >= 4) setLoading(false); };

    const u1 = listenToUserStats(currentUser.uid, d => { setStats(d); done(); });
    const u2 = listenToMistakeCounts(currentUser.uid, d => { setMistakeCounts(d); done(); });
    const u3 = listenToMistakeVault(currentUser.uid, d => { setVault(d); done(); });
    const u4 = listenToStyleProfile(currentUser.uid, d => { setStyleProfile(d); });
    const u5 = listenToCraftStats(currentUser.uid, d => { setCraftStats(d); done(); });
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [currentUser]);

  const [vaultFilter, setVaultFilter]     = useState('all'); // 'all' | 'unredeemed' | 'redeemed'

  const unredeemedCount = useMemo(() => vault.filter(m => !m.isRedeemed).length, [vault]);
  const redeemedCount   = useMemo(() => vault.filter(m => m.isRedeemed).length, [vault]);

  const filteredVault = useMemo(() => {
    if (vaultFilter === 'unredeemed') return vault.filter(m => !m.isRedeemed);
    if (vaultFilter === 'redeemed')   return vault.filter(m => m.isRedeemed);
    return vault;
  }, [vault, vaultFilter]);

  // Group vault by normalized word or pillar
  const vaultByWord = useMemo(() => {
    const map = {};
    filteredVault.forEach(e => {
      const key = (e.word || e.pillar || 'general').trim().toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    // Sort each group by timestamp desc
    Object.values(map).forEach(arr => arr.sort((a, b) => b.timestamp - a.timestamp));
    return map;
  }, [filteredVault]);

  // Filter mistake counts strictly by 4 valid Studio pillars
  const PILLAR_KEYS = ['flow', 'grammar', 'context', 'punctuation'];
  const sortedTags = useMemo(() => {
    return PILLAR_KEYS
      .map(key => [key, typeof mistakeCounts[key] === 'number' ? mistakeCounts[key] : 0])
      .sort(([, a], [, b]) => b - a);
  }, [mistakeCounts]);

  const totalMistakes = useMemo(() => {
    return sortedTags.reduce((s, [, c]) => s + c, 0);
  }, [sortedTags]);

  const topTag = sortedTags[0]?.[1] > 0 ? sortedTags[0][0] : null;

  // Craft stats aggregate calculations
  const totalCraftXp = useMemo(() => {
    if (!craftStats) return 0;
    return (craftStats.grammar?.xp || 0) + (craftStats.flow?.xp || 0) + (craftStats.context?.xp || 0) + (craftStats.punctuation?.xp || 0);
  }, [craftStats]);

  const overallCraft = useMemo(() => {
    if (!craftStats) return { level: 1, rank: 'Novice' };
    const combinedTiers = {
      1: (craftStats.grammar?.tierCompletions?.[1] || 0) + (craftStats.flow?.tierCompletions?.[1] || 0) + (craftStats.context?.tierCompletions?.[1] || 0) + (craftStats.punctuation?.tierCompletions?.[1] || 0),
      2: (craftStats.grammar?.tierCompletions?.[2] || 0) + (craftStats.flow?.tierCompletions?.[2] || 0) + (craftStats.context?.tierCompletions?.[2] || 0) + (craftStats.punctuation?.tierCompletions?.[2] || 0),
      3: (craftStats.grammar?.tierCompletions?.[3] || 0) + (craftStats.flow?.tierCompletions?.[3] || 0) + (craftStats.context?.tierCompletions?.[3] || 0) + (craftStats.punctuation?.tierCompletions?.[3] || 0),
      4: (craftStats.grammar?.tierCompletions?.[4] || 0) + (craftStats.flow?.tierCompletions?.[4] || 0) + (craftStats.context?.tierCompletions?.[4] || 0) + (craftStats.punctuation?.tierCompletions?.[4] || 0),
    };
    return calcCraftLevel(totalCraftXp, combinedTiers);
  }, [craftStats, totalCraftXp]);

  const totalDrillsSolved = useMemo(() => {
    if (!craftStats) return 0;
    return (craftStats.grammar?.solved || 0) + (craftStats.flow?.solved || 0) + (craftStats.context?.solved || 0) + (craftStats.punctuation?.solved || 0);
  }, [craftStats]);

  // Find recent example from vault for the top focus area
  const relevantMistake = useMemo(() => {
    if (!topTag || !vault?.length) return null;
    return vault.find(m =>
      m.errorTags?.some(t =>
        t.toLowerCase().includes(topTag.toLowerCase()) ||
        topTag.toLowerCase().includes(t.toLowerCase())
      )
    );
  }, [topTag, vault]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div style={{
      padding: 'clamp(12px, 3.5vw, 24px) clamp(12px, 3.5vw, 20px) var(--sp-8)',
      maxWidth: 640,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>

      {/* ── Studio Craft Identity Hero Card ───────────────── */}
      <div
        className="surface-raised"
        style={{
          padding: 'clamp(14px, 4vw, 20px)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--sp-3)',
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.12) 0%, rgba(94, 92, 230, 0.05) 50%, var(--surface-color) 100%)',
          border: '1px solid rgba(0, 113, 227, 0.22)',
          boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2.5vw, 12px)', minWidth: 0 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-pill)',
              background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.25) 0%, rgba(94, 92, 230, 0.15) 100%)',
              border: '1px solid rgba(0, 113, 227, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}>
              ✍️
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 'clamp(18px, 4.8vw, 22px)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}>
                  {overallCraft.rank}
                </h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(0, 113, 227, 0.15)',
                  border: '1px solid rgba(0, 113, 227, 0.25)',
                  color: 'var(--accent-color)',
                  whiteSpace: 'nowrap',
                }}>
                  Level {overallCraft.level}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {totalCraftXp} Craft XP earned in Studio
              </p>
            </div>
          </div>

          <m.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'studio' }));
            }}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: 'var(--type-xs)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              background: 'rgba(0, 113, 227, 0.12)',
              border: '1px solid rgba(0, 113, 227, 0.25)',
              color: 'var(--accent-color)',
              cursor: 'pointer',
            }}
          >
            <span>Studio</span>
            <span>→</span>
          </m.button>
        </div>

        {/* Progress to next rank */}
        {overallCraft.nextRequirement && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                Progress to next rank
              </span>
              <span style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 600 }}>
                {overallCraft.nextRequirement}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(120, 120, 128, 0.15)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <m.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(6, ((totalCraftXp - (overallCraft.currentBase || 0)) / Math.max(1, (overallCraft.nextThreshold || 100) - (overallCraft.currentBase || 0))) * 100))}%`
                }}
                transition={springs.reveal}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-color) 0%, #5e5ce6 100%)',
                  borderRadius: 'var(--radius-pill)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Two Adaptive Stat Tiles (Balanced 50/50 Grid, Zero Clipping) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(10px, 3vw, 14px)',
        marginBottom: 'var(--sp-6)'
      }}>
        <StatTile
          label="Streak"
          value={stats?.currentStreak || 0}
          sub={`Best: ${stats?.highestStreak || 0} days`}
          accent="var(--color-warning)"
          icon="🔥"
          bgGradient="linear-gradient(145deg, rgba(255, 149, 0, 0.08) 0%, var(--surface-color) 100%)"
          borderColor="rgba(255, 149, 0, 0.2)"
        />
        <StatTile
          label="Studio Drills"
          value={totalDrillsSolved}
          sub={`${totalDrillsSolved === 1 ? 'drill' : 'drills'} solved`}
          accent="var(--color-success)"
          icon="🎯"
          bgGradient="linear-gradient(145deg, rgba(52, 199, 89, 0.08) 0%, var(--surface-color) 100%)"
          borderColor="rgba(52, 199, 89, 0.2)"
        />
      </div>

      {/* ── Habits Under Active Coaching ──────────────── */}
      <HabitsUnderCoachingSection styleProfile={styleProfile} />

      {/* ── Mistake Breakdown — Spectrum & Bar Chart ─── */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)' }}>
          <h2 className="t-title" style={{ margin: 0 }}>Writing Spectrum</h2>
          <span className="t-label" style={{ color: 'var(--text-tertiary)' }}>Studio Slips</span>
        </div>
        {totalMistakes === 0 ? (
          <div
            className="surface-raised"
            style={{
              padding: 'var(--sp-5)',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, var(--surface-color) 100%)',
              border: '1px solid rgba(52, 199, 89, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <h3 style={{ margin: 0, fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--color-success)' }}>
                Flawless Studio Record
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Zero unassisted slips recorded yet! As you complete Spot & Fix, Polish, or Creative drills in the <strong>Studio</strong> tab, your authentic rhythm, grammar, context, and punctuation profile will evolve here.
            </p>
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  window.dispatchEvent(new CustomEvent('vocapp:switch-tab', { detail: 'studio' }));
                }}
                className="btn btn-primary"
                style={{ fontSize: 'var(--type-xs)', padding: '6px 14px' }}
              >
                <span>Launch Studio Drill</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ) : (
          <MistakeSpectrumChart sortedTags={sortedTags} total={totalMistakes} />
        )}
      </section>

      {/* ── Focus Area Coaching Card ─────────────────── */}
      {topTag && (
        <FocusAreaCard tag={topTag} relevantMistake={relevantMistake} />
      )}

      {/* ── The Mistake Vault ───────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
          <h2 className="t-title" style={{ margin: 0 }}>The Mistake Vault</h2>

          {/* Filter Pills */}
          {vault.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'all', label: `All (${vault.length})` },
                { id: 'unredeemed', label: `Unredeemed (${unredeemedCount})` },
                { id: 'redeemed', label: `Done (${redeemedCount})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setVaultFilter(tab.id);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 11,
                    fontWeight: vaultFilter === tab.id ? 700 : 500,
                    background: vaultFilter === tab.id ? 'var(--accent-color)' : 'rgba(120, 120, 128, 0.12)',
                    color: vaultFilter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {Object.keys(vaultByWord).length === 0 ? (
          <div className="surface-raised" style={{ padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ margin: 0, fontSize: 'var(--type-sm)', color: 'var(--text-secondary)' }}>
              {vault.length === 0
                ? 'Your Studio vault is clean — no unassisted writing slips logged yet.'
                : 'No slips match this filter.'}
            </p>
          </div>
        ) : (
          <div className="surface-grouped" style={{ padding: 'var(--sp-4)' }}>
            {Object.entries(vaultByWord).map(([word, entries]) => (
              <VaultGroup key={word} word={word} entries={entries} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom pad */}
      <div style={{ height: 'var(--sp-6)' }} />
    </div>
  );
}
