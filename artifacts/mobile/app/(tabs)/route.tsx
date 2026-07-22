import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { getApiBase, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RouteScreen() {
  const { staff, token } = useAuth();
  const { deliveries, refreshData } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const myDeliveries = useMemo(
    () =>
      deliveries
        .filter((d) => d.status !== "delivered" && d.status !== "failed")
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
    [deliveries],
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const generatePlan = async () => {
    if (myDeliveries.length === 0) {
      setError("No pending deliveries assigned to you today.");
      return;
    }
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const base = getApiBase();
      if (!base) {
        setError("Hub URL is not configured.");
        return;
      }
      const addresses = myDeliveries.map(
        (d) => `${d.address}${d.area ? `, ${d.area}` : ""}, ${d.city}`,
      );
      const res = await fetch(`${base}/api/ai/route-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ addresses, driverName: staff?.name }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = (await res.json()) as { plan: string };
      setPlan(data.plan);
    } catch {
      setError("Failed to generate route plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)/deliveries");
            }}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityLabel="Back to deliveries"
          >
            <MaterialIcons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Route</Text>
            <Text style={styles.subtitle}>
              {myDeliveries.length} stop{myDeliveries.length === 1 ? "" : "s"} today
            </Text>
          </View>
          <Pressable
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
            onPress={generatePlan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                <Text style={styles.generateBtnText}>{plan ? "Regen" : "Generate"}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {myDeliveries.length > 0 && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.panelHead}>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>Today’s stops</Text>
              <Pressable onPress={refreshData} hitSlop={8}>
                <MaterialIcons name="refresh" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {myDeliveries.map((d, i) => {
              const last = i === myDeliveries.length - 1;
              const priorityColor =
                d.priority === "high" ? "#EF4444" : d.priority === "low" ? "#16A34A" : "#F59E0B";
              return (
                <Pressable
                  key={d.id}
                  style={styles.stopRow}
                  onPress={() => router.push(`/delivery/${d.id}`)}
                >
                  <View style={styles.rail}>
                    <View style={[styles.stopBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stopBadgeText}>{d.sequence || i + 1}</Text>
                    </View>
                    {!last && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View
                    style={[
                      styles.stopBody,
                      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.stopTop}>
                      <Text style={[styles.stopName, { color: colors.foreground }]} numberOfLines={1}>
                        {d.customerName}
                      </Text>
                      <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                    </View>
                    <Text style={[styles.stopAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {d.address}
                      {d.area ? `, ${d.area}` : ""}
                    </Text>
                    <View style={styles.stopMeta}>
                      <Text style={[styles.stopWindow, { color: colors.secondary }]}>
                        {d.deliveryWindow || "Anytime"}
                      </Text>
                      <Text style={[styles.stopDc, { color: colors.mutedForeground }]}>
                        {d.deliveryNumber}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {myDeliveries.length === 0 && !plan && !loading && (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <MaterialIcons name="alt-route" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No stops today</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Assigned deliveries will show here once the hub schedules your route.
            </Text>
          </View>
        )}

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructiveLight }]}>
            <MaterialIcons name="error-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {loading && (
          <View
            style={[
              styles.panel,
              styles.loadingBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Optimizing your route…
            </Text>
          </View>
        )}

        {plan && !loading && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.panelHead}>
              <View style={styles.planTitleRow}>
                <MaterialIcons name="auto-awesome" size={18} color={colors.secondary} />
                <Text style={[styles.panelTitle, { color: colors.foreground, marginBottom: 0 }]}>
                  Suggested plan
                </Text>
              </View>
              <Pressable onPress={generatePlan} hitSlop={8}>
                <MaterialIcons name="refresh" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.planText, { color: colors.foreground }]}>{plan}</Text>
          </View>
        )}
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
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  scroll: { flex: 1 },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  panelTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 0 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stopRow: { flexDirection: "row", paddingHorizontal: 14 },
  rail: { width: 28, alignItems: "center", paddingTop: 14 },
  stopBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  railLine: { width: 2, flex: 1, marginTop: 4, minHeight: 18 },
  stopBody: { flex: 1, paddingVertical: 12, paddingLeft: 10 },
  stopTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  stopAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  stopMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  stopWindow: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stopDc: { fontSize: 11, fontFamily: "Inter_500Medium" },
  empty: {
    alignItems: "center",
    paddingTop: 72,
    gap: 8,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  loadingBox: { alignItems: "center", paddingVertical: 36, gap: 14 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  planText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
});
