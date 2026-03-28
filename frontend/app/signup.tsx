import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes } from '../constants/theme';
import { signup } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill in all fields');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await signup(email, password);
      // Save name for onboarding
      await AsyncStorage.setItem('userProfile', JSON.stringify({ name }));

      if (res.data.access_token) {
        // Email confirmation disabled — go straight in
        await signIn(res.data.access_token, res.data.user_id, res.data.refresh_token);
        router.replace('/onboarding');
      } else {
        // Email confirmation required — show message
        Alert.alert(
          '📧 Check your email',
          `We sent a confirmation link to ${email}. Click it to activate your account, then come back and sign in.`,
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (e: any) {
      Alert.alert('Signup failed', e?.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🏋️ Popeye</Text>
        <Text style={styles.subtitle}>Create your account</Text>
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor={Colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkAccent}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, color: Colors.white, fontSize: FontSizes.md, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  button: { backgroundColor: Colors.orange, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6, marginBottom: 20 },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.md },
  link: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.sm },
  linkAccent: { color: Colors.orange, fontWeight: '600' },
});
