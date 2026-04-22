import { useRef } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

export const useScalePress = ({ activeScale = 0.97, withHaptics = false } = {}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = async () => {
    if (withHaptics) {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        // Ignore haptic failures on unsupported environments.
      }
    }
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
  };

  return {
    animatedStyle: { transform: [{ scale }] },
    onPressIn,
    onPressOut,
  };
};
