import React, { useEffect, useRef, useState } from "react";
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
import type { StaffLocation } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
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
  driver: "#1D4ED8", picker: "#7C3AED", sorter: "#D97706",
  loader: "#EA580C", supervisor: "#059669", security: "#64748B",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

function MiniTrackingMap({ locations, hubLat, hubLng }: { locations: StaffLocation[]; hubLat: number; hubLng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([hubLat, hubLng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    L.circle([hubLat, hubLng], { radius: 500, color: "#1D4ED8", fillOpacity: 0.07, weight: 1.5, dashArray: "4" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); };
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
        m = L.circleMarker([loc.lat, loc.lng], { radius: 9, color, fillColor: color, fillOpacity: 0.9, weight: 2 }).addTo(map);
        m.bindPopup(`<b>${loc.staffName}</b><br/><small>${loc.role}</small>`);
        markersRef.current.set(loc.staffId, m);
      } else {
        m.setLatLng([loc.lat, loc.lng]);
      }
    }
    markersRef.current.forEach((m, id) => { if (!seen.has(id)) { m.remove(); markersRef.current.delete(id); } });
  }, [locations]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [date, setDate] = useState(todayStr());

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ date });
  const { data: allDeliveries, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useListDeliveries({});
  const { data: activeLocations } = useListActiveLocations();
  const { data: hubs } = useListHubs();
  const { data: drivers } = useListDrivers();
  const { data: vehicles } = useListVehicles();
  const { mutate: updateDelivery } = useUpdateDelivery();

  const hub = hubs?.[0];
  const driverLocations = (activeLocations ?? []).filter(l => l.role === "driver");
  const unassigned = (allDeliveries ?? []).filter(d => d.status === "pending" && !d.assignedDriverId);

  const [assignState, setAssignState] = useState<Record<number, { driverId: string; vehicleId: string }>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const navTo = (status: string) => setLocation(`/deliveries?status=${status}`);

  const handleAssign = (deliveryId: number) => {
    const a = assignState[deliveryId];
    if (!a?.driverId) return;
    const driver = (drivers ?? []).find(d => String(d.id) === a.driverId);
    const vehicle = (vehicles ?? []).find(v => String(v.id) === a.vehicleId);
    setAssigningId(deliveryId);
    void driver;
    updateDelivery({
      id: deliveryId,
      data: {
        status: "assigned",
        assignedDriverId: Number(a.driverId),
        ...(vehicle ? { assignedVehicleId: vehicle.id } : {}),
      },
    }, {
      onSuccess: () => {
        setAssignState(s => { const n = { ...s }; delete n[deliveryId]; return n; });
        refetchDeliveries();
      },
      onSettled: () => setAssigningId(null),
    });
  };

  const attendanceRate = (stats?.staffPresent ?? 0) + (stats?.staffAbsent ?? 0) > 0
    ? Math.round(((stats?.staffPresent ?? 0) / ((stats?.staffPresent ?? 0) + (stats?.staffAbsent ?? 0))) * 100)
    : 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operations Overview</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Live logistics dashboard · Coldverse Supply Chain</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button variant="outline" size="sm" onClick={() => setDate(todayStr())}>Today</Button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          <ClickCard title="Pending" value={stats.pendingDeliveries} palette="amber"
            icon={<Clock className="h-4 w-4" />} onClick={() => navTo("pending")} />
          <ClickCard title="Assigned" value={stats.assignedDeliveries} palette="blue"
            icon={<Package className="h-4 w-4" />} onClick={() => navTo("assigned")} />
          <ClickCard title="In Transit" value={stats.inTransitDeliveries} palette="indigo"
            icon={<Truck className="h-4 w-4" />} onClick={() => navTo("in_transit")} />
          <ClickCard title="Delivered" value={stats.deliveredToday} palette="green"
            icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => navTo("delivered")} />
          <ClickCard title="Failed" value={stats.failedToday} palette="red"
            icon={<AlertTriangle className="h-4 w-4" />} onClick={() => navTo("failed")} />
          <ClickCard title="Staff Present" value={stats.staffPresent} palette="teal"
            icon={<UserCheck className="h-4 w-4" />} />
          <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <Banknote className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Value</span>
            </div>
            <div>
              <div className="text-xl font-bold text-primary leading-tight">
                ₹{(stats.totalDeliveredValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Delivered</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Row 2: Live Map + Staff Attendance ───────────── */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Mini tracking map */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-4 w-4 text-primary" />
              Driver Live Tracking
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-medium">
              {driverLocations.length} active
            </Badge>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="h-[280px] rounded-lg overflow-hidden border bg-muted/20">
              {hub ? (
                <MiniTrackingMap locations={driverLocations} hubLat={hub.lat} hubLng={hub.lng} />
              ) : (
                <div className="h-full flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4" /> Loading map…
                </div>
              )}
            </div>
            {driverLocations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {driverLocations.slice(0, 6).map(l => (
                  <Badge key={l.staffId} variant="outline" className="text-xs gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ROLE_COLORS[l.role] ?? "#64748B" }} />
                    {l.staffName}
                  </Badge>
                ))}
                {driverLocations.length > 6 && (
                  <Badge variant="outline" className="text-xs">+{driverLocations.length - 6} more</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff attendance */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex flex-row items-center space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Staff Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {statsLoading ? <Skeleton className="h-32" /> : stats ? (
              <>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
                    <UserCheck className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-700">{stats.staffPresent}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Present</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 text-center">
                    <UserX className="h-6 w-6 text-red-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-600">{stats.staffAbsent}</p>
                    <p className="text-xs text-red-500 font-semibold mt-0.5">Absent</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                    <span>Attendance Rate</span>
                    <span className="font-bold text-foreground">{attendanceRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${attendanceRate}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Active Drivers</p>
                    <p className="text-2xl font-bold mt-0.5">{stats.activeDrivers}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Vehicles Free</p>
                    <p className="text-2xl font-bold mt-0.5">{stats.availableVehicles}</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ── Unassigned Orders ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-amber-500" />
            Unassigned Orders
          </CardTitle>
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400">
            {unassigned.length} pending
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {deliveriesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : unassigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="font-semibold">All orders are assigned!</p>
              <p className="text-xs">No pending unassigned deliveries right now.</p>
            </div>
          ) : (
            <div className="divide-y">
              {unassigned.map(d => {
                const a = assignState[d.id] ?? { driverId: "", vehicleId: "" };
                const isAssigning = assigningId === d.id;
                return (
                  <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-xs font-bold text-primary">{d.orderNumber}</span>
                        <Badge variant="outline" className={
                          d.priority === "high"
                            ? "text-red-600 border-red-200 bg-red-50 text-[10px] py-0"
                            : d.priority === "low"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px] py-0"
                            : "text-blue-700 border-blue-200 bg-blue-50 text-[10px] py-0"
                        }>
                          {d.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{d.deliveryDate}</span>
                      </div>
                      <p className="font-semibold text-sm leading-tight truncate">{d.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.deliveryAddress}, {d.deliveryCity} · {d.deliveryWindow}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select value={a.driverId} onValueChange={v => setAssignState(s => ({ ...s, [d.id]: { ...a, driverId: v } }))}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="Select driver…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(drivers ?? []).filter(dr => dr.status === "active").map(dr => (
                            <SelectItem key={dr.id} value={String(dr.id)} className="text-xs">{dr.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={a.vehicleId} onValueChange={v => setAssignState(s => ({ ...s, [d.id]: { ...a, vehicleId: v } }))}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="Vehicle…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(vehicles ?? []).filter(v => v.status === "available").map(v => (
                            <SelectItem key={v.id} value={String(v.id)} className="text-xs">{v.vehicleNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 text-xs px-4"
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

const PALETTES: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400",  hover: "hover:border-amber-400" },
  blue:  { bg: "bg-blue-50 dark:bg-blue-950/20",    border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-400",    hover: "hover:border-blue-400" },
  indigo:{ bg: "bg-indigo-50 dark:bg-indigo-950/20",border: "border-indigo-200 dark:border-indigo-800",text: "text-indigo-700 dark:text-indigo-400", hover: "hover:border-indigo-400" },
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/20",border:"border-emerald-200 dark:border-emerald-800",text:"text-emerald-700 dark:text-emerald-400",hover:"hover:border-emerald-400" },
  red:   { bg: "bg-red-50 dark:bg-red-950/20",      border: "border-red-200 dark:border-red-800",     text: "text-red-700 dark:text-red-400",      hover: "hover:border-red-400" },
  teal:  { bg: "bg-teal-50 dark:bg-teal-950/20",    border: "border-teal-200 dark:border-teal-800",   text: "text-teal-700 dark:text-teal-400",    hover: "hover:border-teal-400" },
};

function ClickCard({ title, value, palette, icon, onClick }: {
  title: string; value: number; palette: string; icon: React.ReactNode; onClick?: () => void;
}) {
  const p = PALETTES[palette] ?? PALETTES["blue"];
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col justify-between gap-2 transition-all select-none
        ${p.bg} ${p.border} ${p.hover}
        ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.97]" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className={`${p.text}`}>{icon}</span>
        {onClick && <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">View →</span>}
      </div>
      <div>
        <div className={`text-3xl font-bold ${p.text}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{title}</div>
      </div>
    </div>
  );
}
