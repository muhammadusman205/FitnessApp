import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
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
  const { progress, addProgressEntry, deleteProgressEntry, loadingUserData, userDataError, refreshUserData } = useFitness();
  const { showToast } = useToast();
  const [weight, setWeight] = useState('');
  const [completedWorkouts, setCompletedWorkouts] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [chartWidth, setChartWidth] = useState(Math.max(Dimensions.get('window').width - 32, 240));

  const parseEntryDate = (entry) => {
    if (!entry) return null;
    if (entry.createdAt?.seconds) {
      return new Date(entry.createdAt.seconds * 1000);
    }
    if (typeof entry.date === 'number') return new Date(entry.date);
    if (typeof entry.date === 'string') {
      const parsed = new Date(entry.date);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const formatDisplayDate = (entry, withTime = false) => {
    const dt = parseEntryDate(entry);
    if (!dt) return '--';
    return dt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: withTime ? undefined : 'numeric',
      hour: withTime ? 'numeric' : undefined,
      minute: withTime ? '2-digit' : undefined,
    });
  };

  useEffect(() => {
    console.log('[ProgressTrackingScreen] Progress entries in UI:', progress.length);
  }, [progress.length]);

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
      setSavingProgress(true);
      console.log('[ProgressTrackingScreen] Saving progress input:', { weightValue, workoutsValue });
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
    } finally {
      setSavingProgress(false);
    }
  };

  const onDeleteEntry = (item) => {
    Alert.alert('Delete Entry?', 'This progress entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProgressEntry(item.docId);
            showToast('Progress entry deleted.');
          } catch (error) {
            showToast('Could not delete progress entry.', 'error');
          }
        },
      },
    ]);
  };

  const chartData = useMemo(() => {
    const recent = [...progress].slice(-6);
    const dayCount = recent.reduce((acc, item) => {
      const dateKey = formatDisplayDate(item, false).replace(/,\s*\d{4}$/, '');
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: recent.map((item) => {
        const dateLabel = formatDisplayDate(item, false).replace(/,\s*\d{4}$/, '');
        if ((dayCount[dateLabel] || 0) > 1) {
          return formatDisplayDate(item, true).replace(/,\s*\d{4}/, '');
        }
        return dateLabel;
      }),
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
    if (latest <= previous) return 'Progress is improving. Great consistency this week.';
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
          <AppButton title="Save Progress" onPress={onSave} loading={savingProgress} />
        </Card>

        {userDataError ? (
          <View style={styles.errorWrap}>
            <EmptyState icon="cloud-offline-outline" title="Could not load progress" subtitle={userDataError} />
            <AppButton title="Retry Sync" variant="secondary" onPress={refreshUserData} />
          </View>
        ) : null}
        {loadingUserData && !progress.length ? <LoadingState label="Loading progress history..." /> : null}
        <Text style={styles.sectionTitle}>Weight Trend</Text>
        {chartData.labels.length > 0 ? (
          <View
            style={styles.chartWrap}
            onLayout={(event) => {
              const nextWidth = Math.max(event.nativeEvent.layout.width - theme.spacing.sm, 240);
              if (Math.abs(nextWidth - chartWidth) > 2) {
                setChartWidth(nextWidth);
              }
            }}
          >
            <LineChart
              data={chartData}
              width={chartWidth}
              height={220}
              yAxisSuffix="kg"
              chartConfig={{
                backgroundGradientFrom: theme.colors.progressChartBackground,
                backgroundGradientTo: theme.colors.progressChartBackground,
                decimalPlaces: 1,
                color: () => theme.colors.primary,
                labelColor: () => theme.colors.textSecondary,
                propsForBackgroundLines: { stroke: theme.colors.border, strokeDasharray: '' },
                propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
              }}
              bezier
              style={styles.chart}
              accessibilityLabel="Weight trend chart"
              accessibilityHint="Shows your recent weight trend over time."
            />
          </View>
        ) : (
          <EmptyState
            icon="stats-chart-outline"
            title="No progress yet"
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
          keyExtractor={(item, index) => item.docId || `progress-${index}`}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <Card style={styles.item}>
              <Pressable
                style={styles.deleteIconButton}
                onPress={() => onDeleteEntry(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete progress entry for ${formatDisplayDate(item)}`}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </Pressable>
              <Text style={styles.itemDate}>{formatDisplayDate(item)}</Text>
              <Text style={styles.itemWeight}>{item.weight} kg</Text>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutBadgeText}>Workouts: {item.completedWorkouts}</Text>
              </View>
              <Pressable
                onPress={() => onDeleteEntry(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete progress entry for ${formatDisplayDate(item)}`}
                accessibilityHint="Removes this progress log entry."
              >
                <Text style={styles.deleteAction}>Delete</Text>
              </Pressable>
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
  chartWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  item: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    position: 'relative',
  },
  itemDate: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  itemWeight: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
  },
  workoutBadge: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.cardTintBlueLight,
  },
  workoutBadgeText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  deleteIconButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.cardTintBlueSoft,
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
  errorWrap: {
    marginBottom: theme.spacing.sm,
  },
  deleteAction: {
    marginTop: theme.spacing.xs,
    color: theme.colors.danger,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
});

export default ProgressTrackingScreen;
