import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useFitness } from '../context/FitnessContext';
import ExerciseCard from '../components/ExerciseCard';
import { theme } from '../utils/theme';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import SkeletonCard from '../components/SkeletonCard';
import AppButton from '../components/AppButton';

const FavoritesScreen = ({ navigation }) => {
  const { favorites, toggleFavorite, loadingUserData, userDataError, refreshUserData } = useFitness();
  const { showToast } = useToast();

  const onRemoveFavorite = useCallback(
    async (item) => {
      try {
        await toggleFavorite(item);
        showToast('Removed from favorites.');
      } catch (error) {
        showToast('Could not update favorites.', 'error');
      }
    },
    [showToast, toggleFavorite]
  );

  const renderFavoriteItem = useCallback(
    ({ item, index }) => (
      <ExerciseCard
        item={item}
        index={index}
        onPress={() => navigation.navigate('Exercises', { screen: 'ExerciseDetail', params: { exercise: item } })}
        isFavorite
        onFavorite={() => onRemoveFavorite(item)}
      />
    ),
    [navigation, onRemoveFavorite]
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {userDataError ? (
          <View style={styles.errorWrap}>
            <EmptyState icon="cloud-offline-outline" title="Could not load favorites" subtitle={userDataError} />
            <AppButton title="Retry Sync" variant="secondary" onPress={refreshUserData} />
          </View>
        ) : null}
        {loadingUserData && !favorites.length ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((key) => (
              <SkeletonCard key={`favorites-skeleton-${key}`} variant="exercise" />
            ))}
          </View>
        ) : null}
        <FlatList
          data={favorites}
          keyExtractor={(item, index) => item.docId || item.id || `favorite-${index}`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={8}
          removeClippedSubviews
          renderItem={renderFavoriteItem}
          ListEmptyComponent={!loadingUserData ? (
            <EmptyState
              icon="heart-outline"
              title="No favorites yet"
              subtitle="Save exercises from the list and build your personal collection."
            />
          ) : null}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  skeletonWrap: {
    marginBottom: theme.spacing.sm,
  },
  errorWrap: {
    marginBottom: theme.spacing.sm,
  },
});

export default FavoritesScreen;
