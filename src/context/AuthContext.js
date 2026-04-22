import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, firebaseInitError, isFirebaseConfigValid } from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const createConfigError = useCallback(() => {
    const error = new Error(
      firebaseInitError?.message ||
        'Expo is not loading .env. Check file location and restart with cache clear. Run: npx expo start -c'
    );
    error.code = 'app/firebase-config-invalid';
    return error;
  }, []);

  const signup = useCallback(async (email, password) => {
    if (!isFirebaseConfigValid || !auth) {
      throw createConfigError();
    }
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Signup Firebase error:', { code: error?.code, message: error?.message });
      throw error;
    }
  }, [createConfigError]);

  const login = useCallback(async (email, password) => {
    if (!isFirebaseConfigValid || !auth) {
      throw createConfigError();
    }
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login Firebase error:', { code: error?.code, message: error?.message });
      throw error;
    }
  }, [createConfigError]);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      login,
      signup,
      logout: () => (auth ? signOut(auth) : Promise.resolve()),
    }),
    [user, authLoading, login, signup]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
