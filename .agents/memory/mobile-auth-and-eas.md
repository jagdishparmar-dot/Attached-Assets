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

## Alert.alert & expo-haptics are broken on react-native-web (the canvas web preview)
`Alert.alert` is a silent no-op on react-native-web and `expo-haptics` can throw — so any button whose action lives inside `Alert.alert` (e.g. a logout confirm) appears "not working" when tested in the web preview, even though it works on a real device.
- **How to apply:** use cross-platform helpers: web → `globalThis.confirm` / `globalThis.alert` (default-deny when unavailable), native → `Alert.alert` (wrap the confirm in a Promise, and resolve `false` in `onDismiss`). Guard haptics to native only + `.catch(()=>{})`.
- **Why:** the mobile app is exercised both on a device and in the web preview; button handlers must not depend on native-only APIs to give feedback.

## Stack.Protected owns redirects — no imperative router.replace on login/logout
With `<Stack.Protected guard={isAuthenticated}>`, do NOT also call `router.replace("/login")` in `logout()` or `router.replace` in a screen `useEffect` when the session clears.
- **Why:** at the moment you clear state, the target route is still guarded-out (not yet mounted), so the imperative REPLACE races the guard and can be dropped or throw a "not handled by any navigator" error — caught by the ErrorBoundary it makes the logout button look dead. The guard already redirects declaratively once `isAuthenticated` flips.
- **How to apply:** `logout()` should only clear AsyncStorage + set staff/token null. Remove competing redirect effects. Same principle applies to login (guard shows tabs on flip).

## Play Store upload key: service account JSON, NOT the app-signing SHA fingerprint
`google-play-service-account.json` / `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` must be the full service-account key file (`{ "type": "service_account", "private_key": ..., "client_email": ... }`).
- **Why:** users commonly paste the colon-separated SHA-1/SHA-256 fingerprint from Play Console's App-signing page instead — that is not valid JSON and is not used for uploads. Validate with `node -e "require('./google-play-service-account.json').type"` before submitting.
- **Manual fallback:** if no key, download the finished `.aab` from the EAS build page (`https://expo.dev/accounts/<acct>/projects/coldverse/builds/<id>`) and upload it to the Play internal track by hand.

## Validate persisted session on load
`checkSession()` should verify the stored session shape (`staff.id` number, `staff.role` present, non-empty string `token`) and `AsyncStorage.removeItem` on malformed/parse failure.
- **Why:** a stale session from an older build with a different shape can wedge the app into a broken tab state instead of falling back to login.
