import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import ExerciseCard from '../components/ExerciseCard';
import { useFitness } from '../context/FitnessContext';
import { useWorkoutHistory } from '../context/WorkoutHistoryContext';
import { getProgramById } from '../data/workoutPrograms';
import { getExercisesForProgram } from '../utils/exerciseMatcher';
import { buildHistorySnapshot } from '../utils/workoutProgression';
import { theme } from '../utils/theme';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import AppButton from '../components/AppButton';

const FULL_BODY_ID = 'beginner-full-body';

const mapSessionDifficulty = (label) => {
  const s = (label || '').toLowerCase();
  if (s.includes('beginner')) return 'low';
  if (s.includes('advanced')) return 'high';
  return 'medium';
};

const ProgramDetailScreen = ({ route, navigation }) => {
  const { programId } = route.params || {};
  const program = getProgramById(programId);
  const { exercises, favorites, toggleFavorite, loadingExercises, goal, exercisesError, refreshExercises } = useFitness();
  const { completedWorkouts, addWorkoutSession } = useWorkoutHistory();
  const { showToast } = useToast();

  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);

  const historySnapshot = useMemo(
    () => buildHistorySnapshot(completedWorkouts, program?.type, goal),
    [completedWorkouts, program?.type, goal]
  );

  const resolved = useMemo(() => {
    if (!program || !exercises.length) return [];
    return getExercisesForProgram(program, exercises, historySnapshot);
  }, [program, exercises, historySnapshot]);

  const onToggleFavorite = useCallback(
    async (item) => {
      try {
        await toggleFavorite(item);
        const saved = !favorites.some((fav) => fav.id === item.id);
        showToast(saved ? 'Exercise saved to favorites.' : 'Exercise removed from favorites.');
      } catch (error) {
        showToast('Unable to update favorites right now.', 'error');
      }
    },
    [favorites, showToast, toggleFavorite]
  );

  const onTryFullBody = useCallback(() => {
    navigation.navigate('ProgramDetail', { programId: FULL_BODY_ID });
  }, [navigation]);

  const onCompleteWorkout = useCallback(async () => {
    if (!program || !resolved.length) return;
    try {
      await addWorkoutSession({
        programType: program.type,
        date: Date.now(),
        exercises: resolved.map(({ id, name, target, bodyPart }) => ({ id, name, target, bodyPart })),
        difficulty: mapSessionDifficulty(program.difficulty),
      });
      showToast('Great work 🔥');
    } catch (error) {
      showToast('Could not save workout completion.', 'error');
    }
  }, [program, resolved, addWorkoutSession, showToast]);

  const renderEmpty = useCallback(() => {
    if (loadingExercises) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.emptyTitle}>Loading your training plan…</Text>
          <Text style={styles.emptySub}>Building moves from your exercise library.</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        {exercisesError ? (
          <>
            <EmptyState icon="alert-circle-outline" title="Could not load program exercises" subtitle={exercisesError} />
            <AppButton title="Retry Exercises" variant="secondary" onPress={refreshExercises} />
          </>
        ) : (
          <>
            <Text style={styles.emptyTitle}>Loading your training plan…</Text>
            <Text style={styles.emptySub}>We will load exercises as soon as your library syncs. Try a full-body session in the meantime.</Text>
          </>
        )}
        <Pressable
          onPress={onTryFullBody}
          style={styles.fallbackBtn}
          android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
          accessibilityRole="button"
          accessibilityLabel="Try full body workout program"
        >
          <Text style={styles.fallbackBtnText}>Try Full Body Program</Text>
        </Pressable>
      </View>
    );
  }, [loadingExercises, onTryFullBody, exercisesError, refreshExercises]);

  if (!program) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.muted}>Program not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const showList = exercises.length > 0 && resolved.length > 0;

  const listFooter = useCallback(() => {
    if (!showList) return null;
    return (
      <Pressable
        onPress={onCompleteWorkout}
        style={styles.completeBtn}
        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
        accessibilityRole="button"
        accessibilityLabel="Mark workout as complete"
      >
        <Text style={styles.completeBtnText}>Complete Workout</Text>
      </Pressable>
    );
  }, [showList, onCompleteWorkout]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.meta}>
          {program.difficulty} · {program.estimatedMinutes} min
          {showList ? ` · ${resolved.length} moves` : ''}
        </Text>
        <Text style={styles.desc}>{program.description}</Text>
      </View>
      {showList ? (
        <FlatList
          data={resolved}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.list}
          ListFooterComponent={listFooter}
          renderItem={({ item, index }) => (
            <ExerciseCard
              item={item}
              index={index}
              layout="list"
              onPress={() => navigation.navigate('Exercises', { screen: 'ExerciseDetail', params: { exercise: item } })}
              onFavorite={() => onToggleFavorite(item)}
              isFavorite={favoriteIds.has(item.id)}
            />
          )}
        />
      ) : (
        <View style={styles.emptyHost}>{renderEmpty()}</View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  muted: {
    color: theme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  meta: {
    marginTop: 0,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  desc: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  completeBtn: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  emptyHost: {
    flex: 1,
    minHeight: 280,
    paddingHorizontal: theme.spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fallbackBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default ProgramDetailScreen;
