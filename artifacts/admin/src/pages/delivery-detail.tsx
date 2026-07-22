import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDelivery,
  useUpdateDelivery,
  useGetDriver,
  getGetDeliveryQueryKey,
  getGetDriverQueryKey,
  getListDeliveriesQueryKey,
  useListDrivers,
  useListVehicles,
  DeliveryStatus,
} from "@workspace/api-client-react";
import type { Driver, Vehicle } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  Package,
  AlertTriangle,
  Truck,
  UserCircle,
  Phone,
  PhoneCall,
  MessageCircle,
  Shield,
  MapPinned,
  ExternalLink,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Navigation,
  CircleDot,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="text-sm font-medium text-primary hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function DeliveryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: delivery, isLoading } = useGetDelivery(id, {
    query: { enabled: !!id, queryKey: getGetDeliveryQueryKey(id) },
  });
  const updateDelivery = useUpdateDelivery();
  const { data: driversData } = useListDrivers({ status: "active" });
  const { data: vehiclesData } = useListVehicles();

  const assignedDriverId = delivery?.assignedDriverId ?? 0;
  const { data: assignedDriver, isLoading: driverLoading } = useGetDriver(assignedDriverId, {
    query: { enabled: !!assignedDriverId, queryKey: getGetDriverQueryKey(assignedDriverId) },
  });

  const drivers = useMemo(
    () => (Array.isArray(driversData) ? driversData : []) as Driver[],
    [driversData],
  );
  const vehicles = useMemo(
    () => (Array.isArray(vehiclesData) ? vehiclesData : []) as Vehicle[],
    [vehiclesData],
  );

  const assignedVehicle = useMemo(
    () => vehicles.find((v) => v.id === delivery?.assignedVehicleId) ?? null,
    [vehicles, delivery?.assignedVehicleId],
  );

  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [failureReason, setFailureReason] = useState("");
  const [isFailedDialogOpen, setIsFailedDialogOpen] = useState(false);

  const handleUpdate = (data: Record<string, unknown>, successMsg: string) => {
    updateDelivery.mutate(
      { id, data: data as any },
      {
        onSuccess: () => {
          toast({ title: "Success", description: successMsg });
          queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: ["deliveries"] });
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
          if (data.status === "failed") setIsFailedDialogOpen(false);
          if (data.assignedDriverId !== undefined) setDriverId("");
          if (data.assignedVehicleId !== undefined) setVehicleId("");
        },
        onError: () => toast({ title: "Error", description: "Update failed", variant: "destructive" }),
      },
    );
  };

  const handleAssignDriver = () => {
    if (!driverId) return;
    handleUpdate({ assignedDriverId: parseInt(driverId, 10) }, "Driver assigned");
  };

  const handleAssignVehicle = () => {
    if (!vehicleId) return;
    handleUpdate({ assignedVehicleId: parseInt(vehicleId, 10) }, "Vehicle assigned");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!delivery) return null;

  const productTotal = delivery.products.reduce((sum, p) => {
    const line = p.amount != null ? Number(p.amount) * Number(p.quantity) : 0;
    return sum + line;
  }, 0);

  const driverPhone = assignedDriver?.phone;
  const emergencyPhone = assignedDriver?.emergencyContact;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate("/deliveries")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono">
                {delivery.deliveryNumber}
              </h2>
              <Badge variant="outline" className={cn("capitalize", getStatusColor(delivery.status))}>
                {delivery.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className={cn("capitalize", getPriorityColor(delivery.priority))}>
                {delivery.priority} priority
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Order <span className="font-mono text-foreground/80">{delivery.orderNumber}</span>
              {delivery.invoiceNumber ? (
                <>
                  {" · "}Invoice <span className="font-mono">{delivery.invoiceNumber}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {assignedDriver && driverPhone && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button asChild size="sm" className="gap-1.5">
              <a href={`tel:${driverPhone}`}>
                <PhoneCall className="h-4 w-4" />
                Call driver
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a
                href={`https://wa.me/91${digitsOnly(driverPhone)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer & schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Delivery details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{delivery.customerName}</p>
                    {delivery.customerPhone ? (
                      <a
                        href={`tel:${delivery.customerPhone}`}
                        className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {delivery.customerPhone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No phone on file</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-snug">{delivery.deliveryAddress}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[delivery.deliveryArea, delivery.deliveryCity].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(delivery.deliveryDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      Window {delivery.deliveryWindow}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total weight {delivery.totalWeight || "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {delivery.products.length} product line{delivery.products.length === 1 ? "" : "s"}
                      {productTotal > 0
                        ? ` · ₹${productTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Products</CardTitle>
              <CardDescription>
                {delivery.products.length} items · weight {delivery.totalWeight || "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delivery.products.map((p, i) => {
                      const line =
                        p.amount != null ? Number(p.amount) * Number(p.quantity) : null;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.quantity}</TableCell>
                          <TableCell>{p.weight || "—"}</TableCell>
                          <TableCell>{p.temperature || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {line != null
                              ? `₹${line.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(delivery.remarks || delivery.specialHandling || delivery.failureReason) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {delivery.specialHandling && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Special handling
                    </p>
                    <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">{delivery.specialHandling}</p>
                  </div>
                )}
                {delivery.remarks && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Remarks
                    </p>
                    <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">{delivery.remarks}</p>
                  </div>
                )}
                {delivery.failureReason && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-destructive inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Failure reason
                    </p>
                    <p className="mt-1 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm">
                      {delivery.failureReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Status — top for visibility */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-primary" />
                  Status
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn("capitalize", getStatusColor(delivery.status))}
                >
                  {delivery.status.replace("_", " ")}
                </Badge>
              </div>
              <CardDescription>Update progress for this delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  {
                    key: "in_transit" as const,
                    label: "In Transit",
                    hint: "Driver is on the way",
                    icon: <Navigation className="h-4 w-4" />,
                    activeClass:
                      "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50",
                    idleClass: "hover:border-indigo-200 hover:bg-indigo-50/40",
                  },
                  {
                    key: "delivered" as const,
                    label: "Delivered",
                    hint: "Completed successfully",
                    icon: <CheckCircle2 className="h-4 w-4" />,
                    activeClass:
                      "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50",
                    idleClass: "hover:border-emerald-200 hover:bg-emerald-50/40",
                  },
                  {
                    key: "failed" as const,
                    label: "Failed",
                    hint: "Could not complete",
                    icon: <XCircle className="h-4 w-4" />,
                    activeClass:
                      "border-red-200 bg-red-50 text-red-900 hover:bg-red-50",
                    idleClass: "hover:border-red-200 hover:bg-red-50/40",
                  },
                ] as const
              ).map((action) => {
                const isCurrent = delivery.status === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    disabled={isCurrent || updateDelivery.isPending}
                    onClick={() => {
                      if (action.key === "failed") {
                        setIsFailedDialogOpen(true);
                        return;
                      }
                      handleUpdate(
                        { status: action.key as DeliveryStatus },
                        `Marked as ${action.label}`,
                      );
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-70",
                      isCurrent ? action.activeClass : cn("bg-background", action.idleClass),
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isCurrent ? "bg-white/70" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {action.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{action.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{action.hint}</span>
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Current
                      </Badge>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Reassign — above driver info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Assignment
              </CardTitle>
              <CardDescription>Assign or change driver and vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Driver
                  </p>
                  {delivery.assignedDriverName ? (
                    <Badge variant="secondary" className="max-w-[60%] truncate text-[10px]">
                      {delivery.assignedDriverName}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-amber-700">Unassigned</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger className="h-9 flex-1 bg-background">
                      <SelectValue placeholder="Choose driver…" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          <span className="font-medium">{d.name}</span>
                          <span className="ml-1.5 text-muted-foreground text-xs">{d.phone}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={handleAssignDriver}
                    disabled={!driverId || updateDelivery.isPending}
                  >
                    {delivery.assignedDriverId ? "Change" : "Assign"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vehicle
                  </p>
                  {delivery.assignedVehicleNumber ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {delivery.assignedVehicleNumber}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-amber-700">Unassigned</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="h-9 flex-1 bg-background">
                      <SelectValue placeholder="Choose vehicle…" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          <span className="font-mono font-medium">{v.vehicleNumber}</span>
                          <span className="ml-1.5 text-muted-foreground text-xs capitalize">
                            {v.vehicleType.replace(/_/g, " ")}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={handleAssignVehicle}
                    disabled={!vehicleId || updateDelivery.isPending}
                  >
                    {delivery.assignedVehicleId ? "Change" : "Assign"}
                  </Button>
                </div>
                {assignedVehicle && (
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    Cap. {assignedVehicle.capacity}
                    {" · "}
                    <span className="capitalize">{assignedVehicle.fuelType}</span>
                    {assignedVehicle.gpsDeviceId
                      ? ` · GPS ${assignedVehicle.gpsDeviceId}`
                      : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Driver contact card — compact */}
          <Card className="overflow-hidden border-primary/15">
            <CardHeader className="py-3 px-4 bg-primary/3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-primary" />
                  Driver contact
                </CardTitle>
                {assignedDriver && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs px-2"
                    onClick={() => navigate(`/drivers/${assignedDriver.id}`)}
                  >
                    Profile
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {!delivery.assignedDriverId ? (
                <div className="rounded-lg border border-dashed px-3 py-4 text-center">
                  <p className="text-sm font-medium">No driver assigned</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use Assignment above to add a driver
                  </p>
                </div>
              ) : driverLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : assignedDriver ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{assignedDriver.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {assignedDriver.employeeId}
                        </Badge>
                        {assignedDriver.hub && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPinned className="h-3 w-3" />
                            {assignedDriver.hub}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <ContactRow
                      icon={<Phone className="h-4 w-4" />}
                      label="Mobile"
                      value={assignedDriver.phone}
                      href={`tel:${assignedDriver.phone}`}
                    />
                    <ContactRow
                      icon={<Shield className="h-4 w-4" />}
                      label="Emergency"
                      value={assignedDriver.emergencyContact}
                      href={
                        emergencyPhone && digitsOnly(emergencyPhone).length >= 8
                          ? `tel:${emergencyPhone}`
                          : undefined
                      }
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {driverPhone && (
                      <>
                        <Button asChild size="sm" className="h-8 gap-1 text-xs px-2">
                          <a href={`tel:${driverPhone}`}>
                            <PhoneCall className="h-3.5 w-3.5" />
                            Call
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs px-2">
                          <a
                            href={`https://wa.me/91${digitsOnly(driverPhone)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chat
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 gap-1 text-xs px-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800",
                        !driverPhone && "col-span-3",
                      )}
                      onClick={() => {
                        const params = new URLSearchParams({
                          driver: assignedDriver.employeeId,
                          name: assignedDriver.name,
                        });
                        if (assignedDriver.hub) params.set("hub", assignedDriver.hub);
                        navigate(`/tracking?${params.toString()}`);
                      }}
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Track
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{delivery.assignedDriverName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full driver profile could not be loaded
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isFailedDialogOpen} onOpenChange={setIsFailedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark delivery as failed</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Reason for failure</label>
            <Textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="e.g. Customer unavailable, address not found…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFailedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!failureReason.trim() || updateDelivery.isPending}
              onClick={() =>
                handleUpdate(
                  { status: "failed", failureReason: failureReason.trim() },
                  "Marked as Failed",
                )
              }
            >
              Confirm failure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
