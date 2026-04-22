import { StyleSheet, View } from 'react-native';
import { theme } from '../utils/theme';

const Card = ({ children, style }) => {
  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow,
  },
});

export default Card;
