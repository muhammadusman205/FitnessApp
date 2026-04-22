/**
 * Rule-based exercise selection from a real API pool (ExerciseDB-normalized shape).
 * bodyPart, target, equipment drive matching — no static program IDs.
 */
import { adjustExerciseIntensity, applyProgressionSwaps, downgradeAdvancedForFatigue } from './workoutProgression';
import { getExerciseDifficulty } from './exerciseDifficulty';
import { filterPoolExtremeFatigue, shapeWorkoutByGoal } from './trainingGoals';

const norm = (s) => (s || '').toLowerCase().trim();

function filterBeginnerPool(pool) {
  const filtered = pool.filter((ex) => getExerciseDifficulty(ex) !== 'advanced');
  return filtered.length ? filtered : pool;
}

function meanFatigue(fatigueMap) {
  const vals = Object.values(fatigueMap || {});
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function maxFatigue(fatigueMap) {
  const vals = Object.values(fatigueMap || {});
  return vals.length ? Math.max(...vals) : 0;
}

const hasTarget = (ex, ...keywords) => {
  const t = norm(ex.target);
  return keywords.some((k) => t.includes(k));
};

const hasBodyPart = (ex, ...parts) => {
  const b = norm(ex.bodyPart);
  return parts.some((p) => b === p || b.includes(p));
};

/** Prefer variety before caps — shuffle then round-robin by target key. */
export function diversifyByTarget(exercises, maxTotal = 32) {
  if (!Array.isArray(exercises) || !exercises.length) return [];
  const pool = shuffleInPlace([...exercises]);
  const buckets = new Map();
  for (const ex of pool) {
    const key = norm(ex.target) || 'general';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(ex);
  }
  const keys = shuffleInPlace([...buckets.keys()]);
  const out = [];
  let round = 0;
  while (out.length < maxTotal) {
    let added = false;
    for (const key of keys) {
      const list = buckets.get(key);
      if (list && list[round]) {
        out.push(list[round]);
        added = true;
        if (out.length >= maxTotal) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return out.length ? out : pool.slice(0, maxTotal);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffle roughly 10–20% of positions (pair swaps) for variety between loads.
 */
function partialShuffle(arr) {
  const a = [...arr];
  const n = a.length;
  if (n < 2) return a;
  const pct = 0.1 + Math.random() * 0.1;
  const swaps = Math.max(1, Math.floor(n * pct));
  for (let i = 0; i < swaps; i++) {
    const i1 = Math.floor(Math.random() * n);
    const i2 = Math.floor(Math.random() * n);
    [a[i1], a[i2]] = [a[i2], a[i1]];
  }
  return a;
}

/**
 * Cap duplicates per muscle (target); total length between 8–14 (or 10–16 when progressed).
 * When ease (high fatigue): shorter session. fatigueMap: cap repeats for very fatigued targets (recovery priority).
 */
export function applyWorkoutVariation(exercises, options = {}) {
  if (!Array.isArray(exercises) || !exercises.length) return [];

  const progressed = Boolean(options.progressed);
  const ease = Boolean(options.ease);
  const fatigueMap = options.fatigueMap || {};

  let minLen = progressed ? 10 : 8;
  let maxLen = progressed ? 16 : 14;
  let baseMaxPerTarget = progressed ? 3 : 2;

  if (ease) {
    minLen = 7;
    maxLen = 11;
    baseMaxPerTarget = 2;
  }

  const seen = new Set();
  const unique = exercises.filter((e) => {
    if (!e || e.id == null) return false;
    const id = String(e.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const counts = {};
  const primary = [];
  const overflow = [];

  for (const ex of unique) {
    const k = norm(ex.target) || 'general';
    const fFat = fatigueMap[k] ?? 0;
    let maxForTarget = baseMaxPerTarget;
    if (fFat > 0.75) {
      maxForTarget = Math.min(maxForTarget, 1);
    }
    counts[k] = (counts[k] || 0) + 1;
    if (counts[k] <= maxForTarget) primary.push(ex);
    else overflow.push(ex);
  }

  let working = [...primary];
  while (working.length < minLen && overflow.length) {
    working.push(overflow.shift());
  }

  working = partialShuffle(working);

  const span = maxLen - minLen + 1;
  const targetLen = minLen + Math.floor(Math.random() * span);
  const cap = Math.min(maxLen, Math.max(minLen, Math.min(targetLen, working.length)));
  return working.slice(0, cap);
}

export function getPushDayExercises(exercises) {
  const filtered = (exercises || []).filter((ex) => {
    if (hasBodyPart(ex, 'chest')) return true;
    if (hasBodyPart(ex, 'shoulders')) return true;
    if (hasBodyPart(ex, 'upper arms') && hasTarget(ex, 'tricep')) return true;
    return false;
  });
  return diversifyByTarget(filtered, 28);
}

export function getPullDayExercises(exercises) {
  const filtered = (exercises || []).filter((ex) => {
    if (hasBodyPart(ex, 'back')) return true;
    if (hasBodyPart(ex, 'upper arms') && hasTarget(ex, 'bicep')) return true;
    if (hasBodyPart(ex, 'lower arms')) return true;
    return false;
  });
  return diversifyByTarget(filtered, 28);
}

export function getLegDayExercises(exercises) {
  const filtered = (exercises || []).filter((ex) => {
    if (hasBodyPart(ex, 'upper legs', 'lower legs')) return true;
    if (hasTarget(ex, 'quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors')) return true;
    return false;
  });
  return diversifyByTarget(filtered, 28);
}

export function getCardioCircuit(exercises) {
  const filtered = (exercises || []).filter((ex) => {
    if (hasBodyPart(ex, 'cardio')) return true;
    if (hasTarget(ex, 'cardiovascular', 'cardio')) return true;
    const name = norm(ex.name);
    if (name.includes('jump') || name.includes('burpee') || name.includes('run') || name.includes('mountain')) return true;
    return false;
  });
  const pool = filtered.length ? filtered : (exercises || []).filter((ex) => hasBodyPart(ex, 'waist', 'upper legs'));
  return diversifyByTarget(pool, 28);
}

export function getFullBodyExercises(exercises) {
  const list = exercises || [];
  const buckets = {
    chest: list.filter((ex) => hasBodyPart(ex, 'chest')),
    back: list.filter((ex) => hasBodyPart(ex, 'back')),
    legs: list.filter((ex) => hasBodyPart(ex, 'upper legs', 'lower legs')),
    shoulders: list.filter((ex) => hasBodyPart(ex, 'shoulders')),
    core: list.filter((ex) => hasBodyPart(ex, 'waist')),
    arms: list.filter((ex) => hasBodyPart(ex, 'upper arms', 'lower arms')),
  };
  const picked = [];
  const order = ['chest', 'back', 'legs', 'shoulders', 'core', 'arms'];
  for (const key of order) {
    const sub = buckets[key];
    if (sub.length) picked.push(sub[Math.floor(Math.random() * sub.length)]);
  }
  const rest = list.filter((ex) => !picked.some((p) => p.id === ex.id));
  return diversifyByTarget([...picked, ...rest], 32);
}

export function getAbsCoreExercises(exercises) {
  const filtered = (exercises || []).filter((ex) => {
    if (hasBodyPart(ex, 'waist')) return true;
    if (hasTarget(ex, 'abs', 'obliques', 'core')) return true;
    return false;
  });
  const pool = filtered.length ? filtered : (exercises || []).filter((ex) => hasBodyPart(ex, 'waist', 'upper legs'));
  return diversifyByTarget(pool, 24);
}

/**
 * Pipeline: pool → fatigue filter → difficulty filter → goal-weighted scoring → variation → swaps / fatigue downgrade → goal shaping.
 * @param {object|null} historySnapshot - from buildHistorySnapshot (optional; stateless if omitted)
 */
export function getExercisesForProgram(program, exercises, historySnapshot = null) {
  if (!program || !Array.isArray(exercises)) return [];

  const run = (selectorFn) => {
    if (typeof selectorFn !== 'function') return [];
    return selectorFn(exercises);
  };

  let pool = run(program.selector);
  if (!pool.length) {
    pool = getFullBodyExercises(exercises);
  }
  if (!pool.length) {
    pool = exercises.slice(0, 24);
  }

  const history = {
    isBeginner: true,
    muscleLoad: {},
    fatigueMap: {},
    completionsForType: 0,
    goal: 'hypertrophy',
    ...(historySnapshot || {}),
  };
  if (!history.goal) history.goal = 'hypertrophy';

  pool = filterPoolExtremeFatigue(pool, history.fatigueMap);

  if (history.isBeginner) {
    pool = filterBeginnerPool(pool);
  }

  pool = adjustExerciseIntensity(pool, history);

  const meanF = meanFatigue(history.fatigueMap);
  const maxF = maxFatigue(history.fatigueMap);
  const highFatigue = meanF > 0.35 || maxF > 0.55;

  const progressed = history.completionsForType >= 3 && !highFatigue;

  let result = applyWorkoutVariation(pool, {
    progressed,
    ease: highFatigue,
    fatigueMap: history.fatigueMap,
  });

  if (progressed && result.length && !highFatigue) {
    result = applyProgressionSwaps(result, pool, history.muscleLoad);
  }

  if (highFatigue && result.length) {
    result = downgradeAdvancedForFatigue(result, pool, history.fatigueMap, 0.45);
  }

  if (!result.length && exercises.length) {
    result = applyWorkoutVariation(diversifyByTarget(exercises, 24), {
      progressed,
      ease: highFatigue,
      fatigueMap: history.fatigueMap,
    });
  }

  if (result.length) {
    result = shapeWorkoutByGoal(result, history.goal, history.fatigueMap, exercises);
  }

  return result;
}
