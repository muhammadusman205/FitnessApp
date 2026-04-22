import { useMemo, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ScreenContainer from '../components/ScreenContainer';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import { useFitness } from '../context/FitnessContext';
import { theme } from '../utils/theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useToast } from '../context/ToastContext';

const ProgressTrackingScreen = () => {
  const { progress, addProgressEntry, loadingUserData } = useFitness();
  const { showToast } = useToast();
  const [weight, setWeight] = useState('');
  const [completedWorkouts, setCompletedWorkouts] = useState('');

  const onSave = async () => {
    const weightValue = Number(weight);
    const workoutsValue = Number(completedWorkouts);

    if (!weight || !completedWorkouts) {
      showToast('Please enter both weight and workouts.', 'error');
      return;
    }
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      showToast('Enter a valid weight greater than 0.', 'error');
      return;
    }
    if (!Number.isInteger(workoutsValue) || workoutsValue < 0) {
      showToast('Workouts must be a whole number of 0 or more.', 'error');
      return;
    }
    try {
      await addProgressEntry({
        weight: weightValue,
        completedWorkouts: workoutsValue,
        date: new Date().toISOString().slice(0, 10),
      });
      showToast('Progress saved.');
      setWeight('');
      setCompletedWorkouts('');
    } catch (error) {
      showToast('Could not save progress entry.', 'error');
    }
  };

  const chartData = useMemo(() => {
    const recent = [...progress].slice(-6);
    return {
      labels: recent.map((item) => item.date?.slice(5) || '--'),
      datasets: [{ data: recent.map((item) => Number(item.weight) || 0) }],
    };
  }, [progress]);

  const weeklyWorkouts = useMemo(
    () => progress.slice(-7).reduce((acc, item) => acc + (Number(item.completedWorkouts) || 0), 0),
    [progress]
  );

  const trendText = useMemo(() => {
    if (progress.length < 2) return 'Keep logging to unlock progress insights.';
    const latest = Number(progress[progress.length - 1]?.weight || 0);
    const previous = Number(progress[progress.length - 2]?.weight || 0);
    if (latest <= previous) return 'Progress improving 📈 Great consistency this week.';
    return 'You are actively tracking. Stay steady and keep improving.';
  }, [progress]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>Log Progress</Text>
          <InputField
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="70"
            keyboardType="decimal-pad"
          />
          <InputField
            label="Workouts completed"
            value={completedWorkouts}
            onChangeText={setCompletedWorkouts}
            placeholder="4"
            keyboardType="numeric"
          />
          <AppButton title="Save Progress" onPress={onSave} />
        </Card>

        {loadingUserData ? <LoadingState label="Loading progress history..." /> : null}
        <Text style={styles.sectionTitle}>Weight Trend</Text>
        {chartData.labels.length > 0 ? (
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 32}
            height={220}
            yAxisSuffix="kg"
            chartConfig={{
              backgroundGradientFrom: '#F3F7FF',
              backgroundGradientTo: '#F3F7FF',
              decimalPlaces: 1,
              color: () => theme.colors.primary,
              labelColor: () => theme.colors.textSecondary,
              propsForBackgroundLines: { stroke: '#DBE5F2', strokeDasharray: '' },
              propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <EmptyState
            icon="stats-chart-outline"
            title="No progress yet 📊"
            subtitle="Log your first entry to visualize your journey."
          />
        )}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Weekly Summary</Text>
          <Text style={styles.summaryText}>You worked out {weeklyWorkouts} times this week.</Text>
          <Text style={styles.summaryText}>{trendText}</Text>
        </Card>

        <FlatList
          data={progress}
          keyExtractor={(item) => item.docId}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Text style={styles.itemText}>
                {item.date}: {item.weight}kg, workouts: {item.completedWorkouts}
              </Text>
            </Card>
          )}
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
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chart: {
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  item: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  itemText: {
    color: theme.colors.textSecondary,
  },
  summaryCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: '#EDF6FF',
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
});

export default ProgressTrackingScreen;
