import { describe, it, expect } from 'vitest';
import { calcCraftLevel } from '../services/db';

/* ── SRS Interval Calculation Helper ─────────────────────── */
function getNextInterval(currentInterval, isCorrect) {
  if (!isCorrect) return 1;
  if (currentInterval === 1) return 3;
  if (currentInterval === 3) return 7;
  if (currentInterval === 7) return 14;
  return currentInterval * 2;
}

/* ── Strength Bars from Interval Helper ──────────────────── */
function getStrengthBars(interval) {
  if (!interval || interval <= 1) return 1;
  if (interval <= 3) return 2;
  if (interval <= 7) return 3;
  return 4; // 14 and up
}

/* ── Pending Expiry Helper ───────────────────────────────── */
function checkPendingExpiry(createdAt, now = Date.now()) {
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const age = now - createdAt;

  if (age > SEVEN_DAYS_MS) {
    return { status: 'expired', isExpiringSoon: true, isDeleted: true };
  }
  return {
    status: 'active',
    isExpiringSoon: age > FIVE_DAYS_MS,
    isDeleted: false
  };
}

/* ── Writing Preflight Checks Helper ─────────────────────── */
function validateWritingDraft(draft, targetWord, isQuestion = false) {
  const text = (draft || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  
  if (words.length < 4) {
    return { valid: false, error: 'Write a full sentence, at least 4 words.' };
  }
  
  const stem = targetWord.toLowerCase().length > 4 
    ? targetWord.toLowerCase().slice(0, -1) 
    : targetWord.toLowerCase();
    
  if (!text.toLowerCase().includes(stem)) {
    return { valid: false, error: `Include “${targetWord}” in your sentence.` };
  }
  
  if (isQuestion && !text.includes('?')) {
    return { valid: false, error: 'A question needs a question mark at the end.' };
  }
  
  return { valid: true, error: null };
}

describe('Phase 0 Safety Harness: Core Business Logic', () => {
  describe('SRS Intervals (1 -> 3 -> 7 -> 14 -> x2, reset on miss)', () => {
    it('progresses intervals correctly when answered correctly', () => {
      expect(getNextInterval(1, true)).toBe(3);
      expect(getNextInterval(3, true)).toBe(7);
      expect(getNextInterval(7, true)).toBe(14);
      expect(getNextInterval(14, true)).toBe(28);
      expect(getNextInterval(28, true)).toBe(56);
    });

    it('resets interval to 1 on any incorrect answer', () => {
      expect(getNextInterval(1, false)).toBe(1);
      expect(getNextInterval(3, false)).toBe(1);
      expect(getNextInterval(7, false)).toBe(1);
      expect(getNextInterval(14, false)).toBe(1);
      expect(getNextInterval(56, false)).toBe(1);
    });

    it('maps intervals to memory strength bars (1 to 4)', () => {
      expect(getStrengthBars(1)).toBe(1);
      expect(getStrengthBars(3)).toBe(2);
      expect(getStrengthBars(7)).toBe(3);
      expect(getStrengthBars(14)).toBe(4);
      expect(getStrengthBars(30)).toBe(4);
    });

    it('requires words to breach the 21 days mark (interval >= 21) to reach Mastered', () => {
      const sampleWords = [
        { word: 'avail', interval: 7 },
        { word: 'abstruse', interval: 14 },
        { word: 'apparatus', interval: 28 },
        { word: 'edifice', interval: 56 }
      ];
      const isMastered = (w) => typeof w.interval === 'number' && w.interval >= 21;
      const mastered = sampleWords.filter(isMastered).map(w => w.word);
      expect(mastered).toEqual(['apparatus', 'edifice']);
      expect(isMastered({ word: 'abstruse', interval: 14 })).toBe(false);
      expect(isMastered({ word: 'apparatus', interval: 28 })).toBe(true);
    });
  });

  describe('calcCraftLevel Caps and Progression', () => {
    it('assigns Apprentice (Level 1) for XP < 100', () => {
      const res = calcCraftLevel(50, {});
      expect(res.level).toBe(1);
      expect(res.rank).toBe('Apprentice');
      expect(res.isCapped).toBe(false);
    });

    it('caps at Apprentice when XP >= 100 but Tier 2 drills < 3', () => {
      const res = calcCraftLevel(150, { 2: 1 });
      expect(res.level).toBe(1);
      expect(res.isCapped).toBe(true);
      expect(res.nextRequirement).toContain('Need 2 more Polish drills');
    });

    it('unlocks Craftsman (Level 2) when XP >= 100 and Tier 2 drills >= 3', () => {
      const res = calcCraftLevel(150, { 2: 3 });
      expect(res.level).toBe(2);
      expect(res.rank).toBe('Craftsman');
      expect(res.isCapped).toBe(false);
    });

    it('caps at Craftsman when XP >= 300 but Tier 3 drills < 3', () => {
      const res = calcCraftLevel(350, { 2: 3, 3: 1 });
      expect(res.level).toBe(2);
      expect(res.isCapped).toBe(true);
      expect(res.nextRequirement).toContain('Need 2 more Vault Rehab drills');
    });

    it('unlocks Wordsmith (Level 3) when XP >= 300 and Tier 3 drills >= 3', () => {
      const res = calcCraftLevel(350, { 2: 3, 3: 3 });
      expect(res.level).toBe(3);
      expect(res.rank).toBe('Wordsmith');
      expect(res.isCapped).toBe(false);
    });

    it('caps at Wordsmith when XP >= 600 but Tier 4 drills < 3', () => {
      const res = calcCraftLevel(650, { 2: 3, 3: 3, 4: 1 });
      expect(res.level).toBe(3);
      expect(res.isCapped).toBe(true);
      expect(res.nextRequirement).toContain('Need 2 more Creative drills');
    });

    it('unlocks Stylist (Level 4) when XP >= 600 and Tier 4 drills >= 3', () => {
      const res = calcCraftLevel(650, { 2: 3, 3: 3, 4: 3 });
      expect(res.level).toBe(4);
      expect(res.rank).toBe('Stylist');
      expect(res.isCapped).toBe(false);
    });

    it('unlocks Master (Level 5) when XP >= 1000 and Tier 4 drills >= 5', () => {
      const res = calcCraftLevel(1200, { 2: 3, 3: 3, 4: 5 });
      expect(res.level).toBe(5);
      expect(res.rank).toBe('Master');
      expect(res.isCapped).toBe(false);
    });
  });

  describe('Pending Word Expiry (5-day warning, 7-day auto-delete)', () => {
    const now = 1700000000000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    it('keeps word active and not expiring when saved 2 days ago', () => {
      const res = checkPendingExpiry(now - 2 * ONE_DAY, now);
      expect(res.status).toBe('active');
      expect(res.isExpiringSoon).toBe(false);
      expect(res.isDeleted).toBe(false);
    });

    it('marks word as expiring soon when saved 6 days ago', () => {
      const res = checkPendingExpiry(now - 6 * ONE_DAY, now);
      expect(res.status).toBe('active');
      expect(res.isExpiringSoon).toBe(true);
      expect(res.isDeleted).toBe(false);
    });

    it('marks word as expired/deleted when older than 7 days', () => {
      const res = checkPendingExpiry(now - 8 * ONE_DAY, now);
      expect(res.status).toBe('expired');
      expect(res.isDeleted).toBe(true);
    });
  });

  describe('Writing Preflight Checks', () => {
    it('fails if sentence has fewer than 4 words', () => {
      const res = validateWritingDraft('Old bridge safe.', 'bridge');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Write a full sentence, at least 4 words.');
    });

    it('fails if target word is omitted', () => {
      const res = validateWritingDraft('The structure is still safe and reliable.', 'bridge');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Include “bridge”');
    });

    it('fails question step if question mark is missing', () => {
      const res = validateWritingDraft('Why is this old bridge still safe', 'bridge', true);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('question mark');
    });

    it('passes valid question sentence', () => {
      const res = validateWritingDraft('Why is this old bridge still standing today?', 'bridge', true);
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });
  });
});
