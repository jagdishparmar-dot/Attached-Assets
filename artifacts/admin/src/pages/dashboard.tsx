import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardStats,
  useListDeliveries,
  useListActiveLocations,
  useListHubs,
  useListDrivers,
  useListVehicles,
  useUpdateDelivery,
} from "@workspace/api-client-react";
import type { Driver, StaffLocation, Vehicle } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
  Radio,
  Truck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ROLE_COLORS: Record<string, string> = {
  driver: "#1D4ED8",
  picker: "#7C3AED",
  sorter: "#D97706",
  loader: "#EA580C",
  supervisor: "#059669",
  security: "#64748B",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function MiniTrackingMap({
  locations,
  hubLat,
  hubLng,
}: {
  locations: StaffLocation[];
  hubLat: number;
  hubLng: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([hubLat, hubLng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.circle([hubLat, hubLng], {
      radius: 500,
      color: "#1D4ED8",
      fillOpacity: 0.07,
      weight: 1.5,
      dashArray: "4",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [hubLat, hubLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<number>();
    for (const loc of locations) {
      seen.add(loc.staffId);
      const color = ROLE_COLORS[loc.role] ?? "#1D4ED8";
      let m = markersRef.current.get(loc.staffId);
      if (!m) {
        m = L.circleMarker([loc.lat, loc.lng], {
          radius: 9,
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);
        m.bindPopup(`<b>${loc.staffName}</b><br/><small>${loc.role}</small>`);
        markersRef.current.set(loc.staffId, m);
      } else {
        m.setLatLng([loc.lat, loc.lng]);
      }
    }
    markersRef.current.forEach((m, id) => {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });
  }, [locations]);

  return <div ref={containerRef} className="h-full w-full" />;
}

const STAT_TONES = {
  amber: {
    wrap: "border-amber-200/80 bg-amber-50/70 hover:border-amber-300",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-800",
  },
  blue: {
    wrap: "border-blue-200/80 bg-blue-50/70 hover:border-blue-300",
    icon: "bg-blue-100 text-blue-700",
    value: "text-blue-800",
  },
  indigo: {
    wrap: "border-indigo-200/80 bg-indigo-50/70 hover:border-indigo-300",
    icon: "bg-indigo-100 text-indigo-700",
    value: "text-indigo-800",
  },
  green: {
    wrap: "border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-800",
  },
  red: {
    wrap: "border-red-200/80 bg-red-50/70 hover:border-red-300",
    icon: "bg-red-100 text-red-700",
    value: "text-red-800",
  },
  teal: {
    wrap: "border-teal-200/80 bg-teal-50/70 hover:border-teal-300",
    icon: "bg-teal-100 text-teal-700",
    value: "text-teal-800",
  },
  primary: {
    wrap: "border-primary/20 bg-primary/5 hover:border-primary/35",
    icon: "bg-primary/10 text-primary",
    value: "text-primary",
  },
} as const;

function StatCard({
  title,
  value,
  tone,
  icon,
  onClick,
  hint,
}: {
  title: string;
  value: string | number;
  tone: keyof typeof STAT_TONES;
  icon: React.ReactNode;
  onClick?: () => void;
  hint?: string;
}) {
  const t = STAT_TONES[tone];
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-all",
        t.wrap,
        onClick
          ? "cursor-pointer hover:shadow-sm active:scale-[0.99]"
          : "cursor-default",
        "disabled:opacity-100",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", t.icon)}>
          {icon}
        </span>
        {onClick && (
          <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-0.5">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums leading-none", t.value)}>{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p>}
    </button>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [date, setDate] = useState(todayStr());

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ date });
  const {
    data: pendingDeliveries,
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries,
  } = useListDeliveries({ status: "pending" });
  const { data: activeLocations } = useListActiveLocations();
  const { data: hubs } = useListHubs();
  const { data: driversData } = useListDrivers({ status: "active" });
  const { data: vehiclesData } = useListVehicles();
  const { mutate: updateDelivery } = useUpdateDelivery();

  const drivers = useMemo(
    () => (Array.isArray(driversData) ? driversData : []) as Driver[],
    [driversData],
  );
  const vehicles = useMemo(
    () => (Array.isArray(vehiclesData) ? vehiclesData : []) as Vehicle[],
    [vehiclesData],
  );

  const hub = hubs?.[0];
  const driverLocations = (activeLocations ?? []).filter((l) => l.role === "driver");
  const unassigned = (pendingDeliveries ?? []).filter((d) => !d.assignedDriverId).slice(0, 25);

  const [assignState, setAssignState] = useState<Record<number, { driverId: string; vehicleId: string }>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const navTo = (status: string) => setLocation(`/deliveries?status=${status}`);
  const isToday = date === todayStr();

  const handleAssign = (deliveryId: number) => {
    const a = assignState[deliveryId];
    if (!a?.driverId) return;
    const vehicle = vehicles.find((v) => String(v.id) === a.vehicleId);
    setAssigningId(deliveryId);
    updateDelivery(
      {
        id: deliveryId,
        data: {
          status: "assigned",
          assignedDriverId: Number(a.driverId),
          ...(vehicle ? { assignedVehicleId: vehicle.id } : {}),
        },
      },
      {
        onSuccess: () => {
          setAssignState((s) => {
            const n = { ...s };
            delete n[deliveryId];
            return n;
          });
          refetchDeliveries();
        },
        onSettled: () => setAssigningId(null),
      },
    );
  };

  const attendanceTotal = (stats?.staffPresent ?? 0) + (stats?.staffAbsent ?? 0);
  const attendanceRate =
    attendanceTotal > 0 ? Math.round(((stats?.staffPresent ?? 0) / attendanceTotal) * 100) : 0;

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operations Overview</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Coldverse Supply Chain · snapshot for{" "}
            <span className="font-medium text-foreground/80">{dateLabel}</span>
            {isToday ? " (today)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker value={date} onChange={setDate} className="w-44" align="end" />
          <Button
            variant={isToday ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDate(todayStr())}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLocation("/tracking")}>
            <Radio className="h-3.5 w-3.5" />
            Live map
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[7.25rem] rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <StatCard
            title="Pending"
            value={stats.pendingDeliveries}
            tone="amber"
            icon={<Clock className="h-4 w-4" />}
            onClick={() => navTo("pending")}
          />
          <StatCard
            title="Assigned"
            value={stats.assignedDeliveries}
            tone="blue"
            icon={<Package className="h-4 w-4" />}
            onClick={() => navTo("assigned")}
          />
          <StatCard
            title="In transit"
            value={stats.inTransitDeliveries}
            tone="indigo"
            icon={<Truck className="h-4 w-4" />}
            onClick={() => navTo("in_transit")}
          />
          <StatCard
            title="Delivered"
            value={stats.deliveredToday}
            tone="green"
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => navTo("delivered")}
            hint={isToday ? "Today" : "On date"}
          />
          <StatCard
            title="Failed"
            value={stats.failedToday}
            tone="red"
            icon={<AlertTriangle className="h-4 w-4" />}
            onClick={() => navTo("failed")}
          />
          <StatCard
            title="Staff present"
            value={stats.staffPresent}
            tone="teal"
            icon={<UserCheck className="h-4 w-4" />}
            onClick={() => setLocation("/attendance")}
          />
          <StatCard
            title="Delivered value"
            value={`₹${Number(stats.totalDeliveredValue).toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}`}
            tone="primary"
            icon={<Banknote className="h-4 w-4" />}
          />
        </div>
      ) : null}

      {/* Map + workforce */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="overflow-hidden lg:col-span-4 py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 border-b bg-muted/20">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="h-4 w-4 text-primary" />
                Driver live tracking
              </CardTitle>
              <CardDescription className="mt-0.5">
                {hub ? hub.name : "Primary hub"} · real-time GPS
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="tabular-nums gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {driverLocations.length} active
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setLocation("/tracking")}
              >
                Open
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[300px] bg-muted/20">
              {hub ? (
                <MiniTrackingMap
                  locations={driverLocations}
                  hubLat={hub.lat}
                  hubLng={hub.lng}
                />
              ) : (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Loading map…
                </div>
              )}
            </div>
            {driverLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t px-4 py-2.5">
                {driverLocations.slice(0, 8).map((l) => (
                  <Badge key={l.staffId} variant="outline" className="gap-1.5 text-xs font-normal">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: ROLE_COLORS[l.role] ?? "#64748B" }}
                    />
                    {l.staffName}
                  </Badge>
                ))}
                {driverLocations.length > 8 && (
                  <Badge variant="secondary" className="text-xs">
                    +{driverLocations.length - 8} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Workforce today
              </CardTitle>
              <CardDescription className="mt-0.5">Attendance & fleet readiness</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setLocation("/attendance")}
            >
              Details
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {statsLoading ? (
              <Skeleton className="h-40" />
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-center">
                    <UserCheck className="mx-auto mb-1.5 h-5 w-5 text-emerald-600" />
                    <p className="text-2xl font-bold tabular-nums text-emerald-700">
                      {stats.staffPresent}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700/80">Present</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-center">
                    <UserX className="mx-auto mb-1.5 h-5 w-5 text-red-500" />
                    <p className="text-2xl font-bold tabular-nums text-red-600">{stats.staffAbsent}</p>
                    <p className="text-[11px] font-semibold text-red-600/80">Absent</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Attendance rate</span>
                    <span className="font-bold tabular-nums">{attendanceRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Active drivers
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{stats.activeDrivers}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Vehicles free
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{stats.availableVehicles}</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Unassigned */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-4 py-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-amber-600" />
              Unassigned orders
            </CardTitle>
            <CardDescription className="mt-0.5">
              Quick-assign driver and vehicle from the dashboard
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 tabular-nums"
            >
              {unassigned.length} pending
            </Badge>
            <Button variant="outline" size="sm" className="h-8" onClick={() => navTo("pending")}>
              All pending
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {deliveriesLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : unassigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">All caught up</p>
              <p className="text-sm">No pending unassigned deliveries right now.</p>
            </div>
          ) : (
            <div className="divide-y">
              {unassigned.map((d) => {
                const a = assignState[d.id] ?? { driverId: "", vehicleId: "" };
                const isAssigning = assigningId === d.id;
                return (
                  <div
                    key={d.id}
                    className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setLocation(`/deliveries/${d.id}`)}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {d.deliveryNumber || d.orderNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "py-0 text-[10px] capitalize",
                            d.priority === "high" && "border-red-200 bg-red-50 text-red-700",
                            d.priority === "low" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            d.priority === "normal" && "border-blue-200 bg-blue-50 text-blue-700",
                          )}
                        >
                          {d.priority}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{d.deliveryDate}</span>
                      </div>
                      <p className="truncate text-sm font-semibold leading-tight">{d.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.deliveryArea || d.deliveryCity} · {d.deliveryWindow}
                      </p>
                    </button>

                    <div
                      className="flex shrink-0 flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={a.driverId}
                        onValueChange={(v) =>
                          setAssignState((s) => ({ ...s, [d.id]: { ...a, driverId: v } }))
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Driver…" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((dr) => (
                            <SelectItem key={dr.id} value={String(dr.id)} className="text-xs">
                              {dr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={a.vehicleId}
                        onValueChange={(v) =>
                          setAssignState((s) => ({ ...s, [d.id]: { ...a, vehicleId: v } }))
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue placeholder="Vehicle…" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles
                            .filter((v) => v.status === "available" || v.status === "in_use")
                            .map((v) => (
                              <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                                {v.vehicleNumber}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={!a.driverId || isAssigning}
                        onClick={() => handleAssign(d.id)}
                      >
                        {isAssigning ? "…" : "Assign"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
