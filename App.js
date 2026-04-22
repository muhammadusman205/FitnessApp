import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { FitnessProvider } from './src/context/FitnessContext';
import { WorkoutHistoryProvider } from './src/context/WorkoutHistoryContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/utils/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <FitnessProvider>
              <WorkoutHistoryProvider>
                <StatusBar style="dark" backgroundColor={theme.colors.secondaryBackground} />
                <AppNavigator />
              </WorkoutHistoryProvider>
            </FitnessProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
