import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";

export type StaffRole = "driver" | "picker" | "sorter" | "loader" | "supervisor" | "security" | "house_keeper";

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
  login: (phone: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshStaff: (updated: Partial<StaffMember>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "@coldverse_session_v3";

export function getApiBase(): string {
  if (Platform.OS !== "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}`;
  }
  return "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { staff: StaffMember; token: string };
        // Guard against stale/malformed sessions from older builds: a session
        // missing core fields would wedge the app into a broken tab state.
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
      }
    } catch {
      await AsyncStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password: string): Promise<LoginResult> => {
    const base = getApiBase();
    // Web uses relative URLs (empty base) via the shared proxy; only a native
    // build with no EXPO_PUBLIC_DOMAIN is genuinely misconfigured.
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
        return { ok: false, errorType: isAuthFailure ? "invalid_credentials" : "network" };
      }
      const data = await resp.json() as { staff: StaffMember; token: string };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setStaff(data.staff);
      setToken(data.token);
      return { ok: true };
    } catch {
      return { ok: false, errorType: "network" };
    }
  };

  const logout = async () => {
    // Clear storage first, then auth state. Navigation is handled declaratively
    // by <Stack.Protected guard={isAuthenticated}> in app/_layout.tsx — issuing
    // an imperative router.replace here races that guard and can be dropped
    // (the /login route isn't mounted until isAuthenticated flips), which made
    // the logout button appear to do nothing on device.
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch {
      // Even if clearing storage fails, still drop the in-memory session so the
      // guard redirects to login; the stale entry is re-validated on next load.
    }
    setStaff(null);
    setToken(null);
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
        login,
        logout,
        refreshStaff,
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
