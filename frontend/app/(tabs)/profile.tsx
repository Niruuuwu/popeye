import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, Modal, Animated, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { logWeight, getWeightLogs } from '../../services/api';
import { getWorkoutPlan } from '../../services/api';

interface UserProfile { name: string; height: string; weight: string; targetWeight: string; goal: string; }
interface WeightLog { date: string; weight: number; }

// Animated stat card
function StatCard({ value, label, color = Colors.orange }: { value: string; label: string; color?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// Weight graph with animated dots
function WeightGraph({ logs, target }: { logs: WeightLog[]; target: number }) {
  const scales = useRef(logs.map(() => new Animated.Value(1))).current;

  const onDotPress = (i: number) => {
    Animated.sequence([
      Animated.spring(scales[i], { toValue: 2, useNativeDriver: true }),
      Animated.spring(scales[i], { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  if (logs.length < 2) return (
    <Text style={styles.graphEmpty}>Log at least 2 days to see your weight graph</Text>
  );

  const weights = logs.map(l => l.weight);
  const min = Math.min(...weights, target) - 3;
  const max = Math.max(...weights, target) + 3;
  const range = max - min || 1;
  const W = 280, H = 90;
  const targetY = H - ((target - min) / range) * H;

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <View style={{ width: W, height: H + 24 }}>
        {/* Target dashed line */}
        <View style={[styles.targetLine, { top: targetY }]} />
        <Text style={[styles.targetLabel, { top: targetY - 14 }]}>TARGET {target}kg</Text>

        {/* Connect dots with lines */}
        {logs.slice(1).map((l, i) => {
          const x1 = (i / (logs.length - 1)) * W;
          const y1 = H - ((logs[i].weight - min) / range) * H;
          const x2 = ((i + 1) / (logs.length - 1)) * W;
          const y2 = H - ((l.weight - min) / range) * H;
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          return (
            <View key={i} style={{
              position: 'absolute', left: x1, top: y1,
              width: len, height: 2, backgroundColor: Colors.orange,
              opacity: 0.5, transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 0',
            }} />
          );
        })}

        {/* Dots */}
        {logs.map((l, i) => {
          const x = (i / Math.max(logs.length - 1, 1)) * W;
          const y = H - ((l.weight - min) / range) * H;
          return (
            <Pressable key={i} onPress={() => onDotPress(i)} style={{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={[styles.dot, { transform: [{ scale: scales[i] || new Animated.Value(1) }] }]} />
            </Pressable>
          );
        })}

        {/* Date labels */}
        <Text style={[styles.graphLabel, { position: 'absolute', bottom: 0, left: 0 }]}>{logs[0]?.date?.slice(5)}</Text>
        <Text style={[styles.graphLabel, { position: 'absolute', bottom: 0, right: 0 }]}>{logs[logs.length - 1]?.date?.slice(5)}</Text>
      </View>
    </View>
  );
}

// Consistency graph — last 30 days dots
function ConsistencyGraph({ logs }: { logs: WeightLog[] }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const loggedDates = new Set(logs.map(l => l.date));
  const streak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (loggedDates.has(days[i])) s++;
      else break;
    }
    return s;
  })();

  return (
    <View>
      <View style={styles.consistencyRow}>
        {days.map(d => (
          <View key={d} style={[styles.consistencyDot, loggedDates.has(d) && styles.consistencyDotActive]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>30 days ago</Text>
        <Text style={{ color: Colors.orange, fontSize: FontSizes.xs, fontWeight: '700' }}>🔥 {streak} day streak</Text>
        <Text style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>Today</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [workoutPlan, setWorkoutPlan] = useState<{ date: string; content: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userProfile').then(val => { if (val) setProfile(JSON.parse(val)); });

    // Load workout plan from Supabase, fall back to local
    getWorkoutPlan()
      .then(res => {
        if (res.data?.content) {
          const plan = { date: new Date(res.data.saved_at).toLocaleDateString(), content: res.data.content };
          setWorkoutPlan(plan);
          AsyncStorage.setItem('lastWorkoutPlan', JSON.stringify(plan));
        } else {
          AsyncStorage.getItem('lastWorkoutPlan').then(val => { if (val) setWorkoutPlan(JSON.parse(val)); });
        }
      })
      .catch(() => {
        AsyncStorage.getItem('lastWorkoutPlan').then(val => { if (val) setWorkoutPlan(JSON.parse(val)); });
      });
    // Load from Supabase first, fall back to local
    getWeightLogs()
      .then(res => {
        if (res.data?.length) {
          setWeightLogs(res.data);
          AsyncStorage.setItem('weightLogs', JSON.stringify(res.data));
        } else {
          AsyncStorage.getItem('weightLogs').then(val => { if (val) setWeightLogs(JSON.parse(val)); });
        }
      })
      .catch(() => {
        AsyncStorage.getItem('weightLogs').then(val => { if (val) setWeightLogs(JSON.parse(val)); });
      });
  }, []);

  const logWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || w < 20 || w > 300) return Alert.alert('Error', 'Enter a valid weight');
    const today = new Date().toISOString().slice(0, 10);
    const updated = [...weightLogs.filter(l => l.date !== today), { date: today, weight: w }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    setWeightLogs(updated);
    await AsyncStorage.setItem('weightLogs', JSON.stringify(updated));
    // Sync to Supabase
    try { await logWeight(w, today); } catch { /* fail silently */ }
    if (profile) {
      const up = { ...profile, weight: String(w) };
      setProfile(up);
      await AsyncStorage.setItem('userProfile', JSON.stringify(up));
    }
    setNewWeight('');
    setShowLogModal(false);
  };

  const bmi = profile ? Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2) : null;
  const bmiLabel = bmi ? bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal ✓' : bmi < 30 ? 'Overweight' : 'Obese' : '';
  const target = profile?.targetWeight ? Number(profile.targetWeight) : null;
  const current = profile ? Number(profile.weight) : null;
  const totalLogged = weightLogs.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => workoutPlan ? router.push('/subscription') : Alert.alert('No plan yet', 'Chat with Popeye and ask for a workout plan first.')}
            style={[styles.planBtn, !workoutPlan && { opacity: 0.5 }]}
          >
            <Text style={styles.planBtnText}>{workoutPlan ? '🏋️ Plan' : '🔒 Plan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/onboarding')}>
            <Text style={{ color: Colors.orange, fontSize: FontSizes.sm, fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}><Text style={styles.avatarEmoji}>🏋️</Text></View>
        <Text style={styles.userName}>{profile?.name || 'Athlete'}</Text>
        <Text style={styles.goalText}>{profile?.goal || 'No goal set'}</Text>
      </View>

      {/* Stats row */}
      {profile && (
        <View style={styles.statsRow}>
          <StatCard value={profile.weight} label="kg now" />
          <StatCard value={profile.height} label="cm" color={Colors.white} />
          <StatCard value={bmi?.toFixed(1) || '-'} label={bmiLabel} color={Colors.white} />
        </View>
      )}

      {/* Weight journey */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weight Journey</Text>
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogModal(true)}>
            <Text style={styles.logBtnText}>+ Log today</Text>
          </TouchableOpacity>
        </View>
        {target && current && (
          <View style={styles.weightRow}>
            <Text style={styles.weightCurrent}>{current}kg</Text>
            <Text style={styles.weightArrow}>→</Text>
            <Text style={styles.weightTarget}>{target}kg</Text>
            <Text style={[styles.weightArrow, { marginLeft: 8 }]}>
              ({Math.abs(current - target).toFixed(1)}kg to go)
            </Text>
          </View>
        )}
        <WeightGraph logs={weightLogs} target={target || (current || 70)} />
      </View>

      {/* Consistency */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Consistency</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>{totalLogged} days logged</Text>
        </View>
        <ConsistencyGraph logs={weightLogs} />
      </View>

      {/* Workout Plan — locked PRO feature */}
      <TouchableOpacity style={styles.lockedCard} onPress={() => router.push('/subscription')} activeOpacity={0.8}>
        <View style={styles.lockedLeft}>
          <Text style={styles.lockedTitle}>Edit Your Workout Plan</Text>
          <Text style={styles.lockedSub}>Customize your plan, track exercises, set targets</Text>
        </View>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>🔒 PRO</Text>
        </View>
      </TouchableOpacity>

      {/* Menu */}
      <View style={styles.menuSection}>
        {[
          { icon: '💳', label: 'Manage Subscription', onPress: () => router.push('/subscription') },
          { icon: 'ℹ️', label: 'About Popeye', onPress: () => Alert.alert('Popeye', 'v1.0.0 — Powered by Groq') },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() =>
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login'); } },
          ])}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={[styles.menuLabel, { color: Colors.error }]}>Sign Out</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Log weight modal */}
      <Modal visible={showLogModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Today's Weight</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 78.5"
              placeholderTextColor={Colors.textSecondary}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.border }]} onPress={() => setShowLogModal(false)}>
                <Text style={{ color: Colors.white }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.orange, flex: 1 }]} onPress={logWeight}>
                <Text style={{ color: Colors.white, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.white },
  planBtn: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  planBtnText: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, borderWidth: 3, borderColor: Colors.orange, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarEmoji: { fontSize: 36 },
  userName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  goalText: { fontSize: FontSizes.sm, color: Colors.orange, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.orange },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  card: { marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  logBtn: { backgroundColor: Colors.orange, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  logBtnText: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: '700' },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 },
  weightCurrent: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.white },
  weightArrow: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  weightTarget: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.orange },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.orange, opacity: 0.3 },
  targetLabel: { position: 'absolute', right: 0, fontSize: 9, color: Colors.orange },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange },
  graphLabel: { fontSize: 9, color: Colors.textSecondary },
  graphEmpty: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', paddingVertical: 16 },
  consistencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  consistencyDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.border },
  consistencyDotActive: { backgroundColor: Colors.orange },
  lockedCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedLeft: { flex: 1, marginRight: 12 },
  lockedTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  lockedSub: { fontSize: FontSizes.xs, color: Colors.textSecondary, lineHeight: 16 },
  proBadge: { backgroundColor: Colors.orange, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  proText: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: '800' },
  menuSection: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: FontSizes.md, color: Colors.white },
  menuArrow: { fontSize: FontSizes.lg, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, color: Colors.white, fontSize: FontSizes.xl, borderWidth: 1, borderColor: Colors.border, textAlign: 'center' },
  modalBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
});
