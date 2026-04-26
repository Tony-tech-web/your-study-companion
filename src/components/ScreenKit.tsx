import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  StatusBar, ScrollView, type ViewStyle, type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT } from '../lib/theme';

// ── Screen wrapper — handles safe area + status bar ─────────────────────────
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }, style]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {children}
    </View>
  );
}

// ── iOS-style page header ────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, right, large = false,
}: {
  title: string; subtitle?: string;
  right?: React.ReactNode; large?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {large
          ? <Text style={styles.largeTitle}>{title}</Text>
          : <Text style={styles.navTitle}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.headerRight}>{right}</View>}
    </View>
  );
}

// ── Scrollable page content with correct bottom inset ───────────────────────
export function PageScroll({
  children, style, ...props
}: { children: React.ReactNode; style?: ViewStyle; [key: string]: any }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.pageScroll, style]}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
}

// ── iOS-style card ───────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Primary action button ────────────────────────────────────────────────────
export function PrimaryButton({
  label, onPress, disabled, loading, icon,
}: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: string;
}) {
  const { ActivityIndicator } = require('react-native');
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={colors.background} />
        : <>
          {icon && <Text style={styles.primaryBtnIcon}>{icon}</Text>}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </>}
    </TouchableOpacity>
  );
}

// ── Pill / ghost button ──────────────────────────────────────────────────────
export function PillButton({
  label, onPress, active, icon,
}: { label: string; onPress: () => void; active?: boolean; icon?: string }) {
  return (
    <TouchableOpacity
      style={[styles.pillBtn, active && styles.pillBtnActive]}
      onPress={onPress} activeOpacity={0.7}
    >
      {icon && <Text style={{ fontSize: 13, marginRight: 4 }}>{icon}</Text>}
      <Text style={[styles.pillBtnText, active && styles.pillBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
export function StatTile({
  icon, iconBg, value, label,
}: { icon: string; iconBg: string; value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action, onAction }: {
  icon: string; title: string; subtitle?: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && onAction && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAction}>
          <Text style={styles.emptyBtnText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Separator ────────────────────────────────────────────────────────────────
export function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  largeTitle: {
    color: colors.foreground,
    fontSize: typography['3xl'],
    fontWeight: fontWeight.heavy,
    letterSpacing: -0.5,
  },
  navTitle: {
    color: colors.foreground,
    fontSize: typography.lg,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.xs,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  pageScroll: {
    padding: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnIcon: { fontSize: 18 },
  primaryBtnText: {
    color: '#fff',
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.card2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillBtnText: {
    color: colors.muted,
    fontSize: typography.sm,
    fontWeight: fontWeight.semibold,
  },
  pillBtnTextActive: { color: '#fff' },
  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    color: colors.foreground,
    fontSize: typography['2xl'],
    fontWeight: fontWeight.heavy,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: colors.muted,
    fontSize: typography.xs,
    fontWeight: fontWeight.medium,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 56, marginBottom: 4 },
  emptyTitle: {
    color: colors.foreground,
    fontSize: typography.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.muted,
    fontSize: typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    borderRadius: radius.full,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: spacing.lg,
  },
});
