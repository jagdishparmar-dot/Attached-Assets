import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type MaterialTabButtonProps = {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

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

/** Material-style press target with Android ripple. */
function MaterialTabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
}: MaterialTabButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{
        color: "rgba(46, 107, 230, 0.16)",
        borderless: true,
        radius: 36,
      }}
      style={({ pressed }) => [
        styles.tabButton,
        typeof style === "function" ? style({ pressed }) : style,
        pressed && Platform.OS !== "android" && { opacity: 0.75 },
      ]}
    >
      {children}
    </Pressable>
  );
}

function ClassicTabLayout({ isDriver }: { isDriver: boolean }) {
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const bottomInset = isWeb ? 20 : Math.max(insets.bottom, 10);

  const activeColor = colors.secondary;
  const inactiveColor = colors.mutedForeground;
  const activeIndicator = isDark ? "rgba(91, 141, 239, 0.24)" : "rgba(46, 107, 230, 0.14)";
  const surface = colors.card;

  const renderIcon = (
    name: keyof typeof MaterialIcons.glyphMap,
    nameFocused: keyof typeof MaterialIcons.glyphMap,
    sfSymbol: string,
    sfFilled: string,
    color: string,
    focused: boolean,
  ) => {
    const icon =
      isIOS ? (
        <SymbolView
          name={(focused ? sfFilled : sfSymbol) as any}
          tintColor={color}
          size={22}
        />
      ) : (
        <MaterialIcons
          name={focused ? nameFocused : name}
          size={22}
          color={color}
        />
      );

    return (
      <View
        style={[
          styles.indicator,
          focused && { backgroundColor: activeIndicator },
        ]}
      >
        {icon}
      </View>
    );
  };

  const renderLabel = (label: string, color: string, focused: boolean) => (
    <Text
      numberOfLines={1}
      style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}
    >
      {label}
    </Text>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => (
          <MaterialTabButton
            children={props.children}
            onPress={props.onPress ?? undefined}
            onLongPress={props.onLongPress ?? undefined}
            accessibilityState={props.accessibilityState}
            accessibilityLabel={props.accessibilityLabel}
            testID={props.testID}
            style={props.style}
          />
        ),
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.tabIcon,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 56 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          ...Platform.select({
            ios: {
              shadowColor: "#0A1628",
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: isDark ? 0.4 : 0.1,
              shadowRadius: 10,
            },
            android: {
              elevation: 10,
            },
            default: {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            },
          }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: surface,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(10,22,40,0.06)",
                  ...Platform.select({
                    android: {
                      elevation: 10,
                    },
                    default: {},
                  }),
                },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          href: isDriver ? undefined : null,
          tabBarLabel: ({ color, focused }) => renderLabel("Dashboard", color, focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon("dashboard", "space-dashboard", "house", "house.fill", color, focused),
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: "Deliveries",
          href: isDriver ? undefined : null,
          tabBarLabel: ({ color, focused }) => renderLabel("Deliveries", color, focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon(
              "local-shipping",
              "local-shipping",
              "shippingbox",
              "shippingbox.fill",
              color,
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: "Route",
          href: null,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarLabel: ({ color, focused }) => renderLabel("Attendance", color, focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon(
              "event-available",
              "event-available",
              "person.badge.clock",
              "person.badge.clock.fill",
              color,
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Track",
          tabBarLabel: ({ color, focused }) => renderLabel("Track", color, focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon("my-location", "gps-fixed", "location", "location.fill", color, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: ({ color, focused }) => renderLabel("Profile", color, focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon("person-outline", "person", "person", "person.fill", color, focused),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { staff, isLoading } = useAuth();
  const pathname = usePathname();
  const isDriver = staff?.role === "driver";

  useEffect(() => {
    if (isLoading || !staff || isDriver) return;
    const allowed = ["/attendance", "/track", "/profile"];
    if (!allowed.some((p) => pathname.endsWith(p))) {
      router.replace("/(tabs)/attendance");
    }
  }, [isDriver, isLoading, staff?.id, staff?.role, pathname]);

  let useNativeTabs = false;
  if (Platform.OS === "ios") {
    try {
      useNativeTabs = isLiquidGlassAvailable();
    } catch {
      useNativeTabs = false;
    }
  }
  if (useNativeTabs) {
    return <NativeTabLayout isDriver={isDriver} />;
  }
  return <ClassicTabLayout isDriver={isDriver} />;
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabIcon: {
    marginTop: 0,
  },
  indicator: {
    minWidth: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    letterSpacing: 0.15,
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontFamily: "Inter_600SemiBold",
  },
});
