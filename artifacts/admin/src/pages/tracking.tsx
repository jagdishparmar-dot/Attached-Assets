import React, { useEffect, useMemo, useRef, useState } from "react";
import { useListActiveLocations, useListHubs } from "@workspace/api-client-react";
import type { StaffLocation } from "@workspace/api-client-react";
import {
  MapPin,
  Wifi,
  WifiOff,
  Users,
  Clock,
  Navigation,
  Search,
  Radio,
  UserCheck,
  Crosshair,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type TrackedLocation = StaffLocation & { employeeId?: string };
type RoleFilter = "all" | "driver" | "picker" | "sorter" | "loader" | "supervisor" | "security";
type StatusFilter = "all" | "active" | "stale";

// Fix default icon path for Vite
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

const ROLE_LABELS: Record<string, string> = {
  driver: "Driver",
  picker: "Picker",
  sorter: "Sorter",
  loader: "Loader",
  supervisor: "Supervisor",
  security: "Security",
};

function timeSince(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface MapComponentProps {
  locations: TrackedLocation[];
  hubLat: number;
  hubLng: number;
  focusStaffId?: number | null;
  onMarkerClick?: (staffId: number) => void;
}

function LeafletMap({ locations, hubLat, hubLng, focusStaffId, onMarkerClick }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const focusedRef = useRef<number | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([hubLat, hubLng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.circle([hubLat, hubLng], {
      radius: 300,
      color: "#2563EB",
      fillColor: "#3B82F6",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "6 4",
    }).addTo(map);

    L.circleMarker([hubLat, hubLng], {
      radius: 8,
      color: "#fff",
      fillColor: "#2563EB",
      fillOpacity: 1,
      weight: 3,
    })
      .bindPopup("<b>Hub</b>")
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<number>();

    for (const loc of locations) {
      seen.add(loc.staffId);
      const color = ROLE_COLORS[loc.role] ?? "#6B7280";
      const isStale = !loc.isActive;
      const isFocus = focusStaffId === loc.staffId;

      if (markersRef.current.has(loc.staffId)) {
        const m = markersRef.current.get(loc.staffId)!;
        m.setLatLng([loc.lat, loc.lng]);
        m.setStyle({
          fillColor: isStale ? "#9CA3AF" : color,
          color: isFocus ? "#FF3C00" : isStale ? "#6B7280" : "#fff",
          fillOpacity: isStale ? 0.5 : 1,
          radius: isFocus ? 14 : 10,
          weight: isFocus ? 4 : 3,
        });
        m.unbindPopup();
        m.bindPopup(buildPopup(loc));
      } else {
        const marker = L.circleMarker([loc.lat, loc.lng], {
          radius: isFocus ? 14 : 10,
          color: isFocus ? "#FF3C00" : "#fff",
          fillColor: isStale ? "#9CA3AF" : color,
          fillOpacity: isStale ? 0.5 : 1,
          weight: isFocus ? 4 : 3,
        })
          .bindPopup(buildPopup(loc))
          .addTo(map);

        marker.on("click", () => onMarkerClickRef.current?.(loc.staffId));
        markersRef.current.set(loc.staffId, marker);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    if (focusStaffId && focusedRef.current !== focusStaffId) {
      const target = locations.find((l) => l.staffId === focusStaffId);
      const marker = markersRef.current.get(focusStaffId);
      if (target && marker) {
        map.flyTo([target.lat, target.lng], 16, { duration: 0.75 });
        marker.openPopup();
        focusedRef.current = focusStaffId;
      }
    }
  }, [locations, focusStaffId]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function buildPopup(loc: StaffLocation): string {
  const color = ROLE_COLORS[loc.role] ?? "#6B7280";
  return `
    <div style="min-width:170px;font-family:system-ui,sans-serif">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">${loc.staffName}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">${ROLE_LABELS[loc.role] ?? loc.role}</span>
        ${loc.isCheckedIn ? '<span style="background:#DCFCE7;color:#16A34A;font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">Checked In</span>' : ""}
        ${loc.isActive ? '<span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">Live</span>' : '<span style="background:#F3F4F6;color:#6B7280;font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">Stale</span>'}
      </div>
      <div style="font-size:12px;color:#6B7280">${loc.hub}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px">Updated ${timeSince(loc.updatedAt)}</div>
      ${loc.speed != null ? `<div style="font-size:11px;color:#9CA3AF">${(loc.speed * 3.6).toFixed(1)} km/h</div>` : ""}
    </div>
  `;
}

function readTrackingQuery() {
  if (typeof window === "undefined") return { driver: "", name: "", hub: "" };
  const sp = new URLSearchParams(window.location.search);
  return {
    driver: sp.get("driver") ?? "",
    name: sp.get("name") ?? "",
    hub: sp.get("hub") ?? "",
  };
}

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "default" | "green" | "blue" | "muted";
}) {
  const tones = {
    default: "text-foreground",
    green: "text-emerald-600",
    blue: "text-blue-600",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 min-w-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className={cn("text-xl font-bold tabular-nums leading-none", tones[tone])}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const initialQuery = useMemo(() => readTrackingQuery(), []);
  const [selectedHub, setSelectedHub] = useState<string>(initialQuery.hub || "all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [focusKey] = useState(() => ({
    employeeId: initialQuery.driver,
    name: initialQuery.name,
  }));

  const { data: locationsRaw = [], dataUpdatedAt, isFetching } = useListActiveLocations({
    hub: selectedHub === "all" ? undefined : selectedHub,
  });
  const locations = locationsRaw as TrackedLocation[];
  const { data: hubs = [] } = useListHubs();

  const focusedFromQuery = useMemo(() => {
    if (!focusKey.employeeId && !focusKey.name) return null;
    return (
      locations.find((l) =>
        focusKey.employeeId
          ? l.employeeId === focusKey.employeeId
          : l.staffName.toLowerCase() === focusKey.name.toLowerCase(),
      ) ??
      locations.find((l) =>
        focusKey.name ? l.staffName.toLowerCase().includes(focusKey.name.toLowerCase()) : false,
      ) ??
      null
    );
  }, [locations, focusKey]);

  // Auto-select when arriving from delivery track link
  useEffect(() => {
    if (focusedFromQuery && selectedStaffId == null) {
      setSelectedStaffId(focusedFromQuery.staffId);
    }
  }, [focusedFromQuery, selectedStaffId]);

  const focusStaffId = selectedStaffId ?? focusedFromQuery?.staffId ?? null;
  const focusedLocation = locations.find((l) => l.staffId === focusStaffId) ?? focusedFromQuery;

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((l) => {
      if (roleFilter !== "all" && l.role !== roleFilter) return false;
      if (statusFilter === "active" && !l.isActive) return false;
      if (statusFilter === "stale" && l.isActive) return false;
      if (!q) return true;
      return (
        l.staffName.toLowerCase().includes(q) ||
        l.hub.toLowerCase().includes(q) ||
        (l.employeeId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [locations, roleFilter, statusFilter, search]);

  const sortedLocations = useMemo(() => {
    const list = [...filteredLocations].sort((a, b) => {
      if (a.staffId === focusStaffId) return -1;
      if (b.staffId === focusStaffId) return 1;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.staffName.localeCompare(b.staffName);
    });
    return list;
  }, [filteredLocations, focusStaffId]);

  const defaultHub = hubs.find((h) => h.name === selectedHub) ?? hubs[0];
  const hubLat = focusedLocation?.lat ?? defaultHub?.lat ?? 19.076;
  const hubLng = focusedLocation?.lng ?? defaultHub?.lng ?? 72.8777;

  const activeCount = locations.filter((l) => l.isActive).length;
  const checkedInCount = locations.filter((l) => l.isCheckedIn).length;
  const driverCount = locations.filter((l) => l.role === "driver").length;

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of locations) counts[l.role] = (counts[l.role] ?? 0) + 1;
    return counts;
  }, [locations]);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Live Tracking</h1>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </Badge>
            {isFetching && (
              <span className="text-xs text-muted-foreground">Refreshing…</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {focusedLocation
              ? `Focused on ${focusedLocation.staffName}`
              : focusKey.name || focusKey.employeeId
                ? `Looking for ${focusKey.name || focusKey.employeeId}…`
                : "Real-time GPS of field staff across hubs"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedHub} onValueChange={setSelectedHub}>
            <SelectTrigger className="w-[180px] h-9 bg-card">
              <SelectValue placeholder="Hub" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All hubs</SelectItem>
              {hubs.map((h) => (
                <SelectItem key={h.id} value={h.name}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 h-9 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            Updated{" "}
            <span className="font-medium text-foreground tabular-nums">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN") : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <StatChip icon={<Users className="h-4 w-4" />} label="Tracked staff" value={locations.length} tone="default" />
        <StatChip icon={<Wifi className="h-4 w-4" />} label="Active (&lt;5 min)" value={activeCount} tone="green" />
        <StatChip icon={<UserCheck className="h-4 w-4" />} label="Checked in" value={checkedInCount} tone="blue" />
        <StatChip
          icon={<WifiOff className="h-4 w-4" />}
          label="Offline / stale"
          value={Math.max(0, locations.length - activeCount)}
          tone="muted"
        />
      </div>

      {/* Focus banner from delivery */}
      {(focusKey.name || focusKey.employeeId) && (
        <div
          className={cn(
            "shrink-0 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm",
            focusedFromQuery
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {focusedFromQuery
                ? `Opened from delivery · tracking ${focusedFromQuery.staffName}`
                : `No live GPS ping yet for ${focusKey.name || focusKey.employeeId}`}
            </span>
          </div>
          {focusedFromQuery && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0 bg-white"
              onClick={() => setSelectedStaffId(focusedFromQuery.staffId)}
            >
              Recenter
            </Button>
          )}
        </div>
      )}

      {/* Map + list */}
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden min-h-[360px] lg:min-h-0 py-0 gap-0">
          <div className="relative h-full min-h-[360px]">
            {locations.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card">
                  <MapPin className="h-7 w-7 opacity-40" />
                </div>
                <div className="text-center px-6">
                  <p className="font-medium text-foreground">No active locations</p>
                  <p className="text-sm mt-1 max-w-sm">
                    Staff appear here once mobile GPS pings are received.
                  </p>
                </div>
              </div>
            ) : (
              <LeafletMap
                locations={filteredLocations.length ? filteredLocations : locations}
                hubLat={hubLat}
                hubLng={hubLng}
                focusStaffId={focusStaffId}
                onMarkerClick={setSelectedStaffId}
              />
            )}

            {/* Role legend overlay */}
            {locations.length > 0 && (
              <div className="absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-xl border bg-card/95 backdrop-blur px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Roles · {driverCount} drivers
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => {
                    const count = roleCounts[role] ?? 0;
                    if (!count) return null;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          setRoleFilter((prev) => (prev === role ? "all" : (role as RoleFilter)))
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] transition-opacity",
                          roleFilter !== "all" && roleFilter !== role && "opacity-40",
                        )}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: ROLE_COLORS[role] }}
                        />
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Staff panel */}
        <Card className="flex min-h-0 flex-col overflow-hidden py-0 gap-0">
          <div className="shrink-0 space-y-3 border-b p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Staff on map</p>
              <Badge variant="secondary" className="tabular-nums text-[11px]">
                {sortedLocations.length}
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, hub, ID…"
                className="h-9 pl-8"
              />
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="stale">Stale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {sortedLocations.length === 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
                No staff match these filters
              </div>
            ) : (
              sortedLocations.map((loc) => {
                const color = ROLE_COLORS[loc.role] ?? "#6B7280";
                const isFocused = focusStaffId === loc.staffId;
                return (
                  <button
                    key={loc.staffId}
                    type="button"
                    onClick={() => setSelectedStaffId(loc.staffId)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-all",
                      "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isFocused
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "bg-card",
                      !loc.isActive && !isFocused && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {initials(loc.staffName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{loc.staffName}</p>
                          <span
                            className={cn(
                              "mt-1 h-2 w-2 shrink-0 rounded-full",
                              loc.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
                            )}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-1.5 py-0 text-[10px] font-semibold"
                            style={{ color, backgroundColor: `${color}18` }}
                          >
                            {ROLE_LABELS[loc.role] ?? loc.role}
                          </span>
                          {loc.isCheckedIn && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
                              In
                            </span>
                          )}
                          {isFocused && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">
                              Focused
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{loc.hub}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeSince(loc.updatedAt)}
                      </span>
                      {loc.speed != null && (
                        <span className="inline-flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {(loc.speed * 3.6).toFixed(1)} km/h
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 font-mono tabular-nums">
                        <MapPin className="h-3 w-3" />
                        {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
