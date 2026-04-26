import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, radius, typography, fontWeight, shadow, TAB_BAR_HEIGHT } from '../lib/theme';
import { Screen, PageHeader, PageScroll, Card, PrimaryButton, PillButton, StatTile, EmptyState, Sep } from '../components/ScreenKit';
import { getStudyPlans, createStudyPlan, deleteStudyPlan } from '../services/planner';
import { StudyPlan } from '../types';
import { callEdgeFunction } from '../lib/supabase';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

type View = 'list' | 'calendar' | 'detail';

interface ScheduleTask { subject: string; duration: string; focus: string; }
interface ScheduleDay { day: string; date: string; tasks: ScheduleTask[]; }

const cleanText = (t: string) => t.replace(/\{\{[^}]+\}\}/g, '').trim();

export default function PlannerScreen() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<StudyPlan | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Add plan form state
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hours, setHours] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setPlans(await getStudyPlans());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleAdd = async () => {
    if (!name || !hours) { Alert.alert('Error', 'Plan name and hours are required'); return; }
    setAddLoading(true);
    try {
      const subArr = subjects.split(',').map(s => s.trim()).filter(Boolean);
      const plan = await createStudyPlan({ name, subjects: subArr, totalHours: parseInt(hours) || 0 });
      setPlans(prev => [plan, ...prev]);
      setShowAdd(false); setName(''); setSubjects(''); setHours('');
    } catch { Alert.alert('Error', 'Failed to create plan'); }
    finally { setAddLoading(false); }
  };

  const handleAISuggest = async () => {
    if (!name) { Alert.alert('Tip', 'Enter a plan name first for AI to suggest subjects'); return; }
    setAiSuggestLoading(true);
    try {
      const res = await callEdgeFunction('ai-chat', {
        messages: [{ role: 'user', content: `For a study plan called "${name}", suggest 3-5 relevant university subjects as a comma-separated list only. No explanation.` }],
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
    } catch { Alert.alert('Error', 'AI suggestion failed'); }
    finally { setAiSuggestLoading(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteStudyPlan(id).catch(() => {});
        setPlans(prev => prev.filter(p => p.id !== id));
        if (selected?.id === id) { setSelected(null); setView('list'); }
      }},
    ]);
  };

  const generateSchedule = async (plan: StudyPlan) => {
    setGenLoading(true);
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
    } catch (e) { Alert.alert('Error', 'Failed to generate schedule'); }
    finally { setGenLoading(false); }
  };

  // Calendar helpers
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getScheduleForDate = (date: Date) => {
    const label = format(date, 'EEEE, MMM d');
    return schedule.find(s => s.day.includes(format(date, 'MMM d'))) || null;
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  // ── Detail view ──────────────────────────────────────────────────────────
  if (view === 'detail' && selected) return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setView('list'); setSchedule([]); }}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{selected.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(selected.id)}>
          <Text style={s.deleteBtn}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* View toggle */}
      <View style={s.toggleRow}>
        {(['list', 'calendar'] as const).map(v => (
          <TouchableOpacity key={v} style={[s.toggleBtn, view === v && s.toggleBtnActive]}
            onPress={() => setView(v === 'list' ? 'detail' : 'calendar')}>
            <Text style={[s.toggleBtnText, view === v && s.toggleBtnTextActive]}>
              {v === 'list' ? 'Schedule' : 'Calendar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.detailContent}>
        {/* Plan info */}
        <View style={s.planInfoCard}>
          <View style={s.planInfoRow}>
            <Text style={s.planInfoLabel}>⏱ {selected.totalHours}h total</Text>
            <Text style={s.planInfoLabel}>📚 {selected.subjects.length} subjects</Text>
            <Text style={s.planInfoLabel}>📈 {selected.progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${selected.progress}%` }]} />
          </View>
          <View style={s.subjectTags}>
            {selected.subjects.map(sub => (
              <View key={sub} style={s.tag}><Text style={s.tagText}>{sub}</Text></View>
            ))}
          </View>
        </View>

        {/* Generate schedule button */}
        {schedule.length === 0 && (
          <TouchableOpacity style={s.genBtn} onPress={() => generateSchedule(selected)} disabled={genLoading}>
            {genLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={s.genBtnIcon}>✨</Text>
                  <Text style={s.genBtnText}>Generate AI Schedule</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Schedule list */}
        {schedule.length > 0 && schedule.map((day, i) => (
          <View key={i} style={s.scheduleDay}>
            <Text style={s.scheduleDayTitle}>{day.day}</Text>
            {day.tasks.map((task, j) => (
              <View key={j} style={s.scheduleTask}>
                <View style={s.scheduleTaskLeft}>
                  <Text style={s.scheduleTaskSubject}>{task.subject}</Text>
                  <Text style={s.scheduleTaskDuration}>{task.duration}</Text>
                </View>
                <Text style={s.scheduleTaskFocus}>{task.focus}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // ── Calendar view ─────────────────────────────────────────────────────────
  if (view === 'calendar' && selected) return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setView('detail')}>
          <Text style={s.backBtn}>← Plan</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Calendar</Text>
        <View />
      </View>

      {/* Week strip */}
      <View style={s.weekStrip}>
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const hasTask = !!getScheduleForDate(day);
          return (
            <TouchableOpacity key={i} style={[s.weekDay, isSelected && s.weekDaySelected]} onPress={() => setSelectedDate(day)}>
              <Text style={[s.weekDayName, isSelected && s.weekDayTextActive]}>{format(day, 'EEE')}</Text>
              <View style={[s.weekDayNum, isToday && s.weekDayToday, isSelected && s.weekDayNumSelected]}>
                <Text style={[s.weekDayNumText, (isToday || isSelected) && s.weekDayTextActive]}>{format(day, 'd')}</Text>
              </View>
              {hasTask && <View style={s.weekDayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Navigate weeks */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, -7))} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>← Prev Week</Text>
        </TouchableOpacity>
        <Text style={s.weekNavMonth}>{format(weekStart, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, 7))} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>Next Week →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.calContent}>
        <Text style={s.calDateTitle}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
        {schedule.length === 0 ? (
          <View style={s.calEmpty}>
            <Text style={s.calEmptyText}>Generate a schedule first from the Schedule tab</Text>
          </View>
        ) : (() => {
          const daySchedule = getScheduleForDate(selectedDate);
          return daySchedule ? (
            daySchedule.tasks.map((task, i) => (
              <View key={i} style={s.calTask}>
                <View style={s.calTaskBar} />
                <View style={{ flex: 1 }}>
                  <View style={s.calTaskHeader}>
                    <Text style={s.calTaskSubject}>{task.subject}</Text>
                    <Text style={s.calTaskDuration}>{task.duration}</Text>
                  </View>
                  <Text style={s.calTaskFocus}>{task.focus}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={s.calEmpty}>
              <Text style={s.calEmptyText}>No tasks scheduled for this day</Text>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Study Planner</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {plans.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>No study plans yet</Text>
            <Text style={s.emptyText}>Create your first plan with AI-powered scheduling</Text>
          </View>
        ) : plans.map(plan => (
          <TouchableOpacity key={plan.id} style={s.planCard} onPress={() => { setSelected(plan); setSchedule([]); setView('detail'); }}>
            <View style={s.planCardHeader}>
              <Text style={s.planName}>{plan.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(plan.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.planDelete}>🗑</Text>
              </TouchableOpacity>
            </View>
            <View style={s.planMeta}>
              <Text style={s.planMetaText}>⏱ {plan.totalHours}h</Text>
              <Text style={s.planMetaText}>📚 {plan.subjects.length} subjects</Text>
              <Text style={[s.planProgress, { color: plan.progress > 0 ? colors.primary : colors.muted }]}>
                {plan.progress}%
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${plan.progress}%` }]} />
            </View>
            <View style={s.subjectTags}>
              {plan.subjects.slice(0, 4).map(sub => (
                <View key={sub} style={s.tag}><Text style={s.tagText}>{sub}</Text></View>
              ))}
              {plan.subjects.length > 4 && <View style={s.tag}><Text style={s.tagText}>+{plan.subjects.length - 4}</Text></View>}
            </View>
            <Text style={s.viewDetail}>Tap to view details & schedule →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Plan Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Study Plan</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); setName(''); setSubjects(''); setHours(''); }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.inputLabel}>Plan Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder="e.g. Final Exam Prep" placeholderTextColor={colors.muted} />

            <Text style={s.inputLabel}>Total Study Hours</Text>
            <TextInput style={s.input} value={hours} onChangeText={setHours}
              placeholder="e.g. 20" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <View style={s.subjectsRow}>
              <Text style={[s.inputLabel, { flex: 1 }]}>Subjects (comma-separated)</Text>
              <TouchableOpacity style={s.aiBtn} onPress={handleAISuggest} disabled={aiSuggestLoading}>
                {aiSuggestLoading
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={s.aiBtnText}>✨ AI Suggest</Text>}
              </TouchableOpacity>
            </View>
            <TextInput style={[s.input, { minHeight: 80 }]} value={subjects} onChangeText={setSubjects}
              placeholder="e.g. CSC, Math, Physics" placeholderTextColor={colors.muted} multiline />

            <TouchableOpacity style={s.saveBtn} onPress={handleAdd} disabled={addLoading}>
              {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Plan</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.title3, fontWeight: fontWeight.black },
  headerTitle: { color: colors.foreground, fontSize: typography.body, fontWeight: fontWeight.bold, flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  backBtn: { color: colors.primary, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  deleteBtn: { color: colors.red, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontSize: typography.subheadline, fontWeight: fontWeight.bold },
  toggleRow: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, backgroundColor: colors.cardSolid, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText: { color: colors.muted, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  toggleBtnTextActive: { color: '#fff' },
  listContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  planCard: { backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  planName: { color: colors.foreground, fontSize: typography.body, fontWeight: fontWeight.bold, flex: 1 },
  planDelete: { fontSize: 16 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  planMetaText: { color: colors.muted, fontSize: typography.xs },
  planProgress: { marginLeft: 'auto', fontSize: typography.subheadline, fontWeight: fontWeight.bold },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  subjectTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  tag: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  viewDetail: { color: colors.primary, fontSize: typography.footnote, opacity: 0.7 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.foreground, fontSize: typography.title3, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: typography.subheadline, textAlign: 'center' },
  // Detail
  detailContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  planInfoCard: { backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderSolid, gap: spacing.sm },
  planInfoRow: { flexDirection: 'row', gap: spacing.md },
  planInfoLabel: { color: colors.muted, fontSize: typography.xs },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md },
  genBtnIcon: { fontSize: 18 },
  genBtnText: { color: '#fff', fontSize: typography.body, fontWeight: fontWeight.bold },
  scheduleDay: { backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  scheduleDayTitle: { color: colors.primary, fontSize: typography.subheadline, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  scheduleTask: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleTaskLeft: { minWidth: 80 },
  scheduleTaskSubject: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  scheduleTaskDuration: { color: colors.primary, fontSize: typography.xs },
  scheduleTaskFocus: { color: colors.muted, fontSize: typography.footnote, flex: 1 },
  // Calendar
  weekStrip: { flexDirection: 'row', backgroundColor: colors.cardSolid, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekDaySelected: {},
  weekDayName: { color: colors.muted, fontSize: 10, fontWeight: fontWeight.semibold, marginBottom: 4 },
  weekDayNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  weekDayToday: { backgroundColor: colors.border },
  weekDayNumSelected: { backgroundColor: colors.primary },
  weekDayNumText: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  weekDayTextActive: { color: '#fff' },
  weekDayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.card },
  weekNavBtn: { padding: spacing.sm },
  weekNavText: { color: colors.primary, fontSize: typography.footnote, fontWeight: fontWeight.semibold },
  weekNavMonth: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.bold },
  calContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  calDateTitle: { color: colors.foreground, fontSize: typography.title3, fontWeight: fontWeight.black, marginBottom: spacing.sm },
  calTask: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  calTaskBar: { width: 3, borderRadius: 2, backgroundColor: colors.primary },
  calTaskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  calTaskSubject: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.bold },
  calTaskDuration: { color: colors.primary, fontSize: typography.footnote, fontWeight: fontWeight.semibold },
  calTaskFocus: { color: colors.muted, fontSize: typography.xs },
  calEmpty: { alignItems: 'center', padding: spacing.xl },
  calEmptyText: { color: colors.muted, fontSize: typography.subheadline, textAlign: 'center' },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.foreground, fontSize: typography.title2, fontWeight: fontWeight.black },
  modalClose: { color: colors.muted, fontSize: typography.xl },
  modalContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 120 },
  inputLabel: { color: colors.muted, fontSize: typography.footnote, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { backgroundColor: colors.cardSolid, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.body, borderWidth: 1, borderColor: colors.border },
  subjectsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  aiBtnText: { color: colors.primary, fontSize: typography.footnote, fontWeight: fontWeight.semibold },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontSize: typography.body, fontWeight: fontWeight.bold },
});
