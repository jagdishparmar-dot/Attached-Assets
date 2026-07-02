import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetDelivery, 
  useUpdateDelivery, 
  getGetDeliveryQueryKey, 
  getListDeliveriesQueryKey,
  useListDrivers,
  useListVehicles,
  DeliveryStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, MapPin, Building2, Package, AlertTriangle, Truck, UserCircle } from "lucide-react";

export default function DeliveryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: delivery, isLoading } = useGetDelivery(id, { query: { enabled: !!id, queryKey: getGetDeliveryQueryKey(id) } });
  const updateDelivery = useUpdateDelivery();
  const { data: drivers } = useListDrivers();
  const { data: vehicles } = useListVehicles();

  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [failureReason, setFailureReason] = useState("");
  const [isFailedDialogOpen, setIsFailedDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "assigned": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "in_transit": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "delivered": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-100/50 dark:bg-red-900/20";
      case "normal": return "text-blue-600 bg-blue-100/50 dark:bg-blue-900/20";
      case "low": return "text-gray-600 bg-gray-100/50 dark:bg-gray-900/20";
      default: return "";
    }
  };

  const handleUpdate = (data: any, successMsg: string) => {
    updateDelivery.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast({ title: "Success", description: successMsg });
          queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
          if (data.status === "failed") setIsFailedDialogOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Update failed", variant: "destructive" })
      }
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
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!delivery) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/deliveries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Delivery #{delivery.deliveryNumber}</h2>
            <Badge variant="outline" className={`capitalize ${getStatusColor(delivery.status)}`}>
              {delivery.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className={`capitalize ${getPriorityColor(delivery.priority)}`}>
              {delivery.priority} Priority
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Order: {delivery.orderNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{delivery.customerName}</p>
                    <p className="text-sm text-muted-foreground">{delivery.customerPhone || "No phone"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{delivery.deliveryAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {delivery.deliveryCity} {delivery.deliveryArea ? `(${delivery.deliveryArea})` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(delivery.deliveryDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Window: {delivery.deliveryWindow}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Total Weight: {delivery.totalWeight}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Temp. Requirement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delivery.products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.weight || "-"}</TableCell>
                      <TableCell>{p.temperature || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(delivery.remarks || delivery.specialHandling || delivery.failureReason) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {delivery.specialHandling && (
                  <div>
                    <p className="text-sm font-medium">Special Handling</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-1">{delivery.specialHandling}</p>
                  </div>
                )}
                {delivery.remarks && (
                  <div>
                    <p className="text-sm font-medium">Remarks</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-1">{delivery.remarks}</p>
                  </div>
                )}
                {delivery.failureReason && (
                  <div>
                    <p className="text-sm font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Failure Reason
                    </p>
                    <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md mt-1 border border-destructive/20">{delivery.failureReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={delivery.status === "in_transit"}
                onClick={() => handleUpdate({ status: "in_transit" }, "Marked as In Transit")}
              >
                Mark In Transit
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                disabled={delivery.status === "delivered"}
                onClick={() => handleUpdate({ status: "delivered" }, "Marked as Delivered")}
              >
                Mark Delivered
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={delivery.status === "failed"}
                onClick={() => setIsFailedDialogOpen(true)}
              >
                Mark Failed
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserCircle className="h-4 w-4" /> Driver
                </div>
                {delivery.assignedDriverName && (
                  <div className="text-sm bg-muted/50 p-2 rounded-md mb-3 flex justify-between items-center">
                    <span>{delivery.assignedDriverName}</span>
                    <Badge variant="secondary">Assigned</Badge>
                  </div>
                )}
                <div className="flex gap-2">
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={handleAssignDriver} disabled={!driverId || updateDelivery.isPending}>
                    Assign
                  </Button>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Truck className="h-4 w-4" /> Vehicle
                </div>
                {delivery.assignedVehicleNumber && (
                  <div className="text-sm bg-muted/50 p-2 rounded-md mb-3 flex justify-between items-center">
                    <span>{delivery.assignedVehicleNumber}</span>
                    <Badge variant="secondary">Assigned</Badge>
                  </div>
                )}
                <div className="flex gap-2">
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.vehicleNumber} ({v.vehicleType.replace('_', ' ')})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={handleAssignVehicle} disabled={!vehicleId || updateDelivery.isPending}>
                    Assign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isFailedDialogOpen} onOpenChange={setIsFailedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Delivery as Failed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for failure</label>
              <Textarea 
                value={failureReason} 
                onChange={e => setFailureReason(e.target.value)}
                placeholder="e.g. Customer unavailable, Address not found..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFailedDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              disabled={!failureReason || updateDelivery.isPending}
              onClick={() => handleUpdate({ status: "failed", failureReason }, "Marked as Failed")}
            >
              Confirm Failure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
