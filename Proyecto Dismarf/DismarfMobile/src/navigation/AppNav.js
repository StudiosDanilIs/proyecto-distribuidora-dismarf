import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

import FormularioCavaScreen from '../screens/Cavas/FormularioCavaScreen';
import GestionUsuariosScreen from '../screens/Config/GestionUsuariosScreen';
import ReportesScreen from '../screens/Config/ReportesScreen';

import MainTabNavigator from './MainTabNavigator';
import DetallesCavaScreen from '../screens/Cavas/DetallesCavaScreen';

const Stack = createNativeStackNavigator();

const AppNav = () => {
  const { userToken } = useContext(AuthContext);

  const premiumHeaderOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: '#F0F9FF',
    },
    headerTintColor: '#0284C7',
    headerTitleStyle: {
      fontWeight: '800',
      fontSize: 18,
      color: '#0F172A',
    },
    headerShadowVisible: false,
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken !== null ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            
            <Stack.Screen 
              name="DetallesCava" 
              component={DetallesCavaScreen} 
            />
            <Stack.Screen 
              name="FormularioCava" 
              component={FormularioCavaScreen} 
            />
            <Stack.Screen 
              name="GestionUsuarios" 
              component={GestionUsuariosScreen} 
            />
            <Stack.Screen 
              name="Reportes" 
              component={ReportesScreen} 
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNav;