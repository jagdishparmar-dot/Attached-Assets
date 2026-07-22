import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/DeliveryCard";
import { DeliveryStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { key: DeliveryStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_transit", label: "Transit" },
  { key: "pending", label: "Pending" },
  { key: "delivered", label: "Done" },
  { key: "failed", label: "Failed" },
];

export default function DeliveriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deliveries, refreshData } = useApp();
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: deliveries.length };
    for (const d of deliveries) map[d.status] = (map[d.status] ?? 0) + 1;
    return map;
  }, [deliveries]);

  const filtered = useMemo(() => {
    let result = deliveries;
    if (filter !== "all") result = result.filter((d) => d.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.customerName.toLowerCase().includes(q) ||
          d.deliveryNumber.toLowerCase().includes(q) ||
          d.area.toLowerCase().includes(q) ||
          d.invoiceNumber.toLowerCase().includes(q),
      );
    }
    const order: DeliveryStatus[] = [
      "in_transit",
      "pending",
      "partial",
      "rescheduled",
      "failed",
      "delivered",
    ];
    return [...result].sort((a, b) => {
      const byStatus = order.indexOf(a.status) - order.indexOf(b.status);
      if (byStatus !== 0) return byStatus;
      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [deliveries, filter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 800);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Deliveries</Text>
            <Text style={styles.subtitle}>{deliveries.length} assigned today</Text>
          </View>
          <Pressable
            style={styles.routeBtn}
            onPress={() => router.push("/(tabs)/route")}
            accessibilityLabel="Open route plan"
          >
            <MaterialIcons name="alt-route" size={16} color="#fff" />
            <Text style={styles.routeBtnText}>Route</Text>
          </Pressable>
        </View>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.65)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, DC, area…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.65)" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key] ?? 0;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.secondary : colors.muted,
                  },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? "#FFFFFF" : colors.mutedForeground },
                  ]}
                >
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    {
                      backgroundColor: active ? "rgba(255,255,255,0.22)" : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: active ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DeliveryCard delivery={item} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: botPad + 100,
          flexGrow: filtered.length === 0 ? 1 : undefined,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <MaterialIcons name="inbox" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No deliveries</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search ? "Try a different search" : "Nothing in this filter right now"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
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
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  routeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filterBar: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
  },
  filterLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  filterCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
  },
  filterCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 72,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
