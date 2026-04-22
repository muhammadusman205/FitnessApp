import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../utils/theme';
import { useScalePress } from '../hooks/useScalePress';

const AppButton = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isSecondary = variant === 'secondary';
  const isDisabled = loading || disabled || typeof onPress !== 'function';
  const { animatedStyle, onPressIn, onPressOut } = useScalePress({ activeScale: 0.97, withHaptics: true });
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.button,
          isSecondary ? styles.secondaryButton : styles.primaryButton,
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={isSecondary ? theme.colors.primary : theme.colors.white} />
        ) : (
          <Text style={[styles.text, isSecondary ? styles.secondaryText : styles.primaryText]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: '#E8EEF7',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.primary,
  },
});

export default AppButton;
