/**
 * Heuristic difficulty tier for exercise selection (not shown in UI).
 */

const norm = (s) => (s || '').toLowerCase().trim();

const ADVANCED_EQUIP = ['barbell', 'olympic barbell', 'smith machine', 'leverage machine', 'trap bar', 'sled machine'];
const BEGINNER_EQUIP = ['body weight', 'assisted', 'band'];

const ADVANCED_NAME = [
  'deadlift',
  'clean',
  'snatch',
  'muscle-up',
  'muscle up',
  'plyometric',
  'burpee',
  'olympic',
  'power clean',
  'front squat',
  'overhead squat',
];

const BEGINNER_NAME = [
  'push-up',
  'push up',
  'knee push',
  'wall ',
  'assisted',
  'beginner',
  'modified',
  'march',
  'step-up',
  'step up',
  'bodyweight squat',
  'air squat',
];

/**
 * @returns {'beginner' | 'intermediate' | 'advanced'}
 */
export function getExerciseDifficulty(exercise) {
  if (!exercise) return 'intermediate';

  const name = norm(exercise.name);
  const eq = norm(exercise.equipment);
  const bp = norm(exercise.bodyPart);
  const tg = norm(exercise.target);

  for (const b of BEGINNER_NAME) {
    if (name.includes(b)) return 'beginner';
  }
  for (const a of ADVANCED_NAME) {
    if (name.includes(a)) return 'advanced';
  }

  for (const e of BEGINNER_EQUIP) {
    if (eq === e || eq.includes(e)) {
      if (!ADVANCED_NAME.some((a) => name.includes(a))) return 'beginner';
    }
  }

  for (const e of ADVANCED_EQUIP) {
    if (eq.includes(e) || eq === norm(e)) return 'advanced';
  }

  if (eq.includes('cable') && (name.includes('fly') || name.includes('cross'))) return 'intermediate';
  if (eq.includes('dumbbell') && (name.includes('press') || name.includes('row'))) return 'intermediate';

  if (bp === 'cardio' && name.includes('hiit')) return 'advanced';

  if (tg.includes('rotator') || name.includes('face pull')) return 'intermediate';

  if (eq === 'body weight' || eq === '') return 'beginner';

  return 'intermediate';
}
