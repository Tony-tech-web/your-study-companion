import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { callEdgeFunction } from '../lib/supabase';
import { getResearchHistory, deleteResearchEntry } from '../services/research';
import { ResearchPaper } from '../types';

interface SearchResult { id: string; title: string; snippet: string; url: string; source: string; isGitHub?: boolean; }
interface AIInsights { insights: string; gaps: string[]; relatedTopics: string[]; }

const MODES = [{ id: 'academic', label: '📄 Academic' }, { id: 'projects', label: '💻 Projects' }];

export default function ResearchScreen() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'academic' | 'projects'>('academic');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [history, setHistory] = useState<ResearchPaper[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [description, setDescription] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getResearchHistory().then(setHistory).catch(console.error).finally(() => setLoadingHistory(false));
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true); setResults([]); setInsights(null); setSelected(null); setDescription(''); setError('');
    try {
      const res = await callEdgeFunction('research-search', { query: query.trim(), searchMode: mode });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Search failed'); }
      const data = await res.json();
      setResults(data.results || []);
      if (data.insights || data.gaps) setInsights({ insights: data.insights || '', gaps: data.gaps || [], relatedTopics: data.relatedTopics || [] });
    } catch (e: any) {
      setError(e.message || 'Search failed. Check SERPER_API_KEY in Supabase secrets.');
    } finally { setSearching(false); }
  };

  const generateDescription = async (result: SearchResult) => {
    setSelected(result); setDescription(''); setDescLoading(true);
    try {
      const res = await callEdgeFunction('ai-chat', {
        messages: [{
          role: 'user',
          content: `Write a 2-3 sentence academic description of this source:
Title: "${result.title}"
Source: ${result.source}
Snippet: "${result.snippet}"
URL: ${result.url}

Focus on what this source covers, its relevance, and how a student could use it. Be specific and concise.`,
        }],
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

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Research</Text>
        <Text style={s.subtitle}>Powered by Serper + AI</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchBar}>
        <TextInput
          style={s.input} value={query} onChangeText={setQuery}
          placeholder={mode === 'academic' ? 'Search papers, journals...' : 'Search GitHub, projects...'}
          placeholderTextColor={colors.muted}
          returnKeyType="search" onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={[s.searchBtn, (!query.trim() || searching) && s.searchBtnDisabled]} onPress={handleSearch} disabled={!query.trim() || searching}>
          {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {/* Mode toggle */}
      <View style={s.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity key={m.id} style={[s.modeBtn, mode === m.id && s.modeBtnActive]} onPress={() => setMode(m.id as any)}>
            <Text style={[s.modeBtnText, mode === m.id && s.modeBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {error && <View style={s.errorCard}><Text style={s.errorText}>{error}</Text></View>}

        {/* AI Insights */}
        {insights && (
          <View style={s.insightsCard}>
            <Text style={s.insightsTitle}>✨ AI Summary</Text>
            {insights.insights && <Text style={s.insightsText}>{insights.insights}</Text>}
            {insights.gaps.length > 0 && (
              <>
                <Text style={s.insightsSubtitle}>Research Gaps</Text>
                <View style={s.tagRow}>{insights.gaps.map((g, i) => <View key={i} style={s.tag}><Text style={s.tagText}>{g}</Text></View>)}</View>
              </>
            )}
            {insights.relatedTopics.length > 0 && (
              <>
                <Text style={s.insightsSubtitle}>Related Topics</Text>
                <View style={s.tagRow}>
                  {insights.relatedTopics.map((t, i) => (
                    <TouchableOpacity key={i} style={[s.tag, s.tagTopic]} onPress={() => setQuery(t)}>
                      <Text style={[s.tagText, { color: colors.primary }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Results */}
        {results.map((r, i) => (
          <TouchableOpacity key={r.id || i} style={[s.resultCard, selected?.id === r.id && s.resultCardSelected]} onPress={() => generateDescription(r)}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle} numberOfLines={2}>{r.title}</Text>
              <TouchableOpacity onPress={() => r.url && Linking.openURL(r.url)}>
                <Text style={s.resultLink}>↗</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.resultSnippet} numberOfLines={2}>{r.snippet}</Text>
            <View style={s.resultFooter}>
              <View style={[s.sourceBadge, r.isGitHub && s.sourceBadgeGH]}>
                <Text style={[s.sourceBadgeText, r.isGitHub && s.sourceBadgeTextGH]}>{r.source}</Text>
              </View>
              <Text style={s.tapHint}>Tap for AI description</Text>
            </View>

            {/* AI description panel */}
            {selected?.id === r.id && (
              <View style={s.descPanel}>
                <Text style={s.descTitle}>📝 AI Description</Text>
                {descLoading
                  ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
                  : <Text style={s.descText}>{description}</Text>}
                {description && (
                  <TouchableOpacity style={s.copyBtn} onPress={() => Alert.alert('Copied!', description)}>
                    <Text style={s.copyBtnText}>Copy Description</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* History */}
        {results.length === 0 && !searching && (
          <>
            <Text style={s.sectionTitle}>🕐 Recent Searches</Text>
            {loadingHistory
              ? <ActivityIndicator color={colors.primary} />
              : history.length === 0
                ? <View style={s.empty}><Text style={s.emptyText}>No searches yet</Text></View>
                : history.slice(0, 8).map(h => (
                  <TouchableOpacity key={h.id} style={s.historyRow} onPress={() => setQuery(h.title)}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyTitle} numberOfLines={1}>{h.title}</Text>
                      <Text style={s.historySub} numberOfLines={1}>{h.abstract}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteResearchEntry(h.id).then(() => setHistory(p => p.filter(x => x.id !== h.id)))}>
                      <Text style={s.historyDelete}>🗑</Text>
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
  header: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  searchBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.foreground, fontSize: typography.sm, borderWidth: 1, borderColor: colors.border },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { color: colors.muted, fontSize: typography.xs, fontWeight: '600' },
  modeBtnTextActive: { color: '#fff' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  errorCard: { backgroundColor: colors.red + '15', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.red + '30' },
  errorText: { color: colors.red, fontSize: typography.sm },
  insightsCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '40', gap: spacing.sm },
  insightsTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  insightsText: { color: colors.muted, fontSize: typography.xs, lineHeight: 18 },
  insightsSubtitle: { color: colors.foreground, fontSize: typography.xs, fontWeight: '600', marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  tagTopic: { borderColor: colors.primary + '50' },
  tagText: { color: colors.muted, fontSize: 11 },
  resultCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  resultCardSelected: { borderColor: colors.primary },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  resultTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600', flex: 1, lineHeight: 20 },
  resultLink: { color: colors.primary, fontSize: typography.lg, fontWeight: '700' },
  resultSnippet: { color: colors.muted, fontSize: typography.xs, lineHeight: 18 },
  resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceBadge: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  sourceBadgeGH: { backgroundColor: colors.green + '15', borderColor: colors.green + '30' },
  sourceBadgeText: { color: colors.muted, fontSize: 11 },
  sourceBadgeTextGH: { color: colors.green },
  tapHint: { color: colors.muted, fontSize: 10, opacity: 0.5 },
  descPanel: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30', gap: spacing.sm, marginTop: spacing.sm },
  descTitle: { color: colors.foreground, fontSize: typography.xs, fontWeight: '700' },
  descText: { color: colors.muted, fontSize: typography.xs, lineHeight: 18 },
  copyBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  copyBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  sectionTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: typography.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  historyTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  historySub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  historyDelete: { fontSize: 16 },
});
