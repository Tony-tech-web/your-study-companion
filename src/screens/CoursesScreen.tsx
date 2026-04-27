import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT, shadow } from '../lib/theme';
import { supabase } from '../lib/supabase';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface PDF {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SkeletonRow = () => (
  <View style={s.skeletonRow}>
    <View style={s.skeletonIcon} />
    <View style={{ flex: 1, gap: 8 }}>
      <View style={s.skeletonLine} />
      <View style={[s.skeletonLine, { width: '50%' }]} />
    </View>
  </View>
);

export default function CoursesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PDF | null>(null);

  const fetchPdfs = useCallback(async () => {
    try {
      const res = await api.get('/api/pdfs');
      setPdfs(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPdfs(); }, []);

  const handlePickAndUpload = async () => {
    if (!user?.id) return;
    setUploadError('');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];

    if (!file.name.endsWith('.pdf')) { setUploadError('Only PDF files are supported'); return; }
    if (file.size && file.size > 50 * 1024 * 1024) { setUploadError('File too large (max 50MB)'); return; }

    setUploading(true);
    setUploadProgress('Reading file...');

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setUploadProgress('Uploading to storage...');

      // Convert base64 to Uint8Array for Supabase
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('student-pdfs')
        .upload(filePath, bytes, { contentType: 'application/pdf', upsert: false });

      if (uploadErr) throw uploadErr;

      setUploadProgress('Saving record...');

      const { data: newPdf } = await api.post('/api/pdfs', {
        file_name: file.name,
        file_path: filePath,
        file_size: file.size || null,
        user_id: user.id,
      });

      if (newPdf) setPdfs(prev => [newPdf, ...prev]);
      setUploadProgress('');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (pdf: PDF) => {
    try {
      await supabase.storage.from('student-pdfs').remove([pdf.file_path]);
      await api.delete(`/api/pdfs/${pdf.id}`);
      setPdfs(prev => prev.filter(p => p.id !== pdf.id));
    } catch { setUploadError('Failed to delete file'); }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ConfirmDialog
        visible={!!confirmDelete}
        title="Delete PDF"
        message={`Remove "${confirmDelete?.file_name}" permanently?`}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Course Materials</Text>
          <Text style={s.subtitle}>{pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} uploaded</Text>
        </View>
        <TouchableOpacity
          style={[s.uploadBtn, uploading && { opacity: 0.6 }]}
          onPress={handlePickAndUpload}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="cloud-upload-outline" size={16} color="#fff" /><Text style={s.uploadBtnText}>Upload PDF</Text></>}
        </TouchableOpacity>
      </View>

      {/* Upload progress */}
      {uploadProgress ? (
        <View style={s.progressBar}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={s.progressText}>{uploadProgress}</Text>
        </View>
      ) : null}

      {/* Error */}
      {uploadError ? (
        <View style={s.errorBar}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
          <Text style={s.errorText}>{uploadError}</Text>
          <TouchableOpacity onPress={() => setUploadError('')}>
            <Ionicons name="close" size={15} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Upload drop zone — tap to upload */}
      {!uploading && pdfs.length === 0 && !loading && (
        <TouchableOpacity style={s.dropZone} onPress={handlePickAndUpload} activeOpacity={0.8}>
          <View style={s.dropIconWrap}>
            <Ionicons name="document-outline" size={32} color={colors.primary} />
          </View>
          <Text style={s.dropTitle}>Upload your first PDF</Text>
          <Text style={s.dropSub}>Tap to select a PDF from your files (max 50MB)</Text>
          <View style={s.dropBtn}>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={s.dropBtnText}>Choose PDF</Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.list, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPdfs(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
        ) : pdfs.map(pdf => (
          <View key={pdf.id} style={s.pdfCard}>
            {/* Icon */}
            <View style={s.pdfIconWrap}>
              <Ionicons name="document-text" size={22} color={colors.red} />
              <Text style={s.pdfIconLabel}>PDF</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={s.pdfName} numberOfLines={2}>{pdf.file_name}</Text>
              <View style={s.pdfMeta}>
                <Text style={s.pdfMetaText}>{formatSize(pdf.file_size)}</Text>
                <View style={s.metaDot} />
                <Text style={s.pdfMetaText}>{formatDate(pdf.uploaded_at)}</Text>
              </View>
            </View>

            {/* Delete */}
            <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(pdf)}>
              <Ionicons name="trash-outline" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add more button when there are already files */}
        {!loading && pdfs.length > 0 && (
          <TouchableOpacity style={s.addMoreBtn} onPress={handlePickAndUpload} disabled={uploading} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={s.addMoreText}>Upload another PDF</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5, flex: 1 },
  subtitle: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.full, ...shadow.sm },
  uploadBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: fontWeight.bold },
  progressBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '12', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.primary + '30' },
  progressText: { color: colors.primary, fontSize: typography.sm },
  errorBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.red + '12', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.red + '25' },
  errorText: { color: colors.red, fontSize: typography.sm, flex: 1 },
  dropZone: { margin: spacing.lg, borderWidth: 1.5, borderColor: colors.primary + '40', borderStyle: 'dashed', borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary + '05' },
  dropIconWrap: { width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  dropTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.semibold },
  dropSub: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
  dropBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.full, marginTop: spacing.sm, ...shadow.sm },
  dropBtnText: { color: '#fff', fontSize: typography.base, fontWeight: fontWeight.bold },
  list: { padding: spacing.md, gap: spacing.sm },
  pdfCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pdfIconWrap: { width: 48, height: 56, borderRadius: radius.md, backgroundColor: colors.red + '12', alignItems: 'center', justifyContent: 'center', gap: 2 },
  pdfIconLabel: { color: colors.red, fontSize: 9, fontWeight: fontWeight.black, letterSpacing: 0.5 },
  pdfName: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold, lineHeight: 20 },
  pdfMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  pdfMetaText: { color: colors.muted, fontSize: typography.xs },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.muted },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.md, marginTop: spacing.sm },
  addMoreText: { color: colors.primary, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.sm },
  skeletonIcon: { width: 48, height: 56, borderRadius: radius.md, backgroundColor: colors.surface },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: colors.surface, width: '75%' },
});
