import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/DeliveryCard";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function formatTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function roleLabel(role: string | null | undefined) {
  if (!role) return "Driver";
  return role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ");
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff } = useAuth();
  const { deliveries, todayAttendance, isGpsActive, currentSpeed, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(
    () => ({
      total: deliveries.length,
      pending: deliveries.filter((d) => d.status === "pending").length,
      inTransit: deliveries.filter((d) => d.status === "in_transit").length,
      delivered: deliveries.filter((d) => d.status === "delivered").length,
      failed: deliveries.filter((d) => d.status === "failed").length,
    }),
    [deliveries],
  );

  const activeDeliveries = useMemo(
    () =>
      deliveries
        .filter((d) => d.status === "in_transit" || d.status === "pending")
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, 3),
    [deliveries],
  );

  const progress = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const checkedIn = !!(todayAttendance?.checkIn || staff?.isCheckedInToday);
  const checkedOut = !!todayAttendance?.checkOut;
  const checkInLabel = formatTime(todayAttendance?.checkIn ?? staff?.checkInTime);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const attendanceMeta = checkedOut
    ? {
        label: "Shift closed",
        hint: todayAttendance?.workingHours
          ? `${todayAttendance.workingHours} logged today`
          : "Attendance for today is complete",
        chipBg: "rgba(139,175,199,0.2)",
        chipFg: "#8BAFC7",
        icon: "done-all" as const,
      }
    : checkedIn
      ? {
          label: "Checked in",
          hint: checkInLabel ? `Since ${checkInLabel} · keep deliveries moving` : "On site and ready",
          chipBg: "rgba(34,197,94,0.18)",
          chipFg: "#22C55E",
          icon: "verified" as const,
        }
      : {
          label: "Not checked in",
          hint: "Mark attendance before starting your route",
          chipBg: "rgba(245,166,35,0.18)",
          chipFg: "#F5A623",
          icon: "schedule" as const,
        };

  const onRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const quickActions = [
    {
      key: "deliveries",
      label: "Deliveries",
      icon: "local-shipping" as const,
      color: colors.secondary,
      bg: colors.inTransitLight,
      onPress: () => router.push("/(tabs)/deliveries"),
    },
    {
      key: "route",
      label: "Route",
      icon: "map" as const,
      color: "#7C3AED",
      bg: "#EDE9FE",
      onPress: () => router.push("/(tabs)/route"),
    },
    {
      key: "attendance",
      label: "Attendance",
      icon: "event-available" as const,
      color: colors.success,
      bg: colors.successLight,
      onPress: () => router.push("/(tabs)/attendance"),
    },
    {
      key: "track",
      label: "Track",
      icon: "gps-fixed" as const,
      color: "#D97706",
      bg: colors.warningLight,
      onPress: () => router.push("/(tabs)/track"),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {greeting}, {staff?.name?.split(" ")[0] ?? "Driver"} · {stats.total} assigned
            </Text>
          </View>
          <View style={styles.speedBox}>
            <View style={[styles.gpsDot, { backgroundColor: isGpsActive ? "#22C55E" : "#F87171" }]} />
            <Text style={styles.speedVal}>{currentSpeed ?? "—"}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: botPad + 100, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        <View style={styles.section}>
          <View style={[styles.statStripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Assigned</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.success }]}>{stats.delivered}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Done</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#D97706" }]}>{stats.inTransit}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transit</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.destructive }]}>{stats.failed}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Failed</Text>
            </View>
          </View>
          <View style={styles.statusInline}>
            <MaterialIcons name={attendanceMeta.icon} size={14} color={attendanceMeta.chipFg} />
            <Text style={[styles.statusInlineText, { color: colors.mutedForeground }]}>
              {attendanceMeta.label} · {dateStr}
            </Text>
          </View>
        </View>

        {!checkedIn && (
          <Pressable
            style={[styles.ctaBanner, { backgroundColor: colors.warningLight }]}
            onPress={() => router.push("/(tabs)/attendance")}
          >
            <MaterialIcons name="warning-amber" size={18} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Attendance pending</Text>
              <Text style={styles.ctaSub}>Check in at the hub to start your day</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#D97706" />
          </Pressable>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Route progress</Text>
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHead}>
              <View>
                <Text style={[styles.progressPct, { color: colors.foreground }]}>{progress}%</Text>
                <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                  {stats.delivered} of {stats.total} delivered
                </Text>
              </View>
              <View style={[styles.pendingChip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.pendingChipText, { color: colors.foreground }]}>
                  {stats.pending} pending
                </Text>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: progress >= 100 ? colors.success : colors.secondary,
                  },
                ]}
              />
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <MaterialIcons name="schedule" size={16} color="#D97706" />
                <Text style={[styles.metricText, { color: colors.mutedForeground }]}>
                  {stats.pending} waiting
                </Text>
              </View>
              <View style={styles.metric}>
                <MaterialIcons name="local-shipping" size={16} color={colors.secondary} />
                <Text style={[styles.metricText, { color: colors.mutedForeground }]}>
                  {stats.inTransit} on road
                </Text>
              </View>
              <View style={styles.metric}>
                <MaterialIcons name="cancel" size={16} color={colors.destructive} />
                <Text style={[styles.metricText, { color: colors.mutedForeground }]}>
                  {stats.failed} failed
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                  <MaterialIcons name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
              Active deliveries
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/deliveries")} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.secondary }]}>See all</Text>
            </Pressable>
          </View>
          {activeDeliveries.length > 0 ? (
            <View style={styles.deliveryList}>
              {activeDeliveries.map((d) => (
                <DeliveryCard key={d.id} delivery={d} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialIcons name="inventory-2" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active stops</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {stats.total === 0
                  ? "No deliveries assigned for today yet"
                  : "All assigned deliveries are completed or closed"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shift details</Text>
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.shiftRow}>
              <View style={[styles.shiftIcon, { backgroundColor: colors.muted }]}>
                <MaterialIcons name="warehouse" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>Hub</Text>
                <Text style={[styles.shiftValue, { color: colors.foreground }]}>
                  {staff?.hub ?? "—"}
                </Text>
              </View>
              <View style={[styles.rolePill, { backgroundColor: colors.inTransitLight }]}>
                <Text style={[styles.rolePillText, { color: colors.secondary }]}>
                  {roleLabel(staff?.role)}
                </Text>
              </View>
            </View>

            <View style={[styles.shiftDivider, { backgroundColor: colors.border }]} />

            <View style={styles.shiftMetaGrid}>
              <View style={styles.shiftMeta}>
                <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>Check in</Text>
                <Text style={[styles.shiftValue, { color: colors.foreground }]}>
                  {checkInLabel ?? "—"}
                </Text>
              </View>
              <View style={styles.shiftMeta}>
                <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>Check out</Text>
                <Text style={[styles.shiftValue, { color: colors.foreground }]}>
                  {formatTime(todayAttendance?.checkOut) ?? "—"}
                </Text>
              </View>
              <View style={styles.shiftMeta}>
                <Text style={[styles.shiftLabel, { color: colors.mutedForeground }]}>Hours</Text>
                <Text style={[styles.shiftValue, { color: colors.foreground }]}>
                  {todayAttendance?.workingHours ?? "—"}
                </Text>
              </View>
            </View>
          </View>
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
  speedBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
    gap: 2,
  },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  speedVal: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  speedUnit: { color: "#8BAFC7", fontSize: 10, fontFamily: "Inter_400Regular" },
  statStripCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1 },
  statVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  statusInlineText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  scroll: { flex: 1 },
  ctaBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaTitle: {
    color: "#92400E",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  ctaSub: {
    color: "#B45309",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#0A1628",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  progressHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  progressPct: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  progressSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pendingChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pendingChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metric: { flexDirection: "row", alignItems: "center", gap: 5 },
  metricText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deliveryList: { gap: 10 },
  emptyPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  shiftIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  shiftValue: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  rolePillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  shiftDivider: { height: 1, marginVertical: 14 },
  shiftMetaGrid: { flexDirection: "row" },
  shiftMeta: { flex: 1 },
});
