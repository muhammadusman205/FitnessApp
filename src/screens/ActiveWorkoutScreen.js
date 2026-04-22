import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import AppButton from '../components/AppButton';
import { theme } from '../utils/theme';
import { useWorkoutHistory } from '../context/WorkoutHistoryContext';
import { useFitness } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';

const REST_SECONDS = 60;
const RING_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FALLBACK_GIF =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80';

const toDuration = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
};

const resolveMotivation = (totalSets) => {
  if (totalSets >= 30) return 'Elite consistency. Keep this momentum.';
  if (totalSets >= 18) return 'Strong session. You are building real discipline.';
  return 'Great effort. Every session compounds progress.';
};

const ActiveWorkoutScreen = ({ navigation, route }) => {
  const {
    exercises = [],
    setsPerExercise = 4,
    repsPerSet = 12,
    programTitle = 'Workout Session',
    programType = 'general',
    difficulty = 'medium',
  } = route?.params || {};
  const { addWorkoutSession: addHistorySession } = useWorkoutHistory();
  const { addWorkoutSession: addCloudSession } = useFitness();
  const { showToast } = useToast();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSetsByExercise, setCompletedSetsByExercise] = useState(() =>
    Array.from({ length: exercises.length }, () => 0)
  );
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasExercises = exercises.length > 0;
  const currentExercise = hasExercises ? exercises[currentExerciseIndex] : null;
  const currentCompletedSets = completedSetsByExercise[currentExerciseIndex] || 0;
  const currentSetNumber = Math.min(currentCompletedSets + 1, setsPerExercise);
  const isLastExercise = currentExerciseIndex === Math.max(exercises.length - 1, 0);
  const isCurrentExerciseFinished = currentCompletedSets >= setsPerExercise;
  const canFinishWorkout = isLastExercise && isCurrentExerciseFinished;

  const completedSetCount = useMemo(
    () => completedSetsByExercise.reduce((sum, count) => sum + count, 0),
    [completedSetsByExercise]
  );
  const totalSetCount = exercises.length * setsPerExercise;
  const progressRatio = totalSetCount > 0 ? completedSetCount / totalSetCount : 0;
  const ringOffset = CIRCUMFERENCE * (1 - restSecondsLeft / REST_SECONDS);

  useEffect(() => {
    if (!hasExercises) return undefined;
    const tick = setInterval(() => {
      setElapsedMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(tick);
  }, [hasExercises]);

  useEffect(() => {
    if (restSecondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restSecondsLeft]);

  const onMarkSetComplete = () => {
    if (!hasExercises || isCurrentExerciseFinished) return;
    setCompletedSetsByExercise((prev) => {
      const next = [...prev];
      next[currentExerciseIndex] = Math.min((next[currentExerciseIndex] || 0) + 1, setsPerExercise);
      return next;
    });
    setRestSecondsLeft(REST_SECONDS);
  };

  const onSkipRest = () => {
    setRestSecondsLeft(0);
  };

  const onPrevExercise = () => {
    setCurrentExerciseIndex((prev) => Math.max(prev - 1, 0));
    setRestSecondsLeft(0);
  };

  const onNextExercise = () => {
    setCurrentExerciseIndex((prev) => Math.min(prev + 1, exercises.length - 1));
    setRestSecondsLeft(0);
  };

  const onCancelWorkout = () => {
    Alert.alert('Cancel Workout?', 'Your current session progress will be lost.', [
      { text: 'Keep Training', style: 'cancel' },
      {
        text: 'Cancel Workout',
        style: 'destructive',
        onPress: () => navigation.navigate('AppTabs', { screen: 'Home' }),
      },
    ]);
  };

  const onFinishWorkout = async () => {
    if (!hasExercises || saving) return;
    setSaving(true);
    try {
      const completedExerciseCount = completedSetsByExercise.filter((count) => count > 0).length;
      const session = {
        programType,
        programTitle,
        difficulty,
        date: Date.now(),
        totalTimeMs: elapsedMs,
        totalSets: completedSetCount,
        completedExerciseCount,
        exercises,
      };

      await addHistorySession(session);
      await addCloudSession({
        title: programTitle,
        kind: 'session',
        programType,
        difficulty,
        completedExerciseCount,
        totalSets: completedSetCount,
        totalTimeMs: elapsedMs,
        date: new Date().toISOString().slice(0, 10),
        exercises,
      });

      setCompletionVisible(true);
      showToast('Workout session completed.');
    } catch (error) {
      showToast('Could not save completed workout.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onCloseCompletion = () => {
    setCompletionVisible(false);
    navigation.navigate('AppTabs', { screen: 'Home' });
  };

  if (!hasExercises) {
    return (
      <ScreenContainer>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No exercises available</Text>
          <Text style={styles.emptySub}>Start a program from the Home or Program screen first.</Text>
          <AppButton
            title="Back to Home"
            onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}
            accessibilityHint="Returns to the main dashboard."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.sessionTitle}>{programTitle}</Text>
        <Text style={styles.sessionMeta}>
          Exercise {currentExerciseIndex + 1} of {exercises.length} · Set {currentSetNumber} of {setsPerExercise}
        </Text>
        <Text style={styles.completedMeta}>
          Exercises completed: {completedSetsByExercise.filter((count) => count >= setsPerExercise).length} / {exercises.length}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progressRatio * 100, 4)}%` }]} />
        </View>

        <Card style={styles.exerciseCard}>
          <Image
            source={{ uri: currentExercise.gifUrl || FALLBACK_GIF }}
            style={styles.exerciseImage}
            accessibilityRole="image"
            accessibilityLabel={`${currentExercise.name} exercise image`}
          />
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            Target: {currentExercise.target || 'N/A'} · Body Part: {currentExercise.bodyPart || 'N/A'}
          </Text>
          <Text style={styles.repText}>Target Reps: {repsPerSet}</Text>
        </Card>

        <Card style={styles.restCard}>
          <Text style={styles.restTitle}>Rest Timer</Text>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={theme.colors.border}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={theme.colors.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.ringLabelWrap}>
              <Text style={styles.ringLabel}>{restSecondsLeft}s</Text>
            </View>
          </View>
          <AppButton
            title="Skip Rest"
            variant="secondary"
            onPress={onSkipRest}
            accessibilityHint="Skips the current rest countdown."
          />
        </Card>

        <View style={styles.row}>
          <AppButton
            title="Previous Exercise"
            variant="secondary"
            onPress={onPrevExercise}
            disabled={currentExerciseIndex === 0}
            accessibilityHint="Moves to the previous exercise."
          />
          <AppButton
            title="Next Exercise"
            variant="secondary"
            onPress={onNextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            accessibilityHint="Moves to the next exercise."
          />
        </View>

        {!canFinishWorkout ? (
          <AppButton
            title={isCurrentExerciseFinished ? 'Exercise Complete' : 'Mark Set Complete'}
            onPress={onMarkSetComplete}
            disabled={isCurrentExerciseFinished}
            accessibilityHint="Marks the current set as complete and starts rest."
          />
        ) : (
          <AppButton
            title={saving ? 'Finishing Workout...' : 'Finish Workout'}
            onPress={onFinishWorkout}
            loading={saving}
            accessibilityHint="Saves your completed workout and returns to Home."
          />
        )}

        <AppButton
          title="Cancel Workout"
          variant="secondary"
          onPress={onCancelWorkout}
          accessibilityHint="Cancels the current workout session."
        />
      </View>

      <Modal visible={completionVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Workout Complete</Text>
            <Text style={styles.modalLine}>Total Time: {toDuration(elapsedMs)}</Text>
            <Text style={styles.modalLine}>Exercises Done: {completedSetsByExercise.filter((count) => count > 0).length}</Text>
            <Text style={styles.modalLine}>Sets Done: {completedSetCount}</Text>
            <Text style={styles.modalMessage}>{resolveMotivation(completedSetCount)}</Text>
            <AppButton title="Back to Home" onPress={onCloseCompletion} />
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sessionMeta: {
    marginTop: 4,
    marginBottom: 4,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  completedMeta: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  exerciseCard: {
    marginBottom: theme.spacing.sm,
  },
  exerciseImage: {
    width: '100%',
    height: 190,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.cardAlt,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  exerciseMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  repText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  restCard: {
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  restTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ringWrap: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlayBlackMedium,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalLine: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalMessage: {
    marginTop: theme.spacing.sm,
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySub: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ActiveWorkoutScreen;
