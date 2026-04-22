import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProgramDetailScreen from '../screens/ProgramDetailScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import { getProgramById } from '../data/workoutPrograms';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import WorkoutPlannerScreen from '../screens/WorkoutPlannerScreen';
import ProgressTrackingScreen from '../screens/ProgressTrackingScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import { useAuth } from '../context/AuthContext';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ExerciseStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.secondaryBackground,
    card: theme.colors.white,
    text: theme.colors.textPrimary,
    primary: theme.colors.primary,
    border: theme.colors.border,
  },
};

const ExerciseStackNavigator = () => (
  <ExerciseStack.Navigator
    screenOptions={{
      gestureEnabled: true,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: theme.colors.secondaryBackground },
    }}
  >
    <ExerciseStack.Screen name="ExerciseList" component={ExerciseListScreen} options={{ title: 'Exercises' }} />
    <ExerciseStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise Detail' }} />
  </ExerciseStack.Navigator>
);

const HomeStackNavigator = () => (
  <HomeStack.Navigator
    screenOptions={{
      gestureEnabled: true,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: theme.colors.secondaryBackground },
    }}
  >
    <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
    <HomeStack.Screen
      name="ProgramDetail"
      component={ProgramDetailScreen}
      options={({ route }) => {
        const program = getProgramById(route.params?.programId);
        return {
          title: program?.title ?? 'Program',
          headerStyle: { backgroundColor: theme.colors.secondaryBackground },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: '700', color: theme.colors.textPrimary },
        };
      }}
    />
  </HomeStack.Navigator>
);

const TabsNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
      },
      tabBarStyle: {
        backgroundColor: '#F9FBFF',
        borderTopColor: theme.colors.border,
        height: 66,
        paddingTop: 6,
      },
      tabBarIcon: ({ color, size, focused }) => {
        const iconSize = focused ? size + 2 : size;
        if (route.name === 'Home') return <Ionicons name="home-outline" size={iconSize} color={color} />;
        if (route.name === 'Exercises') {
          return <MaterialCommunityIcons name="dumbbell" size={iconSize} color={color} />;
        }
        if (route.name === 'Favorites') return <Ionicons name="heart-outline" size={iconSize} color={color} />;
        if (route.name === 'Planner') return <Ionicons name="calendar-outline" size={iconSize} color={color} />;
        return <Ionicons name="stats-chart-outline" size={iconSize} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStackNavigator} />
    <Tab.Screen name="Exercises" component={ExerciseStackNavigator} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
    <Tab.Screen name="Planner" component={WorkoutPlannerScreen} />
    <Tab.Screen name="Progress" component={ProgressTrackingScreen} />
  </Tab.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'fade',
      gestureEnabled: true,
      contentStyle: { backgroundColor: theme.colors.secondaryBackground },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const AppNavigator = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: true,
          contentStyle: { backgroundColor: theme.colors.secondaryBackground },
        }}
      >
        {user ? (
          <>
            <RootStack.Screen name="AppTabs" component={TabsNavigator} />
            <RootStack.Screen
              name="ActiveWorkout"
              component={ActiveWorkoutScreen}
              options={{
                headerShown: true,
                title: 'Active Workout',
                headerStyle: { backgroundColor: theme.colors.secondaryBackground },
                headerTintColor: theme.colors.primary,
                headerTitleStyle: { fontWeight: '700', color: theme.colors.textPrimary },
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondaryBackground,
  },
});

export default AppNavigator;
