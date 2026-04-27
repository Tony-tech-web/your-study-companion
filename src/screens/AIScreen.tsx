import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, shadow } from '../lib/theme';
import { callEdgeFunction } from '../lib/supabase';
import { getAIConversations, saveAIConversation, clearAIConversations, AIConversationEntry } from '../services/ai';
import { ConfirmDialog } from '../components/ConfirmDialog';

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').replace(/\*\*/g, '').trim();

const MODELS = [
  { id: 'google',     label: 'Gemini Flash', sub: 'Free' },
  { id: 'google-pro', label: 'Gemini Pro',   sub: 'Free' },
  { id: 'openrouter', label: 'GPT-4o',       sub: 'Credits' },
];

const SkeletonBubble = ({ right }: { right?: boolean }) => (
  <View style={[sk.row, right && sk.rowRight]}>
    <View style={sk.avatar} />
    <View style={[sk.bubble, { width: right ? 180 : 240 }]} />
  </View>
);

const sk = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', marginBottom: spacing.md },
  rowRight: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.card },
  bubble: { height: 52, borderRadius: radius.xl, backgroundColor: colors.card },
});

const MessageBubble = ({ msg }: { msg: AIConversationEntry }) => {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.msgRow, isUser && s.msgRowUser]}>
      <View style={[s.avatar, isUser ? s.avatarUser : s.avatarAI]}>
        {isUser
          ? <Ionicons name="person" size={14} color="#fff" />
          : <Ionicons name="sparkles" size={14} color={colors.primary} />}
      </View>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
};

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<AIConversationEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [model, setModel] = useState('google');
  const [showModels, setShowModels] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { loadHistory(); }, []);

  const scrollToEnd = () => setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

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
      scrollToEnd();

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
              try { full += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''; } catch { /* skip */ }
            }
          }
          setStreaming(cleanText(full));
        }
      }

      const final = cleanText(full) || 'No response received.';
      setStreaming('');
      const aiMsg = await saveAIConversation('assistant', final);
      setMessages(prev => [...prev, aiMsg]);
      scrollToEnd();
    } catch (e: any) {
      setStreaming('');
      const errMsg = await saveAIConversation('assistant', `Error: ${e.message}`).catch(() => ({
        id: Date.now().toString(), role: 'assistant' as const,
        content: `Error: ${e.message}`, created_at: new Date().toISOString(),
      }));
      setMessages(prev => [...prev, errMsg]);
    } finally { setLoading(false); }
  };

  const currentModel = MODELS.find(m => m.id === model) || MODELS[0];

  if (fetching) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View><Text style={s.title}>Orbit AI</Text></View>
      </View>
      <View style={s.skeletonWrap}>
        <SkeletonBubble />
        <SkeletonBubble right />
        <SkeletonBubble />
      </View>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ConfirmDialog
        visible={showClearDialog}
        title="Clear History"
        message="Delete all conversation history with Orbit?"
        confirmLabel="Clear"
        onConfirm={async () => {
          setShowClearDialog(false);
          await clearAIConversations();
          setMessages([{ id: 'init', role: 'assistant', content: 'Logs cleared. Orbit ready.', created_at: new Date().toISOString() }]);
        }}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Orbit AI</Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>Neural Link Active</Text>
          </View>
        </View>

        {/* Model picker */}
        <View style={{ position: 'relative' }}>
          <TouchableOpacity style={s.modelBtn} onPress={() => setShowModels(v => !v)} activeOpacity={0.8}>
            <Text style={s.modelBtnText}>{currentModel.label}</Text>
            <Ionicons name={showModels ? 'chevron-up' : 'chevron-down'} size={12} color={colors.muted} />
          </TouchableOpacity>
          {showModels && (
            <View style={s.modelDropdown}>
              {MODELS.map(m => (
                <TouchableOpacity key={m.id} style={[s.modelOption, model === m.id && s.modelOptionOn]}
                  onPress={() => { setModel(m.id); setShowModels(false); }} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modelOptionText, model === m.id && { color: colors.primary }]}>{m.label}</Text>
                    <Text style={s.modelOptionSub}>{m.sub}</Text>
                  </View>
                  {model === m.id && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={s.clearBtn} onPress={() => setShowClearDialog(true)}>
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 80}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            streaming ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <View style={[s.bubble, s.bubbleAI, { borderColor: colors.primary + '40' }]}>
                  <Text style={s.bubbleText}>{streaming}</Text>
                  <View style={s.cursor} />
                </View>
              </View>
            ) : loading && !streaming ? (
              <View style={s.msgRow}>
                <View style={[s.avatar, s.avatarAI]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <View style={[s.bubble, s.bubbleAI]}>
                  <View style={s.dotsRow}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.25 }]} />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput
            style={s.input} value={input} onChangeText={setInput}
            placeholder="Ask Orbit anything..." placeholderTextColor={colors.muted}
            multiline maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={handleSend} disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { flex: 1, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.heavy, letterSpacing: -0.4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.muted, fontSize: typography.xs },
  modelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  modelBtnText: { color: colors.foreground, fontSize: 12, fontWeight: fontWeight.semibold },
  modelDropdown: { position: 'absolute', top: 40, right: 0, width: 180, backgroundColor: colors.card2, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, zIndex: 100, overflow: 'hidden', ...shadow.md },
  modelOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modelOptionOn: { backgroundColor: colors.primary + '10' },
  modelOptionText: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.medium },
  modelOptionSub: { color: colors.muted, fontSize: 10, marginTop: 1 },
  clearBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  msgRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarUser: { backgroundColor: colors.primary },
  avatarAI: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  bubble: { maxWidth: '82%', borderRadius: radius.xl, padding: spacing.md },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.foreground, fontSize: typography.sm, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  cursor: { width: 2, height: 16, backgroundColor: colors.primary, borderRadius: 1, marginTop: 4 },
  dotsRow: { flexDirection: 'row', gap: 5, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, backgroundColor: colors.background },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: 11, color: colors.foreground, fontSize: typography.base, maxHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  sendBtnOff: { opacity: 0.3 },
});
