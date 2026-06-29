import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Driver {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  license: string;
  licenseExpiry: string;
  photo: string | null;
  vehicle: string;
  vehicleType: string;
  hub: string;
  joiningDate: string;
  status: "active" | "inactive";
}

interface AuthContextType {
  driver: Driver | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_DRIVER: Driver = {
  id: "DRV001",
  name: "Rajesh Kumar",
  employeeId: "CV-DRV-001",
  phone: "+91 98765 43210",
  license: "GJ01 20190012345",
  licenseExpiry: "2027-08-15",
  photo: null,
  vehicle: "GJ-01-AK-2345",
  vehicleType: "Refrigerated Truck",
  hub: "Ahmedabad Cold Hub",
  joiningDate: "2021-03-10",
  status: "active",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await AsyncStorage.getItem("@coldverse_session");
      if (session) {
        const parsed = JSON.parse(session);
        setDriver(parsed.driver);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (employeeId: string, password: string): Promise<boolean> => {
    if (employeeId === "CV-DRV-001" && password === "cold@123") {
      await AsyncStorage.setItem(
        "@coldverse_session",
        JSON.stringify({ driver: MOCK_DRIVER, token: "mock-jwt-token" })
      );
      setDriver(MOCK_DRIVER);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("@coldverse_session");
    setDriver(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        driver,
        isLoading,
        isAuthenticated: !!driver,
        login,
        logout,
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
