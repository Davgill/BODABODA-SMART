import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/hooks/use-app';
import { api, CalculatedRoute, Dashboard, Place, TripRecord } from '@/services/api';

const C = {
  green: '#174b35',
  dark: '#15251c',
  muted: '#69766d',
  lime: '#c9f36b',
  canvas: '#f5f7f3',
  white: '#ffffff',
  border: '#e1e8df',
  softGreen: '#eaf3e9',
  red: '#a3342a',
};

type Field = 'pickup' | 'dropoff';

function money(value: number) {
  return `KSh ${Math.round(value).toLocaleString('en-KE')}`;
}

function PlaceInput({
  label,
  placeholder,
  value,
  onChangeText,
  onSearch,
  onUseLocation,
  isSearching,
  results,
  onSelect,
  error,
  showLocation,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  onUseLocation?: () => void;
  isSearching: boolean;
  results: Place[];
  onSelect: (place: Place) => void;
  error?: string | null;
  showLocation?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="words"
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          placeholder={placeholder}
          placeholderTextColor="#98a39b"
          returnKeyType="search"
          style={styles.placeInput}
          value={value}
        />
        <Pressable
          accessibilityLabel={`Search ${label.toLowerCase()}`}
          accessibilityRole="button"
          disabled={isSearching}
          onPress={onSearch}
          style={styles.searchButton}>
          {isSearching ? (
            <ActivityIndicator color={C.green} size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </Pressable>
      </View>
      {showLocation && onUseLocation ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSearching}
          onPress={onUseLocation}
          style={styles.locationButton}>
          <Text style={styles.locationButtonText}>◎  Use my current location</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {results.length > 0 ? (
        <View style={styles.resultList}>
          {results.map((place, index) => (
            <Pressable
              accessibilityRole="button"
              key={`${place.latitude}-${place.longitude}-${index}`}
              onPress={() => onSelect(place)}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
              <Text numberOfLines={1} style={styles.resultName}>{place.name}</Text>
              <Text numberOfLines={2} style={styles.resultAddress}>{place.address}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function RideScreen() {
  const { token, user, efficiency } = useApp();
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const [recentTrips, setRecentTrips] = useState<TripRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [route, setRoute] = useState<CalculatedRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    const outcomes = await Promise.allSettled([
      api.getDashboard(),
      api.getTrips(token),
    ]);
    if (outcomes[0].status === 'fulfilled') setDashboard(outcomes[0].value);
    if (outcomes[1].status === 'fulfilled') {
      setTripCount(outcomes[1].value.trips.length);
      setRecentTrips(outcomes[1].value.trips.slice(0, 3));
    }
    const failed = outcomes.find((outcome) => outcome.status === 'rejected');
    if (failed?.status === 'rejected') {
      setDataError(failed.reason instanceof Error ? failed.reason.message : 'Could not refresh your dashboard.');
    } else {
      setDataError(null);
    }
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function updateField(field: Field, value: string) {
    setResults([]);
    setFieldError(null);
    setRoute(null);
    if (field === 'pickup') {
      setPickupQuery(value);
      setPickup(null);
    } else {
      setDropoffQuery(value);
      setDropoff(null);
    }
  }

  async function searchPlaces(field: Field) {
    const query = field === 'pickup' ? pickupQuery.trim() : dropoffQuery.trim();
    if (query.length < 3) {
      setFieldError('Enter at least 3 characters to search.');
      return;
    }
    Keyboard.dismiss();
    setActiveField(field);
    setSearching(true);
    setFieldError(null);
    try {
      const near = pickup
        ? { latitude: pickup.latitude, longitude: pickup.longitude }
        : undefined;
      const response = await api.searchPlaces(query, near);
      setResults(response.results);
      if (!response.results.length) {
        setFieldError('No places found. Try a nearby landmark or town.');
      }
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Place search failed.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectPlace(field: Field, place: Place) {
    if (field === 'pickup') {
      setPickup(place);
      setPickupQuery(place.name);
    } else {
      setDropoff(place);
      setDropoffQuery(place.name);
    }
    setResults([]);
    setFieldError(null);
    setActiveField(null);
    setRoute(null);
  }

  async function getCurrentLocation() {
    setActiveField('pickup');
    setSearching(true);
    setFieldError(null);
    setResults([]);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Allow location access, or search for your pickup point instead.');
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const response = await api.reverseGeocode(latitude, longitude);
      const address = response.address || 'Current GPS position';
      selectPlace('pickup', {
        name: address.split(',')[0],
        address,
        latitude,
        longitude,
      });
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Could not get your location.');
    } finally {
      setSearching(false);
    }
  }

  async function calculate() {
    setRouteError(null);
    setNotice(null);
    if (!pickup || !dropoff) {
      setRouteError('Choose a pickup and destination from the search results first.');
      return;
    }
    setCalculating(true);
    try {
      const result = await api.calculateTrip(pickup, dropoff);
      setRoute(result);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : 'Could not calculate this route.');
    } finally {
      setCalculating(false);
    }
  }

  async function saveTrip() {
    if (!token || !route || !pickup || !dropoff) return;
    setLogging(true);
    setNotice(null);
    setDataError(null);
    try {
      const saved = await api.logTrip(token, route, pickup, dropoff);
      setNotice(`Trip recorded. Fare: ${money(saved.fare_ksh)}.`);
      setRoute(null);
      await loadDashboard();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not save this trip.');
    } finally {
      setLogging(false);
    }
  }

  const fuelCost = route
    ? (route.distance_km / efficiency) * (dashboard?.fuel_price_ksh ?? route.current_fuel_index_used)
    : 0;
  const expectedProfit = route ? route.estimated_fare_ksh - fuelCost : 0;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[C.green]}
            onRefresh={() => void loadDashboard()}
            refreshing={refreshing}
            tintColor={C.green}
          />
        }>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Boda<Text style={styles.brandAccent}>Smart</Text></Text>
            <Text style={styles.greeting}>Habari, {user?.name.split(' ')[0] || 'rider'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() || 'B'}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>YOUR NEXT RIDE</Text>
              <Text style={styles.heroTitle}>Ride smarter.{'\n'}Earn with confidence.</Text>
            </View>
            <Text style={styles.heroIcon}>↗</Text>
          </View>
          <Text style={styles.heroCaption}>
            Check the road distance and a fair-fare estimate before you ride.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>FUEL INDEX</Text>
            <Text style={styles.statValue}>
              {dashboard ? money(dashboard.fuel_price_ksh) : '—'}
            </Text>
            <Text style={styles.statHint}>per litre</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TRIPS RECORDED</Text>
            <Text style={styles.statValue}>{tripCount}</Text>
            <Text style={styles.statHint}>up to 100 recent rides</Text>
          </View>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {dataError ? <Text accessibilityRole="alert" style={styles.errorNotice}>{dataError}</Text> : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Plan a trip</Text>
            <Text style={styles.sectionSubtitle}>Search and select real places in Kenya.</Text>
          </View>
          <View style={styles.securePill}><Text style={styles.secureText}>LIVE ROUTE</Text></View>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.routeLine}>
            <View style={styles.routeDots}>
              <View style={styles.originDot} />
              <View style={styles.dottedLine} />
              <View style={styles.destinationDot} />
            </View>
            <View style={styles.inputs}>
              <PlaceInput
                error={activeField === 'pickup' ? fieldError : null}
                isSearching={searching && activeField === 'pickup'}
                label="PICKUP POINT"
                onChangeText={(value) => updateField('pickup', value)}
                onSearch={() => void searchPlaces('pickup')}
                onSelect={(place) => selectPlace('pickup', place)}
                onUseLocation={() => void getCurrentLocation()}
                placeholder="Search pickup or use GPS"
                results={activeField === 'pickup' ? results : []}
                showLocation
                value={pickupQuery}
              />
              <View style={styles.divider} />
              <PlaceInput
                error={activeField === 'dropoff' ? fieldError : null}
                isSearching={searching && activeField === 'dropoff'}
                label="DESTINATION"
                onChangeText={(value) => updateField('dropoff', value)}
                onSearch={() => void searchPlaces('dropoff')}
                onSelect={(place) => selectPlace('dropoff', place)}
                placeholder="Where are you going?"
                results={activeField === 'dropoff' ? results : []}
                value={dropoffQuery}
              />
            </View>
          </View>
          {routeError ? <Text accessibilityRole="alert" style={styles.inlineError}>{routeError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={calculating}
            onPress={() => void calculate()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            {calculating ? (
              <ActivityIndicator color={C.green} />
            ) : (
              <Text style={styles.primaryButtonText}>Calculate my fare  →</Text>
            )}
          </Pressable>
        </View>

        {route ? (
          <View style={styles.routeCard}>
            <View style={styles.routeCardHeader}>
              <View>
                <Text style={styles.routeKicker}>ROUTE ESTIMATE</Text>
                <Text numberOfLines={1} style={styles.routeName}>
                  {pickup?.name}  →  {dropoff?.name}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setRoute(null)}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.routeStats}>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.distance_km.toFixed(1)} km</Text>
                <Text style={styles.routeStatLabel}>ROAD DISTANCE</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.duration_minutes} min</Text>
                <Text style={styles.routeStatLabel}>EST. TIME</Text>
              </View>
            </View>
            <View style={styles.farePanel}>
              <View>
                <Text style={styles.fareLabel}>Suggested fare</Text>
                <Text style={styles.fareValue}>{money(route.estimated_fare_ksh)}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.profitSide}>
                <Text style={styles.fareLabel}>After estimated fuel</Text>
                <Text style={styles.profitValue}>{money(expectedProfit)}</Text>
              </View>
            </View>
            <Text style={styles.disclaimer}>
              Estimate based on the road route and {efficiency} km/L bike efficiency. Actual traffic and fares may vary.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={logging}
              onPress={() => void saveTrip()}
              style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}>
              {logging ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.logButtonText}>Record this trip</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent rides</Text>
            <Text style={styles.sectionSubtitle}>Your latest completed trips.</Text>
          </View>
        </View>
        {recentTrips.length ? (
          recentTrips.map((trip) => (
            <View key={trip.id} style={styles.recentCard}>
              <View style={styles.recentIcon}><Text style={styles.recentIconText}>↗</Text></View>
              <View style={styles.recentDetails}>
                <Text style={styles.recentTitle}>Trip #{trip.id}</Text>
                <Text style={styles.recentMeta}>
                  {trip.distance_km.toFixed(1)} km  ·  {new Date(trip.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.recentFare}>{money(trip.fare)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>Your recorded trips will show up here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxWidth: 700, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { color: C.green, fontSize: 22, fontWeight: '900', letterSpacing: -0.7 },
  brandAccent: { color: '#72a935' },
  greeting: { color: C.muted, fontSize: 13, marginTop: 3 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.lime, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: C.green, fontSize: 18, fontWeight: '900' },
  heroCard: { backgroundColor: C.green, borderRadius: 24, padding: 21, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { color: '#c9f36b', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: C.white, fontSize: 26, lineHeight: 31, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 },
  heroIcon: { color: C.lime, fontSize: 43, fontWeight: '300', marginRight: 3 },
  heroCaption: { color: '#d6e5da', fontSize: 13, lineHeight: 20, marginTop: 13, maxWidth: 330 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: C.white, borderRadius: 17, borderWidth: 1, borderColor: C.border, padding: 15 },
  statLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  statValue: { color: C.dark, fontSize: 20, fontWeight: '900', marginTop: 8 },
  statHint: { color: C.muted, fontSize: 11, marginTop: 2 },
  notice: { color: C.green, backgroundColor: C.softGreen, borderRadius: 12, padding: 11, marginTop: 12, fontSize: 13, lineHeight: 18 },
  errorNotice: { color: C.red, backgroundColor: '#fbeeed', borderRadius: 12, padding: 11, marginTop: 12, fontSize: 13, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: C.dark, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  securePill: { backgroundColor: '#e6f1df', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  secureText: { color: C.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  tripCard: { backgroundColor: C.white, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: C.border },
  routeLine: { flexDirection: 'row' },
  routeDots: { width: 20, alignItems: 'center', paddingTop: 9, marginRight: 8 },
  originDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.green, borderWidth: 3, borderColor: '#d8eed1' },
  dottedLine: { flex: 1, minHeight: 31, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#bcc9bd', marginVertical: 4 },
  destinationDot: { width: 10, height: 10, backgroundColor: '#e58a53', borderRadius: 3, marginBottom: 6 },
  inputs: { flex: 1 },
  fieldWrap: { paddingBottom: 11 },
  fieldLabel: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: '#fbfcfa', paddingRight: 5 },
  placeInput: { minHeight: 46, flex: 1, paddingHorizontal: 12, color: C.dark, fontSize: 14 },
  searchButton: { minWidth: 62, height: 36, borderRadius: 10, backgroundColor: '#eaf3e9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
  searchButtonText: { color: C.green, fontSize: 12, fontWeight: '800' },
  locationButton: { alignSelf: 'flex-start', paddingTop: 8, paddingBottom: 3 },
  locationButtonText: { color: C.green, fontSize: 12, fontWeight: '700' },
  inlineError: { color: C.red, fontSize: 12, lineHeight: 17, marginTop: 7 },
  resultList: { marginTop: 8, backgroundColor: C.white, borderRadius: 13, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  result: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf0eb' },
  resultName: { color: C.dark, fontSize: 13, fontWeight: '700' },
  resultAddress: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#edf0eb', marginBottom: 11 },
  primaryButton: { minHeight: 53, backgroundColor: C.lime, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryButtonText: { color: C.green, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  routeCard: { backgroundColor: C.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.border, marginTop: 14 },
  routeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeKicker: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  routeName: { color: C.dark, fontSize: 15, fontWeight: '800', marginTop: 5, maxWidth: 290 },
  closeText: { color: C.muted, fontSize: 26, paddingHorizontal: 5 },
  routeStats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#edf0eb', marginTop: 15, paddingVertical: 13 },
  routeStat: { flex: 1 },
  routeStatValue: { color: C.dark, fontSize: 17, fontWeight: '800' },
  routeStatLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginTop: 4 },
  farePanel: { flexDirection: 'row', backgroundColor: '#f5f8f2', borderRadius: 15, padding: 13, marginTop: 13 },
  fareLabel: { color: C.muted, fontSize: 10, fontWeight: '700' },
  fareValue: { color: C.green, fontSize: 20, fontWeight: '900', marginTop: 5 },
  fareDivider: { width: 1, backgroundColor: '#dbe5d8', marginHorizontal: 12 },
  profitSide: { flex: 1 },
  profitValue: { color: '#4c8c32', fontSize: 18, fontWeight: '900', marginTop: 5 },
  disclaimer: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 11 },
  logButton: { minHeight: 49, backgroundColor: C.green, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  logButtonText: { color: C.white, fontSize: 14, fontWeight: '800' },
  recentCard: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  recentIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' },
  recentIconText: { color: C.green, fontSize: 19, fontWeight: '700' },
  recentDetails: { flex: 1, marginLeft: 11 },
  recentTitle: { color: C.dark, fontSize: 13, fontWeight: '800' },
  recentMeta: { color: C.muted, fontSize: 11, marginTop: 4 },
  recentFare: { color: C.green, fontSize: 13, fontWeight: '900' },
  emptyRecent: { backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: C.border, padding: 16 },
  emptyRecentText: { color: C.muted, fontSize: 13 },
});
