import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography, shadow } from '../lib/theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('Missing fields', 'Please enter your email and password'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!fullName.trim()) { Alert.alert('Missing field', 'Please enter your full name'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        Alert.alert('Check your email', 'We sent you a confirmation link.', [{ text: 'OK', onPress: () => setMode('login') }]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoWrap}>
            <View style={s.logoRing}>
              <View style={s.logoInner}><Text style={s.logoText}>SC</Text></View>
            </View>
            <Text style={s.appName}>Study Companion</Text>
            <Text style={s.appTagline}>Your AI-powered academic edge</Text>
          </View>

          <View style={s.modeToggle}>
            <TouchableOpacity style={[s.modeBtn, mode === 'login' && s.modeBtnActive]} onPress={() => setMode('login')}>
              <Text style={[s.modeBtnText, mode === 'login' && s.modeBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeBtn, mode === 'signup' && s.modeBtnActive]} onPress={() => setMode('signup')}>
              <Text style={[s.modeBtnText, mode === 'signup' && s.modeBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {mode === 'signup' && (
              <View style={s.field}>
                <View style={s.inputWrap}>
                  <Text style={s.inputIcon}>👤</Text>
                  <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                    placeholder="Full Name" placeholderTextColor={colors.muted}
                    autoCapitalize="words" />
                </View>
              </View>
            )}
            <View style={s.field}>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>✉️</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="Email Address" placeholderTextColor={colors.muted}
                  autoCapitalize="none" keyboardType="email-address" />
              </View>
            </View>
            <View style={s.field}>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                  placeholder="Password" placeholderTextColor={colors.muted}
                  secureTextEntry={!showPass} onSubmitEditing={handleAuth} />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 14 }}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {mode === 'login' && (
                <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                  <Text style={s.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleAuth} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.background} /> : <Text style={s.primaryBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.socialCard}>
            <Text style={s.socialTitle}>Join With Your Favourite Social Media Account</Text>
            <View style={s.socialRow}>
              {['🔵', '📘', '✖️', '🍎'].map((icon, i) => (
                <TouchableOpacity key={i} style={s.socialBtn} onPress={() => Alert.alert('Coming Soon', 'Social login coming soon')}>
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={s.terms}>
            By signing in, you agree to our{' '}
            <Text style={s.termsLink}>Terms of Service</Text> and{' '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.primary + '40', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: typography['2xl'], fontWeight: '900' },
  appName: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  appTagline: { color: colors.muted, fontSize: typography.sm, marginTop: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.foreground },
  modeBtnText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600' },
  modeBtnTextActive: { color: colors.background },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, marginBottom: spacing.md },
  field: { gap: 6 },
  forgotText: { color: colors.primary, fontSize: typography.xs, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 50 },
  inputIcon: { fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, color: colors.foreground, fontSize: typography.base },
  primaryBtn: { backgroundColor: colors.foreground, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  primaryBtnText: { color: colors.background, fontSize: typography.base, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: typography.sm },
  socialCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.md },
  socialTitle: { color: colors.muted, fontSize: typography.xs, textAlign: 'center' },
  socialRow: { flexDirection: 'row', gap: spacing.md },
  socialBtn: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  terms: { color: colors.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  termsLink: { color: colors.foreground, fontWeight: '600', textDecorationLine: 'underline' },
});
