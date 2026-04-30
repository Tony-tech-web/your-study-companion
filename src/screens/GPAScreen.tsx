import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT, shadow } from '../lib/theme';
import { getGPARecords, createGPARecord, deleteGPARecord } from '../services/gpa';
import { GPARecord } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';

const GPA_CLASS = (gpa: number) => {
  if (gpa >= 4.5) return { label: 'First Class',    color: colors.primary };
  if (gpa >= 3.5) return { label: 'Second Upper',   color: colors.green  };
  if (gpa >= 2.4) return { label: 'Second Lower',   color: colors.blue   };
  if (gpa >= 1.5) return { label: 'Third Class',    color: colors.yellow };
  return               { label: 'Pass',             color: colors.muted  };
};

const SkeletonBox = ({ h = 80 }: { h?: number }) => (
  <View style={{ height: h, borderRadius: radius.xl, backgroundColor: colors.card, marginBottom: spacing.sm }} />
);

export default function GPAScreen() {
  const insets = useSafeAreaInsets();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [records, setRecords] = useState<GPARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [semester, setSemester] = useState('');
  const [gpa, setGpa] = useState('');
  const [credits, setCredits] = useState('');
  const [courses, setCourses] = useState('');

  const load = async () => {
    try { setRecords(await getGPARecords()); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const highest = records.length ? Math.max(...records.map(r => r.gpa)) : 0;
  const average = records.length ? records.reduce((a, r) => a + r.gpa, 0) / records.length : 0;

  const resetForm = () => { setSemester(''); setGpa(''); setCredits(''); setCourses(''); setFormError(''); };

  const handleSave = async () => {
    setFormError('');
    if (!semester.trim()) { setFormError('Semester is required'); return; }
    const g = parseFloat(gpa);
    if (isNaN(g) || g < 0 || g > 5) { setFormError('GPA must be between 0.00 and 5.00'); return; }
    setSaving(true);
    try {
      const rec = await createGPARecord({
        semester: semester.trim(), gpa: g,
        totalCredits: parseInt(credits) || 0,
        courses: courses.split(',').map(c => c.trim()).filter(Boolean),
        class: GPA_CLASS(g).label,
      });
      setRecords(p => [rec, ...p]);
      setShowAdd(false); resetForm();
    } catch { setFormError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteGPARecord(deleteId).catch(() => {});
    setRecords(p => p.filter(r => r.id !== deleteId));
    setDeleteId(null);
  };

  if (loading) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>GPA Tracker</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {[0,1,2].map(i => <SkeletonBox key={i} h={i === 0 ? 100 : 120} />)}
      </ScrollView>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ConfirmDialog
        visible={!!deleteId}
        title="Delete Record"
        message="Remove this GPA record permanently?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <View style={s.header}>
        <Text style={s.title}>GPA Tracker</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add Record</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Summary */}
        {records.length > 0 && (
          <View style={s.summaryRow}>
            {[
              { label: 'Highest', value: highest.toFixed(2), sub: GPA_CLASS(highest).label, color: GPA_CLASS(highest).color },
              { label: 'Average', value: average.toFixed(2), sub: GPA_CLASS(average).label, color: GPA_CLASS(average).color },
              { label: 'Semesters', value: String(records.length), sub: 'recorded', color: colors.primary },
            ].map(s => (
              <View key={s.label} style={st.summaryCard}>
                <Text style={[st.summaryValue, { color: s.color }]}>{s.value}</Text>
                <Text style={st.summaryLabel}>{s.label}</Text>
                <Text style={st.summarySub}>{s.sub}</Text>
              </View>
            ))}
          </View>
        )}

        {records.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="school-outline" size={32} color={colors.muted} /></View>
            <Text style={s.emptyTitle}>No GPA records yet</Text>
            <Text style={s.emptySub}>Track your academic performance each semester</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Add First Record</Text>
            </TouchableOpacity>
          </View>
        ) : records.map(rec => {
          const cls = GPA_CLASS(rec.gpa);
          return (
            <View key={rec.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardSemester} numberOfLines={1}>{rec.semester}</Text>
                  <View style={[s.classBadge, { backgroundColor: cls.color + '18' }]}>
                    <Text style={[s.classBadgeText, { color: cls.color }]}>{cls.label}</Text>
                  </View>
                </View>
                <View style={s.cardRight}>
                  <Text style={[s.cardGpa, { color: cls.color }]}>{rec.gpa.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDelete(rec.id)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              {rec.totalCredits > 0 && (
                <Text style={s.cardCredits}>{rec.totalCredits} credit units</Text>
              )}
              {rec.courses.length > 0 && (
                <View style={s.courseRow}>
                  {rec.courses.slice(0, 6).map(c => (
                    <View key={c} style={s.courseTag}><Text style={s.courseTagText}>{c}</Text></View>
                  ))}
                  {rec.courses.length > 6 && <View style={s.courseTag}><Text style={s.courseTagText}>+{rec.courses.length - 6}</Text></View>}
                </View>
              )}
              <View style={s.gpaBar}>
                <View style={[s.gpaBarFill, { width: `${(rec.gpa / 5) * 100}%` as any, backgroundColor: cls.color }]} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add GPA Record</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }} style={s.modalClose}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {formError ? (
              <View style={s.formError}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
                <Text style={s.formErrorText}>{formError}</Text>
              </View>
            ) : null}
            {[
              { label: 'Semester *', placeholder: 'e.g. 2024/2025 First Semester', value: semester, onChange: setSemester, type: 'default' as const },
              { label: 'GPA (0.00 – 5.00) *', placeholder: 'e.g. 4.20', value: gpa, onChange: setGpa, type: 'decimal-pad' as const },
              { label: 'Total Credit Units', placeholder: 'e.g. 18', value: credits, onChange: setCredits, type: 'numeric' as const },
            ].map(f => (
              <View key={f.label} style={s.field}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <TextInput style={s.fieldInput} value={f.value} onChangeText={f.onChange}
                  placeholder={f.placeholder} placeholderTextColor={colors.muted}
                  keyboardType={f.type} />
              </View>
            ))}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Courses (comma-separated)</Text>
              <TextInput style={[s.fieldInput, { minHeight: 72 }]} value={courses} onChangeText={setCourses}
                placeholder="e.g. CSC301, MTH201, PHY201" placeholderTextColor={colors.muted}
                multiline textAlignVertical="top" />
            </View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={s.saveBtnText}>Save Record</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  summaryValue: { fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  summaryLabel: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  summarySub: { color: colors.muted, fontSize: 10, opacity: 0.6, marginTop: 1 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.full },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: fontWeight.bold },
  content: { padding: spacing.lg, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardSemester: { color: colors.foreground, fontSize: typography.base, fontWeight: fontWeight.semibold, marginBottom: 4 },
  classBadge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  classBadgeText: { fontSize: typography.xs, fontWeight: fontWeight.semibold },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardGpa: { fontSize: typography['3xl'], fontWeight: fontWeight.black, letterSpacing: -1 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cardCredits: { color: colors.muted, fontSize: typography.xs },
  courseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  courseTag: { backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  courseTagText: { color: colors.muted, fontSize: 11 },
  gpaBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  gpaBarFill: { height: '100%', borderRadius: 2 },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.semibold },
  emptySub: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: 11, marginTop: spacing.sm },
  emptyBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: fontWeight.bold },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: fontWeight.heavy },
  modalClose: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  formError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.red + '15', borderRadius: radius.md, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red + '30' },
  formErrorText: { color: colors.red, fontSize: typography.sm, flex: 1 },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: fontWeight.bold },
});
