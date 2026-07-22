import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_META: Record<
  DeliveryStatus,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; chipBg: string; chipFg: string }
> = {
  pending: { label: "Pending", icon: "schedule", chipBg: "rgba(245,166,35,0.18)", chipFg: "#F5A623" },
  in_transit: { label: "In transit", icon: "local-shipping", chipBg: "rgba(34,197,94,0.18)", chipFg: "#22C55E" },
  delivered: { label: "Delivered", icon: "check-circle", chipBg: "rgba(34,197,94,0.18)", chipFg: "#22C55E" },
  failed: { label: "Failed", icon: "cancel", chipBg: "rgba(248,113,113,0.18)", chipFg: "#F87171" },
  rescheduled: { label: "Rescheduled", icon: "event", chipBg: "rgba(196,181,253,0.2)", chipFg: "#C4B5FD" },
  partial: { label: "Partial", icon: "timelapse", chipBg: "rgba(245,166,35,0.18)", chipFg: "#F5A623" },
};

type TabKey = "info" | "pod" | "status";

function openPhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return;
  void Linking.openURL(`tel:${cleaned}`);
}

function openWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;
  const intl = digits.startsWith("91") || digits.length > 10 ? digits : `91${digits}`;
  void Linking.openURL(`https://wa.me/${intl}`);
}

function openMaps(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  void Linking.openURL(url);
}

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deliveries, updateDeliveryStatus, addPodPhoto } = useApp();

  const delivery = deliveries.find((d) => d.id === id);

  const [remarks, setRemarks] = useState(delivery?.remarks ?? "");
  const [failReason, setFailReason] = useState(delivery?.failureReason ?? "");
  const [loading, setLoading] = useState<DeliveryStatus | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const statusMeta = delivery ? STATUS_META[delivery.status] : null;
  const canUpdate = delivery
    ? delivery.status !== "delivered" && delivery.status !== "failed"
    : false;

  const tabs = useMemo(
    () =>
      [
        { key: "info" as const, label: "Details" },
        {
          key: "pod" as const,
          label: delivery ? `POD · ${delivery.podPhotos.length}` : "POD",
        },
        { key: "status" as const, label: "Update" },
      ] as const,
    [delivery],
  );

  if (!delivery || !statusMeta) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.border} />
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Delivery not found</Text>
        <Pressable style={[styles.backLink, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
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
    if (status === "failed" && !failReason.trim()) {
      Alert.alert("Reason required", "Please enter why this delivery failed.");
      return;
    }
    setLoading(status);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await updateDeliveryStatus(delivery.id, status, {
      remarks,
      failureReason: status === "failed" ? failReason.trim() : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(null);
    Alert.alert(
      status === "delivered" ? "Delivered" : status === "in_transit" ? "On the way" : "Status updated",
      status === "delivered"
        ? "Great job — this stop is complete."
        : status === "in_transit"
          ? "Delivery marked in transit."
          : `Status set to ${STATUS_META[status].label.toLowerCase()}.`,
      [
        {
          text: "OK",
          onPress: () => {
            if (status === "delivered" || status === "failed") router.back();
          },
        },
      ],
    );
  };

  const priorityColor =
    delivery.priority === "high" ? "#F87171" : delivery.priority === "low" ? "#8BAFC7" : "#5B8DEF";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 10 }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Stop #{delivery.sequence || "—"}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {delivery.deliveryNumber}
            </Text>
          </View>
          <View style={styles.seqBadge}>
            <Text style={styles.seqText}>#{delivery.sequence || "—"}</Text>
          </View>
        </View>

        <Text style={styles.customerHero} numberOfLines={2}>
          {delivery.customerName}
        </Text>
        <Text style={styles.headerMeta} numberOfLines={1}>
          {delivery.area}
          {delivery.city ? ` · ${delivery.city}` : ""}
          {delivery.deliveryWindow ? ` · ${delivery.deliveryWindow}` : ""}
        </Text>

        <View style={styles.chipRow}>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.chipBg }]}>
            <MaterialIcons name={statusMeta.icon} size={14} color={statusMeta.chipFg} />
            <Text style={[styles.statusChipText, { color: statusMeta.chipFg }]}>{statusMeta.label}</Text>
          </View>
          <View style={[styles.priorityChip, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {delivery.priority.toUpperCase()}
            </Text>
          </View>
          {delivery.etaMinutes > 0 && delivery.status === "in_transit" && (
            <View style={styles.etaChip}>
              <MaterialIcons name="timer" size={13} color="#8BAFC7" />
              <Text style={styles.etaChipText}>{delivery.etaMinutes}m ETA</Text>
            </View>
          )}
        </View>

        <View style={styles.statStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{delivery.products.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{delivery.totalWeight || "—"}</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{delivery.podPhotos.length}</Text>
            <Text style={styles.statLabel}>POD</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: colors.secondary }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.secondary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
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
              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Customer</Text>
                <Text style={[styles.bigName, { color: colors.foreground }]}>{delivery.customerName}</Text>
                {(delivery.customerCode || delivery.orderNumber) && (
                  <Text style={[styles.metaLine, { color: colors.mutedForeground }]}>
                    {[delivery.customerCode && `Code ${delivery.customerCode}`, delivery.orderNumber && `Order ${delivery.orderNumber}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}

                {!!delivery.customerPhone && (
                  <View style={styles.contactRow}>
                    <Pressable
                      style={[styles.contactBtn, { backgroundColor: colors.successLight }]}
                      onPress={() => openPhone(delivery.customerPhone)}
                    >
                      <MaterialIcons name="phone" size={18} color={colors.success} />
                      <Text style={[styles.contactBtnText, { color: colors.success }]}>Call</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.contactBtn, { backgroundColor: "#DCFCE7" }]}
                      onPress={() => openWhatsApp(delivery.customerPhone)}
                    >
                      <MaterialIcons name="chat" size={18} color="#16A34A" />
                      <Text style={[styles.contactBtnText, { color: "#16A34A" }]}>WhatsApp</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Address</Text>
                <Text style={[styles.addressText, { color: colors.foreground }]}>
                  {delivery.address}
                </Text>
                <Text style={[styles.metaLine, { color: colors.mutedForeground }]}>
                  {delivery.area}
                  {delivery.city ? `, ${delivery.city}` : ""}
                </Text>

                <View style={styles.metaChips}>
                  <View style={[styles.infoChip, { backgroundColor: colors.muted }]}>
                    <MaterialIcons name="access-time" size={14} color={colors.secondary} />
                    <Text style={[styles.infoChipText, { color: colors.foreground }]}>
                      {delivery.deliveryWindow || "No window"}
                    </Text>
                  </View>
                  {delivery.invoiceNumber ? (
                    <View style={[styles.infoChip, { backgroundColor: colors.muted }]}>
                      <MaterialIcons name="receipt-long" size={14} color={colors.secondary} />
                      <Text style={[styles.infoChipText, { color: colors.foreground }]}>
                        {delivery.invoiceNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {delivery.lat != null && delivery.lng != null && (
                  <Pressable
                    style={[styles.mapBtn, { backgroundColor: colors.inTransitLight }]}
                    onPress={() =>
                      openMaps(
                        delivery.lat,
                        delivery.lng,
                        `${delivery.customerName}, ${delivery.address}`,
                      )
                    }
                  >
                    <MaterialIcons name="map" size={18} color={colors.secondary} />
                    <Text style={[styles.mapBtnText, { color: colors.secondary }]}>Open in maps</Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.panelHead}>
                  <Text style={[styles.panelTitle, { color: colors.foreground, marginBottom: 0 }]}>
                    Products
                  </Text>
                  <Text style={[styles.panelCount, { color: colors.mutedForeground }]}>
                    {delivery.products.length} · {delivery.totalWeight || "—"}
                  </Text>
                </View>
                {delivery.products.map((p, i) => (
                  <View
                    key={`${p.name}-${i}`}
                    style={[
                      styles.productRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                  >
                    <View style={[styles.productIcon, { backgroundColor: colors.muted }]}>
                      <MaterialIcons name="ac-unit" size={16} color={colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.productSub, { color: colors.mutedForeground }]}>
                        Qty {p.quantity}
                        {p.weight ? ` · ${p.weight}` : ""}
                        {p.temp ? ` · ${p.temp}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {!!delivery.specialHandling && (
                <View style={[styles.specialCard, { backgroundColor: colors.warningLight }]}>
                  <View style={styles.specialHead}>
                    <MaterialIcons name="warning-amber" size={18} color="#D97706" />
                    <Text style={styles.specialTitle}>Special handling</Text>
                  </View>
                  <Text style={styles.specialBody}>{delivery.specialHandling}</Text>
                </View>
              )}

              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Remarks</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.muted,
                    },
                  ]}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Add delivery notes for the hub…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}

          {activeTab === "pod" && (
            <>
              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>Proof of delivery</Text>
                <Text style={[styles.podSub, { color: colors.mutedForeground }]}>
                  Capture invoice, package, or customer receipt photos before closing the stop.
                </Text>
                <View style={styles.podBtns}>
                  <Pressable
                    style={[styles.podBtn, { backgroundColor: colors.primary }]}
                    onPress={capturePhoto}
                  >
                    <MaterialIcons name="camera-alt" size={20} color="#fff" />
                    <Text style={styles.podBtnText}>Camera</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.podBtn, { backgroundColor: colors.secondary }]}
                    onPress={pickImage}
                  >
                    <MaterialIcons name="photo-library" size={20} color="#fff" />
                    <Text style={styles.podBtnText}>Gallery</Text>
                  </Pressable>
                </View>
              </View>

              {delivery.podPhotos.length > 0 ? (
                <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                    Uploaded · {delivery.podPhotos.length}
                  </Text>
                  <View style={styles.photoGrid}>
                    {delivery.podPhotos.map((uri, i) => (
                      <Image key={`${uri}-${i}`} source={{ uri }} style={styles.podPhoto} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyPod, { borderColor: colors.border }]}>
                  <MaterialIcons name="photo-camera" size={36} color={colors.border} />
                  <Text style={[styles.emptyPodText, { color: colors.mutedForeground }]}>
                    No photos yet
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === "status" && (
            <>
              {canUpdate ? (
                <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>Update status</Text>
                  <Text style={[styles.podSub, { color: colors.mutedForeground }]}>
                    Remarks on the Details tab are saved with this update.
                  </Text>

                  {delivery.status === "pending" && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.inTransitLight }]}
                      onPress={() => markStatus("in_transit")}
                      disabled={!!loading}
                    >
                      {loading === "in_transit" ? (
                        <ActivityIndicator color={colors.secondary} />
                      ) : (
                        <>
                          <MaterialIcons name="local-shipping" size={20} color={colors.secondary} />
                          <Text style={[styles.actionBtnText, { color: colors.secondary }]}>
                            Start / In transit
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.successLight }]}
                    onPress={() => markStatus("delivered")}
                    disabled={!!loading}
                  >
                    {loading === "delivered" ? (
                      <ActivityIndicator color={colors.success} />
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={20} color={colors.success} />
                        <Text style={[styles.actionBtnText, { color: colors.success }]}>
                          Mark delivered
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <TextInput
                    style={[
                      styles.input,
                      styles.failInput,
                      {
                        color: colors.foreground,
                        borderColor: colors.border,
                        backgroundColor: colors.muted,
                      },
                    ]}
                    value={failReason}
                    onChangeText={setFailReason}
                    placeholder="Failure reason (required if failed)"
                    placeholderTextColor={colors.mutedForeground}
                  />

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: colors.destructiveLight }]}
                    onPress={() => markStatus("failed")}
                    disabled={!!loading}
                  >
                    {loading === "failed" ? (
                      <ActivityIndicator color={colors.destructive} />
                    ) : (
                      <>
                        <MaterialIcons name="cancel" size={20} color={colors.destructive} />
                        <Text style={[styles.actionBtnText, { color: colors.destructive }]}>
                          Mark failed
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.doneBlock}>
                    <View
                      style={[
                        styles.doneIcon,
                        {
                          backgroundColor:
                            delivery.status === "delivered"
                              ? colors.successLight
                              : colors.destructiveLight,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={delivery.status === "delivered" ? "check-circle" : "cancel"}
                        size={32}
                        color={delivery.status === "delivered" ? colors.success : colors.destructive}
                      />
                    </View>
                    <Text style={[styles.doneTitle, { color: colors.foreground }]}>
                      {delivery.status === "delivered" ? "Delivery completed" : "Delivery failed"}
                    </Text>
                    {delivery.completedAt && (
                      <Text style={[styles.doneMeta, { color: colors.mutedForeground }]}>
                        {new Date(delivery.completedAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                    {!!delivery.failureReason && (
                      <Text style={[styles.doneReason, { color: colors.mutedForeground }]}>
                        {delivery.failureReason}
                      </Text>
                    )}
                    {!!delivery.remarks && (
                      <Text style={[styles.doneReason, { color: colors.mutedForeground }]}>
                        Notes: {delivery.remarks}
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
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  notFound: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  backLink: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: "#8BAFC7",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 1,
  },
  seqBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  seqText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  customerHero: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  headerMeta: {
    color: "#8BAFC7",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  priorityText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  etaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  etaChipText: { color: "#8BAFC7", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  statVal: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: "#8BAFC7",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#0A1628",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  panelTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  panelCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bigName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  metaLine: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10 },
  contactRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  contactBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  addressText: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4, lineHeight: 21 },
  metaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  infoChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mapBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  productIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  productSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  specialCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  specialHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  specialTitle: { color: "#D97706", fontSize: 14, fontFamily: "Inter_700Bold" },
  specialBody: { color: "#92400E", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 84,
    textAlignVertical: "top",
  },
  failInput: { minHeight: 48, marginBottom: 8, marginTop: 4 },
  podSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14, lineHeight: 18 },
  podBtns: { flexDirection: "row", gap: 10 },
  podBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  podBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  podPhoto: { width: "48%", aspectRatio: 1, borderRadius: 12 },
  emptyPod: {
    alignItems: "center",
    paddingVertical: 40,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    gap: 8,
  },
  emptyPodText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  doneBlock: { alignItems: "center", paddingVertical: 18, gap: 8 },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  doneTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  doneMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  doneReason: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 8,
    lineHeight: 18,
  },
});
