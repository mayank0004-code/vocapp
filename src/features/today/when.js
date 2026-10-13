const DAY_MS = 24 * 60 * 60 * 1000;

/** Millis from a number, Firestore Timestamp, Date or date string; NaN if unknown. */
export function toMillis(value) {
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  return value ? new Date(value).getTime() : NaN;
}

/** Calendar-day age label: 'today', 'yesterday', '3d ago', or '12 Oct'. '' if unknown. */
export function formatWhen(value) {
  const ms = toMillis(value);
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (ms >= startOfToday.getTime()) return 'today';
  const days = Math.ceil((startOfToday.getTime() - ms) / DAY_MS);
  if (days <= 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** 'expires today' / 'expires in 1 day' / 'expires in 2 days'. */
export function expiryPhrase(days) {
  if (typeof days !== 'number' || days <= 0) return 'expires today';
  return `expires in ${days} ${days === 1 ? 'day' : 'days'}`;
}
