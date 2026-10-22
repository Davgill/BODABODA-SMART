import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/hooks/use-app';
import { api, TripRecord } from '@/services/api';

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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export default function HistoryScreen() {
  const { token } = useApp();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const response = await api.getTrips(token);
      setTrips(response.trips);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load trip history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const totalFares = trips.reduce((total, trip) => total + trip.fare, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[C.green]}
            onRefresh={() => {
              setRefreshing(true);
              void loadTrips();
            }}
            refreshing={refreshing}
            tintColor={C.green}
          />
        }>
        <Text style={styles.eyebrow}>YOUR RIDER ACCOUNT</Text>
        <Text style={styles.title}>Trip history</Text>
        <Text style={styles.subtitle}>A clear record of the rides you have logged.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryMark}><Text style={styles.summaryMarkText}>↗</Text></View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>TOTAL RECORDED FARES</Text>
            <Text style={styles.summaryValue}>KSh {Math.round(totalFares).toLocaleString('en-KE')}</Text>
          </View>
          <View style={styles.tripCount}>
            <Text style={styles.tripCountValue}>{trips.length}</Text>
            <Text style={styles.tripCountLabel}>rides</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>All trips</Text>
          <Text style={styles.listCount}>{trips.length}</Text>
        </View>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator color={C.green} />
            <Text style={styles.messageText}>Loading your trip history…</Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadTrips()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : trips.length ? (
          trips.map((trip, index) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripIcon}>
                <Text style={styles.tripIconText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={styles.tripCopy}>
                <Text style={styles.tripTitle}>Ride #{trip.id}</Text>
                <Text style={styles.tripDate}>{formatDate(trip.timestamp)}</Text>
                <Text style={styles.tripDistance}>{trip.distance_km.toFixed(1)} km travelled</Text>
              </View>
              <View style={styles.tripFareWrap}>
                <Text style={styles.tripFare}>KSh {Math.round(trip.fare).toLocaleString('en-KE')}</Text>
                <Text style={styles.tripFareLabel}>FARE</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>↗</Text></View>
            <Text style={styles.emptyTitle}>Your road starts here</Text>
            <Text style={styles.emptyText}>Calculate a route and record your first trip to see it here.</Text>
          </View>
        )}

        <Text style={styles.footerNote}>Pull down to refresh your trip records.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30 },
  eyebrow: { color: C.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: C.dark, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  summaryCard: { backgroundColor: C.green, borderRadius: 22, padding: 17, marginTop: 22, flexDirection: 'row', alignItems: 'center' },
  summaryMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  summaryMarkText: { color: C.green, fontSize: 24, fontWeight: '800' },
  summaryCopy: { flex: 1, marginLeft: 12 },
  summaryLabel: { color: '#d2e2d5', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  summaryValue: { color: C.white, fontSize: 21, fontWeight: '900', marginTop: 4 },
  tripCount: { alignItems: 'center', minWidth: 49, paddingLeft: 11, borderLeftWidth: 1, borderLeftColor: '#ffffff40' },
  tripCountValue: { color: C.lime, fontSize: 19, fontWeight: '900' },
  tripCountLabel: { color: '#d2e2d5', fontSize: 10, marginTop: 2 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 11 },
  listTitle: { color: C.dark, fontSize: 17, fontWeight: '800' },
  listCount: { overflow: 'hidden', color: C.green, backgroundColor: C.pale, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, marginLeft: 8, fontSize: 11, fontWeight: '800' },
  messageCard: { minHeight: 132, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18, gap: 11 },
  messageText: { color: C.muted, fontSize: 13 },
  errorText: { color: C.red, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: C.pale, borderRadius: 12 },
  retryText: { color: C.green, fontSize: 13, fontWeight: '800' },
  tripCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 14, marginBottom: 9 },
  tripIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  tripIconText: { color: C.green, fontSize: 12, fontWeight: '900' },
  tripCopy: { flex: 1, marginLeft: 12 },
  tripTitle: { color: C.dark, fontSize: 14, fontWeight: '800' },
  tripDate: { color: C.muted, fontSize: 11, marginTop: 4 },
  tripDistance: { color: C.muted, fontSize: 11, marginTop: 4 },
  tripFareWrap: { alignItems: 'flex-end', marginLeft: 8 },
  tripFare: { color: C.green, fontSize: 14, fontWeight: '900' },
  tripFareLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  emptyCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 20, alignItems: 'center', padding: 26 },
  emptyIcon: { width: 50, height: 50, backgroundColor: C.pale, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: C.green, fontSize: 26, fontWeight: '800' },
  emptyTitle: { color: C.dark, fontSize: 16, fontWeight: '800', marginTop: 13 },
  emptyText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  footerNote: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 17 },
});
