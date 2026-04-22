import { memo, useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';
import { useScalePress } from '../hooks/useScalePress';

const { width: SCREEN_W } = Dimensions.get('window');
export const PROGRAM_CARD_WIDTH = Math.min(SCREEN_W * 0.82, 320);
const CARD_HEIGHT = 200;

const ProgramCard = ({ program, onPress, index = 0 }) => {
  const { animatedStyle, onPressIn, onPressOut } = useScalePress({ activeScale: 0.97 });
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index * 50, 200),
      useNativeDriver: true,
    }).start();
  }, [fadeIn, index]);

  const tint = program.heroTint || theme.colors.primary;

  return (
    <Animated.View style={[styles.wrap, { width: PROGRAM_CARD_WIDTH, opacity: fadeIn }, animatedStyle]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.press}>
        <View style={[styles.card, { shadowOpacity: 0.18, elevation: 6 }]}>
          <LinearGradient
            colors={[tint, '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.bottomFade}
          />
          <View style={styles.badgesRow}>
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>{program.estimatedMinutes} min</Text>
            </View>
            <View style={styles.diffPill}>
              <Text style={styles.diffText}>{program.difficulty}</Text>
            </View>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {program.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {program.description}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginRight: theme.spacing.sm,
  },
  press: {
    borderRadius: theme.radius.lg,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  bottomFade: {
    ...StyleSheet.absoluteFillObject,
    top: '45%',
  },
  badgesRow: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  diffPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textBlock: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  desc: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
});

export default memo(ProgramCard);
