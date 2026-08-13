import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from '../screens/Cavas/DashboardScreen';
import AlertasScreen from '../screens/Alertas/AlertasScreen';
import InventarioScreen from '../screens/Inventario/InventarioScreen';
import BitacoraScreen from '../screens/Bitacora/BitacoraScreen'; 
import ConfiguracionScreen from '../screens/Config/ConfiguracionScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Inicio') iconName = 'home-variant';
          else if (route.name === 'Alertas') iconName = 'bell-alert';
          else if (route.name === 'Inventario') iconName = 'package';
          else if (route.name === 'Bitácora') iconName = 'book-open-variant';
          else if (route.name === 'Ajustes') iconName = 'cog';
          
          return <Icon name={iconName} size={size + 2} color={color} />;
        },
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#0284C7',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        }
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Alertas" component={AlertasScreen} />
      <Tab.Screen name="Inventario" component={InventarioScreen} />
      <Tab.Screen name="Bitácora" component={BitacoraScreen} />
      <Tab.Screen name="Ajustes" component={ConfiguracionScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;