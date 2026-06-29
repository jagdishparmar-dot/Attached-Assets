import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth, getApiBase } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const PING_INTERVAL_MS = 30_000;

function timeSince(date: Date): string {
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return "Long ago";
}

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff, token } = useAuth();

  const [isTracking, setIsTracking] = useState(false);
  const [gpsGranted, setGpsGranted] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    requestPermission();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const requestPermission = async () => {
    if (Platform.OS === "web") {
      if (!navigator.geolocation) { setError("Geolocation not available"); return; }
      setGpsGranted(true);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setGpsGranted(status === "granted");
    if (status !== "granted") setError("Location permission denied");
  };

  const sendPing = async () => {
    if (!staff) return;
    try {
      let lat: number, lng: number, speed: number | null = null, acc: number | null = null;

      if (Platform.OS === "web") {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
        speed = pos.coords.speed;
      } else {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
        speed = pos.coords.speed ?? null;
      }

      setCurrentLat(lat);
      setCurrentLng(lng);
      setCurrentSpeed(speed != null ? Math.round(speed * 3.6) : null);
      setAccuracy(acc ? Math.round(acc) : null);
      setError(null);

      const base = getApiBase();
      await fetch(`${base}/api/locations/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ staffId: staff.id, lat, lng, accuracy: acc, speed }),
      });

      setLastPing(new Date());
      setPingCount((c) => c + 1);
    } catch (e) {
      setError("GPS unavailable");
    }
  };

  const startTracking = async () => {
    if (!gpsGranted) await requestPermission();
    setIsTracking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendPing();
    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
  };

  const stopTracking = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsTracking(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTracking = () => {
    if (isTracking) stopTracking();
    else startTracking();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Live Tracking</Text>
        <View style={styles.headerRight}>
          <View style={[styles.liveBadge, { backgroundColor: isTracking ? "#22C55E" : "#6B7280" }]}>
            {isTracking && <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />}
            <Text style={styles.liveText}>{isTracking ? "LIVE" : "OFF"}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {/* GPS Status Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="my-location" size={22} color={colors.secondary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>GPS Location</Text>
            {currentLat != null && (
              <View style={[styles.activeBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.activeBadgeText, { color: "#16A34A" }]}>Active</Text>
              </View>
            )}
          </View>

          {currentLat != null ? (
            <View style={styles.coordGrid}>
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>Latitude</Text>
                <Text style={[styles.coordVal, { color: colors.foreground }]}>{currentLat.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>Longitude</Text>
                <Text style={[styles.coordVal, { color: colors.foreground }]}>{currentLng?.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>Accuracy</Text>
                <Text style={[styles.coordVal, { color: colors.foreground }]}>{accuracy != null ? `±${accuracy}m` : "—"}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>Speed</Text>
                <Text style={[styles.coordVal, { color: colors.foreground }]}>{currentSpeed != null ? `${currentSpeed} km/h` : "—"}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.noGps, { color: colors.mutedForeground }]}>
              {gpsGranted ? "Start tracking to get GPS location" : "Location permission required"}
            </Text>
          )}

          {error && (
            <View style={styles.errorRow}>
              <MaterialIcons name="warning" size={14} color="#D97706" />
              <Text style={[styles.errorText, { color: "#D97706" }]}>{error}</Text>
            </View>
          )}
        </View>

        {/* Sync Status */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.syncRow}>
            <View style={styles.syncItem}>
              <MaterialIcons name="sync" size={20} color={colors.secondary} />
              <Text style={[styles.syncLabel, { color: colors.mutedForeground }]}>Last Sync</Text>
              <Text style={[styles.syncVal, { color: colors.foreground }]}>
                {lastPing ? timeSince(lastPing) : "Never"}
              </Text>
            </View>
            <View style={[styles.syncDivider, { backgroundColor: colors.border }]} />
            <View style={styles.syncItem}>
              <MaterialIcons name="location-on" size={20} color={colors.secondary} />
              <Text style={[styles.syncLabel, { color: colors.mutedForeground }]}>Pings Sent</Text>
              <Text style={[styles.syncVal, { color: colors.foreground }]}>{pingCount}</Text>
            </View>
            <View style={[styles.syncDivider, { backgroundColor: colors.border }]} />
            <View style={styles.syncItem}>
              <MaterialIcons name="timer" size={20} color={colors.secondary} />
              <Text style={[styles.syncLabel, { color: colors.mutedForeground }]}>Interval</Text>
              <Text style={[styles.syncVal, { color: colors.foreground }]}>30s</Text>
            </View>
          </View>
        </View>

        {/* Info box */}
        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Your GPS location is shared with the admin control room every 30 seconds while tracking is active.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.trackToggle, { backgroundColor: isTracking ? "#DC2626" : "#16A34A" }]}
          onPress={toggleTracking}
          activeOpacity={0.85}
        >
          <MaterialIcons name={isTracking ? "pause" : "play-arrow"} size={22} color="#fff" />
          <Text style={styles.trackToggleText}>{isTracking ? "Stop Tracking" : "Start Tracking"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerRight: {},
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  body: { flex: 1, padding: 16, gap: 12 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  coordGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  coordItem: { width: "45%", gap: 2 },
  coordLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  coordVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  noGps: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  syncRow: { flexDirection: "row", alignItems: "center" },
  syncItem: { flex: 1, alignItems: "center", gap: 4 },
  syncDivider: { width: 1, height: 40 },
  syncLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  syncVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  trackToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16, marginTop: "auto" },
  trackToggleText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
