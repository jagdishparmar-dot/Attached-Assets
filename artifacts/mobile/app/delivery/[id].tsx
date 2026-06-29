import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { DeliveryStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deliveries, updateDeliveryStatus, addPodPhoto } = useApp();

  const delivery = deliveries.find((d) => d.id === id);

  const [remarks, setRemarks] = useState(delivery?.remarks ?? "");
  const [failReason, setFailReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "pod" | "status">("info");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!delivery) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.border} />
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Delivery not found</Text>
      </View>
    );
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await addPodPhoto(delivery.id, result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera Permission", "Please allow camera access to take POD photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await addPodPhoto(delivery.id, result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const markStatus = async (status: DeliveryStatus) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await updateDeliveryStatus(delivery.id, status, {
      remarks,
      failureReason: status === "failed" ? failReason : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    Alert.alert(
      status === "delivered" ? "Delivered!" : "Status Updated",
      status === "delivered" ? "Great job! Delivery marked as complete." : `Delivery status updated to ${status}.`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const priorityColor = delivery.priority === "high" ? "#DC2626" : delivery.priority === "normal" ? "#2E6BE6" : "#6B7A8D";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{delivery.deliveryNumber}</Text>
          <StatusBadge status={delivery.status} />
        </View>
        <View style={[styles.seqBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.seqText}>#{delivery.sequence || "—"}</Text>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["info", "pod", "status"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab === "info" ? "Details" : tab === "pod" ? `POD (${delivery.podPhotos.length})` : "Status"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "info" && (
            <>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
                <Text style={[styles.bigName, { color: colors.foreground }]}>{delivery.customerName}</Text>
                <View style={styles.infoRow}>
                  <MaterialIcons name="badge" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{delivery.customerCode}</Text>
                  <View style={[styles.priorityChip, { backgroundColor: delivery.priority === "high" ? "#FEE2E2" : colors.muted }]}>
                    <Text style={[styles.priorityText, { color: priorityColor }]}>{delivery.priority.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.muted }]}>
                  <MaterialIcons name="phone" size={18} color="#16A34A" />
                  <Text style={[styles.callText, { color: "#16A34A" }]}>{delivery.customerPhone}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Delivery Address</Text>
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={14} color={colors.secondary} />
                  <Text style={[styles.infoText, { color: colors.foreground }]}>{delivery.address}, {delivery.area}, {delivery.city}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="access-time" size={14} color={colors.secondary} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Window: {delivery.deliveryWindow}</Text>
                </View>
                {delivery.etaMinutes > 0 && (
                  <View style={[styles.etaBanner, { backgroundColor: "#DBEAFE" }]}>
                    <MaterialIcons name="timer" size={14} color="#2E6BE6" />
                    <Text style={styles.etaBannerText}>ETA: {delivery.etaMinutes} minutes</Text>
                  </View>
                )}
              </View>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Products ({delivery.products.length})</Text>
                {delivery.products.map((p, i) => (
                  <View key={i} style={[styles.productRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.productIcon, { backgroundColor: colors.muted }]}>
                      <MaterialIcons name="inventory" size={16} color={colors.secondary} />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.productSub, { color: colors.mutedForeground }]}>
                        Qty: {p.quantity} · {p.weight} · {p.temp}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={[styles.totalRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Weight</Text>
                  <Text style={[styles.totalVal, { color: colors.foreground }]}>{delivery.totalWeight}</Text>
                </View>
              </View>

              {delivery.specialHandling && (
                <View style={[styles.card, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="warning" size={16} color="#D97706" />
                    <Text style={[styles.cardTitle, { color: "#D97706", marginBottom: 0 }]}>Special Handling</Text>
                  </View>
                  <Text style={[styles.infoText, { color: "#92400E", marginTop: 6 }]}>{delivery.specialHandling}</Text>
                </View>
              )}

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Remarks</Text>
                <TextInput
                  style={[styles.remarksInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Add delivery remarks..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}

          {activeTab === "pod" && (
            <>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Proof of Delivery</Text>
                <Text style={[styles.podSub, { color: colors.mutedForeground }]}>
                  Upload photos, invoices, or receipt scans as proof of delivery.
                </Text>
                <View style={styles.podBtns}>
                  <TouchableOpacity style={[styles.podBtn, { backgroundColor: colors.primary }]} onPress={capturePhoto} activeOpacity={0.8}>
                    <MaterialIcons name="camera-alt" size={22} color="#fff" />
                    <Text style={styles.podBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.podBtn, { backgroundColor: colors.secondary }]} onPress={pickImage} activeOpacity={0.8}>
                    <MaterialIcons name="photo-library" size={22} color="#fff" />
                    <Text style={styles.podBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {delivery.podPhotos.length > 0 ? (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Uploaded ({delivery.podPhotos.length})</Text>
                  <View style={styles.photoGrid}>
                    {delivery.podPhotos.map((uri, i) => (
                      <Image key={i} source={{ uri }} style={styles.podPhoto} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyPod, { borderColor: colors.border }]}>
                  <MaterialIcons name="photo-camera" size={40} color={colors.border} />
                  <Text style={[styles.emptyPodText, { color: colors.mutedForeground }]}>No photos uploaded yet</Text>
                </View>
              )}
            </>
          )}

          {activeTab === "status" && (
            <>
              {delivery.status !== "delivered" && delivery.status !== "failed" ? (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Update Status</Text>

                  <TouchableOpacity
                    style={[styles.statusBtn, { backgroundColor: "#DCFCE7" }]}
                    onPress={() => markStatus("delivered")}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? <ActivityIndicator color="#16A34A" /> : (
                      <>
                        <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                        <Text style={[styles.statusBtnText, { color: "#16A34A" }]}>Mark as Delivered</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusBtn, { backgroundColor: "#FEF3C7" }]}
                    onPress={() => markStatus("partial")}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="remove-circle" size={20} color="#D97706" />
                    <Text style={[styles.statusBtnText, { color: "#D97706" }]}>Partial Delivery</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.remarksInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, marginBottom: 8 }]}
                    value={failReason}
                    onChangeText={setFailReason}
                    placeholder="Reason for failure (if applicable)"
                    placeholderTextColor={colors.mutedForeground}
                  />

                  <TouchableOpacity
                    style={[styles.statusBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => markStatus("failed")}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="cancel" size={20} color="#DC2626" />
                    <Text style={[styles.statusBtnText, { color: "#DC2626" }]}>Mark as Failed</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
                    <MaterialIcons
                      name={delivery.status === "delivered" ? "check-circle" : "cancel"}
                      size={48}
                      color={delivery.status === "delivered" ? "#16A34A" : "#DC2626"}
                    />
                    <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 0 }]}>
                      {delivery.status === "delivered" ? "Delivery Completed" : "Delivery Failed"}
                    </Text>
                    {delivery.completedAt && (
                      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                        {new Date(delivery.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                    {delivery.failureReason && (
                      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                        {delivery.failureReason}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  notFound: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  seqBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  seqText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10, color: "#6B7A8D" },
  bigName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  priorityChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, marginTop: 4 },
  callText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  etaBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, marginTop: 6 },
  etaBannerText: { color: "#2E6BE6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  productRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1 },
  productIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  productSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, marginTop: 10 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  totalVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  remarksInput: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  podSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
  podBtns: { flexDirection: "row", gap: 10 },
  podBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  podBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  podPhoto: { width: "48%", aspectRatio: 1, borderRadius: 10 },
  emptyPod: { alignItems: "center", paddingVertical: 40, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, gap: 8 },
  emptyPodText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  statusBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, marginBottom: 8 },
  statusBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
