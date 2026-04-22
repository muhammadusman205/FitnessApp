// EXPO_PUBLIC_* variables: loaded by Expo from `.env` (see `app.config.js` + Metro inlining).
// Do NOT use `import 'dotenv/config'` here — it depends on Node `fs` and can break the native bundle.
// After changing `.env`: npx expo start -c

import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';

import App from './App';

registerRootComponent(App);
