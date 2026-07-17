// ficheiro: App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importar os nossos dois ecrãs
import HomeScreen from './src/screens/HomeScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#1E3A8A',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    borderTopWidth: 0,
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
                    } else if (route.name === 'Perfil') {
                        iconName = focused ? 'person' : 'person-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >

        <Tab.Screen name="Início" component={HomeScreen}/>
        <Tab.Screen name="Objetivos" component={GoalsScreen}/>
        <Tab.Screen name="Por Pessoa" component={SummaryScreen}/>
        <Tab.Screen name="Meu Perfil" component={ProfileScreen}/>

        </Tab.Navigator>
      </NavigationContainer>
  );
}