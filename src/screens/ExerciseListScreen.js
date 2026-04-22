import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { useFitness } from '../context/FitnessContext';
import { BODY_PART_FILTERS } from '../services/exerciseApi';
import { theme } from '../utils/theme';
import ExerciseCard from '../components/ExerciseCard';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import SkeletonCard from '../components/SkeletonCard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import AppButton from '../components/AppButton';

const ExerciseListScreen = ({ navigation }) => {
  const {
    recommendedExercises,
    favorites,
    loadingExercises,
    isLoadingMore,
    hasMore,
    exercisesError,
    bodyPartFilter,
    setBodyPartFilter,
    loadMoreExercises,
    refreshExercises,
    goal,
    toggleFavorite,
  } = useFitness();
  const { showToast } = useToast();
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);

  const filteredExercises = useMemo(() => {
    if (!debouncedSearch.trim()) return recommendedExercises;
    const search = debouncedSearch.toLowerCase();
    return recommendedExercises.filter((item) => (item.name || '').toLowerCase().includes(search));
  }, [recommendedExercises, debouncedSearch]);

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

  const renderExercise = useCallback(
    ({ item, index }) => (
      <ExerciseCard
        item={item}
        index={index}
        onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}
        isFavorite={favoriteIds.has(item.id)}
        onFavorite={() => onToggleFavorite(item)}
      />
    ),
    [favoriteIds, navigation, onToggleFavorite]
  );

  const renderFilterChip = useCallback(
    ({ item }) => (
      <Pressable
        onPress={() => setBodyPartFilter(item)}
        style={[styles.filterChip, bodyPartFilter === item && styles.filterChipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: bodyPartFilter === item }}
        accessibilityLabel={`Filter exercises by ${item}`}
      >
        <Text style={[styles.filterText, bodyPartFilter === item && styles.filterTextActive]}>{item}</Text>
      </Pressable>
    ),
    [bodyPartFilter, setBodyPartFilter]
  );

  const renderSkeletons = () => (
    <View>
      {[0, 1, 2, 3].map((key) => (
        <SkeletonCard key={`exercise-skeleton-${key}`} variant="exercise" />
      ))}
    </View>
  );

  const onEndReached = useCallback(() => {
    if (bodyPartFilter === 'all' && hasMore && !isLoadingMore && !loadingExercises) {
      loadMoreExercises();
    }
  }, [bodyPartFilter, hasMore, isLoadingMore, loadingExercises, loadMoreExercises]);

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {exercisesError ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="alert-circle-outline"
              title="Could not load exercises"
              subtitle={exercisesError}
            />
            <AppButton title="Try Again" variant="secondary" onPress={refreshExercises} />
          </View>
        ) : null}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search exercises by name"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={BODY_PART_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          initialNumToRender={12}
          renderItem={renderFilterChip}
        />
        <Text style={styles.recoLabel}>Goal Focus: {goal}</Text>
        <FlatList
          data={filteredExercises}
          keyExtractor={(item, index) => (item.id != null ? String(item.id) : `ex-${index}`)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={8}
          removeClippedSubviews
          renderItem={renderExercise}
          ListHeaderComponent={loadingExercises && !filteredExercises.length ? renderSkeletons : null}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No exercises found yet"
              subtitle="Try another keyword or body area filter to discover more."
            />
          }
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  searchWrap: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F9FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  filterList: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8EEF7',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.primary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  recoLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  errorWrap: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
});

export default ExerciseListScreen;
