import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/DeliveryCard";
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { driver } = useAuth();
  const { deliveries, todayAttendance, isGpsActive, currentSpeed, refreshData } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const stats = useMemo(() => ({
    total: deliveries.length,
    pending: deliveries.filter((d) => d.status === "pending").length,
    inTransit: deliveries.filter((d) => d.status === "in_transit").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
    failed: deliveries.filter((d) => d.status === "failed").length,
  }), [deliveries]);

  const activeDeliveries = useMemo(() =>
    deliveries.filter((d) => d.status === "in_transit" || d.status === "pending")
      .sort((a, b) => a.sequence - b.sequence)
      .slice(0, 3),
    [deliveries]
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const onRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.driverName}>{driver?.name ?? "Driver"}</Text>
            <Text style={styles.dateStr}>{dateStr}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.gpsDot, { backgroundColor: isGpsActive ? "#22C55E" : "#EF4444" }]} />
            <View style={styles.speedBox}>
              <Text style={styles.speedVal}>{currentSpeed}</Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.qStat}>
            <Text style={styles.qStatVal}>{stats.total}</Text>
            <Text style={styles.qStatLabel}>Total</Text>
          </View>
          <View style={styles.qStatDivider} />
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: "#22C55E" }]}>{stats.delivered}</Text>
            <Text style={styles.qStatLabel}>Done</Text>
          </View>
          <View style={styles.qStatDivider} />
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: "#F5A623" }]}>{stats.inTransit}</Text>
            <Text style={styles.qStatLabel}>Transit</Text>
          </View>
          <View style={styles.qStatDivider} />
          <View style={styles.qStat}>
            <Text style={[styles.qStatVal, { color: "#EF4444" }]}>{stats.failed}</Text>
            <Text style={styles.qStatLabel}>Failed</Text>
          </View>
        </View>

        {!todayAttendance?.checkIn && (
          <View style={styles.attendanceBanner}>
            <MaterialIcons name="warning" size={15} color="#F5A623" />
            <Text style={styles.attendanceBannerText}>Attendance not marked today</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Pending"
              value={stats.pending}
              icon="pending-actions"
              iconColor="#F5A623"
              iconBg="#FEF3C7"
            />
            <StatCard
              label="Delivered"
              value={stats.delivered}
              icon="check-circle"
              iconColor="#16A34A"
              iconBg="#DCFCE7"
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              label="Vehicle"
              value={driver?.vehicle ?? "—"}
              icon="local-shipping"
              iconColor={colors.secondary}
              iconBg={colors.muted}
              small
            />
            <StatCard
              label="Hub"
              value="Ahmedabad"
              icon="warehouse"
              iconColor={colors.secondary}
              iconBg={colors.muted}
              small
            />
          </View>
        </View>

        {activeDeliveries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Deliveries</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.secondary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeDeliveries.map((d) => (
              <DeliveryCard key={d.id} delivery={d} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vehicle Status</Text>
          <View style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleInfo}>
                <MaterialIcons name="local-shipping" size={28} color={colors.secondary} />
                <View>
                  <Text style={[styles.vehicleNum, { color: colors.foreground }]}>{driver?.vehicle}</Text>
                  <Text style={[styles.vehicleType, { color: colors.mutedForeground }]}>{driver?.vehicleType}</Text>
                </View>
              </View>
              <View style={[styles.statusPill, { backgroundColor: "#DCFCE7" }]}>
                <Text style={{ color: "#16A34A", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Active</Text>
              </View>
            </View>
            <View style={[styles.tempStrip, { backgroundColor: "#DBEAFE" }]}>
              <MaterialIcons name="device-thermostat" size={16} color="#2E6BE6" />
              <Text style={styles.tempText}>Compartment A: -18°C</Text>
              <Text style={styles.tempDivider}>|</Text>
              <Text style={styles.tempText}>Compartment B: 4°C</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { color: "#8BAFC7", fontSize: 13, fontFamily: "Inter_400Regular" },
  driverName: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  dateStr: { color: "#8BAFC7", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerRight: { alignItems: "center", gap: 8 },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  speedBox: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  speedVal: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  speedUnit: { color: "#8BAFC7", fontSize: 10, fontFamily: "Inter_400Regular" },
  quickStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 14 },
  qStat: { flex: 1, alignItems: "center" },
  qStatVal: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  qStatLabel: { color: "#8BAFC7", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  qStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  attendanceBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(245,166,35,0.15)", borderRadius: 10, padding: 10, marginTop: 12 },
  attendanceBannerText: { color: "#F5A623", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  vehicleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  vehicleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  vehicleNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  vehicleType: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tempStrip: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  tempText: { color: "#2E6BE6", fontSize: 12, fontFamily: "Inter_500Medium" },
  tempDivider: { color: "#2E6BE6", opacity: 0.4 },
});
