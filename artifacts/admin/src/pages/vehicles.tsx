import React, { useState } from "react";
import { useLocation } from "wouter";
import type { Vehicle } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Plus, Pencil, Search } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { ListPagination } from "@/components/ListPagination";
import { useDebouncedValue, usePaginatedQuery } from "@/hooks/use-paginated-query";

export default function Vehicles() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = usePaginatedQuery<Vehicle>("vehicles", "/api/vehicles", {
    page,
    pageSize: 25,
    status: statusFilter === "all" ? undefined : statusFilter,
    q: debouncedSearch || undefined,
  });

  const vehicles = data?.items ?? [];

  const isExpiringSoon = (dateString?: string | null) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Available</Badge>;
      case "in_use":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">In Use</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Maintenance</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Vehicles</h2>
        <Button onClick={() => navigate("/vehicles/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="in_use">In Use</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search number, type..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
            </div>
          ) : vehicles.length === 0 ? (
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                      <TableCell className="capitalize">{vehicle.vehicleType.replace("_", " ")}</TableCell>
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
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && (
            <ListPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
