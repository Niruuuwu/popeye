import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE: react-native-purchases requires a native build to work.
// In Expo Go, we use AsyncStorage to simulate Pro state for testing.
// In a real native build, replace this with actual Purchases.getCustomerInfo() calls.

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setProForTesting: (value: boolean) => Promise<void>; // dev only
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  isLoading: true,
  refresh: async () => {},
  setProForTesting: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkEntitlement = async () => {
    try {
      // Try real RevenueCat first (works in native build)
      const Purchases = require('react-native-purchases').default;
      const info = await Purchases.getCustomerInfo();
      setIsPro(!!info.entitlements.active['pro']);
    } catch {
      // Fall back to local storage (Expo Go testing)
      const stored = await AsyncStorage.getItem('isPro');
      setIsPro(stored === 'true');
    } finally {
      setIsLoading(false);
    }
  };

  const setProForTesting = async (value: boolean) => {
    await AsyncStorage.setItem('isPro', value ? 'true' : 'false');
    setIsPro(value);
  };

  useEffect(() => {
    checkEntitlement();
    // Try to listen for real purchase updates
    try {
      const Purchases = require('react-native-purchases').default;
      Purchases.addCustomerInfoUpdateListener((info: any) => {
        setIsPro(!!info.entitlements.active['pro']);
      });
    } catch { /* not available in Expo Go */ }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isPro, isLoading, refresh: checkEntitlement, setProForTesting }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
