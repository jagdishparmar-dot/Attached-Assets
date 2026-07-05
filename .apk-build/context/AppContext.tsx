import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getApiBase, useAuth } from "@/context/AuthContext";

export type DeliveryStatus = "pending" | "in_transit" | "delivered" | "failed" | "rescheduled" | "partial";
export type DeliveryPriority = "high" | "normal" | "low";

export interface ProductItem {
  name: string;
  quantity: number;
  weight: string;
  temp: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  orderNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerCode: string;
  customerPhone: string;
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  deliveryWindow: string;
  priority: DeliveryPriority;
  status: DeliveryStatus;
  sequence: number;
  products: ProductItem[];
  totalWeight: string;
  specialHandling: string;
  otp: string;
  remarks: string;
  etaMinutes: number;
  podPhotos: string[];
  completedAt: string | null;
  failureReason: string | null;
}

export interface AttendanceRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  status: "present" | "absent" | "late" | "half_day";
  workingHours: string | null;
}

interface RawProduct {
  name: string;
  quantity: number;
  weight?: string | null;
  temperature?: string | null;
}

interface RawDelivery {
  id: number;
  deliveryNumber: string;
  orderNumber: string;
  invoiceNumber: string | null;
  status: string;
  priority: string;
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string;
  deliveryArea: string | null;
  deliveryCity: string;
  deliveryWindow: string;
  totalWeight: string;
  specialHandling: string | null;
  remarks: string | null;
  products: RawProduct[];
  assignedDriverId: number | null;
  failureReason: string | null;
  completedAt: string | null;
}

interface RawAttendance {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
}

interface AppContextType {
  deliveries: Delivery[];
  todayAttendance: AttendanceRecord | null;
  isGpsActive: boolean;
  currentSpeed: number;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, data?: Partial<Delivery>) => Promise<void>;
  addPodPhoto: (id: string, uri: string) => Promise<void>;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const TODAY = new Date().toISOString().split("T")[0];

function mapStatus(s: string): DeliveryStatus {
  switch (s) {
    case "in_transit":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "rescheduled":
      return "rescheduled";
    case "partial":
      return "partial";
    default:
      // "pending" and "assigned" both surface as pending/to-do for the driver
      return "pending";
  }
}

function mapPriority(p: string): DeliveryPriority {
  return p === "high" || p === "low" ? p : "normal";
}

function mapDelivery(d: RawDelivery): Delivery {
  return {
    id: String(d.id),
    deliveryNumber: d.deliveryNumber,
    orderNumber: d.orderNumber,
    invoiceNumber: d.invoiceNumber ?? "",
    customerName: d.customerName,
    customerCode: "",
    customerPhone: d.customerPhone ?? "",
    address: d.deliveryAddress,
    area: d.deliveryArea ?? "",
    city: d.deliveryCity,
    lat: 0,
    lng: 0,
    deliveryWindow: d.deliveryWindow,
    priority: mapPriority(d.priority),
    status: mapStatus(d.status),
    sequence: 0,
    products: (d.products ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      weight: p.weight ?? "",
      temp: p.temperature ?? "",
    })),
    totalWeight: d.totalWeight,
    specialHandling: d.specialHandling ?? "",
    otp: "",
    remarks: d.remarks ?? "",
    etaMinutes: 0,
    podPhotos: [],
    completedAt: d.completedAt,
    failureReason: d.failureReason,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { staff, token } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const loadDeliveries = useCallback(async () => {
    const base = getApiBase();
    const driverId = staff?.driverId;
    if (!driverId) {
      setDeliveries([]);
      return;
    }
    try {
      const resp = await fetch(`${base}/api/deliveries?assignedDriverId=${driverId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return;
      const data = (await resp.json()) as RawDelivery[];
      setDeliveries(data.map(mapDelivery));
      setIsGpsActive(true);
    } catch {
      // keep last known deliveries on transient failure
    }
  }, [staff?.driverId, token]);

  const loadAttendance = useCallback(async () => {
    const base = getApiBase();
    if (!staff?.id) {
      setTodayAttendance(null);
      return;
    }
    try {
      const resp = await fetch(`${base}/api/attendance/my?staffId=${staff.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return;
      const rows = (await resp.json()) as RawAttendance[];
      const today = rows.find((r) => r.date === TODAY);
      setTodayAttendance(
        today
          ? {
              date: today.date,
              checkIn: today.checkIn ?? null,
              checkOut: today.checkOut ?? null,
              checkInLocation: null,
              status: today.checkIn ? "present" : "absent",
              workingHours: null,
            }
          : null,
      );
    } catch {
      // ignore
    }
  }, [staff?.id, token]);

  useEffect(() => {
    loadDeliveries();
    loadAttendance();
  }, [loadDeliveries, loadAttendance]);

  useEffect(() => {
    const speedInterval = setInterval(() => {
      setCurrentSpeed(Math.floor(Math.random() * 45) + 15);
    }, 3000);
    return () => clearInterval(speedInterval);
  }, []);

  const refreshData = useCallback(() => {
    loadDeliveries();
    loadAttendance();
  }, [loadDeliveries, loadAttendance]);

  const updateDeliveryStatus = async (id: string, status: DeliveryStatus, data?: Partial<Delivery>) => {
    const base = getApiBase();
    const body: Record<string, unknown> = { status };
    if (data?.remarks !== undefined) body.remarks = data.remarks;
    if (data?.failureReason !== undefined) body.failureReason = data.failureReason;
    try {
      const resp = await fetch(`${base}/api/deliveries/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const updated = (await resp.json()) as RawDelivery;
        setDeliveries((prev) => prev.map((d) => (d.id === id ? mapDelivery(updated) : d)));
      }
    } catch {
      // ignore; UI will reconcile on next refresh
    }
  };

  const addPodPhoto = async (id: string, uri: string) => {
    // POD photos are kept in-memory only for the current session (not persisted server-side).
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, podPhotos: [...d.podPhotos, uri] } : d)),
    );
  };

  return (
    <AppContext.Provider
      value={{
        deliveries,
        todayAttendance,
        isGpsActive,
        currentSpeed,
        updateDeliveryStatus,
        addPodPhoto,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
