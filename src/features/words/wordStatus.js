import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the SRS ladder in db.updateWordSRS (1 → 3 → 7 → 14 → ×2).
// Mastered strictly means interval >= 21, matching DataProvider.masteredWords.
export const STRENGTH_LABELS = ['Not practised yet', 'Weak', 'Getting there', 'Strong', 'Mastered'];

export function getWordStrength(word) {
  if (!word || word.status === 'pending') return 0;
  const interval = typeof word.interval === 'number' ? word.interval : 0;
  if (interval >= 21) return 4;
  if (interval >= 14) return 3;
  if (interval >= 3) return 2;
  return 1;
}

export function isWordDue(word, now = Date.now()) {
  return typeof word?.nextReviewDate === 'number' && word.nextReviewDate > 0 && word.nextReviewDate <= now;
}

// Same wording rules as classic Dictionary's nextReviewLabel.
export function nextReviewLabel(nextReviewDate, now = Date.now()) {
  if (typeof nextReviewDate !== 'number' || nextReviewDate <= 0) return 'Not scheduled';
  const msLeft = nextReviewDate - now;
  if (msLeft <= 0) return 'Due now';
  const hoursLeft = Math.ceil(msLeft / 3600000);
  if (hoursLeft < 24) return `Due in ${hoursLeft}h`;
  const days = Math.round(msLeft / DAY_MS);
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

// Saved (pending) words auto-expire after 7 days (db.listenToPendingWords).
export function savedLabel(word, now = Date.now()) {
  const created = typeof word?.createdAt === 'number' ? word.createdAt : now;
  const remainingDays = Math.ceil(Math.max(0, 7 * DAY_MS - (now - created)) / DAY_MS);
  if (remainingDays <= 2) return `Expires in ${remainingDays}d`;
  const ageDays = Math.floor((now - created) / DAY_MS);
  if (ageDays <= 0) return 'Saved today';
  if (ageDays === 1) return 'Saved yesterday';
  return `Saved ${ageDays}d ago`;
}

// Undo for a removed learned word: writes the doc back exactly as it was,
// keeping interval / nextReviewDate / sentences intact.
export async function restoreLearnedWord(userId, word) {
  // eslint-disable-next-line no-unused-vars
  const { id, expiresInDays, dueLabel, isExpiringSoon, ...data } = word;
  const ref = doc(db, 'users', userId, 'vocabulary', id || data.word.toLowerCase());
  await setDoc(ref, data);
}
