import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import { useFitness } from '../context/FitnessContext';
import { theme } from '../utils/theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useToast } from '../context/ToastContext';

const WorkoutPlannerScreen = () => {
  const { workouts, addWorkout, loadingUserData } = useFitness();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');

  const onAddWorkout = async () => {
    const normalizedTitle = title.trim();
    const normalizedDay = day.trim();
    if (!normalizedTitle || !normalizedDay) {
      showToast('Add both workout title and day.', 'error');
      return;
    }
    try {
      await addWorkout({ title: normalizedTitle, day: normalizedDay });
      showToast('Workout plan saved.');
      setTitle('');
      setDay('');
    } catch (error) {
      showToast('Could not save workout plan.', 'error');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Create Workout Plan</Text>
          <InputField label="Workout title" value={title} onChangeText={setTitle} placeholder="Upper Body Strength" />
          <InputField label="Day" value={day} onChangeText={setDay} placeholder="Monday" />
          <AppButton title="Save Workout" onPress={onAddWorkout} />
        </Card>
        <Text style={styles.listTitle}>Your Plans</Text>
        {loadingUserData ? <LoadingState label="Loading workouts..." /> : null}
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.docId}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.day}</Text>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No workouts yet 💪"
              subtitle="Start by creating one and keep your week organized."
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
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  listTitle: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  item: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  itemTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default WorkoutPlannerScreen;
