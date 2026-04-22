import { initializeApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Web SDK fields only (from Firebase Console > Project settings > General > Your apps).
// Developer MUST create `.env` in the project root (same level as package.json) with EXPO_PUBLIC_* keys.
// After modifying `.env`, restart Expo with a clean cache or env changes will not apply:
//   npx expo start -c
//
// Email/Password sign-in must be enabled in Firebase Console > Authentication > Sign-in method.

const env = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  messagingSenderId: env.messagingSenderId,
  appId: env.appId,
};

/** All fields required by Firebase Web config */
const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const isMissingOrInvalid = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (trimmed === '') return true;
  if (trimmed.includes('YOUR_') || trimmed.includes('your_key') || trimmed.startsWith('REPLACE')) return true;
  return false;
};

const invalidConfigKeys = requiredConfigKeys.filter((key) => isMissingOrInvalid(firebaseConfig[key]));

export const isFirebaseConfigValid = invalidConfigKeys.length === 0;

const CONFIG_ERROR_MESSAGE =
  'Expo is not loading .env. Check file location and restart with cache clear. Run: npx expo start -c';

export const firebaseInitError = !isFirebaseConfigValid ? new Error(CONFIG_ERROR_MESSAGE) : null;

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

if (!isFirebaseConfigValid) {
  if (isDev) {
    console.warn('[Firebase] Missing or invalid keys:', invalidConfigKeys);
  }
  const configStatus = {};
  requiredConfigKeys.forEach((key) => {
    configStatus[key] = isMissingOrInvalid(firebaseConfig[key]) ? '[missing]' : '[loaded]';
  });
  if (isDev) {
    console.log('[Firebase] firebaseConfig (status per key):', configStatus);
  }
  console.error(CONFIG_ERROR_MESSAGE);
}

let app = null;
let auth;
let db = null;

if (!isFirebaseConfigValid) {
  // Do not initialize Firebase with undefined config
} else {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    auth = getAuth(app);
  }
  db = getFirestore(app);
}

if (isDev) {
  console.log(
    isFirebaseConfigValid && auth && db
      ? 'Firebase initialized successfully.'
      : 'Firebase initialization incomplete. Check environment and setup.'
  );
}

export { auth };
export { db };
