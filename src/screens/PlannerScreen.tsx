import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT } from '../lib/theme';
import { getStudyPlans, createStudyPlan, deleteStudyPlan } from '../services/planner';
import { StudyPlan } from '../types';
import { callEdgeFunction } from '../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';

type PlannerView = 'list' | 'detail' | 'calendar';
interface ScheduleTask { subject: string; duration: string; focus: string; }
interface ScheduleDay { day: string; date: string; tasks: ScheduleTask[]; }

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').trim();

const SkeletonRow = () => (
  <View style={s.skRow}>
    <View style={s.skLine} />
    <View style={[s.skLine, { width: '60%', height: 10, marginTop: 6 }]} />
    <View style={[s.skLine, { width: '40%', height: 6, marginTop: 8 }]} />
  </View>
);

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<PlannerView>('list');
  const [selected, setSelected] = useState<StudyPlan | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Add form
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hours, setHours] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [genError, setGenError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setPlans(await getStudyPlans()); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleAdd = async () => {
    setFormError('');
    if (!name.trim()) { setFormError('Plan name is required'); return; }
    if (!hours.trim() || isNaN(parseInt(hours))) { setFormError('Enter a valid number of hours'); return; }
    setAddLoading(true);
    try {
      const plan = await createStudyPlan({
        name: name.trim(),
        subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
        totalHours: parseInt(hours),
      });
      setPlans(prev => [plan, ...prev]);
      setShowAdd(false); setName(''); setSubjects(''); setHours('');
    } catch { setFormError('Failed to create plan. Try again.'); }
    finally { setAddLoading(false); }
  };

  const handleAISuggest = async () => {
    if (!name.trim()) { setFormError('Enter a plan name first'); return; }
    setFormError(''); setAiLoading(true);
    try {
      const res = await callEdgeFunction('ai-chat', {
        messages: [{ role: 'user', content: `For a study plan called "${name}", suggest 3-5 university subjects as a comma-separated list only. No explanation.` }],
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
      setSubjects(cleanText(text));
    } catch { setFormError('AI suggestion failed'); }
    finally { setAiLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteStudyPlan(deleteTarget).catch(() => {});
    setPlans(prev => prev.filter(p => p.id !== deleteTarget));
    if (selected?.id === deleteTarget) { setSelected(null); setView('list'); }
    setDeleteTarget(null);
  };

  const generateSchedule = async (plan: StudyPlan) => {
    setGenLoading(true); setGenError('');
    try {
      const today = new Date();
      const dayNames = Array.from({ length: 7 }, (_, i) => format(addDays(today, i), 'EEEE, MMM d'));
      const res = await callEdgeFunction('ai-chat', {
        messages: [{
          role: 'user',
          content: `Create a ${plan.totalHours}-hour study schedule for "${plan.name}" covering: ${plan.subjects.join(', ')}.
Use these exact dates: ${dayNames.join(', ')}.
Return ONLY a JSON array:
[{"day":"Monday, Apr 28","date":"Day 1","tasks":[{"subject":"CSC","duration":"2h","focus":"Core concepts"}]}]
No markdown, no explanation.`,
        }],
        providerId: 'google',
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try { fullText += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''; } catch { /* skip */ }
            }
          }
        }
      }
      const match = fullText.match(/\[[\s\S]*\]/);
      if (match) setSchedule(JSON.parse(match[0]));
      else setGenError('Could not parse schedule. Try again.');
    } catch { setGenError('Failed to generate schedule. Check your connection.'); }
    finally { setGenLoading(false); }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const getScheduleForDate = (date: Date) =>
    schedule.find(s => s.day.includes(format(date, 'MMM d'))) || null;

  if (loading) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Study Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </ScrollView>
    </View>
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Plan"
        message={`Remove "${selected.name}" permanently?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setView('list'); setSchedule([]); setGenError(''); }} style={s.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={s.backText}>Plans</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{selected.name}</Text>
        <TouchableOpacity onPress={() => setDeleteTarget(selected.id)} style={s.iconBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.red} />
        </TouchableOpacity>
      </View>

      {/* Schedule / Calendar toggle */}
      <View style={s.segmentRow}>
        <TouchableOpacity style={[s.segment, view === 'detail' && s.segmentOn]} onPress={() => setView('detail')}>
          <Text style={[s.segmentText, view === 'detail' && s.segmentTextOn]}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.segment, view === 'calendar' && s.segmentOn]} onPress={() => setView('calendar')}>
          <Text style={[s.segmentText, view === 'calendar' && s.segmentTextOn]}>Calendar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}>
        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { icon: 'time-outline' as const,    color: '#6366f1', value: `${selected.totalHours}h`, label: 'Hours'    },
            { icon: 'book-outline' as const,     color: colors.green, value: String(selected.subjects.length), label: 'Subjects' },
            { icon: 'trending-up-outline' as const, color: colors.primary, value: `${selected.progress}%`, label: 'Progress' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Overall Progress</Text>
            <Text style={s.progressPct}>{selected.progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${selected.progress}%` as any }]} />
          </View>
        </View>

        {/* Subjects */}
        {selected.subjects.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Subjects</Text>
            <View style={s.tagWrap}>
              {selected.subjects.map((sub, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>{sub}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Generate schedule */}
        {schedule.length === 0 && (
          <>
            {genError ? (
              <View style={s.inlineError}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
                <Text style={s.inlineErrorText}>{genError}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={[s.genBtn, genLoading && { opacity: 0.7 }]} onPress={() => generateSchedule(selected)} disabled={genLoading}>
              {genLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="sparkles-outline" size={18} color="#fff" /><Text style={s.genBtnText}>Generate AI Schedule</Text></>}
            </TouchableOpacity>
          </>
        )}

        {/* Schedule days */}
        {schedule.map((day, i) => (
          <View key={i} style={s.scheduleDay}>
            <Text style={s.scheduleDayTitle}>{day.day}</Text>
            {day.tasks.map((task, j) => (
              <View key={j} style={[s.scheduleTask, j === 0 && { borderTopWidth: 0 }]}>
                <View style={{ minWidth: 80 }}>
                  <Text style={s.taskSubject}>{task.subject}</Text>
                  <Text style={s.taskDuration}>{task.duration}</Text>
                </View>
                <Text style={s.taskFocus}>{task.focus}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // ── Calendar view ──────────────────────────────────────────────────────────
  if (view === 'calendar' && selected) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setView('detail')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={s.backText}>Schedule</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Calendar</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.segmentRow}>
        <TouchableOpacity style={s.segment} onPress={() => setView('detail')}>
          <Text style={s.segmentText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.segment, s.segmentOn]} onPress={() => setView('calendar')}>
          <Text style={[s.segmentText, s.segmentTextOn]}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* Week strip */}
      <View style={s.weekStrip}>
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const isSel = isSameDay(day, selectedDate);
          const hasTask = !!getScheduleForDate(day);
          return (
            <TouchableOpacity key={i} style={s.weekDay} onPress={() => setSelectedDate(day)} activeOpacity={0.7}>
              <Text style={[s.weekDayLabel, isSel && { color: colors.primary }]}>{format(day, 'EEE')}</Text>
              <View style={[s.weekDayCircle, isToday && s.weekDayToday, isSel && s.weekDaySelected]}>
                <Text style={[s.weekDayNum, (isToday || isSel) && { color: '#fff' }]}>{format(day, 'd')}</Text>
              </View>
              {hasTask && <View style={s.weekDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Week navigation */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, -7))} style={s.weekNavBtn}>
          <Ionicons name="chevron-back" size={16} color={colors.primary} />
          <Text style={s.weekNavText}>Prev</Text>
        </TouchableOpacity>
        <Text style={s.weekNavMonth}>{format(weekStart, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, 7))} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}>
        <Text style={s.calDateTitle}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
        {schedule.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} style={{ opacity: 0.3 }} />
            <Text style={s.emptyText}>Generate a schedule first from the Schedule tab</Text>
          </View>
        ) : (() => {
          const day = getScheduleForDate(selectedDate);
          if (!day) return (
            <View style={s.emptyBox}>
              <Ionicons name="moon-outline" size={28} color={colors.muted} style={{ opacity: 0.3 }} />
              <Text style={s.emptyText}>No tasks scheduled for this day</Text>
            </View>
          );
          return day.tasks.map((task, i) => (
            <View key={i} style={s.calTask}>
              <View style={s.calTaskBar} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.taskSubject}>{task.subject}</Text>
                  <Text style={s.taskDuration}>{task.duration}</Text>
                </View>
                <Text style={s.taskFocus}>{task.focus}</Text>
              </View>
            </View>
          ));
        })()}
      </ScrollView>
    </View>
  );

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Study Planner</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {plans.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyStateIcon}><Ionicons name="library-outline" size={36} color={colors.muted} style={{ opacity: 0.3 }} /></View>
            <Text style={s.emptyStateTitle}>No study plans yet</Text>
            <Text style={s.emptyStateSub}>Create your first plan with AI-powered scheduling</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>Create Plan</Text>
            </TouchableOpacity>
          </View>
        ) : plans.map(plan => (
          <TouchableOpacity
            key={plan.id} style={s.planCard}
            onPress={() => { setSelected(plan); setSchedule([]); setGenError(''); setView('detail'); }}
            activeOpacity={0.8}
          >
            <View style={s.planHeader}>
              <Text style={s.planName} numberOfLines={1}>{plan.name}</Text>
              <TouchableOpacity onPress={() => setDeleteTarget(plan.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.iconBtn}>
                <Ionicons name="trash-outline" size={15} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.planMeta}>
              <View style={s.planMetaItem}>
                <Ionicons name="time-outline" size={12} color={colors.muted} />
                <Text style={s.planMetaText}>{plan.totalHours}h</Text>
              </View>
              <View style={s.planMetaItem}>
                <Ionicons name="book-outline" size={12} color={colors.muted} />
                <Text style={s.planMetaText}>{plan.subjects.length} subjects</Text>
              </View>
              <Text style={[s.planProgress, { color: plan.progress > 0 ? colors.primary : colors.muted }]}>
                {plan.progress}%
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${plan.progress}%` as any }]} />
            </View>
            {plan.subjects.length > 0 && (
              <View style={s.tagWrap}>
                {plan.subjects.slice(0, 4).map(sub => (
                  <View key={sub} style={s.tag}><Text style={s.tagText}>{sub}</Text></View>
                ))}
                {plan.subjects.length > 4 && <View style={s.tag}><Text style={s.tagText}>+{plan.subjects.length - 4}</Text></View>}
              </View>
            )}
            <Text style={s.tapHint}>Tap to view details & AI schedule →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Delete confirm */}
      <ConfirmDialog
        visible={!!deleteTarget && view === 'list'}
        title="Delete Plan"
        message="Remove this study plan permanently?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Study Plan</Text>
            <TouchableOpacity style={s.iconBtn} onPress={() => { setShowAdd(false); setName(''); setSubjects(''); setHours(''); setFormError(''); }}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {formError ? (
              <View style={s.inlineError}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
                <Text style={s.inlineErrorText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={s.fieldLabel}>Plan Name *</Text>
            <TextInput style={s.fieldInput} value={name} onChangeText={setName}
              placeholder="e.g. Final Exam Prep" placeholderTextColor={colors.muted} />

            <Text style={s.fieldLabel}>Total Hours *</Text>
            <TextInput style={s.fieldInput} value={hours} onChangeText={setHours}
              placeholder="e.g. 20" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <View style={s.subjectLabelRow}>
              <Text style={[s.fieldLabel, { flex: 1, marginBottom: 0 }]}>Subjects (comma-separated)</Text>
              <TouchableOpacity style={s.aiSuggestBtn} onPress={handleAISuggest} disabled={aiLoading}>
                {aiLoading
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <><Ionicons name="sparkles-outline" size={12} color={colors.primary} /><Text style={s.aiSuggestText}>AI Suggest</Text></>}
              </TouchableOpacity>
            </View>
            <TextInput style={[s.fieldInput, { minHeight: 80 }]} value={subjects} onChangeText={setSubjects}
              placeholder="e.g. CSC, Math, Physics" placeholderTextColor={colors.muted} multiline textAlignVertical="top" />

            <TouchableOpacity style={[s.saveBtn, addLoading && { opacity: 0.6 }]} onPress={handleAdd} disabled={addLoading}>
              {addLoading ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={s.saveBtnText}>Create Plan</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  headerTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backText: { color: colors.primary, fontSize: typography.base, fontWeight: fontWeight.semibold },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.full },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: fontWeight.bold },
  segmentRow: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.muted, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  segmentTextOn: { color: '#fff' },
  content: { padding: spacing.md, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { color: colors.foreground, fontSize: typography.xl, fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: typography.xs },
  progressCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  progressPct: { color: colors.primary, fontSize: typography.sm, fontWeight: fontWeight.bold },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  cardTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.card2, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tagText: { color: colors.muted, fontSize: 11 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md },
  genBtnText: { color: '#fff', fontSize: typography.base, fontWeight: fontWeight.bold },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.red + '12', borderRadius: radius.md, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red + '30' },
  inlineErrorText: { color: colors.red, fontSize: typography.sm, flex: 1 },
  scheduleDay: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.xs },
  scheduleDayTitle: { color: colors.primary, fontSize: typography.sm, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  scheduleTask: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  taskSubject: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  taskDuration: { color: colors.primary, fontSize: typography.xs },
  taskFocus: { color: colors.muted, fontSize: typography.xs, flex: 1, lineHeight: 18 },
  // Calendar
  weekStrip: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, paddingVertical: spacing.sm },
  weekDay: { flex: 1, alignItems: 'center', gap: 4 },
  weekDayLabel: { color: colors.muted, fontSize: 10, fontWeight: fontWeight.semibold },
  weekDayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  weekDayToday: { backgroundColor: colors.border },
  weekDaySelected: { backgroundColor: colors.primary },
  weekDayNum: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  weekDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  weekNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: spacing.sm },
  weekNavText: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.semibold },
  weekNavMonth: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.bold },
  calDateTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: fontWeight.heavy, letterSpacing: -0.5, marginBottom: spacing.xs },
  calTask: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  calTaskBar: { width: 3, borderRadius: 2, backgroundColor: colors.primary },
  // List view
  planCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { color: colors.foreground, fontSize: typography.base, fontWeight: fontWeight.bold, flex: 1, marginRight: spacing.sm },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planMetaText: { color: colors.muted, fontSize: typography.xs },
  planProgress: { marginLeft: 'auto', fontSize: typography.sm, fontWeight: fontWeight.bold },
  tapHint: { color: colors.primary, fontSize: typography.xs, opacity: 0.6 },
  emptyState: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyStateIcon: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyStateTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.semibold },
  emptyStateSub: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: 11, marginTop: spacing.sm },
  emptyBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: fontWeight.bold },
  emptyBox: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: fontWeight.heavy },
  modalBody: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  fieldLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  fieldInput: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  subjectLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: 6 },
  aiSuggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary },
  aiSuggestText: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.semibold },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: fontWeight.bold },
  skRow: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.sm },
  skLine: { height: 16, borderRadius: 6, backgroundColor: colors.surface, width: '80%' },
});
