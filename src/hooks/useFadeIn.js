import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const useFadeIn = (index = 0, baseDelay = 40) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index * baseDelay, 280),
      useNativeDriver: true,
    }).start();
  }, [opacity, index, baseDelay]);

  return opacity;
};
