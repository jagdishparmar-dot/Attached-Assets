import React from "react";
import { useLocation } from "wouter";
import { useListVehicles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Plus } from "lucide-react";
import { Empty } from "@/components/ui/empty";

export default function Vehicles() {
  const [, navigate] = useLocation();

  const { data: vehicles, isLoading } = useListVehicles();

  const isExpiringSoon = (dateString?: string | null) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "available": return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Available</Badge>;
      case "in_use": return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">In Use</Badge>;
      case "maintenance": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Maintenance</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Vehicles</h2>
        <Button onClick={() => navigate("/admin/vehicles/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !vehicles || vehicles.length === 0 ? (
            <Empty>
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <Car className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium">No vehicles found</p>
                <p className="text-sm text-muted-foreground">Add a new vehicle to the fleet.</p>
              </div>
            </Empty>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Fitness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                      <TableCell className="capitalize">{vehicle.vehicleType.replace('_', ' ')}</TableCell>
                      <TableCell>{vehicle.capacity}</TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell>
                        {vehicle.insuranceExpiry ? (
                          <span className={isExpiringSoon(vehicle.insuranceExpiry) ? "text-red-500 font-medium" : ""}>
                            {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {vehicle.fitnessExpiry ? (
                          <span className={isExpiringSoon(vehicle.fitnessExpiry) ? "text-red-500 font-medium" : ""}>
                            {new Date(vehicle.fitnessExpiry).toLocaleDateString()}
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
