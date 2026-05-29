import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REEMPLAZA ESTA IP POR LA IP LOCAL DE TU COMPUTADORA
const API_URL = 'http://localhost:4000/api'; 

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Token automáticamente en cada petición
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;