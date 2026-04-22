import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

const SkeletonCard = ({ variant = 'exercise', style }) => {
  const shimmerTranslate = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 220,
        duration: 950,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerTranslate]);

  const isExercise = variant === 'exercise';

  return (
    <View style={[styles.card, isExercise ? styles.exerciseCard : styles.blockCard, style]}>
      {isExercise ? (
        <>
          <View style={styles.exerciseImage} />
          <View style={styles.exerciseContent}>
            <View style={[styles.line, styles.lineWide]} />
            <View style={[styles.line, styles.lineMid]} />
            <View style={[styles.line, styles.lineSmall]} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.line, styles.lineWide]} />
          <View style={[styles.line, styles.lineMid]} />
        </>
      )}
      <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]}>
        <LinearGradient colors={['transparent', '#FFFFFF90', 'transparent']} style={styles.shimmerGradient} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E7EEF7',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  exerciseCard: {
    flexDirection: 'row',
    height: 110,
    marginBottom: theme.spacing.sm,
  },
  blockCard: {
    height: 90,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  exerciseImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#DCE6F3',
    margin: 7,
  },
  exerciseContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: theme.spacing.sm,
  },
  line: {
    height: 12,
    borderRadius: 7,
    backgroundColor: '#D7E2F0',
    marginBottom: 10,
  },
  lineWide: {
    width: '88%',
  },
  lineMid: {
    width: '62%',
  },
  lineSmall: {
    width: '45%',
    marginBottom: 0,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: '55%',
  },
  shimmerGradient: {
    flex: 1,
  },
});

export default SkeletonCard;
