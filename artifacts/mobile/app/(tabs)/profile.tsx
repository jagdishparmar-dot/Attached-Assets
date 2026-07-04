import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<string, string> = {
  driver: "Driver",
  picker: "Picker",
  sorter: "Sorter",
  loader: "Loader",
  supervisor: "Supervisor",
  security: "Security Guard",
  house_keeper: "House Keeper",
};

function initials(name: string | null | undefined): string {
  if (!name) return "CV";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Cross-platform alert helpers ────────────────────────────────────────────
// Alert.alert and expo-haptics are no-ops (or throw) on react-native-web, which
// silently broke the logout dialog + menu buttons in the web preview. These
// helpers fall back to the DOM confirm/alert on web and stay native elsewhere.

function safeHaptic() {
  if (Platform.OS === "web") return;
  try {
    void require("expo-haptics")
      .impactAsync(require("expo-haptics").ImpactFeedbackStyle.Medium)
      .catch(() => {});
  } catch {
    // haptics unavailable on this device — ignore
  }
}

function confirmAsync(
  title: string,
  message: string,
  confirmLabel: string,
): Promise<boolean> {
  if (Platform.OS === "web") {
    const fn = (globalThis as { confirm?: (m?: string) => boolean }).confirm;
    return Promise.resolve(fn ? fn(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

function showInfo(title: string, message: string) {
  if (Platform.OS === "web") {
    (globalThis as { alert?: (m?: string) => void }).alert?.(
      `${title}\n\n${message}`,
    );
    return;
  }
  Alert.alert(title, message);
}

function isValidUrl(url: string): boolean {
  return /^https:\/\/.+\..+/.test(url.trim());
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ProfileRowProps {
  label: string;
  value: string | null | undefined;
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
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>
          {value ?? "—"}
        </Text>
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
      <Text style={[styles.menuLabel, { color: color ?? colors.foreground }]}>
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.border} />
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff, isLoading, logout, apiUrl, setApiUrl } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  // Server URL change modal state
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  const handleLogout = async () => {
    safeHaptic();
    const confirmed = await confirmAsync(
      "Logout",
      "Are you sure you want to logout?",
      "Logout",
    );
    if (confirmed) {
      await logout();
    }
  };

  const openUrlModal = () => {
    setUrlInput(apiUrl ?? "");
    setUrlError("");
    setShowUrlModal(true);
  };

  const handleSaveUrl = async () => {
    const trimmed = urlInput.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setUrlError("Please enter a URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('URL must start with "https://" (HTTP is not supported for security).');
      return;
    }
    setUrlError("");
    setUrlSaving(true);
    try {
      await setApiUrl(trimmed);
      setShowUrlModal(false);
      showInfo(
        "Server URL Updated",
        "The new server URL has been saved. Please log in again if you experience any connection issues.",
      );
    } catch {
      setUrlError("Could not save the URL. Please try again.");
    } finally {
      setUrlSaving(false);
    }
  };

  if (isLoading || !staff) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Server URL change modal ── */}
      <Modal
        visible={showUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: colors.muted }]}>
                <MaterialIcons name="device-hub" size={24} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Hub URL
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Enter the new Hub connection URL
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                {
                  borderColor: urlError ? "#DC2626" : colors.border,
                  backgroundColor: colors.muted,
                },
              ]}
            >
              <MaterialIcons name="link" size={18} color={colors.secondary} />
              <TextInput
                style={[styles.modalInput, { color: colors.foreground }]}
                value={urlInput}
                onChangeText={(t) => {
                  setUrlInput(t);
                  setUrlError("");
                }}
                placeholder="https://yourapp.replit.app"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            {urlError ? (
              <Text style={styles.urlErrorText}>{urlError}</Text>
            ) : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalCancelBtn,
                  { borderColor: colors.border },
                ]}
                onPress={() => {
                  setShowUrlModal(false);
                  setUrlError("");
                }}
                disabled={urlSaving}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalSaveBtn,
                  { backgroundColor: colors.primary },
                  urlSaving && { opacity: 0.7 },
                ]}
                onPress={handleSaveUrl}
                disabled={urlSaving}
              >
                {urlSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: topPad + 16 },
        ]}
      >
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: "#2E6BE6" }]}>
            <Text style={styles.avatarText}>{initials(staff.name)}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.staffName}>{staff.name ?? "—"}</Text>
            <Text style={styles.employeeId}>{staff.employeeId ?? "—"}</Text>
            <View style={styles.activeBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.activeText}>
                {ROLE_LABELS[staff.role] ?? staff.role ?? "Staff"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
      >
        {/* Staff Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Staff Information
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ProfileRow
              label="Employee ID"
              value={staff.employeeId}
              icon="badge"
            />
            <ProfileRow label="Mobile" value={staff.phone} icon="phone" />
            <ProfileRow
              label="Role"
              value={ROLE_LABELS[staff.role] ?? staff.role}
              icon="work"
            />
            <ProfileRow
              label="Joining Date"
              value={staff.joiningDate}
              icon="calendar-today"
            />
          </View>
        </View>

        {/* Driver Details (drivers only) */}
        {staff.role === "driver" &&
          (staff.licenseNumber || staff.licenseExpiry) && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.foreground }]}
              >
                Driver Details
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ProfileRow
                  label="License No."
                  value={staff.licenseNumber}
                  icon="card-membership"
                />
                <ProfileRow
                  label="License Expiry"
                  value={staff.licenseExpiry}
                  icon="event"
                />
              </View>
            </View>
          )}

        {/* Hub & Shift */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Hub & Shift
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ProfileRow label="Hub" value={staff.hub} icon="warehouse" />
            <ProfileRow
              label="Shift"
              value={
                staff.shiftStart && staff.shiftEnd
                  ? `${staff.shiftStart} – ${staff.shiftEnd}`
                  : null
              }
              icon="schedule"
            />
          </View>
        </View>

        {/* Settings & Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Settings & Support
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <MenuItem
              label="Hub URL"
              icon="device-hub"
              onPress={openUrlModal}
            />
            <MenuItem
              label="Change Password"
              icon="lock"
              onPress={() =>
                showInfo(
                  "Change Password",
                  "This feature will be available soon.",
                )
              }
            />
            <MenuItem
              label="Language"
              icon="language"
              onPress={() =>
                showInfo(
                  "Language",
                  "The app is currently available in English. More languages coming soon.",
                )
              }
            />
            <MenuItem
              label="Notifications"
              icon="notifications"
              onPress={() =>
                showInfo(
                  "Notifications",
                  "Notification settings will be available soon.",
                )
              }
            />
            <MenuItem
              label="Help & Support"
              icon="help"
              onPress={() =>
                showInfo(
                  "Help & Support",
                  "For any help, please contact your hub supervisor.",
                )
              }
            />
            <MenuItem
              label="Terms & Policy"
              icon="description"
              onPress={() =>
                showInfo(
                  "Terms & Policy",
                  "By using the Coldverse Staff App you agree to Coldverse Supply Chain's terms of service and privacy policy.",
                )
              }
            />
          </View>
        </View>

        {/* Logout */}
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
          Coldverse Staff App v2.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  avatarInfo: { flex: 1 },
  staffName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  employeeId: {
    color: "#8BAFC7",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  activeText: {
    color: "#22C55E",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: { color: "#DC2626", fontSize: 16, fontFamily: "Inter_700Bold" },
  version: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 16,
    marginBottom: 8,
  },
  // ── URL Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  modalIconRow: { alignItems: "center", marginBottom: 12 },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
  },
  modalInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  urlErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    marginTop: 2,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: { borderWidth: 1.5 },
  modalSaveBtn: {},
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
