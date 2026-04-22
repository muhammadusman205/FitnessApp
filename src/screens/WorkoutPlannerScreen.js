import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const { workouts, addWorkout, updateWorkout, deleteWorkout, loadingUserData, userDataError, refreshUserData } = useFitness();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDay, setEditingDay] = useState('');

  const plannedWorkouts = useMemo(
    () => workouts.filter((item) => (item.kind || 'plan') === 'plan'),
    [workouts]
  );

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

  const startEditing = (item) => {
    setEditingId(item.docId);
    setEditingTitle(item.title || '');
    setEditingDay(item.day || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
    setEditingDay('');
  };

  const onSaveEdit = async () => {
    const normalizedTitle = editingTitle.trim();
    const normalizedDay = editingDay.trim();
    if (!normalizedTitle || !normalizedDay || !editingId) {
      showToast('Add both workout title and day.', 'error');
      return;
    }
    try {
      await updateWorkout(editingId, { title: normalizedTitle, day: normalizedDay });
      showToast('Workout plan updated.');
      cancelEditing();
    } catch (error) {
      showToast('Could not update workout plan.', 'error');
    }
  };

  const onDeleteWorkout = (item) => {
    Alert.alert('Delete Plan?', 'This workout plan will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkout(item.docId);
            showToast('Workout plan deleted.');
            if (editingId === item.docId) cancelEditing();
          } catch (error) {
            showToast('Could not delete workout plan.', 'error');
          }
        },
      },
    ]);
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
        {userDataError ? (
          <View style={styles.errorWrap}>
            <EmptyState icon="cloud-offline-outline" title="Could not load plans" subtitle={userDataError} />
            <AppButton title="Retry Sync" variant="secondary" onPress={refreshUserData} />
          </View>
        ) : null}
        {loadingUserData ? <LoadingState label="Loading workouts..." /> : null}
        <FlatList
          data={plannedWorkouts}
          keyExtractor={(item, index) => item.docId || `workout-${index}`}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              {editingId === item.docId ? (
                <>
                  <InputField label="Workout title" value={editingTitle} onChangeText={setEditingTitle} />
                  <InputField label="Day" value={editingDay} onChangeText={setEditingDay} />
                  <View style={styles.actionRow}>
                    <AppButton title="Save" onPress={onSaveEdit} />
                    <AppButton title="Cancel" variant="secondary" onPress={cancelEditing} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.day}</Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => startEditing(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.title} plan`}
                      accessibilityHint="Enables editing for this workout plan."
                    >
                      <Text style={styles.editAction}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDeleteWorkout(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title} plan`}
                      accessibilityHint="Deletes this workout plan."
                    >
                      <Text style={styles.deleteAction}>Delete</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No workouts yet"
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
  errorWrap: {
    marginBottom: theme.spacing.sm,
  },
  rowActions: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  editAction: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  deleteAction: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});

export default WorkoutPlannerScreen;
