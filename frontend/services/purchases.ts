// Mock RevenueCat for Expo Go compatibility.
// In a real native build, replace this with: import Purchases from 'react-native-purchases';

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: { priceString: string; title: string };
}

const Purchases = {
  configure: (_: { apiKey: string }) => {},
  getOfferings: async () => ({ current: { availablePackages: [] } }),
  purchasePackage: async (_: PurchasesPackage) => {
    throw new Error('Purchases not available in Expo Go. Build a native app to test.');
  },
  restorePurchases: async () => ({ entitlements: { active: {} } }),
};

export default Purchases;
