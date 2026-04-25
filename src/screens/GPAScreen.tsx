import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getGPARecords, createGPARecord, deleteGPARecord } from '../services/gpa';
import { GPARecord } from '../types';

const GPA_CLASS = (gpa: number) => {
  if (gpa >= 4.5) return 'First Class';
  if (gpa >= 3.5) return 'Second Upper';
  if (gpa >= 2.4) return 'Second Lower';
  if (gpa >= 1.5) return 'Third Class';
  return 'Pass';
};

export default function GPAScreen() {
  const [records, setRecords] = useState<GPARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [semester, setSemester] = useState('');
  const [gpa, setGpa] = useState('');
  const [credits, setCredits] = useState('');
  const [courses, setCourses] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setRecords(await getGPARecords()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const highest = records.length > 0 ? Math.max(...records.map(r => r.gpa)) : 0;
  const average = records.length > 0 ? (records.reduce((a, r) => a + r.gpa, 0) / records.length) : 0;

  const handleSave = async () => {
    if (!semester || !gpa) { Alert.alert('Error', 'Semester and GPA required'); return; }
    const g = parseFloat(gpa);
    if (isNaN(g) || g < 0 || g > 5) { Alert.alert('Error', 'GPA must be between 0 and 5'); return; }
    setSaving(true);
    try {
      const record = await createGPARecord({
        semester, gpa: g,
        totalCredits: parseInt(credits) || 0,
        courses: courses.split(',').map(c => c.trim()).filter(Boolean),
        class: GPA_CLASS(g),
      });
      setRecords(prev => [record, ...prev]);
      setShowAdd(false); setSemester(''); setGpa(''); setCredits(''); setCourses('');
    } catch { Alert.alert('Error', 'Failed to save GPA record'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this GPA record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteGPARecord(id).catch(() => {});
        setRecords(prev => prev.filter(r => r.id !== id));
      }},
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>GPA Tracker</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Summary */}
        {records.length > 0 && (
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{highest.toFixed(2)}</Text>
              <Text style={s.summaryLabel}>Highest GPA</Text>
              <Text style={s.summaryClass}>{GPA_CLASS(highest)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{average.toFixed(2)}</Text>
              <Text style={s.summaryLabel}>Average GPA</Text>
              <Text style={s.summaryClass}>{GPA_CLASS(average)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{records.length}</Text>
              <Text style={s.summaryLabel}>Semesters</Text>
            </View>
          </View>
        )}

        {/* Records */}
        {records.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎓</Text>
            <Text style={s.emptyTitle}>No GPA records yet</Text>
            <Text style={s.emptyText}>Track your academic performance each semester</Text>
          </View>
        ) : records.map(record => (
          <View key={record.id} style={s.recordCard}>
            <View style={s.recordHeader}>
              <View>
                <Text style={s.recordSemester}>{record.semester}</Text>
                <Text style={s.recordClass}>{record.class}</Text>
              </View>
              <View style={s.recordRight}>
                <Text style={[s.recordGpa, { color: record.gpa >= 3.5 ? colors.green : record.gpa >= 2.4 ? colors.primary : colors.red }]}>
                  {record.gpa.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(record.id)}>
                  <Text style={s.deleteText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            {record.totalCredits > 0 && <Text style={s.recordCredits}>{record.totalCredits} credits</Text>}
            {record.courses.length > 0 && (
              <View style={s.courseTags}>
                {record.courses.slice(0, 5).map(c => (
                  <View key={c} style={s.tag}><Text style={s.tagText}>{c}</Text></View>
                ))}
              </View>
            )}
            {/* GPA bar */}
            <View style={s.gpaTrack}>
              <View style={[s.gpaFill, { width: `${(record.gpa / 5) * 100}%`, backgroundColor: record.gpa >= 3.5 ? colors.green : record.gpa >= 2.4 ? colors.primary : colors.red }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add GPA Record</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); setSemester(''); setGpa(''); setCredits(''); setCourses(''); }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.label}>Semester</Text>
            <TextInput style={s.input} value={semester} onChangeText={setSemester} placeholder="e.g. 2024/2025 First Semester" placeholderTextColor={colors.muted} />
            <Text style={s.label}>GPA (0 - 5)</Text>
            <TextInput style={s.input} value={gpa} onChangeText={setGpa} placeholder="e.g. 4.2" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
            <Text style={s.label}>Total Credits (optional)</Text>
            <TextInput style={s.input} value={credits} onChangeText={setCredits} placeholder="e.g. 18" placeholderTextColor={colors.muted} keyboardType="numeric" />
            <Text style={s.label}>Courses (comma-separated, optional)</Text>
            <TextInput style={[s.input, { minHeight: 80 }]} value={courses} onChangeText={setCourses} placeholder="e.g. CSC301, MTH201, PHY201" placeholderTextColor={colors.muted} multiline />
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Record</Text>}
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
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  summaryValue: { color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' },
  summaryLabel: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  summaryClass: { color: colors.foreground, fontSize: 10, fontWeight: '600', marginTop: 2 },
  recordCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordSemester: { color: colors.foreground, fontSize: typography.base, fontWeight: '700' },
  recordClass: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  recordRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordGpa: { fontSize: typography['2xl'], fontWeight: '900' },
  deleteText: { fontSize: 16 },
  recordCredits: { color: colors.muted, fontSize: typography.xs },
  courseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.muted, fontSize: 11 },
  gpaTrack: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  gpaFill: { height: '100%', borderRadius: radius.full },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  modalClose: { color: colors.muted, fontSize: typography.xl },
  modalContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  label: { color: colors.muted, fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: 1, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
