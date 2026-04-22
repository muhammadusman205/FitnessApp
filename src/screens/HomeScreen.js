import { useCallback, useEffect, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { useFitness } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../utils/theme';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ExerciseCard from '../components/ExerciseCard';
import SkeletonCard from '../components/SkeletonCard';
import ProgramCard, { PROGRAM_CARD_WIDTH } from '../components/ProgramCard';
import { useFadeIn } from '../hooks/useFadeIn';
import { WORKOUT_PROGRAMS } from '../data/workoutPrograms';
import EmptyState from '../components/EmptyState';
import AppButton from '../components/AppButton';
import { useWorkoutHistory } from '../context/WorkoutHistoryContext';

const { width: SCREEN_W } = Dimensions.get('window');
const RECOMMENDED_CARD_W = Math.min(SCREEN_W * 0.78, 300);
const SNAP_PROGRAM = PROGRAM_CARD_WIDTH + 12;
const SNAP_REC = RECOMMENDED_CARD_W + 12;

const GOALS = ['general fitness', 'weight loss', 'muscle gain'];

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const {
    favorites,
    workouts,
    progress,
    goal,
    updateGoal,
    loadingUserData,
    userDataError,
    loadingExercises,
    exercisesError,
    recommendedExercises,
    toggleFavorite,
    exercises,
    refreshUserData,
    refreshExercises,
  } = useFitness();
  const { completedWorkouts } = useWorkoutHistory();
  const { showToast } = useToast();

  const plannedWorkouts = useMemo(
    () => workouts.filter((item) => (item.kind || 'plan') === 'plan'),
    [workouts]
  );

  const lastSession = completedWorkouts[0] || null;
  const resumeTitle = lastSession?.programTitle || `${lastSession?.programType || 'Session'} workout`;
  const resumeSubtitle = lastSession
    ? `${lastSession.exercises?.[0]?.name || 'Exercise'} · ${new Date(lastSession.date).toLocaleDateString()}`
    : '';

  const stats = [
    { label: 'Favorites', value: favorites.length },
    { label: 'Planned', value: plannedWorkouts.length },
    { label: 'Logs', value: progress.length },
  ];

  const onGoalSelect = async (nextGoal) => {
    try {
      await updateGoal(nextGoal);
      showToast(`Goal updated: ${nextGoal}`);
    } catch (error) {
      showToast('Could not update your goal.', 'error');
    }
  };

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      showToast('Could not log out right now.', 'error');
    }
  };

  const weeklyWorkouts = progress.slice(-7).reduce((sum, item) => sum + (Number(item.completedWorkouts) || 0), 0);
  const consistency = `${Math.min(progress.slice(-7).length, 7)}/7 days`;
  const topRecommendations = recommendedExercises.slice(0, 12);
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);
  const sectionFade = useFadeIn(0, 80);

  const onToggleFavorite = useCallback(
    async (item) => {
      try {
        await toggleFavorite(item);
        const saved = !favoriteIds.has(item.id);
        showToast(saved ? 'Exercise saved to favorites.' : 'Exercise removed from favorites.');
      } catch (error) {
        showToast('Unable to update favorites right now.', 'error');
      }
    },
    [favoriteIds, showToast, toggleFavorite]
  );

  useEffect(() => {
    const urls = topRecommendations
      .slice(0, 10)
      .map((e) => e.gifUrl)
      .filter(Boolean);
    urls.forEach((u) => {
      Image.prefetch(u).catch(() => {});
    });
  }, [topRecommendations]);

  const renderProgram = useCallback(
    ({ item, index }) => (
      <ProgramCard
        program={item}
        index={index}
        onPress={() => navigation.navigate('ProgramDetail', { programId: item.id })}
      />
    ),
    [navigation]
  );

  const renderRecommendation = useCallback(
    ({ item, index }) => (
      <View style={{ width: RECOMMENDED_CARD_W, marginRight: theme.spacing.sm }}>
        <ExerciseCard
          item={item}
          index={index}
          layout="carousel"
          cardWidth={RECOMMENDED_CARD_W}
          onPress={() => navigation.navigate('Exercises', { screen: 'ExerciseDetail', params: { exercise: item } })}
          onFavorite={() => onToggleFavorite(item)}
          isFavorite={favoriteIds.has(item.id)}
        />
      </View>
    ),
    [favoriteIds, navigation, onToggleFavorite]
  );

  const renderProgramSkeletons = () => (
    <View style={styles.horizontalRow}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={`ps-${i}`} variant="block" style={{ width: PROGRAM_CARD_WIDTH, height: 200 }} />
      ))}
    </View>
  );

  const renderRecSkeletons = () => (
    <View style={styles.horizontalRow}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={`rs-${i}`} variant="exercise" style={{ width: RECOMMENDED_CARD_W, height: 220 }} />
      ))}
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.hero}>
          <Text style={styles.greeting}>Welcome back, {user?.email?.split('@')[0] || 'Athlete'}</Text>
          <Text style={styles.subtitle}>Train with purpose — pick a program or dive into moves.</Text>
          <Pressable
            style={styles.logoutButton}
            onPress={onLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            accessibilityHint="Signs out of your account and returns to the login screen."
          >
            <Text style={styles.logout}>Logout</Text>
          </Pressable>
        </Card>

        <Pressable
          onPress={() => navigation.navigate('ProgramDetail', { programId: WORKOUT_PROGRAMS[0].id })}
          style={styles.ctaWrap}
          accessibilityRole="button"
          accessibilityLabel="Start today's workout program"
          accessibilityHint="Opens the program details for today's recommended workout."
        >
          <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>Start Workout</Text>
              <Text style={styles.ctaSub}>Jump into today's session.</Text>
            </View>
            <Ionicons name="play-circle" size={44} color={theme.colors.whiteTransparentStrong} />
          </LinearGradient>
        </Pressable>

        <Card style={styles.goalCard}>
          <Text style={styles.goalTitle}>Goal</Text>
          <Text style={styles.goalSubtitle}>Recommendations adapt to your focus.</Text>
          <View style={styles.goalRow}>
            {GOALS.map((item) => (
              <Pressable
                key={item}
                onPress={() => onGoalSelect(item)}
                style={[styles.goalChip, goal === item && styles.goalChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: goal === item }}
                accessibilityLabel={`Set goal to ${item}`}
                accessibilityHint="Updates your recommendation focus."
              >
                <Text style={[styles.goalChipText, goal === item && styles.goalChipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {userDataError ? (
          <Card style={styles.errorCard}>
            <EmptyState icon="cloud-offline-outline" title="Sync issue" subtitle={userDataError} />
            <AppButton title="Retry Sync" variant="secondary" onPress={refreshUserData} />
          </Card>
        ) : null}

        {loadingUserData ? <LoadingState label="Syncing your data..." /> : null}

        <Animated.View style={{ opacity: sectionFade }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Programs for you</Text>
            <Ionicons name="albums-outline" size={18} color={theme.colors.primary} />
          </View>
        </Animated.View>
        {exercisesError ? (
          <Card style={styles.errorCard}>
            <EmptyState icon="barbell-outline" title="Exercise feed unavailable" subtitle={exercisesError} />
            <AppButton title="Retry Exercises" variant="secondary" onPress={refreshExercises} />
          </Card>
        ) : null}
        {loadingExercises && !exercises.length ? (
          renderProgramSkeletons()
        ) : (
          <View style={styles.carouselHost}>
            <FlatList
              data={WORKOUT_PROGRAMS}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_PROGRAM}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.horizontalListContent}
              renderItem={renderProgram}
            />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended exercises</Text>
          <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
        </View>
        {loadingExercises && !exercises.length ? (
          renderRecSkeletons()
        ) : (
          <View style={styles.carouselHost}>
            <FlatList
              data={topRecommendations}
              horizontal
              keyExtractor={(item, index) => item.id?.toString() || `rec-${index}`}
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_REC}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.horizontalListContent}
              renderItem={renderRecommendation}
              ListEmptyComponent={<Text style={styles.emptyHint}>Open Exercises to load your exercise library.</Text>}
            />
          </View>
        )}

        {lastSession ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Resume Session</Text>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_W * 0.88 + 12}
              decelerationRate="fast"
              contentContainerStyle={styles.horizontalListContent}
            >
              <Pressable
                onPress={() =>
                  navigation.navigate('ActiveWorkout', {
                    programTitle: resumeTitle,
                    programType: lastSession.programType || 'resume',
                    difficulty: lastSession.difficulty || 'medium',
                    exercises: lastSession.exercises || [],
                    setsPerExercise: 4,
                    repsPerSet: 12,
                  })
                }
                style={[styles.continueCard, { width: SCREEN_W * 0.88 }]}
                accessibilityRole="button"
                accessibilityLabel="Resume your latest workout session"
                accessibilityHint="Opens the active workout screen using your most recent session."
              >
                <LinearGradient colors={[theme.colors.cardAlt, theme.colors.cardTintBlue]} style={StyleSheet.absoluteFill} />
                <Text style={styles.continueTitle}>{resumeTitle}</Text>
                <Text style={styles.continueSub}>{resumeSubtitle}</Text>
                <Text style={styles.continueLink}>Resume session →</Text>
              </Pressable>
            </ScrollView>
          </>
        ) : null}

        <View style={styles.grid}>
          {stats.map((item) => (
            <Card key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </Card>
          ))}
        </View>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This week</Text>
          <Text style={styles.summaryText}>Workouts completed: {weeklyWorkouts}</Text>
          <Text style={styles.summaryText}>Consistency: {consistency}</Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg * 2,
  },
  hero: {
    backgroundColor: theme.colors.cardTintBlue,
    marginBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  logout: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.cardTintBlueLight,
  },
  ctaWrap: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  ctaTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.white,
  },
  ctaSub: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.whiteTransparentMid,
  },
  goalCard: {
    marginBottom: theme.spacing.md,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  goalSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  goalRow: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  goalChip: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.chipBackground,
    paddingHorizontal: 12,
  },
  goalChipActive: {
    backgroundColor: theme.colors.primary,
  },
  goalChipText: {
    color: theme.colors.primary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  goalChipTextActive: {
    color: theme.colors.chipActiveText,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  carouselHost: {
    marginBottom: theme.spacing.sm,
    minHeight: 210,
  },
  horizontalListContent: {
    paddingRight: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  horizontalRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  emptyHint: {
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
  },
  continueCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'center',
    ...theme.shadow,
  },
  continueTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  continueSub: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  continueLink: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  summaryCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.cardTintBlueLight,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
  },
  errorCard: {
    marginBottom: theme.spacing.md,
  },
});

export default HomeScreen;
