import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, spacing, radius, typography, fontWeight } from '../lib/theme';

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  visible, title, message, onConfirm, onCancel,
  destructive = true, confirmLabel = 'Delete', cancelLabel = 'Cancel',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.box}>
          {title && <Text style={s.title}>{title}</Text>}
          <Text style={s.message}>{message}</Text>
          <View style={s.row}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, destructive && s.confirmBtnRed]}
              onPress={onConfirm} activeOpacity={0.8}
            >
              <Text style={s.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  box: {
    width: '100%', maxWidth: 340,
    backgroundColor: colors.card2, borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  message: { color: colors.muted, fontSize: typography.base, textAlign: 'center', lineHeight: 22 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: { flex: 1, height: 46, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.foreground, fontSize: typography.base, fontWeight: fontWeight.medium },
  confirmBtn: { flex: 1, height: 46, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  confirmBtnRed: { backgroundColor: colors.red },
  confirmText: { color: '#fff', fontSize: typography.base, fontWeight: fontWeight.bold },
});
