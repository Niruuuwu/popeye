import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert, KeyboardAvoidingView, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes } from '../constants/theme';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      const res = await login(email, password);
      await signIn(res.data.access_token, res.data.user_id, res.data.refresh_token);
      router.replace('/(tabs)/chat');
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🏋️ Popeye</Text>
        <Text style={styles.subtitle}>Your AI fitness assistant</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkAccent}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, color: Colors.white, fontSize: FontSizes.md, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  button: { backgroundColor: Colors.orange, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6, marginBottom: 20 },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.md },
  link: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.sm },
  linkAccent: { color: Colors.orange, fontWeight: '600' },
});
