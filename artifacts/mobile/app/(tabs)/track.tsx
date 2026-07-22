import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTracking } from "@/context/TrackingContext";
import { useColors } from "@/hooks/useColors";

function timeSince(date: Date, nowMs: number): string {
  const diff = Math.max(0, Math.round((nowMs - date.getTime()) / 1000));
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function accuracyQuality(meters: number | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (meters == null) return { label: "Unknown", color: "#6B7A8D", bg: "#E8EDF5" };
  if (meters <= 20) return { label: "Excellent", color: "#16A34A", bg: "#DCFCE7" };
  if (meters <= 50) return { label: "Good", color: "#2E6BE6", bg: "#DBEAFE" };
  if (meters <= 100) return { label: "Fair", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Weak", color: "#DC2626", bg: "#FEE2E2" };
}

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff } = useAuth();
  const {
    isTracking,
    gpsGranted,
    currentLat,
    currentLng,
    currentSpeed,
    accuracy,
    lastPing,
    pingCount,
    pinging,
    error,
    pingIntervalMs,
    toggleTracking,
  } = useTracking();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;
  const checkedIn = !!staff?.isCheckedInToday;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isTracking) {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    ring.start();
    return () => {
      pulse.stop();
      ring.stop();
    };
  }, [isTracking, pulseAnim, ringAnim]);

  const quality = accuracyQuality(accuracy);
  const nextPingIn = useMemo(() => {
    if (!isTracking || !lastPing) return null;
    const elapsed = nowMs - lastPing.getTime();
    const remaining = Math.max(0, Math.ceil((pingIntervalMs - elapsed) / 1000));
    return remaining;
  }, [isTracking, lastPing, nowMs, pingIntervalMs]);

  const statusMeta = isTracking
    ? {
        label: checkedIn ? "Live · checked in" : "Sharing live",
        icon: "sensors" as const,
      }
    : {
        label: checkedIn ? "Paused · still checked in" : "Off · check in to auto-start",
        icon: "sensors-off" as const,
      };

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Track</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {statusMeta.label}
              {isTracking && nextPingIn != null ? ` · next ${nextPingIn}s` : ""}
            </Text>
          </View>
          <Pressable
            onPress={toggleTracking}
            accessibilityRole="switch"
            accessibilityState={{ checked: isTracking }}
            accessibilityLabel={isTracking ? "Stop tracking" : "Start tracking"}
            style={styles.toggleWrap}
          >
            <Text style={[styles.toggleCaption, { color: isTracking ? "#22C55E" : "#8BAFC7" }]}>
              {isTracking ? "ON" : "OFF"}
            </Text>
            <View
              style={[
                styles.toggleTrack,
                { backgroundColor: isTracking ? "#22C55E" : "rgba(255,255,255,0.18)" },
              ]}
            >
              {isTracking && (
                <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              )}
              <View
                style={[
                  styles.toggleThumb,
                  isTracking ? styles.toggleThumbOn : styles.toggleThumbOff,
                ]}
              />
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statStripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{pingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pings</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              {lastPing ? timeSince(lastPing, nowMs) : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Last sync</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              {isTracking ? (nextPingIn != null ? `${nextPingIn}s` : "…") : `${pingIntervalMs / 1000}s`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {isTracking ? "Next" : "Interval"}
            </Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.radarWrap}>
            {isTracking && (
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    borderColor: colors.success,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  },
                ]}
              />
            )}
            <Animated.View
              style={[
                styles.radarCore,
                {
                  backgroundColor: isTracking ? colors.successLight : colors.muted,
                  transform: [{ scale: isTracking ? pulseAnim : 1 }],
                },
              ]}
            >
              <MaterialIcons
                name={isTracking ? "navigation" : "explore"}
                size={28}
                color={isTracking ? colors.success : colors.mutedForeground}
              />
            </Animated.View>
          </View>

          <View style={styles.speedBlock}>
            <Text style={[styles.speedVal, { color: colors.foreground }]}>
              {currentSpeed != null ? currentSpeed : "—"}
            </Text>
            <Text style={[styles.speedUnit, { color: colors.mutedForeground }]}>km/h</Text>
          </View>
          <Text style={[styles.speedCaption, { color: colors.mutedForeground }]}>
            {isTracking
              ? pinging
                ? "Updating location…"
                : currentLat != null
                  ? "Current speed from GPS"
                  : "Waiting for first fix…"
              : checkedIn
                ? "Tracking paused — toggle ON or it will resume on next check-in"
                : "Check in on Attendance to start sharing automatically"}
          </Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.panelHead}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>Position</Text>
            {currentLat != null && (
              <View style={[styles.qualityChip, { backgroundColor: quality.bg }]}>
                <Text style={[styles.qualityText, { color: quality.color }]}>{quality.label}</Text>
              </View>
            )}
          </View>

          {currentLat != null ? (
            <View style={styles.metrics}>
              <View style={[styles.metric, { backgroundColor: colors.muted }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Latitude</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {currentLat.toFixed(6)}
                </Text>
              </View>
              <View style={[styles.metric, { backgroundColor: colors.muted }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Longitude</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {currentLng?.toFixed(6)}
                </Text>
              </View>
              <View style={[styles.metric, { backgroundColor: colors.muted }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Accuracy</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {accuracy != null ? `±${accuracy}m` : "—"}
                </Text>
              </View>
              <View style={[styles.metric, { backgroundColor: colors.muted }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>GPS</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {gpsGranted ? "Allowed" : "Blocked"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyGps, { backgroundColor: colors.muted }]}>
              <MaterialIcons name="my-location" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyGpsText, { color: colors.mutedForeground }]}>
                {gpsGranted
                  ? "No fix yet — tracking starts when you check in"
                  : "Location permission is required to share GPS"}
              </Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.warningLight }]}>
              <MaterialIcons name="warning" size={15} color="#D97706" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={[styles.note, { backgroundColor: colors.muted }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Tracking turns on automatically when you check in, and off when you check out. You can
            still use the header toggle for a manual pause.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "#8BAFC7",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  toggleWrap: {
    alignItems: "center",
    gap: 4,
  },
  toggleCaption: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  toggleTrack: {
    width: 52,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  toggleThumbOff: { alignSelf: "flex-start" },
  toggleThumbOn: { alignSelf: "flex-end" },
  liveDot: {
    position: "absolute",
    left: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  statStripCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1 },
  statVal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0A1628",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  radarWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  radarRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  radarCore: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBlock: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  speedVal: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    lineHeight: 52,
    fontVariant: ["tabular-nums"],
  },
  speedUnit: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  speedCaption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  panelTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  qualityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  qualityText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metricVal: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  emptyGps: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyGpsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#D97706",
  },
  note: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
