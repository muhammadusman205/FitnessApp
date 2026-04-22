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

// Per-variable debug (loaded vs missing)
const logEnvPresence = (label, value) => {
  const status = isMissingOrInvalid(value) ? '[missing]' : '[loaded]';
  if (isDev) {
    console.log(`[Firebase env] ${label}:`, status);
  }
};

logEnvPresence('EXPO_PUBLIC_FIREBASE_API_KEY', env.apiKey);
logEnvPresence('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', env.authDomain);
logEnvPresence('EXPO_PUBLIC_FIREBASE_PROJECT_ID', env.projectId);
logEnvPresence('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', env.storageBucket);
logEnvPresence('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', env.messagingSenderId);
logEnvPresence('EXPO_PUBLIC_FIREBASE_APP_ID', env.appId);

// Metro inlines EXPO_PUBLIC_* at bundle time; `process.env` may not list every key on device.
// Verify injection by reading each variable statically (required by Expo).
const envSnapshot = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '[set]' : '[missing]',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? '[set]' : '[missing]',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '[set]' : '[missing]',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ? '[set]' : '[missing]',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '[set]' : '[missing]',
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? '[set]' : '[missing]',
};
if (isDev) {
  console.log('[Firebase] EXPO_PUBLIC_FIREBASE_* (Metro static injection check):', envSnapshot);
}

const firebaseEnvKeys = Object.keys(process.env || {}).filter((k) => k.startsWith('EXPO_PUBLIC_FIREBASE_'));
if (isDev) {
  console.log('[Firebase] process.env keys matching EXPO_PUBLIC_FIREBASE_* (may be empty on RN):', firebaseEnvKeys);
}

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

export { auth };
export { db };
