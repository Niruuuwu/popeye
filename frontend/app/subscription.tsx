import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Colors, FontSizes } from '../constants/theme';
import { useSubscription } from '../context/SubscriptionContext';

const FREE_FEATURES = [
  '20 AI messages per day',
  'Basic workout advice',
  'BMI calculator',
  'Weight progress tracking',
];

const PRO_FEATURES = [
  'Unlimited AI messages',
  'Personalized meal plans',
  'Custom & editable workout programs',
  'Advanced progress analytics',
  'Priority response speed',
  'Export workout history',
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { isPro, refresh, setProForTesting } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const pkgs = offerings.current?.availablePackages || [];
        setPackages(pkgs);
        // Default select annual if available
        const annual = pkgs.find(p => p.packageType === 'ANNUAL') || pkgs[0];
        if (annual) setSelected(annual);
      } catch (e) {
        console.log('RevenueCat offerings error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubscribe = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selected);
      if (customerInfo.entitlements.active['pro']) {
        await setProForTesting(true); // works in both Expo Go and native
        await refresh();
        Alert.alert('🎉 Pro Unlocked!', 'You now have unlimited messages and all Pro features.', [
          { text: "Let's go!", onPress: () => router.back() }
        ]);
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        // In Expo Go, purchases fail — simulate success for testing
        await setProForTesting(true);
        Alert.alert('🎉 Pro Unlocked!', 'Test purchase successful. Pro features are now active.', [
          { text: "Let's go!", onPress: () => router.back() }
        ]);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['pro']) {
        await refresh();
        Alert.alert('Restored!', 'Your Pro subscription is active.', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('No active subscription found.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>🏋️</Text>
      <Text style={styles.title}>Popeye Pro</Text>
      {isPro ? (
        <View style={styles.proBanner}>
          <Text style={styles.proBannerText}>⚡ You're on Pro — all features unlocked</Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>Unlock your full fitness potential</Text>
      )}

      {/* Package selector */}
      {loading ? (
        <ActivityIndicator color={Colors.orange} style={{ marginVertical: 24 }} />
      ) : packages.length > 0 ? (
        <View style={styles.toggle}>
          {packages.map(pkg => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.toggleBtn, selected?.identifier === pkg.identifier && styles.toggleBtnActive]}
              onPress={() => setSelected(pkg)}
            >
              {(pkg.packageType === 'ANNUAL') && (
                <View style={styles.saveBadge}><Text style={styles.saveText}>BEST VALUE</Text></View>
              )}
              {(pkg.packageType === 'LIFETIME') && (
                <View style={styles.saveBadge}><Text style={styles.saveText}>ONE TIME</Text></View>
              )}
              <Text style={[styles.toggleText, selected?.identifier === pkg.identifier && styles.toggleTextActive]}>
                {pkg.packageType === 'ANNUAL' ? 'Annual' : pkg.packageType === 'WEEKLY' ? 'Weekly' : pkg.packageType === 'LIFETIME' ? 'Lifetime' : 'Monthly'}
              </Text>
              <Text style={[styles.togglePrice, selected?.identifier === pkg.identifier && styles.toggleTextActive]}>
                {pkg.product.priceString}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Fallback hardcoded UI when no RevenueCat products configured yet
        <View style={styles.toggle}>
          {(['monthly', 'annual', 'lifetime'] as const).map(plan => (
            <TouchableOpacity
              key={plan}
              style={[styles.toggleBtn, (selected as any) === plan && styles.toggleBtnActive]}
              onPress={() => setSelected(plan as any)}
            >
              {plan === 'annual' && <View style={styles.saveBadge}><Text style={styles.saveText}>BEST VALUE</Text></View>}
              {plan === 'lifetime' && <View style={styles.saveBadge}><Text style={styles.saveText}>ONE TIME</Text></View>}
              <Text style={[styles.toggleText, (selected as any) === plan && styles.toggleTextActive]}>
                {plan === 'annual' ? 'Annual' : plan === 'lifetime' ? 'Lifetime' : 'Monthly'}
              </Text>
              <Text style={[styles.togglePrice, (selected as any) === plan && styles.toggleTextActive]}>
                {plan === 'annual' ? '$49.99/yr' : plan === 'lifetime' ? '$99.99' : '$9.99/mo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Feature comparison */}
      <View style={styles.comparisonRow}>
        <View style={[styles.planCard, { flex: 1 }]}>
          <Text style={styles.planName}>Free</Text>
          {FREE_FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.planCard, styles.planCardPro, { flex: 1 }]}>
          <Text style={[styles.planName, { color: Colors.orange }]}>Pro ⚡</Text>
          {PRO_FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: Colors.orange }]}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.ctaBtn} onPress={handleSubscribe} disabled={purchasing}>
        {purchasing
          ? <ActivityIndicator color={Colors.white} />
          : <Text style={styles.ctaText}>
              {selected && typeof selected === 'object' && 'product' in selected
                ? `Start Pro — ${selected.product.priceString}`
                : 'Start Pro'}
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} style={{ marginTop: 12 }}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>Cancel anytime. Secure payment via App Store / Google Play.</Text>

      {/* Dev testing toggle — remove before production */}
      <TouchableOpacity
        onPress={async () => {
          await setProForTesting(!isPro);
          router.back();
        }}
        style={{ marginTop: 20, padding: 10 }}
      >
        <Text style={{ color: Colors.textSecondary, fontSize: 10, textAlign: 'center' }}>
          [DEV] Toggle Pro: currently {isPro ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  closeText: { color: Colors.textSecondary, fontSize: 18 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  proBanner: { backgroundColor: Colors.orange, borderRadius: 12, padding: 12, marginBottom: 24, alignItems: 'center' },
  proBannerText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.sm },
  toggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: Colors.orange },
  toggleText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSizes.sm },
  toggleTextActive: { color: Colors.white },
  togglePrice: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  saveBadge: { backgroundColor: '#CC5522', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  saveText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
  comparisonRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  planCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  planCardPro: { borderColor: Colors.orange },
  planName: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.white, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 6 },
  featureCheck: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '700' },
  featureText: { color: Colors.white, fontSize: FontSizes.xs, flex: 1, lineHeight: 16 },
  ctaBtn: { backgroundColor: Colors.orange, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  ctaText: { color: Colors.white, fontWeight: '800', fontSize: FontSizes.md },
  restoreText: { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSizes.sm },
  disclaimer: { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 8 },
});
