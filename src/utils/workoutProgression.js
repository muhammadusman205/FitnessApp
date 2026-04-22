/**
 * Stateful adaptation over workout history — selection weighting and progression tier.
 * Does not persist; WorkoutHistoryContext owns storage.
 */
import { computeMuscleFatigue } from './muscleFatigue';
import { getExerciseDifficulty } from './exerciseDifficulty';
import { TRAINING_GOALS, goalPriorityBoost, normalizeTrainingGoal } from './trainingGoals';

const norm = (s) => (s || '').toLowerCase().trim();

const WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

/**
 * Frequency map of target muscles from recent completed sessions.
 */
export function computeMuscleLoadFromSessions(completedWorkouts) {
  const counts = {};
  if (!Array.isArray(completedWorkouts)) return counts;
  const now = Date.now();
  for (const session of completedWorkouts) {
    const t = session?.date;
    if (typeof t !== 'number' || now - t > WINDOW_MS) continue;
    for (const ex of session.exercises || []) {
      const k = norm(ex.target) || 'general';
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return counts;
}

export function getCompletionsForProgramType(completedWorkouts, programType) {
  if (!Array.isArray(completedWorkouts) || !programType) return 0;
  return completedWorkouts.filter((s) => s.programType === programType).length;
}

/**
 * Snapshot passed into exerciseMatcher / adjustExerciseIntensity.
 * goal: normalized training key (strength | hypertrophy | fat_loss) from profile goal string.
 */
export function buildHistorySnapshot(completedWorkouts, programType, userGoal) {
  const muscleLoad = computeMuscleLoadFromSessions(completedWorkouts);
  const fatigueMap = computeMuscleFatigue(completedWorkouts);
  const isBeginner = !completedWorkouts?.length;
  const completionsForType = getCompletionsForProgramType(completedWorkouts, programType);
  const goal = normalizeTrainingGoal(userGoal);
  return { muscleLoad, fatigueMap, isBeginner, completionsForType, goal };
}

/**
 * score =
 *   (targetAvailabilityBoost)
 *   - (muscleLoadWeight)
 *   - (fatiguePenalty * fatigueMap[target])
 *   + goalPriorityBoost(exercise, goal) * intensityBias
 * Recovery override: extra penalty when fatigue > 0.75 so that muscle does not dominate.
 * Beginner (no history) → sort by goal alignment only.
 */
export function adjustExerciseIntensity(exercises, history = {}) {
  const { muscleLoad = {}, fatigueMap = {}, isBeginner = true, goal: goalRaw } = history;
  const trainGoal = goalRaw || 'hypertrophy';
  const cfg = TRAINING_GOALS[trainGoal] || TRAINING_GOALS.hypertrophy;
  const intensityBias = cfg.intensityBias ?? 1;

  if (!Array.isArray(exercises) || !exercises.length) return [];

  const fatiguePenalty = 0.42;
  const freqWeight = 0.1;

  if (isBeginner) {
    return [...exercises].sort((a, b) => {
      const sa = goalPriorityBoost(a, trainGoal) * intensityBias + Math.random() * 0.02;
      const sb = goalPriorityBoost(b, trainGoal) * intensityBias + Math.random() * 0.02;
      return sb - sa;
    });
  }

  const score = (ex) => {
    const k = norm(ex.target) || 'general';
    const f = muscleLoad[k] || 0;
    const F = fatigueMap[k] ?? 0;

    const targetAvailabilityBoost = 1.0 + (f === 0 ? 0.18 : 0);
    const muscleLoadWeight = freqWeight * Math.min(f, 10);
    const fatigueTerm = fatiguePenalty * Math.min(F, 1);

    let s = targetAvailabilityBoost - muscleLoadWeight - fatigueTerm;

    if (F > 0.75) {
      s -= 0.55;
    }

    s += goalPriorityBoost(ex, trainGoal) * intensityBias;

    return s + Math.random() * 0.04;
  };

  return [...exercises].sort((a, b) => score(b) - score(a));
}

/**
 * When global fatigue is high, replace up to two advanced moves with easier tiers for the same target when possible.
 */
export function downgradeAdvancedForFatigue(lineup, pool, fatigueMap, threshold = 0.45) {
  if (!Array.isArray(lineup) || !lineup.length || !Array.isArray(pool) || !pool.length) return lineup;
  const out = [...lineup];
  let swaps = 0;
  const used = new Set(out.map((e) => String(e.id)));

  for (let i = 0; i < out.length && swaps < 2; i++) {
    const ex = out[i];
    const k = norm(ex.target) || 'general';
    const F = fatigueMap[k] ?? 0;
    if (getExerciseDifficulty(ex) !== 'advanced') continue;
    if (F <= threshold) continue;

    const alt =
      pool.find(
        (p) =>
          !used.has(String(p.id)) &&
          norm(p.target) === k &&
          getExerciseDifficulty(p) === 'intermediate'
      ) ||
      pool.find((p) => !used.has(String(p.id)) && getExerciseDifficulty(p) === 'intermediate') ||
      pool.find((p) => !used.has(String(p.id)) && getExerciseDifficulty(p) === 'beginner');

    if (alt) {
      used.delete(String(out[i].id));
      out[i] = alt;
      used.add(String(alt.id));
      swaps += 1;
    }
  }
  return out;
}

/**
 * Replace up to two moves with alternatives that favor underused targets (coach-like variety).
 */
export function applyProgressionSwaps(lineup, pool, muscleLoad) {
  if (!Array.isArray(lineup) || !lineup.length || !Array.isArray(pool) || !pool.length) return lineup;
  const ml = muscleLoad || {};
  const out = [...lineup];
  const usedIds = new Set(out.map((e) => String(e.id)));
  let swaps = 0;
  const maxSwaps = 2;
  for (let attempt = 0; attempt < out.length && swaps < maxSwaps; attempt++) {
    const candidates = pool.filter((p) => {
      if (usedIds.has(String(p.id))) return false;
      const k = norm(p.target) || 'general';
      return (ml[k] || 0) < 2;
    });
    if (!candidates.length) break;
    const idx = Math.floor(Math.random() * out.length);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.delete(String(out[idx].id));
    out[idx] = pick;
    usedIds.add(String(pick.id));
    swaps += 1;
  }
  return out;
}
