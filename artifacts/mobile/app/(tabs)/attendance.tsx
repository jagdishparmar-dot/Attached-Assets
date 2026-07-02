import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth, getApiBase } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

interface AttendanceEntry {
  id: number;
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  withinGeofence: boolean | null;
  geofenceDistance: number | null;
  workingHours: string | null;
}

const STATUS_CONFIG: Record<AttendanceStatus, { color: string; bg: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  present:  { color: "#16A34A", bg: "#DCFCE7", label: "Present",  icon: "check-circle" },
  absent:   { color: "#DC2626", bg: "#FEE2E2", label: "Absent",   icon: "cancel" },
  late:     { color: "#D97706", bg: "#FEF3C7", label: "Late",     icon: "schedule" },
  half_day: { color: "#7C3AED", bg: "#EDE9FE", label: "Half Day", icon: "remove-circle" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff, token, refreshStaff } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"in" | "out" | null>(null);
  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [today, setToday] = useState<AttendanceEntry | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "ok" | "denied">("idle");
  const clockRef = useRef<ReturnType<typeof setInterval>>(null);
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    clockRef.current = setInterval(() => {
      const now = new Date();
      setTimeStr(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
    }, 30_000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  useEffect(() => {
    if (staff) fetchHistory();
  }, [staff]);

  const fetchHistory = async () => {
    if (!staff) return;
    try {
      const base = getApiBase();
      const month = new Date().toISOString().slice(0, 7);
      const resp = await fetch(`${base}/api/attendance/my?staffId=${staff.id}&month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) return;
      const data = await resp.json() as AttendanceEntry[];
      const todayStr = new Date().toISOString().split("T")[0];
      setHistory(data.sort((a, b) => b.date.localeCompare(a.date)));
      const t = data.find((d) => d.date === todayStr) ?? null;
      setToday(t);
      if (t?.checkIn) refreshStaff({ isCheckedInToday: true, checkInTime: t.checkIn, checkInLat: t.checkInLat, checkInLng: t.checkInLng });
    } catch { /* silent */ }
  };

  const getLocation = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    setGpsStatus("fetching");
    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { setGpsStatus("ok"); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
          () => { setGpsStatus("denied"); resolve(null); },
          { timeout: 10000, enableHighAccuracy: true }
        );
      });
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGpsStatus("denied");
      Alert.alert("Location Required", "Please enable location permissions to check in/out.");
      return null;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsStatus("ok");
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 };
    } catch {
      setGpsStatus("denied");
      Alert.alert(
        "GPS Error",
        "Could not get your location. Please turn on GPS/Location in your phone settings and try again."
      );
      return null;
    }
  };

  const handleCheckIn = async () => {
    if (!staff || today?.checkIn) return;
    setLoadingAction("in");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const loc = await getLocation();
    if (!loc) { setLoading(false); setLoadingAction(null); return; }

    try {
      const base = getApiBase();
      const resp = await fetch(`${base}/api/attendance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ staffId: staff.id, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        Alert.alert("Check In Failed", err.error ?? "Please try again.");
      } else {
        const entry = await resp.json() as AttendanceEntry;
        setToday(entry);
        setHistory((prev) => [entry, ...prev.filter((h) => h.date !== entry.date)]);
        refreshStaff({ isCheckedInToday: true, checkInTime: entry.checkIn, checkInLat: entry.checkInLat, checkInLng: entry.checkInLng });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const fenceMsg = entry.withinGeofence ? "✓ Within hub geofence" : `⚠ ${entry.geofenceDistance}m from hub`;
        Alert.alert("Checked In", `Attendance recorded at ${entry.checkIn ? formatTime(entry.checkIn) : "—"}\n${fenceMsg}`);
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (!staff || !today?.checkIn || today?.checkOut) return;
    setLoadingAction("out");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const loc = await getLocation();
    if (!loc) { setLoading(false); setLoadingAction(null); return; }

    try {
      const base = getApiBase();
      const resp = await fetch(`${base}/api/attendance/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ staffId: staff.id, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        Alert.alert("Check Out Failed", err.error ?? "Please try again.");
      } else {
        const entry = await resp.json() as AttendanceEntry;
        setToday(entry);
        setHistory((prev) => [entry, ...prev.filter((h) => h.date !== entry.date)]);
        refreshStaff({ isCheckedInToday: false });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Checked Out", `Working hours: ${entry.workingHours ?? "—"}\nHave a safe journey home!`);
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const isCheckedIn = !!today?.checkIn;
  const isCheckedOut = !!today?.checkOut;
  const recentHistory = history.filter((h) => h.date !== new Date().toISOString().split("T")[0]).slice(0, 7);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Track your daily presence</Text>
      </View>

      <FlatList
        data={recentHistory}
        keyExtractor={(item) => item.date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        ListHeaderComponent={
          <>
            <View style={styles.todayCard}>
              <View style={[styles.todayInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.todayRow}>
                  <View>
                    <Text style={[styles.todayLabel, { color: colors.mutedForeground }]}>Today</Text>
                    <Text style={[styles.todayDate, { color: colors.foreground }]}>
                      {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </Text>
                  </View>
                  <View style={styles.clockBox}>
                    <Text style={[styles.clockTime, { color: colors.primary }]}>{timeStr}</Text>
                    <Text style={[styles.clockLabel, { color: colors.mutedForeground }]}>Current time</Text>
                  </View>
                </View>

                <View style={[styles.checkTimesRow, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <View style={styles.checkTimeBox}>
                    <MaterialIcons name="login" size={18} color={isCheckedIn ? "#16A34A" : colors.border} />
                    <Text style={[styles.checkTimeLabel, { color: colors.mutedForeground }]}>Check In</Text>
                    <Text style={[styles.checkTimeVal, { color: isCheckedIn ? colors.foreground : colors.border }]}>
                      {today?.checkIn ? formatTime(today.checkIn) : "--:--"}
                    </Text>
                  </View>
                  <View style={[styles.checkDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.checkTimeBox}>
                    <MaterialIcons name="logout" size={18} color={isCheckedOut ? "#16A34A" : colors.border} />
                    <Text style={[styles.checkTimeLabel, { color: colors.mutedForeground }]}>Check Out</Text>
                    <Text style={[styles.checkTimeVal, { color: isCheckedOut ? colors.foreground : colors.border }]}>
                      {today?.checkOut ? formatTime(today.checkOut) : "--:--"}
                    </Text>
                  </View>
                  <View style={[styles.checkDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.checkTimeBox}>
                    <MaterialIcons name="timer" size={18} color={today?.workingHours ? "#2E6BE6" : colors.border} />
                    <Text style={[styles.checkTimeLabel, { color: colors.mutedForeground }]}>Hours</Text>
                    <Text style={[styles.checkTimeVal, { color: colors.foreground }]}>
                      {today?.workingHours ?? "--"}
                    </Text>
                  </View>
                </View>

                {/* Geofence status */}
                {isCheckedIn && today?.checkInLat != null && (
                  <View style={styles.geoRow}>
                    <MaterialIcons
                      name={today.withinGeofence ? "verified" : "warning"}
                      size={14}
                      color={today.withinGeofence ? "#16A34A" : "#D97706"}
                    />
                    <Text style={[styles.geoText, { color: today.withinGeofence ? "#16A34A" : "#D97706" }]}>
                      {today.withinGeofence
                        ? `Within hub geofence (${today.geofenceDistance ?? 0}m)`
                        : `Outside geofence — ${today.geofenceDistance ?? "?"}m from hub`}
                    </Text>
                  </View>
                )}

                {/* GPS status */}
                {gpsStatus === "fetching" && (
                  <View style={styles.geoRow}>
                    <ActivityIndicator size="small" color={colors.secondary} />
                    <Text style={[styles.geoText, { color: colors.mutedForeground }]}>Getting GPS location…</Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.attendBtn, { backgroundColor: isCheckedIn ? colors.muted : "#16A34A" }]}
                    onPress={handleCheckIn}
                    disabled={isCheckedIn || loading}
                    activeOpacity={0.8}
                  >
                    {loadingAction === "in" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="login" size={20} color={isCheckedIn ? colors.border : "#fff"} />
                        <Text style={[styles.btnText, { color: isCheckedIn ? colors.border : "#fff" }]}>
                          {isCheckedIn ? "Checked In" : "Check In"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.attendBtn, { backgroundColor: (!isCheckedIn || isCheckedOut) ? colors.muted : "#DC2626" }]}
                    onPress={handleCheckOut}
                    disabled={!isCheckedIn || isCheckedOut || loading}
                    activeOpacity={0.8}
                  >
                    {loadingAction === "out" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="logout" size={20} color={(!isCheckedIn || isCheckedOut) ? colors.border : "#fff"} />
                        <Text style={[styles.btnText, { color: (!isCheckedIn || isCheckedOut) ? colors.border : "#fff" }]}>
                          {isCheckedOut ? "Checked Out" : "Check Out"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Recent History</Text>
          </>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.absent;
          return (
            <View style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.historyDot, { backgroundColor: cfg.bg }]}>
                <MaterialIcons name={cfg.icon} size={16} color={cfg.color} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDate, { color: colors.foreground }]}>{formatDate(item.date)}</Text>
                <Text style={[styles.historyLocation, { color: colors.mutedForeground }]}>
                  {item.checkInLat != null
                    ? `${item.checkInLat.toFixed(4)}, ${item.checkInLng?.toFixed(4)}`
                    : "No location recorded"}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <View style={[styles.historyStatus, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.historyStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {item.workingHours && (
                  <Text style={[styles.historyHours, { color: colors.mutedForeground }]}>{item.workingHours}</Text>
                )}
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No attendance records this month</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#8BAFC7", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  todayCard: { padding: 16 },
  todayInner: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  todayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  todayLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  todayDate: { fontSize: 16, fontFamily: "Inter_700Bold" },
  clockBox: { alignItems: "flex-end" },
  clockTime: { fontSize: 28, fontFamily: "Inter_700Bold" },
  clockLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  checkTimesRow: { flexDirection: "row", padding: 14, marginBottom: 12 },
  checkTimeBox: { flex: 1, alignItems: "center", gap: 4 },
  checkDivider: { width: 1 },
  checkTimeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  checkTimeVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  geoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  geoText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  attendBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  historyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 16, marginBottom: 12 },
  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, padding: 14,
    borderRadius: 14, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  historyDot: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyLocation: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyRight: { alignItems: "flex-end", gap: 4 },
  historyStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  historyStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  historyHours: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular", padding: 24 },
});
