import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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

interface AppContextType {
  deliveries: Delivery[];
  attendance: AttendanceRecord[];
  todayAttendance: AttendanceRecord | null;
  isGpsActive: boolean;
  currentSpeed: number;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, data?: Partial<Delivery>) => Promise<void>;
  addPodPhoto: (id: string, uri: string) => Promise<void>;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const TODAY = new Date().toISOString().split("T")[0];

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "d001",
    deliveryNumber: "DLV-2024-001",
    orderNumber: "ORD-7821",
    invoiceNumber: "INV-2024-0021",
    customerName: "FreshMart Superstore",
    customerCode: "CUST-001",
    customerPhone: "+91 98001 12345",
    address: "Plot 42, GIDC Industrial Estate",
    area: "Naroda",
    city: "Ahmedabad",
    lat: 23.0735,
    lng: 72.6420,
    deliveryWindow: "09:00 - 11:00",
    priority: "high",
    status: "in_transit",
    sequence: 1,
    products: [
      { name: "Frozen Peas 1kg", quantity: 50, weight: "50kg", temp: "-18°C" },
      { name: "Ice Cream Tubs", quantity: 24, weight: "36kg", temp: "-20°C" },
    ],
    totalWeight: "86kg",
    specialHandling: "Keep frozen. Handle with care.",
    otp: "4821",
    remarks: "",
    etaMinutes: 12,
    podPhotos: [],
    completedAt: null,
    failureReason: null,
  },
  {
    id: "d002",
    deliveryNumber: "DLV-2024-002",
    orderNumber: "ORD-7822",
    invoiceNumber: "INV-2024-0022",
    customerName: "City Cold Storage",
    customerCode: "CUST-002",
    customerPhone: "+91 98002 23456",
    address: "15 Ring Road, Opp. Reliance Mall",
    area: "Bopal",
    city: "Ahmedabad",
    lat: 23.0395,
    lng: 72.4737,
    deliveryWindow: "11:00 - 13:00",
    priority: "normal",
    status: "pending",
    sequence: 2,
    products: [
      { name: "Chilled Dairy Packs", quantity: 100, weight: "120kg", temp: "2-4°C" },
      { name: "Yogurt Cartons 500g", quantity: 60, weight: "30kg", temp: "4°C" },
    ],
    totalWeight: "150kg",
    specialHandling: "Refrigerated. Do not expose to sun.",
    otp: "7354",
    remarks: "Call before arriving",
    etaMinutes: 45,
    podPhotos: [],
    completedAt: null,
    failureReason: null,
  },
  {
    id: "d003",
    deliveryNumber: "DLV-2024-003",
    orderNumber: "ORD-7820",
    invoiceNumber: "INV-2024-0020",
    customerName: "Star Hotels & Resorts",
    customerCode: "CUST-003",
    customerPhone: "+91 98003 34567",
    address: "SG Highway, Beside ISCON",
    area: "Satellite",
    city: "Ahmedabad",
    lat: 23.0278,
    lng: 72.5110,
    deliveryWindow: "07:00 - 09:00",
    priority: "high",
    status: "delivered",
    sequence: 0,
    products: [
      { name: "Premium Butter 500g", quantity: 40, weight: "20kg", temp: "4°C" },
    ],
    totalWeight: "20kg",
    specialHandling: "Handle with care. Hotel kitchen delivery.",
    otp: "1290",
    remarks: "Delivered on time",
    etaMinutes: 0,
    podPhotos: [],
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    failureReason: null,
  },
  {
    id: "d004",
    deliveryNumber: "DLV-2024-004",
    orderNumber: "ORD-7823",
    invoiceNumber: "INV-2024-0023",
    customerName: "MediCool Pharma",
    customerCode: "CUST-004",
    customerPhone: "+91 98004 45678",
    address: "Pharmacy District, CG Road",
    area: "Navrangpura",
    city: "Ahmedabad",
    lat: 23.0395,
    lng: 72.5560,
    deliveryWindow: "14:00 - 16:00",
    priority: "high",
    status: "pending",
    sequence: 3,
    products: [
      { name: "Vaccine Cold Box", quantity: 10, weight: "25kg", temp: "2-8°C" },
      { name: "Insulin Packs", quantity: 200, weight: "8kg", temp: "2-8°C" },
    ],
    totalWeight: "33kg",
    specialHandling: "CRITICAL: Maintain 2-8°C strictly. Pharmaceutical grade.",
    otp: "9921",
    remarks: "Contact Dr. Patel on arrival",
    etaMinutes: 130,
    podPhotos: [],
    completedAt: null,
    failureReason: null,
  },
  {
    id: "d005",
    deliveryNumber: "DLV-2024-005",
    orderNumber: "ORD-7819",
    invoiceNumber: "INV-2024-0019",
    customerName: "Apex Meat Processors",
    customerCode: "CUST-005",
    customerPhone: "+91 98005 56789",
    address: "Slaughter House Road, Gomtipur",
    area: "Gomtipur",
    city: "Ahmedabad",
    lat: 23.0551,
    lng: 72.6290,
    deliveryWindow: "06:00 - 08:00",
    priority: "normal",
    status: "failed",
    sequence: -1,
    products: [
      { name: "Frozen Chicken", quantity: 30, weight: "90kg", temp: "-18°C" },
    ],
    totalWeight: "90kg",
    specialHandling: "Keep frozen below -18°C.",
    otp: "5567",
    remarks: "",
    etaMinutes: 0,
    podPhotos: [],
    completedAt: null,
    failureReason: "Customer location closed. Will reschedule.",
  },
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { date: TODAY, checkIn: null, checkOut: null, checkInLocation: null, status: "absent", workingHours: null },
  { date: "2026-06-28", checkIn: "08:02", checkOut: "17:45", checkInLocation: "Ahmedabad Cold Hub", status: "present", workingHours: "9h 43m" },
  { date: "2026-06-27", checkIn: "08:35", checkOut: "18:10", checkInLocation: "Ahmedabad Cold Hub", status: "late", workingHours: "9h 35m" },
  { date: "2026-06-26", checkIn: "07:58", checkOut: "17:30", checkInLocation: "Ahmedabad Cold Hub", status: "present", workingHours: "9h 32m" },
  { date: "2026-06-25", checkIn: null, checkOut: null, checkInLocation: null, status: "absent", workingHours: null },
  { date: "2026-06-24", checkIn: "08:05", checkOut: "17:55", checkInLocation: "Ahmedabad Cold Hub", status: "present", workingHours: "9h 50m" },
  { date: "2026-06-23", checkIn: "08:00", checkOut: "13:30", checkInLocation: "Ahmedabad Cold Hub", status: "half_day", workingHours: "5h 30m" },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  useEffect(() => {
    loadData();
    const speedInterval = setInterval(() => {
      setCurrentSpeed(Math.floor(Math.random() * 45) + 15);
    }, 3000);
    return () => clearInterval(speedInterval);
  }, []);

  const loadData = async () => {
    try {
      const storedDeliveries = await AsyncStorage.getItem("@coldverse_deliveries");
      const storedAttendance = await AsyncStorage.getItem("@coldverse_attendance");

      if (storedDeliveries) {
        setDeliveries(JSON.parse(storedDeliveries));
      } else {
        setDeliveries(MOCK_DELIVERIES);
        await AsyncStorage.setItem("@coldverse_deliveries", JSON.stringify(MOCK_DELIVERIES));
      }

      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      } else {
        setAttendance(MOCK_ATTENDANCE);
        await AsyncStorage.setItem("@coldverse_attendance", JSON.stringify(MOCK_ATTENDANCE));
      }

      setIsGpsActive(true);
    } catch {
      setDeliveries(MOCK_DELIVERIES);
      setAttendance(MOCK_ATTENDANCE);
    }
  };

  const refreshData = useCallback(() => {
    loadData();
  }, []);

  const todayAttendance = attendance.find((a) => a.date === TODAY) ?? null;

  const checkIn = async () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);

    const updated = attendance.map((a) =>
      a.date === TODAY
        ? { ...a, checkIn: timeStr, checkInLocation: "Ahmedabad Cold Hub", status: isLate ? ("late" as const) : ("present" as const) }
        : a
    );
    setAttendance(updated);
    await AsyncStorage.setItem("@coldverse_attendance", JSON.stringify(updated));
  };

  const checkOut = async () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const checkInTime = todayAttendance?.checkIn;

    let workingHours: string | null = null;
    if (checkInTime) {
      const [inH, inM] = checkInTime.split(":").map(Number);
      const totalMins = (now.getHours() - inH) * 60 + (now.getMinutes() - inM);
      workingHours = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
    }

    const updated = attendance.map((a) =>
      a.date === TODAY ? { ...a, checkOut: timeStr, workingHours } : a
    );
    setAttendance(updated);
    await AsyncStorage.setItem("@coldverse_attendance", JSON.stringify(updated));
  };

  const updateDeliveryStatus = async (id: string, status: DeliveryStatus, data?: Partial<Delivery>) => {
    const updated = deliveries.map((d) =>
      d.id === id
        ? {
            ...d,
            ...data,
            status,
            completedAt: status === "delivered" ? new Date().toISOString() : d.completedAt,
          }
        : d
    );
    setDeliveries(updated);
    await AsyncStorage.setItem("@coldverse_deliveries", JSON.stringify(updated));
  };

  const addPodPhoto = async (id: string, uri: string) => {
    const updated = deliveries.map((d) =>
      d.id === id ? { ...d, podPhotos: [...d.podPhotos, uri] } : d
    );
    setDeliveries(updated);
    await AsyncStorage.setItem("@coldverse_deliveries", JSON.stringify(updated));
  };

  return (
    <AppContext.Provider
      value={{
        deliveries,
        attendance,
        todayAttendance,
        isGpsActive,
        currentSpeed,
        checkIn,
        checkOut,
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
