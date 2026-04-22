/**
 * Per-target fatigue from completed sessions within a rolling window.
 * Recent work contributes more; older work decays exponentially.
 */

const norm = (s) => (s || '').toLowerCase().trim();

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 21;
/** Controls how fast past sessions fade (higher = faster decay with age). */
const AGE_DECAY_K = 0.11;
/** Contribution per exercise hit before normalization. */
const HIT_WEIGHT = 0.14;

/**
 * @returns {Record<string, number>} target muscle key → fatigue in [0, 1]
 */
export function computeMuscleFatigue(completedWorkouts) {
  const raw = {};
  if (!Array.isArray(completedWorkouts) || !completedWorkouts.length) return {};

  const now = Date.now();

  for (const session of completedWorkouts) {
    const d = session?.date;
    if (typeof d !== 'number') continue;
    const ageDays = (now - d) / DAY_MS;
    if (ageDays < 0 || ageDays > WINDOW_DAYS) continue;

    const ageWeight = Math.exp(-AGE_DECAY_K * ageDays);

    for (const ex of session.exercises || []) {
      const k = norm(ex.target) || 'general';
      raw[k] = (raw[k] || 0) + ageWeight * HIT_WEIGHT;
    }
  }

  const keys = Object.keys(raw);
  if (!keys.length) return {};

  const maxRaw = Math.max(...keys.map((k) => raw[k]), 1e-6);
  const out = {};
  for (const k of keys) {
    out[k] = Math.min(1, raw[k] / (maxRaw * 0.65 + 0.35));
  }
  return out;
}
