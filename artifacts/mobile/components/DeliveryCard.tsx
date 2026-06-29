import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Delivery, DeliveryPriority, DeliveryStatus } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  pending: { label: "Pending", icon: "schedule", color: "#F5A623", bg: "#FEF3C7" },
  in_transit: { label: "In Transit", icon: "local-shipping", color: "#2E6BE6", bg: "#DBEAFE" },
  delivered: { label: "Delivered", icon: "check-circle", color: "#16A34A", bg: "#DCFCE7" },
  failed: { label: "Failed", icon: "cancel", color: "#DC2626", bg: "#FEE2E2" },
  rescheduled: { label: "Rescheduled", icon: "event", color: "#7C3AED", bg: "#EDE9FE" },
  partial: { label: "Partial", icon: "remove-circle", color: "#D97706", bg: "#FEF3C7" },
};

const PRIORITY_CONFIG: Record<DeliveryPriority, { label: string; color: string }> = {
  high: { label: "HIGH", color: "#DC2626" },
  normal: { label: "NORMAL", color: "#2E6BE6" },
  low: { label: "LOW", color: "#6B7A8D" },
};

interface Props {
  delivery: Delivery;
  compact?: boolean;
}

export function DeliveryCard({ delivery, compact }: Props) {
  const colors = useColors();

  const status = STATUS_CONFIG[delivery.status];
  const priority = PRIORITY_CONFIG[delivery.priority];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/delivery/${delivery.id}`);
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.sequenceBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.sequenceText}>{delivery.sequence || "-"}</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={[styles.compactName, { color: colors.foreground }]} numberOfLines={1}>
            {delivery.customerName}
          </Text>
          <Text style={[styles.compactArea, { color: colors.mutedForeground }]} numberOfLines={1}>
            {delivery.area} · {delivery.deliveryWindow}
          </Text>
        </View>
        <View style={[styles.miniStatus, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={14} color={status.color} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={styles.deliveryNumRow}>
          <Text style={[styles.deliveryNum, { color: colors.secondary }]}>{delivery.deliveryNumber}</Text>
          {delivery.priority === "high" && (
            <View style={styles.priorityBadge}>
              <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={[styles.customerName, { color: colors.foreground }]}>{delivery.customerName}</Text>
      <View style={styles.addressRow}>
        <MaterialIcons name="location-on" size={14} color={colors.mutedForeground} />
        <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
          {delivery.address}, {delivery.area}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <MaterialIcons name="access-time" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{delivery.deliveryWindow}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="inventory" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{delivery.products.length} items · {delivery.totalWeight}</Text>
        </View>
        {delivery.status === "in_transit" && delivery.etaMinutes > 0 && (
          <View style={[styles.etaBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.etaText}>{delivery.etaMinutes}m</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  deliveryNumRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deliveryNum: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  priorityBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  customerName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 12 },
  address: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  divider: { height: 1, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  etaBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  etaText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  compactCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sequenceBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  sequenceText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  compactInfo: { flex: 1 },
  compactName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  compactArea: { fontSize: 12, fontFamily: "Inter_400Regular" },
  miniStatus: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
});
