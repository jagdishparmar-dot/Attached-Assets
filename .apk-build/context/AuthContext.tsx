import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export type StaffRole =
  | "driver"
  | "picker"
  | "sorter"
  | "loader"
  | "supervisor"
  | "security"
  | "house_keeper";

export interface StaffMember {
  id: number;
  driverId: number | null;
  name: string;
  employeeId: string;
  role: StaffRole;
  phone: string;
  hub: string;
  status: "active" | "inactive";
  licenseNumber: string | null;
  licenseExpiry: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  joiningDate: string;
  isCheckedInToday: boolean;
  checkInTime: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; errorType: "misconfigured" | "network" | "invalid_credentials" };

interface AuthContextType {
  staff: StaffMember | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  apiUrl: string | null;
  isApiConfigured: boolean;
  login: (phone: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshStaff: (updated: Partial<StaffMember>) => void;
  setApiUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "@coldverse_session_v3";
const API_URL_KEY = "@coldverse_api_url";

// Module-level cache so getApiBase() stays synchronous for call-sites outside
// React (e.g. fetch helpers). Set during AuthProvider init and on every setApiUrl.
let _apiUrlCache: string | null = null;

export function getApiBase(): string {
  if (Platform.OS !== "web") {
    if (_apiUrlCache) return _apiUrlCache;
    // Fallback: env var baked at build time (backward-compat for builds that
    // ship with EXPO_PUBLIC_DOMAIN; the setup screen will persist it properly
    // on first launch).
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}`;
    return "";
  }
  // Web preview uses relative URLs through the shared proxy.
  return "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrlState] = useState<string | null>(null);

  // Web always has relative URLs available — no setup needed.
  const isApiConfigured = Platform.OS === "web" || !!apiUrl;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const [storedUrl, raw] = await Promise.all([
        AsyncStorage.getItem(API_URL_KEY),
        AsyncStorage.getItem(SESSION_KEY),
      ]);

      if (storedUrl) {
        _apiUrlCache = storedUrl;
        setApiUrlState(storedUrl);
      }

      // Only restore the session if the API URL is already configured; otherwise
      // the session tokens would be useless (no server to talk to) and the user
      // must go through setup → login.
      if (storedUrl && raw) {
        try {
          const parsed = JSON.parse(raw) as { staff: StaffMember; token: string };
          if (
            parsed?.staff &&
            typeof parsed.staff.id === "number" &&
            parsed.staff.role &&
            typeof parsed.token === "string" &&
            parsed.token.length > 0
          ) {
            setStaff(parsed.staff);
            setToken(parsed.token);
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        } catch {
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      // AsyncStorage unavailable — proceed unauthenticated and unconfigured.
    } finally {
      setIsLoading(false);
    }
  };

  const setApiUrl = async (url: string) => {
    const clean = url.trim().replace(/\/+$/, ""); // strip trailing slashes
    await AsyncStorage.setItem(API_URL_KEY, clean);
    _apiUrlCache = clean;
    // If the URL changed (not initial setup), clear the cached session so stale
    // auth tokens from the old backend are not sent to the new one.
    if (apiUrl && apiUrl !== clean) {
      try {
        await AsyncStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore storage errors
      }
      setStaff(null);
      setToken(null);
    }
    setApiUrlState(clean);
  };

  const login = async (phone: string, password: string): Promise<LoginResult> => {
    const base = getApiBase();
    if (Platform.OS !== "web" && !base) {
      return { ok: false, errorType: "misconfigured" };
    }
    try {
      const resp = await fetch(`${base}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      if (!resp.ok) {
        const isAuthFailure = resp.status === 401 || resp.status === 403;
        return {
          ok: false,
          errorType: isAuthFailure ? "invalid_credentials" : "network",
        };
      }
      const data = (await resp.json()) as { staff: StaffMember; token: string };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setStaff(data.staff);
      setToken(data.token);
      return { ok: true };
    } catch {
      return { ok: false, errorType: "network" };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore storage errors on logout
    }
    setStaff(null);
    setToken(null);
    // Declarative Stack.Protected guard in _layout.tsx handles the redirect to login.
  };

  const refreshStaff = (updated: Partial<StaffMember>) => {
    if (!staff) return;
    const next = { ...staff, ...updated };
    setStaff(next);
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ staff: next, token }));
  };

  return (
    <AuthContext.Provider
      value={{
        staff,
        token,
        isLoading,
        isAuthenticated: !!staff,
        apiUrl,
        isApiConfigured,
        login,
        logout,
        refreshStaff,
        setApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
