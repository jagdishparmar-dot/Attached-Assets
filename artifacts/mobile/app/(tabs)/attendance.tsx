import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBase, useAuth } from "@/context/AuthContext";
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

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { color: string; bg: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  present: { color: "#16A34A", bg: "#DCFCE7", label: "Present", icon: "check-circle" },
  absent: { color: "#DC2626", bg: "#FEE2E2", label: "Absent", icon: "cancel" },
  late: { color: "#D97706", bg: "#FEF3C7", label: "Late", icon: "schedule" },
  half_day: { color: "#7C3AED", bg: "#EDE9FE", label: "Half Day", icon: "timelapse" },
};

function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatClock(d: Date) {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

type DayPhase = "need_in" | "on_site" | "done";

function dayPhase(today: AttendanceEntry | null): DayPhase {
  if (!today?.checkIn) return "need_in";
  if (!today.checkOut) return "on_site";
  return "done";
}

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { staff, token, refreshStaff } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"in" | "out" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [today, setToday] = useState<AttendanceEntry | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "ok" | "denied">("idle");
  const [now, setNow] = useState(() => new Date());
  const pulse = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;
  const phase = dayPhase(today);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase !== "on_site") {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [phase, pulse]);

  const loadHistory = async (opts?: { soft?: boolean }) => {
    if (!staff?.id) return;
    if (!opts?.soft) setInitialLoading(true);
    try {
      const base = getApiBase();
      const d = new Date();
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const resp = await fetch(`${base}/api/attendance/my?staffId=${staff.id}&month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) return;
      const data = (await resp.json()) as AttendanceEntry[];
      const todayStr = localDateStr();
      setHistory(data.sort((a, b) => b.date.localeCompare(a.date)));
      const t = data.find((row) => row.date === todayStr) ?? null;
      setToday(t);
      if (t?.checkIn) {
        refreshStaff({
          isCheckedInToday: !t.checkOut,
          checkInTime: t.checkIn,
          checkInLat: t.checkInLat,
          checkInLng: t.checkInLng,
        });
      }
    } catch {
      /* silent */
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!staff?.id) return;
    void loadHistory();
  }, [staff?.id, token]);

  const monthStats = useMemo(() => {
    const counts = { present: 0, late: 0, absent: 0, half_day: 0 };
    for (const row of history) {
      if (row.status in counts) counts[row.status as keyof typeof counts] += 1;
    }
    return counts;
  }, [history]);

  const recentHistory = useMemo(() => {
    const todayStr = localDateStr();
    return history.filter((h) => h.date !== todayStr).slice(0, 14);
  }, [history]);

  const getLocation = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    setGpsStatus("fetching");
    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsStatus("ok");
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          () => {
            setGpsStatus("denied");
            resolve(null);
          },
          { timeout: 10000, enableHighAccuracy: true },
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
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
      };
    } catch {
      setGpsStatus("denied");
      Alert.alert(
        "GPS Error",
        "Could not get your location. Please turn on GPS/Location in your phone settings and try again.",
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
    if (!loc) {
      setLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const base = getApiBase();
      const resp = await fetch(`${base}/api/attendance/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          staffId: staff.id,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        Alert.alert("Check In Failed", err.error ?? "Please try again.");
      } else {
        const entry = (await resp.json()) as AttendanceEntry;
        setToday(entry);
        setHistory((prev) => [entry, ...prev.filter((h) => h.date !== entry.date)]);
        refreshStaff({
          isCheckedInToday: true,
          checkInTime: entry.checkIn,
          checkInLat: entry.checkInLat,
          checkInLng: entry.checkInLng,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const fenceMsg = entry.withinGeofence
          ? "✓ Within hub geofence"
          : `⚠ ${entry.geofenceDistance}m from hub`;
        Alert.alert(
          "Checked In",
          `Attendance recorded at ${entry.checkIn ? formatTime(entry.checkIn) : "—"}\n${fenceMsg}`,
        );
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
      setGpsStatus("idle");
    }
  };

  const handleCheckOut = async () => {
    if (!staff || !today?.checkIn || today?.checkOut) return;
    setLoadingAction("out");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const loc = await getLocation();
    if (!loc) {
      setLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const base = getApiBase();
      const resp = await fetch(`${base}/api/attendance/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          staffId: staff.id,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        Alert.alert("Check Out Failed", err.error ?? "Please try again.");
      } else {
        const entry = (await resp.json()) as AttendanceEntry;
        setToday(entry);
        setHistory((prev) => [entry, ...prev.filter((h) => h.date !== entry.date)]);
        refreshStaff({ isCheckedInToday: false });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Checked Out",
          `Working hours: ${entry.workingHours ?? "—"}\nHave a safe journey home!`,
        );
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
      setGpsStatus("idle");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory({ soft: true });
    setRefreshing(false);
  };

  const phaseMeta = {
    need_in: {
      label: "Not checked in",
      hint: "Mark your presence when you reach the hub",
      chipBg: "rgba(245,166,35,0.18)",
      chipFg: "#F5A623",
      icon: "schedule" as const,
    },
    on_site: {
      label: "On site",
      hint: "You’re checked in — remember to check out later",
      chipBg: "rgba(34,197,94,0.18)",
      chipFg: "#22C55E",
      icon: "verified" as const,
    },
    done: {
      label: "Day complete",
      hint: "Attendance for today is complete",
      chipBg: "rgba(139,175,199,0.2)",
      chipFg: "#8BAFC7",
      icon: "done-all" as const,
    },
  }[phase];

  const dateHeading = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Attendance</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {phaseMeta.label} · {dateHeading}
            </Text>
          </View>
          <Text style={styles.clock}>{formatClock(now)}</Text>
        </View>
      </View>

      <FlatList
        data={recentHistory}
        keyExtractor={(item) => item.date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 108, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.panelPad}>
              <View style={[styles.monthStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.monthStat}>
                  <Text style={[styles.monthVal, { color: colors.foreground }]}>
                    {monthStats.present + monthStats.late}
                  </Text>
                  <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>Present</Text>
                </View>
                <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
                <View style={styles.monthStat}>
                  <Text style={[styles.monthVal, { color: "#D97706" }]}>{monthStats.late}</Text>
                  <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>Late</Text>
                </View>
                <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
                <View style={styles.monthStat}>
                  <Text style={[styles.monthVal, { color: colors.destructive }]}>{monthStats.absent}</Text>
                  <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>Absent</Text>
                </View>
                <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
                <View style={styles.monthStat}>
                  <Text style={[styles.monthVal, { color: "#7C3AED" }]}>{monthStats.half_day}</Text>
                  <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>Half</Text>
                </View>
              </View>

              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.todayHead}>
                  <Text style={[styles.panelTitle, { color: colors.foreground, marginBottom: 0 }]}>Today</Text>
                  <View style={[styles.statusChip, { backgroundColor: phaseMeta.chipBg }]}>
                    <Animated.View style={{ transform: [{ scale: phase === "on_site" ? pulse : 1 }] }}>
                      <MaterialIcons name={phaseMeta.icon} size={14} color={phaseMeta.chipFg} />
                    </Animated.View>
                    <Text style={[styles.statusChipText, { color: phaseMeta.chipFg }]}>
                      {phaseMeta.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>{phaseMeta.hint}</Text>

                <View style={styles.timeline}>
                  <View style={styles.timelineCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: today?.checkIn ? colors.successLight : colors.muted,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="login"
                        size={16}
                        color={today?.checkIn ? colors.success : colors.mutedForeground}
                      />
                    </View>
                    <Text style={[styles.timelineLabel, { color: colors.mutedForeground }]}>In</Text>
                    <Text
                      style={[
                        styles.timelineVal,
                        { color: today?.checkIn ? colors.foreground : colors.border },
                      ]}
                    >
                      {today?.checkIn ? formatTime(today.checkIn) : "--:--"}
                    </Text>
                  </View>

                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />

                  <View style={styles.timelineCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: today?.checkOut ? colors.destructiveLight : colors.muted,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="logout"
                        size={16}
                        color={today?.checkOut ? colors.destructive : colors.mutedForeground}
                      />
                    </View>
                    <Text style={[styles.timelineLabel, { color: colors.mutedForeground }]}>Out</Text>
                    <Text
                      style={[
                        styles.timelineVal,
                        { color: today?.checkOut ? colors.foreground : colors.border },
                      ]}
                    >
                      {today?.checkOut ? formatTime(today.checkOut) : "--:--"}
                    </Text>
                  </View>

                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />

                  <View style={styles.timelineCol}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.inTransitLight }]}>
                      <MaterialIcons name="timer" size={16} color={colors.inTransit} />
                    </View>
                    <Text style={[styles.timelineLabel, { color: colors.mutedForeground }]}>Hours</Text>
                    <Text style={[styles.timelineVal, { color: colors.foreground }]}>
                      {today?.workingHours ?? (phase === "on_site" ? "…" : "--")}
                    </Text>
                  </View>
                </View>

                {today?.checkIn && today.checkInLat != null && (
                  <View
                    style={[
                      styles.infoBanner,
                      {
                        backgroundColor: today.withinGeofence
                          ? colors.successLight
                          : colors.warningLight,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={today.withinGeofence ? "verified" : "warning"}
                      size={15}
                      color={today.withinGeofence ? colors.success : "#D97706"}
                    />
                    <Text
                      style={[
                        styles.infoBannerText,
                        { color: today.withinGeofence ? colors.success : "#D97706" },
                      ]}
                    >
                      {today.withinGeofence
                        ? `Within hub geofence · ${today.geofenceDistance ?? 0}m`
                        : `Outside geofence · ${today.geofenceDistance ?? "?"}m from hub`}
                    </Text>
                  </View>
                )}

                {gpsStatus === "fetching" && (
                  <View style={styles.gpsRow}>
                    <ActivityIndicator size="small" color={colors.secondary} />
                    <Text style={[styles.gpsText, { color: colors.mutedForeground }]}>
                      Getting GPS location…
                    </Text>
                  </View>
                )}
                {gpsStatus === "denied" && (
                  <View style={styles.gpsRow}>
                    <MaterialIcons name="location-off" size={15} color={colors.destructive} />
                    <Text style={[styles.gpsText, { color: colors.destructive }]}>
                      Location unavailable — enable GPS and try again
                    </Text>
                  </View>
                )}

                {phase === "need_in" && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.success }]}
                    onPress={handleCheckIn}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loadingAction === "in" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="login" size={20} color="#fff" />
                        <Text style={styles.primaryBtnText}>Check In</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {phase === "on_site" && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.destructive }]}
                    onPress={handleCheckOut}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loadingAction === "out" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="logout" size={20} color="#fff" />
                        <Text style={styles.primaryBtnText}>Check Out</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {phase === "done" && (
                  <View style={[styles.doneBanner, { backgroundColor: colors.muted }]}>
                    <MaterialIcons name="celebration" size={18} color={colors.secondary} />
                    <Text style={[styles.doneText, { color: colors.foreground }]}>
                      Shift closed · {today?.workingHours ?? "—"} logged
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This month</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                {recentHistory.length} earlier day{recentHistory.length === 1 ? "" : "s"}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.absent;
          const timeLine = [
            item.checkIn ? formatTime(item.checkIn) : null,
            item.checkOut ? formatTime(item.checkOut) : null,
          ]
            .filter(Boolean)
            .join(" → ");
          return (
            <View style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.historyIcon, { backgroundColor: cfg.bg }]}>
                <MaterialIcons name={cfg.icon} size={18} color={cfg.color} />
              </View>
              <View style={styles.historyBody}>
                <Text style={[styles.historyDate, { color: colors.foreground }]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                  {timeLine || "No punches recorded"}
                  {item.withinGeofence === false ? " · outside fence" : ""}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={[styles.historyHours, { color: colors.mutedForeground }]}>
                  {item.workingHours ?? "—"}
                </Text>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          initialLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.secondary} />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No earlier attendance records this month
            </Text>
          )
        }
      />
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
    gap: 12,
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
  clock: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statusHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginBottom: 12,
  },
  todayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  monthStrip: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  monthStat: { flex: 1, alignItems: "center" },
  monthDivider: { width: 1 },
  monthVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  monthLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  panelPad: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#0A1628",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  panelTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  timelineCol: { flex: 1, alignItems: "center", gap: 4 },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { width: 18, height: 1, marginBottom: 28 },
  timelineLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  timelineVal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  gpsText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  doneText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionHead: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBody: { flex: 1 },
  historyDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyRight: { alignItems: "flex-end", gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  historyHours: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
  },
  emptyWrap: { padding: 28, alignItems: "center" },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 24,
  },
});
