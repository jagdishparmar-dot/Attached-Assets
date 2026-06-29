import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface ProfileRowProps {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

function ProfileRow({ label, value, icon }: ProfileRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <MaterialIcons name={icon} size={16} color={colors.secondary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

interface MenuItemProps {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
  onPress: () => void;
}

function MenuItem({ label, icon, color, onPress }: MenuItemProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
        <MaterialIcons name={icon} size={18} color={color ?? colors.secondary} />
      </View>
      <Text style={[styles.menuLabel, { color: color ?? colors.foreground }]}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.border} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { driver, logout } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ]
    );
  };

  if (!driver) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: "#2E6BE6" }]}>
            <Text style={styles.avatarText}>
              {driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.employeeId}>{driver.employeeId}</Text>
            <View style={styles.activeBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.activeText}>Active Driver</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Driver Information</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileRow label="Employee ID" value={driver.employeeId} icon="badge" />
            <ProfileRow label="Mobile" value={driver.phone} icon="phone" />
            <ProfileRow label="License No." value={driver.license} icon="card-membership" />
            <ProfileRow label="License Expiry" value={driver.licenseExpiry} icon="event" />
            <ProfileRow label="Joining Date" value={driver.joiningDate} icon="calendar-today" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vehicle & Hub</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileRow label="Vehicle" value={driver.vehicle} icon="local-shipping" />
            <ProfileRow label="Type" value={driver.vehicleType} icon="category" />
            <ProfileRow label="Hub" value={driver.hub} icon="warehouse" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings & Support</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem label="Change Password" icon="lock" onPress={() => {}} />
            <MenuItem label="Language" icon="language" onPress={() => {}} />
            <MenuItem label="Notifications" icon="notifications" onPress={() => {}} />
            <MenuItem label="Help & Support" icon="help" onPress={() => {}} />
            <MenuItem label="Terms & Policy" icon="description" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: "#FEE2E2" }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Coldverse Driver App v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  avatarInfo: { flex: 1 },
  driverName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  employeeId: { color: "#8BAFC7", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#22C55E" },
  activeText: { color: "#22C55E", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  logoutText: { color: "#DC2626", fontSize: 16, fontFamily: "Inter_700Bold" },
  version: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 16, marginBottom: 8 },
});
