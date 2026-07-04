import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useGetAdminSession,
  useAdminLogin,
  useAdminLogout,
  getGetAdminSessionQueryKey,
} from "@workspace/api-client-react";
import type { AdminUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<"ok" | "invalid" | "forbidden" | "error">;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: admin, isLoading, isError } = useGetAdminSession({
    query: {
      queryKey: getGetAdminSessionQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const loginMutation = useAdminLogin();
  const logoutMutation = useAdminLogout();

  const [sessionAdmin, setSessionAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (admin) setSessionAdmin(admin);
    else if (isError) setSessionAdmin(null);
  }, [admin, isError]);

  const login = async (phone: string, password: string) => {
    try {
      const result = await loginMutation.mutateAsync({ data: { phone, password } });
      setSessionAdmin(result.admin);
      queryClient.setQueryData(getGetAdminSessionQueryKey(), result.admin);
      return "ok" as const;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) return "invalid";
      if (status === 403) return "forbidden";
      return "error";
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setSessionAdmin(null);
      queryClient.removeQueries({ queryKey: getGetAdminSessionQueryKey() });
    }
  };

  const isAuthenticated = !!sessionAdmin && !isError;

  return (
    <AuthContext.Provider
      value={{
        admin: sessionAdmin,
        isLoading: isLoading && !isError && sessionAdmin === null,
        isAuthenticated,
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export { initials };
