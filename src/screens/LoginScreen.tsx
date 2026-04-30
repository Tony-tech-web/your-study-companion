import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography, fontWeight, shadow } from '../lib/theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    setError(''); setSuccess('');
    if (!email.trim() || !password) { setError('Please enter your email and password'); return; }
    if (mode === 'signup' && !fullName.trim()) { setError('Please enter your full name'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) {
          if (e.message.toLowerCase().includes('invalid')) {
            setError('Invalid email or password. If you just signed up, confirm your email first.');
          } else { setError(e.message); }
        }
      } else {
        const { error: e } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (e) { setError(e.message); }
        else {
          setSuccess('Account created! Check your email to confirm before signing in.');
          setMode('login'); setPassword('');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logo}>
            <View style={s.logoRing}>
              <View style={s.logoInner}>
                <Text style={s.logoLetters}>SC</Text>
              </View>
            </View>
            <Text style={s.appName}>Study Companion</Text>
            <Text style={s.tagline}>Your AI-powered academic edge</Text>
          </View>

          {/* Mode toggle */}
          <View style={s.toggle}>
            {(['login', 'signup'] as const).map(m => (
              <TouchableOpacity key={m} style={[s.toggleBtn, mode === m && s.toggleBtnOn]} onPress={() => { setMode(m); setError(''); setSuccess(''); }}>
                <Text style={[s.toggleText, mode === m && s.toggleTextOn]}>{m === 'login' ? 'Sign In' : 'Create Account'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alerts */}
          {error ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={colors.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : success ? (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={15} color={colors.green} />
              <Text style={s.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={s.form}>
            {mode === 'signup' && (
              <View style={s.field}>
                <Text style={s.label}>Full Name</Text>
                <View style={s.inputRow}>
                  <Ionicons name="person-outline" size={16} color={colors.muted} style={s.inputIcon} />
                  <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                    placeholder="Your full name" placeholderTextColor={colors.muted}
                    autoCapitalize="words" returnKeyType="next" />
                </View>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Email Address</Text>
              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={16} color={colors.muted} style={s.inputIcon} />
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="you@university.edu" placeholderTextColor={colors.muted}
                  autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
              </View>
            </View>

            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                {mode === 'login' && <TouchableOpacity><Text style={s.forgot}>Forgot password?</Text></TouchableOpacity>}
              </View>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.muted} style={s.inputIcon} />
                <TextInput style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                  placeholder="••••••••" placeholderTextColor={colors.muted}
                  secureTextEntry={!showPass} returnKeyType="done" onSubmitEditing={handleAuth} />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={colors.background} size="small" />
                : <Text style={s.primaryBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Social — real buttons, no fake alerts */}
          <View style={s.socialWrap}>
            <Text style={s.socialHint}>Join With Your Favourite Social Media Account</Text>
            <View style={s.socialRow}>
              {[
                { icon: 'logo-google' as const, label: 'Google', provider: 'google' as const },
                { icon: 'logo-facebook' as const, label: 'Facebook', provider: 'facebook' as const },
                { icon: 'logo-apple' as const, label: 'Apple', provider: 'apple' as const },
              ].map(p => (
                <TouchableOpacity key={p.provider} style={s.socialBtn}
                  onPress={async () => {
                    const { error: e } = await supabase.auth.signInWithOAuth({
                      provider: p.provider,
                      options: { redirectTo: 'studycompanion://auth/callback' },
                    });
                    if (e) setError(e.message);
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name={p.icon} size={22} color={colors.foreground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={s.terms}>
            By signing in, you agree to our{' '}
            <Text style={s.termsLink}>Terms of Service</Text>
            {' '}and{' '}
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
  logo: { alignItems: 'center', marginBottom: spacing.xl },
  logoRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: colors.primary + '50', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoInner: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoLetters: { color: '#fff', fontSize: 26, fontWeight: fontWeight.black, letterSpacing: -1 },
  appName: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  tagline: { color: colors.muted, fontSize: typography.sm, marginTop: 4 },
  toggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginBottom: spacing.md },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: radius.lg, alignItems: 'center' },
  toggleBtnOn: { backgroundColor: colors.foreground },
  toggleText: { color: colors.muted, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  toggleTextOn: { color: colors.background },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.red + '15', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red + '30' },
  errorText: { color: colors.red, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  successBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.green + '15', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.green + '30' },
  successText: { color: colors.green, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  form: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: typography.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgot: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.semibold },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: spacing.md, height: 50 },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.foreground, fontSize: typography.base },
  eyeBtn: { padding: spacing.xs },
  primaryBtn: { backgroundColor: colors.foreground, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs, ...shadow.sm },
  primaryBtnText: { color: colors.background, fontSize: typography.base, fontWeight: fontWeight.black, letterSpacing: -0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: typography.sm },
  socialWrap: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', gap: spacing.md },
  socialHint: { color: colors.muted, fontSize: typography.xs, textAlign: 'center', lineHeight: 18 },
  socialRow: { flexDirection: 'row', gap: spacing.lg },
  socialBtn: { width: 58, height: 58, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  terms: { color: colors.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  termsLink: { color: colors.foreground, fontWeight: fontWeight.semibold, textDecorationLine: 'underline' },
});
