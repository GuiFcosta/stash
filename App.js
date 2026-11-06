import React from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from '@expo-google-fonts/space-grotesk';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, } from '@expo-google-fonts/space-grotesk';
import { MonthProvider } from './src/context/MonthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';

// Importar os ecrãs
import HomeScreen from './src/screens/HomeScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import './src/services/NotificationService'; // Inicializa handlers de notificação

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.textDark,
          tabBarInactiveTintColor: colors.textDisabled,
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontFamily: 'SpaceGrotesk_700Bold',
            fontSize: 9.5,
            textTransform: 'uppercase',
            letterSpacing: 0.1,
            marginTop: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.borderSubtle || '#E5E7EB',
            borderTopWidth: 1,
            elevation: 12,
            height: 58 + bottomInset,
            paddingBottom: bottomInset + 4,
            paddingTop: 8,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Início') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Objetivos') {
              iconName = focused ? 'flag' : 'flag-outline';
            } else if (route.name === 'Por Pessoa') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Relatórios') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'Perfil' || route.name === 'Meu Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name={iconName} size={21} color={focused ? colors.primaryLight : color} />
                {focused && (
                  <View style={{ width: 12, height: 2, backgroundColor: colors.primaryLight, marginTop: 2 }} />
                )}
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Início" component={HomeScreen} />
        <Tab.Screen name="Objetivos" component={GoalsScreen} />
        <Tab.Screen name="Por Pessoa" component={SummaryScreen} />
        <Tab.Screen name="Relatórios" component={ReportsScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function RootNavigation() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <MainTabs />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...(Ionicons.font || {}),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <MonthProvider>
              <RootNavigation />
            </MonthProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
