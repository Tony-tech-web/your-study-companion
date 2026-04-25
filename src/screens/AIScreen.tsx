import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { callEdgeFunction } from '../lib/supabase';
import { getAIConversations, saveAIConversation, clearAIConversations, AIConversationEntry } from '../services/ai';

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').replace(/\*\*/g, '').trim();

const MODELS = [
  { id: 'google', label: 'Gemini Flash' },
  { id: 'google-pro', label: 'Gemini Pro' },
  { id: 'openrouter', label: 'GPT-4o' },
];

const MessageBubble = ({ msg }: { msg: AIConversationEntry }) => {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.msgRow, isUser && s.msgRowUser]}>
      <View style={[s.avatar, isUser ? s.avatarUser : s.avatarAI]}>
        <Text style={s.avatarText}>{isUser ? 'U' : 'O'}</Text>
      </View>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
};

export default function AIScreen() {
  const [messages, setMessages] = useState<AIConversationEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [model, setModel] = useState('google');
  const [streaming, setStreaming] = useState('');
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const h = await getAIConversations();
      setMessages(h.length === 0 ? [{
        id: 'init', role: 'assistant',
        content: "Neural link established. I'm Orbit, your academic AI. How can I help?",
        created_at: new Date().toISOString(),
      }] : h);
    } catch (e) { console.error(e); }
    finally { setFetching(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput(''); setLoading(true); setStreaming('');
    try {
      const userMsg = await saveAIConversation('user', text);
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await callEdgeFunction('ai-chat', {
        messages: [...history, { role: 'user', content: text }],
        providerId: model,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'AI request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || '';
                full += delta;
                setStreaming(cleanText(full));
              } catch { /* skip */ }
            }
          }
        }
      }

      const final = cleanText(full) || 'No response received.';
      setStreaming('');
      const aiMsg = await saveAIConversation('assistant', final);
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setStreaming('');
      const errMsg = await saveAIConversation('assistant', `Error: ${e.message}`).catch(() => ({
        id: Date.now().toString(), role: 'assistant' as const,
        content: `Error: ${e.message}`, created_at: new Date().toISOString(),
      }));
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await clearAIConversations();
          setMessages([{ id: 'init', role: 'assistant', content: 'Logs cleared. Orbit ready.', created_at: new Date().toISOString() }]);
        }
      }
    ]);
  };

  if (fetching) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Orbit AI</Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>Neural Link Active</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {/* Model picker */}
          <View style={s.modelPicker}>
            {MODELS.map(m => (
              <TouchableOpacity key={m.id} style={[s.modelBtn, model === m.id && s.modelBtnActive]} onPress={() => setModel(m.id)}>
                <Text style={[s.modelBtnText, model === m.id && s.modelBtnTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          <>
            {streaming ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}><Text style={s.avatarText}>O</Text></View>
                <View style={[s.bubble, s.bubbleAI, s.bubbleStreaming]}>
                  <Text style={s.bubbleText}>{streaming}</Text>
                  <Text style={s.cursor}>▋</Text>
                </View>
              </View>
            ) : loading ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}><Text style={s.avatarText}>O</Text></View>
                <View style={[s.bubble, s.bubbleAI]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              </View>
            ) : null}
          </>
        }
      />

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input} value={input} onChangeText={setInput}
          placeholder="Ask Orbit anything..." placeholderTextColor={colors.muted}
          multiline maxLength={2000}
          onSubmitEditing={handleSend} returnKeyType="send"
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim() || loading}>
          <Text style={s.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.muted, fontSize: typography.xs },
  headerRight: { gap: spacing.sm, alignItems: 'flex-end' },
  modelPicker: { flexDirection: 'row', gap: 4 },
  modelBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  modelBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modelBtnText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  modelBtnTextActive: { color: '#fff' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  clearBtnText: { color: colors.muted, fontSize: 10 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  msgRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarUser: { backgroundColor: colors.primary },
  avatarAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  bubble: { flex: 1, borderRadius: radius.lg, padding: spacing.md, maxWidth: '85%' },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  bubbleStreaming: { borderColor: colors.primary },
  bubbleText: { color: colors.foreground, fontSize: typography.sm, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  cursor: { color: colors.primary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
  },
  input: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.foreground, fontSize: typography.sm, maxHeight: 120,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
});
