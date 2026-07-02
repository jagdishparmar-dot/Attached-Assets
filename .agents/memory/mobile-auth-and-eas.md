---
name: Mobile auth gating & API base (web vs native)
description: Non-obvious rules for Expo mobile login routing, web-vs-native API base, native-tab crash vectors, and session validation. For EAS build/submit + EXPO_PUBLIC_DOMAIN see eas-build-on-replit.md and mobile-backend-domain.md.
---

# Mobile auth gating + API base

## API base: empty string is valid on web
`getApiBase()` returns `""` on web (relative URLs go through the shared proxy) and `https://$EXPO_PUBLIC_DOMAIN` on native.
- **Rule:** treat an empty base as "misconfigured" ONLY on native (`Platform.OS !== "web" && !base`). An unconditional `if (!base) return misconfigured` silently blocks *all web login* before the API is even called — login fails with "App is not configured" on web and breaks e2e testing of the login flow.

## Auth routing: use Stack.Protected, not a Redirect child
Gate routes with `<Stack.Protected guard={isAuthenticated}>` (tabs) and `<Stack.Protected guard={!isAuthenticated}>` (login).
- **Why:** dropping `<Redirect href="/login" />` as a child of `<Stack>` alongside `<Stack.Screen>` is fragile on native release builds — it can fail to show the login page on cold start ("login page not appearing").
- **How to apply:** available in expo-router v6. Keep `RootLayoutNav` returning `null` while `isLoading`.

## Native tabs / liquid glass = Android crash vector under New Architecture
`expo-router/unstable-native-tabs` (`NativeTabs`) + `expo-glass-effect` `isLiquidGlassAvailable()` should drive the tab layout only on iOS.
- **How to apply:** `if (Platform.OS === "ios") { try { useNativeTabs = isLiquidGlassAvailable() } catch {} }`; Android always uses the classic JS `Tabs`. `newArchEnabled: true` raises native-instability risk from these iOS-oriented modules.

## Validate persisted session on load
`checkSession()` should verify the stored session shape (`staff.id` number, `staff.role` present, non-empty string `token`) and `AsyncStorage.removeItem` on malformed/parse failure.
- **Why:** a stale session from an older build with a different shape can wedge the app into a broken tab state instead of falling back to login.
