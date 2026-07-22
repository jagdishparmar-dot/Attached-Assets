import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isValidHubUrl, useAuth } from "@/context/AuthContext";
import { ThemePreference, useTheme } from "@/context/ThemeContext";
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

function formatJoinDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function safeHaptic() {
  if (Platform.OS === "web") return;
  try {
    void require("expo-haptics")
      .impactAsync(require("expo-haptics").ImpactFeedbackStyle.Medium)
      .catch(() => {});
  } catch {
    // ignore
  }
}

function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
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
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

function showInfo(title: string, message: string) {
  if (Platform.OS === "web") {
    (globalThis as { alert?: (m?: string) => void }).alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function InfoRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string | null | undefined;
  icon: keyof typeof MaterialIcons.glyphMap;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <MaterialIcons name={icon} size={16} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value ?? "—"}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  label,
  icon,
  onPress,
  value,
  danger,
  last,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  value?: string;
  danger?: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  const tint = danger ? colors.destructive : colors.secondary;
  return (
    <Pressable
      style={[
        styles.menuRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? colors.destructiveLight : colors.muted },
        ]}
      >
        <MaterialIcons name={icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {!!value && (
          <Text style={[styles.menuValue, { color: colors.mutedForeground }]} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.border} />
    </Pressable>
  );
}

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "system", label: "System", icon: "settings-brightness" },
  { key: "light", label: "Light", icon: "light-mode" },
  { key: "dark", label: "Dark", icon: "dark-mode" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { preference, setPreference, resolved } = useTheme();
  const insets = useSafeAreaInsets();
  const { staff, isLoading, logout, apiUrl, setApiUrl } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  const handleLogout = async () => {
    safeHaptic();
    const confirmed = await confirmAsync("Logout", "Are you sure you want to logout?", "Logout");
    if (confirmed) await logout();
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
    if (!isValidHubUrl(trimmed)) {
      setUrlError("Enter a valid Hub URL (https://… or http://localhost:8080 for local).");
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
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const role = ROLE_LABELS[staff.role] ?? staff.role;
  const shift =
    staff.shiftStart && staff.shiftEnd ? `${staff.shiftStart} – ${staff.shiftEnd}` : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Modal
        visible={showUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Hub URL</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Connection address for your Coldverse hub
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                {
                  borderColor: urlError ? colors.destructive : colors.border,
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
                placeholder="http://localhost:8080"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            {!!urlError && <Text style={[styles.urlError, { color: colors.destructive }]}>{urlError}</Text>}
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowUrlModal(false)}
                disabled={urlSaving}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: urlSaving ? 0.7 : 1 }]}
                onPress={handleSaveUrl}
                disabled={urlSaving}
              >
                {urlSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.headerMeta}>{role}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100, paddingTop: 16 }}
      >
        <View style={styles.pad}>
          <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Text style={styles.avatarText}>{initials(staff.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {staff.name ?? "—"}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
                {staff.employeeId ?? "—"} · {staff.hub ?? "Hub"}
              </Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                  <View style={[styles.dot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>
                    {staff.status === "active" ? "Active" : staff.status}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.inTransitLight }]}>
                  <Text style={[styles.badgeText, { color: colors.secondary }]}>{role}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow label="Mobile" value={staff.phone} icon="phone" />
            <InfoRow label="Employee ID" value={staff.employeeId} icon="badge" />
            <InfoRow label="Hub" value={staff.hub} icon="warehouse" />
            <InfoRow label="Shift" value={shift} icon="schedule" />
            <InfoRow
              label="Joined"
              value={formatJoinDate(staff.joiningDate)}
              icon="calendar-today"
              last={staff.role !== "driver"}
            />
            {staff.role === "driver" && (
              <>
                <InfoRow label="License" value={staff.licenseNumber} icon="card-membership" />
                <InfoRow
                  label="License expiry"
                  value={formatJoinDate(staff.licenseExpiry)}
                  icon="event"
                  last
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.themeHint, { color: colors.mutedForeground }]}>
              Theme · {resolved === "dark" ? "Dark" : "Light"}
              {preference === "system" ? " (following system)" : ""}
            </Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = preference === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: active ? colors.secondary : colors.muted,
                        borderColor: active ? colors.secondary : colors.border,
                      },
                    ]}
                    onPress={() => void setPreference(opt.key)}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={16}
                      color={active ? "#FFFFFF" : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.themeChipText,
                        { color: active ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuRow label="Hub URL" icon="device-hub" value={apiUrl ?? "Not set"} onPress={openUrlModal} />
            <MenuRow
              label="Change password"
              icon="lock"
              onPress={() => showInfo("Change Password", "This feature will be available soon.")}
            />
            <MenuRow
              label="Help & support"
              icon="help-outline"
              onPress={() =>
                showInfo("Help & Support", "For any help, please contact your hub supervisor.")
              }
            />
            <MenuRow
              label="Terms & policy"
              icon="description"
              onPress={() =>
                showInfo(
                  "Terms & Policy",
                  "By using the Coldverse Staff App you agree to Coldverse Supply Chain's terms of service and privacy policy.",
                )
              }
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.logoutBtn, { backgroundColor: colors.destructiveLight }]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={18} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>Logout</Text>
          </Pressable>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>
            Coldverse Staff · v2.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerMeta: {
    color: "#8BAFC7",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  pad: { paddingHorizontal: 16 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  name: { fontSize: 18, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  themeHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  themeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  version: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  modalInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  urlError: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
