import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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
const USER_DATA_CACHE_PREFIX = 'fitness_user_cache_v1';
const FIRESTORE_PERMISSION_HELP =
  'Firestore permission denied. Update rules to allow users to read/write only their own documents: match /users/{userId}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }';

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
  const pendingFavoriteIdsRef = useRef(new Set());
  const userDataLoadInFlightRef = useRef(false);
  const offlineWarnedRef = useRef(false);
  const lastLoadedUidRef = useRef(null);
  const userDataFailureCountRef = useRef(0);
  const userDataRetryTimeoutRef = useRef(null);
  const userDataCircuitOpenRef = useRef(false);
  const userId = user?.uid || null;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (userDataRetryTimeoutRef.current) {
        clearTimeout(userDataRetryTimeoutRef.current);
      }
    };
  }, []);

  const createTempId = useCallback((prefix) => {
    tempIdRef.current += 1;
    return `temp-${prefix}-${Date.now()}-${tempIdRef.current}`;
  }, []);

  const getUserCacheKey = useCallback((uid) => `${USER_DATA_CACHE_PREFIX}_${uid}`, []);

  const writeUserCache = useCallback(
    async (uid, payload) => {
      if (!uid) return;
      try {
        await AsyncStorage.setItem(
          getUserCacheKey(uid),
          JSON.stringify({
            storedAt: Date.now(),
            ...payload,
          })
        );
      } catch (error) {
        console.warn('[FitnessContext] Failed to write user cache:', error?.message);
      }
    },
    [getUserCacheKey]
  );

  const readUserCache = useCallback(
    async (uid) => {
      if (!uid) return null;
      try {
        const raw = await AsyncStorage.getItem(getUserCacheKey(uid));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
      } catch (error) {
        console.warn('[FitnessContext] Failed to read user cache:', error?.message);
        return null;
      }
    },
    [getUserCacheKey]
  );

  const classifyFirestoreError = useCallback((error, hasNetwork) => {
    const code = `${error?.code || ''}`.toLowerCase();
    const message = `${error?.message || ''}`.toLowerCase();

    if (code.includes('permission-denied')) return 'permission';
    if (code.includes('unauthenticated')) return 'unauthenticated';
    if (code.includes('failed-precondition')) return 'precondition';
    if (code.includes('not-found')) return 'not-found';
    if (!hasNetwork || code.includes('unavailable') || message.includes('offline')) return 'network';
    return 'unknown';
  }, []);

  const logFirestoreError = useCallback((operation, error, context = {}) => {
    console.error(`[FitnessContext] Firestore ${operation} failed`, {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      ...context,
    });
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
        setLoadingExercises(false);
        // Refresh first page silently in the background.
        fetchExercises(0, PAGE_SIZE)
          .then(async (freshPage) => {
            if (!mountedRef.current || !freshPage.length) return;
            await setCachedExercises(freshPage);
            setExercises((prev) => {
              const next = [...freshPage];
              const seen = new Set(next.map((item) => String(item.id)));
              for (const item of prev) {
                const sid = String(item.id);
                if (!seen.has(sid)) {
                  seen.add(sid);
                  next.push(item);
                }
              }
              return next;
            });
            nextPageRef.current = 1;
            setHasMore(freshPage.length >= PAGE_SIZE);
          })
          .catch((error) => {
            console.warn('[FitnessContext] Background exercise refresh failed:', error?.message);
          });
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
      // Fall back instantly to offline data by using API service fallback behavior.
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
    const task = InteractionManager.runAfterInteractions(() => {
      loadInitialExercises();
    });
    return () => task.cancel();
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

  const loadUserData = useCallback(async (mode = 'normal') => {
    const isManualRefresh = mode === 'manual';
    if (!mountedRef.current) return;
    if (userDataLoadInFlightRef.current) return;
    if (userDataCircuitOpenRef.current && !isManualRefresh) {
      setUserDataError('Could not load your data. Pull down to refresh.');
      return;
    }
    if (!isManualRefresh && userId && lastLoadedUidRef.current === userId) return;
    if (isManualRefresh) {
      userDataFailureCountRef.current = 0;
      userDataCircuitOpenRef.current = false;
      if (userDataRetryTimeoutRef.current) {
        clearTimeout(userDataRetryTimeoutRef.current);
        userDataRetryTimeoutRef.current = null;
      }
    }
    userDataLoadInFlightRef.current = true;
    setLoadingUserData(true);
    setUserDataError(null);
    try {
      if (!userId) {
        if (!mountedRef.current) return;
        setFavorites([]);
        setWorkouts([]);
        setProgress([]);
        setGoal('general fitness');
        setUserDataError(null);
        lastLoadedUidRef.current = null;
        return;
      }
      if (!db) {
        throw new Error('Firestore is not initialized. Check Firebase configuration.');
      }

      const netState = await NetInfo.fetch();
      const hasNetwork = netState.isConnected !== false && netState.isInternetReachable !== false;
      console.log('[FitnessContext] Network status before user sync:', {
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        hasNetwork,
      });
      console.log('[FitnessContext] Fetching Firestore user data for uid:', userId);

      const [favoritesSnap, workoutsSnap, progressSnap, profileSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'favorites')),
        getDocs(collection(db, 'users', userId, 'workouts')),
        getDocs(collection(db, 'users', userId, 'progress')),
        getDoc(doc(db, 'users', userId)),
      ]);

      if (!mountedRef.current) return;
      setFavorites(favoritesSnap.docs.map((item) => ({ docId: item.id, ...item.data() })));
      const sanitizedWorkouts = workoutsSnap.docs
        .map((item) => {
          const data = item.data();
          return {
            docId: item.id,
            ...data,
            kind: data.kind || PLAN_KIND,
          };
        })
        .filter((item) => {
          if (item.kind !== PLAN_KIND) return true;
          return typeof item.title === 'string' && item.title.trim().length > 1;
        });
      setWorkouts(sanitizedWorkouts);
      setProgress(progressSnap.docs.map((item) => ({ docId: item.id, ...item.data() })));
      const nextGoal = profileSnap.exists() ? profileSnap.data().goal || 'general fitness' : 'general fitness';
      setGoal(nextGoal);
      setUserDataError(null);
      offlineWarnedRef.current = false;
      lastLoadedUidRef.current = userId;
      userDataFailureCountRef.current = 0;
      userDataCircuitOpenRef.current = false;
      if (userDataRetryTimeoutRef.current) {
        clearTimeout(userDataRetryTimeoutRef.current);
        userDataRetryTimeoutRef.current = null;
      }
      await writeUserCache(userId, {
        favorites: favoritesSnap.docs.map((item) => ({ docId: item.id, ...item.data() })),
        workouts: sanitizedWorkouts,
        progress: progressSnap.docs.map((item) => ({ docId: item.id, ...item.data() })),
        goal: nextGoal,
      });
    } catch (error) {
      const message = `${error?.message || ''}`.toLowerCase();
      const code = `${error?.code || ''}`.toLowerCase();
      const netState = await NetInfo.fetch();
      const hasNetwork = netState.isConnected !== false && netState.isInternetReachable !== false;
      const errorType = classifyFirestoreError(error, hasNetwork);
      const cached = await readUserCache(userId);
      logFirestoreError('loadUserData', error, { userId, hasNetwork, errorType });

      if (cached && mountedRef.current) {
        console.log('[FitnessContext] Loaded cached user data after sync failure.', {
          hasCachedFavorites: Array.isArray(cached.favorites) && cached.favorites.length > 0,
          hasCachedWorkouts: Array.isArray(cached.workouts) && cached.workouts.length > 0,
          hasCachedProgress: Array.isArray(cached.progress) && cached.progress.length > 0,
        });
        setFavorites(Array.isArray(cached.favorites) ? cached.favorites : []);
        setWorkouts(Array.isArray(cached.workouts) ? cached.workouts : []);
        setProgress(Array.isArray(cached.progress) ? cached.progress : []);
        setGoal(typeof cached.goal === 'string' ? cached.goal : 'general fitness');
      }

      if (errorType === 'permission') {
        if (!mountedRef.current) return;
        console.error('[FitnessContext] Permission root cause detected.', {
          userId,
          help: FIRESTORE_PERMISSION_HELP,
        });
        setUserDataError('Firestore permission denied. Check security rules.');
        return;
      }

      if (errorType === 'network') {
        // Keep previously loaded local state on offline startup.
        if (!offlineWarnedRef.current) {
          console.warn('[FitnessContext] Offline mode detected. Using locally available user data.');
          offlineWarnedRef.current = true;
        }
        if (!mountedRef.current) return;
        userDataFailureCountRef.current += 1;
        const failures = userDataFailureCountRef.current;
        if (failures >= 3) {
          userDataCircuitOpenRef.current = true;
          setUserDataError('Could not load your data. Pull down to refresh.');
          return;
        }
        const backoffMs = 1000 * (2 ** (failures - 1));
        if (userDataRetryTimeoutRef.current) {
          clearTimeout(userDataRetryTimeoutRef.current);
        }
        userDataRetryTimeoutRef.current = setTimeout(() => {
          userDataRetryTimeoutRef.current = null;
          loadUserData('retry');
        }, backoffMs);
        setUserDataError(
          hasNetwork
            ? 'Cloud sync is temporarily unavailable. Showing cached data.'
            : 'You are offline. Showing your last available data.'
        );
        return;
      }

      console.warn('[FitnessContext] Failed to load user data:', error?.message);
      if (!mountedRef.current) return;
      setFavorites([]);
      setWorkouts([]);
      setProgress([]);
      setUserDataError('Could not sync your account data. Please try again.');
    } finally {
      userDataLoadInFlightRef.current = false;
      if (mountedRef.current) {
        setLoadingUserData(false);
      }
    }
  }, [classifyFirestoreError, logFirestoreError, readUserCache, userId, writeUserCache]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadUserData();
    });
    return () => task.cancel();
  }, [userId]);

  const addFavorite = useCallback(
    async (exercise) => {
      if (!user) return;
      const favoriteKey = String(exercise.id);
      if (pendingFavoriteIdsRef.current.has(favoriteKey)) return;
      pendingFavoriteIdsRef.current.add(favoriteKey);
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
        setUserDataError('Could not sync favorites. Please try again.');
        throw error;
      } finally {
        pendingFavoriteIdsRef.current.delete(favoriteKey);
      }
    },
    [createTempId, user]
  );

  const removeFavorite = useCallback(
    async (favoriteItem) => {
      if (!user) return;
      const favoriteKey = String(favoriteItem.id);
      if (pendingFavoriteIdsRef.current.has(favoriteKey)) return;
      pendingFavoriteIdsRef.current.add(favoriteKey);
      const backup = favoriteItem;
      setFavorites((prev) => prev.filter((item) => item.id !== favoriteItem.id));
      try {
        if (favoriteItem.docId && !favoriteItem.docId.startsWith('temp-')) {
          await deleteDoc(doc(db, 'users', user.uid, 'favorites', favoriteItem.docId));
        }
      } catch (error) {
        setFavorites((prev) => [backup, ...prev]);
        setUserDataError('Could not sync favorites. Please try again.');
        throw error;
      } finally {
        pendingFavoriteIdsRef.current.delete(favoriteKey);
      }
    },
    [user]
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
      const normalizedTitle = typeof workout?.title === 'string' ? workout.title.trim() : '';
      const normalizedDay = typeof workout?.day === 'string' ? workout.day.trim() : '';
      if (normalizedTitle.length < 2 || normalizedDay.length < 2) {
        throw new Error('Workout title and day must each be at least 2 characters.');
      }
      const tempDocId = createTempId('plan');
      const optimistic = {
        docId: tempDocId,
        title: normalizedTitle,
        day: normalizedDay,
        kind: PLAN_KIND,
        createdAt: Date.now(),
      };
      setWorkouts((prev) => [optimistic, ...prev]);
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'workouts'), {
          title: normalizedTitle,
          day: normalizedDay,
          kind: PLAN_KIND,
          createdAt: serverTimestamp(),
        });
        setWorkouts((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
      } catch (error) {
        setWorkouts((prev) => prev.filter((item) => item.docId !== tempDocId));
        setUserDataError('Could not sync workout plans. Please try again.');
        throw error;
      }
    },
    [createTempId, user]
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
        setUserDataError('Could not update workout plan. Please try again.');
        throw error;
      }
    },
    [user, workouts]
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
        setUserDataError('Could not delete workout plan. Please try again.');
        throw error;
      }
    },
    [user, workouts]
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
        setUserDataError('Could not sync completed workout. Please try again.');
        throw error;
      }
    },
    [createTempId, user]
  );

  const addProgressEntry = useCallback(
    async (entry) => {
      if (!user) return;
      if (!db) {
        throw new Error('Firestore is not initialized. Check Firebase configuration.');
      }
      console.log('[FitnessContext] addProgressEntry called with:', entry);
      const tempDocId = createTempId('progress');
      const optimistic = {
        docId: tempDocId,
        ...entry,
        createdAt: Date.now(),
      };
      setProgress((prev) => [optimistic, ...prev]);
      try {
        console.log('[FitnessContext] Saving progress entry to Firestore path:', `users/${user.uid}/progress`);
        const docRef = await addDoc(collection(db, 'users', user.uid, 'progress'), {
          ...entry,
          createdAt: serverTimestamp(),
        });
        setProgress((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
      } catch (error) {
        const netState = await NetInfo.fetch();
        const hasNetwork = netState.isConnected !== false && netState.isInternetReachable !== false;
        const errorType = classifyFirestoreError(error, hasNetwork);
        logFirestoreError('addProgressEntry', error, {
          userId: user.uid,
          path: `users/${user.uid}/progress`,
          hasNetwork,
          errorType,
        });
        setProgress((prev) => prev.filter((item) => item.docId !== tempDocId));
        if (errorType === 'permission') {
          console.error('[FitnessContext] Permission root cause detected.', { help: FIRESTORE_PERMISSION_HELP });
          setUserDataError('Firestore permission denied. Check security rules.');
        } else if (errorType === 'network') {
          setUserDataError('Cloud sync is temporarily unavailable. Showing cached data.');
        } else {
          setUserDataError('Could not sync progress entry. Please try again.');
        }
        throw error;
      }
    },
    [classifyFirestoreError, createTempId, logFirestoreError, user]
  );

  useEffect(() => {
    if (!userId) return;
    writeUserCache(userId, { favorites, workouts, progress, goal });
  }, [favorites, goal, progress, userId, workouts, writeUserCache]);

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
        setUserDataError('Could not delete progress entry. Please try again.');
        throw error;
      }
    },
    [progress, user]
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
      refreshUserData: () => loadUserData('manual'),
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
