import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, SafeAreaView, StatusBar,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography, fontWeight, shadow } from '../lib/theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('Missing fields', 'Please enter your email and password'); return; }
    setLoading(true); setSuccess('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (error.message?.includes('Invalid login') || error.message?.includes('not confirmed')) {
            throw new Error('Invalid credentials. If you just signed up, check your email first.');
          }
          throw error;
        }
      } else {
        if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        setSuccess('Account created! Check your inbox and confirm your email before signing in.');
        setMode('login');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={s.logoSection}>
              <View style={s.logoRing}>
                <View style={s.logoCore}><Text style={s.logoText}>SC</Text></View>
              </View>
              <Text style={s.appName}>Study Companion</Text>
              <Text style={s.appSub}>Your AI-powered academic edge</Text>
            </View>

            {/* Success banner */}
            {success ? (
              <View style={s.successBanner}>
                <Text style={s.successText}>✅ {success}</Text>
              </View>
            ) : null}

            {/* Segment control */}
            <View style={s.segment}>
              <TouchableOpacity style={[s.segBtn, mode === 'login' && s.segBtnActive]} onPress={() => setMode('login')}>
                <Text style={[s.segBtnText, mode === 'login' && s.segBtnTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.segBtn, mode === 'signup' && s.segBtnActive]} onPress={() => setMode('signup')}>
                <Text style={[s.segBtnText, mode === 'signup' && s.segBtnTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={s.form}>
              {mode === 'signup' && (
                <View style={[s.inputGroup, s.inputGroupTop]}>
                  <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                    placeholder="Full Name" placeholderTextColor={colors.muted}
                    autoCapitalize="words" />
                </View>
              )}
              <View style={[s.inputGroup, mode === 'signup' ? s.inputGroupMid : s.inputGroupTop]}>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="Email Address" placeholderTextColor={colors.muted}
                  autoCapitalize="none" keyboardType="email-address" />
              </View>
              <View style={[s.inputGroup, s.inputGroupBottom]}>
                <TextInput style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                  placeholder="Password" placeholderTextColor={colors.muted}
                  secureTextEntry={!showPass} onSubmitEditing={handleAuth} />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                  <Text style={s.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'login' && (
              <TouchableOpacity style={s.forgotRow}>
                <Text style={s.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Primary CTA */}
            <TouchableOpacity style={[s.cta, loading && s.ctaDisabled]} onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.background} /> : <Text style={s.ctaText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or continue with</Text>
              <View style={s.divLine} />
            </View>

            {/* Social icons — pill row like reference */}
            <View style={s.socialRow}>
              {[
                { label: 'Google', emoji: 'G', color: '#4285F4' },
                { label: 'Facebook', emoji: 'f', color: '#1877F2' },
                { label: 'X', emoji: '𝕏', color: '#fff' },
                { label: 'Apple', emoji: '', color: '#fff' },
              ].map(p => (
                <TouchableOpacity key={p.label} style={s.socialBtn}
                  onPress={() => Alert.alert('Coming Soon', `${p.label} sign-in coming soon`)}>
                  <Text style={[s.socialBtnText, { color: p.color }]}>{p.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.terms}>
              By signing in you agree to our{' '}
              <Text style={s.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 60 },
  logoSection: { alignItems: 'center', paddingVertical: spacing.xl },
  logoRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: colors.primary + '50', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoCore: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.colored },
  logoText: { color: '#fff', fontSize: typography.title2, fontWeight: fontWeight.black, letterSpacing: -1 },
  appName: { color: colors.foreground, fontSize: typography.title2, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  appSub: { color: colors.muted, fontSize: typography.subheadline, marginTop: 4 },
  successBanner: { backgroundColor: colors.green + '15', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.green + '30', marginBottom: spacing.md },
  successText: { color: colors.green, fontSize: typography.footnote, lineHeight: 20 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 3, marginBottom: spacing.lg },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.md, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.cardSolid, ...shadow.sm },
  segBtnText: { color: colors.muted, fontSize: typography.subheadline, fontWeight: fontWeight.medium },
  segBtnTextActive: { color: colors.foreground, fontWeight: fontWeight.semibold },
  form: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSolid, marginBottom: spacing.sm },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardSolid, borderBottomWidth: 1, borderBottomColor: colors.separator, paddingHorizontal: spacing.md, height: 52 },
  inputGroupTop: { borderBottomWidth: 1 },
  inputGroupMid: { borderBottomWidth: 1 },
  inputGroupBottom: { borderBottomWidth: 0 },
  input: { flex: 1, color: colors.foreground, fontSize: typography.body },
  eyeBtn: { padding: spacing.xs },
  eyeText: { fontSize: 16 },
  forgotRow: { alignItems: 'flex-end', marginBottom: spacing.lg, marginTop: spacing.xs },
  forgotText: { color: colors.primary, fontSize: typography.footnote, fontWeight: fontWeight.medium },
  cta: { backgroundColor: colors.foreground, borderRadius: radius.xl, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadow.sm },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.background, fontSize: typography.body, fontWeight: fontWeight.bold, letterSpacing: -0.2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSolid },
  divText: { color: colors.muted, fontSize: typography.footnote },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl },
  socialBtn: { width: 60, height: 60, borderRadius: radius.xl, backgroundColor: colors.cardSolid, borderWidth: 1, borderColor: colors.borderSolid, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  socialBtnText: { fontSize: 20, fontWeight: fontWeight.bold },
  terms: { color: colors.muted, fontSize: typography.caption1, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: colors.foreground, fontWeight: fontWeight.medium },
});
