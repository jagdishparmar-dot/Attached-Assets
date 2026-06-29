import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBase, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useListDeliveries } from "@workspace/api-client-react";

export default function RouteScreen() {
  const { staff } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const { data: deliveries } = useListDeliveries({ date: today });

  const myDeliveries = (deliveries ?? []).filter(
    (d) =>
      d.assignedDriverId === staff?.id &&
      d.status !== "delivered" &&
      d.status !== "failed"
  );

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
      const addresses = myDeliveries.map(
        (d) =>
          `${d.deliveryAddress}${d.deliveryArea ? ", " + d.deliveryArea : ""}, ${d.deliveryCity}`
      );
      const res = await fetch(`${base}/api/ai/route-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            AI Route Plan
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {myDeliveries.length} stop{myDeliveries.length !== 1 ? "s" : ""}{" "}
            assigned today
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.generateBtn,
            loading && styles.generateBtnDisabled,
          ]}
          onPress={generatePlan}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="auto-awesome" size={16} color="#fff" />
              <Text style={styles.generateBtnText}>Generate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {myDeliveries.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            TODAY'S STOPS
          </Text>
          {myDeliveries.map((d, i) => (
            <View
              key={d.id}
              style={[
                styles.stopRow,
                i < myDeliveries.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.stopBadge}>
                <Text style={styles.stopBadgeText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.stopName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {d.customerName}
                </Text>
                <Text
                  style={[styles.stopAddr, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {d.deliveryAddress}, {d.deliveryCity}
                </Text>
                <Text style={styles.stopWindow}>{d.deliveryWindow}</Text>
              </View>
              <View
                style={[
                  styles.priorityDot,
                  {
                    backgroundColor:
                      d.priority === "high"
                        ? "#EF4444"
                        : d.priority === "low"
                        ? "#10B981"
                        : "#F59E0B",
                  },
                ]}
              />
            </View>
          ))}
        </View>
      )}

      {myDeliveries.length === 0 && !plan && !loading && (
        <View style={styles.empty}>
          <MaterialIcons name="route" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No deliveries today
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Your assigned deliveries will appear here once the admin assigns
            them.
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1A3A6B" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            AI is optimizing your route…
          </Text>
        </View>
      )}

      {plan && !loading && (
        <View
          style={[
            styles.planBox,
            { backgroundColor: colors.card, borderColor: "#1A3A6B" },
          ]}
        >
          <View style={styles.planHeader}>
            <MaterialIcons name="auto-awesome" size={18} color="#1A3A6B" />
            <Text style={styles.planTitle}>AI Generated Plan</Text>
            <TouchableOpacity
              onPress={generatePlan}
              style={styles.regenerateBtn}
            >
              <MaterialIcons name="refresh" size={16} color="#6B7A8D" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.planText, { color: colors.foreground }]}>
            {plan}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A3A6B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 8,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  stopBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1A3A6B",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadgeText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  stopName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stopAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  stopWindow: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    color: "#1A3A6B",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  planBox: { borderRadius: 14, borderWidth: 1.5, padding: 16 },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#1A3A6B",
    flex: 1,
  },
  regenerateBtn: { padding: 4 },
  planText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
