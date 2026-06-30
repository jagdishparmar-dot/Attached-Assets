import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListDrivers, DriverStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Pencil } from "lucide-react";
import { Empty } from "@/components/ui/empty";

export default function Drivers() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");

  const { data: drivers, isLoading } = useListDrivers(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Drivers</h2>
        <Button onClick={() => navigate("/admin/drivers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !drivers || drivers.length === 0 ? (
            <Empty>
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium">No drivers found</p>
                <p className="text-sm text-muted-foreground">Add a new driver to get started.</p>
              </div>
            </Empty>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hub</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Deliveries Today</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow
                      key={driver.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                    >
                      <TableCell className="font-medium">{driver.employeeId}</TableCell>
                      <TableCell>{driver.name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.hub}</TableCell>
                      <TableCell>
                        <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                          {driver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{driver.deliveriesToday || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/drivers/${driver.id}/edit`); }}
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
    </div>
  );
}
