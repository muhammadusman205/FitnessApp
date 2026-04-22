import { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { useFadeIn } from '../hooks/useFadeIn';
import { useScalePress } from '../hooks/useScalePress';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80';

const IMAGE_HEIGHT_LIST = 168;
const IMAGE_HEIGHT_CAROUSEL = 188;

const ExerciseCard = ({ item, onPress, onFavorite, isFavorite, index = 0, layout = 'list', cardWidth }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSource, setImageSource] = useState(item.gifUrl || PLACEHOLDER_IMAGE);
  const fadeAnim = useFadeIn(index);
  const { animatedStyle, onPressIn, onPressOut } = useScalePress({ activeScale: 0.97 });

  const isCarousel = layout === 'carousel';
  const imageH = isCarousel ? IMAGE_HEIGHT_CAROUSEL : IMAGE_HEIGHT_LIST;
  const widthStyle = cardWidth ? { width: cardWidth } : { alignSelf: 'stretch' };

  const muscle = (item.target || 'full body').toString();
  const equip = (item.equipment || 'body weight').toString();

  useEffect(() => {
    setImageSource(item.gifUrl || PLACEHOLDER_IMAGE);
    setImageLoading(true);
  }, [item.id, item.gifUrl]);

  return (
    <Animated.View style={[widthStyle, styles.outer, { opacity: fadeAnim }, animatedStyle]}>
      <View style={[styles.cardShadow, isCarousel && styles.cardShadowCarousel]}>
        <View style={styles.card}>
          <View style={[styles.imageWrap, { height: imageH }]}>
            <Pressable
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.imagePress}
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${item.name}`}
              accessibilityHint="Opens the exercise detail screen."
            >
              <Image
                source={{ uri: imageSource, cache: 'force-cache' }}
                style={[styles.image, { height: imageH }]}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageSource(PLACEHOLDER_IMAGE);
                  setImageLoading(false);
                }}
              />
              {imageLoading ? (
                <View style={[styles.skeleton, { height: imageH }]}>
                  <ActivityIndicator size="small" color={theme.colors.white} />
                </View>
              ) : null}
              <LinearGradient
                colors={['transparent', theme.colors.overlayDarkMid, theme.colors.overlayDarkHeavy]}
                locations={[0, 0.45, 1]}
                style={styles.imageGradient}
              />
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {muscle}
                  </Text>
                </View>
                <View style={[styles.chip, styles.chipAlt]}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {equip}
                  </Text>
                </View>
              </View>
              <View style={styles.titleBlock}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.favBtn}
              onPress={onFavorite}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.name} ${isFavorite ? 'from' : 'to'} favorites`}
              accessibilityHint="Toggles this exercise in your favorites list."
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={theme.colors.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outer: {
    marginBottom: theme.spacing.sm,
  },
  cardShadow: {
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  cardShadowCarousel: {
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  card: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  imagePress: {
    flex: 1,
    height: '100%',
  },
  image: {
    width: '100%',
    backgroundColor: theme.colors.imageFallbackDark,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.imageLoadingOverlay,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.overlayDarkSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  chipRow: {
    position: 'absolute',
    bottom: 52,
    left: 12,
    right: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.whiteTransparentOverlay,
    borderWidth: 1,
    borderColor: theme.colors.whiteTransparentLight,
  },
  chipAlt: {
    backgroundColor: theme.colors.whiteTransparentOverlay,
    borderColor: theme.colors.whiteTransparentLightest,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
    textTransform: 'capitalize',
  },
  titleBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: -0.2,
    textShadowColor: theme.colors.overlayBlackMedium,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default memo(ExerciseCard);
