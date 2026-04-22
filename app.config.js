/**
 * Load `.env` from project root before Expo reads config / Metro bundles.
 * This runs in Node when you run `npx expo start` (not inside the device JS runtime).
 *
 * After editing `.env`, restart with cache clear:
 *   npx expo start -c
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: 'FitnessApp',
    slug: 'fitnessapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.muham.fitnessapp',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
  },
};
