import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT } from '../lib/theme';
import { callEdgeFunction } from '../lib/supabase';
import { getResearchHistory, deleteResearchEntry } from '../services/research';

interface SearchResult { id: string; title: string; snippet: string; url: string; source: string; isGitHub?: boolean; }
interface AIInsights { insights: string; gaps: string[]; relatedTopics: string[]; }

const MODES = [
  { id: 'academic', label: 'Academic', icon: 'library-outline' as const },
  { id: 'projects', label: 'Projects', icon: 'code-slash-outline' as const },
];

export default function ResearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'academic' | 'projects'>('academic');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [description, setDescription] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getResearchHistory().then(setHistory).catch(console.error).finally(() => setLoadingHistory(false));
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true); setResults([]); setInsights(null);
    setSelected(null); setDescription(''); setError('');
    try {
      const res = await callEdgeFunction('research-search', { query: query.trim(), searchMode: mode });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Search failed'); }
      const data = await res.json();
      setResults(data.results || []);
      if (data.insights) setInsights({ insights: data.insights || '', gaps: data.gaps || [], relatedTopics: data.relatedTopics || [] });
    } catch (e: any) { setError(e.message || 'Search failed. Ensure SERPER_API_KEY is set.'); }
    finally { setSearching(false); }
  };

  const generateDescription = async (r: SearchResult) => {
    setSelected(r); setDescription(''); setDescLoading(true);
    try {
      const res = await callEdgeFunction('ai-chat', {
        messages: [{ role: 'user', content: `Write a 2-3 sentence academic description of:\nTitle: "${r.title}"\nSource: ${r.source}\nSnippet: "${r.snippet}"\n\nFocus on what it covers and how a student can use it.` }],
        providerId: 'google',
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try { text += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''; } catch { /* skip */ }
            }
          }
        }
      }
      setDescription(text.replace(/\{\{[^}]+\}\}/g, '').trim());
    } catch { setDescription('Failed to generate description.'); }
    finally { setDescLoading(false); }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Research</Text>
          <Text style={s.subtitle}>Serper + AI · via Supabase Edge</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={colors.muted} style={s.searchIcon} />
          <TextInput ref={inputRef} style={s.searchInput} value={query} onChangeText={setQuery}
            placeholder={mode === 'academic' ? 'Search papers, journals...' : 'Search projects, GitHub...'}
            placeholderTextColor={colors.muted} returnKeyType="search" onSubmitEditing={handleSearch} />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[s.searchBtn, (!query.trim() || searching) && s.searchBtnOff]} onPress={handleSearch} disabled={!query.trim() || searching}>
          {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Mode tabs */}
      <View style={s.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity key={m.id} style={[s.modeTab, mode === m.id && s.modeTabOn]} onPress={() => setMode(m.id as any)}>
            <Ionicons name={m.icon} size={14} color={mode === m.id ? '#fff' : colors.muted} />
            <Text style={[s.modeText, mode === m.id && s.modeTextOn]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}>
        {/* Error */}
        {error ? (
          <View style={s.errCard}>
            <Ionicons name="warning-outline" size={16} color={colors.red} />
            <Text style={s.errText}>{error}</Text>
          </View>
        ) : null}

        {/* AI Insights */}
        {insights && (
          <View style={s.insightsCard}>
            <View style={s.insightsHeader}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={s.insightsTitle}>AI Summary</Text>
            </View>
            {insights.insights ? <Text style={s.insightsText}>{insights.insights}</Text> : null}
            {insights.relatedTopics.length > 0 && (
              <View style={s.tagRow}>
                {insights.relatedTopics.map((t, i) => (
                  <TouchableOpacity key={i} style={s.topicTag} onPress={() => { setQuery(t); inputRef.current?.focus(); }}>
                    <Text style={s.topicTagText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Results */}
        {results.map((r, i) => (
          <TouchableOpacity key={r.id || i} style={[s.resultCard, selected?.id === r.id && s.resultCardOn]} onPress={() => generateDescription(r)} activeOpacity={0.8}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle} numberOfLines={2}>{r.title}</Text>
              <TouchableOpacity onPress={() => r.url && Linking.openURL(r.url)} style={s.extBtn}>
                <Ionicons name="open-outline" size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={s.resultSnippet} numberOfLines={2}>{r.snippet}</Text>
            <View style={s.resultFooter}>
              <View style={[s.sourceBadge, r.isGitHub && s.sourceBadgeGH]}>
                <Text style={[s.sourceBadgeText, r.isGitHub && { color: colors.green }]}>{r.source}</Text>
              </View>
              {selected?.id !== r.id && <Text style={s.tapHint}>Tap for AI description</Text>}
            </View>

            {/* Description panel */}
            {selected?.id === r.id && (
              <View style={s.descPanel}>
                <Text style={s.descTitle}>AI Description</Text>
                {descLoading
                  ? <View style={s.descLoading}><ActivityIndicator color={colors.primary} size="small" /></View>
                  : <>
                      <Text style={s.descText}>{description}</Text>
                      {description ? (
                        <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(description)}>
                          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? colors.green : '#fff'} />
                          <Text style={[s.copyBtnText, copied && { color: colors.green }]}>{copied ? 'Copied!' : 'Copy Description'}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                }
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* History */}
        {results.length === 0 && !searching && (
          <>
            <View style={s.historyHeader}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={s.historyTitle}>Recent Searches</Text>
            </View>
            {loadingHistory ? (
              <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
            ) : history.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="search-outline" size={28} color={colors.muted} style={{ opacity: 0.3 }} />
                <Text style={s.emptyText}>No searches yet</Text>
              </View>
            ) : history.slice(0, 8).map(h => (
              <TouchableOpacity key={h.id} style={s.historyRow} onPress={() => setQuery(h.title)} activeOpacity={0.7}>
                <Ionicons name="time-outline" size={14} color={colors.muted} style={{ opacity: 0.5 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.historyName} numberOfLines={1}>{h.title}</Text>
                  <Text style={s.historySub} numberOfLines={1}>{h.abstract}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteResearchEntry(h.id).then(() => setHistory(p => p.filter(x => x.id !== h.id)))} style={s.histDelBtn}>
                  <Ionicons name="trash-outline" size={14} color={colors.muted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  searchWrap: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.xl, paddingHorizontal: spacing.md, height: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.foreground, fontSize: typography.base },
  clearBtn: { padding: 4 },
  searchBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBtnOff: { opacity: 0.4 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  modeTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  modeTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { color: colors.muted, fontSize: typography.xs, fontWeight: fontWeight.semibold },
  modeTextOn: { color: '#fff' },
  content: { padding: spacing.md, gap: spacing.md },
  errCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.red + '12', borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red + '30' },
  errText: { color: colors.red, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  insightsCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary + '40', gap: spacing.sm },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightsTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  insightsText: { color: colors.muted, fontSize: typography.sm, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicTag: { backgroundColor: colors.primary + '15', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary + '40' },
  topicTagText: { color: colors.primary, fontSize: 11, fontWeight: fontWeight.semibold },
  resultCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  resultCardOn: { borderColor: colors.primary },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  resultTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold, flex: 1, lineHeight: 20 },
  extBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  resultSnippet: { color: colors.muted, fontSize: typography.xs, lineHeight: 18 },
  resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceBadge: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sourceBadgeGH: { backgroundColor: colors.green + '12', borderColor: colors.green + '30' },
  sourceBadgeText: { color: colors.muted, fontSize: 11 },
  tapHint: { color: colors.muted, fontSize: 10, opacity: 0.5 },
  descPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary + '30' },
  descTitle: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  descLoading: { padding: spacing.md, alignItems: 'center' },
  descText: { color: colors.muted, fontSize: typography.sm, lineHeight: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 9, alignSelf: 'flex-start' },
  copyBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: fontWeight.bold },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyTitle: { color: colors.muted, fontSize: typography.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  historyName: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.medium },
  historySub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  histDelBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.muted, fontSize: typography.sm },
});
