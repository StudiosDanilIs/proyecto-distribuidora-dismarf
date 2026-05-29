import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  // Guardará el objeto completo con los datos del operador
  const [user, setUser] = useState(null); 

  // ====================================================================
  // FUNCIÓN PARA INICIAR SESIÓN ESTÁNDAR Y VINCULAR BIOMETRÍA
  // ====================================================================
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/core/auth/login', { email, password });
      console.log('Respuesta del Backend:', response.data);

      if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
        
        const rol = response.data.rol_id ? response.data.rol_id.toString() : '3';
        await AsyncStorage.setItem('userRole', rol);
        
        // Guardar datos del usuario en memoria persistente
        if (response.data.usuario) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(response.data.usuario));
          setUser(response.data.usuario);
        }
        
        // ✅ NUEVO: Guardamos la credencial y el correo sincronizados para el auto-desbloqueo biométrico
        await AsyncStorage.setItem('bio_pass', password);
        await AsyncStorage.setItem('bio_email', email.trim().toLowerCase());
        
        setUserToken(response.data.token);
        setUserRole(parseInt(rol));
      }
    } catch (error) {
      console.log('Error en Login:', error);
      Alert.alert('Error de Acceso', 'Las credenciales ingresadas son incorrectas.');
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================================================
  // FUNCIÓN PARA CERRAR SESIÓN
  // ====================================================================
  const logout = async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userInfo'); // Limpiamos la memoria principal
    
    // Nota: Si prefieres que al cerrar sesión explícitamente también se eliminen las credenciales 
    // de acceso biométrico de este terminal, puedes descomentar las siguientes líneas:
    // await AsyncStorage.removeItem('bio_pass');
    // await AsyncStorage.removeItem('biometria_activa');

    setUserToken(null);
    setUserRole(null);
    setUser(null); // Reseteamos el estado
    setIsLoading(false);
  };

  // ====================================================================
  // VALIDAR SESIÓN EXISTENTE AL ABRIR LA APLICACIÓN
  // ====================================================================
  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let userToken = await AsyncStorage.getItem('userToken');
      let userRole = await AsyncStorage.getItem('userRole');
      let userInfo = await AsyncStorage.getItem('userInfo'); 

      if (userInfo) {
        setUser(JSON.parse(userInfo));
      }
      if (userRole) {
        setUserRole(parseInt(userRole));
      }
      setUserToken(userToken);
      setIsLoading(false);
    } catch (e) {
      console.log(`Error leyendo la sesión en memoria: ${e}`);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, isLoading, userToken, userRole, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};