import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

const LoadingState = ({ label = 'Loading...' }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="barbell-outline" size={16} color={theme.colors.primary} />
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  label: {
    marginLeft: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default LoadingState;
