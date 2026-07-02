import React from "react";
import { useLocation, useParams } from "wouter";
import { useGetCustomer, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Phone, Mail, User, Clock, Package } from "lucide-react";

export default function CustomerDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();

  const { data: customer, isLoading } = useGetCustomer(id, { query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{customer.companyName}</h2>
          </div>
          <p className="text-muted-foreground mt-1">Code: {customer.customerCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{customer.address}</p>
                    <p className="text-sm text-muted-foreground">{customer.city} {customer.area ? `(${customer.area})` : ""}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Preferred Window</p>
                    <p className="text-sm text-muted-foreground">{customer.deliveryWindow || "Any time"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Contact Person</p>
                    <p className="text-sm text-muted-foreground">{customer.contactPerson}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {customer.specialInstructions && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Special Instructions</p>
                <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground">
                  {customer.specialInstructions}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/5 text-primary rounded-lg text-center space-y-1">
              <Package className="h-5 w-5 mx-auto opacity-70 mb-2" />
              <p className="text-sm text-primary/80">Total Deliveries</p>
              <p className="text-4xl font-bold">{customer.totalDeliveries || 0}</p>
            </div>
            
            <Button className="w-full mt-6" onClick={() => navigate("/deliveries/new")}>
              Create Delivery
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
