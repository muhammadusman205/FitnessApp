import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { fetchExercises, fetchExercisesByBodyPart, getCachedExercises, setCachedExercises } from '../services/exerciseApi';
import { db } from '../services/firebase';

const FitnessContext = createContext(null);

const PAGE_SIZE = 50;
const SESSION_KIND = 'session';
const USER_DATA_CACHE_PREFIX = 'fitness_user_cache_v2';

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
  const [goal, setGoal] = useState('general fitness');
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [userDataError, setUserDataError] = useState(null);

  const mountedRef = useRef(true);
  const pendingFavoriteIdsRef = useRef(new Set());
  const userDataLoadInFlightRef = useRef(false);
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
        return;
      }

      const cached = await getCachedExercises();
      if (cached?.items?.length) {
        if (!mountedRef.current) return;
        setExercises(cached.items);
        nextPageRef.current = 1;
        setHasMore(cached.items.length >= PAGE_SIZE);
        setLoadingExercises(false);
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
          .catch((error) => console.warn('[FitnessContext] Background exercise refresh failed:', error?.message));
        return;
      }

      const firstPage = await fetchExercises(0, PAGE_SIZE);
      if (firstPage.length) await setCachedExercises(firstPage);
      if (!mountedRef.current) return;
      setExercises(firstPage);
      nextPageRef.current = 1;
      setHasMore(firstPage.length >= PAGE_SIZE);
    } catch (error) {
      console.warn('[FitnessContext] Failed to load exercises:', error?.message);
      if (!mountedRef.current) return;
      setExercises([]);
      setHasMore(false);
      setExercisesError('Could not load exercises right now. Please try again.');
    } finally {
      if (mountedRef.current) setLoadingExercises(false);
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
      if (next.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setIsLoadingMore(false);
      loadMoreLockRef.current = false;
    }
  }, [bodyPartFilter, hasMore, isLoadingMore, loadingExercises]);

  const loadUserData = useCallback(
    async (mode = 'normal') => {
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
      }

      userDataLoadInFlightRef.current = true;
      setLoadingUserData(true);
      setUserDataError(null);
      try {
        if (!userId) {
          if (!mountedRef.current) return;
          setFavorites([]);
          setGoal('general fitness');
          lastLoadedUidRef.current = null;
          return;
        }
        if (!db) throw new Error('Firestore is not initialized.');

        const [favoritesSnap, profileSnap] = await Promise.all([
          getDocs(collection(db, 'users', userId, 'favorites')),
          getDoc(doc(db, 'users', userId)),
        ]);

        if (!mountedRef.current) return;
        const nextFavorites = favoritesSnap.docs.map((item) => ({ docId: item.id, ...item.data() }));
        const nextGoal = profileSnap.exists() ? profileSnap.data().goal || 'general fitness' : 'general fitness';
        setFavorites(nextFavorites);
        setGoal(nextGoal);
        setUserDataError(null);
        lastLoadedUidRef.current = userId;
        userDataFailureCountRef.current = 0;
        userDataCircuitOpenRef.current = false;
        await writeUserCache(userId, { favorites: nextFavorites, goal: nextGoal });
      } catch (error) {
        const netState = await NetInfo.fetch();
        const hasNetwork = netState.isConnected !== false && netState.isInternetReachable !== false;
        const cached = await readUserCache(userId);
        console.warn('[FitnessContext] loadUserData failed:', error?.code || error?.message);

        if (cached && mountedRef.current) {
          setFavorites(Array.isArray(cached.favorites) ? cached.favorites : []);
          setGoal(typeof cached.goal === 'string' ? cached.goal : 'general fitness');
        }

        userDataFailureCountRef.current += 1;
        const failures = userDataFailureCountRef.current;
        if (failures >= 3) {
          userDataCircuitOpenRef.current = true;
          setUserDataError('Could not load your data. Pull down to refresh.');
          return;
        }
        const backoffMs = 1000 * (2 ** (failures - 1));
        if (userDataRetryTimeoutRef.current) clearTimeout(userDataRetryTimeoutRef.current);
        userDataRetryTimeoutRef.current = setTimeout(() => {
          userDataRetryTimeoutRef.current = null;
          loadUserData('retry');
        }, backoffMs);
        setUserDataError(
          hasNetwork
            ? 'Cloud sync is temporarily unavailable. Showing cached data.'
            : 'You are offline. Showing your last available data.'
        );
      } finally {
        userDataLoadInFlightRef.current = false;
        if (mountedRef.current) setLoadingUserData(false);
      }
    },
    [readUserCache, userId, writeUserCache]
  );

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
        setFavorites((prev) => prev.map((item) => (item.docId === tempDocId ? { ...item, docId: docRef.id } : item)));
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
      if (existing) await removeFavorite(existing);
      else await addFavorite(exercise);
    },
    [addFavorite, favorites, removeFavorite]
  );

  const addWorkoutSession = useCallback(
    async (session) => {
      if (!user) return;
      await addDoc(collection(db, 'users', user.uid, 'workouts'), {
        ...session,
        kind: SESSION_KIND,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );

  const updateGoal = useCallback(
    async (nextGoal) => {
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
    },
    [user]
  );

  useEffect(() => {
    if (!userId) return;
    writeUserCache(userId, { favorites, goal });
  }, [favorites, goal, userId, writeUserCache]);

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
      goal,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      addWorkoutSession,
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
      goal,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      addWorkoutSession,
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
