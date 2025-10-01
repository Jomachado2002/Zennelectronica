// App.js - VERSIÓN CORREGIDA SIN IMPORTACIONES FALTANTES
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// 📱 IMPORTAR SOLO LAS PANTALLAS QUE EXISTEN
import Login from './src/pages/Login';
import Home from './src/pages/Home';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            title: 'Zenn - Inicio',
          }}
        />
        
        <Stack.Screen
          name="Login"
          component={Login}
          options={{
            title: 'Iniciar Sesión',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}