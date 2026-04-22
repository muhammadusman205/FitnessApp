import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import AppButton from '../components/AppButton';
import { useFitness } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../utils/theme';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80';

const ExerciseDetailScreen = ({ route, navigation }) => {
  const exercise = route?.params?.exercise;
  const { favorites, toggleFavorite } = useFitness();
  const { showToast } = useToast();
  if (!exercise) {
    return (
      <ScreenContainer>
        <View style={styles.missingWrap}>
          <Text style={styles.missingText}>Exercise details are unavailable right now.</Text>
        </View>
      </ScreenContainer>
    );
  }
  const isFavorite = favorites.some((item) => item.id === exercise.id);

  const onToggleFavorite = async () => {
    try {
      await toggleFavorite(exercise);
      const saved = !isFavorite;
      showToast(saved ? 'Exercise saved to favorites.' : 'Exercise removed from favorites.');
    } catch (error) {
      showToast('Unable to update favorites right now.', 'error');
    }
  };

  const onQuickStart = () => {
    navigation.navigate('ActiveWorkout', {
      programTitle: `Quick Start: ${exercise.name}`,
      programType: 'quick-start',
      difficulty: 'medium',
      exercises: [exercise],
      setsPerExercise: 3,
      repsPerSet: 12,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: exercise.gifUrl || PLACEHOLDER_IMAGE }} style={styles.image} />
        <View style={styles.card}>
          <Text style={styles.title}>{exercise.name}</Text>
          <Text style={styles.meta}>Target: {exercise.target || 'N/A'}</Text>
          <Text style={styles.meta}>Equipment: {exercise.equipment || 'N/A'}</Text>
          <Text style={styles.meta}>Body Part: {exercise.bodyPart || 'N/A'}</Text>
          <Text style={styles.sectionTitle}>How to perform</Text>
          {(exercise.instructions || ['Perform with controlled form and breathing.']).map((step, index) => (
            <Text style={styles.step} key={`${exercise.id || 'exercise'}-${index}`}>
              - {step}
            </Text>
          ))}
          <AppButton
            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            onPress={onToggleFavorite}
            accessibilityHint="Adds or removes this exercise from favorites."
          />
          <AppButton
            title="Quick Start"
            variant="secondary"
            onPress={onQuickStart}
            accessibilityHint="Starts a 3-set quick workout for this exercise."
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.md,
  },
  image: {
    height: 220,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  meta: {
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  step: {
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  missingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ExerciseDetailScreen;
