import React from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDriver, useUpdateDriver, getGetDriverQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Phone, MapPin, Building, CreditCard, Calendar } from "lucide-react";

export default function DriverDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useGetDriver(id, { query: { enabled: !!id, queryKey: getGetDriverQueryKey(id) } });
  const updateDriver = useUpdateDriver();

  const handleToggleStatus = () => {
    if (!driver) return;
    const newStatus = driver.status === "active" ? "inactive" : "active";
    updateDriver.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Success", description: `Driver marked as ${newStatus}` });
          queryClient.invalidateQueries({ queryKey: getGetDriverQueryKey(id) });
        },
        onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/drivers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{driver.name}</h2>
              <Badge variant={driver.status === "active" ? "default" : "secondary"} className="capitalize">
                {driver.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">ID: {driver.employeeId}</p>
          </div>
        </div>
        <Button 
          variant={driver.status === "active" ? "destructive" : "default"} 
          onClick={handleToggleStatus}
          disabled={updateDriver.isPending}
        >
          {driver.status === "active" ? "Deactivate Driver" : "Activate Driver"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{driver.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Emergency Contact</p>
                    <p className="text-sm text-muted-foreground">{driver.emergencyContact || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{driver.address || "Not provided"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">License Number</p>
                    <p className="text-sm text-muted-foreground">{driver.licenseNumber}</p>
                    {driver.licenseExpiry && <p className="text-xs text-muted-foreground mt-0.5">Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Aadhaar & PAN</p>
                    <p className="text-sm text-muted-foreground">{driver.aadhaarNumber || "No Aadhaar"} / {driver.panNumber || "No PAN"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Hub</p>
                    <p className="text-sm text-muted-foreground">{driver.hub}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Joined On</p>
                <p className="text-sm text-muted-foreground">{new Date(driver.joiningDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg text-center space-y-1">
              <p className="text-sm text-muted-foreground">Deliveries Today</p>
              <p className="text-3xl font-bold">{driver.deliveriesToday || 0}</p>
            </div>
            
            <div className="p-4 bg-primary/5 text-primary rounded-lg text-center space-y-1">
              <p className="text-sm text-primary/80">Total Deliveries</p>
              <p className="text-3xl font-bold">{driver.deliveriesTotal || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
