/**
 * Training programs: rule-based selectors over the live exercise pool (no static IDs).
 */
import {
  getPushDayExercises,
  getPullDayExercises,
  getLegDayExercises,
  getCardioCircuit,
  getFullBodyExercises,
  getAbsCoreExercises,
} from '../utils/exerciseMatcher';

export const WORKOUT_PROGRAMS = [
  {
    id: 'push-day',
    title: 'Push Day',
    description: 'Chest, shoulders, and triceps — build pressing strength in one focused session.',
    difficulty: 'Intermediate',
    estimatedMinutes: 45,
    heroTint: '#1E3A5F',
    type: 'push',
    selector: getPushDayExercises,
  },
  {
    id: 'pull-day',
    title: 'Pull Day',
    description: 'Back and biceps — rows, pulls, and curls for a balanced upper pull.',
    difficulty: 'Intermediate',
    estimatedMinutes: 50,
    heroTint: '#1A3D32',
    type: 'pull',
    selector: getPullDayExercises,
  },
  {
    id: 'leg-day',
    title: 'Leg Day',
    description: 'Quads, hamstrings, and glutes — strong legs, strong base.',
    difficulty: 'Advanced',
    estimatedMinutes: 55,
    heroTint: '#3D2A1A',
    type: 'legs',
    selector: getLegDayExercises,
  },
  {
    id: 'fat-burn-circuit',
    title: 'Fat Burn Circuit',
    description: 'High-energy rounds to elevate heart rate and torch calories.',
    difficulty: 'Intermediate',
    estimatedMinutes: 30,
    heroTint: '#4A2A3D',
    type: 'cardio',
    selector: getCardioCircuit,
  },
  {
    id: 'beginner-full-body',
    title: 'Beginner Full Body',
    description: 'Full-body fundamentals — perfect for building consistency.',
    difficulty: 'Beginner',
    estimatedMinutes: 35,
    heroTint: '#2A3D4A',
    type: 'fullBody',
    selector: getFullBodyExercises,
  },
  {
    id: 'abs-core-blast',
    title: 'Abs & Core Blast',
    description: 'Targeted core work for stability and definition.',
    difficulty: 'Beginner',
    estimatedMinutes: 20,
    heroTint: '#2A3540',
    type: 'abs',
    selector: getAbsCoreExercises,
  },
];

export const getProgramById = (id) => WORKOUT_PROGRAMS.find((p) => p.id === id);
