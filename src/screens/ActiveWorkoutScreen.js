import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  const [restPaused, setRestPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoAdvanceTimeoutRef = useRef(null);

  const hasExercises = exercises.length > 0;
  const currentExercise = hasExercises ? exercises[currentExerciseIndex] : null;
  const currentCompletedSets = completedSetsByExercise[currentExerciseIndex] || 0;
  const currentSetNumber = Math.min(currentCompletedSets + 1, setsPerExercise);
  const isLastExercise = currentExerciseIndex === Math.max(exercises.length - 1, 0);
  const isCurrentExerciseFinished = currentCompletedSets >= setsPerExercise;
  const completedExerciseCountStrict = completedSetsByExercise.filter((count) => count >= setsPerExercise).length;
  const allExercisesFinished = exercises.length > 0 && completedExerciseCountStrict === exercises.length;
  const canFinishWorkout = allExercisesFinished && isLastExercise;

  const completedSetCount = useMemo(
    () => completedSetsByExercise.reduce((sum, count) => sum + count, 0),
    [completedSetsByExercise]
  );
  const totalSetCount = exercises.length * setsPerExercise;
  const progressRatio = totalSetCount > 0 ? completedSetCount / totalSetCount : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const ringOffset = CIRCUMFERENCE * (1 - restSecondsLeft / REST_SECONDS);
  const isResting = restSecondsLeft > 0;

  useEffect(() => {
    // Reset workout runtime state when a new session payload is opened.
    setCurrentExerciseIndex(0);
    setCompletedSetsByExercise(Array.from({ length: exercises.length }, () => 0));
    setRestSecondsLeft(0);
    setRestPaused(false);
    setElapsedMs(0);
    setCompletionVisible(false);
    setSaving(false);
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, [exercises.length, programTitle]);

  useEffect(() => {
    if (!hasExercises) return undefined;
    const tick = setInterval(() => {
      setElapsedMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(tick);
  }, [hasExercises]);

  useEffect(() => {
    if (restSecondsLeft <= 0 || restPaused) return undefined;
    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restPaused, restSecondsLeft]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const onMarkSetComplete = () => {
    if (!hasExercises) return;
    if (isCurrentExerciseFinished) {
      if (currentExerciseIndex < exercises.length - 1) {
        onNextExercise();
      }
      return;
    }
    setCompletedSetsByExercise((prev) => {
      const next = [...prev];
      const nextSetCount = Math.min((next[currentExerciseIndex] || 0) + 1, setsPerExercise);
      next[currentExerciseIndex] = nextSetCount;
      return next;
    });
    setRestSecondsLeft(REST_SECONDS);
    setRestPaused(false);
    if (currentCompletedSets + 1 >= setsPerExercise && currentExerciseIndex < exercises.length - 1) {
      // Auto-advance to keep workout flow responsive.
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrentExerciseIndex((prev) => Math.min(prev + 1, exercises.length - 1));
        autoAdvanceTimeoutRef.current = null;
      }, 250);
    }
  };

  const onSkipRest = () => {
    setRestSecondsLeft(0);
    setRestPaused(false);
  };

  const onToggleRestPause = () => {
    if (restSecondsLeft <= 0) return;
    setRestPaused((prev) => !prev);
  };

  const onPrevExercise = () => {
    setCurrentExerciseIndex((prev) => Math.max(prev - 1, 0));
    setRestSecondsLeft(0);
    setRestPaused(false);
  };

  const onNextExercise = () => {
    setCurrentExerciseIndex((prev) => Math.min(prev + 1, exercises.length - 1));
    setRestSecondsLeft(0);
    setRestPaused(false);
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

  const onFinishWorkout = () => {
    if (!hasExercises || saving) return;
    setSaving(true);
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

    // Show completion UI instantly; persist in background.
    setCompletionVisible(true);
    showToast('Workout session completed.');

    Promise.allSettled([
      addHistorySession(session),
      addCloudSession({
        title: programTitle,
        kind: 'session',
        programType,
        difficulty,
        completedExerciseCount,
        totalSets: completedSetCount,
        totalTimeMs: elapsedMs,
        date: new Date().toISOString().slice(0, 10),
        exercises,
      }),
    ])
      .then((results) => {
        const hasFailure = results.some((item) => item.status === 'rejected');
        if (hasFailure) {
          showToast('Session saved locally. Cloud sync will retry later.', 'error');
        }
      })
      .finally(() => {
        setSaving(false);
      });
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

  const onMainActionPress = () => {
    if (isResting) {
      onSkipRest();
      return;
    }
    if (canFinishWorkout) {
      onFinishWorkout();
      return;
    }
    onMarkSetComplete();
  };

  const mainActionLabel = isResting
    ? 'Skip Rest →'
    : canFinishWorkout
      ? '🏁 Finish Workout'
      : '✓ Mark Set Complete';

  const mainActionStyle = isResting
    ? styles.mainActionRest
    : canFinishWorkout
      ? styles.mainActionFinish
      : styles.mainActionSet;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, theme.spacing.sm) }]}>
          <Text style={styles.headerTitle}>Active Workout</Text>
          <Pressable onPress={onCancelWorkout} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel active workout">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(160, insets.bottom + 140) },
          ]}
        >
          <Text style={styles.sessionTitle}>{programTitle}</Text>
          <Text style={styles.sessionMeta}>
            Exercise {currentExerciseIndex + 1} of {exercises.length} · Set {currentSetNumber} of {setsPerExercise}
          </Text>
          <Text style={styles.completedMeta}>
            Exercises completed: {completedExerciseCountStrict} / {exercises.length}
          </Text>
          <Text style={styles.percentMeta}>Overall completion: {progressPercent}%</Text>
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
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{currentExercise.target || 'N/A'}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{currentExercise.bodyPart || 'N/A'}</Text>
              </View>
            </View>
            <Text style={styles.repText}>Target Reps: {repsPerSet}</Text>
          </Card>

          {isResting ? (
            <Card style={styles.restCard}>
              <Text style={styles.restTitle}>Rest Time</Text>
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
                title={restPaused ? 'Resume Rest' : 'Pause Rest'}
                variant="secondary"
                onPress={onToggleRestPause}
                accessibilityHint="Pauses or resumes the rest countdown."
              />
            </Card>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={onMainActionPress}
            disabled={saving}
            style={[styles.mainActionButton, mainActionStyle, saving && styles.actionDisabled]}
            accessibilityRole="button"
            accessibilityLabel={mainActionLabel}
          >
            <Text style={styles.mainActionText}>{saving ? 'Saving...' : mainActionLabel}</Text>
          </Pressable>

          <View style={styles.navRow}>
            <Pressable
              onPress={onPrevExercise}
              disabled={currentExerciseIndex === 0}
              style={[styles.navButton, currentExerciseIndex === 0 && styles.actionDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Go to previous exercise"
            >
              <Text style={styles.navButtonText}>← Prev</Text>
            </Pressable>
            <Pressable
              onPress={onNextExercise}
              disabled={currentExerciseIndex === exercises.length - 1}
              style={[styles.navButton, currentExerciseIndex === exercises.length - 1 && styles.actionDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Go to next exercise"
            >
              <Text style={styles.navButtonText}>Next →</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

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
  keyboardRoot: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.secondaryBackground,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  cancelText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
  },
  sessionTitle: {
    fontSize: 24,
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
  percentMeta: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 12,
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
    height: 200,
    borderRadius: 16,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.cardAlt,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.cardAlt,
  },
  tagText: {
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  repText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 18,
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mainActionButton: {
    minHeight: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionRest: {
    backgroundColor: theme.colors.warning,
  },
  mainActionSet: {
    backgroundColor: '#22C55E',
  },
  mainActionFinish: {
    backgroundColor: theme.colors.primary,
  },
  mainActionText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 17,
  },
  navRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  navButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  navButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  actionDisabled: {
    opacity: 0.55,
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
