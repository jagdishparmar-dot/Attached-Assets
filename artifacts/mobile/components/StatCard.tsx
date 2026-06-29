import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
  small?: boolean;
}

export function StatCard({ label, value, icon, iconColor, iconBg, subtitle, small }: Props) {
  const colors = useColors();

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      small && styles.smallCard,
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg ?? colors.muted }]}>
        <MaterialIcons name={icon} size={small ? 18 : 22} color={iconColor ?? colors.secondary} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }, small && styles.smallValue]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }, small && styles.smallLabel]}>{label}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.secondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "flex-start",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  smallCard: { padding: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  value: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 2 },
  smallValue: { fontSize: 20 },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  smallLabel: { fontSize: 11 },
  subtitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
});
