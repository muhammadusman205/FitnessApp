/**
 * Offline fallback when RapidAPI is unavailable or key is missing.
 * Generates 200+ exercises dynamically (no static tiny list).
 */
const BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'cardio', 'waist'];
const TARGETS = ['pectorals', 'lats', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'abs', 'calves', 'delts'];
const EQUIPMENT = ['body weight', 'dumbbell', 'barbell', 'cable', 'machine'];

const PLACEHOLDER_GIF =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80';

const TARGET_NAME_MAP = {
  pectorals: 'Chest',
  lats: 'Lat',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  abs: 'Core',
  calves: 'Calves',
  delts: 'Shoulders',
};

const BODY_PART_MOVE_MAP = {
  chest: ['Press', 'Fly', 'Push-Up'],
  back: ['Row', 'Pulldown', 'Pull'],
  shoulders: ['Press', 'Raise', 'Shoulder Press'],
  'upper arms': ['Curl', 'Extension', 'Hammer Curl'],
  'lower arms': ['Wrist Curl', 'Grip Raise', 'Reverse Curl'],
  'upper legs': ['Squat', 'Lunge', 'Split Squat'],
  'lower legs': ['Calf Raise', 'Seated Raise', 'Leg Press Calf'],
  cardio: ['Sprint Drill', 'Jump Circuit', 'HIIT Burst'],
  waist: ['Crunch', 'Plank', 'Twist'],
};

export function generateExerciseName(bodyPart, target, equipment, index = 0) {
  const targetLabel = TARGET_NAME_MAP[target] || (target || 'Full Body');
  const equipmentLabel = equipment === 'body weight' ? 'Bodyweight' : equipment.charAt(0).toUpperCase() + equipment.slice(1);
  const moves = BODY_PART_MOVE_MAP[bodyPart] || ['Drill', 'Exercise', 'Movement'];
  const move = moves[index % moves.length];
  if (equipment === 'body weight' && bodyPart === 'upper legs' && (move === 'Squat' || move === 'Lunge')) {
    return `Bodyweight ${move}`;
  }
  return `${equipmentLabel} ${targetLabel} ${move}`;
}

export function generateFallbackExercises(count = 220) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const bodyPart = BODY_PARTS[i % BODY_PARTS.length];
    const target = TARGETS[i % TARGETS.length];
    const equipment = EQUIPMENT[i % EQUIPMENT.length];
    return {
      id: `offline-${n}`,
      name: generateExerciseName(bodyPart, target, equipment, i),
      target,
      bodyPart,
      equipment,
      gifUrl: PLACEHOLDER_GIF,
      instructions: ['Maintain control.', 'Breathe steadily.', 'Stop if you feel pain.'],
    };
  });
}

/** @deprecated Use generateFallbackExercises; kept for any legacy import */
export const mockExercises = generateFallbackExercises(220);
