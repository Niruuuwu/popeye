import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, ActivityIndicator, Alert,
  KeyboardAvoidingView, Keyboard, Animated, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Colors, FontSizes } from '../../constants/theme';
import { sendMessage, saveWorkoutPlan } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QUOTES } from '../../constants/quotes';

interface Message { id: string; role: 'user' | 'model'; content: string; }
const QUICK_PROMPTS = ['Build muscle', 'Lose weight', 'Daily workout', 'Nutrition tips'];

function QuoteBanner({ quote }: { quote: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const popTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = () => {
    if (popTimeout.current) clearTimeout(popTimeout.current);
    Animated.spring(scale, { toValue: 1.06, useNativeDriver: true, speed: 20 }).start();
    popTimeout.current = setTimeout(() => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12 }).start();
    }, 5000);
  };

  useEffect(() => () => { if (popTimeout.current) clearTimeout(popTimeout.current); }, []);

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.quoteBanner, { transform: [{ scale }] }]}>
        <Text style={styles.quoteIcon}>💬</Text>
        <Text style={styles.quoteText}>"{quote}"</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [profile, setProfile] = useState<any>(null);
  const [showQuote, setShowQuote] = useState(true);
  const listRef = useRef<FlatList>(null);
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    AsyncStorage.getItem('userProfile').then(val => { if (val) setProfile(JSON.parse(val)); });
  }, []);

  // Re-show quote every time screen comes into focus (from profile or elsewhere)
  useFocusEffect(
    React.useCallback(() => {
      if (messages.length === 0) setShowQuote(true);
    }, [messages.length])
  );

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setShowQuote(false); // hide quote when chat starts
    Keyboard.dismiss();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const contextMsg = profile && messages.length === 0
        ? `[User profile: height ${profile.height}cm, weight ${profile.weight}kg, goal: ${profile.goal}${profile.targetWeight ? `, target weight: ${profile.targetWeight}kg` : ''}] ${msg}`
        : msg;
      const res = await sendMessage(contextMsg, conversationId);
      if (!conversationId) setConversationId(res.data.conversation_id);
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'model' as const, content: res.data.response };
      setMessages(prev => [...prev, aiMsg]);

      // Save as workout plan if it looks like one
      const lower = res.data.response.toLowerCase();
      if (lower.includes('workout') || lower.includes('exercise') || lower.includes('sets') || lower.includes('reps') || lower.includes('routine')) {
        const plan = {
          date: new Date().toLocaleDateString(),
          content: res.data.response,
        };
        await AsyncStorage.setItem('lastWorkoutPlan', JSON.stringify(plan));
        try { await saveWorkoutPlan(res.data.response); } catch { /* fail silently */ }
      }
    } catch (e: any) {
      if (e?.response?.status === 402) {
        Alert.alert(
          '🏋️ Daily Limit Reached',
          "You've used all 20 free messages today. Upgrade to Pro for unlimited messages.",
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => router.push('/subscription') },
          ]
        );
      } else {
        Alert.alert('Error', e?.response?.data?.detail || 'Failed to get response');
      }
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setShowQuote(true); // re-show quote on new chat
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>🏋️ Popeye</Text>
        <TouchableOpacity onPress={handleNewChat}>
          <Text style={styles.newChat}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Quote banner — shown above messages when no chat yet */}
      {showQuote && messages.length === 0 && (
        <QuoteBanner quote={quote} />
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowAI]}>
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={styles.msgText}>{item.content}</Text>
            </View>
            <Text style={styles.msgMeta}>{item.role === 'user' ? 'YOU' : 'POPEYE'}</Text>
          </View>
        )}
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={Colors.orange} />
          <Text style={styles.typingText}>Popeye is thinking...</Text>
        </View>
      )}

      {messages.length === 0 && (
        <View style={styles.quickRow}>
          {QUICK_PROMPTS.map(p => (
            <TouchableOpacity key={p} style={styles.chip} onPress={() => handleSend(p)}>
              <Text style={styles.chipText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask Popeye..."
          placeholderTextColor={Colors.textSecondary}
          value={input}
          onChangeText={setInput}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>▶</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.white },
  newChat: { fontSize: FontSizes.sm, color: Colors.orange, fontWeight: '600' },
  quoteBanner: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: Colors.orange,
    shadowColor: Colors.orange, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  quoteIcon: { fontSize: 18, marginBottom: 6 },
  quoteText: { color: Colors.white, fontSize: FontSizes.md, fontStyle: 'italic', lineHeight: 22, fontWeight: '500' },
  list: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginBottom: 16 },
  msgRowUser: { alignItems: 'flex-end' },
  msgRowAI: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 14 },
  bubbleUser: { backgroundColor: Colors.orange, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  msgText: { fontSize: FontSizes.md, lineHeight: 22, color: Colors.white },
  msgMeta: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 4, paddingHorizontal: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  typingText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: Colors.white, fontSize: FontSizes.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10, backgroundColor: Colors.background },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, color: Colors.white, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, minHeight: 44, maxHeight: 44 },
  sendBtn: { backgroundColor: Colors.orange, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: Colors.white, fontSize: 15 },
});
