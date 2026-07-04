import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isApiConfigured } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Step 1 — show setup screen on first launch until a server URL is saved */}
      <Stack.Protected guard={!isApiConfigured}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      {/* Step 2 — authenticated: show tabs + delivery detail */}
      <Stack.Protected guard={isApiConfigured && isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="delivery/[id]"
          options={{ presentation: "card", headerShown: false }}
        />
      </Stack.Protected>
      {/* Step 3 — configured but not yet logged in */}
      <Stack.Protected guard={isApiConfigured && !isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <AppProvider>
                  <RootLayoutNav />
                </AppProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
