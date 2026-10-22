import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/hooks/use-app';
import { api, Dashboard } from '@/services/api';

const C = {
  green: '#174b35',
  dark: '#15251c',
  muted: '#69766d',
  lime: '#c9f36b',
  canvas: '#f5f7f3',
  white: '#ffffff',
  border: '#e1e8df',
  pale: '#eaf3e9',
  red: '#a3342a',
};

export default function SettingsScreen() {
  const { user, efficiency, setEfficiency, signOut } = useApp();
  const [efficiencyInput, setEfficiencyInput] = useState(String(efficiency));
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEfficiencyInput(String(efficiency));
  }, [efficiency]);

  useEffect(() => {
    api.getDashboard()
      .then(setDashboard)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load fuel settings.');
      });
  }, []);

  async function saveEfficiency() {
    const value = Number(efficiencyInput);
    if (!Number.isFinite(value) || value < 1 || value > 200) {
      setError('Enter a realistic bike efficiency between 1 and 200 km/L.');
      setMessage(null);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await setEfficiency(value);
      setMessage('Bike efficiency saved on this device.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save bike efficiency.');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Could not complete sign out.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Your rider details and trip estimate preferences.</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() || 'B'}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {user?.number_plate ? <Text style={styles.profilePlate}>{user.number_plate}</Text> : null}
          </View>
          <View style={styles.verified}><Text style={styles.verifiedText}>RIDER</Text></View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>⚙</Text></View>
            <View style={styles.sectionHeadCopy}>
              <Text style={styles.cardTitle}>Bike efficiency</Text>
              <Text style={styles.cardSubtitle}>Used to estimate fuel cost per route.</Text>
            </View>
          </View>
          <Text style={styles.label}>AVERAGE DISTANCE PER LITRE</Text>
          <View style={styles.efficiencyRow}>
            <TextInput
              accessibilityLabel="Bike efficiency in kilometres per litre"
              keyboardType="decimal-pad"
              onChangeText={setEfficiencyInput}
              style={styles.efficiencyInput}
              value={efficiencyInput}
            />
            <Text style={styles.unit}>km/L</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void saveEfficiency()}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            {saving ? <ActivityIndicator color={C.green} /> : <Text style={styles.saveButtonText}>Save preference</Text>}
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, styles.fuelIcon]}><Text style={styles.fuelIconText}>⛽</Text></View>
            <View style={styles.sectionHeadCopy}>
              <Text style={styles.cardTitle}>Fuel price</Text>
              <Text style={styles.cardSubtitle}>Current BodaSmart fuel index.</Text>
            </View>
          </View>
          <View style={styles.fuelRow}>
            <Text style={styles.fuelAmount}>
              {dashboard ? `KSh ${Math.round(dashboard.fuel_price_ksh).toLocaleString('en-KE')}` : '—'}
            </Text>
            <Text style={styles.unit}>per litre</Text>
          </View>
          <Text style={styles.readOnlyNote}>This shared price is managed by your BodaSmart administrator.</Text>
        </View>

        {message ? <Text style={styles.successMessage}>{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={() => void logout()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          {signingOut ? <ActivityIndicator color={C.red} /> : <Text style={styles.signOutText}>Sign out</Text>}
        </Pressable>
        <Text style={styles.version}>BodaSmart Rider · Mobile</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  eyebrow: { color: C.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: C.dark, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green, borderRadius: 21, padding: 17, marginTop: 22 },
  avatar: { width: 48, height: 48, borderRadius: 17, backgroundColor: C.lime, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: C.green, fontSize: 21, fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileName: { color: C.white, fontSize: 16, fontWeight: '800' },
  profileEmail: { color: '#d2e2d5', fontSize: 12, marginTop: 3 },
  profilePlate: { color: C.lime, fontSize: 11, fontWeight: '800', marginTop: 5 },
  verified: { backgroundColor: '#ffffff1c', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  verifiedText: { color: C.lime, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  sectionCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 17, marginTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 17 },
  sectionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.pale, justifyContent: 'center', alignItems: 'center' },
  sectionIconText: { color: C.green, fontSize: 20, fontWeight: '800' },
  sectionHeadCopy: { flex: 1, marginLeft: 11 },
  cardTitle: { color: C.dark, fontSize: 15, fontWeight: '800' },
  cardSubtitle: { color: C.muted, fontSize: 11, marginTop: 4 },
  label: { color: C.muted, fontSize: 9, letterSpacing: 0.8, fontWeight: '800', marginBottom: 7 },
  efficiencyRow: { height: 51, flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: '#fbfcfa', paddingHorizontal: 13 },
  efficiencyInput: { flex: 1, color: C.dark, fontSize: 18, fontWeight: '800', paddingVertical: 8 },
  unit: { color: C.muted, fontSize: 12, fontWeight: '700' },
  saveButton: { minHeight: 47, backgroundColor: C.lime, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveButtonText: { color: C.green, fontSize: 13, fontWeight: '900' },
  fuelIcon: { backgroundColor: '#fff1df' },
  fuelIconText: { fontSize: 19 },
  fuelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#edf0eb', paddingBottom: 11 },
  fuelAmount: { color: C.dark, fontSize: 23, fontWeight: '900' },
  readOnlyNote: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  successMessage: { color: C.green, backgroundColor: C.pale, padding: 11, borderRadius: 12, fontSize: 12, marginTop: 12 },
  errorMessage: { color: C.red, backgroundColor: '#fbeeed', padding: 11, borderRadius: 12, fontSize: 12, lineHeight: 18, marginTop: 12 },
  signOutButton: { height: 49, borderWidth: 1, borderColor: '#e8cac7', backgroundColor: '#fffafa', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signOutText: { color: C.red, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  version: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
