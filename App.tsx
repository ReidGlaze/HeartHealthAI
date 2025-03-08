import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

import FoodAnalysisScreen from './src/screens/FoodAnalysisScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CameraScreen from './src/screens/CameraScreen';
import { healthScoreService } from './src/services/HealthScoreService';

// Define the tab navigator type
const Tab = createBottomTabNavigator();

// Theme colors
const COLORS = {
  primary: '#D32F2F',
  primaryLight: '#FFEBEE',
  background: '#f8f9fa',
  white: '#FFFFFF',
  inactive: '#9E9E9E',
};

// Fallback screen in case of errors
const ErrorFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>An error occurred. Please restart the app.</Text>
  </View>
);

export default function App() {
  // Initialize notifications and check if user has scanned food today
  useEffect(() => {
    // Check for streak updates at app startup
    const syncStreak = async () => {
      try {
        await healthScoreService.syncStreak();
      } catch (error) {
        console.error('Error syncing streak:', error);
      }
    };
    
    syncStreak();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Camera') {
              iconName = focused ? 'camera' : 'camera-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'help-circle-outline';
            }

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.inactive,
          tabBarStyle: {
            height: 60,
            paddingBottom: 10,
            paddingTop: 5,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={FoodAnalysisScreen} 
          options={{
            title: 'Food Analysis',
          }}
        />
        
        <Tab.Screen 
          name="Camera" 
          component={CameraScreen} 
          options={{
            title: 'Scan Food',
          }}
        />
        
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            title: 'My Profile',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
} 