import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { getApiBase, useAuth } from "@/context/AuthContext";

const PING_INTERVAL_MS = 30_000;

interface TrackingContextValue {
  isTracking: boolean;
  gpsGranted: boolean;
  currentLat: number | null;
  currentLng: number | null;
  currentSpeed: number | null;
  accuracy: number | null;
  lastPing: Date | null;
  pingCount: number;
  pinging: boolean;
  error: string | null;
  pingIntervalMs: number;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  toggleTracking: () => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { staff, token } = useAuth();

  const [isTracking, setIsTracking] = useState(false);
  const [gpsGranted, setGpsGranted] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTrackingRef = useRef(false);
  const staffRef = useRef(staff);
  const tokenRef = useRef(token);

  useEffect(() => {
    staffRef.current = staff;
    tokenRef.current = token;
  }, [staff, token]);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      if (!navigator.geolocation) {
        setError("Geolocation not available");
        setGpsGranted(false);
        return false;
      }
      setGpsGranted(true);
      return true;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setGpsGranted(granted);
    if (!granted) setError("Location permission denied");
    return granted;
  }, []);

  const sendPing = useCallback(async () => {
    const currentStaff = staffRef.current;
    if (!currentStaff) return;
    setPinging(true);
    try {
      let lat: number;
      let lng: number;
      let speed: number | null = null;
      let acc: number | null = null;

      if (Platform.OS === "web") {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
            enableHighAccuracy: true,
          }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
        speed = pos.coords.speed;
      } else {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
        speed = pos.coords.speed ?? null;
      }

      setCurrentLat(lat);
      setCurrentLng(lng);
      setCurrentSpeed(speed != null && !Number.isNaN(speed) ? Math.round(speed * 3.6) : null);
      setAccuracy(acc ? Math.round(acc) : null);
      setError(null);

      const base = getApiBase();
      if (base) {
        await fetch(`${base}/api/locations/ping`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
          },
          body: JSON.stringify({
            staffId: currentStaff.id,
            lat,
            lng,
            accuracy: acc,
            speed,
          }),
        });
      }

      setLastPing(new Date());
      setPingCount((c) => c + 1);
    } catch {
      setError("GPS unavailable — check location services");
    } finally {
      setPinging(false);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isTrackingRef.current = false;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(async () => {
    if (isTrackingRef.current) return;
    const granted = gpsGranted || (await requestPermission());
    if (!granted) return;

    isTrackingRef.current = true;
    setIsTracking(true);
    await sendPing();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void sendPing();
    }, PING_INTERVAL_MS);
  }, [gpsGranted, requestPermission, sendPing]);

  const toggleTracking = useCallback(() => {
    if (isTrackingRef.current) stopTracking();
    else void startTracking();
  }, [startTracking, stopTracking]);

  // Ask for permission once on mount.
  useEffect(() => {
    void requestPermission();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [requestPermission]);

  const startRef = useRef(startTracking);
  const stopRef = useRef(stopTracking);
  useEffect(() => {
    startRef.current = startTracking;
    stopRef.current = stopTracking;
  }, [startTracking, stopTracking]);

  // Auto ON after check-in, auto OFF after check-out (including session restore).
  // Intentionally depends only on check-in state so a manual toggle isn't
  // immediately overridden by callback identity changes.
  const staffId = staff?.id;
  const checkedIn = !!staff?.isCheckedInToday;
  useEffect(() => {
    if (!staffId) {
      stopRef.current();
      return;
    }
    if (checkedIn) void startRef.current();
    else stopRef.current();
  }, [staffId, checkedIn]);

  return (
    <TrackingContext.Provider
      value={{
        isTracking,
        gpsGranted,
        currentLat,
        currentLng,
        currentSpeed,
        accuracy,
        lastPing,
        pingCount,
        pinging,
        error,
        pingIntervalMs: PING_INTERVAL_MS,
        startTracking,
        stopTracking,
        toggleTracking,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within TrackingProvider");
  return ctx;
}
