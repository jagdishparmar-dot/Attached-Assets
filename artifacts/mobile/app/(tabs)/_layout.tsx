import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ isDriver }: { isDriver: boolean }) {
  return (
    <NativeTabs>
      {isDriver && (
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Dashboard</Label>
        </NativeTabs.Trigger>
      )}
      {isDriver && (
        <NativeTabs.Trigger name="deliveries">
          <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
          <Label>Deliveries</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="attendance">
        <Icon sf={{ default: "person.badge.clock", selected: "person.badge.clock.fill" }} />
        <Label>Attendance</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <Icon sf={{ default: "location", selected: "location.fill" }} />
        <Label>Track</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ isDriver }: { isDriver: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const tabIcon = (name: keyof typeof MaterialIcons.glyphMap, sfSymbol: string, color: string) => {
    if (isIOS) return <SymbolView name={sfSymbol as any} tintColor={color} size={24} />;
    return <MaterialIcons name={name} size={24} color={color} />;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          marginBottom: isIOS ? 0 : 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color }) => tabIcon("dashboard", "house", color),
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "Deliveries",
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color }) => tabIcon("local-shipping", "shippingbox", color),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) => tabIcon("person-pin-circle", "person.badge.clock", color),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track",
          tabBarIcon: ({ color }) => tabIcon("gps-fixed", "location", color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => tabIcon("person", "person", color),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { staff, isLoading } = useAuth();
  const pathname = usePathname();
  const isDriver = staff?.role === "driver";

  // Redirect non-drivers away from driver-only tabs
  useEffect(() => {
    if (isLoading || !staff || isDriver) return;
    const allowed = ["/attendance", "/track", "/profile"];
    if (!allowed.some((p) => pathname.endsWith(p))) {
      router.replace("/(tabs)/attendance");
    }
  }, [isDriver, isLoading, staff, pathname]);

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isDriver={isDriver} />;
  }
  return <ClassicTabLayout isDriver={isDriver} />;
}

const styles = StyleSheet.create({});
