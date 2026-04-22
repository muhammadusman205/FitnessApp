import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../utils/theme';
import Card from '../components/Card';

const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const mapSignupError = (error) => {
    const code = error?.code || 'unknown';
    const message = error?.message || 'Signup failed.';

    console.error('Signup Screen error:', { code, message });

    if (code === 'auth/email-already-in-use') {
      return { fieldErrors: { email: 'This email is already registered.' }, toast: 'Email already in use.' };
    }
    if (code === 'auth/invalid-email') {
      return { fieldErrors: { email: 'Enter a valid email address.' }, toast: 'Invalid email format.' };
    }
    if (code === 'auth/weak-password') {
      return { fieldErrors: { password: 'Password is too weak.' }, toast: 'Password is too weak.' };
    }
    if (code === 'auth/network-request-failed') {
      return { fieldErrors: {}, toast: 'Check your internet connection.' };
    }
    if (code === 'app/firebase-config-invalid') {
      return { fieldErrors: {}, toast: message };
    }
    if (code === 'auth/invalid-api-key') {
      return { fieldErrors: {}, toast: 'App is not configured properly.' };
    }
    return { fieldErrors: {}, toast: message };
  };

  const validate = () => {
    const nextErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSignup = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      setErrors({});
      await signup(email.trim(), password);
      showToast('Account created! Let us crush your goals.');
    } catch (error) {
      const parsed = mapSignupError(error);
      setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      showToast(parsed.toast, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start tracking workouts and progress.</Text>
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          error={errors.email}
        />
        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Minimum 6 characters"
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="done"
          error={errors.password}
        />
        <AppButton title="Sign Up" onPress={onSignup} loading={loading} />
        <AppButton title="Back to Log In" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
});

export default SignupScreen;
