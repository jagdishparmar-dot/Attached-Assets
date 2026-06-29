import React, { useState } from "react";
import {
  useListStaff,
  useCreateStaff,
  useUpdateStaffMember,
  useDeleteStaffMember,
} from "@workspace/api-client-react";
import type { StaffInput, StaffMember } from "@workspace/api-client-react";
import { Users, Plus, Search, UserCheck, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const ROLES = ["driver", "picker", "sorter", "loader", "supervisor", "security"] as const;
type Role = (typeof ROLES)[number];

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  driver:     { label: "Driver",     color: "#1D4ED8", bg: "#DBEAFE" },
  picker:     { label: "Picker",     color: "#7C3AED", bg: "#EDE9FE" },
  sorter:     { label: "Sorter",     color: "#D97706", bg: "#FEF3C7" },
  loader:     { label: "Loader",     color: "#EA580C", bg: "#FFEDD5" },
  supervisor: { label: "Supervisor", color: "#059669", bg: "#D1FAE5" },
  security:   { label: "Security",   color: "#64748B", bg: "#F1F5F9" },
};

const HUBS = [
  "Mumbai Central Hub",
  "Delhi North Hub",
  "Bangalore Hub",
  "Mumbai East Hub",
];

interface StaffFormState {
  name: string;
  employeeId: string;
  role: Role | "";
  phone: string;
  hub: string;
  joiningDate: string;
  password: string;
  shiftStart: string;
  shiftEnd: string;
  licenseNumber: string;
}

const EMPTY_FORM: StaffFormState = {
  name: "",
  employeeId: "",
  role: "",
  phone: "",
  hub: "",
  joiningDate: new Date().toISOString().split("T")[0],
  password: "cold@123",
  shiftStart: "08:00",
  shiftEnd: "18:00",
  licenseNumber: "",
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role];
  if (!cfg) return <Badge variant="outline">{role}</Badge>;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export default function StaffPage() {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);

  const { data: staffList = [], isLoading, refetch } = useListStaff({
    role: roleFilter === "all" ? undefined : roleFilter,
  });

  const createMutation = useCreateStaff({
    mutation: {
      onSuccess: () => {
        refetch();
        setShowAdd(false);
        setForm(EMPTY_FORM);
        toast({ title: "Staff member added" });
      },
      onError: () => toast({ title: "Error", description: "Failed to add staff member.", variant: "destructive" }),
    },
  });

  const toggleMutation = useUpdateStaffMember({
    mutation: { onSuccess: () => refetch() },
  });

  const deleteMutation = useDeleteStaffMember({
    mutation: {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
        toast({ title: "Staff member removed." });
      },
    },
  });

  const filtered = staffList.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      s.hub.toLowerCase().includes(q)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) return;
    createMutation.mutate({
      data: {
        name: form.name,
        employeeId: form.employeeId,
        role: form.role,
        phone: form.phone,
        hub: form.hub,
        joiningDate: form.joiningDate,
        password: form.password,
        shiftStart: form.shiftStart || null,
        shiftEnd: form.shiftEnd || null,
        licenseNumber: form.licenseNumber || null,
        address: null,
        emergencyContact: null,
        aadhaarNumber: null,
        panNumber: null,
        licenseExpiry: null,
      } as StaffInput,
    });
  };

  const counts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = staffList.filter((s) => s.role === r).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage all warehouse & delivery staff</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Role stat chips */}
      <div className="grid grid-cols-6 gap-3">
        {ROLES.map((r) => {
          const cfg = ROLE_CONFIG[r];
          const active = roleFilter === r;
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(active ? "all" : r)}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${active ? "ring-2 shadow-sm" : ""}`}
              style={{ borderColor: active ? cfg.color : undefined, ...(active ? { ringColor: cfg.color } : {}) }}
            >
              <div className="text-2xl font-bold" style={{ color: cfg.color }}>{counts[r] ?? 0}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">{cfg.label}s</div>
            </button>
          );
        })}
      </div>

      {/* Tab filters + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${roleFilter === "all" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All ({staffList.length})
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${roleFilter === r ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {ROLE_CONFIG[r].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID or hub..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-30" />
            <p>No staff members found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Hub</th>
                <th className="text-left px-5 py-3">Shift</th>
                <th className="text-left px-5 py-3">Today</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <div className="font-semibold text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.employeeId}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><RoleBadge role={s.role} /></td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.hub}</td>
                  <td className="px-5 py-3.5">
                    {s.shiftStart && s.shiftEnd
                      ? <span className="text-xs text-muted-foreground">{s.shiftStart}–{s.shiftEnd}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.isCheckedInToday ? (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                          {s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "In"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">Not in</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleMutation.mutate({ id: s.id, data: { status: s.status === "active" ? "inactive" : "active" } as any })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${s.status === "active" ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                      {s.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input required placeholder="e.g. Ramesh Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID *</Label>
                <Input required placeholder="e.g. CV-DRV-006" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => {
                    const r = v as Role;
                    const prefix = { driver: "CV-DRV-", picker: "CV-PCK-", sorter: "CV-SRT-", loader: "CV-LDR-", supervisor: "CV-SUP-", security: "CV-SEC-" }[r];
                    setForm({ ...form, role: r, employeeId: form.employeeId || `${prefix}00X` });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hub *</Label>
                <Select value={form.hub} onValueChange={(v) => setForm({ ...form, hub: v })}>
                  <SelectTrigger><SelectValue placeholder="Select hub" /></SelectTrigger>
                  <SelectContent>
                    {HUBS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input required placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Joining Date *</Label>
                <Input required type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Shift Start</Label>
                <Input type="time" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Shift End</Label>
                <Input type="time" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} />
              </div>
            </div>

            {form.role === "driver" && (
              <div className="space-y-1.5">
                <Label>License Number</Label>
                <Input placeholder="e.g. MH01 20220012345" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-xs text-muted-foreground">Default: cold@123</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.employeeId})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
