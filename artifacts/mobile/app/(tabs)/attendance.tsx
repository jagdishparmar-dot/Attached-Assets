import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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

import { AttendanceRecord, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<AttendanceRecord["status"], { color: string; bg: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  present: { color: "#16A34A", bg: "#DCFCE7", label: "Present", icon: "check-circle" },
  absent: { color: "#DC2626", bg: "#FEE2E2", label: "Absent", icon: "cancel" },
  late: { color: "#D97706", bg: "#FEF3C7", label: "Late", icon: "schedule" },
  half_day: { color: "#7C3AED", bg: "#EDE9FE", label: "Half Day", icon: "remove-circle" },
};

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todayAttendance, attendance, checkIn, checkOut } = useApp();
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleCheckIn = async () => {
    if (todayAttendance?.checkIn) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await checkIn();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    Alert.alert("Checked In", "Your attendance has been recorded successfully.", [{ text: "OK" }]);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance?.checkIn || todayAttendance.checkOut) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await checkOut();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    Alert.alert("Checked Out", "Have a safe journey home!", [{ text: "OK" }]);
  };

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const isCheckedIn = !!todayAttendance?.checkIn;
  const isCheckedOut = !!todayAttendance?.checkOut;

  const recentHistory = attendance.slice(1, 8);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

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
                      {todayAttendance?.checkIn ?? "--:--"}
                    </Text>
                  </View>
                  <View style={[styles.checkDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.checkTimeBox}>
                    <MaterialIcons name="logout" size={18} color={isCheckedOut ? "#16A34A" : colors.border} />
                    <Text style={[styles.checkTimeLabel, { color: colors.mutedForeground }]}>Check Out</Text>
                    <Text style={[styles.checkTimeVal, { color: isCheckedOut ? colors.foreground : colors.border }]}>
                      {todayAttendance?.checkOut ?? "--:--"}
                    </Text>
                  </View>
                  <View style={[styles.checkDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.checkTimeBox}>
                    <MaterialIcons name="timer" size={18} color={todayAttendance?.workingHours ? "#2E6BE6" : colors.border} />
                    <Text style={[styles.checkTimeLabel, { color: colors.mutedForeground }]}>Hours</Text>
                    <Text style={[styles.checkTimeVal, { color: colors.foreground }]}>
                      {todayAttendance?.workingHours ?? "--"}
                    </Text>
                  </View>
                </View>

                {todayAttendance?.checkInLocation && (
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={14} color={colors.secondary} />
                    <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                      {todayAttendance.checkInLocation}
                    </Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.attendBtn,
                      { backgroundColor: isCheckedIn ? colors.muted : "#16A34A" },
                    ]}
                    onPress={handleCheckIn}
                    disabled={isCheckedIn || loading}
                    activeOpacity={0.8}
                  >
                    {loading && !isCheckedIn ? (
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
                    style={[
                      styles.attendBtn,
                      { backgroundColor: (!isCheckedIn || isCheckedOut) ? colors.muted : "#DC2626" },
                    ]}
                    onPress={handleCheckOut}
                    disabled={!isCheckedIn || isCheckedOut || loading}
                    activeOpacity={0.8}
                  >
                    {loading && isCheckedIn && !isCheckedOut ? (
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
          const cfg = STATUS_CONFIG[item.status];
          return (
            <View style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.historyDot, { backgroundColor: cfg.bg }]}>
                <MaterialIcons name={cfg.icon} size={16} color={cfg.color} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDate, { color: colors.foreground }]}>{formatDate(item.date)}</Text>
                <Text style={[styles.historyLocation, { color: colors.mutedForeground }]}>
                  {item.checkInLocation ?? "No location recorded"}
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
  checkTimeVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  locationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  btnRow: { flexDirection: "row", gap: 10 },
  attendBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  historyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 16, marginBottom: 12 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  historyDot: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyLocation: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyRight: { alignItems: "flex-end", gap: 4 },
  historyStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  historyStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  historyHours: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
