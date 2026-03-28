import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes } from '../constants/theme';

const GOALS = ['Build Muscle', 'Lose Weight', 'Stay Fit', 'Improve Endurance'];

export default function OnboardingScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Pre-fill if editing existing profile
    AsyncStorage.getItem('userProfile').then(val => {
      if (val) {
        const p = JSON.parse(val);
        setHeight(p.height || '');
        setWeight(p.weight || '');
        setTargetWeight(p.targetWeight || '');
        setGoal(p.goal || '');
        setName(p.name || '');
      }
    });
  }, []);

  const handleFinish = async () => {
    if (!height || !weight || !goal) return Alert.alert('Error', 'Please fill in height, weight and goal');
    await AsyncStorage.setItem('userProfile', JSON.stringify({ name, height, weight, targetWeight, goal }));
    router.replace('/(tabs)/chat');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="always">
      <Text style={styles.logo}>🫛 Popeye</Text>
      <Text style={styles.title}>Set up your profile</Text>
      <Text style={styles.subtitle}>Popeye uses this to personalize your fitness advice</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Alex" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={setName} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput style={styles.input} placeholder="e.g. 175" placeholderTextColor={Colors.textSecondary} value={height} onChangeText={setHeight} keyboardType="numeric" />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Weight (kg)</Text>
        <TextInput style={styles.input} placeholder="e.g. 80" placeholderTextColor={Colors.textSecondary} value={weight} onChangeText={setWeight} keyboardType="numeric" />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Target Weight (kg) — optional</Text>
        <TextInput style={styles.input} placeholder="e.g. 70" placeholderTextColor={Colors.textSecondary} value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Your Goal</Text>
        <View style={styles.goalGrid}>
          {GOALS.map(g => (
            <TouchableOpacity key={g} style={[styles.goalBtn, goal === g && styles.goalBtnActive]} onPress={() => setGoal(g)}>
              <Text style={[styles.goalText, goal === g && styles.goalTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>Let's Go 💪</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  logo: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: 10, fontWeight: '600' },
  input: { backgroundColor: Colors.background, borderRadius: 10, padding: 14, color: Colors.white, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  goalBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  goalText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  goalTextActive: { color: Colors.white },
  button: { backgroundColor: Colors.orange, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.md },
});
