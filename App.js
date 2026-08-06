import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MonthProvider } from './src/context/MonthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Importar os ecrãs
import HomeScreen from './src/screens/HomeScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors, isDarkMode } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: isDarkMode ? '#60A5FA' : '#1E3A8A',
          tabBarInactiveTintColor: isDarkMode ? '#64748B' : '#9CA3AF',
          tabBarStyle: {
            backgroundColor: colors.cardBg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            elevation: 10,
            height: 60,
            paddingBottom: 10,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Início') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Objetivos') {
              iconName = focused ? 'flag' : 'flag-outline';
            } else if (route.name === 'Por Pessoa') {
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
            } else if (route.name === 'Meu Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Início" component={HomeScreen} />
        <Tab.Screen name="Objetivos" component={GoalsScreen} />
        <Tab.Screen name="Por Pessoa" component={SummaryScreen} />
        <Tab.Screen name="Meu Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MonthProvider>
        <MainTabs />
      </MonthProvider>
    </ThemeProvider>
  );
}
