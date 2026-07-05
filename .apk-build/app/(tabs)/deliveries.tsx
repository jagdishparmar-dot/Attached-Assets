import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCard } from "@/components/DeliveryCard";
import { useApp, DeliveryStatus } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { key: DeliveryStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_transit", label: "Transit" },
  { key: "pending", label: "Pending" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
];

export default function DeliveriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deliveries, refreshData } = useApp();
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
          d.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const order: DeliveryStatus[] = ["in_transit", "pending", "partial", "rescheduled", "failed", "delivered"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
  }, [deliveries, filter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 800);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Deliveries</Text>
        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, invoice, area..."
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const count = f.key === "all" ? deliveries.length : deliveries.filter((d) => d.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                filter === f.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterLabel,
                { color: filter === f.key ? "#FFFFFF" : colors.mutedForeground },
              ]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.filterCount,
                  { backgroundColor: filter === f.key ? "rgba(255,255,255,0.25)" : colors.muted },
                ]}>
                  <Text style={[
                    styles.filterCountText,
                    { color: filter === f.key ? "#fff" : colors.mutedForeground },
                  ]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DeliveryCard delivery={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No deliveries found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search ? "Try a different search" : "No deliveries in this category"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_400Regular" },
  filterRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  filterCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
