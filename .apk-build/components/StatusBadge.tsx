import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DeliveryStatus } from "@/context/AppContext";

const STATUS_MAP: Record<DeliveryStatus, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  pending: { label: "Pending", icon: "schedule", color: "#F5A623", bg: "#FEF3C7" },
  in_transit: { label: "In Transit", icon: "local-shipping", color: "#2E6BE6", bg: "#DBEAFE" },
  delivered: { label: "Delivered", icon: "check-circle", color: "#16A34A", bg: "#DCFCE7" },
  failed: { label: "Failed", icon: "cancel", color: "#DC2626", bg: "#FEE2E2" },
  rescheduled: { label: "Rescheduled", icon: "event", color: "#7C3AED", bg: "#EDE9FE" },
  partial: { label: "Partial", icon: "remove-circle", color: "#D97706", bg: "#FEF3C7" },
};

interface Props {
  status: DeliveryStatus;
  large?: boolean;
}

export function StatusBadge({ status, large }: Props) {
  const cfg = STATUS_MAP[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, large && styles.largeBadge]}>
      <MaterialIcons name={cfg.icon} size={large ? 16 : 13} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color }, large && styles.largeText]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  largeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  largeText: { fontSize: 14 },
});
