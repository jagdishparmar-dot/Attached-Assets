import React, { useEffect, useRef, useState } from "react";
import { useListActiveLocations, useListHubs, useGetAllAttendance } from "@workspace/api-client-react";
import type { StaffLocation, Hub } from "@workspace/api-client-react";
import { MapPin, Wifi, WifiOff, Users, Clock, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon path for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ROLE_COLORS: Record<string, string> = {
  driver:     "#1D4ED8",
  picker:     "#7C3AED",
  sorter:     "#D97706",
  loader:     "#EA580C",
  supervisor: "#059669",
  security:   "#64748B",
};

const ROLE_LABELS: Record<string, string> = {
  driver:     "Driver",
  picker:     "Picker",
  sorter:     "Sorter",
  loader:     "Loader",
  supervisor: "Supervisor",
  security:   "Security",
};

function timeSince(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

interface MapComponentProps {
  locations: StaffLocation[];
  hubLat: number;
  hubLng: number;
}

function LeafletMap({ locations, hubLat, hubLng }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([hubLat, hubLng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Hub geofence circle
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
      .bindPopup("<b>Hub Location</b>")
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<number>();

    for (const loc of locations) {
      seen.add(loc.staffId);
      const color = ROLE_COLORS[loc.role] ?? "#6B7280";
      const isStale = !loc.isActive;

      if (markersRef.current.has(loc.staffId)) {
        const m = markersRef.current.get(loc.staffId)!;
        m.setLatLng([loc.lat, loc.lng]);
        m.setStyle({
          fillColor: isStale ? "#9CA3AF" : color,
          color: isStale ? "#6B7280" : "#fff",
          fillOpacity: isStale ? 0.5 : 1,
        });
        m.unbindPopup();
        m.bindPopup(buildPopup(loc));
      } else {
        const marker = L.circleMarker([loc.lat, loc.lng], {
          radius: 10,
          color: "#fff",
          fillColor: isStale ? "#9CA3AF" : color,
          fillOpacity: isStale ? 0.5 : 1,
          weight: 3,
        })
          .bindPopup(buildPopup(loc))
          .addTo(map);
        markersRef.current.set(loc.staffId, marker);
      }
    }

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [locations]);

  return <div ref={containerRef} className="h-full w-full rounded-lg" />;
}

function buildPopup(loc: StaffLocation): string {
  const color = ROLE_COLORS[loc.role] ?? "#6B7280";
  return `
    <div style="min-width:160px;font-family:system-ui,sans-serif">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">${loc.staffName}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">${ROLE_LABELS[loc.role] ?? loc.role}</span>
        ${loc.isCheckedIn ? '<span style="background:#DCFCE7;color:#16A34A;font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px">Checked In</span>' : ""}
      </div>
      <div style="font-size:12px;color:#6B7280">${loc.hub}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px">Updated ${timeSince(loc.updatedAt)}</div>
      ${loc.speed != null ? `<div style="font-size:11px;color:#9CA3AF">${(loc.speed * 3.6).toFixed(1)} km/h</div>` : ""}
    </div>
  `;
}

export default function TrackingPage() {
  const [selectedHub, setSelectedHub] = useState<string>("all");

  const { data: locations = [], dataUpdatedAt } = useListActiveLocations({
    hub: selectedHub === "all" ? undefined : selectedHub,
  });

  const { data: hubs = [] } = useListHubs();

  const { data: attendance = [] } = useGetAllAttendance();

  const defaultHub = hubs[0];
  const hubLat = defaultHub?.lat ?? 19.076;
  const hubLng = defaultHub?.lng ?? 72.8777;

  const activeCount = locations.filter((l) => l.isActive).length;
  const checkedInCount = locations.filter((l) => l.isCheckedIn).length;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Tracking</h1>
          <p className="text-muted-foreground mt-1">Real-time GPS location of all field staff</p>
        </div>
        <div className="flex items-center gap-3">
          {hubs.length > 0 && (
            <select
              className="text-sm border rounded-lg px-3 py-2 bg-background"
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
            >
              <option value="all">All Hubs</option>
              {hubs.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live · {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN") : "—"}</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-2xl font-bold">{locations.length}</div>
            <div className="text-xs text-muted-foreground">Tracked Staff</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
          <Wifi className="h-8 w-8 text-green-600" />
          <div>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Active (&lt;5 min)</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
          <MapPin className="h-8 w-8 text-emerald-600" />
          <div>
            <div className="text-2xl font-bold text-emerald-600">{checkedInCount}</div>
            <div className="text-xs text-muted-foreground">Checked In</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
          <WifiOff className="h-8 w-8 text-gray-400" />
          <div>
            <div className="text-2xl font-bold text-gray-400">{locations.length - activeCount}</div>
            <div className="text-xs text-muted-foreground">Offline / Stale</div>
          </div>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-xl border bg-card overflow-hidden shadow-sm">
          {locations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <MapPin className="h-16 w-16 opacity-20" />
              <div className="text-center">
                <p className="font-medium">No active locations</p>
                <p className="text-sm mt-1">Staff locations will appear here once mobile GPS pings are received</p>
              </div>
            </div>
          ) : (
            <LeafletMap locations={locations} hubLat={hubLat} hubLng={hubLng} />
          )}
        </div>

        {/* Staff list */}
        <div className="w-72 flex flex-col gap-2 overflow-y-auto">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Staff Locations</div>
          {locations.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground text-center">
              No GPS data yet
            </div>
          ) : (
            locations.map((loc) => {
              const color = ROLE_COLORS[loc.role] ?? "#6B7280";
              return (
                <div
                  key={loc.staffId}
                  className={`rounded-xl border bg-card p-3 shadow-sm transition-all ${loc.isActive ? "" : "opacity-50"}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    >
                      {loc.staffName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{loc.staffName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-xs font-medium px-1.5 py-0 rounded-full"
                          style={{ color, backgroundColor: `${color}22` }}
                        >
                          {ROLE_LABELS[loc.role] ?? loc.role}
                        </span>
                        {loc.isCheckedIn && (
                          <span className="text-xs text-green-600 font-medium">✓ In</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">{loc.hub}</div>
                    </div>
                    <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${loc.isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeSince(loc.updatedAt)}
                    </div>
                    {loc.speed != null && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {(loc.speed * 3.6).toFixed(1)} km/h
                      </div>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <MapPin className="h-3 w-3" />
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
