import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import Purchases from '../services/purchases';

export default function RootLayout() {
  useEffect(() => {
    // Force dark navigation bar on Android
    SystemUI.setBackgroundColorAsync('#0D0D0D');

    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    if (apiKey && apiKey !== 'your_revenuecat_public_api_key') {
      Purchases.configure({ apiKey });
    }
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0D0D0D" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
