import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
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
        setStaff(parsed.staff);
        setToken(parsed.token);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password: string): Promise<LoginResult> => {
    const base = getApiBase();
    if (!base) {
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
    await AsyncStorage.removeItem(SESSION_KEY);
    setStaff(null);
    setToken(null);
    router.replace("/login");
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
