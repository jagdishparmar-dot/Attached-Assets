import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateVehicle } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function VehicleNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createVehicle = useCreateVehicle();

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "refrigerated_truck" as any,
    capacity: "",
    fuelType: "diesel" as any,
    gpsDeviceId: "",
    insuranceExpiry: "",
    fitnessExpiry: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVehicle.mutate({
      data: {
        ...formData,
        gpsDeviceId: formData.gpsDeviceId || undefined,
        insuranceExpiry: formData.insuranceExpiry || undefined,
        fitnessExpiry: formData.fitnessExpiry || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Vehicle added successfully" });
        navigate("/admin/vehicles");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add vehicle", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/vehicles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Add New Vehicle</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle Number (License Plate) *</Label>
              <Input required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g. MH-04-AB-1234" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Type *</Label>
                <Select value={formData.vehicleType} onValueChange={(v) => setFormData({...formData, vehicleType: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refrigerated_truck">Refrigerated Truck</SelectItem>
                    <SelectItem value="chilled_van">Chilled Van</SelectItem>
                    <SelectItem value="ambient_truck">Ambient Truck</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuel Type *</Label>
                <Select value={formData.fuelType} onValueChange={(v) => setFormData({...formData, fuelType: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input required value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} placeholder="e.g. 1000kg" />
              </div>
              <div className="space-y-2">
                <Label>GPS Device ID</Label>
                <Input value={formData.gpsDeviceId} onChange={e => setFormData({...formData, gpsDeviceId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Insurance Expiry</Label>
                <Input type="date" value={formData.insuranceExpiry} onChange={e => setFormData({...formData, insuranceExpiry: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Fitness Expiry</Label>
                <Input type="date" value={formData.fitnessExpiry} onChange={e => setFormData({...formData, fitnessExpiry: e.target.value})} />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/vehicles")}>Cancel</Button>
              <Button type="submit" disabled={createVehicle.isPending}>
                {createVehicle.isPending ? "Saving..." : "Add Vehicle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
