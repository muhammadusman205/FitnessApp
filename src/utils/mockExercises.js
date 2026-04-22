/**
 * Offline fallback when RapidAPI is unavailable or key is missing.
 * Generates 200+ exercises dynamically (no static tiny list).
 */
const BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'cardio', 'waist'];
const TARGETS = ['pectorals', 'lats', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'abs', 'calves', 'delts'];
const EQUIPMENT = ['body weight', 'dumbbell', 'barbell', 'cable', 'machine'];

const PLACEHOLDER_GIF =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80';

export function generateFallbackExercises(count = 220) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `offline-${n}`,
      name: `Movement ${n}`,
      target: TARGETS[i % TARGETS.length],
      bodyPart: BODY_PARTS[i % BODY_PARTS.length],
      equipment: EQUIPMENT[i % EQUIPMENT.length],
      gifUrl: PLACEHOLDER_GIF,
      instructions: ['Maintain control.', 'Breathe steadily.', 'Stop if you feel pain.'],
    };
  });
}

/** @deprecated Use generateFallbackExercises; kept for any legacy import */
export const mockExercises = generateFallbackExercises(220);
