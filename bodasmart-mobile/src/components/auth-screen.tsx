import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '@/hooks/use-app';

const COLORS = {
  ink: '#15251c',
  muted: '#69766d',
  green: '#174b35',
  lime: '#c9f36b',
  canvas: '#f5f7f3',
  border: '#dce4da',
  danger: '#a3342a',
  white: '#ffffff',
};

const fields = [
  { key: 'name', label: 'Full name', placeholder: 'Your full name', autoCapitalize: 'words' as const },
  { key: 'id_number', label: 'National ID', placeholder: 'National ID number', autoCapitalize: 'none' as const },
  { key: 'bike_model', label: 'Bike model', placeholder: 'e.g. TVS HLX 125', autoCapitalize: 'words' as const },
  { key: 'number_plate', label: 'Number plate', placeholder: 'e.g. KXX 123A', autoCapitalize: 'characters' as const },
  { key: 'phone_number', label: 'Phone number', placeholder: '+254 7XX XXX XXX', autoCapitalize: 'none' as const },
] as const;

export function AuthScreen() {
  const { signIn, signUp, startupError } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registration, setRegistration] = useState({
    name: '',
    id_number: '',
    bike_model: '',
    number_plate: '',
    phone_number: '',
  });
  const [error, setError] = useState<string | null>(startupError);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (mode === 'register' && Object.values(registration).some((value) => !value.trim())) {
      setError('Complete all rider details before creating your account.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Your password must contain at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp({ ...registration, email: email.trim(), password });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.brandMark}>
            <Text style={styles.brandInitial}>B</Text>
          </View>
          <Text style={styles.brand}>BodaSmart</Text>
          <Text style={styles.tagline}>Know your route. Own your earnings.</Text>

          <View style={styles.card}>
            <Text style={styles.heading}>
              {mode === 'login' ? 'Welcome back' : 'Join BodaSmart'}
            </Text>
            <Text style={styles.subheading}>
              {mode === 'login'
                ? 'Sign in to plan trips and keep your ride history.'
                : 'Create your rider account to get started.'}
            </Text>

            {mode === 'register' &&
              fields.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    accessibilityLabel={field.label}
                    autoCapitalize={field.autoCapitalize}
                    onChangeText={(value) =>
                      setRegistration((current) => ({ ...current, [field.key]: value }))
                    }
                    placeholder={field.placeholder}
                    placeholderTextColor="#98a39b"
                    style={styles.input}
                    value={registration[field.key]}
                  />
                </View>
              ))}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#98a39b"
                style={styles.input}
                value={email}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#98a39b"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !submitting && styles.pressed,
              ]}>
              {submitting ? (
                <ActivityIndicator color={COLORS.green} />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              style={styles.switchButton}>
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "New to BodaSmart?  Create an account"
                  : 'Already registered?  Sign in'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.footer}>Built for the riders who keep Kenya moving.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  container: { width: '100%', maxWidth: 460, alignSelf: 'center', alignItems: 'center', paddingVertical: 24 },
  brandMark: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center' },
  brandInitial: { color: COLORS.green, fontSize: 34, fontWeight: '900' },
  brand: { color: COLORS.green, fontSize: 29, fontWeight: '900', marginTop: 14, letterSpacing: -0.8 },
  tagline: { color: COLORS.muted, fontSize: 14, marginTop: 5, marginBottom: 26 },
  card: { width: '100%', backgroundColor: COLORS.white, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: COLORS.border },
  heading: { color: COLORS.ink, fontSize: 24, fontWeight: '800' },
  subheading: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { color: COLORS.ink, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.ink, fontSize: 15, backgroundColor: '#fbfcfa' },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  submitButton: { minHeight: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.lime, marginTop: 4 },
  submitText: { color: COLORS.green, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  switchButton: { alignItems: 'center', paddingTop: 19, paddingBottom: 2 },
  switchText: { color: COLORS.green, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  footer: { color: COLORS.muted, fontSize: 12, marginTop: 22, textAlign: 'center' },
});
