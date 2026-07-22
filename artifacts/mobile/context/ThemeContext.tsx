import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, Platform, useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedScheme;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const THEME_KEY = "@coldverse_theme_v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyNativeColorScheme(preference: ThemePreference) {
  // Expo web / older RN builds may not implement setColorScheme.
  const setColorScheme = (
    Appearance as { setColorScheme?: (scheme: "light" | "dark" | null) => void }
  ).setColorScheme;
  if (typeof setColorScheme !== "function") return;
  try {
    setColorScheme(preference === "system" ? null : preference);
  } catch {
    // ignore unsupported platforms
  }
}

function applyWebColorScheme(resolved: ResolvedScheme, preference: ThemePreference) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.colorScheme = preference === "system" ? "light dark" : resolved;
  root.dataset.theme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (
          !cancelled &&
          (stored === "light" || stored === "dark" || stored === "system")
        ) {
          setPreferenceState(stored);
        }
      } catch {
        // keep default
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: ResolvedScheme = useMemo(() => {
    if (preference === "light") return "light";
    if (preference === "dark") return "dark";
    return systemScheme === "dark" ? "dark" : "light";
  }, [preference, systemScheme]);

  useEffect(() => {
    if (!hydrated) return;
    applyNativeColorScheme(preference);
    applyWebColorScheme(resolved, preference);
  }, [preference, resolved, hydrated]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      isDark: resolved === "dark",
      setPreference,
    }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
