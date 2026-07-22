import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useListStaff,
  useListHubs,
  customFetch,
} from "@workspace/api-client-react";
import type { AttendanceEntry, StaffMember } from "@workspace/api-client-react";
import { ListPagination } from "@/components/ListPagination";
import { useDebouncedValue, usePaginatedQuery } from "@/hooks/use-paginated-query";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Clock,
  Trash2,
  Pencil,
  Download,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Filter,
  Truck,
  Package,
  Layers,
  HardHat,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  present:  { label: "Present",  color: "#059669", bg: "#D1FAE5", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  late:     { label: "Late",     color: "#D97706", bg: "#FEF3C7", icon: <Clock className="h-3.5 w-3.5" /> },
  half_day: { label: "Half Day", color: "#0891B2", bg: "#CFFAFE", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  absent:   { label: "Absent",   color: "#DC2626", bg: "#FEE2E2", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  driver:       { label: "Drivers",      color: "#1D4ED8", bg: "#DBEAFE", icon: <Truck className="h-4 w-4" /> },
  picker:       { label: "Pickers",      color: "#7C3AED", bg: "#EDE9FE", icon: <Package className="h-4 w-4" /> },
  sorter:       { label: "Sorters",      color: "#D97706", bg: "#FEF3C7", icon: <Layers className="h-4 w-4" /> },
  loader:       { label: "Loaders",      color: "#EA580C", bg: "#FFEDD5", icon: <HardHat className="h-4 w-4" /> },
  supervisor:   { label: "Supervisors",  color: "#059669", bg: "#D1FAE5", icon: <UserCheck className="h-4 w-4" /> },
  security:     { label: "Security",     color: "#475569", bg: "#F1F5F9", icon: <Shield className="h-4 w-4" /> },
  house_keeper: { label: "Housekeeping", color: "#0D9488", bg: "#CCFBF1", icon: <Sparkles className="h-4 w-4" /> },
};

type RoleSummary = {
  role: string;
  total: number;
  onSite: number;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  stillIn: number;
};

const ROLE_ORDER = ["driver", "picker", "sorter", "loader", "supervisor", "security", "house_keeper"];

/** Local calendar YYYY-MM-DD (avoids UTC day-shift from toISOString). */
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildByRole(records: AttendanceEntry[]): RoleSummary[] {
  const map = new Map<string, RoleSummary>();
  for (const r of records) {
    const role = r.role || "unknown";
    let row = map.get(role);
    if (!row) {
      row = {
        role,
        total: 0,
        onSite: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        stillIn: 0,
      };
      map.set(role, row);
    }
    row.total += 1;
    if (r.status === "present") row.present += 1;
    else if (r.status === "late") row.late += 1;
    else if (r.status === "half_day") row.halfDay += 1;
    else if (r.status === "absent") row.absent += 1;
    if (r.status !== "absent") row.onSite += 1;
    if (r.checkIn && !r.checkOut) row.stillIn += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.role);
    const bi = ROLE_ORDER.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || b.onSite - a.onSite;
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// Custom mutations using customFetch
const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return customFetch(`/api/attendance/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
  });
};

const useCreateManualAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return customFetch("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
  });
};

const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch(`/api/attendance/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
  });
};

export default function AttendancePage() {
  const { toast } = useToast();

  // Filters State — default to today for fast loads
  const today = localDateStr();
  const sevenDaysAgo = localDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [hubFilter, setHubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  // Dialogs State
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceEntry | null>(null);

  // Manual Add Form State
  const [addForm, setAddForm] = useState({
    staffId: "",
    date: today,
    status: "present",
    checkIn: "",
    checkOut: "",
    workingHours: "",
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    date: "",
    status: "present",
    checkIn: "",
    checkOut: "",
    workingHours: "",
  });

  type AttendancePage = {
    items: AttendanceEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary?: {
      total: number;
      present: number;
      late: number;
      halfDay: number;
      absent: number;
      onSite?: number;
      stillIn?: number;
      geofenceComplianceRate: number;
      checkIns: number;
      geofenced: number;
      byRole?: RoleSummary[];
    };
  };

  const { data, isLoading: attendanceLoading } = usePaginatedQuery<AttendanceEntry>(
    "attendance",
    "/api/attendance/all",
    {
      page,
      pageSize: 50,
      startDate,
      endDate,
      hub: hubFilter === "all" ? undefined : hubFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: debouncedSearch || undefined,
    },
  );

  // Today's full list (no page param → array) so manpower counts are always accurate
  const {
    data: todayRecordsRaw,
    isLoading: todayLoading,
  } = useQuery({
    queryKey: ["attendance-today", today, hubFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: today,
        endDate: today,
      });
      if (hubFilter !== "all") params.set("hub", hubFilter);
      const result = await customFetch<AttendanceEntry[] | AttendancePage>(
        `/api/attendance/all?${params.toString()}`,
      );
      if (Array.isArray(result)) return result;
      return result.items ?? [];
    },
  });

  // Staff dropdown (full list is fine for ~120) + hubs
  const { data: staffListRaw } = useListStaff();
  const { data: hubList = [] } = useListHubs();
  const staffList = useMemo(
    () => (Array.isArray(staffListRaw) ? staffListRaw : []) as StaffMember[],
    [staffListRaw],
  );

  const staffMap = new Map<number, StaffMember>(staffList.map((s) => [s.id, s]));
  const filteredRecords = (data as AttendancePage | undefined)?.items ?? data?.items ?? [];
  const summary = (data as AttendancePage | undefined)?.summary;

  const todayRecords = todayRecordsRaw ?? [];
  const todayByRole = useMemo(() => buildByRole(todayRecords), [todayRecords]);
  const todayOnSite = todayByRole.reduce((sum, r) => sum + r.onSite, 0);
  const todayStillIn = todayByRole.reduce((sum, r) => sum + r.stillIn, 0);
  const todayAbsent = todayByRole.reduce((sum, r) => sum + r.absent, 0);

  // Mutations
  const updateMutation = useUpdateAttendance();
  const createMutation = useCreateManualAttendance();
  const deleteMutation = useDeleteAttendance();

  const totalCount = summary?.total ?? data?.total ?? 0;
  const presentCount = summary?.present ?? 0;
  const lateCount = summary?.late ?? 0;
  const halfDayCount = summary?.halfDay ?? 0;
  const absentCount = summary?.absent ?? 0;
  const geofenceComplianceRate = summary?.geofenceComplianceRate ?? 100;
  const totalCheckIns = summary?.checkIns ?? 0;
  const geofencedRecords = { length: summary?.geofenced ?? 0 };

  // Manual Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.staffId) {
      toast({ title: "Error", description: "Please select a staff member.", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      staffId: Number(addForm.staffId),
      date: addForm.date,
      status: addForm.status,
      checkIn: addForm.checkIn ? new Date(`${addForm.date}T${addForm.checkIn}`).toISOString() : null,
      checkOut: addForm.checkOut ? new Date(`${addForm.date}T${addForm.checkOut}`).toISOString() : null,
      workingHours: addForm.workingHours || null,
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setAddForm({
          staffId: "",
          date: today,
          status: "present",
          checkIn: "",
          checkOut: "",
          workingHours: "",
        });
        toast({ title: "Attendance record added manually" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to add attendance record.", variant: "destructive" });
      }
    });
  };

  // Edit Click
  const handleEditClick = (r: AttendanceEntry) => {
    setEditTarget(r);
    
    const formatTime = (isoString?: string | null) => {
      if (!isoString) return "";
      return new Date(isoString).toTimeString().slice(0, 5);
    };

    setEditForm({
      date: r.date,
      status: r.status,
      checkIn: formatTime(r.checkIn),
      checkOut: formatTime(r.checkOut),
      workingHours: r.workingHours || "",
    });
  };

  // Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    updateMutation.mutate({
      id: editTarget.id,
      data: {
        date: editForm.date,
        status: editForm.status,
        checkIn: editForm.checkIn ? new Date(`${editForm.date}T${editForm.checkIn}`).toISOString() : null,
        checkOut: editForm.checkOut ? new Date(`${editForm.date}T${editForm.checkOut}`).toISOString() : null,
        workingHours: editForm.workingHours || null,
      },
    }, {
      onSuccess: () => {
        setEditTarget(null);
        toast({ title: "Attendance record updated" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update record.", variant: "destructive" });
      }
    });
  };

  // Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Attendance record deleted" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to delete record.", variant: "destructive" });
      }
    });
  };

  // CSV Export — fetch full filtered set (no page) so export isn't limited to current page
  const handleExport = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (hubFilter !== "all") params.set("hub", hubFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);

    const all = await customFetch<AttendanceEntry[]>(`/api/attendance/all?${params.toString()}`);
    const headers = [
      "Date", "Employee ID", "Name", "Role", "Hub", "Status",
      "Check-In Time", "Check-In Location", "Check-Out Time", "Check-Out Location",
      "Working Hours", "Within Geofence", "Geofence Distance (m)",
    ];

    const rows = all.map((r) => {
      const staff = staffMap.get(r.staffId);
      return [
        r.date,
        staff?.employeeId || "",
        r.staffName,
        r.role,
        r.hub,
        r.status,
        r.checkIn ? new Date(r.checkIn).toLocaleString("en-IN") : "",
        r.checkInLat && r.checkInLng ? `${r.checkInLat};${r.checkInLng}` : "",
        r.checkOut ? new Date(r.checkOut).toLocaleString("en-IN") : "",
        r.checkOutLat && r.checkOutLng ? `${r.checkOutLat};${r.checkOutLng}` : "",
        r.workingHours || "",
        r.withinGeofence ? "Yes" : "No",
        r.geofenceDistance != null ? r.geofenceDistance : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewingToday = startDate === today && endDate === today;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Site manpower, check-ins, and geofence verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void handleExport()} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Today's manpower by role */}
      <Card className="border-primary/15 overflow-hidden">
        <CardHeader className="pb-3 bg-primary/3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Today&apos;s manpower by role
              </CardTitle>
              <CardDescription className="mt-1">
                Current on-site headcount
                {hubFilter !== "all" ? ` · ${hubFilter}` : " · all hubs"}
                {" · "}
                {new Date(today + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {todayOnSite} on site
              </Badge>
              <Badge variant="outline" className="tabular-nums border-emerald-200 text-emerald-700 bg-emerald-50">
                {todayStillIn} still checked in
              </Badge>
              {todayAbsent > 0 && (
                <Badge variant="outline" className="tabular-nums border-red-200 text-red-700 bg-red-50">
                  {todayAbsent} absent
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {todayLoading ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Loading today&apos;s manpower…
            </div>
          ) : todayRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No attendance marked for today yet
            </div>
          ) : todayByRole.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {todayRecords.length} records today, but role data is missing
            </div>
          ) : (
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {todayByRole.map((row) => {
                const meta = ROLE_META[row.role] ?? {
                  label: row.role.replace(/_/g, " "),
                  color: "#64748B",
                  bg: "#F1F5F9",
                  icon: <Users className="h-4 w-4" />,
                };
                return (
                  <button
                    key={row.role}
                    type="button"
                    onClick={() => {
                      setStartDate(today);
                      setEndDate(today);
                      setSearch(row.role);
                      setStatusFilter("all");
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors hover:bg-muted/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: meta.color }}>
                        {row.onSite}
                      </span>
                    </div>
                    <p className="text-sm font-semibold capitalize leading-tight">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {row.stillIn} in · {row.late} late
                      {row.absent > 0 ? ` · ${row.absent} out` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Range summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Records</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {viewingToday ? "Today" : "In selected range"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On site</p>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              {presentCount + lateCount + halfDayCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lateCount} late · {halfDayCount} half day · {absentCount} absent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Geofence</p>
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-blue-600">{geofenceComplianceRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {geofencedRecords.length}/{totalCheckIns} check-ins in hub
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Late rate</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600">
              {totalCount > 0 ? Math.round((lateCount / totalCount) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{lateCount} late arrivals</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={viewingToday ? "default" : "outline"}
                onClick={() => {
                  setStartDate(today);
                  setEndDate(today);
                  setPage(1);
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                size="sm"
                variant={startDate === sevenDaysAgo && endDate === today ? "default" : "outline"}
                onClick={() => {
                  setStartDate(sevenDaysAgo);
                  setEndDate(today);
                  setPage(1);
                }}
              >
                Last 7 days
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">From</Label>
              <DatePicker
                id="startDate"
                value={startDate}
                max={endDate || undefined}
                onChange={(v) => {
                  setStartDate(v);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">To</Label>
              <DatePicker
                id="endDate"
                value={endDate}
                min={startDate || undefined}
                onChange={(v) => {
                  setEndDate(v);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hub" className="text-xs text-muted-foreground">Hub</Label>
              <Select
                value={hubFilter}
                onValueChange={(v) => {
                  setHubFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="hub">
                  <SelectValue placeholder="All Hubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs</SelectItem>
                  {hubList.map((h) => (
                    <SelectItem key={h.id} value={h.name}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Staff, role, hub…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Attendance records</CardTitle>
            <Badge variant="secondary" className="tabular-nums">{totalCount}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {attendanceLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading attendance records…</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No attendance records found matching filters.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-muted-foreground font-medium">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3">Role & Hub</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Check-In</th>
                  <th className="text-left px-5 py-3">Check-Out</th>
                  <th className="text-left px-5 py-3">Working Hours</th>
                  <th className="text-left px-5 py-3">Geofence</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const staff = staffMap.get(r.staffId);
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">{r.date}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="font-semibold">{r.staffName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {staff?.employeeId || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="capitalize">
                            {ROLE_META[r.role]?.label.replace(/s$/, "") ?? r.role.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted-foreground">{r.hub}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.checkIn ? (
                          <div>
                            <div className="font-semibold">
                              {new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {r.checkInLat && r.checkInLng && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${r.checkInLat},${r.checkInLng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <MapPin className="h-3 w-3" /> Map
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.checkOut ? (
                          <div>
                            <div className="font-semibold">
                              {new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {r.checkOutLat && r.checkOutLng && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${r.checkOutLat},${r.checkOutLng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <MapPin className="h-3 w-3" /> Map
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                        {r.workingHours || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.checkIn ? (
                          r.withinGeofence ? (
                            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 gap-1">
                              <CheckCircle className="h-3 w-3" /> Within Hub
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 gap-1" title={`${r.geofenceDistance}m away`}>
                              <ShieldAlert className="h-3 w-3" /> {r.geofenceDistance}m Out
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {data && (
            <div className="px-5 pb-4">
              <ListPagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Manual Record Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-staff">Staff Member</Label>
              <Select value={addForm.staffId} onValueChange={(v) => setAddForm({ ...addForm, staffId: v })}>
                <SelectTrigger id="add-staff">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-date">Date</Label>
              <DatePicker
                id="add-date"
                value={addForm.date}
                onChange={(v) => setAddForm({ ...addForm, date: v })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-status">Status</Label>
              <Select value={addForm.status} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                <SelectTrigger id="add-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-checkin">Check-In Time</Label>
                <Input
                  type="time"
                  id="add-checkin"
                  value={addForm.checkIn}
                  onChange={(e) => setAddForm({ ...addForm, checkIn: e.target.value })}
                  disabled={addForm.status === "absent"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-checkout">Check-Out Time</Label>
                <Input
                  type="time"
                  id="add-checkout"
                  value={addForm.checkOut}
                  onChange={(e) => setAddForm({ ...addForm, checkOut: e.target.value })}
                  disabled={addForm.status === "absent"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-hours">Working Hours (e.g. 8h 30m)</Label>
              <Input
                id="add-hours"
                placeholder="8h 00m"
                value={addForm.workingHours}
                onChange={(e) => setAddForm({ ...addForm, workingHours: e.target.value })}
                disabled={addForm.status === "absent"}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Staff Member</Label>
                <Input value={`${editTarget.staffName} (${staffMap.get(editTarget.staffId)?.employeeId || "—"})`} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Date</Label>
                <DatePicker
                  id="edit-date"
                  value={editForm.date}
                  onChange={(v) => setEditForm({ ...editForm, date: v })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-checkin">Check-In Time</Label>
                  <Input
                    type="time"
                    id="edit-checkin"
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                    disabled={editForm.status === "absent"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-checkout">Check-Out Time</Label>
                  <Input
                    type="time"
                    id="edit-checkout"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                    disabled={editForm.status === "absent"}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-hours">Working Hours</Label>
                <Input
                  id="edit-hours"
                  placeholder="8h 00m"
                  value={editForm.workingHours}
                  onChange={(e) => setEditForm({ ...editForm, workingHours: e.target.value })}
                  disabled={editForm.status === "absent"}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the attendance record for{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.staffName}</span> on{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.date}</span>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
