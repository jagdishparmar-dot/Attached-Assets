import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListDeliveries, useUpdateDelivery, DeliveryStatus } from "@workspace/api-client-react";
import type { Delivery } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Truck, Pencil } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type DeliveryRow = Delivery;

export default function Deliveries() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<DeliveryRow | null>(null);
  const [editForm, setEditForm] = useState({
    priority: "normal" as any,
    deliveryDate: "",
    deliveryWindow: "",
    remarks: "",
  });

  const { data: deliveries, isLoading, refetch } = useListDeliveries(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const updateDelivery = useUpdateDelivery();

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
    updateDelivery.mutate({
      id: editTarget.id,
      data: {
        priority: editForm.priority,
        deliveryDate: editForm.deliveryDate,
        deliveryWindow: editForm.deliveryWindow,
        remarks: editForm.remarks || null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Delivery updated successfully" });
        setEditTarget(null);
        refetch();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update delivery", variant: "destructive" });
      },
    });
  };

  const filteredDeliveries = deliveries?.filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.deliveryNumber.toLowerCase().includes(s) ||
      d.customerName.toLowerCase().includes(s) ||
      d.orderNumber.toLowerCase().includes(s)
    );
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Deliveries</h2>
        <Button onClick={() => navigate("/admin/deliveries/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Delivery
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="in_transit">In Transit</TabsTrigger>
                <TabsTrigger value="delivered">Delivered</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search deliveries..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !filteredDeliveries || filteredDeliveries.length === 0 ? (
            <Empty>
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <Truck className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium">No deliveries found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            </Empty>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow
                      key={delivery.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/deliveries/${delivery.id}`)}
                    >
                      <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                      <TableCell>{delivery.customerName}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={delivery.deliveryAddress}>
                        {delivery.deliveryAddress}
                      </TableCell>
                      <TableCell>{new Date(delivery.deliveryDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(delivery.priority)}>
                          {delivery.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`capitalize ${getStatusColor(delivery.status)}`}>
                          {delivery.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{delivery.assignedDriverName || <span className="text-muted-foreground text-xs">Unassigned</span>}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(delivery); }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Delivery {editTarget?.deliveryNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as any })}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
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
                <Input type="date" required value={editForm.deliveryDate} onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Window</Label>
                <Input required value={editForm.deliveryWindow} onChange={(e) => setEditForm({ ...editForm, deliveryWindow: e.target.value })} placeholder="e.g. 08:00-12:00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={editForm.remarks} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={updateDelivery.isPending}>
                {updateDelivery.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
