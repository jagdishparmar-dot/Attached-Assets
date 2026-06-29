import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deliveries, isGpsActive, currentSpeed } = useApp();
  const [isTracking, setIsTracking] = useState(true);
  const [battery] = useState(78);
  const [network] = useState("4G");
  const [lastSync] = useState("Just now");
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

  const inTransit = deliveries.find((d) => d.status === "in_transit");
  const completedCount = deliveries.filter((d) => d.status === "delivered").length;
  const remainingCount = deliveries.filter((d) => d.status === "pending" || d.status === "in_transit").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Live Tracking</Text>
        <View style={styles.headerRight}>
          <View style={[styles.liveBadge, { backgroundColor: isTracking ? "#22C55E" : "#EF4444" }]}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>{isTracking ? "LIVE" : "PAUSED"}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mapPlaceholder, { backgroundColor: colors.muted }]}>
        <View style={styles.mapContent}>
          <MaterialIcons name="map" size={64} color={colors.border} />
          <Text style={[styles.mapLabel, { color: colors.mutedForeground }]}>Interactive Map</Text>
          <Text style={[styles.mapSub, { color: colors.border }]}>Google Maps integration available</Text>
        </View>

        <View style={[styles.mapOverlayCard, { backgroundColor: colors.card }]}>
          <View style={styles.routeDot} />
          <View style={[styles.routeLine, { backgroundColor: colors.secondary }]} />
          <View style={[styles.routeDotEnd, { backgroundColor: colors.secondary }]} />
          <View style={styles.mapRouteInfo}>
            <Text style={[styles.mapRouteLabel, { color: colors.foreground }]}>Current Location</Text>
            <Text style={[styles.mapRouteLocation, { color: colors.mutedForeground }]}>Naroda Industrial Estate</Text>
            {inTransit && (
              <>
                <View style={[styles.mapRouteDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.mapRouteLabel, { color: colors.foreground }]}>Next Stop</Text>
                <Text style={[styles.mapRouteLocation, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {inTransit.customerName}
                </Text>
                <Text style={[styles.etaText, { color: colors.secondary }]}>{inTransit.etaMinutes} min away</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <MaterialIcons name="speed" size={20} color={colors.secondary} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{currentSpeed}</Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>km/h</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <MaterialIcons name="battery-std" size={20} color={battery > 30 ? "#22C55E" : "#EF4444"} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{battery}%</Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>Battery</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <MaterialIcons name="signal-cellular-alt" size={20} color={colors.secondary} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{network}</Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>Network</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <MaterialIcons name="sync" size={20} color={colors.secondary} />
          <Text style={[styles.statVal, { color: colors.foreground, fontSize: 12 }]}>{lastSync}</Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>Sync</Text>
        </View>
      </View>

      <View style={styles.tripStats}>
        <View style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="check-circle" size={24} color="#16A34A" />
          <Text style={[styles.tripVal, { color: colors.foreground }]}>{completedCount}</Text>
          <Text style={[styles.tripLabel, { color: colors.mutedForeground }]}>Completed</Text>
        </View>
        <View style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="pending-actions" size={24} color="#F5A623" />
          <Text style={[styles.tripVal, { color: colors.foreground }]}>{remainingCount}</Text>
          <Text style={[styles.tripLabel, { color: colors.mutedForeground }]}>Remaining</Text>
        </View>
        <View style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="route" size={24} color={colors.secondary} />
          <Text style={[styles.tripVal, { color: colors.foreground }]}>42.3</Text>
          <Text style={[styles.tripLabel, { color: colors.mutedForeground }]}>km Today</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.trackToggle, { backgroundColor: isTracking ? "#DC2626" : "#16A34A" }]}
        onPress={() => setIsTracking(!isTracking)}
        activeOpacity={0.85}
      >
        <MaterialIcons name={isTracking ? "pause" : "play-arrow"} size={20} color="#fff" />
        <Text style={styles.trackToggleText}>{isTracking ? "Pause Tracking" : "Resume Tracking"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  mapPlaceholder: { flex: 1, margin: 16, borderRadius: 16, overflow: "hidden", justifyContent: "center", alignItems: "center", minHeight: 180 },
  mapContent: { alignItems: "center", gap: 8 },
  mapLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  mapSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mapOverlayCard: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E" },
  routeLine: { position: "absolute", left: 18, top: 22, width: 2, height: 20 },
  routeDotEnd: { width: 10, height: 10, borderRadius: 2 },
  mapRouteInfo: { flex: 1 },
  mapRouteLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  mapRouteLocation: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 1 },
  mapRouteDivider: { height: 1, marginVertical: 8 },
  etaText: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  statsBar: { flexDirection: "row", marginHorizontal: 16, borderRadius: 14, overflow: "hidden", backgroundColor: "#FFFFFF", marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 },
  statVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1 },
  tripStats: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 },
  tripCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  tripVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  tripLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  trackToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 14 },
  trackToggleText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
