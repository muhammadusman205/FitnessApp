import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'workout_history_v1';

const WorkoutHistoryContext = createContext(null);

export const WorkoutHistoryProvider = ({ children }) => {
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCompletedWorkouts(parsed);
        }
      } catch (e) {
        console.warn('[WorkoutHistory] load failed', e?.message);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addWorkoutSession = useCallback(async (session) => {
    const entry = {
      programType: session.programType,
      difficulty: session.difficulty ?? 'medium',
      exercises: Array.isArray(session.exercises) ? session.exercises : [],
      date: typeof session.date === 'number' ? session.date : Date.now(),
    };
    setCompletedWorkouts((prev) => {
      const next = [entry, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('[WorkoutHistory] persist failed', e?.message)
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      completedWorkouts,
      hydrated,
      addWorkoutSession,
    }),
    [completedWorkouts, hydrated, addWorkoutSession]
  );

  return <WorkoutHistoryContext.Provider value={value}>{children}</WorkoutHistoryContext.Provider>;
};

export const useWorkoutHistory = () => {
  const ctx = useContext(WorkoutHistoryContext);
  if (!ctx) {
    throw new Error('useWorkoutHistory must be used inside WorkoutHistoryProvider');
  }
  return ctx;
};
