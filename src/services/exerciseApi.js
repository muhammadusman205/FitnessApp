import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateFallbackExercises } from '../utils/mockExercises';

const EXERCISE_API_KEY = process.env.EXPO_PUBLIC_EXERCISE_API_KEY;
const EXERCISE_API_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = `https://${EXERCISE_API_HOST}`;

/** AsyncStorage cache for first-page results only */
export const EXERCISES_CACHE_KEY = 'exercises_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Body parts supported by ExerciseDB `/exercises/bodyPart/{bodyPart}` */
export const BODY_PART_FILTERS = [
  'all',
  'back',
  'cardio',
  'chest',
  'lower arms',
  'lower legs',
  'neck',
  'shoulders',
  'upper arms',
  'upper legs',
  'waist',
];

/** @deprecated Use BODY_PART_FILTERS */
export const MUSCLE_GROUPS = BODY_PART_FILTERS;

const getHeaders = () => ({
  'X-RapidAPI-Key': EXERCISE_API_KEY || '',
  'X-RapidAPI-Host': EXERCISE_API_HOST,
});

const normalizeExercise = (raw) => {
  if (!raw) return null;
  const id = raw.id != null ? String(raw.id) : String(Math.random());
  return {
    id,
    name: raw.name || 'Exercise',
    target: (raw.target || '').toLowerCase(),
    bodyPart: (raw.bodyPart || '').toLowerCase(),
    equipment: raw.equipment || '',
    gifUrl: raw.gifUrl || raw.gifurl || '',
    instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
  };
};

const normalizeList = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeExercise).filter(Boolean);
};

/**
 * Paginated global exercise list (does not load 1000 at once).
 * @param {number} page 0-based page index
 * @param {number} limit page size (default 50)
 */
export const fetchExercises = async (page = 0, limit = 50) => {
  const offset = page * limit;
  if (!EXERCISE_API_KEY) {
    const pool = generateFallbackExercises(220);
    return pool.slice(offset, offset + limit);
  }

  try {
    const response = await axios.get(`${BASE_URL}/exercises`, {
      params: { limit, offset },
      headers: getHeaders(),
      timeout: 45000,
    });
    return normalizeList(response.data);
  } catch (error) {
    console.warn('[exerciseApi] fetchExercises failed:', error?.message);
    const pool = generateFallbackExercises(220);
    return pool.slice(offset, offset + limit);
  }
};

export const fetchExercisesByBodyPart = async (bodyPart) => {
  if (!EXERCISE_API_KEY) {
    return generateFallbackExercises(220).filter((e) => (e.bodyPart || '').toLowerCase() === bodyPart.toLowerCase());
  }
  const encoded = encodeURIComponent(bodyPart);
  try {
    const response = await axios.get(`${BASE_URL}/exercises/bodyPart/${encoded}`, {
      headers: getHeaders(),
      timeout: 45000,
    });
    return normalizeList(response.data);
  } catch (error) {
    console.warn('[exerciseApi] fetchExercisesByBodyPart failed:', error?.message);
    return generateFallbackExercises(220).filter((e) => (e.bodyPart || '').toLowerCase().includes(bodyPart.split(' ')[0]));
  }
};

export const fetchExercisesByTarget = async (targetMuscle) => {
  if (!EXERCISE_API_KEY) {
    return generateFallbackExercises(220).filter((e) =>
      (e.target || '').toLowerCase().includes(targetMuscle.toLowerCase().slice(0, 5))
    );
  }
  const encoded = encodeURIComponent(targetMuscle);
  try {
    const response = await axios.get(`${BASE_URL}/exercises/target/${encoded}`, {
      headers: getHeaders(),
      timeout: 45000,
    });
    return normalizeList(response.data);
  } catch (error) {
    console.warn('[exerciseApi] fetchExercisesByTarget failed:', error?.message);
    return generateFallbackExercises(220);
  }
};

export const getCachedExercises = async () => {
  try {
    const raw = await AsyncStorage.getItem(EXERCISES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { storedAt, items } = parsed;
    if (!storedAt || !Array.isArray(items)) return null;
    if (Date.now() - storedAt > CACHE_TTL_MS) return null;
    return { items: normalizeList(items), storedAt };
  } catch {
    return null;
  }
};

export const setCachedExercises = async (items) => {
  try {
    const payload = JSON.stringify({
      storedAt: Date.now(),
      items: Array.isArray(items) ? items : [],
    });
    await AsyncStorage.setItem(EXERCISES_CACHE_KEY, payload);
  } catch (e) {
    console.warn('[exerciseApi] setCachedExercises failed:', e?.message);
  }
};

/** @deprecated Use fetchExercises(0, limit) + cache helpers */
export const fetchExercisesFromApi = async () => {
  const cached = await getCachedExercises();
  if (cached?.items?.length) return cached.items;
  const data = await fetchExercises(0, 50);
  if (data.length && EXERCISE_API_KEY) {
    await setCachedExercises(data);
  }
  return data;
};
