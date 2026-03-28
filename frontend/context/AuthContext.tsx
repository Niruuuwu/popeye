import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from '../services/api';

interface AuthState { token: string | null; userId: string | null; isLoading: boolean; }
interface AuthContextType extends AuthState {
  signIn: (token: string, userId: string, refreshToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, userId: null, isLoading: true });

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      const userId = await SecureStore.getItemAsync('userId');
      if (token) setAuthToken(token);
      setState({ token, userId, isLoading: false });
    })();
  }, []);

  const signIn = async (token: string, userId: string, refreshToken?: string) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('userId', userId);
    if (refreshToken) await SecureStore.setItemAsync('refreshToken', refreshToken);
    setAuthToken(token);
    setState({ token, userId, isLoading: false });
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('refreshToken');
    setAuthToken(null);
    setState({ token: null, userId: null, isLoading: false });
  };

  const refreshSession = async (): Promise<string | null> => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return null;

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      await SecureStore.setItemAsync('token', data.access_token);
      if (data.refresh_token) await SecureStore.setItemAsync('refreshToken', data.refresh_token);
      setAuthToken(data.access_token);
      setState(prev => ({ ...prev, token: data.access_token }));
      return data.access_token;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
