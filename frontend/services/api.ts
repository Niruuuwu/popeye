import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API_URL });

export const setAuthToken = (token: string | null) => {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
};

// Auto-refresh expired tokens
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
        const newToken = res.data.access_token;

        await SecureStore.setItemAsync('token', newToken);
        if (res.data.refresh_token) {
          await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
        }
        setAuthToken(newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear session and send to login
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('refreshToken');
        setAuthToken(null);
        const { router } = await import('expo-router');
        router.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

export const signup = (email: string, password: string) =>
  api.post('/auth/signup', { email, password });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const sendMessage = (message: string, conversation_id?: string) =>
  api.post('/chat', { message, conversation_id });

export const logWeight = (weight: number, date: string) =>
  api.post('/weight', { weight, date });

export const getWeightLogs = () =>
  api.get('/weight');

export const saveWorkoutPlan = (content: string) =>
  api.post('/workout', { content });

export const getWorkoutPlan = () =>
  api.get('/workout');

export default api;
