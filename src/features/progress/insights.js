/**
 * insights.js — pure helpers for the v2 Progress screen.
 * Ported from src/pages/Insights.jsx (classic UI is the source of truth).
 */
import { calcCraftLevel } from '../../services/db';

/** Insights.jsx PILLAR_KEYS order for the spectrum (sorted by count afterwards). */
export const SPECTRUM_KEYS = ['flow', 'grammar', 'context', 'punctuation'];

/** Insights.jsx sortedTags: the four pillars from mistakeCounts, most slips first. */
export function sortedPillarSlips(mistakeCounts = {}) {
  return SPECTRUM_KEYS
    .map((key) => [key, typeof mistakeCounts?.[key] === 'number' ? mistakeCounts[key] : 0])
    .sort(([, a], [, b]) => b - a);
}

/** Insights.jsx relevantMistake: first vault entry whose error tags match the top pillar. */
export function findRelevantMistake(vault = [], topTag) {
  if (!topTag || !vault?.length) return null;
  const top = topTag.toLowerCase();
  return vault.find((m) =>
    m.errorTags?.some((t) => {
      const lt = (t || '').toLowerCase();
      return lt && (lt.includes(top) || top.includes(lt));
    })
  ) || null;
}

/** Insights.jsx hero bar: share of the current rank bracket, min 6%. */
export function rankProgressPct(xp = 0, info = {}) {
  const base = info.currentBase || 0;
  const span = Math.max(1, (info.nextThreshold || 100) - base);
  return Math.min(100, Math.max(6, ((xp - base) / span) * 100));
}

/** Studio / PracticeHub skill bar: share of the pillar's level bracket, min 6%, full when capped or maxed. */
export function pillarSkill(pillarStats) {
  const xp = pillarStats?.xp || 0;
  const lvl = calcCraftLevel(xp, pillarStats?.tierCompletions);
  const span = lvl.nextThreshold - lvl.currentBase;
  const progress = Math.max(0, xp - lvl.currentBase);
  const pct = lvl.level >= 5 || lvl.isCapped ? 1 : Math.min(1, Math.max(0.06, span > 0 ? progress / span : 1));
  return { level: lvl.level, isCapped: lvl.isCapped, pct: Math.round(pct * 100) };
}

/**
 * Review accuracy from recordReviewResult data. Prefers the rolling recentReviews
 * window (last 20), then lifetime correctReviews/totalReviews. Null when no reviews.
 */
export function reviewAccuracy(stats) {
  const recent = Array.isArray(stats?.recentReviews) ? stats.recentReviews : [];
  if (recent.length > 0) {
    const correct = recent.filter((r) => r?.isCorrect).length;
    return { pct: Math.round((correct / recent.length) * 100), label: `last ${recent.length} ${recent.length === 1 ? 'review' : 'reviews'}` };
  }
  const total = stats?.totalReviews || 0;
  if (total > 0) {
    return { pct: Math.round(((stats.correctReviews || 0) / total) * 100), label: `${total} ${total === 1 ? 'review' : 'reviews'}` };
  }
  return null;
}

const ymd = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/**
 * Current-month calendar cells, Monday first. activeDates are 'YYYY-MM-DD'
 * strings (recordDailyActivity). States: 'x' outside month, 'on' active,
 * 'today' today not yet active, '' otherwise.
 */
export function buildMonthCells(activeDates = [], now = new Date()) {
  const active = new Set(Array.isArray(activeDates) ? activeDates : []);
  const year = now.getFullYear();
  const month = now.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = ymd(now);
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < total; i++) {
    const day = i - offset + 1;
    let state = 'x';
    let date = null;
    if (day >= 1 && day <= daysInMonth) {
      date = ymd(new Date(year, month, day));
      state = active.has(date) ? 'on' : date === todayStr ? 'today' : '';
    }
    cells.push({ index: i, day, date, state });
  }
  return cells;
}

/** Insights.jsx COACHING_GUIDES (headline, explanation, rules of thumb). */
export const COACHING_GUIDES = {
  grammar: {
    category: 'Grammar & Harmony',
    headline: 'Keeping your actions and timing in sync',
    explanation:
      'Most slips here happen when actions get mixed up across time, jumping between past and present, or when one person is matched with an action word meant for a group.',
    checks: [
      { title: "The 'Yesterday' whisper", desc: "For a finished event, whisper 'Yesterday…' before each action. Anything that still sounds like now goes into the past." },
      { title: "The 'solo person' rule", desc: 'One person or thing acting in the present usually takes an ‘s’: she notices, the team delivers.' },
    ],
  },
  flow: {
    category: 'Rhythm & Sentence Flow',
    headline: 'Helping your thoughts glide from one to the next',
    explanation:
      'Bumpy sentences are usually chopped into too many abrupt stops, or stretched so long the reader runs out of breath. Good flow sounds like a calm, confident conversation.',
    checks: [
      { title: 'The one-breath test', desc: 'Read it aloud. Out of air before the period? Split it. Stopping every few words? Join with “because”, “while” or “and”.' },
      { title: 'Vary your rhythm', desc: 'Follow a longer, detailed sentence with a short, punchy one.' },
    ],
  },
  context: {
    category: 'Natural Word Usage',
    headline: 'Putting the word in its natural habitat',
    explanation:
      'A word can match its dictionary definition and still sound out of place. Using a grand, formal word in a casual setting (or the reverse) makes a sentence feel stiff.',
    checks: [
      { title: 'The setting check', desc: 'Picture where the sentence is spoken and match its energy to the weight of the word.' },
      { title: 'Notice natural pairs', desc: 'Words travel in set phrases: “profound impact”, not “profound hunger”.' },
    ],
  },
  punctuation: {
    category: 'Pauses & Punctuation',
    headline: 'Giving your reader room to breathe',
    explanation:
      'Punctuation is sheet music for reading. It tells the reader where to breathe, when an idea has landed, and how two thoughts connect.',
    checks: [
      { title: 'The natural pause test', desc: 'Read it at a relaxed pace. Where your voice dips for a half-beat, a comma usually belongs.' },
      { title: 'Two full thoughts', desc: 'Don’t glue two complete sentences with a comma. Use a period, or add “and”, “but” or “so”.' },
    ],
  },
};
