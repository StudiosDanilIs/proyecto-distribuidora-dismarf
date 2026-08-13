import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNav from './src/navigation/AppNav';
import './src/utils/notificaciones';

import SystemNavigationBar from 'react-native-system-navigation-bar';

const App = () => {

  useEffect(() => {
    const activarModoInmersivo = async () => {
      try {
        await SystemNavigationBar.navigationHide();
      } catch (error) {
        console.error("Error al ocultar la barra de navegación:", error);
      }
    };

    activarModoInmersivo();
  }, []);

  return (
    <AuthProvider>
      <AppNav />
    </AuthProvider>
  );
};

export default App;