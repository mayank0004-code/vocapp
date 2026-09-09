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
import { listenToUserStats, listenToMistakeVault, listenToMistakeCounts } from '../services/db';
import { Loader2, Flame, TrendingUp, Target } from '../components/Icons';
import { springs } from '../motion/springs';

/* ── Categorical colours (plan-spec, luminance-distinct) ─── */
const CAT = [
  { color: 'var(--cat-1)', label: 'Violet' },
  { color: 'var(--cat-2)', label: 'Teal' },
  { color: 'var(--cat-3)', label: 'Lime' },
  { color: 'var(--cat-4)', label: 'Fuchsia' },
];

/* ── Stat Tile ────────────────────────────────────────────── */
function StatTile({ value, label, sub, accent }) {
  return (
    <div className="surface-raised" style={{
      flex: 1,
      padding: 'var(--sp-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
    }}>
      <p className="t-label">{label}</p>
      <p style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--type-display-weight)', letterSpacing: 'var(--type-display-ls)', lineHeight: 1, margin: 0, color: accent || 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)', margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ── Horizontal bar chart ────────────────────────────────── */
function MistakeChart({ sortedTags, total }) {
  const maxCount = sortedTags[0]?.[1] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {sortedTags.slice(0, 4).map(([tag, count], i) => {
        const pct     = (count / total) * 100;
        const barPct  = (count / maxCount) * 100;
        const cat     = CAT[i % CAT.length];
        return (
          <div key={tag}>
            {/* Label row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                {/* Colour swatch — also a text label for greyscale */}
                <div style={{
                  width: 10, height: 10,
                  borderRadius: 2,
                  background: cat.color,
                  flexShrink: 0,
                }} aria-hidden="true" />
                <span style={{ fontSize: 'var(--type-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {tag}
                </span>
              </div>
              <span style={{ fontSize: 'var(--type-xs)', color: 'var(--text-tertiary)' }}>
                {Math.round(pct)}% · {count}
              </span>
            </div>
            {/* Bar */}
            <div style={{ height: 6, background: 'rgba(120,120,128,0.12)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${barPct}%` }}
                transition={{ ...springs.reveal, delay: i * 0.06 }}
                style={{ height: '100%', background: cat.color, borderRadius: 'var(--radius-pill)' }}
              />
            </div>
          </div>
        );
      })}
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
                <div key={i}>
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
                  {/* Error tags */}
                  {e.errorTags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)', marginTop: 'var(--sp-2)' }}>
                      {e.errorTags.map((t, ti) => (
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
                  )}
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Coaching tip ─────────────────────────────────────────── */
function getTip(tag) {
  const t = tag.toLowerCase();
  if (t.includes('flow'))        return 'Read your sentences aloud. Choppy rhythm is usually a missing transition word.';
  if (t.includes('grammar'))     return 'Check subject–verb agreement and tense consistency before submitting.';
  if (t.includes('context'))     return 'Review the dictionary entry. Make sure the word fits the register of your sentence.';
  if (t.includes('punctuation')) return 'Commas for major pauses, full stop at the end — keep it consistent.';
  return 'Clear, concise, direct. One idea per sentence when in doubt.';
}

/* ── Main Component ─────────────────────────────────────── */
export default function Insights({ currentUser }) {
  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState(null);
  const [mistakeCounts, setMistakeCounts] = useState({});
  const [vault, setVault]               = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    let n = 0;
    const done = () => { n++; if (n === 3) setLoading(false); };

    const u1 = listenToUserStats(currentUser.uid, d => { setStats(d); done(); });
    const u2 = listenToMistakeCounts(currentUser.uid, d => { setMistakeCounts(d); done(); });
    const u3 = listenToMistakeVault(currentUser.uid, d => { setVault(d); done(); });
    return () => { u1(); u2(); u3(); };
  }, [currentUser]);

  // Group vault by word
  const vaultByWord = useMemo(() => {
    const map = {};
    vault.forEach(e => {
      if (!map[e.word]) map[e.word] = [];
      map[e.word].push(e);
    });
    // Sort each group by timestamp desc
    Object.values(map).forEach(arr => arr.sort((a, b) => b.timestamp - a.timestamp));
    return map;
  }, [vault]);

  const sortedTags   = Object.entries(mistakeCounts).sort(([, a], [, b]) => b - a);
  const totalMistakes = sortedTags.reduce((s, [, c]) => s + c, 0);
  const topTag        = sortedTags[0]?.[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--sp-12)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-5) 0' }}>

      {/* ── Stat Tiles ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
        <StatTile
          label="Streak"
          value={stats?.currentStreak || 0}
          sub={`Best: ${stats?.highestStreak || 0} days`}
          accent="var(--color-warning)"
        />
        <StatTile
          label="This week"
          value={stats?.totalPracticed || 0}
          sub="sentences practiced"
          accent="var(--accent-color)"
        />
      </div>

      {/* ── Mistake Breakdown — horizontal bar chart ─── */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="t-title" style={{ margin: '0 0 var(--sp-4)' }}>Mistake breakdown</h2>
        {totalMistakes === 0 ? (
          <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)' }}>
            No mistakes logged yet. Keep practicing to generate insights.
          </p>
        ) : (
          <MistakeChart sortedTags={sortedTags} total={totalMistakes} />
        )}
      </section>

      {/* ── Coaching Tip (top mistake area) ─────────── */}
      {topTag && (
        <div style={{
          marginBottom: 'var(--sp-6)',
          padding: 'var(--sp-4)',
          borderLeft: '3px solid var(--color-warning)',
          background: 'rgba(255,159,10,0.05)',
          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        }}>
          <p className="t-label" style={{ marginBottom: 'var(--sp-2)', color: 'var(--color-warning)' }}>
            Focus area: {topTag}
          </p>
          <p style={{ fontSize: 'var(--type-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {getTip(topTag)}
          </p>
        </div>
      )}

      {/* ── Mistake Vault ───────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="t-title" style={{ margin: '0 0 var(--sp-4)' }}>The Mistake Vault</h2>

        {Object.keys(vaultByWord).length === 0 ? (
          <p style={{ fontSize: 'var(--type-body)', color: 'var(--text-secondary)' }}>
            Your vault is empty — you haven't made any tracked mistakes yet.
          </p>
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
