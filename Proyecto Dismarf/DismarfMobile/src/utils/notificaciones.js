import PushNotification from 'react-native-push-notification';
import { PermissionsAndroid, Platform } from 'react-native';

// Solicitar permiso en Android 13+
export const solicitarPermisosNotificacion = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
};

PushNotification.configure({
  onNotification: function (notification) {
    console.log("NOTIFICACIÓN TOCADA:", notification);
  },
  requestPermissions: Platform.OS === 'ios',
});

// Crear el canal (Obligatorio)
PushNotification.createChannel(
  {
    channelId: "alertas-dismarf", 
    channelName: "Alertas Críticas",
    importance: 4, // 4 = Alta importancia (Sonido y alerta visual)
    vibrate: true,
  },
  (created) => console.log(`Canal creado: ${created}`)
);

export const lanzarAlertaLocal = (titulo, mensaje) => {
  PushNotification.localNotification({
    channelId: "alertas-dismarf",
    title: titulo,
    message: mensaje,
    color: "#F44336",
    vibrate: true,
    vibration: 500,
    priority: "high",
    playSound: true,
  });
};