import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useUpdateDelivery,
  useListDrivers,
  useListVehicles,
  DeliveryStatus,
} from "@workspace/api-client-react";
import type { Delivery, DeliveryUpdate, Driver, Vehicle } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Truck, Pencil, Calendar, Filter, X, ChevronsUpDown, Check } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { BulkUploadDeliveryDialog } from "@/components/BulkUploadDeliveryDialog";
import { ListPagination } from "@/components/ListPagination";
import { useDebouncedValue, usePaginatedQuery } from "@/hooks/use-paginated-query";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

type DeliveryRow = Delivery;
type DatePreset = "today" | "7d" | "all" | "custom";

const STATUS_TABS: { value: DeliveryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "rescheduled", label: "Rescheduled" },
];

const STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "rescheduled", label: "Rescheduled" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "assigned":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_transit":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "delivered":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    case "rescheduled":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-100/50 border-red-200";
    case "normal":
      return "text-blue-600 bg-blue-100/50 border-blue-200";
    case "low":
      return "text-gray-600 bg-gray-100/50 border-gray-200";
    default:
      return "";
  }
}

function QuickAssignSelect<T extends { id: number }>({
  valueId,
  valueLabel,
  placeholder,
  emptyLabel,
  items,
  getLabel,
  getSubLabel,
  onAssign,
  onClear,
  disabled,
  searchingPlaceholder,
}: {
  valueId?: number | null;
  valueLabel?: string | null;
  placeholder: string;
  emptyLabel: string;
  items: T[];
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string | undefined;
  onAssign: (id: number) => void;
  onClear?: () => void;
  disabled?: boolean;
  searchingPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 w-full max-w-[180px] justify-between gap-1 px-2 font-normal",
            !valueLabel && "text-muted-foreground",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate text-left text-xs">
            {valueLabel || placeholder}
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={searchingPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {valueId && onClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  Clear assignment
                </CommandItem>
              )}
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${getLabel(item)} ${getSubLabel?.(item) ?? ""}`}
                  onSelect={() => {
                    onAssign(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 shrink-0",
                      valueId === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{getLabel(item)}</div>
                    {getSubLabel?.(item) && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {getSubLabel(item)}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Deliveries() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const [editTarget, setEditTarget] = useState<DeliveryRow | null>(null);
  const [editForm, setEditForm] = useState({
    priority: "normal" as "low" | "normal" | "high",
    deliveryDate: "",
    deliveryWindow: "",
    remarks: "",
  });
  const [failTarget, setFailTarget] = useState<DeliveryRow | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: driversData } = useListDrivers({ status: "active" });
  const { data: vehiclesData } = useListVehicles();

  const drivers = useMemo(
    () => (Array.isArray(driversData) ? driversData : []) as Driver[],
    [driversData],
  );
  const vehicles = useMemo(
    () => (Array.isArray(vehiclesData) ? vehiclesData : []) as Vehicle[],
    [vehiclesData],
  );

  const { data, isLoading, refetch, isFetching } = usePaginatedQuery<DeliveryRow>(
    "deliveries",
    "/api/deliveries",
    {
      page,
      pageSize: 25,
      status: statusFilter === "all" ? undefined : statusFilter,
      dateFrom: datePreset === "all" ? undefined : dateFrom || undefined,
      dateTo: datePreset === "all" ? undefined : dateTo || undefined,
      q: debouncedSearch || undefined,
    },
  );

  const deliveries = data?.items ?? [];
  const updateDelivery = useUpdateDelivery();

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset === "today") {
      const t = todayStr();
      setDateFrom(t);
      setDateTo(t);
    } else if (preset === "7d") {
      setDateFrom(daysAgoStr(6));
      setDateTo(todayStr());
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    applyPreset("today");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    !!search ||
    datePreset !== "today";

  const patchDelivery = (
    delivery: DeliveryRow,
    patch: DeliveryUpdate,
    successMsg: string,
  ) => {
    setUpdatingId(delivery.id);
    updateDelivery.mutate(
      { id: delivery.id, data: patch },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: successMsg });
          setUpdatingId(null);
          refetch();
        },
        onError: () => {
          toast({ title: "Error", description: "Update failed", variant: "destructive" });
          setUpdatingId(null);
        },
      },
    );
  };

  const handleStatusChange = (delivery: DeliveryRow, status: DeliveryStatus) => {
    if (status === delivery.status) return;
    if (status === "failed") {
      setFailTarget(delivery);
      setFailureReason("");
      return;
    }
    patchDelivery(delivery, { status }, `Status → ${status.replace("_", " ")}`);
  };

  const openEdit = (d: DeliveryRow) => {
    setEditTarget(d);
    setEditForm({
      priority: d.priority,
      deliveryDate: d.deliveryDate ? d.deliveryDate.split("T")[0] : "",
      deliveryWindow: d.deliveryWindow ?? "",
      remarks: d.remarks ?? "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateDelivery.mutate(
      {
        id: editTarget.id,
        data: {
          priority: editForm.priority,
          deliveryDate: editForm.deliveryDate,
          deliveryWindow: editForm.deliveryWindow,
          remarks: editForm.remarks || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Delivery updated successfully" });
          setEditTarget(null);
          refetch();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update delivery", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Deliveries</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter, assign, and update orders without leaving the list
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkUploadDeliveryDialog onImported={() => refetch()} />
          <Button onClick={() => navigate("/deliveries/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Delivery
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          role="tablist"
          className="inline-flex min-w-full sm:min-w-0 items-center gap-1 rounded-xl border bg-muted/40 p-1"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter panel */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
              {isFetching && !isLoading && (
                <span className="text-xs font-normal">Updating…</span>
              )}
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "Last 7 days" },
                { key: "all", label: "All dates" },
              ] as const
            ).map((p) => (
              <Button
                key={p.key}
                type="button"
                size="sm"
                variant={datePreset === p.key ? "default" : "outline"}
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_minmax(0,1.4fr)] items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From
              </Label>
              <DatePicker
                value={dateFrom}
                max={dateTo || undefined}
                disabled={datePreset === "all"}
                onChange={(v) => {
                  setDateFrom(v);
                  setDatePreset("custom");
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <DatePicker
                value={dateTo}
                min={dateFrom || undefined}
                disabled={datePreset === "all"}
                onChange={(v) => {
                  setDateTo(v);
                  setDatePreset("custom");
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Delivery #, order, customer…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 pt-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : deliveries.length === 0 ? (
            <Empty>
              <div className="flex flex-col items-center gap-2 text-center py-12">
                <Truck className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium">No deliveries found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Delivery #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                    <TableHead className="min-w-[160px]">Driver</TableHead>
                    <TableHead className="min-w-[150px]">Vehicle</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const busy = updatingId === delivery.id && updateDelivery.isPending;
                    return (
                      <TableRow
                        key={delivery.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`/deliveries/${delivery.id}`)}
                      >
                        <TableCell className="pl-4 font-medium font-mono text-sm">
                          {delivery.deliveryNumber}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate font-medium max-w-[180px]">{delivery.customerName}</div>
                            <div className="truncate text-xs text-muted-foreground max-w-[180px]">
                              {delivery.deliveryArea || delivery.deliveryCity}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(delivery.deliveryDate).toLocaleDateString()}
                          <div className="text-[11px] text-muted-foreground">{delivery.deliveryWindow}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize", getPriorityColor(delivery.priority))}>
                            {delivery.priority}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={delivery.status}
                            disabled={busy}
                            onValueChange={(v) => handleStatusChange(delivery, v as DeliveryStatus)}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-[132px] text-xs capitalize border",
                                getStatusColor(delivery.status),
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-sm">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <QuickAssignSelect
                            valueId={delivery.assignedDriverId}
                            valueLabel={delivery.assignedDriverName}
                            placeholder="Assign driver"
                            emptyLabel="No drivers found"
                            searchingPlaceholder="Search drivers…"
                            items={drivers}
                            getLabel={(d) => d.name}
                            getSubLabel={(d) => d.employeeId}
                            disabled={busy}
                            onAssign={(id) =>
                              patchDelivery(delivery, { assignedDriverId: id }, "Driver assigned")
                            }
                            onClear={() =>
                              patchDelivery(delivery, { assignedDriverId: null }, "Driver cleared")
                            }
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <QuickAssignSelect
                            valueId={delivery.assignedVehicleId}
                            valueLabel={delivery.assignedVehicleNumber}
                            placeholder="Assign vehicle"
                            emptyLabel="No vehicles found"
                            searchingPlaceholder="Search vehicles…"
                            items={vehicles}
                            getLabel={(v) => v.vehicleNumber}
                            getSubLabel={(v) => v.vehicleType}
                            disabled={busy}
                            onAssign={(id) =>
                              patchDelivery(delivery, { assignedVehicleId: id }, "Vehicle assigned")
                            }
                            onClear={() =>
                              patchDelivery(delivery, { assignedVehicleId: null }, "Vehicle cleared")
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => openEdit(delivery)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {data && (
            <div className="px-4 pb-4">
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

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Delivery {editTarget?.deliveryNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(v) => setEditForm({ ...editForm, priority: v as "low" | "normal" | "high" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Delivery Date</Label>
                <DatePicker
                  required
                  value={editForm.deliveryDate}
                  onChange={(v) => setEditForm({ ...editForm, deliveryDate: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Window</Label>
                <Input
                  required
                  value={editForm.deliveryWindow}
                  onChange={(e) => setEditForm({ ...editForm, deliveryWindow: e.target.value })}
                  placeholder="e.g. 08:00-12:00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDelivery.isPending}>
                {updateDelivery.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fail reason dialog */}
      <Dialog open={!!failTarget} onOpenChange={(o) => !o && setFailTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark failed — {failTarget?.deliveryNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add a short reason so the team knows why this delivery failed.
            </p>
            <div className="space-y-1.5">
              <Label>Failure reason *</Label>
              <Textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="e.g. Customer closed, address not found…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFailTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!failureReason.trim() || updateDelivery.isPending}
              onClick={() => {
                if (!failTarget || !failureReason.trim()) return;
                patchDelivery(
                  failTarget,
                  { status: "failed", failureReason: failureReason.trim() },
                  "Marked as failed",
                );
                setFailTarget(null);
              }}
            >
              Confirm failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
