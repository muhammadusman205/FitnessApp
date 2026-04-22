import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../utils/theme';
import Card from '../components/Card';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const mapLoginError = (error) => {
    const code = error?.code || 'unknown';
    const message = error?.message || 'Login failed.';

    console.error('Login Screen error:', { code, message });

    if (code === 'auth/invalid-email') {
      return { fieldErrors: { email: 'Enter a valid email address.' }, toast: 'Invalid email format.' };
    }
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return { fieldErrors: { password: 'Email or password is incorrect.' }, toast: 'Invalid credentials.' };
    }
    if (code === 'auth/network-request-failed') {
      return { fieldErrors: {}, toast: 'Check your internet connection.' };
    }
    if (code === 'auth/weak-password') {
      return { fieldErrors: { password: 'Password is too weak.' }, toast: 'Password is too weak.' };
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

  const onLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      setErrors({});
      await login(email.trim(), password);
      showToast('Welcome back! Ready for your next workout.');
    } catch (error) {
      const parsed = mapLoginError(error);
      setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      showToast(parsed.toast, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to continue your fitness journey.</Text>
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
          placeholder="Your password"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          error={errors.password}
        />
        <AppButton title="Log In" onPress={onLogin} loading={loading} />
        <AppButton title="Create account" variant="secondary" onPress={() => navigation.navigate('Signup')} />
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

export default LoginScreen;
