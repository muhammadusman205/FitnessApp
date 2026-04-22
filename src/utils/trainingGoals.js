/**
 * Forward-looking training intent — shapes scoring and final session structure.
 */

const norm = (s) => (s || '').toLowerCase().trim();

export const TRAINING_GOALS = {
  strength: {
    priority: ['compound', 'barbell', 'heavy'],
    intensityBias: 1.2,
  },
  hypertrophy: {
    priority: ['moderate volume', 'target isolation'],
    intensityBias: 1.0,
  },
  fat_loss: {
    priority: ['cardio', 'superset', 'full body'],
    intensityBias: 0.9,
  },
};

/**
 * Maps profile goal strings (e.g. from FitnessContext) to engine keys.
 */
export function normalizeTrainingGoal(userGoal) {
  const g = (userGoal || '').toLowerCase();
  if (!g.trim()) return 'hypertrophy';
  if (g.includes('weight loss') || (g.includes('weight') && g.includes('loss'))) return 'fat_loss';
  if (g.includes('fat') && (g.includes('loss') || g.includes('burn'))) return 'fat_loss';
  if (g.includes('strength') || g.includes('powerlift') || g.includes('strong')) return 'strength';
  if (g.includes('muscle') || g.includes('hypertrophy')) return 'hypertrophy';
  return 'hypertrophy';
}

/**
 * Additive score boost for goal alignment (used inside adjustExerciseIntensity).
 */
export function goalPriorityBoost(exercise, goalKey) {
  const g = normalizeTrainingGoal(goalKey);
  const name = norm(exercise?.name);
  const eq = norm(exercise?.equipment);
  const bp = norm(exercise?.bodyPart);
  const tg = norm(exercise?.target);

  if (g === 'strength') {
    let boost = 0;
    if (eq.includes('barbell') || eq.includes('olympic') || eq.includes('trap')) boost += 0.2;
    if (eq.includes('smith')) boost += 0.08;
    if (
      name.includes('squat') ||
      name.includes('deadlift') ||
      name.includes('bench') ||
      name.includes('press') ||
      name.includes('row')
    ) {
      boost += 0.14;
    }
    if (name.includes('curl') || name.includes('fly') || name.includes('raise')) boost -= 0.06;
    return boost;
  }

  if (g === 'fat_loss') {
    let boost = 0;
    if (bp === 'cardio' || tg.includes('cardio') || tg.includes('cardiovascular')) boost += 0.24;
    if (name.includes('jump') || name.includes('burpee') || name.includes('mountain') || name.includes('run')) boost += 0.12;
    if (bp === 'waist' || bp === 'upper legs') boost += 0.06;
    if (eq === 'body weight' && (bp === 'cardio' || name.includes('jump'))) boost += 0.08;
    return boost;
  }

  let boost = 0;
  if (eq.includes('dumbbell') || eq.includes('cable') || eq.includes('leverage')) boost += 0.1;
  if (name.includes('curl') || name.includes('fly') || name.includes('extension') || name.includes('raise')) boost += 0.09;
  if (tg.includes('delts') || tg.includes('biceps') || tg.includes('triceps')) boost += 0.05;
  return boost;
}

/**
 * Drop only extreme-fatigue targets from pool when enough alternatives remain.
 */
export function filterPoolExtremeFatigue(pool, fatigueMap, minKeep = 8) {
  if (!Array.isArray(pool) || !pool.length || !fatigueMap) return pool;
  const threshold = 0.92;
  const filtered = pool.filter((ex) => (fatigueMap[norm(ex.target) || 'general'] ?? 0) < threshold);
  return filtered.length >= minKeep ? filtered : pool;
}

/**
 * Final session shape: length + fat_loss cardio mix. fullPool = global exercise list for cardio pulls.
 */
export function shapeWorkoutByGoal(lineup, goal, fatigueMap, fullPool = []) {
  const g = normalizeTrainingGoal(goal);
  if (!Array.isArray(lineup) || !lineup.length) return lineup;

  const uniq = (arr) => {
    const seen = new Set();
    return arr.filter((x) => {
      const id = String(x?.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  let out = uniq([...lineup]);
  const fm = fatigueMap || {};
  const pool = Array.isArray(fullPool) ? fullPool : [];

  if (g === 'strength') {
    const cap = 6 + Math.floor(Math.random() * 5);
    out = out.slice(0, Math.min(cap, out.length));
  } else if (g === 'fat_loss') {
    const cap = 10 + Math.floor(Math.random() * 7);
    let cardioCount = out.filter((ex) => norm(ex.bodyPart) === 'cardio').length;
    const cardioAdds = pool.filter((ex) => {
      const b = norm(ex.bodyPart);
      const t = norm(ex.target);
      return b === 'cardio' || t.includes('cardio') || t.includes('cardiovascular');
    });
    for (const c of cardioAdds) {
      if (out.length >= cap) break;
      if (cardioCount >= 3) break;
      if (out.some((o) => String(o.id) === String(c.id))) continue;
      const fk = norm(c.target) || 'general';
      if ((fm[fk] ?? 0) > 0.88) continue;
      out.push(c);
      cardioCount++;
    }
    out = out.slice(0, Math.min(cap, out.length));
  } else {
    const cap = 8 + Math.floor(Math.random() * 7);
    out = out.slice(0, Math.min(cap, out.length));
  }

  return uniq(out);
}
