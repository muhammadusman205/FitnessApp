import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  fetchExercises,
  fetchExercisesByBodyPart,
  getCachedExercises,
  setCachedExercises,
} from '../services/exerciseApi';
import { db } from '../services/firebase';

const FitnessContext = createContext(null);

const PAGE_SIZE = 50;
const PLAN_KIND = 'plan';
const SESSION_KIND = 'session';

export const FitnessProvider = ({ children }) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);
  const [bodyPartFilter, setBodyPartFilter] = useState('all');
  const nextPageRef = useRef(0);
  const loadMoreLockRef = useRef(false);
  const tempIdRef = useRef(0);

  const [favorites, setFavorites] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [progress, setProgress] = useState([]);
  const [goal, setGoal] = useState('general fitness');
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [userDataError, setUserDataError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const createTempId = useCallback((prefix) => {
    tempIdRef.current += 1;
    return `temp-${prefix}-${Date.now()}-${tempIdRef.current}`;
  }, []);

  const loadInitialExercises = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingExercises(true);
    setHasMore(true);
    setExercisesError(null);
    nextPageRef.current = 0;
    loadMoreLockRef.current = false;

    try {
      if (bodyPartFilter !== 'all') {
        const list = await fetchExercisesByBodyPart(bodyPartFilter);
        if (!mountedRef.current) return;
        setExercises(list);
        setHasMore(false);
        setExercisesError(null);
        return;
      }

      const cached = await getCachedExercises();
      if (cached?.items?.length) {
        if (!mountedRef.current) return;
        setExercises(cached.items);
        nextPageRef.current = 1;
        setHasMore(cached.items.length >= PAGE_SIZE);
        setExercisesError(null);
        return;
      }

      const firstPage = await fetchExercises(0, PAGE_SIZE);
      if (firstPage.length) {
        await setCachedExercises(firstPage);
      }
      if (!mountedRef.current) return;
      setExercises(firstPage);
      nextPageRef.current = 1;
      setHasMore(firstPage.length >= PAGE_SIZE);
      setExercisesError(null);
    } catch (error) {
      console.warn('[FitnessContext] Failed to load exercises:', error?.message);
      if (!mountedRef.current) return;
      setExercises([]);
      setHasMore(false);
      setExercisesError('Could not load exercises right now. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoadingExercises(false);
      }
    }
  }, [bodyPartFilter]);

  useEffect(() => {
    loadInitialExercises();
  }, [loadInitialExercises]);

  const loadMoreExercises = useCallback(async () => {
    if (bodyPartFilter !== 'all') return;
    if (!hasMore || isLoadingMore || loadingExercises) return;
    if (loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = nextPageRef.current;
      const next = await fetchExercises(page, PAGE_SIZE);
      if (!next.length) {
        setHasMore(false);
        return;
      }
      setExercises((prev) => {
        const seen = new Set(prev.map((x) => String(x.id)));
        const merged = [...prev];
        for (const item of next) {
          const sid = String(item.id);
          if (!seen.has(sid)) {
            seen.add(sid);
            merged.push(item);
          }
        }
        return merged;
      });
      nextPageRef.current = page + 1;
      if (next.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } finally {
      setIsLoadingMore(false);
      loadMoreLockRef.current = false;
    }
  }, [bodyPartFilter, hasMore, isLoadingMore, loadingExercises]);

  const loadUserData = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingUserData(true);
    setUserDataError(null);
    try {
      if (!user) {
        if (!mountedRef.current) return;
        setFavorites([]);
        setWorkouts([]);
        setProgress([]);
        setGoal('general fitness');
        setUserDataError(null);
        return;
      }

      const [favoritesSnap, workoutsSnap, progressSnap, profileSnap] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'favorites')),
        getDocs(collection(db, 'users', user.uid, 'workouts')),
        getDocs(collection(db, 'users', user.uid, 'progress')),
        getDoc(doc(db, 'users', user.uid)),
      ]);

      if (!mountedRef.current) return;
      setFavorites(favoritesSnap.docs.map((item) => ({ docId: item.id, ...item.data() })));
      setWorkouts(
        workoutsSnap.docs.map((item) => {
          const data = item.data();
          return {
            docId: item.id,
            ...data,
            kind: data.kind || PLAN_KIND,
          };
        })
      );
      setProgress(progressSnap.docs.map((item) => ({ docId: item.id, ...item.data() })));
      setGoal(profileSnap.exists() ? profileSnap.data().goal || 'general fitness' : 'general fitness');
      setUserDataError(null);
    } catch (error) {
      console.warn('[FitnessContext] Failed to load user data:', error?.message);
      if (!mountedRef.current) return;
      setFavorites([]);
      setWorkouts([]);
      setProgress([]);
      setUserDataError('Could not sync your account data. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoadingUserData(false);
      }
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const addFavorite = useCallback(
    async (exercise) => {
      if (!user) return;
      const tempDocId = createTempId('favorite');
      const optimistic = {
        docId: tempDocId,
        id: exercise.id,
        name: exercise.name,
        target: exercise.target,
        gifUrl: exercise.gifUrl,
        bodyPart: exercise.bodyPart || '',
        equipment: exercise.equipment || '',
        createdAt: Date.now(),
      };

      setFavorites((prev) => [optimistic, ...prev.filter((item) => item.id !== exercise.id)]);
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'favorites'), {
          id: exercise.id,
          name: exercise.name,
          target: exercise.target,
          gifUrl: exercise.gifUrl,
          bodyPart: exercise.bodyPart || '',
          equipment: exercise.equipment || '',
          createdAt: serverTimestamp(),
        });
        setFavorites((prev) =>
          prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id, pending: false } : item))
        );
      } catch (error) {
        setFavorites((prev) => prev.filter((item) => item.docId !== tempDocId));
        await loadUserData();
        throw error;
      }
    },
    [createTempId, loadUserData, user]
  );

  const removeFavorite = useCallback(
    async (favoriteItem) => {
      if (!user) return;
      const backup = favoriteItem;
      setFavorites((prev) => prev.filter((item) => item.id !== favoriteItem.id));
      try {
        if (favoriteItem.docId && !favoriteItem.docId.startsWith('temp-')) {
          await deleteDoc(doc(db, 'users', user.uid, 'favorites', favoriteItem.docId));
        }
      } catch (error) {
        setFavorites((prev) => [backup, ...prev]);
        await loadUserData();
        throw error;
      }
    },
    [loadUserData, user]
  );

  const toggleFavorite = useCallback(
    async (exercise) => {
      const existing = favorites.find((item) => item.id === exercise.id);
      if (existing) {
        await removeFavorite(existing);
      } else {
        await addFavorite(exercise);
      }
    },
    [addFavorite, favorites, removeFavorite]
  );

  const addWorkout = useCallback(
    async (workout) => {
      if (!user) return;
      const tempDocId = createTempId('plan');
      const optimistic = {
        docId: tempDocId,
        ...workout,
        kind: PLAN_KIND,
        createdAt: Date.now(),
      };
      setWorkouts((prev) => [optimistic, ...prev]);
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'workouts'), {
          ...workout,
          kind: PLAN_KIND,
          createdAt: serverTimestamp(),
        });
        setWorkouts((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
      } catch (error) {
        setWorkouts((prev) => prev.filter((item) => item.docId !== tempDocId));
        await loadUserData();
        throw error;
      }
    },
    [createTempId, loadUserData, user]
  );

  const updateWorkout = useCallback(
    async (workoutDocId, updates) => {
      if (!user || !workoutDocId) return;
      const previous = workouts.find((item) => item.docId === workoutDocId);
      if (!previous) return;
      setWorkouts((prev) => prev.map((item) => (item.docId === workoutDocId ? { ...item, ...updates } : item)));
      try {
        await updateDoc(doc(db, 'users', user.uid, 'workouts', workoutDocId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        setWorkouts((prev) => prev.map((item) => (item.docId === workoutDocId ? previous : item)));
        await loadUserData();
        throw error;
      }
    },
    [loadUserData, user, workouts]
  );

  const deleteWorkout = useCallback(
    async (workoutDocId) => {
      if (!user || !workoutDocId) return;
      const previous = workouts;
      setWorkouts((prev) => prev.filter((item) => item.docId !== workoutDocId));
      try {
        if (!workoutDocId.startsWith('temp-')) {
          await deleteDoc(doc(db, 'users', user.uid, 'workouts', workoutDocId));
        }
      } catch (error) {
        setWorkouts(previous);
        await loadUserData();
        throw error;
      }
    },
    [loadUserData, user, workouts]
  );

  const addWorkoutSession = useCallback(
    async (session) => {
      if (!user) return;
      const tempDocId = createTempId('session');
      const optimistic = {
        docId: tempDocId,
        ...session,
        kind: SESSION_KIND,
        createdAt: Date.now(),
      };
      setWorkouts((prev) => [optimistic, ...prev]);
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'workouts'), {
          ...session,
          kind: SESSION_KIND,
          createdAt: serverTimestamp(),
        });
        setWorkouts((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
      } catch (error) {
        setWorkouts((prev) => prev.filter((item) => item.docId !== tempDocId));
        await loadUserData();
        throw error;
      }
    },
    [createTempId, loadUserData, user]
  );

  const addProgressEntry = useCallback(
    async (entry) => {
      if (!user) return;
      const tempDocId = createTempId('progress');
      const optimistic = {
        docId: tempDocId,
        ...entry,
        createdAt: Date.now(),
      };
      setProgress((prev) => [optimistic, ...prev]);
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'progress'), {
          ...entry,
          createdAt: serverTimestamp(),
        });
        setProgress((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
      } catch (error) {
        setProgress((prev) => prev.filter((item) => item.docId !== tempDocId));
        await loadUserData();
        throw error;
      }
    },
    [createTempId, loadUserData, user]
  );

  const deleteProgressEntry = useCallback(
    async (progressDocId) => {
      if (!user || !progressDocId) return;
      const previous = progress;
      setProgress((prev) => prev.filter((item) => item.docId !== progressDocId));
      try {
        if (!progressDocId.startsWith('temp-')) {
          await deleteDoc(doc(db, 'users', user.uid, 'progress', progressDocId));
        }
      } catch (error) {
        setProgress(previous);
        await loadUserData();
        throw error;
      }
    },
    [loadUserData, progress, user]
  );

  const updateGoal = async (nextGoal) => {
    if (!user) return;
    await setDoc(
      doc(db, 'users', user.uid),
      {
        goal: nextGoal,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    setGoal(nextGoal);
  };

  const recommendedExercises = useMemo(() => {
    const cardioKeywords = ['cardio', 'waist', 'calves', 'upper legs'];
    const strengthKeywords = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings'];

    const list = [...exercises];
    if (goal === 'weight loss') {
      return list.sort((a, b) => {
        const aCardio = cardioKeywords.some((key) => `${a.bodyPart} ${a.target}`.toLowerCase().includes(key));
        const bCardio = cardioKeywords.some((key) => `${b.bodyPart} ${b.target}`.toLowerCase().includes(key));
        return Number(bCardio) - Number(aCardio);
      });
    }
    if (goal === 'muscle gain') {
      return list.sort((a, b) => {
        const aStrength = strengthKeywords.some((key) => `${a.bodyPart} ${a.target}`.toLowerCase().includes(key));
        const bStrength = strengthKeywords.some((key) => `${b.bodyPart} ${b.target}`.toLowerCase().includes(key));
        return Number(bStrength) - Number(aStrength);
      });
    }
    return list;
  }, [exercises, goal]);

  const value = useMemo(
    () => ({
      exercises,
      recommendedExercises,
      loadingExercises,
      isLoadingMore,
      hasMore,
      exercisesError,
      bodyPartFilter,
      setBodyPartFilter,
      loadMoreExercises,
      refreshExercises: loadInitialExercises,
      loadingUserData,
      userDataError,
      refreshUserData: loadUserData,
      favorites,
      workouts,
      progress,
      goal,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      addWorkout,
      updateWorkout,
      deleteWorkout,
      addWorkoutSession,
      addProgressEntry,
      deleteProgressEntry,
      updateGoal,
    }),
    [
      exercises,
      recommendedExercises,
      loadingExercises,
      isLoadingMore,
      hasMore,
      exercisesError,
      bodyPartFilter,
      loadMoreExercises,
      loadInitialExercises,
      loadingUserData,
      userDataError,
      loadUserData,
      favorites,
      workouts,
      progress,
      goal,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      addWorkout,
      updateWorkout,
      deleteWorkout,
      addWorkoutSession,
      addProgressEntry,
      deleteProgressEntry,
      updateGoal,
    ]
  );

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>;
};

export const useFitness = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitness must be used inside FitnessProvider');
  }
  return context;
};
