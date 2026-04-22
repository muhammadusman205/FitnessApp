import { createContext, useContext, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { theme } from '../utils/theme';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState(null);
  const [type, setType] = useState('success');
  const [opacity] = useState(new Animated.Value(0));

  const showToast = (nextMessage, nextType = 'success') => {
    setMessage(nextMessage);
    setType(nextType);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setMessage(null);
    });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            type === 'error' ? styles.errorToast : styles.successToast,
            { opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
          ]}
        >
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 26,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...theme.shadow,
  },
  successToast: {
    backgroundColor: '#EAF8EF',
    borderWidth: 1,
    borderColor: '#C7EFD6',
  },
  errorToast: {
    backgroundColor: '#FCECED',
    borderWidth: 1,
    borderColor: '#F6CACA',
  },
  toastText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
